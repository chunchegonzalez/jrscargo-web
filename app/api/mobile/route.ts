import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySignedCookie, AUTH_COOKIE_NAME } from '@/lib/auth';
import { extractCompanyAndClient, formatCostaRicaISO, getLocalTodayDate } from '@/lib/billing';
import {
  getSynchronizedMobileData,
  loadMobileState,
  saveMobileState,
  normalizeShelfQrInput,
  ShelfLocation,
  ShelfMovement,
} from '@/lib/mobile-shelves';

export const dynamic = 'force-dynamic';

type MobileRole = 'admin' | 'operator' | 'viewer';

function resolveMobileRole(rawRole?: string): MobileRole {
  const r = (rawRole || '').toLowerCase().trim();
  if (r === 'admin' || r === 'administrador') return 'admin';
  if (r === 'viewer' || r === 'consulta' || r === 'lectura') return 'viewer';
  return 'operator';
}

async function getAuthenticatedMobileUser() {
  const cookieStore = cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const user = await verifySignedCookie(authCookie?.value);
  if (!user) return null;
  return {
    username: user.username,
    role: resolveMobileRole(user.role),
    rawRole: user.role,
  };
}

export async function GET() {
  try {
    const authUser = await getAuthenticatedMobileUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Inicia sesión para continuar.' },
        { status: 401 }
      );
    }

    const { inventory, state } = await getSynchronizedMobileData();
    const todayISO = getLocalTodayDate();

    let totalEnBodega = 0;
    let asignadosCount = 0;
    let pendientesCount = 0;
    let entregadosHoyCount = 0;

    const shelfPackagesMap = new Map<string, Array<Record<string, unknown>>>();
    for (const shelf of state.shelves) {
      shelfPackagesMap.set(shelf.code.toUpperCase(), []);
    }

    const enrichedPackages = inventory.map((item: Record<string, unknown>) => {
      const tracking = String(item.id || '').trim();
      const upperKey = tracking.toUpperCase();
      const rawClient = String(item.client || 'Desconocido');
      const extracted = extractCompanyAndClient(rawClient);
      let company = String(item.company || '');
      if (!company || company === 'N/A' || company === 'Independiente' || company === 'OTRO') {
        company = extracted.company || 'JRS CARGO';
      }

      const status = String(item.status || 'En Bodega');
      const isDelivered = status.toLowerCase().includes('entregad');
      const createdAt = String(item.created_at || '');
      const updatedAt = String(item.updated_at || item.created_at || '');

      if (isDelivered) {
        const updatedDateISO = formatCostaRicaISO(updatedAt);
        if (updatedDateISO === todayISO) {
          entregadosHoyCount++;
        }
      } else {
        totalEnBodega++;
      }

      const assignment = !isDelivered ? state.assignments[upperKey] || null : null;
      if (!isDelivered) {
        if (assignment) {
          asignadosCount++;
          const shelfKey = assignment.shelfCode.toUpperCase();
          if (!shelfPackagesMap.has(shelfKey)) {
            shelfPackagesMap.set(shelfKey, []);
          }
          shelfPackagesMap.get(shelfKey)!.push({
            tracking,
            client: rawClient,
            casillero: company,
            weight: String(item.weight || '0 lbs'),
            status,
            shelfCode: assignment.shelfCode,
            assignedAt: assignment.assignedAt,
            assignedBy: assignment.assignedBy,
          });
        } else {
          pendientesCount++;
        }
      }

      return {
        tracking,
        client: rawClient,
        casillero: company,
        weight: String(item.weight || '0 lbs'),
        status,
        createdAt,
        updatedAt,
        shelfCode: assignment ? assignment.shelfCode : null,
        shelfId: assignment ? assignment.shelfId : null,
        assignedAt: assignment ? assignment.assignedAt : null,
        assignedBy: assignment ? assignment.assignedBy : null,
      };
    });

    const enrichedShelves = state.shelves.map((shelf) => {
      const assignedPackages = shelfPackagesMap.get(shelf.code.toUpperCase()) || [];
      return {
        ...shelf,
        packageCount: assignedPackages.length,
        packages: assignedPackages,
      };
    });

    return NextResponse.json({
      success: true,
      user: authUser,
      metrics: {
        totalEnBodega,
        asignados: asignadosCount,
        pendientesUbicacion: pendientesCount,
        entregadosHoy: entregadosHoyCount,
        totalEstantesActivos: state.shelves.filter((s) => s.isActive).length,
      },
      packages: enrichedPackages,
      shelves: enrichedShelves,
      movements: state.movements.slice(0, 250),
    });
  } catch (err) {
    console.error('GET /api/mobile error:', err);
    return NextResponse.json(
      { success: false, error: 'Error al obtener datos de JRS Cargo Mobile' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedMobileUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Sesión expirada o no autorizada.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const action = String(body.action || '').toUpperCase();

    // Validación de permisos en servidor (Consulta no puede modificar datos)
    if (authUser.role === 'viewer') {
      return NextResponse.json(
        {
          success: false,
          error: 'Tu perfil de Consulta solo tiene permisos de visualización.',
        },
        { status: 403 }
      );
    }

    // 1. CREAR ESTANTE (Solo Administrador)
    if (action === 'CREATE_SHELF') {
      if (authUser.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Solo un Administrador puede crear nuevos estantes.' },
          { status: 403 }
        );
      }

      const warehouse = String(body.warehouse || 'CR').trim().toUpperCase();
      const zone = String(body.zone || 'A').trim().toUpperCase();
      const rack = String(body.rack || '01').trim().toUpperCase().padStart(2, '0');
      const level = String(body.level || '01').trim().toUpperCase().padStart(2, '0');
      const position = String(body.position || '01').trim().toUpperCase().padStart(2, '0');

      const customCode = String(body.code || '').trim().toUpperCase();
      const code = customCode || `${warehouse}-${zone}-${level}-${position}`;

      const state = await loadMobileState();
      if (state.shelves.some((s) => s.code.toUpperCase() === code)) {
        return NextResponse.json(
          { success: false, error: `La ubicación ${code} ya existe en el sistema.` },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      const newShelf: ShelfLocation = {
        id: `shelf-${code.toLowerCase()}-${Date.now().toString(36)}`,
        code,
        name:
          String(body.name || '').trim() ||
          `Bodega ${warehouse} · Estante ${zone} · Nivel ${level} · Posición ${position}`,
        warehouse,
        zone,
        rack,
        level,
        position,
        qrPayload: `JRS-LOC:${code}`,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      state.shelves.push(newShelf);
      state.shelves.sort((a, b) => a.code.localeCompare(b.code));
      await saveMobileState(state);

      return NextResponse.json({
        success: true,
        message: `Estante ${code} creado exitosamente.`,
        shelf: newShelf,
      });
    }

    // 2. ACTIVAR / DESACTIVAR ESTANTE (Solo Administrador)
    if (action === 'TOGGLE_SHELF') {
      if (authUser.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Solo un Administrador puede activar o desactivar estantes.' },
          { status: 403 }
        );
      }

      const shelfCode = normalizeShelfQrInput(String(body.shelfCode || ''));
      const state = await loadMobileState();
      const target = state.shelves.find((s) => s.code.toUpperCase() === shelfCode);

      if (!target) {
        return NextResponse.json(
          { success: false, error: `No se encontró el estante ${shelfCode}.` },
          { status: 404 }
        );
      }

      const activeCount = Object.values(state.assignments).filter(
        (a) => a.shelfCode.toUpperCase() === shelfCode
      ).length;

      if (target.isActive && activeCount > 0 && !body.force) {
        return NextResponse.json(
          {
            success: false,
            error: `El estante ${shelfCode} tiene ${activeCount} paquete(s) asignados. Trasládalos antes de desactivarlo.`,
          },
          { status: 400 }
        );
      }

      target.isActive = !target.isActive;
      target.updatedAt = new Date().toISOString();
      await saveMobileState(state);

      return NextResponse.json({
        success: true,
        message: `Estante ${shelfCode} ${target.isActive ? 'activado' : 'desactivado'}.`,
        shelf: target,
      });
    }

    // 3. ASIGNAR O TRASLADAR PAQUETE A ESTANTE (Administrador y Operador)
    if (action === 'ASSIGN_PACKAGE' || action === 'MOVE_PACKAGE') {
      const rawTracking = String(body.trackingId || '').replace(/[\x00-\x1F\x7F\s]+/g, '').trim();
      const rawShelf = String(body.shelfCode || body.qrCode || '').trim();
      const confirmMove = Boolean(body.confirmMove || action === 'MOVE_PACKAGE');

      if (!rawTracking) {
        return NextResponse.json(
          { success: false, error: 'Debes indicar o escanear el número de tracking del paquete.' },
          { status: 400 }
        );
      }
      if (!rawShelf) {
        return NextResponse.json(
          { success: false, error: 'Debes indicar o escanear el código QR del estante.' },
          { status: 400 }
        );
      }

      const normalizedShelfCode = normalizeShelfQrInput(rawShelf);
      const { inventory, state } = await getSynchronizedMobileData();

      // Validar estante existente y activo
      const targetShelf = state.shelves.find(
        (s) =>
          s.code.toUpperCase() === normalizedShelfCode ||
          s.qrPayload.toUpperCase() === rawShelf.toUpperCase()
      );

      if (!targetShelf) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_SHELF_QR',
            error: `El código QR "${rawShelf}" no corresponde a ningún estante registrado en JRS Cargo.`,
          },
          { status: 404 }
        );
      }

      if (!targetShelf.isActive) {
        return NextResponse.json(
          {
            success: false,
            code: 'INACTIVE_SHELF',
            error: `La ubicación ${targetShelf.code} está inactiva y no admite asignaciones.`,
          },
          { status: 400 }
        );
      }

      // Buscar paquete en el inventario administrativo (soporta coincidencia exacta o sufijo USPS 420...)
      const upperInput = rawTracking.toUpperCase();
      const strippedUSPS = upperInput
        .replace(/^420(?:\d{9}|\d{5})(?=9\d{14,})/i, '')
        .replace(/^420\d{5}/i, '');

      const matchedPkg = inventory.find((p: Record<string, unknown>) => {
        const idUpper = String(p.id || '').trim().toUpperCase();
        if (!idUpper) return false;
        if (idUpper === upperInput || idUpper === strippedUSPS) return true;
        if (strippedUSPS.length >= 8 && (idUpper.endsWith(strippedUSPS) || strippedUSPS.endsWith(idUpper))) {
          return true;
        }
        return false;
      });

      if (!matchedPkg) {
        return NextResponse.json(
          {
            success: false,
            code: 'PACKAGE_NOT_IN_INVENTORY',
            error: `El paquete "${rawTracking}" no existe en el inventario de Costa Rica (/admin/inventario). Debe ingresarse primero en bodega.`,
          },
          { status: 404 }
        );
      }

      const canonicalTracking = String(matchedPkg.id).trim();
      const canonicalKey = canonicalTracking.toUpperCase();
      const pkgStatus = String(matchedPkg.status || '');
      const clientName = String(matchedPkg.client || 'Cliente JRS');

      // Validación crítica: Impedir asignar un paquete que ya esté Entregado
      if (pkgStatus.toLowerCase().includes('entregad')) {
        return NextResponse.json(
          {
            success: false,
            code: 'PACKAGE_ALREADY_DELIVERED',
            error: `El paquete ${canonicalTracking} ya figura como ENTREGADO y no puede asignarse a ningún estante.`,
          },
          { status: 400 }
        );
      }

      const existingAssignment = state.assignments[canonicalKey];

      // Evitar operaciones duplicadas al repetir el mismo escaneo
      if (
        existingAssignment &&
        existingAssignment.shelfCode.toUpperCase() === targetShelf.code.toUpperCase()
      ) {
        return NextResponse.json({
          success: true,
          idempotent: true,
          message: `El paquete ${canonicalTracking} ya está ubicado en el estante ${targetShelf.code}.`,
          assignment: existingAssignment,
          package: {
            tracking: canonicalTracking,
            client: clientName,
            shelfCode: targetShelf.code,
          },
        });
      }

      // Si ya tiene otro estante asignado y no se ha confirmado traslado, advertir al operador
      if (existingAssignment && !confirmMove) {
        return NextResponse.json(
          {
            success: false,
            code: 'ALREADY_ASSIGNED',
            currentShelf: existingAssignment.shelfCode,
            targetShelf: targetShelf.code,
            tracking: canonicalTracking,
            client: clientName,
            error: `El paquete ${canonicalTracking} ya está asignado al estante ${existingAssignment.shelfCode}. ¿Deseas autorizar su traslado a ${targetShelf.code}?`,
          },
          { status: 409 }
        );
      }

      const now = new Date().toISOString();
      const previousShelfCode = existingAssignment ? existingAssignment.shelfCode : null;
      const movementType = previousShelfCode ? 'TRASLADO' : 'ASIGNACION';

      state.assignments[canonicalKey] = {
        trackingId: canonicalTracking,
        shelfId: targetShelf.id,
        shelfCode: targetShelf.code,
        assignedBy: authUser.username,
        assignedAt: now,
      };

      const movement: ShelfMovement = {
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        trackingId: canonicalTracking,
        clientName,
        fromShelfCode: previousShelfCode,
        toShelfCode: targetShelf.code,
        movementType,
        performedBy: authUser.username,
        reason: previousShelfCode
          ? String(body.reason || `Traslado de ${previousShelfCode} a ${targetShelf.code}`)
          : String(body.reason || `Asignación inicial a estante ${targetShelf.code}`),
        createdAt: now,
      };

      state.movements.unshift(movement);
      await saveMobileState(state);

      const shelfCount = Object.values(state.assignments).filter(
        (a) => a.shelfCode.toUpperCase() === targetShelf.code.toUpperCase()
      ).length;

      return NextResponse.json({
        success: true,
        movementType,
        message: previousShelfCode
          ? `Paquete ${canonicalTracking} trasladado de ${previousShelfCode} → ${targetShelf.code}`
          : `Paquete ${canonicalTracking} asignado al estante ${targetShelf.code}`,
        assignment: state.assignments[canonicalKey],
        shelfPackageCount: shelfCount,
        package: {
          tracking: canonicalTracking,
          client: clientName,
          shelfCode: targetShelf.code,
          previousShelfCode,
        },
      });
    }

    // 4. LIBERACIÓN MANUAL DE ESTANTE (Desasignar sin entregar)
    if (action === 'RELEASE_PACKAGE') {
      const rawTracking = String(body.trackingId || '').trim();
      const upperKey = rawTracking.toUpperCase();
      const state = await loadMobileState();
      const existing = state.assignments[upperKey];

      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'El paquete no tiene ninguna ubicación asignada actualmente.' },
          { status: 404 }
        );
      }

      const prevShelf = existing.shelfCode;
      delete state.assignments[upperKey];

      state.movements.unshift({
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        trackingId: existing.trackingId,
        clientName: String(body.clientName || 'Cliente JRS'),
        fromShelfCode: prevShelf,
        toShelfCode: null,
        movementType: 'LIBERACION_MANUAL',
        performedBy: authUser.username,
        reason: String(body.reason || 'Retiro manual de estante hacia pendientes de ubicación'),
        createdAt: new Date().toISOString(),
      });

      await saveMobileState(state);

      return NextResponse.json({
        success: true,
        message: `Ubicación ${prevShelf} liberada para el paquete ${existing.trackingId}.`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Acción no reconocida: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error('POST /api/mobile error:', err);
    return NextResponse.json(
      { success: false, error: 'Error interno al procesar la operación en Mobile.' },
      { status: 500 }
    );
  }
}
