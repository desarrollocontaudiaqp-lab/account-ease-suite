
# Migración de Contratos a Otra Sede

## Viabilidad
Confirmado: las tablas `contratos`, `proformas`, `pagos`, `clientes` y `workflows` ya tienen columna `sede_id`. `registro_ventas` NO tiene `sede_id` (se filtra vía `pago_id → pagos.sede_id`, no requiere cambio). Es viable sin migraciones de esquema, solo actualizaciones de datos y UI. Solo usuarios con permiso podrán ejecutarlo (Administrador/Gerente).

## Alcance de la migración
Al migrar un contrato a una sede destino, se actualiza `sede_id` en:
1. `contratos` (el contrato seleccionado).
2. `proformas` vinculadas al contrato (por `proforma_id` en el contrato y/o `contrato_id` en proforma si existe).
3. `pagos` con `contrato_id` = contrato migrado.
4. `workflows` con `contrato_id` = contrato migrado.
5. `registro_ventas`: no se toca (hereda vía pago).
6. `clientes`: NO se migra (un cliente puede tener contratos en varias sedes). Opcional configurable.

## Trazabilidad
- Nueva tabla `contrato_migraciones` para auditoría: `id, contrato_id, sede_origen_id, sede_destino_id, migrated_by, migrated_at, entidades_afectadas jsonb (conteos), notas`.
- Se registra una fila por contrato migrado en cada operación batch.
- Se conserva el `numero` original del contrato (no se re-numera).

## UI / UX (página /contratos)
1. Checkboxes de selección múltiple en la tabla de contratos (columna izquierda) + "seleccionar todo en página".
2. Barra de acción cuando hay ≥1 seleccionado con botón **"Migrar a otra sede"** (visible solo si `role ∈ {administrador, gerente}`).
3. Modal `MigrateContractsDialog`:
   - Muestra lista de contratos seleccionados (número, cliente, sede actual).
   - Select de **Sede destino** (excluye sedes actuales si todas coinciden).
   - Resumen de entidades a migrar (conteo de proformas, pagos, workflows por contrato) obtenido en preview.
   - Checkbox "Confirmo la migración" + botón Ejecutar.
4. Toast con resultado y refresco de la lista.

## Lógica de ejecución (cliente)
Para cada contrato seleccionado, en secuencia:
1. Leer `proforma_id` del contrato.
2. `UPDATE contratos SET sede_id=destino WHERE id=?`
3. `UPDATE pagos SET sede_id=destino WHERE contrato_id=?`
4. `UPDATE workflows SET sede_id=destino WHERE contrato_id=?`
5. `UPDATE proformas SET sede_id=destino WHERE id=proforma_id` (si existe).
6. `INSERT INTO contrato_migraciones (...)` con conteos.

Si algún paso falla, se registra el error, se continúa con los siguientes contratos, y al final se muestra un reporte (éxitos/fallos). No hay transacción atómica cliente-side; para atomicidad real se puede envolver en una edge function (opcional, fase 2).

## Cambios técnicos

### Base de datos (migración)
```sql
CREATE TABLE public.contrato_migraciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  sede_origen_id uuid REFERENCES public.sedes(id),
  sede_destino_id uuid NOT NULL REFERENCES public.sedes(id),
  migrated_by uuid REFERENCES auth.users(id),
  migrated_at timestamptz NOT NULL DEFAULT now(),
  entidades_afectadas jsonb NOT NULL DEFAULT '{}'::jsonb,
  notas text
);
GRANT SELECT, INSERT ON public.contrato_migraciones TO authenticated;
GRANT ALL ON public.contrato_migraciones TO service_role;
ALTER TABLE public.contrato_migraciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins gerentes ven migraciones" ON public.contrato_migraciones
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente'));
CREATE POLICY "admins gerentes crean migraciones" ON public.contrato_migraciones
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente'));
```

### Archivos
- **Nuevo** `src/components/contratos/MigrateContractsDialog.tsx`: modal + lógica de migración + preview de conteos.
- **Editar** `src/pages/Contratos.tsx`: estado `selectedIds`, columna de checkbox, botón "Migrar a otra sede" y renderizado del modal.
- **Editar** `src/integrations/supabase/types.ts` (auto-regenerado por Supabase tras la migración).

## Validación pre-implementación
- Confirmado que `contratos`, `proformas`, `pagos`, `workflows` tienen `sede_id`.
- `registro_ventas` no requiere cambio (filtra vía `pagos`).
- Permiso restringido a Administrador/Gerente para evitar movimientos accidentales.
- Auditoría persistida en `contrato_migraciones`.

## Validación post-implementación
1. Seleccionar 1 contrato y migrarlo → verificar en DB que contrato, sus pagos, proforma y workflows quedan con `sede_id` destino.
2. Seleccionar 3 contratos con distintos escenarios (con/sin proforma, con/sin workflows) → verificar conteos en `contrato_migraciones`.
3. Verificar que reportes filtrados por sede destino ahora incluyen las entidades migradas y la sede origen ya no las muestra.
4. Verificar que un usuario Asesor NO ve el botón.

## Fuera de alcance (fase 2, opcional)
- Edge function transaccional (rollback atómico entre tablas).
- Migración también del cliente asociado.
- Vista de historial de migraciones en Configuración.

¿Confirmas para implementar?
