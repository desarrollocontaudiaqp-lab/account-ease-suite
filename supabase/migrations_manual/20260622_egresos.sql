-- ============================================================================
-- Módulo EGRESOS — Fase 1
-- Ejecuta este script completo en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/mnrassdxhwykmldzubzr/sql/new
-- ============================================================================

-- 1) ENUM de estados
DO $$ BEGIN
  CREATE TYPE public.expense_status AS ENUM
    ('borrador','pendiente','aprobado','rechazado','pagado','anulado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2) TABLAS
-- ============================================================================

-- Categorías
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  color TEXT,
  icono TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Subcategorías
CREATE TABLE IF NOT EXISTS public.expense_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(categoria_id, nombre)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_subcategories TO authenticated;
GRANT ALL ON public.expense_subcategories TO service_role;
ALTER TABLE public.expense_subcategories ENABLE ROW LEVEL SECURITY;

-- Secuencias EGR-YYYY-NNNNN
CREATE TABLE IF NOT EXISTS public.expense_secuencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefijo TEXT NOT NULL DEFAULT 'EGR',
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  anio_vigente INTEGER NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE)::INTEGER,
  digitos_correlativo INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_secuencias TO authenticated;
GRANT ALL ON public.expense_secuencias TO service_role;
ALTER TABLE public.expense_secuencias ENABLE ROW LEVEL SECURITY;

-- Egresos (cabecera)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  estado public.expense_status NOT NULL DEFAULT 'borrador',
  sede_id UUID REFERENCES public.sedes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  subcategoria_id UUID REFERENCES public.expense_subcategories(id) ON DELETE SET NULL,
  centro_costo TEXT,
  proveedor_nombre TEXT,
  proveedor_documento TEXT,
  tipo_documento TEXT,
  serie_documento TEXT,
  numero_documento TEXT,
  fecha_emision DATE,
  fecha_egreso DATE NOT NULL DEFAULT CURRENT_DATE,
  moneda TEXT NOT NULL DEFAULT 'PEN',
  tipo_cambio NUMERIC(10,4),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  igv NUMERIC(14,2) NOT NULL DEFAULT 0,
  otros_impuestos NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  metodo_pago TEXT,
  cuenta_bancaria TEXT,
  banco TEXT,
  referencia_pago TEXT,
  descripcion TEXT,
  observaciones TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_fecha_egreso ON public.expenses(fecha_egreso DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_estado ON public.expenses(estado);
CREATE INDEX IF NOT EXISTS idx_expenses_sede ON public.expenses(sede_id);
CREATE INDEX IF NOT EXISTS idx_expenses_categoria ON public.expenses(categoria_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Adjuntos
CREATE TABLE IF NOT EXISTS public.expense_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense ON public.expense_attachments(expense_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_attachments TO authenticated;
GRANT ALL ON public.expense_attachments TO service_role;
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;

-- Historial de aprobaciones
CREATE TABLE IF NOT EXISTS public.expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  accion TEXT NOT NULL, -- aprobar, rechazar, solicitar_cambios
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_expense ON public.expense_approvals(expense_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_approvals TO authenticated;
GRANT ALL ON public.expense_approvals TO service_role;
ALTER TABLE public.expense_approvals ENABLE ROW LEVEL SECURITY;

-- Historial de estados
CREATE TABLE IF NOT EXISTS public.expense_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  estado_anterior public.expense_status,
  estado_nuevo public.expense_status NOT NULL,
  user_id UUID,
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expense_status_history_expense ON public.expense_status_history(expense_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_status_history TO authenticated;
GRANT ALL ON public.expense_status_history TO service_role;
ALTER TABLE public.expense_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3) RLS POLICIES
-- ============================================================================

-- Categorías & Subcategorías: lectura todos los autenticados; escritura admin/gerente
DROP POLICY IF EXISTS "Authenticated can read expense_categories" ON public.expense_categories;
CREATE POLICY "Authenticated can read expense_categories"
  ON public.expense_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin/Gerente manage expense_categories" ON public.expense_categories;
CREATE POLICY "Admin/Gerente manage expense_categories"
  ON public.expense_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'gerente'))
  WITH CHECK (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'gerente'));

DROP POLICY IF EXISTS "Authenticated can read expense_subcategories" ON public.expense_subcategories;
CREATE POLICY "Authenticated can read expense_subcategories"
  ON public.expense_subcategories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin/Gerente manage expense_subcategories" ON public.expense_subcategories;
CREATE POLICY "Admin/Gerente manage expense_subcategories"
  ON public.expense_subcategories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'gerente'))
  WITH CHECK (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'gerente'));

