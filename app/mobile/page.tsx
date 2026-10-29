'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Home,
  Package,
  QrCode,
  Layers,
  History,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  Printer,
  Download,
  Camera,
  X,
  ChevronRight,
  Wifi,
  WifiOff,
  MapPin,
  Box,
  ArrowLeft,
  Power,
  LogOut,
  Lock,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { generateQrMatrix, generateShelfLabelsPdf } from '@/lib/qr-generator';
import { formatCostaRicaDateTime } from '@/lib/billing';

interface MobilePackage {
  tracking: string;
  client: string;
  casillero: string;
  weight: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  shelfCode: string | null;
  shelfId: string | null;
  assignedAt: string | null;
  assignedBy: string | null;
}

interface MobileShelf {
  id: string;
  code: string;
  name: string;
  warehouse: string;
  zone: string;
  rack: string;
  level: string;
  position: string;
  qrPayload: string;
  isActive: boolean;
  packageCount: number;
  packages: MobilePackage[];
}

interface MobileMovement {
  id: string;
  trackingId: string;
  clientName: string;
  fromShelfCode: string | null;
  toShelfCode: string | null;
  movementType: 'ASIGNACION' | 'TRASLADO' | 'SALIDA_ENTREGADO' | 'LIBERACION_MANUAL';
  performedBy: string;
  reason: string;
  createdAt: string;
}

interface MobileUser {
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  rawRole: string;
}

type ActiveTab = 'inicio' | 'inventario' | 'escanear' | 'estantes' | 'historial';

// Componente SVG para renderizar cualquier QR ISO/IEC 18004 de ubicación
function ShelfQrSvg({ payload, size = 160 }: { payload: string; size?: number }) {
  const matrix = useMemo(() => generateQrMatrix(payload), [payload]);
  const n = matrix.length;
  const quietZone = 2;
  const total = n + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      className="bg-white rounded-xl border border-slate-200 shadow-xs mx-auto"
      shapeRendering="crispEdges"
    >
      <rect width={total} height={total} fill="#FFFFFF" />
      {matrix.map((row, r) =>
        row.map((dark, c) =>
          dark ? (
            <rect
              key={`${r}-${c}`}
              x={c + quietZone}
              y={r + quietZone}
              width={1}
              height={1}
              fill="#0B1D2B"
            />
          ) : null
        )
      )}
    </svg>
  );
}

// Sonido corto de confirmación para uso en bodega
function playBeep(type: 'success' | 'warning' | 'error' = 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } else if (type === 'warning') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch {
    // Ignorar si el navegador bloquea Web Audio
  }
}

