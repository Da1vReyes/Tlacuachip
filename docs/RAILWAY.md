# Desplegar Tlacuachic en Railway

Este repositorio ya incluye un `railway.json` dentro de cada servicio. Railway
debe crear **cinco servicios** dentro del mismo proyecto: Postgres, catálogo,
usuarios, mercado e interfaz web. No se deben publicar secretos ni copiar
archivos `.env` al repositorio.

## Antes de empezar

1. Confirma que la rama que vas a desplegar contiene estos cambios y súbela a
   GitHub.
2. Crea una cuenta/proyecto en Railway y revisa el saldo o crédito vigente en
   su panel. Railway no debe asumirse como hosting gratuito permanente; sus
   créditos y precios cambian. Consulta su página oficial antes de activar
   facturación: <https://railway.com/pricing>.
3. Genera dos secretos localmente; pégalos solo en Railway:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))" # CATALOG_INTERNAL_API_KEY / INTERNAL_API_KEY
```

## Orden de despliegue

### 1. Base de datos

En Railway, agrega **PostgreSQL**. Llámalo `Postgres`. No abras una URL pública
para la base. Railway expone su conexión a los servicios mediante
`${{Postgres.DATABASE_URL}}`.

### 2. Servicio `catalog`

1. **New → GitHub Repo**, selecciona este repositorio.
2. En Settings, define **Root Directory**: `services/catalog-service`.
3. Railway detectará `railway.json`.
4. En Variables agrega:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
INTERNAL_API_KEY=<tu segundo secreto>
ALLOWED_ORIGINS=https://<dominio-web-que-crearas>.up.railway.app
```

5. Genera un dominio público para este servicio. Guárdalo; será la URL del
   catálogo para el navegador.

### 3. Servicio `users`

Root Directory: `services/user-service`.

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<tu primer secreto>
CATALOG_INTERNAL_API_KEY=<tu segundo secreto>
CATALOG_SERVICE_URL=https://<dominio-publico-catalog>.up.railway.app
ALLOWED_ORIGINS=https://<dominio-web-que-crearas>.up.railway.app
```

Genera y guarda su dominio público.

### 4. Servicio `market`

Root Directory: `server`.

```text
OPENROUTER_API_KEY=<tu clave privada de OpenRouter>
OPENROUTER_MODEL=deepseek/deepseek-chat-v3.1
OPENROUTER_REFERER=https://<dominio-web-que-crearas>.up.railway.app
AI_RATE_LIMIT_PER_MINUTE=20
ALLOWED_ORIGINS=https://<dominio-web-que-crearas>.up.railway.app
```

Genera y guarda su dominio público. Si no agregas `OPENROUTER_API_KEY`, la app
continúa con sus fallbacks, pero el reporte no tendrá interpretación con IA.

> El repositorio incluye un extracto piloto, versionado y atribuido, de
> cafeterías de CDMX proveniente de DENUE. Así la oferta del demo no depende de
> Overpass. El import completo de 22 MB se mantiene fuera de Git; vuelve a
> generarlo con `npm run import:denue` cuando actualices la fuente oficial.

### 5. Servicio `web`

Créalo al final, con Root Directory: `web`. **Antes de su primer deploy**, agrega
estas variables de build (Vite las incrusta al compilar):

```text
VITE_API_URL=https://<dominio-publico-market>.up.railway.app
VITE_USER_SERVICE_URL=https://<dominio-publico-users>.up.railway.app
VITE_CATALOG_SERVICE_URL=https://<dominio-publico-catalog>.up.railway.app
```

Luego genera su dominio público. Copia ese dominio y reemplázalo en
`ALLOWED_ORIGINS` de los tres servicios API; redepliega esos servicios. Si
cambias cualquiera de las variables `VITE_*`, redepliega `web` porque son
variables de compilación, no variables que el navegador lea en tiempo real.

## Verificación de lanzamiento

Cuando las cinco piezas estén activas, abre:

```text
https://<market>/api/health
https://<users>/api/health
https://<catalog>/api/health
https://<web>/
```

Cada health check debe devolver `{"ok":true}`. Después prueba registro,
privacidad, conversación, invitación, colaboración, CSV y completar tarea.

## Cargar la demo para el jurado

Una base nueva empieza correctamente vacía. Después de que `catalog` y `users`
estén sanos, abre la Shell del servicio `users` en Railway y ejecuta una sola
vez:

```bash
npm run seed:showcase
```

Esto crea **cuentas y datos señalados como demo**, nunca proveedores reales:
un emprendedor, el contador Mateo Cruz, una colaboración ya aceptada, el plan
fiscal y un CSV. Sirve para mostrar el flujo entero con una sola sesión de
demo. Las credenciales toman `DEMO_ACCOUNT_EMAIL` y `DEMO_ACCOUNT_PASSWORD` de
las variables de Railway; define ambos con valores de demo no sensibles.

## Desarrollo reproducible

Para levantar la plataforma completa localmente sin cuatro terminales:

```bash
docker compose up --build
```

La configuración de Compose es solo local y usa secretos de desarrollo por
defecto. Para borrar la base local usa `docker compose down -v`; nunca ejecutes
ese comando contra una base de Railway.