-- Secuencias: lectura todos; sólo admin/gerente las editan directamente (la función SECURITY DEFINER bypassea)
DROP POLICY IF EXISTS "Authenticated read expense_secuencias" ON public.expense_secuencias;
CREATE POLICY "Authenticated read expense_secuencias"
  ON public.expense_secuencias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin manage expense_secuencias" ON public.expense_secuencias;
CREATE POLICY "Admin manage expense_secuencias"
  ON public.expense_secuencias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador'))
  WITH CHECK (public.has_role(auth.uid(),'administrador'));

-- Expenses: lectura por sede, escritura básica autenticados; aprobación restringida en código
DROP POLICY IF EXISTS "Read expenses by sede" ON public.expenses;
CREATE POLICY "Read expenses by sede"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.user_has_sede(auth.uid(), sede_id));

DROP POLICY IF EXISTS "Insert expenses" ON public.expenses;
CREATE POLICY "Insert expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.user_has_sede(auth.uid(), sede_id));

DROP POLICY IF EXISTS "Update expenses" ON public.expenses;
CREATE POLICY "Update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.user_has_sede(auth.uid(), sede_id))
  WITH CHECK (public.user_has_sede(auth.uid(), sede_id));

DROP POLICY IF EXISTS "Delete expenses admin/gerente" ON public.expenses;
CREATE POLICY "Delete expenses admin/gerente"
  ON public.expenses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'gerente'));

-- Adjuntos: ligados a expenses
DROP POLICY IF EXISTS "Manage expense_attachments by expense" ON public.expense_attachments;
CREATE POLICY "Manage expense_attachments by expense"
  ON public.expense_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.user_has_sede(auth.uid(), e.sede_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.user_has_sede(auth.uid(), e.sede_id)));

-- Aprobaciones: lectura por sede; insert sólo admin/gerente
DROP POLICY IF EXISTS "Read expense_approvals by sede" ON public.expense_approvals;
CREATE POLICY "Read expense_approvals by sede"
  ON public.expense_approvals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.user_has_sede(auth.uid(), e.sede_id)));
DROP POLICY IF EXISTS "Insert expense_approvals admin/gerente" ON public.expense_approvals;
CREATE POLICY "Insert expense_approvals admin/gerente"
  ON public.expense_approvals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'gerente'));

-- Historial: lectura por sede; insert vía trigger SECURITY DEFINER
DROP POLICY IF EXISTS "Read expense_status_history by sede" ON public.expense_status_history;
CREATE POLICY "Read expense_status_history by sede"
  ON public.expense_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.user_has_sede(auth.uid(), e.sede_id)));
DROP POLICY IF EXISTS "Insert expense_status_history" ON public.expense_status_history;
CREATE POLICY "Insert expense_status_history"
  ON public.expense_status_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 4) FUNCIONES Y TRIGGERS
-- ============================================================================

-- Secuencia EGR-YYYY-NNNNN
CREATE OR REPLACE FUNCTION public.get_next_expense_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefijo TEXT;
  v_numero INTEGER;
  v_anio INTEGER;
  v_digitos INTEGER;
  v_id UUID;
  v_actual_anio INTEGER := EXTRACT(year FROM CURRENT_DATE)::INTEGER;
