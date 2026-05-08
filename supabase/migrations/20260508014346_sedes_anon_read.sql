-- Permitir a usuarios anónimos ver sedes activas (necesario para el desplegable del login)
CREATE POLICY "Anon can view active sedes"
ON public.sedes
FOR SELECT
TO anon
USING (activa = true);
