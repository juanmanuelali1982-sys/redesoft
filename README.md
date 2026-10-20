# Sitio web de Redesoft

Sitio corporativo y comercial de Redesoft: Flexxus (software de gestión ERP), soluciones para corralones y
proveedores de minería, marketing digital y blog. HTML estático + un servidor Express mínimo para Render.

## Estructura

```
public/                      Todo lo que se publica
  index.html                 Home
  servicios/                 Servicios, Software de Gestión ERP, Marketing Digital
  soluciones/                Soluciones, ERP para minería, ERP para corralones
  quienes-somos/  politica-de-privacidad/
  contacto/                  Formulario; contacto/gracias/ es la página de conversión (noindex)
  blog/
    index.html               Listado de notas
    *.html                   Una nota por archivo (se ve en /blog/nombre-del-archivo)
    _plantilla-nota.html     Base para escribir notas nuevas (no se indexa)
  assets/css/styles.css      Estilos
  assets/js/main.js          Menú, eventos de medición y formulario
  assets/img/                Logo, favicon, imagen para compartir
  sitemap.xml  robots.txt  404.html
partials/                    Header, footer y etiqueta de Google compartidos (los inserta server.js)
scripts/                     Mantenimiento (blog, sitemap, enlaces)
server.js                    Servidor: URLs limpias, redirecciones 301 y formulario
redirects.json               Redirecciones desde la web actual
VALIDAR.md                   Lo que Redesoft tiene que confirmar antes de publicar
```

## Correr en local

```bash
npm install
npm run dev        # http://localhost:3000
```

Sin `RESEND_API_KEY`, el formulario funciona igual en desarrollo y muestra la consulta en la consola.

## Publicar en Render

1. Subí el repo a GitHub (incluí `package-lock.json`).
2. Render → New → Web Service → elegí el repo.
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Health Check Path: `/health`
3. Variables de entorno:

| Variable | Valor |
|---|---|
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `RESEND_API_KEY` | API key de Resend (sin esto el formulario responde "no habilitado" en producción) |
| `CONTACT_TO` | `info@redesoft.com.ar` (se pueden poner varias separadas por coma) |
| `CONTACT_FROM` | `Web Redesoft <web@redesoft.com.ar>` (requiere el dominio verificado en Resend). Para probar: `Web Redesoft <onboarding@resend.dev>` |
| `CANONICAL_HOST` | `redesoft.com.ar` cuando el dominio apunte a Render |

Mientras el sitio esté en `*.onrender.com` responde con `X-Robots-Tag: noindex` para que Google no lo indexe
antes de tiempo. Las páginas ya tienen `canonical` hacia `https://redesoft.com.ar`.

## Blog

Cada nota es un archivo HTML independiente dentro de `public/blog/`.

1. Duplicá `public/blog/_plantilla-nota.html` → `public/blog/mi-nota.html` (minúsculas y guiones).
2. Seguí las instrucciones del comentario que tiene adentro (título, descripción, fecha, categoría).
3. Corré `npm run blog`: actualiza el listado de `/blog/` y el `sitemap.xml`.

## Header y footer

Están en archivos separados: `partials/header.html` y `partials/footer.html`. Cada página tiene las marcas
`<!-- @header -->` y `<!-- @footer -->`, y `server.js` las reemplaza al servir la página. Google y el
navegador reciben el HTML completo, así que no afecta el SEO.

- Para cambiar el menú o el pie, editá solo el partial correspondiente.
- Para cambiar el contenido de una página, editá solo su archivo.
- La página activa del menú se marca sola según la URL.
- Para ver el sitio en local usá `npm run dev` (abriendo el HTML con doble clic no se ven header ni footer).

## Medición (Google Analytics 4)

La etiqueta de Google (`G-QVLP4NGPRZ`) está en `partials/google-tag.html` y el servidor la inserta en el
`<head>` de todas las páginas. Para cambiar el ID o sumar otra etiqueta (por ejemplo, Meta Pixel), editá solo ese archivo.

Eventos que envía `public/assets/js/main.js`:

| Evento | Cuándo se dispara |
|---|---|
| `muchas_gracias_contacto` | Al llegar a `/contacto/gracias/` después de enviar el formulario (parámetro `interes`). Solo cuenta envíos reales: no se dispara al recargar ni al entrar directo a la URL. |
| `contacto_whatsapp` | Clic en cualquier enlace de WhatsApp (botón flotante, footer, contacto). Parámetro `ubicacion`. |
| `contacto_email` | Clic en el email. |
| `contacto_telefono` | Clic en un teléfono (cuando se agregue). |
| `contacto_como_llegar` | Clic en un enlace a Google Maps. |
| texto del botón | Cada botón genera un evento con su texto: "Solicitar una demo" → `solicitar_una_demo`. Parámetros `ubicacion` (atributo `data-cta`), `page_path` y `link_url`. |

En GA4 → Administrar → Eventos, marcá `muchas_gracias_contacto` (y si querés `contacto_whatsapp`) como
evento clave. Desde ahí se puede importar como conversión en Google Ads.

## Antes de lanzar

Ver `VALIDAR.md` y el checklist del proyecto. Comprobá enlaces con `npm run check`.
