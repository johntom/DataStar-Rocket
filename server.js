import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { datastarPlugin } from "@johntom/datastar-fastify";

const app = Fastify({ logger: true });
await app.register(datastarPlugin);
await app.register(fastifyStatic, {
  root: resolve("static"),
  prefix: "/static/",
});

// Datastar Pro v1.0.1 migration:
// The two demo pages are now self-contained standalone HTML files that load
// the Rocket components as ES modules from /static/components/*.js (no more
// readFileSync + ${template} splicing of <template data-rocket:> fragments).
// They are read once at startup and served verbatim — no interpolation.
const tomSelectPage = readFileSync(resolve("tom-select-rocket.html"), "utf8");
const tabulatorPage = readFileSync(resolve("tabulator-rocket.html"), "utf8");

// ─── Sample data — kept server-side only for the remote-search endpoint ──
// (FRUITS / EMPLOYEES moved into the standalone demo pages as literal JSON.)
const USERS = [
  { value: "u1", text: "Alice Johnson" },
  { value: "u2", text: "Bob Smith" },
  { value: "u3", text: "Charlie Brown" },
  { value: "u4", text: "Diana Prince" },
  { value: "u5", text: "Eve Torres" },
  { value: "u6", text: "Frank Castle" },
  { value: "u7", text: "Grace Hopper" },
  { value: "u8", text: "Hank Pym" },
];

// ─── Remote Search Endpoint ─────────────────────────────────────
app.get("/api/search/users", async (request, reply) => {
  const q = (request.query.q || "").toLowerCase();
  return USERS.filter((u) => u.text.toLowerCase().includes(q));
});

// ─── Index ──────────────────────────────────────────────────────
app.get("/", async (request, reply) => {
  reply.type("text/html");
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Datastar Rocket Components — Pro v1.0.1</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 640px;
      margin: 3rem auto; padding: 0 1rem; color: #1a1a2e; background: #f8f9fa; }
    h1 { margin-bottom: .25rem; }
    .subtitle { color: #666; margin-bottom: 2rem; }
    a.tile { display: block; background: #fff; border: 1px solid #e0e0e0;
      border-radius: 8px; padding: 1.25rem 1.5rem; margin-bottom: 1rem;
      text-decoration: none; color: #1a1a2e; }
    a.tile:hover { border-color: #4472c4; }
    a.tile h2 { margin: 0 0 .25rem; font-size: 1.05rem; color: #4472c4; }
    a.tile p { margin: 0; color: #555; font-size: .9rem; }
  </style>
</head>
<body>
  <h1>Datastar Rocket Components</h1>
  <p class="subtitle">Pro v1.0.1 JS-API components — standalone demos</p>
  <a class="tile" href="/tom-select">
    <h2>Tom Select →</h2>
    <p>Single / multi select, remote search, creatable tags with backend sync.</p>
  </a>
  <a class="tile" href="/tabulator">
    <h2>Tabulator →</h2>
    <p>Sortable grid, header filters, row click, checkbox select, dynamic data swap.</p>
  </a>
</body>
</html>`;
});

// ─── Standalone demo pages (served verbatim) ────────────────────
app.get("/tom-select", async (request, reply) => {
  reply.type("text/html");
  return tomSelectPage;
});

app.get("/tabulator", async (request, reply) => {
  reply.type("text/html");
  return tabulatorPage;
});

// ─── Tag Save Endpoint (SSE) ───────────────────────────────────
app.post("/api/save-tags", async (request, reply) => {
  const signals = JSON.parse(request.headers["datastar-signals"] || "{}");
  reply.datastar((sse) => {
    const tagList = (signals.tags || "").split(",").filter(Boolean);
    sse.patchElements(
      /* html */ `
      <div id="tag-result" class="output" style="border-left: 3px solid #22c55e;">
        ✅ Saved ${tagList.length} tag(s): <strong>${tagList.join(", ")}</strong>
      </div>
    `,
      { selector: "#tag-result", mode: "outer" },
    );
  });
});

// ─── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Rocket demos running at http://localhost:${PORT}`);
});