export default function JrsCargoMobilePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inicio');
  const [inventorySubTab, setInventorySubTab] = useState<'sin-ubicacion' | 'en-estantes'>('sin-ubicacion');
  const [scanProcessMode, setScanProcessMode] = useState<'proceso-b' | 'proceso-a'>('proceso-b');

  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Autenticación dedicada para JRS Cargo Mobile
  const [isMobileAuthenticated, setIsMobileAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [user, setUser] = useState<MobileUser | null>(null);
  const [metrics, setMetrics] = useState({
    totalEnBodega: 0,
    asignados: 0,
    pendientesUbicacion: 0,
    entregadosHoy: 0,
    totalEstantesActivos: 0,
  });
  const [packages, setPackages] = useState<MobilePackage[]>([]);
  const [shelves, setShelves] = useState<MobileShelf[]>([]);
  const [movements, setMovements] = useState<MobileMovement[]>([]);

  // Filtros en Inventario y Estantes
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShelfFilter, setSelectedShelfFilter] = useState('TODOS');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('TODOS');
  const [historySearch, setHistorySearch] = useState('');

  // Estado para Proceso A (Paquete seleccionado -> Asignar o trasladar a estante)
  const [selectedPackageForAssign, setSelectedPackageForAssign] = useState<MobilePackage | null>(null);
  const [manualShelfInput, setManualShelfInput] = useState('');

  // Estado para Proceso B (Escanear primero el estante -> escanear paquetes en ráfaga)
  const [activeBatchShelf, setActiveBatchShelf] = useState<MobileShelf | null>(null);
  const [batchShelfInput, setBatchShelfInput] = useState('');
  const [batchTrackingInput, setBatchTrackingInput] = useState('');
  const [batchRecentAssigned, setBatchRecentAssigned] = useState<
    Array<{ tracking: string; client: string; shelfCode: string; time: string; movedFrom?: string | null }>
  >([]);

  // Estado para Proceso A dentro de pestaña Escanear
  const [lookupTrackingInput, setLookupTrackingInput] = useState('');
  const [lookupPackageResult, setLookupPackageResult] = useState<MobilePackage | null>(null);

  // Alerta de confirmación de traslado cuando el paquete ya tiene estante
  const [pendingTransferPrompt, setPendingTransferPrompt] = useState<{
    tracking: string;
    client: string;
    currentShelf: string;
    targetShelf: string;
  } | null>(null);

  // Detalle de estante seleccionado y modal de nuevo estante
  const [selectedShelfDetail, setSelectedShelfDetail] = useState<MobileShelf | null>(null);
  const [showNewShelfModal, setShowNewShelfModal] = useState(false);
  const [newShelfForm, setNewShelfForm] = useState({
    warehouse: 'CR',
    zone: 'A',
    rack: '01',
    level: '01',
    position: '01',
  });
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Notificación visual flotante (Toast operativo)
  const [toast, setToast] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Escáner de cámara (QR y Código de Barras)
  const [cameraModal, setCameraModal] = useState<{
    open: boolean;
    purpose: 'scan-shelf-for-package' | 'scan-batch-shelf' | 'scan-batch-package' | 'scan-lookup-package' | 'scan-inventory-search';
    title: string;
  }>({ open: false, purpose: 'scan-batch-shelf', title: '' });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const [cameraError, setCameraError] = useState('');

  const showToast = useCallback((type: 'success' | 'warning' | 'error', title: string, message: string) => {
    playBeep(type);
    setToast({ type, title, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  // Título dinámico de la pestaña del navegador
  useEffect(() => {
    const titles: Record<ActiveTab, string> = {
      inicio: 'Inicio | JRS Cargo Mobile',
      inventario: 'Inventario | JRS Cargo Mobile',
      escanear: 'Escanear QR | JRS Cargo Mobile',
      estantes: 'Estantes | JRS Cargo Mobile',
      historial: 'Historial | JRS Cargo Mobile',
    };
    if (typeof document !== 'undefined') {
      document.title = titles[activeTab] || 'JRS Cargo Mobile';
    }
  }, [activeTab]);

  // Monitor de conexión Online / Offline
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const fetchMobileData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/mobile', { cache: 'no-store' });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('jrs_mobile_session_verified');
        }
        setIsMobileAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setMetrics(data.metrics);
        setPackages(data.packages || []);
        setShelves(data.shelves || []);
        setMovements(data.movements || []);

        // Actualizar referencias activas si están abiertas
        if (selectedShelfDetail) {
          const updatedShelf = (data.shelves || []).find(
            (s: MobileShelf) => s.code.toUpperCase() === selectedShelfDetail.code.toUpperCase()
          );
          if (updatedShelf) setSelectedShelfDetail(updatedShelf);
        }
        if (activeBatchShelf) {
          const updatedBatchShelf = (data.shelves || []).find(
            (s: MobileShelf) => s.code.toUpperCase() === activeBatchShelf.code.toUpperCase()
          );
          if (updatedBatchShelf) setActiveBatchShelf(updatedBatchShelf);
        }
      }
    } catch (err) {
      console.error('Error cargando datos de Mobile:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedShelfDetail, activeBatchShelf]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const verified = sessionStorage.getItem('jrs_mobile_session_verified') === '1';
      setIsMobileAuthenticated(verified);
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!isMobileAuthenticated) return;
    fetchMobileData();
    const interval = setInterval(() => fetchMobileData(true), 20000);
    return () => clearInterval(interval);
  }, [fetchMobileData, isMobileAuthenticated]);

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) return;
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
          remember: true,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('jrs_mobile_session_verified', '1');
        }
        setLoginPassword('');
        setIsLoading(true);
        setIsMobileAuthenticated(true);
      } else {
        setLoginError(data.error || 'Usuario o contraseña incorrectos.');
        playBeep('error');
      }
    } catch {
      setLoginError('Error de conexión. Verifica tu acceso a internet.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMobileLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('jrs_mobile_session_verified');
    }
    setIsMobileAuthenticated(false);
    setUser(null);
    setLoginPassword('');
    setLoginError('');
  };

  // Función central para asignar o trasladar un paquete a un estante
  const executeAssignPackage = useCallback(
    async (trackingId: string, shelfCodeOrQr: string, confirmMove = false) => {
      try {
        const res = await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: confirmMove ? 'MOVE_PACKAGE' : 'ASSIGN_PACKAGE',
            trackingId: trackingId.trim(),
            shelfCode: shelfCodeOrQr.trim(),
            confirmMove,
          }),
        });
        const data = await res.json();

        if (res.status === 409 && data.code === 'ALREADY_ASSIGNED') {
          setPendingTransferPrompt({
            tracking: data.tracking,
            client: data.client,
            currentShelf: data.currentShelf,
            targetShelf: data.targetShelf,
          });
          playBeep('warning');
          return false;
        }

        if (!res.ok || !data.success) {
          showToast('error', 'No se pudo asignar', data.error || 'Error al procesar el paquete.');
          return false;
        }

        showToast(
          'success',
          data.idempotent
            ? 'Ya ubicado en este estante'
            : data.movementType === 'TRASLADO'
              ? 'Traslado completado'
              : 'Paquete ubicado',
          data.message
        );

        if (activeBatchShelf && data.package) {
          setBatchRecentAssigned((prev) => [
            {
              tracking: data.package.tracking,
              client: data.package.client,
              shelfCode: data.package.shelfCode,
              movedFrom: data.package.previousShelfCode,
              time: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            },
            ...prev.slice(0, 19),
          ]);
        }

        setSelectedPackageForAssign(null);
        setManualShelfInput('');
        setPendingTransferPrompt(null);
        await fetchMobileData(true);

        // Si estamos en Proceso A (consulta individual), actualizar el paquete mostrado
        if (lookupPackageResult && data.package) {
          setLookupPackageResult((prev) =>
            prev && prev.tracking.toUpperCase() === data.package.tracking.toUpperCase()
              ? { ...prev, shelfCode: data.package.shelfCode }
              : prev
          );
        }

        return true;
      } catch {
        showToast('error', 'Error de conexión', 'Verifica tu conexión a internet e intenta nuevamente.');
        return false;
      }
    },
    [activeBatchShelf, fetchMobileData, lookupPackageResult, showToast]
  );

  // Liberación manual de estante
  const handleManualRelease = async (pkg: MobilePackage) => {
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RELEASE_PACKAGE',
          trackingId: pkg.tracking,
          clientName: pkg.client,
          reason: 'Liberación manual desde JRS Cargo Mobile',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Ubicación liberada', data.message);
        await fetchMobileData(true);
      } else {
        showToast('error', 'Error', data.error || 'No se pudo liberar la ubicación.');
      }
    } catch {
      showToast('error', 'Error de red', 'No fue posible conectar con el servidor.');
    }
  };

  // Seleccionar estante para Proceso B (por código o QR)
  const selectBatchShelfByCode = useCallback(
    (rawCode: string) => {
      const clean = rawCode.trim().toUpperCase().replace(/^JRS-LOC:/, '');
      if (!clean) return;
      const found = shelves.find((s) => s.code.toUpperCase() === clean);
      if (!found) {
        showToast('error', 'Estante no encontrado', `El código "${clean}" no corresponde a un estante registrado.`);
        return;
      }
      if (!found.isActive) {
        showToast('error', 'Estante inactivo', `El estante ${found.code} está desactivado.`);
        return;
      }
      setActiveBatchShelf(found);
      setBatchShelfInput('');
      setBatchRecentAssigned([]);
      showToast('success', `Estante ${found.code} activo`, 'Ahora escanea consecutivamente los paquetes a ubicar.');
    },
    [shelves, showToast]
  );

  // Buscar paquete en Proceso A
  const handleLookupPackage = useCallback(
    (rawTracking: string) => {
      const clean = rawTracking.trim().toUpperCase();
      if (!clean) return;
      const stripped = clean
        .replace(/^420(?:\d{9}|\d{5})(?=9\d{14,})/i, '')
        .replace(/^420\d{5}/i, '');

      const found = packages.find((p) => {
        const idUpper = p.tracking.toUpperCase();
        return (
          idUpper === clean ||
          idUpper === stripped ||
          (stripped.length >= 8 && (idUpper.endsWith(stripped) || stripped.endsWith(idUpper)))
        );
      });

      if (!found) {
        setLookupPackageResult(null);
        showToast(
          'error',
          'No registrado en Bodega CR',
          `El tracking "${rawTracking}" no se encuentra en /admin/inventario.`
        );
        return;
      }

      setLookupPackageResult(found);
      playBeep('success');
    },
    [packages, showToast]
  );

  // Crear nuevo estante (Solo Admin)
  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_SHELF',
          ...newShelfForm,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Estante creado', data.message);
        setShowNewShelfModal(false);
        await fetchMobileData(true);
      } else {
        showToast('error', 'No se pudo crear', data.error || 'Error al crear estante.');
      }
    } catch {
      showToast('error', 'Error de red', 'No se pudo crear el estante.');
    }
  };

  // Activar / Desactivar estante (Solo Admin)
  const handleToggleShelf = async (shelf: MobileShelf) => {
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_SHELF',
          shelfCode: shelf.code,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Estado actualizado', data.message);
        await fetchMobileData(true);
      } else {
        showToast('error', 'Acción bloqueada', data.error || 'No se pudo cambiar el estado del estante.');
      }
    } catch {
      showToast('error', 'Error de conexión', 'Intenta nuevamente.');
    }
  };

  // Descargar PDF con una o varias etiquetas QR
  const handleDownloadLabelsPdf = async (targetShelves: MobileShelf[], filename: string) => {
    if (targetShelves.length === 0) return;
    setIsDownloadingPdf(true);
    try {
      const bytes = await generateShelfLabelsPdf(
        targetShelves.map((s) => ({
          code: s.code,
          warehouse: s.warehouse,
          zone: s.zone,
          rack: s.rack,
          level: s.level,
          position: s.position,
          qrPayload: s.qrPayload,
        }))
      );
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', 'PDF generado', `Se descargó ${filename} con ${targetShelves.length} etiqueta(s).`);
    } catch (err) {
      console.error('Error generando PDF:', err);
      showToast('error', 'Error PDF', 'No se pudo generar el archivo PDF de etiquetas.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Imprimir etiqueta individual
  const handlePrintSingleShelf = (shelf: MobileShelf) => {
    handleDownloadLabelsPdf([shelf], `etiqueta-${shelf.code}.pdf`);
  };

  // Manejo del escáner de cámara (BarcodeDetector nativo + fallback visual)
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleDetectedCode = useCallback(
    async (rawValue: string) => {
      const code = rawValue.trim();
      if (!code) return;
      const purpose = cameraModal.purpose;
      stopCamera();
      setCameraModal((prev) => ({ ...prev, open: false }));

      if (purpose === 'scan-shelf-for-package' && selectedPackageForAssign) {
        await executeAssignPackage(selectedPackageForAssign.tracking, code);
      } else if (purpose === 'scan-batch-shelf') {
        selectBatchShelfByCode(code);
      } else if (purpose === 'scan-batch-package' && activeBatchShelf) {
        await executeAssignPackage(code, activeBatchShelf.code);
      } else if (purpose === 'scan-lookup-package') {
        setLookupTrackingInput(code);
        handleLookupPackage(code);
      } else if (purpose === 'scan-inventory-search') {
        setSearchQuery(code);
      }
    },
    [
      activeBatchShelf,
      cameraModal.purpose,
      executeAssignPackage,
      handleLookupPackage,
      selectBatchShelfByCode,
      selectedPackageForAssign,
      stopCamera,
    ]
  );

  useEffect(() => {
    if (!cameraModal.open) {
      stopCamera();
      return;
    }

    let cancelled = false;
    setCameraError('');

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('Tu navegador no permite acceso directo a la cámara. Usa el campo de escaneo rápido abajo.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => null);
        }

        const BarcodeDetectorClass = (
          window as unknown as {
            BarcodeDetector?: new (opts: { formats: string[] }) => {
              detect: (video: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
            };
          }
        ).BarcodeDetector;

        if (BarcodeDetectorClass) {
          const detector = new BarcodeDetectorClass({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'itf', 'data_matrix'],
          });

          const loop = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              if (videoRef.current.readyState >= 2) {
                const results = await detector.detect(videoRef.current);
                if (results && results.length > 0 && results[0].rawValue) {
                  await handleDetectedCode(results[0].rawValue);
                  return;
                }
              }
            } catch {
              // Continuar siguiente frame
            }
            scanLoopRef.current = requestAnimationFrame(loop);
          };
          scanLoopRef.current = requestAnimationFrame(loop);
        } else {
          setCameraError(
            'Cámara activa. Si tu dispositivo no detecta automáticamente el código, escanéalo con el lector o selecciónalo abajo.'
          );
        }
      } catch {
        setCameraError('No se pudo abrir la cámara. Verifica los permisos del navegador o escribe el código abajo.');
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraModal.open, handleDetectedCode, stopCamera]);

  // Paquetes filtrados para pestaña Inventario
  const pendingPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packages.filter((p) => {
      const isEligible = !p.status.toLowerCase().includes('entregad') && !p.shelfCode;
      if (!isEligible) return false;
      if (!q) return true;
      return (
        p.tracking.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.casillero.toLowerCase().includes(q)
      );
    });
  }, [packages, searchQuery]);

  const assignedPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packages.filter((p) => {
      const isAssigned = !p.status.toLowerCase().includes('entregad') && Boolean(p.shelfCode);
      if (!isAssigned) return false;
      if (selectedShelfFilter !== 'TODOS' && p.shelfCode?.toUpperCase() !== selectedShelfFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.tracking.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.casillero.toLowerCase().includes(q) ||
        (p.shelfCode || '').toLowerCase().includes(q)
      );
    });
  }, [packages, searchQuery, selectedShelfFilter]);

  const filteredMovements = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return movements.filter((m) => {
      if (historyTypeFilter !== 'TODOS' && m.movementType !== historyTypeFilter) return false;
      if (!q) return true;
      return (
        m.trackingId.toLowerCase().includes(q) ||
        (m.clientName || '').toLowerCase().includes(q) ||
        (m.fromShelfCode || '').toLowerCase().includes(q) ||
        (m.toShelfCode || '').toLowerCase().includes(q) ||
        (m.performedBy || '').toLowerCase().includes(q)
      );
    });
  }, [movements, historyTypeFilter, historySearch]);

  const canModify = user?.role === 'admin' || user?.role === 'operator';
  const isAdmin = user?.role === 'admin';

  const getMovementBadge = (type: MobileMovement['movementType']) => {
    switch (type) {
      case 'ASIGNACION':
        return { label: 'Asignación', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'TRASLADO':
        return { label: 'Traslado', cls: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'SALIDA_ENTREGADO':
        return { label: 'Liberado (Entregado)', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'LIBERACION_MANUAL':
        return { label: 'Retiro Manual', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0B1D2B] text-white">
        <RefreshCw size={26} className="animate-spin text-brand-yellow" />
      </div>
    );
  }

  // PANTALLA DE INICIO DE SESIÓN EXCLUSIVA DE JRS CARGO MOBILE
  if (!isMobileAuthenticated) {
    return (
      <div className="min-h-dvh flex flex-col justify-between bg-gradient-to-b from-[#0B1D2B] via-[#0F293D] to-[#0B1D2B] text-white p-6 max-w-md mx-auto">
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-yellow/20 border border-brand-yellow/40 flex items-center justify-center text-brand-yellow font-black text-xs">
              QR
            </div>
            <span className="text-xs font-black tracking-wider uppercase text-slate-200">
              JRS Cargo Mobile
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
              isOnline
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>

        <div className="my-auto py-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-brand-yellow/15 border-2 border-brand-yellow/40 flex items-center justify-center mx-auto shadow-xl">
              <QrCode size={34} className="text-brand-yellow" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">JRS Cargo Mobile</h1>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Ingresa tus credenciales operativas para gestionar estantes y ubicaciones QR de bodega.
            </p>
          </div>

          <form
            onSubmit={handleMobileLogin}
            className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl"
          >
            {loginError && (
              <div className="p-3 rounded-2xl bg-red-500/20 border border-red-400/40 text-xs font-bold text-red-200 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-300 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Tu usuario de JRS Cargo"
                  className="w-full pl-10 pr-4 py-3.5 bg-[#0B1D2B]/80 border border-white/15 rounded-2xl text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-yellow"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3.5 bg-[#0B1D2B]/80 border border-white/15 rounded-2xl text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-yellow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 rounded-2xl bg-brand-yellow hover:bg-[#e09416] text-[#0B1D2B] font-black text-sm uppercase tracking-wider shadow-lg active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Iniciar Sesión</span>
              )}
            </button>
          </form>
        </div>

        <div className="text-center pb-2 space-y-2">
          <p className="text-[11px] text-slate-400">
            Sincronizado en tiempo real con el Inventario CR de JRS Cargo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col pb-24 max-w-md mx-auto bg-[#F4F7FA] shadow-xl relative">
      {/* TOP BAR CORPORATIVO */}
      <header className="sticky top-0 z-30 bg-[#0B1D2B] text-white px-4 py-3.5 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-yellow/15 border border-brand-yellow/40 flex items-center justify-center text-brand-yellow font-black text-sm shrink-0">
              QR
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm tracking-wide uppercase truncate">JRS Cargo Mobile</h1>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
                  }`}
                >
                  {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                  {isOnline ? 'En línea' : 'Offline'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {user ? `${user.username} · ${user.role === 'admin' ? 'Administrador' : user.role === 'operator' ? 'Operador' : 'Consulta'}` : 'Sincronizado con Inventario CR'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchMobileData()}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
              title="Sincronizar con Inventario CR"
            >
              <RefreshCw size={17} className={isRefreshing ? 'animate-spin text-brand-yellow' : ''} />
            </button>
            <Link
              href="/admin/inventario"
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-bold text-slate-200 flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              Admin
            </Link>
            <button
              type="button"
              onClick={handleMobileLogout}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-colors"
              title="Cerrar sesión en JRS Cargo Mobile"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* TOAST OPERATIVO FLOTANTE */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm animate-slide-up">
          <div
            className={`p-3.5 rounded-2xl shadow-2xl border flex items-start gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-white border-emerald-500/40'
                : toast.type === 'warning'
                  ? 'bg-amber-950 text-white border-amber-500/40'
                  : 'bg-red-950 text-white border-red-500/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-wider">{toast.title}</p>
              <p className="text-xs text-slate-200 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white p-1">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw size={28} className="animate-spin text-brand-blue" />
            <p className="text-sm font-bold">Sincronizando inventario de bodega...</p>
          </div>
        ) : (
          <>
            {/* =========================================================
                PESTAÑA 1: INICIO
               ========================================================= */}
            {activeTab === 'inicio' && (
              <div className="space-y-4">
                {/* Tarjetas de métricas en vivo */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('inventario');
                      setInventorySubTab('sin-ubicacion');
                    }}
                    className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs text-left hover:border-amber-400 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">
                        Sin Ubicación
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">{metrics.pendientesUbicacion}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Pendientes de estante →</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('inventario');
                      setInventorySubTab('en-estantes');
                    }}
                    className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs text-left hover:border-emerald-400 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                        En Estantes
                      </span>
                      <MapPin size={15} className="text-emerald-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">{metrics.asignados}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Ubicación física activa →</p>
                  </button>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-brand-blue">
                        Total en Bodega
                      </span>
                      <Package size={15} className="text-brand-blue" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{metrics.totalEnBodega}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Inventario físico CR</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                        Entregados Hoy
                      </span>
                      <CheckCircle2 size={15} className="text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{metrics.entregadosHoy}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Liberados de estante</p>
                  </div>
                </div>

                {/* Acciones Operativas Rápidas */}
                <div className="bg-gradient-to-br from-[#0B1D2B] to-[#12435E] rounded-3xl p-4 text-white shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-yellow">
                        Operación en Bodega
                      </span>
                      <h2 className="text-base font-black">Asignación Rápida por QR</h2>
                    </div>
                    <QrCode size={26} className="text-brand-yellow" />
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setScanProcessMode('proceso-b');
                        setActiveTab('escanear');
                      }}
                      className="w-full py-3.5 px-4 rounded-2xl bg-brand-yellow text-[#0B1D2B] font-black text-sm flex items-center justify-between shadow-md active:scale-[0.99] transition-transform"
                    >
                      <span className="flex items-center gap-2.5">
                        <QrCode size={19} />
                        <span>Proceso B: Escanear Estante Primero</span>
                      </span>
                      <ChevronRight size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setScanProcessMode('proceso-a');
                        setActiveTab('escanear');
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-between border border-white/15"
                    >
                      <span className="flex items-center gap-2.5">
                        <Search size={17} className="text-brand-yellow" />
                        <span>Proceso A: Buscar / Escanear Paquete</span>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Movimientos Recientes */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Movimientos Recientes
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('historial')}
                      className="text-xs font-bold text-brand-blue hover:underline"
                    >
                      Ver todo ({movements.length})
                    </button>
                  </div>

                  {movements.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      Aún no se registran movimientos de estantes.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {movements.slice(0, 6).map((mov) => {
                        const badge = getMovementBadge(mov.movementType);
                        return (
                          <div
                            key={mov.id}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${badge.cls}`}
                                >
                                  {badge.label}
                                </span>
                                <span className="font-mono text-xs font-black text-slate-800 truncate">
                                  {mov.trackingId}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-600 truncate mt-1">
                                {mov.clientName}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {mov.fromShelfCode ? `${mov.fromShelfCode} → ` : ''}
                                <strong className="text-slate-700">
                                  {mov.toShelfCode || 'Liberado (Fuera de estante)'}
                                </strong>{' '}
                                · {mov.performedBy}
                              </p>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                              {formatCostaRicaDateTime(new Date(mov.createdAt))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================
                PESTAÑA 2: INVENTARIO (SIN UBICACIÓN / EN ESTANTES)
               ========================================================= */}
            {activeTab === 'inventario' && (
              <div className="space-y-3.5">
                {/* Selector Sin Ubicación vs En Estantes */}
                <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setInventorySubTab('sin-ubicacion')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      inventorySubTab === 'sin-ubicacion'
                        ? 'bg-white text-[#0B1D2B] shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <span>Sin ubicación</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                      {metrics.pendientesUbicacion}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInventorySubTab('en-estantes')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      inventorySubTab === 'en-estantes'
                        ? 'bg-white text-[#0B1D2B] shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <span>En estantes</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                      {metrics.asignados}
                    </span>
                  </button>
                </div>

                {/* Buscador por tracking, cliente o casillero + botón cámara */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar tracking, cliente o casillero..."
                      className="w-full pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-brand-blue"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCameraModal({
                        open: true,
                        purpose: 'scan-inventory-search',
                        title: 'Escanear Código de Barras / Guía',
                      })
                    }
                    className="px-3.5 py-3 bg-[#0B1D2B] text-brand-yellow rounded-2xl flex items-center justify-center shadow-xs"
                    title="Escanear con cámara"
                  >
                    <Camera size={18} />
                  </button>
                </div>

                {/* Filtro por estante cuando estamos en "En estantes" */}
                {inventorySubTab === 'en-estantes' && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => setSelectedShelfFilter('TODOS')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${
                        selectedShelfFilter === 'TODOS'
                          ? 'bg-brand-blue text-white border-brand-blue'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Todos ({metrics.asignados})
                    </button>
                    {shelves.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedShelfFilter(s.code.toUpperCase())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${
                          selectedShelfFilter === s.code.toUpperCase()
                            ? 'bg-brand-blue text-white border-brand-blue'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {s.code} ({s.packageCount})
                      </button>
                    ))}
                  </div>
                )}

                {/* LISTA DE PAQUETES SIN UBICACIÓN */}
                {inventorySubTab === 'sin-ubicacion' && (
                  <div className="space-y-2.5">
                    {pendingPackages.length === 0 ? (
                      <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80">
                        <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-black text-slate-800">
                          No hay paquetes pendientes de ubicación
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Todos los paquetes en bodega tienen estante asignado o coinciden con tu filtro.
                        </p>
                      </div>
                    ) : (
                      pendingPackages.map((pkg) => (
                        <div
                          key={pkg.tracking}
                          className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase mb-1">
                                Ubicación: Sin asignar
                              </span>
                              <p className="font-mono text-xs font-black text-brand-blue break-all">
                                {pkg.tracking}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] shrink-0">
                              {pkg.weight}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2">
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-800">{pkg.client}</span>
                              <span className="text-slate-400"> · {pkg.casillero}</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                              {pkg.status}
                            </span>
                          </div>

                          {canModify && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPackageForAssign(pkg);
                                setManualShelfInput('');
                              }}
                              className="w-full py-3 rounded-xl bg-brand-blue hover:bg-[#0c2f42] text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
                            >
                              <QrCode size={16} className="text-brand-yellow" />
                              <span>Asignar estante</span>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* LISTA DE PAQUETES EN ESTANTES */}
                {inventorySubTab === 'en-estantes' && (
                  <div className="space-y-2.5">
                    {assignedPackages.length === 0 ? (
                      <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80">
                        <Box size={32} className="text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-black text-slate-800">
                          No se encontraron paquetes en estantes
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Asigna paquetes desde la pestaña Sin ubicación o mediante el escáner QR.
                        </p>
                      </div>
                    ) : (
                      assignedPackages.map((pkg) => (
                        <div
                          key={pkg.tracking}
                          className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#0B1D2B] text-brand-yellow text-xs font-black">
                                  <MapPin size={11} />
                                  {pkg.shelfCode}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  por {pkg.assignedBy}
                                </span>
                              </div>
                              <p className="font-mono text-xs font-black text-slate-900 break-all">
                                {pkg.tracking}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] shrink-0">
                              {pkg.weight}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2">
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-800">{pkg.client}</span>
                              <span className="text-slate-400"> · {pkg.casillero}</span>
                            </div>
                          </div>

                          {canModify && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPackageForAssign(pkg);
                                  setManualShelfInput('');
                                }}
                                className="py-2.5 px-3 rounded-xl bg-brand-blue/10 text-brand-blue font-black text-xs flex items-center justify-center gap-1.5 hover:bg-brand-blue/15"
                              >
                                <ArrowRightLeft size={14} />
                                <span>Mover paquete</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleManualRelease(pkg)}
                                className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-50 hover:text-red-600"
                              >
                                <X size={14} />
                                <span>Liberar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                PESTAÑA 3: ESCANEAR (PROCESO B Y PROCESO A)
               ========================================================= */}
            {activeTab === 'escanear' && (
              <div className="space-y-4">
                {/* Selector de Proceso B vs Proceso A */}
                <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setScanProcessMode('proceso-b')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                      scanProcessMode === 'proceso-b'
                        ? 'bg-[#0B1D2B] text-brand-yellow shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Proceso B: Estante 1º
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanProcessMode('proceso-a')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                      scanProcessMode === 'proceso-a'
                        ? 'bg-[#0B1D2B] text-brand-yellow shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Proceso A: Paquete 1º
                  </button>
                </div>

                {/* PROCESO B: ESCANEAR PRIMERO EL ESTANTE -> MÚLTIPLES PAQUETES */}
                {scanProcessMode === 'proceso-b' && (
                  <div className="space-y-4">
                    {!activeBatchShelf ? (
                      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                        <div className="text-center space-y-1">
                          <span className="px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-wider">
                            Paso 1 de 2 · Modo Ráfaga
                          </span>
                          <h2 className="text-base font-black text-slate-900 pt-1">
                            Escanea el QR del Estante
                          </h2>
                          <p className="text-xs text-slate-500">
                            Identifica primero la ubicación para asignar varios paquetes seguidos.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setCameraModal({
                              open: true,
                              purpose: 'scan-batch-shelf',
                              title: 'Escanear QR del Estante',
                            })
                          }
                          className="w-full py-5 rounded-2xl bg-[#0B1D2B] text-white font-black text-sm flex flex-col items-center justify-center gap-2 shadow-lg active:scale-[0.99]"
                        >
                          <Camera size={28} className="text-brand-yellow" />
                          <span>Abrir Cámara para Escanear QR de Estante</span>
                        </button>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            selectBatchShelfByCode(batchShelfInput);
                          }}
                          className="space-y-2 pt-2 border-t border-slate-100"
                        >
                          <label className="block text-[11px] font-black uppercase text-slate-500">
                            O selecciona / escanea con pistola lectora:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={batchShelfInput}
                              onChange={(e) => setBatchShelfInput(e.target.value)}
                              placeholder="Ej: CR-A-01-01 o JRS-LOC:CR-A-01-01"
                              className="flex-1 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-brand-blue"
                            />
                            <button
                              type="submit"
                              className="px-4 py-3 bg-brand-blue text-white rounded-xl text-xs font-black"
                            >
                              Activar
                            </button>
                          </div>
                        </form>

                        <div className="pt-1">
                          <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">
                            Toque rápido de estantes activos:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {shelves
                              .filter((s) => s.isActive)
                              .map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => selectBatchShelfByCode(s.code)}
                                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-brand-blue/5 hover:border-brand-blue text-left transition-all flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-mono text-xs font-black text-slate-900">{s.code}</p>
                                    <p className="text-[10px] text-slate-500">{s.packageCount} paq.</p>
                                  </div>
                                  <ChevronRight size={15} className="text-slate-400" />
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Cabecera de Estante Activo en Modo Ráfaga */}
                        <div className="bg-[#0B1D2B] text-white rounded-3xl p-5 shadow-lg space-y-3 border border-brand-yellow/30">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-brand-yellow">
                                Ubicación Activa para Asignación Masiva
                              </span>
                              <h2 className="text-2xl font-black font-mono tracking-tight mt-0.5">
                                {activeBatchShelf.code}
                              </h2>
                              <p className="text-xs text-slate-300">{activeBatchShelf.name}</p>
                            </div>
                            <div className="bg-white/10 px-3 py-2 rounded-2xl text-center shrink-0">
                              <p className="text-xl font-black text-brand-yellow">
                                {activeBatchShelf.packageCount}
                              </p>
                              <p className="text-[10px] text-slate-300 uppercase font-bold">Almacenados</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveBatchShelf(null)}
                            className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200"
                          >
                            Cambiar de Estante
                          </button>
                        </div>

                        {/* Escaneo consecutivo de paquetes */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                          <button
                            type="button"
                            onClick={() =>
                              setCameraModal({
                                open: true,
                                purpose: 'scan-batch-package',
                                title: `Escanear Paquete → ${activeBatchShelf.code}`,
                              })
                            }
                            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99]"
                          >
                            <Camera size={22} />
                            <span>Escanear Guía con Cámara → {activeBatchShelf.code}</span>
                          </button>

                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!batchTrackingInput.trim()) return;
                              const code = batchTrackingInput.trim();
                              setBatchTrackingInput('');
                              await executeAssignPackage(code, activeBatchShelf.code);
                            }}
                            className="space-y-2"
                          >
                            <label className="block text-[11px] font-black uppercase text-slate-500">
                              Escaneo continuo (pistola Bluetooth o teclado):
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={batchTrackingInput}
                                onChange={(e) => setBatchTrackingInput(e.target.value)}
                                placeholder="Escanea o escribe el tracking aquí..."
                                autoFocus
                                className="flex-1 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-brand-blue"
                              />
                              <button
                                type="submit"
                                className="px-4 py-3 bg-brand-blue text-white rounded-xl text-xs font-black"
                              >
                                Asignar
                              </button>
                            </div>
                          </form>

                          {/* Lista de paquetes asignados en esta sesión de ráfaga */}
                          {batchRecentAssigned.length > 0 && (
                            <div className="pt-3 border-t border-slate-100 space-y-2">
                              <p className="text-[11px] font-black uppercase text-slate-500">
                                Asignados en esta sesión ({batchRecentAssigned.length}):
                              </p>
                              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                                {batchRecentAssigned.map((item, idx) => (
                                  <div
                                    key={`${item.tracking}-${idx}`}
                                    className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <p className="font-mono font-black text-emerald-950 truncate">
                                        {item.tracking}
                                      </p>
                                      <p className="text-[11px] text-emerald-700 truncate">
                                        {item.client}{' '}
                                        {item.movedFrom ? `(Trasladado desde ${item.movedFrom})` : ''}
                                      </p>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-800 shrink-0">
                                      {item.time}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PROCESO A: BUSCAR / ESCANEAR PAQUETE -> VER UBICACIÓN O ASIGNAR / TRASLADAR */}
                {scanProcessMode === 'proceso-a' && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                    <div className="text-center space-y-1">
                      <span className="px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-wider">
                        Proceso A · Consulta y Ubicación Individual
                      </span>
                      <h2 className="text-base font-black text-slate-900 pt-1">
                        Buscar o Escanear Paquete
                      </h2>
                      <p className="text-xs text-slate-500">
                        Escanea el código de barras de la guía para consultar, asignar o trasladar de estante.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCameraModal({
                          open: true,
                          purpose: 'scan-lookup-package',
                          title: 'Escanear Guía del Paquete',
                        })
                      }
                      className="w-full py-4 rounded-2xl bg-[#0B1D2B] text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-md"
                    >
                      <Camera size={22} className="text-brand-yellow" />
                      <span>Escanear Guía con Cámara</span>
                    </button>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleLookupPackage(lookupTrackingInput);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={lookupTrackingInput}
                        onChange={(e) => setLookupTrackingInput(e.target.value)}
                        placeholder="Escribe o escanea el tracking..."
                        className="flex-1 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-brand-blue"
                      />
                      <button
                        type="submit"
                        className="px-4 py-3 bg-brand-blue text-white rounded-xl text-xs font-black"
                      >
                        Buscar
                      </button>
                    </form>

                    {lookupPackageResult && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase mb-1 ${
                                lookupPackageResult.status.toLowerCase().includes('entregad')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : lookupPackageResult.shelfCode
                                    ? 'bg-[#0B1D2B] text-brand-yellow'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {lookupPackageResult.status.toLowerCase().includes('entregad')
                                ? 'Estado: Entregado (Estante Liberado)'
                                : lookupPackageResult.shelfCode
                                  ? `Estante Actual: ${lookupPackageResult.shelfCode}`
                                  : 'Ubicación: Sin asignar'}
                            </span>
                            <p className="font-mono text-sm font-black text-slate-900 break-all">
                              {lookupPackageResult.tracking}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold">
                            {lookupPackageResult.weight}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-0.5">
                          <p>
                            <strong>Cliente:</strong> {lookupPackageResult.client}
                          </p>
                          <p>
                            <strong>Casillero / Empresa:</strong> {lookupPackageResult.casillero}
                          </p>
                          <p>
                            <strong>Estado Administrativo:</strong> {lookupPackageResult.status}
                          </p>
                        </div>

                        {canModify && !lookupPackageResult.status.toLowerCase().includes('entregad') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPackageForAssign(lookupPackageResult);
                              setManualShelfInput('');
                            }}
                            className="w-full py-3.5 rounded-xl bg-brand-blue text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm"
                          >
                            <QrCode size={17} className="text-brand-yellow" />
                            <span>
                              {lookupPackageResult.shelfCode
                                ? `Mover de ${lookupPackageResult.shelfCode} a otro estante`
                                : 'Asignar estante mediante QR'}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                PESTAÑA 4: ESTANTES (GESTIÓN Y ETIQUETAS QR / PDF)
               ========================================================= */}
            {activeTab === 'estantes' && (
              <div className="space-y-4">
                {!selectedShelfDetail ? (
                  <>
                    {/* Barra de acciones de Estantes */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={isDownloadingPdf}
                        onClick={() =>
                          handleDownloadLabelsPdf(
                            shelves.filter((s) => s.isActive),
                            'etiquetas-estantes-jrs-cargo.pdf'
                          )
                        }
                        className="flex-1 py-3 px-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xs flex items-center justify-center gap-2 shadow-xs hover:border-brand-blue"
                      >
                        <Download size={16} className="text-brand-blue" />
                        <span>{isDownloadingPdf ? 'Generando PDF...' : 'Descargar Etiquetas PDF'}</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowNewShelfModal(true)}
                          className="py-3 px-4 rounded-2xl bg-[#0B1D2B] text-brand-yellow font-black text-xs flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Plus size={16} />
                          <span>Nuevo Estante</span>
                        </button>
                      )}
                    </div>

                    {/* Lista de Estantes */}
                    <div className="grid grid-cols-1 gap-3">
                      {shelves.map((shelf) => (
                        <div
                          key={shelf.id}
                          onClick={() => setSelectedShelfDetail(shelf)}
                          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            shelf.isActive
                              ? 'border-slate-200 hover:border-brand-blue shadow-xs'
                              : 'border-slate-200 opacity-60 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-[#0B1D2B] text-brand-yellow flex flex-col items-center justify-center shrink-0 font-mono">
                              <span className="text-[10px] font-bold text-slate-300 leading-none">
                                EST {shelf.zone}
                              </span>
                              <span className="text-xs font-black mt-0.5">
                                {shelf.level}-{shelf.position}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-sm font-black text-slate-900">{shelf.code}</p>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    shelf.isActive
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {shelf.isActive ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                Bodega {shelf.warehouse} · Estante {shelf.zone} · Nivel {shelf.level} · Pos {shelf.position}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-lg font-black text-brand-blue leading-none">
                                {shelf.packageCount}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Paquetes</p>
                            </div>
                            <ChevronRight size={18} className="text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* VISTA DETALLE DE UN ESTANTE + ETIQUETA QR + PAQUETES ALMACENADOS */
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setSelectedShelfDetail(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-brand-blue"
                    >
                      <ArrowLeft size={15} />
                      <span>Volver a todos los estantes</span>
                    </button>

                    {/* Tarjeta de Etiqueta QR Oficial (Ejemplo exacto de Sección 5) */}
                    <div className="bg-white rounded-3xl p-5 border-2 border-[#0B1D2B] shadow-md text-center space-y-3">
                      <div className="bg-[#0B1D2B] text-brand-yellow py-2.5 px-4 rounded-2xl">
                        <p className="text-base font-black tracking-widest">JRS CARGO</p>
                      </div>

                      <div>
                        <p className="text-lg font-black text-[#0B1D2B]">
                          ESTANTE {selectedShelfDetail.zone}
                        </p>
                        <p className="text-xs font-bold text-slate-500 tracking-wide">
                          NIVEL {selectedShelfDetail.level} — POSICIÓN {selectedShelfDetail.position}
                        </p>
                      </div>

                      <div className="py-1">
                        <ShelfQrSvg payload={selectedShelfDetail.qrPayload} size={175} />
                      </div>

                      <div className="bg-slate-100 border border-slate-300 py-2 px-4 rounded-xl inline-block">
                        <p className="font-mono text-lg font-black text-[#0B1D2B] tracking-wider">
                          {selectedShelfDetail.code}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handlePrintSingleShelf(selectedShelfDetail)}
                          className="py-2.5 px-3 rounded-xl bg-brand-blue text-white font-black text-xs flex items-center justify-center gap-1.5"
                        >
                          <Printer size={15} />
                          <span>Imprimir / PDF</span>
                        </button>

                        {canModify && selectedShelfDetail.isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveBatchShelf(selectedShelfDetail);
                              setSelectedShelfDetail(null);
                              setScanProcessMode('proceso-b');
                              setActiveTab('escanear');
                            }}
                            className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5"
                          >
                            <QrCode size={15} />
                            <span>Asignar Paquetes</span>
                          </button>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleToggleShelf(selectedShelfDetail)}
                          className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Power size={14} />
                          <span>
                            {selectedShelfDetail.isActive ? 'Desactivar ubicación' : 'Activar ubicación'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Lista de paquetes almacenados en este estante */}
                    <div className="bg-white rounded-3xl p-4 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                          Paquetes en {selectedShelfDetail.code}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-black">
                          {selectedShelfDetail.packages.length} almacenados
                        </span>
                      </div>

                      {selectedShelfDetail.packages.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">
                          Este estante está libre actualmente.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedShelfDetail.packages.map((pkg) => (
                            <div
                              key={pkg.tracking}
                              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-mono text-xs font-black text-slate-900 break-all">
                                  {pkg.tracking}
                                </p>
                                <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                  {pkg.weight}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>
                                  <strong className="text-slate-700">{pkg.client}</strong> · {pkg.casillero}
                                </span>
                                {canModify && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPackageForAssign(pkg);
                                      setManualShelfInput('');
                                    }}
                                    className="text-brand-blue font-black text-xs flex items-center gap-1"
                                  >
                                    <ArrowRightLeft size={13} />
                                    Trasladar
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                PESTAÑA 5: HISTORIAL DE MOVIMIENTOS
               ========================================================= */}
            {activeTab === 'historial' && (
              <div className="space-y-3.5">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Buscar por tracking, estante, cliente o usuario..."
                    className="w-full pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-brand-blue"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {[
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'ASIGNACION', label: 'Asignaciones' },
                    { id: 'TRASLADO', label: 'Traslados' },
                    { id: 'SALIDA_ENTREGADO', label: 'Salidas (Entregado)' },
                    { id: 'LIBERACION_MANUAL', label: 'Retiro Manual' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setHistoryTypeFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${
                        historyTypeFilter === f.id
                          ? 'bg-[#0B1D2B] text-brand-yellow border-[#0B1D2B]'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {filteredMovements.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
                    <History size={28} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-black text-slate-700">Sin movimientos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredMovements.map((mov) => {
                      const badge = getMovementBadge(mov.movementType);
                      return (
                        <div
                          key={mov.id}
                          className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              {formatCostaRicaDateTime(new Date(mov.createdAt))}
                            </span>
                          </div>

                          <p className="font-mono text-xs font-black text-slate-900 break-all">
                            {mov.trackingId}
                          </p>

                          <div className="text-xs text-slate-600 space-y-1">
                            <p>
                              <strong>Cliente:</strong> {mov.clientName}
                            </p>
                            <p>
                              <strong>Ubicación:</strong>{' '}
                              {mov.fromShelfCode ? (
                                <span className="font-mono font-bold text-slate-700">{mov.fromShelfCode}</span>
                              ) : (
                                <span className="text-slate-400">Sin asignar</span>
                              )}{' '}
                              →{' '}
                              {mov.toShelfCode ? (
                                <span className="font-mono font-black text-brand-blue">{mov.toShelfCode}</span>
                              ) : (
                                <span className="font-bold text-amber-700">Liberado</span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              <strong>Responsable:</strong> {mov.performedBy} · {mov.reason}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* =========================================================
          MODAL DE ASIGNACIÓN / TRASLADO DE ESTANTE PARA UN PAQUETE (PROCESO A)
         ========================================================= */}
      {selectedPackageForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-blue">
                  {selectedPackageForAssign.shelfCode ? 'Traslado de Estante' : 'Asignar Ubicación Física'}
                </span>
                <h3 className="font-mono text-sm font-black text-slate-900 break-all mt-0.5">
                  {selectedPackageForAssign.tracking}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedPackageForAssign.client} · {selectedPackageForAssign.casillero}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPackageForAssign(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {selectedPackageForAssign.shelfCode && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Ubicación actual: <strong className="font-mono">{selectedPackageForAssign.shelfCode}</strong>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setCameraModal({
                  open: true,
                  purpose: 'scan-shelf-for-package',
                  title: 'Escanear QR del Estante Destino',
                })
              }
              className="w-full py-4 rounded-2xl bg-[#0B1D2B] text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-md"
            >
              <Camera size={20} className="text-brand-yellow" />
              <span>Escanear QR del Estante con Cámara</span>
            </button>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!manualShelfInput.trim()) return;
                await executeAssignPackage(
                  selectedPackageForAssign.tracking,
                  manualShelfInput,
                  Boolean(selectedPackageForAssign.shelfCode)
                );
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualShelfInput}
                onChange={(e) => setManualShelfInput(e.target.value)}
                placeholder="Código o QR del estante (ej: CR-A-01-01)"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-black"
              >
                Guardar
              </button>
            </form>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-black uppercase text-slate-400">
                Seleccionar estante activo:
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {shelves
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        executeAssignPackage(
                          selectedPackageForAssign.tracking,
                          s.code,
                          Boolean(selectedPackageForAssign.shelfCode)
                        )
                      }
                      className="p-3 rounded-xl border border-slate-200 hover:border-brand-blue bg-slate-50 text-left flex items-center justify-between"
                    >
                      <div>
                        <p className="font-mono text-xs font-black text-slate-900">{s.code}</p>
                        <p className="text-[10px] text-slate-500">{s.packageCount} paq.</p>
                      </div>
                      <ChevronRight size={15} className="text-brand-blue" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE CONFIRMACIÓN DE TRASLADO AUTORIZADO
         ========================================================= */}
      {pendingTransferPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Paquete ya tiene ubicación</h3>
                <p className="text-xs text-slate-500">Se requiere confirmar traslado entre estantes</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <p className="font-mono font-black text-slate-900 break-all">
                {pendingTransferPrompt.tracking}
              </p>
              <p className="text-slate-600">{pendingTransferPrompt.client}</p>
              <div className="flex items-center gap-2 pt-1 font-mono font-black">
                <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-900">
                  {pendingTransferPrompt.currentShelf}
                </span>
                <span>→</span>
                <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-900">
                  {pendingTransferPrompt.targetShelf}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPendingTransferPrompt(null)}
                className="py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  executeAssignPackage(
                    pendingTransferPrompt.tracking,
                    pendingTransferPrompt.targetShelf,
                    true
                  )
                }
                className="py-3 rounded-xl bg-brand-blue text-white font-black text-xs"
              >
                Autorizar Traslado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE CREACIÓN DE NUEVO ESTANTE (SOLO ADMIN)
         ========================================================= */}
      {showNewShelfModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateShelf}
            className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase">Crear Nueva Ubicación QR</h3>
              <button
                type="button"
                onClick={() => setShowNewShelfModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Bodega
                </label>
                <input
                  type="text"
                  required
                  value={newShelfForm.warehouse}
                  onChange={(e) => setNewShelfForm({ ...newShelfForm, warehouse: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Zona / Estante (Letra)
                </label>
                <input
                  type="text"
                  required
                  value={newShelfForm.zone}
                  onChange={(e) => setNewShelfForm({ ...newShelfForm, zone: e.target.value.toUpperCase() })}
                  placeholder="A, B, C..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Nivel (Ej: 01, 02)
                </label>
                <input
                  type="text"
                  required
                  value={newShelfForm.level}
                  onChange={(e) => setNewShelfForm({ ...newShelfForm, level: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Posición (Ej: 01, 02)
                </label>
                <input
                  type="text"
                  required
                  value={newShelfForm.position}
                  onChange={(e) => setNewShelfForm({ ...newShelfForm, position: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Vista previa del código</p>
              <p className="font-mono text-base font-black text-[#0B1D2B] mt-0.5">
                {`${newShelfForm.warehouse || 'CR'}-${newShelfForm.zone || 'A'}-${(newShelfForm.level || '01').padStart(2, '0')}-${(newShelfForm.position || '01').padStart(2, '0')}`}
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#0B1D2B] text-brand-yellow font-black text-xs uppercase tracking-wider"
            >
              Crear Estante y Generar QR
            </button>
          </form>
        </div>
      )}

      {/* =========================================================
          MODAL DE CÁMARA ESCÁNER QR / BARCODE
         ========================================================= */}
      {cameraModal.open && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-yellow">
                Escáner Óptico JRS Cargo
              </p>
              <h3 className="text-sm font-black">{cameraModal.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setCameraModal((prev) => ({ ...prev, open: false }))}
              className="p-2 rounded-xl bg-white/10 text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative w-full max-w-xs mx-auto aspect-square rounded-3xl overflow-hidden border-2 border-brand-yellow shadow-2xl bg-slate-950 flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-6 border-2 border-brand-yellow/60 rounded-2xl pointer-events-none">
              <div className="w-full h-0.5 bg-red-500/80 shadow-[0_0_8px_#ef4444] animate-pulse mt-1/2" />
            </div>
          </div>

          <div className="space-y-3 max-w-sm mx-auto w-full pb-4">
            {cameraError && (
              <p className="text-xs text-amber-300 text-center bg-white/10 p-2.5 rounded-xl">
                {cameraError}
              </p>
            )}
            <p className="text-xs text-slate-300 text-center">
              Apunta la cámara al código QR del estante o al código de barras del paquete.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================
          MENÚ INFERIOR FIJO: Inicio | Inventario | Escanear | Estantes | Historial
         ========================================================= */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-2 py-1.5 shadow-[0_-8px_30px_rgba(11,29,43,0.08)]">
        <div className="grid grid-cols-5 gap-1">
          {[
            { id: 'inicio', label: 'Inicio', icon: Home },
            { id: 'inventario', label: 'Inventario', icon: Package, badge: metrics.pendientesUbicacion },
            { id: 'escanear', label: 'Escanear', icon: QrCode, primary: true },
            { id: 'estantes', label: 'Estantes', icon: Layers },
            { id: 'historial', label: 'Historial', icon: History },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all ${
                  item.primary
                    ? isActive
                      ? 'bg-[#0B1D2B] text-brand-yellow shadow-md -translate-y-1'
                      : 'bg-brand-blue text-white -translate-y-0.5'
                    : isActive
                      ? 'text-brand-blue font-black'
                      : 'text-slate-400 hover:text-slate-700 font-semibold'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && !item.primary && (
                  <span className="absolute top-1 right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
