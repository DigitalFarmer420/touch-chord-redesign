// Packaging-only: copy the static site into www/ for Capacitor.
// Does not modify source files. Does not set a live server URL.
// Copies index.html, css/, js/, and images/ only (no tests, tools, or node_modules).
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const www = path.join(root, "www");
const include = ["index.html", "css", "js", "images"];

function relPosix(p) {
  return p.split(path.sep).join("/");
}

function copyEntry(rel) {
  const src = path.resolve(root, rel);
  const dest = path.resolve(www, rel);
  if (src !== root && !src.startsWith(root + path.sep)) throw new Error("source escaped root: " + rel);
  if (!dest.startsWith(www + path.sep) && dest !== path.join(www, "index.html")) {
    throw new Error("dest escaped www: " + rel);
  }
  const st = fs.lstatSync(src);
  if (st.isSymbolicLink()) throw new Error("refusing symlink: " + rel);
  if (st.isFile()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return 1;
  }
  if (!st.isDirectory()) throw new Error("refusing special file: " + rel);
  let n = 0;
  for (const name of fs.readdirSync(src)) n += copyEntry(path.join(rel, name));
  return n;
}

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
let files = 0;
for (const rel of include) files += copyEntry(rel);

const config = JSON.parse(fs.readFileSync(path.join(root, "capacitor.config.json"), "utf8"));
if (config.server && Object.prototype.hasOwnProperty.call(config.server, "url")) {
  throw new Error("capacitor.config.json must not set server.url");
}
if (config.appId !== "com.digitalfarmer.touchchord.rd17test") {
  throw new Error("unexpected appId");
}

const missing = [];
function localTarget(url) {
  if (!url || url.startsWith("data:") || url.startsWith("#") || url.startsWith("mailto:") || /^[a-z]+:/i.test(url)) return null;
  const clean = url.split("#")[0].split("?")[0];
  if (!clean || clean.startsWith("/")) return clean;
  return clean;
}
function note(from, url) {
  const target = localTarget(url);
  if (target == null) return;
  const abs = path.resolve(www, target);
  if (!abs.startsWith(www + path.sep) && abs !== path.join(www, "index.html")) {
    missing.push(from + " -> " + url + " (escapes www)");
    return;
  }
  if (!fs.existsSync(abs)) missing.push(from + " -> " + url);
}

const html = fs.readFileSync(path.join(www, "index.html"), "utf8");
for (const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) note("index.html", m[1]);
for (const css of fs.readdirSync(path.join(www, "css"))) {
  const text = fs.readFileSync(path.join(www, "css", css), "utf8");
  for (const m of text.matchAll(/url\(([^)]+)\)/g)) {
    const raw = m[1].trim().replace(/^['"]|['"]$/g, "");
    note("css/" + css, raw);
  }
}
function walkJs(dir) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.lstatSync(abs);
    if (st.isSymbolicLink()) throw new Error("symlink in www: " + abs);
    if (st.isDirectory()) walkJs(abs);
    else if (name.endsWith(".js")) {
      const text = fs.readFileSync(abs, "utf8");
      const rel = relPosix(path.relative(www, abs));
      for (const m of text.matchAll(/from\s*"(\.[^"]+)"/g)) {
        const spec = m[1].split("?")[0];
        const resolved = path.resolve(path.dirname(abs), spec);
        if (!resolved.startsWith(www + path.sep) || !fs.existsSync(resolved)) missing.push(rel + " -> " + m[1]);
      }
    }
  }
}
walkJs(path.join(www, "js"));

if (missing.length) {
  console.error("missing local assets:\n" + missing.join("\n"));
  process.exit(1);
}
console.log("staged " + files + " files into www/ (local asset refs ok, no server.url)");
