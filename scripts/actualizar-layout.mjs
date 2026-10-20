// Copia partials/header.html y partials/footer.html en todas las páginas
// (reemplaza lo que está entre los marcadores HEADER:START/END y FOOTER:START/END)
// y marca el enlace de la página actual con aria-current="page".
// Uso: editá los partials y corré  npm run layout
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(base, "public");
const header = fs.readFileSync(path.join(base, "partials/header.html"), "utf8").trim();
const footer = fs.readFileSync(path.join(base, "partials/footer.html"), "utf8").trim();

let n = 0;
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) { if (f !== "assets") walk(full); continue; }
    if (!f.endsWith(".html")) continue;
    let rel = "/" + path.relative(root, full).replace(/\\/g, "/");
    rel = rel.endsWith("index.html") ? rel.replace(/index\.html$/, "") : rel.replace(/\.html$/, "");
    let h = header.replace(new RegExp(`href="${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g"), `href="${rel}" aria-current="page"`);
    if (rel.startsWith("/blog/")) h = h.replace('href="/blog/">', 'href="/blog/" aria-current="page">');
    const html = fs.readFileSync(full, "utf8")
      .replace(/<!-- HEADER:START[\s\S]*?<!-- HEADER:END -->/, h)
      .replace(/<!-- FOOTER:START[\s\S]*?<!-- FOOTER:END -->/, footer);
    fs.writeFileSync(full, html);
    n++;
  }
})(root);
console.log(`Layout actualizado en ${n} páginas.`);
