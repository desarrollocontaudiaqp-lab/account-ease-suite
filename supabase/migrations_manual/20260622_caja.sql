-- ============================================================================
-- Módulo CAJA — Cierres de Caja (parcial / diario)
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================================================

-- 1) ENUM tipo de cierre
DO $$ BEGIN
  CREATE TYPE public.caja_cierre_tipo AS ENUM ('parcial','diario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Secuencia para código CC-YYYY-NNNNN
CREATE TABLE IF NOT EXISTS public.caja_secuencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefijo TEXT NOT NULL DEFAULT 'CC',
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  anio_vigente INTEGER NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE)::INTEGER,
  digitos_correlativo INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caja_secuencias TO authenticated;
GRANT ALL ON public.caja_secuencias TO service_role;
ALTER TABLE public.caja_secuencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "caja_secuencias_select_auth" ON public.caja_secuencias;
DROP POLICY IF EXISTS "caja_secuencias_update_auth" ON public.caja_secuencias;
DROP POLICY IF EXISTS "caja_secuencias_insert_auth" ON public.caja_secuencias;
CREATE POLICY "caja_secuencias_select_auth" ON public.caja_secuencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "caja_secuencias_insert_auth" ON public.caja_secuencias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "caja_secuencias_update_auth" ON public.caja_secuencias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3) Función para generar código CC-YYYY-NNNNN
CREATE OR REPLACE FUNCTION public.get_next_caja_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prefijo TEXT; v_numero INT; v_anio INT; v_digitos INT; v_id UUID;
  v_actual_anio INT := EXTRACT(year FROM CURRENT_DATE)::INT;
BEGIN
  SELECT id INTO v_id FROM public.caja_secuencias LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.caja_secuencias DEFAULT VALUES RETURNING id INTO v_id;
  END IF;
  UPDATE public.caja_secuencias
    SET ultimo_numero = CASE WHEN anio_vigente <> v_actual_anio THEN 0 ELSE ultimo_numero END,
        anio_vigente = v_actual_anio
    WHERE id = v_id;
  UPDATE public.caja_secuencias
    SET ultimo_numero = ultimo_numero + 1, updated_at = now()
    WHERE id = v_id
    RETURNING prefijo, ultimo_numero, anio_vigente, digitos_correlativo
    INTO v_prefijo, v_numero, v_anio, v_digitos;
  RETURN v_prefijo || '-' || v_anio::TEXT || '-' || LPAD(v_numero::TEXT, v_digitos, '0');
END $$;

-- 4) Tabla principal: caja_cierres
CREATE TABLE IF NOT EXISTS public.caja_cierres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  tipo public.caja_cierre_tipo NOT NULL,
  sede_id UUID REFERENCES public.sedes(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio TIMESTAMPTZ NOT NULL,
  hora_fin TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_ingresos NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_egresos NUMERIC(14,2) NOT NULL DEFAULT 0,
  saldo NUMERIC(14,2) NOT NULL DEFAULT 0,
  cantidad_ingresos INTEGER NOT NULL DEFAULT 0,
  cantidad_egresos INTEGER NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'PEN',
  detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  observaciones TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caja_cierres TO authenticated;
GRANT ALL ON public.caja_cierres TO service_role;
ALTER TABLE public.caja_cierres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caja_cierres_select" ON public.caja_cierres;
DROP POLICY IF EXISTS "caja_cierres_insert" ON public.caja_cierres;
DROP POLICY IF EXISTS "caja_cierres_update" ON public.caja_cierres;
DROP POLICY IF EXISTS "caja_cierres_delete" ON public.caja_cierres;

CREATE POLICY "caja_cierres_select" ON public.caja_cierres FOR SELECT TO authenticated
  USING (public.user_has_sede(auth.uid(), sede_id));
CREATE POLICY "caja_cierres_insert" ON public.caja_cierres FOR INSERT TO authenticated
  WITH CHECK (public.user_has_sede(auth.uid(), sede_id));
CREATE POLICY "caja_cierres_update" ON public.caja_cierres FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'gerente'))
  WITH CHECK (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'gerente'));
CREATE POLICY "caja_cierres_delete" ON public.caja_cierres FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'gerente'));

CREATE INDEX IF NOT EXISTS idx_caja_cierres_fecha ON public.caja_cierres(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_caja_cierres_sede ON public.caja_cierres(sede_id);

-- Trigger para asignar sede automáticamente
DROP TRIGGER IF EXISTS set_sede_caja_cierres ON public.caja_cierres;
CREATE TRIGGER set_sede_caja_cierres
  BEFORE INSERT ON public.caja_cierres
  FOR EACH ROW EXECUTE FUNCTION public.set_sede_from_user();
