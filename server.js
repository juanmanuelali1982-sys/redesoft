// Servidor del sitio de Redesoft (Render).
// - Sirve los HTML de /public con URLs limpias (/contacto/, /blog/mi-nota).
// - Aplica las redirecciones 301 de redirects.json (migración desde la web actual).
// - Recibe el formulario de contacto y lo envía por email con Resend.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, "public");
const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === "production";
const CONTACT_TO = process.env.CONTACT_TO || "info@redesoft.com.ar";
const CONTACT_FROM = process.env.CONTACT_FROM || "Web Redesoft <onboarding@resend.dev>";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const CANONICAL_HOST = process.env.CANONICAL_HOST || ""; // ej. redesoft.com.ar (redirige www y otros dominios)

const redirects = Object.fromEntries(
  Object.entries(JSON.parse(fs.readFileSync(path.join(here, "redirects.json"), "utf8"))).filter(([k]) => k.startsWith("/")),
);

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

// Cabeceras de seguridad básicas. Mientras el sitio viva en *.onrender.com no se indexa.
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  if (req.hostname.endsWith(".onrender.com")) res.set("X-Robots-Tag", "noindex, nofollow");
  next();
});

// Dominio canónico (https + sin www) cuando se configura CANONICAL_HOST.
app.use((req, res, next) => {
  if (CANONICAL_HOST && req.hostname !== CANONICAL_HOST && !req.hostname.endsWith(".onrender.com")) {
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
  }
  next();
});

// Redirecciones 301 de la migración.
app.use((req, res, next) => {
  const clean = req.path.length > 1 ? req.path.replace(/\/$/, "") : req.path;
  const target = redirects[req.path] || redirects[clean];
  if (target) return res.redirect(301, target);
  // /blog/nota.html → /blog/nota (una sola URL por nota)
  if (/^\/blog\/[^/]+\.html$/.test(req.path)) return res.redirect(301, req.path.replace(/\.html$/, ""));
  next();
});

// ── Formulario de contacto ────────────────────────────────
const hits = new Map(); // límite simple: 5 envíos cada 10 minutos por IP
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

const INTERESES = {
  erp: "Software de gestión ERP (Flexxus)",
  "erp-mineria": "ERP para proveedores de minería",
  "erp-corralones": "ERP para corralones",
  marketing: "Marketing digital",
  otro: "Otro",
};
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

app.post("/api/contacto", express.json({ limit: "20kb" }), async (req, res) => {
  const b = req.body || {};
  if (b.sitio_web) return res.json({ ok: true }); // honeypot: bot

  const data = {
    nombre: clean(b.nombre, 120),
    empresa: clean(b.empresa, 160),
    email: clean(b.email, 200),
    telefono: clean(b.telefono, 60),
    interes: INTERESES[b.interes] ? b.interes : "",
    mensaje: String(b.mensaje ?? "").trim().slice(0, 4000),
    pagina: clean(b.pagina, 200),
  };
  if (!data.nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !data.interes || !data.mensaje || b.consentimiento !== "si") {
    return res.status(400).json({ error: "Revisá los campos obligatorios." });
  }
  if (rateLimited(req.ip)) return res.status(429).json({ error: "Recibimos varios envíos seguidos. Esperá unos minutos." });

  const rows = [
    ["Interés", INTERESES[data.interes]], ["Nombre", data.nombre], ["Empresa", data.empresa || "—"],
    ["Email", data.email], ["Teléfono", data.telefono || "—"], ["Página", data.pagina || "—"],
  ];
  const html = `<h2>Nueva consulta desde la web</h2><table cellpadding="6">${rows
    .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${escapeHtml(v)}</td></tr>`).join("")}</table>
    <p><strong>Mensaje</strong></p><p>${escapeHtml(data.mensaje).replace(/\n/g, "<br>")}</p>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nMensaje:\n${data.mensaje}`;

  if (!RESEND_API_KEY) {
    console.log("[contacto] RESEND_API_KEY no configurada. Consulta recibida:\n" + text);
    if (PROD) return res.status(503).json({ error: "El formulario todavía no está habilitado." });
    return res.json({ ok: true, dev: true });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: CONTACT_TO.split(",").map((s) => s.trim()),
        reply_to: data.email,
        subject: `Consulta web: ${INTERESES[data.interes]} — ${data.nombre}${data.empresa ? ` (${data.empresa})` : ""}`,
        html,
        text,
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("[contacto]", e.message);
    res.status(502).json({ error: "No pudimos enviar tu consulta en este momento." });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// ── Archivos estáticos ────────────────────────────────────
app.use(express.static(PUBLIC, {
  extensions: ["html"],
  setHeaders(res, file) {
    if (file.endsWith(".html")) res.set("Cache-Control", "public, max-age=300");
    else if (/\.(css|js)$/.test(file)) res.set("Cache-Control", "public, max-age=86400");
    else res.set("Cache-Control", "public, max-age=604800");
  },
}));

app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, "404.html")));

app.listen(PORT, () => console.log(`Redesoft web en :${PORT}`));
