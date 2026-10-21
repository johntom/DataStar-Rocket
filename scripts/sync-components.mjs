#!/usr/bin/env node
// sync-components.mjs — copy the canonical Rocket component(s) from
// static/components/ (THIS repo = the source of truth) to every app that
// carries a copy, keeping each target's own `import { rocket } from '…'` line
// and its line endings. Nothing else may differ between copies.
//
//   node scripts/sync-components.mjs --check            report drift, write nothing (default)
//   node scripts/sync-components.mjs --write            write every target that differs
//   node scripts/sync-components.mjs --write echarts-rocket.js tom-select-rocket.js
//   node scripts/sync-components.mjs --check --all      all three components
//
// Default component: tabulator-rocket.js. Targets are listed below — add a
// line when a new app gets a copy. A target whose file is missing is reported
// and skipped (never created: the app must first load a bundle and decide its
// import path). Run from any cwd. Exit code 1 when --check finds drift.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = resolve(HERE, "..", "static", "components");

// Every copy on this machine (2026-10-13). `note` is for the report only.
const TARGETS = [
  { dir: "C:/Code/datastar/datastar-fastify-sdk/components", note: "SDK repo (github johntom/datastar-fastify-sdk)" },
  { dir: "C:/Code/brm/brm_FlowDS/src/public/js/components", note: "brm_FlowDS — where most features originate" },
  { dir: "C:/Code/brm/brm_websiteDS/src/public/js/components", note: "brm_websiteDS (mirrors FlowDS' stack)" },
  { dir: "C:/Code/gallery/galleryHelen/src/public/js/components", note: "gallery" },
  { dir: "C:/Code/gallery/galleryJohn/src/public/js/components", note: "gallery" },
  { dir: "C:/Code/gallery/galleryKen/src/public/js/components", note: "gallery" },
  { dir: "C:/Code/gallery/galleryNina/src/public/js/components", note: "gallery" },
  { dir: "C:/Code/gallery/galleryVector/src/public/js/components", note: "gallery" },
  { dir: "C:/Code/parktower/parktowerDS/src/public/js/components", note: "parktowerDS (uses pt:<name> formatter tokens)" },
  { dir: "C:/Code/gail_parenteau/src/public/js/components", note: "gail_parenteau" },
];
const ALL_COMPONENTS = ["tabulator-rocket.js", "tom-select-rocket.js", "echarts-rocket.js"];

const args = process.argv.slice(2);
const write = args.includes("--write");
const all = args.includes("--all");
const named = args.filter((a) => !a.startsWith("--"));
const components = all ? ALL_COMPONENTS : named.length ? named : ["tabulator-rocket.js"];

const IMPORT_RE = /^import \{ rocket \} from '[^']+'\r?\n/m;

function splitImport(text) {
  const m = text.match(IMPORT_RE);
  if (!m) return null;
  return { line: m[0].replace(/\r?\n$/, ""), before: text.slice(0, m.index), after: text.slice(m.index + m[0].length) };
}
const lf = (t) => t.replace(/\r\n/g, "\n");

let drift = 0, written = 0, missing = 0, same = 0;
for (const comp of components) {
  const srcPath = join(SOURCE_DIR, comp);
  if (!existsSync(srcPath)) { console.error(`SOURCE MISSING ${srcPath}`); process.exitCode = 1; continue; }
  const src = lf(readFileSync(srcPath, "utf8"));
  const s = splitImport(src);
  if (!s) { console.error(`${comp}: canonical has no import { rocket } line`); process.exitCode = 1; continue; }
  console.log(`\n=== ${comp}  (canonical ${src.split("\n").length - 1} lines, import ${s.line.replace(/^import \{ rocket \} from /, "")})`);

  for (const t of TARGETS) {
    const path = join(t.dir, comp);
    if (!existsSync(path)) { missing++; console.log(`  missing   ${path}`); continue; }
    const raw = readFileSync(path, "utf8");
    const crlf = raw.includes("\r\n");
    const cur = lf(raw);
    const c = splitImport(cur);
    const importLine = c ? c.line : s.line; // a target without an import keeps the canonical's
    // what the target SHOULD contain: canonical body with the target's import line
    let want = s.before + importLine + "\n" + s.after;
    if (crlf) want = want.replace(/\n/g, "\r\n");
    if (raw === want) { same++; console.log(`  same      ${path}`); continue; }
    const curBody = c ? c.before + c.after : cur;
    const wantBody = s.before + s.after;
    const a = curBody.split("\n"), b = wantBody.split("\n");
    const delta = `${b.length - a.length >= 0 ? "+" : ""}${b.length - a.length} lines`;
    if (write) {
      writeFileSync(path, want, "utf8");
      written++;
      console.log(`  WRITTEN   ${path}  (${delta}, import kept: ${importLine.replace(/^import \{ rocket \} from /, "")}${crlf ? ", CRLF" : ""})`);
    } else {
      drift++;
      console.log(`  DIFFERS   ${path}  (${delta}${c ? "" : ", no import line in target"}${crlf ? ", CRLF" : ""})`);
    }
  }
}
console.log(`\n${write ? `written ${written}` : `differs ${drift}`}, same ${same}, missing ${missing}${write ? "" : "  — run with --write to copy"}`);
if (!write && drift) process.exitCode = 1;
