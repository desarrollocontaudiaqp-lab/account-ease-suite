## Módulo Egresos — Plan de implementación

Módulo completo de gestión de egresos siguiendo la arquitectura existente (React + Supabase + RLS + Plus Jakarta Sans + sidebar shadcn).

### 1. Base de datos (migración Supabase)

Tablas nuevas en `public`:

- **expense_categories** — id, nombre, orden, icono, activo, created_at
- **expense_subcategories** — id, categoria_id (FK), nombre, orden, activo
- **expenses** — id, codigo, fecha, empresa_id (sede_id), centro_costo, categoria_id, subcategoria_id, concepto, proveedor_nombre, proveedor_ruc, tipo_comprobante, serie, numero, moneda, subtotal, igv, total, metodo_pago_id, cuenta_bancaria, estado, responsable_id, observaciones, created_by, created_at, updated_at, sede_id
- **expense_attachments** — id, expense_id (FK cascade), file_name, file_path, mime_type, size_bytes, uploaded_by, uploaded_at
- **expense_approvals** — id, expense_id, aprobador_id, accion (aprobado/rechazado), comentario, created_at
- **expense_status_history** — id, expense_id, estado_anterior, estado_nuevo, user_id, comentario, created_at

Cada tabla con: `GRANT`s correctos (`authenticated` + `service_role`), `ENABLE ROW LEVEL SECURITY`, políticas alineadas con roles existentes (Admin/Gerente full, otros según sede vía `user_has_sede` y `has_role`).

Secuencia: función `get_next_expense_code()` (formato `EGR-YYYY-NNNNN`) siguiendo el patrón de `get_next_workflow_code`.

Seeds: insertar las 14 categorías + subcategorías listadas por el usuario.

Storage: bucket privado `expense-attachments` con políticas RLS en `storage.objects`.

### 2. Sidebar

Agregar a `src/components/layout/AppSidebar.tsx` la entrada "Egresos" (icono `Wallet` o `Receipt`) con submenú colapsable:

- Registro de Egresos → `/egresos`
- Categorías → `/egresos/categorias`
- Reportes → `/egresos/reportes`
- Aprobaciones → `/egresos/aprobaciones`
- Dashboard → `/egresos/dashboard`

Permisos vía `useRolePermisos` con clave `egresos` (Admin/Gerente/Contador acceso completo; otros solo lectura).

### 3. Rutas

Registrar en `src/App.tsx`:

```
/egresos              → Egresos.tsx (lista + crear)
/egresos/categorias   → EgresosCategorias.tsx
/egresos/reportes     → EgresosReportes.tsx
/egresos/aprobaciones → EgresosAprobaciones.tsx
/egresos/dashboard    → EgresosDashboard.tsx
```

### 4. Componentes nuevos

```
src/pages/
  Egresos.tsx
  EgresosCategorias.tsx
  EgresosReportes.tsx
  EgresosAprobaciones.tsx
  EgresosDashboard.tsx

src/components/egresos/
  CreateExpenseDialog.tsx        # Modal de creación rápida + completa
  EditExpenseDialog.tsx
  ExpenseDetailModal.tsx         # Detalle + historial + adjuntos
  ExpenseTable.tsx               # Tabla con búsqueda/filtros/paginación
  ExpenseFilters.tsx             # Filtros: fecha, empresa, categoría, estado, proveedor, responsable
  ExpenseStatusBadge.tsx
  ExpenseAttachments.tsx         # Upload/list/delete (storage)
  ExpenseApprovalActions.tsx     # Aprobar/Rechazar con comentario
  CategoryManager.tsx            # CRUD categorías y subcategorías jerárquico
  ExpenseDashboardCards.tsx
  ExpenseChartsByCategory.tsx
  ExpenseChartsMonthly.tsx
  TopProveedoresChart.tsx

src/hooks/
  useExpenses.tsx
  useExpenseCategories.tsx
  useExpenseDashboard.tsx

src/lib/
  expenseExport.ts               # Excel (xlsx), CSV, PDF (jsPDF/reportlab-equivalent ya usado)
```

### 5. Flujo de estados

`Borrador → Pendiente → Aprobado/Rechazado → Pagado → Anulado`

- Transiciones validadas en frontend + trigger SQL que escribe en `expense_status_history`.
- Solo Admin/Gerente/Contador pueden aprobar.
- Cada cambio registra usuario, fecha y comentario.

### 6. Dashboard

Cards: total mes, total año, # documentos, ticket promedio.
Gráficos (recharts, ya en el stack):
- Barra: egresos por categoría
- Barra apilada: por empresa/sede
- Donut: por centro de costo
- Línea: evolución mensual (12 meses)
- Tabla: top 10 proveedores
- Comparativo año actual vs anterior

Aplicar `BlurredValue` para roles sin permiso financiero (regla del proyecto).

### 7. Reportes

Pantalla con filtros + tabla paginada + botones de exportación:
- Excel: usa `src/lib/exportToExcel.ts` existente
- CSV: helper nuevo en `expenseExport.ts`
- PDF: patrón de `generateProformaPDF.ts`

### 8. UX/UI

- Tipografía Plus Jakarta Sans (regla del proyecto).
- Acciones críticas (Ver Detalle, Aprobar, Pago) **siempre visibles** en tabla (regla del proyecto).
- Parseo manual de fechas YYYY-MM-DD (regla del proyecto).
- Responsive con `useIsMobile`.
- Modal de creación rápida desde sidebar/topbar.

### 9. Detalles técnicos

- **Múltiples empresas/sucursales**: reutilizar `sedes` + `useSedeContext` ya existentes.
- **Centro de costo**: campo libre por ahora (texto) — extensible a tabla futura.
- **Adjuntos**: bucket Supabase `expense-attachments`, límite 10MB (regla del proyecto), tipos: PDF/XML/imagen/Office.
- **Auditoría**: `created_by`, `updated_at`, trigger `expense_status_history`.
- **Códigos**: `EGR-YYYY-NNNNN` vía función SQL con `WHERE id = v_id` (regla del proyecto sobre RLS-compliant sequences).
- **Métodos de pago / cuenta bancaria**: reutilizar tabla `metodos_pago` existente; cuenta bancaria como texto.

### 10. Orden de ejecución

1. Migración SQL (tablas + grants + RLS + función secuencia + seeds + bucket)
2. Tipos Supabase se auto-regeneran
3. Hooks (`useExpenses`, `useExpenseCategories`, `useExpenseDashboard`)
4. Componentes compartidos (badge, filters, attachments)
5. Páginas: Registro → Categorías → Aprobaciones → Reportes → Dashboard
6. Sidebar + rutas
7. Verificación: build + smoke test de creación/aprobación

### Notas

- Es un módulo grande (~15-20 archivos nuevos + 1 migración importante). Implementación incremental en este turno enfocada primero en base de datos, sidebar, rutas y pantalla principal de Registro; el resto en iteraciones siguientes para mantener cada cambio verificable.
- Confirma si quieres que avance todo en este turno o por fases (recomiendo fases: Fase 1 = DB + sidebar + Registro + Categorías; Fase 2 = Aprobaciones + estados; Fase 3 = Dashboard + Reportes + exportaciones).