BEGIN
  SELECT id INTO v_id FROM public.expense_secuencias LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.expense_secuencias DEFAULT VALUES RETURNING id INTO v_id;
  END IF;

  -- reset anual
  UPDATE public.expense_secuencias
  SET ultimo_numero = CASE WHEN anio_vigente <> v_actual_anio THEN 0 ELSE ultimo_numero END,
      anio_vigente = v_actual_anio
  WHERE id = v_id;

  UPDATE public.expense_secuencias
  SET ultimo_numero = ultimo_numero + 1, updated_at = now()
  WHERE id = v_id
  RETURNING prefijo, ultimo_numero, anio_vigente, digitos_correlativo
  INTO v_prefijo, v_numero, v_anio, v_digitos;

  RETURN v_prefijo || '-' || v_anio::TEXT || '-' || LPAD(v_numero::TEXT, v_digitos, '0');
END $$;

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_expenses_updated ON public.expenses;
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_expense_categories_updated ON public.expense_categories;
CREATE TRIGGER trg_expense_categories_updated BEFORE UPDATE ON public.expense_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_expense_subcategories_updated ON public.expense_subcategories
;
CREATE TRIGGER trg_expense_subcategories_updated BEFORE UPDATE ON public.expense_subcategories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-asignar sede_id desde el perfil del usuario si no se especifica
DROP TRIGGER IF EXISTS trg_expenses_set_sede ON public.expenses;
CREATE TRIGGER trg_expenses_set_sede BEFORE INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_sede_from_user();

-- Trigger: registrar cambios de estado
CREATE OR REPLACE FUNCTION public.log_expense_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.expense_status_history(expense_id, estado_anterior, estado_nuevo, user_id)
    VALUES (NEW.id, NULL, NEW.estado, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO public.expense_status_history(expense_id, estado_anterior, estado_nuevo, user_id)
    VALUES (NEW.id, OLD.estado, NEW.estado, auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_expenses_log_status ON public.expenses;
CREATE TRIGGER trg_expenses_log_status AFTER INSERT OR UPDATE OF estado ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_expense_status_change();

-- ============================================================================
-- 5) RLS de Storage (bucket: expense-attachments)
-- ============================================================================
DROP POLICY IF EXISTS "expense_attachments read auth" ON storage.objects;
CREATE POLICY "expense_attachments read auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'expense-attachments');

DROP POLICY IF EXISTS "expense_attachments insert auth" ON storage.objects;
CREATE POLICY "expense_attachments insert auth"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-attachments');

DROP POLICY IF EXISTS "expense_attachments delete auth" ON storage.objects;
CREATE POLICY "expense_attachments delete auth"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'expense-attachments');

-- ============================================================================
-- 6) SEED de categorías
-- ============================================================================
INSERT INTO public.expense_categories (nombre, descripcion, orden) VALUES
  ('Personal','Sueldos, beneficios sociales, bonificaciones',1),
  ('Administrativo','Gastos de oficina, papelería, servicios',2),
  ('Tecnológico','Software, hardware, licencias, hosting',3),
  ('Comercial','Marketing, publicidad, comisiones',4),
  ('Operativo','Insumos, materiales, mantenimiento',5),
  ('Financiero','Comisiones bancarias, intereses, ITF',6),
  ('Impuestos','SUNAT, tributos municipales, contribuciones',7),
  ('Capacitación','Cursos, certificaciones, eventos',8),
  ('Representación','Comidas, viajes de negocios',9),
  ('Dirección','Gastos de gerencia y directorio',10),
  ('Inversiones','Activos fijos, equipamiento',11),
  ('Extraordinarios','Gastos no recurrentes o imprevistos',12),
  ('Intermediario','Pagos a terceros por cuenta de clientes',13),
  ('Devoluciones','Reembolsos y devoluciones',14)
ON CONFLICT (nombre) DO NOTHING;

-- Listo. Verifica que no haya errores y refresca la app.