// Revisa que todos los enlaces internos apunten a una página existente.
// Uso: npm run check
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const exists = (href) => {
  const p = href.split(/[?#]/)[0];
  if (!p || p === "/") return fs.existsSync(path.join(root, "index.html"));
  const f = path.join(root, p);
  return fs.existsSync(f) && fs.statSync(f).isFile() || fs.existsSync(path.join(f, "index.html")) || fs.existsSync(f + ".html");
};
let broken = 0, total = 0;
// Revisa las páginas y también el header/footer compartidos (partials/)
const dirs = [root, path.resolve(root, "../partials")];
for (const d of dirs) (function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) { walk(full); continue; }
    if (!f.endsWith(".html")) continue;
    const html = fs.readFileSync(full, "utf8").replace(/<!--[\s\S]*?-->/g, "");
    for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      if (m[1].startsWith("/api/")) continue;
      total++;
      if (!exists(m[1])) { broken++; console.log(`✗ ${path.relative(root, full)} → ${m[1]}`); }
    }
  }
})(d);
console.log(`${total} enlaces internos revisados, ${broken} rotos.`);
process.exit(broken ? 1 : 0);
