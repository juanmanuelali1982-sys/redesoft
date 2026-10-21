// Regenera el listado del blog (blog/index.html) y el sitemap.xml.
// Uso: npm run blog
// Lee de cada nota: <h1>, meta description, article:published_time y article:section.
// Ignora archivos que empiezan con "_" (plantillas) o que tienen meta robots noindex.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const SITE = "https://redesoft.com.ar";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fecha = (iso) => { const [y, m, d] = iso.split("-"); return `${Number(d)} de ${MESES[Number(m) - 1]} de ${y}`; };
const pick = (html, re) => (html.match(re) || [])[1]?.trim() || "";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

// ── Blog ──
const blogDir = path.join(root, "blog");
const posts = fs.readdirSync(blogDir)
  .filter((f) => f.endsWith(".html") && f !== "index.html" && !f.startsWith("_"))
  .map((f) => {
    const html = fs.readFileSync(path.join(blogDir, f), "utf8");
    if (/<meta name="robots" content="noindex/.test(html)) return null;
    return {
      slug: f.replace(/\.html$/, ""),
      title: unesc(pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/)),
      desc: unesc(pick(html, /<meta name="description" content="([^"]*)"/)),
      date: pick(html, /<meta property="article:published_time" content="([^"]*)"/) || "2026-01-01",
      section: unesc(pick(html, /<meta property="article:section" content="([^"]*)"/)) || "Notas",
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.date.localeCompare(a.date));

const items = posts.map((p) =>
  `<li><time datetime="${p.date}">${fecha(p.date)}</time><div><span class="tag">${esc(p.section)}</span><h2><a href="/blog/${p.slug}">${esc(p.title)}</a></h2><p>${esc(p.desc)}</p></div></li>`).join("\n");
const indexFile = path.join(blogDir, "index.html");
const index = fs.readFileSync(indexFile, "utf8").replace(
  /(<!-- POSTS:START[^>]*-->)[\s\S]*?(<!-- POSTS:END -->)/,
  `$1\n${items}\n$2`,
);
fs.writeFileSync(indexFile, index);

// ── Sitemap ──
const urls = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) { if (f !== "assets") walk(full); continue; }
    if (!f.endsWith(".html") || f === "404.html" || f.startsWith("_")) continue;
    const html = fs.readFileSync(full, "utf8");
    if (/<meta name="robots" content="noindex/.test(html)) continue;
    let rel = "/" + path.relative(root, full).replace(/\\/g, "/");
    rel = rel.endsWith("index.html") ? rel.replace(/index\.html$/, "") : rel.replace(/\.html$/, "");
    const lastmod = pick(html, /<meta property="article:published_time" content="([^"]*)"/) || new Date().toISOString().slice(0, 10);
    urls.push({ loc: SITE + rel, lastmod });
  }
})(root);
urls.sort((a, b) => a.loc.length - b.loc.length || a.loc.localeCompare(b.loc));
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
console.log(`Blog: ${posts.length} notas. Sitemap: ${urls.length} URLs.`);
