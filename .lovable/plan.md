## Objetivo

Aplicar la migración SQL que falta para que funcione el flujo multisede ya implementado en el frontend (login con selector de sede + asignación de múltiples sedes en el formulario de usuario).

## Por qué hace falta

El frontend ya consulta la tabla `user_sedes` y la función `user_has_sede`, pero ninguna existe todavía en la base de datos (verificado con `to_regclass`). Por eso al editar un usuario con dos sedes aparece error y el login no puede validar permisos.

Estoy en modo Plan, por eso no aparece el botón de aprobación. Al aprobar este plan paso a modo Build y se mostrará el aviso de la migración.

## Cambios en base de datos (migración)

1. Crear tabla `public.user_sedes` (`id`, `user_id`, `sede_id` FK a `sedes` con ON DELETE CASCADE, `created_at`, UNIQUE(user_id, sede_id) + índices).
2. Habilitar RLS:
   - SELECT: cualquier usuario autenticado.
   - ALL: solo Administrador o Gerente.
3. Crear función `public.user_has_sede(_user_id, _sede_id)` SECURITY DEFINER que devuelve true si existe en `user_sedes` o si coincide con `profiles.sede_id` (compatibilidad).
4. Migrar datos existentes: copiar `profiles.sede_id` a `user_sedes` (ON CONFLICT DO NOTHING).
5. Añadir política pública de SELECT en `sedes` (anon + authenticated) limitada a `activa = true`, para poder cargar el desplegable en el login antes de iniciar sesión.

## Flujo final

- **Editar usuario** → asigna 1 o más sedes (componente `MultiSedeSelect`). La primera queda como `profiles.sede_id` (sede activa por defecto).
- **Login** → desplegable de sedes. Valida contra `user_sedes`; si no tiene permiso, `signOut()` + toast. Admin/Gerente entran a cualquier sede.
- **Sede activa** → al iniciar sesión se guarda en `profiles.sede_id`, y todas las RLS existentes (`get_user_sede`) filtran datos solo por esa sede.
- **Cambiar de sede** → cerrar sesión y volver a entrar eligiendo otra.

## Validación post-migración

- Verificar con `SELECT to_regclass('public.user_sedes')` y probar `user_has_sede`.
- Editar un usuario asignando dos sedes → confirmar que guarda sin error.
- Login con la sede asignada → entra y filtra info de esa sede.
- Login con sede no asignada → bloquea con mensaje.
