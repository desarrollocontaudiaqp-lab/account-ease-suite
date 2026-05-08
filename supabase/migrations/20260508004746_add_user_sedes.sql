-- Tabla para asignar múltiples sedes a un usuario
CREATE TABLE IF NOT EXISTS public.user_sedes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sede_id uuid NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sede_id)
);

ALTER TABLE public.user_sedes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view user_sedes"
  ON public.user_sedes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage user_sedes"
  ON public.user_sedes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

-- Función: verificar si un usuario tiene asignada una sede (en user_sedes o como sede principal)
CREATE OR REPLACE FUNCTION public.user_has_sede(_user_id uuid, _sede_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_sedes
    WHERE user_id = _user_id AND sede_id = _sede_id
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND sede_id = _sede_id
  );
$$;

-- Migrar datos existentes: replicar profiles.sede_id en user_sedes
INSERT INTO public.user_sedes (user_id, sede_id)
SELECT p.id, p.sede_id
FROM public.profiles p
WHERE p.sede_id IS NOT NULL
ON CONFLICT (user_id, sede_id) DO NOTHING;
