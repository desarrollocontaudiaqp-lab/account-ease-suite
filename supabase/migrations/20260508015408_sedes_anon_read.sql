-- Permitir que usuarios no autenticados (anon) vean las sedes activas
-- para poder mostrar el desplegable en la pantalla de login.
DROP POLICY IF EXISTS "Anon can view active sedes" ON public.sedes;

CREATE POLICY "Anon can view active sedes"
ON public.sedes
FOR SELECT
TO anon
USING (activa = true);
