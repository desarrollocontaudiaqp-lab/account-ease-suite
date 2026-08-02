-- Supervisión de detalles asignados por contrato
CREATE TABLE IF NOT EXISTS public.detalle_supervisiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  servicio_id text NOT NULL,
  servicio_descripcion text,
  detalle_id text NOT NULL,
  detalle_descripcion text,
  asignado_a uuid,
  estado text NOT NULL DEFAULT 'pendiente',
  observaciones text,
  supervisado_por uuid,
  supervisado_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contrato_id, detalle_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.detalle_supervisiones TO authenticated;
GRANT ALL ON public.detalle_supervisiones TO service_role;
ALTER TABLE public.detalle_supervisiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados pueden ver supervisiones" ON public.detalle_supervisiones;
CREATE POLICY "Autenticados pueden ver supervisiones"
  ON public.detalle_supervisiones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisores pueden registrar supervisiones" ON public.detalle_supervisiones;
CREATE POLICY "Supervisores pueden registrar supervisiones"
  ON public.detalle_supervisiones FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'supervisor')
  );

DROP POLICY IF EXISTS "Supervisores pueden actualizar supervisiones" ON public.detalle_supervisiones;
CREATE POLICY "Supervisores pueden actualizar supervisiones"
  ON public.detalle_supervisiones FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'supervisor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'supervisor')
  );

DROP POLICY IF EXISTS "Admins pueden eliminar supervisiones" ON public.detalle_supervisiones;
CREATE POLICY "Admins pueden eliminar supervisiones"
  ON public.detalle_supervisiones FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'gerente'));

CREATE INDEX IF NOT EXISTS idx_detalle_supervisiones_contrato ON public.detalle_supervisiones(contrato_id);

-- Historial de estados
CREATE TABLE IF NOT EXISTS public.detalle_supervision_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervision_id uuid NOT NULL REFERENCES public.detalle_supervisiones(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL,
  estado_anterior text,
  estado_nuevo text NOT NULL,
  observaciones text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.detalle_supervision_historial TO authenticated;
GRANT ALL ON public.detalle_supervision_historial TO service_role;
ALTER TABLE public.detalle_supervision_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados pueden ver historial supervision" ON public.detalle_supervision_historial;
CREATE POLICY "Autenticados pueden ver historial supervision"
  ON public.detalle_supervision_historial FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados pueden insertar historial supervision" ON public.detalle_supervision_historial;
CREATE POLICY "Autenticados pueden insertar historial supervision"
  ON public.detalle_supervision_historial FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_supervision_historial_sup ON public.detalle_supervision_historial(supervision_id);

DROP TRIGGER IF EXISTS trg_detalle_supervisiones_updated ON public.detalle_supervisiones;
CREATE TRIGGER trg_detalle_supervisiones_updated
  BEFORE UPDATE ON public.detalle_supervisiones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
