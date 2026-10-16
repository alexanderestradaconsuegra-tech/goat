# Despliegue en EasyPanel

Dos servicios de tipo **App** desde el mismo repo: `goat-web` (Next.js) y `goat-admin` (estatico con nginx).

## 1. goat-web
- Source: GitHub `alexanderestradaconsuegra-tech/goat`, rama `main`.
- Build: **Dockerfile**, ruta `Dockerfile`, contexto `/`.
- Puerto del servicio: `3000`.
- Variables de entorno (Environment):
  - `SUPABASE_URL=https://gsvnshhisqsjyhugmldp.supabase.co`  (obligatoria; el valor por defecto del codigo tiene una letra de mas)
  - `SUPABASE_PUBLISHABLE_KEY=<clave publishable>`  (o `SUPABASE_SERVICE_ROLE_KEY` si las politicas RLS lo exigen para inscribir equipos)
- Dominio: asignar el dominio y activar HTTPS (Let's Encrypt).

## 2. goat-admin
- Source: el mismo repo y rama.
- Build: **Dockerfile**, ruta `admin/Dockerfile`, contexto `admin`.
- Puerto del servicio: `80`.
- Sin variables de entorno (URL y clave publishable van en `admin/app.js`).
- Dominio propio, por ejemplo `admin.<tu-dominio>`. Las cabeceras de seguridad y la CSP estan en `admin/nginx.conf`.

## 3. Supabase
En Authentication > URL Configuration agregar el dominio del admin a Site URL / Redirect URLs.

## Verificacion
- `https://<dominio-web>/` carga el sitio y `/api/public-data` responde JSON.
- `https://<dominio-admin>/` muestra el acceso; la consola no debe mostrar errores de CSP.
- Auto-deploy: activar el webhook de GitHub en cada servicio.
