-- ============================================================================
-- JRS CARGO MOBILE — ESQUEMA DE UBICACIONES FÍSICAS, ASIGNACIONES Y MOVIMIENTOS
-- Integrado con la tabla existente `public.local_inventory` (sin duplicar paquetes)
-- ============================================================================

-- 1. Tabla de Ubicaciones Físicas (Estantes)
CREATE TABLE IF NOT EXISTS public.warehouse_shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,               -- Ej: CR-A-01-01
  name TEXT NOT NULL,                      -- Ej: Bodega CR · Estante A · Nivel 01 · Posición 01
  warehouse TEXT NOT NULL DEFAULT 'CR',    -- Bodega (CR)
  zone TEXT NOT NULL,                      -- Zona / Estante (A, B, C...)
  rack TEXT NOT NULL DEFAULT '01',         -- Estante / Módulo
  level TEXT NOT NULL,                     -- Nivel (01, 02, 03...)
  position TEXT NOT NULL,                  -- Posición (01, 02, 03...)
  qr_payload TEXT NOT NULL UNIQUE,         -- Ej: JRS-LOC:CR-A-01-01 (sin datos personales)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Asignaciones Activas (1 paquete = máximo 1 ubicación física activa)
CREATE TABLE IF NOT EXISTS public.package_shelf_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT NOT NULL UNIQUE REFERENCES public.local_inventory(id) ON UPDATE CASCADE ON DELETE CASCADE,
  shelf_id UUID NOT NULL REFERENCES public.warehouse_shelves(id) ON DELETE RESTRICT,
  shelf_code TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_package_shelf_assignments_shelf_code
  ON public.package_shelf_assignments(shelf_code);

-- 3. Tabla de Historial de Movimientos de Bodega
CREATE TABLE IF NOT EXISTS public.shelf_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT NOT NULL,
  client_name TEXT,
  from_shelf_code TEXT,
  to_shelf_code TEXT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('ASIGNACION', 'TRASLADO', 'SALIDA_ENTREGADO', 'LIBERACION_MANUAL')),
  performed_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shelf_movements_tracking_id
  ON public.shelf_movements(tracking_id);

CREATE INDEX IF NOT EXISTS idx_shelf_movements_created_at
  ON public.shelf_movements(created_at DESC);

-- 4. Trigger en PostgreSQL para liberación automática cuando local_inventory.status pasa a 'Entregado'
CREATE OR REPLACE FUNCTION public.fn_release_shelf_on_package_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_shelf TEXT;
BEGIN
  IF (NEW.status ILIKE '%Entregad%' OR NEW.status ILIKE '%Eliminad%')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    SELECT shelf_code INTO v_prev_shelf
    FROM public.package_shelf_assignments
    WHERE tracking_id = NEW.id;

    IF v_prev_shelf IS NOT NULL THEN
      DELETE FROM public.package_shelf_assignments
      WHERE tracking_id = NEW.id;

      INSERT INTO public.shelf_movements (
        tracking_id,
        client_name,
        from_shelf_code,
        to_shelf_code,
        movement_type,
        performed_by,
        reason
      ) VALUES (
        NEW.id,
        NEW.client,
        v_prev_shelf,
        NULL,
        'SALIDA_ENTREGADO',
        'Trigger Base de Datos',
        'Liberación automática al cambiar estado a Entregado en local_inventory'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_release_shelf_on_delivered ON public.local_inventory;
CREATE TRIGGER trg_release_shelf_on_delivered
  AFTER UPDATE OF status ON public.local_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_release_shelf_on_package_delivered();
