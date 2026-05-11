// import Fastify from "fastify";
// import { Datastar } from "datastar-fastify";
// const app = Fastify({ logger: true });
// await app.register(Datastar);

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
// import { Datastar } from "datastar-fastify";
// import { Datastar } from "@johntom/datastar-fastify";
//import { Datastar } from "@johntom/datastar-fastify-sdk";
// in json    "@johntom/datastar-fastify": "github:johntom/datastar-fastify-sdk",
import { datastarPlugin } from "@johntom/datastar-fastify";

const app = Fastify({ logger: true });
await app.register(datastarPlugin);
await app.register(fastifyStatic, {
  root: resolve("static"),
  prefix: "/static/",
});

const tomSelectTemplate = readFileSync(resolve("tom-select-rocket.html"), "utf8");
const tabulatorTemplate = readFileSync(resolve("tabulator-rocket.html"), "utf8");

// ─── Sample Data ────────────────────────────────────────────────
const FRUITS = [
  { value: "apple", text: "Apple", origin: "Central Asia", season: "Fall" },
  {
    value: "banana",
    text: "Banana",
    origin: "Southeast Asia",
    season: "Year-round",
  },
  { value: "cherry", text: "Cherry", origin: "Europe", season: "Summer" },
  {
    value: "dragonfruit",
    text: "Dragon Fruit",
    origin: "Central America",
    season: "Summer",
  },
  {
    value: "elderberry",
    text: "Elderberry",
    origin: "Europe",
    season: "Late Summer",
  },
  { value: "fig", text: "Fig", origin: "Mediterranean", season: "Late Summer" },
  { value: "grape", text: "Grape", origin: "Near East", season: "Fall" },
  {
    value: "honeydew",
    text: "Honeydew",
    origin: "West Africa",
    season: "Summer",
  },
  { value: "kiwi", text: "Kiwi", origin: "China", season: "Winter" },
  { value: "lemon", text: "Lemon", origin: "South Asia", season: "Year-round" },
  { value: "mango", text: "Mango", origin: "South Asia", season: "Summer" },
  { value: "nectarine", text: "Nectarine", origin: "China", season: "Summer" },
  {
    value: "orange",
    text: "Orange",
    origin: "Southeast Asia",
    season: "Winter",
  },
  {
    value: "papaya",
    text: "Papaya",
    origin: "Central America",
    season: "Year-round",
  },
  { value: "quince", text: "Quince", origin: "Caucasus", season: "Fall" },
];

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

const EMPLOYEES = [
  {
    id: 1,
    name: "Alice Johnson",
    department: "Engineering",
    salary: 95000,
    startDate: "2020-03-15",
    active: true,
  },
  {
    id: 2,
    name: "Bob Smith",
    department: "Marketing",
    salary: 72000,
    startDate: "2019-07-22",
    active: true,
  },
  {
    id: 3,
    name: "Charlie Brown",
    department: "Engineering",
    salary: 105000,
    startDate: "2018-01-10",
    active: true,
  },
  {
    id: 4,
    name: "Diana Prince",
    department: "HR",
    salary: 68000,
    startDate: "2021-11-01",
    active: false,
  },
  {
    id: 5,
    name: "Eve Torres",
    department: "Engineering",
    salary: 112000,
    startDate: "2017-06-30",
    active: true,
  },
  {
    id: 6,
    name: "Frank Castle",
    department: "Sales",
    salary: 78000,
    startDate: "2022-02-14",
    active: true,
  },
  {
    id: 7,
    name: "Grace Hopper",
    department: "Engineering",
    salary: 125000,
    startDate: "2016-09-05",
    active: true,
  },
  {
    id: 8,
    name: "Hank Pym",
    department: "R&D",
    salary: 98000,
    startDate: "2020-08-20",
    active: false,
  },
  {
    id: 9,
    name: "Ivy Chen",
    department: "Marketing",
    salary: 65000,
    startDate: "2023-01-09",
    active: true,
  },
  {
    id: 10,
    name: "Jack Ryan",
    department: "Sales",
    salary: 82000,
    startDate: "2019-04-18",
    active: true,
  },
];

// ─── Remote Search Endpoint ─────────────────────────────────────
app.get("/api/search/users", async (request, reply) => {
  const q = (request.query.q || "").toLowerCase();
  const results = USERS.filter((u) => u.text.toLowerCase().includes(q));
  return results;
});

// ─── Main Page ──────────────────────────────────────────────────
app.get("/", async (request, reply) => {
  reply.type("text/html");
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Datastar Rocket Components — Tom Select + Tabulator</title>

  <!-- Tom Select CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.4.1/dist/css/tom-select.css" />

  <!-- Tabulator CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tabulator-tables@6.3.0/dist/css/tabulator_modern.min.css" />

  <!-- Datastar Pro + Rocket -->
  <script type="module" src="/static/datastar-pro.js"><\/script>
  <script type="module" src="/static/datastar-inspector.js"><\/script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 720px;
      margin: 2rem auto;
      padding: 0 1rem;
      color: #1a1a2e;
      background: #f8f9fa;
    }
    h1 { margin-bottom: 0.25rem; }
    .subtitle { color: #666; margin-bottom: 2rem; }
    .card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card h2 { margin-top: 0; font-size: 1.1rem; }
    .card p { color: #555; font-size: 0.9rem; }
    .output {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #f0f4f8;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85rem;
    }
    rocket-tom-select {
      display: block;
      margin: 1rem 0;
    }
    rocket-tabulator {
      display: block;
      margin: 1rem 0;
    }
    .ts-wrapper .ts-control,
    .ts-wrapper .ts-control input,
    .ts-wrapper .ts-dropdown .option {
      color: #1a1a2e;
    }
  </style>
</head>
<body>
  <h1>Rocket + Tom Select</h1>
  <p class="subtitle">Datastar Rocket web component wrapping Tom Select</p>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- Rocket component definition (loaded from tom-select-rocket.html) -->
  <!-- ═══════════════════════════════════════════════════════ -->
  ${tomSelectTemplate}

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- Example 1: Single Select with Static Options          -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <div class="card" data-signals:selectedFruit="''">
    <h2>Single Select — Three-Column Dropdown</h2>
    <p>Pick one fruit. Dropdown shows origin and season. Selected pill shows all three.</p>

    <rocket-tom-select
      placeholder="Pick a fruit..."
      options='${JSON.stringify(FRUITS)}'
      detail-field="origin,season"
      data-on:ts-change="$selectedFruit = evt.detail.value"
    ></rocket-tom-select>

    <div class="output">
      Selected: <span data-text="$selectedFruit || '(none)'"></span>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- Example 2: Multi-Select with Tags                     -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <div class="card" data-signals:selectedFruits="''">
    <h2>Multi-Select — Tagging</h2>
    <p>Pick up to 5 fruits. Includes remove buttons on tags. Hold shift to select mulitples from list</p>

    <rocket-tom-select
      placeholder="Choose fruits..."
      max-items="5"
      options='${JSON.stringify(FRUITS)}'
      data-on:ts-change="$selectedFruits = evt.detail.value"
    ></rocket-tom-select>

    <div class="output">
      Selected: <span data-text="$selectedFruits || '(none)'"></span>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- Example 3: Remote Search                              -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <div class="card" data-signals:selectedUser="''">
    <h2>Remote Search — Users</h2>
    <p>Type to search users from the backend. Try "alice" or "grace".</p>

    <rocket-tom-select
      placeholder="Search users..."
      search-url="/api/search/users"
      data-on:ts-change="$selectedUser = evt.detail.value"
    ></rocket-tom-select>

    <div class="output">
      Selected: <span data-text="$selectedUser || '(none)'"></span>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- Example 4: Create + Multi with Backend POST           -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <div class="card" data-signals:tags="''">
    <h2>Creatable Tags — with Backend Sync</h2>
    <p>Type to create new tags. Selection is sent to the backend via SSE.</p>

    <rocket-tom-select
      placeholder="Add tags..."
      max-items="10"
      allow-create="true"
      options='${JSON.stringify([
        { value: "javascript", text: "JavaScript" },
        { value: "typescript", text: "TypeScript" },
        { value: "node", text: "Node.js" },
        { value: "datastar", text: "Datastar" },
        { value: "fastify", text: "Fastify" },
      ])}'
      data-on:ts-change="$tags = evt.detail.value; @post('/api/save-tags')"
    ></rocket-tom-select>

    <div id="tag-result" class="output">
      Tags: <span data-text="$tags || '(none)'"></span>
    </div>
  </div>

  <hr style="margin: 2rem 0; border: none; border-top: 2px solid #e0e0e0;" />
  <h1>Rocket + Tabulator</h1>
  <p class="subtitle">Datastar Rocket web component wrapping Tabulator 6.3</p>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- Rocket Tabulator component definition (loaded from tabulator-rocket.html) -->
  <!-- ═══════════════════════════════════════════════════════ -->
  ${tabulatorTemplate}

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- Example 5: Basic Tabulator Grid                        -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <div class="card">
    <h2>Basic Grid — Employees</h2>
    <p>Sortable columns, header filters, money formatter. Drag columns to reorder.</p>

    <rocket-tabulator
      columns='${JSON.stringify([
        { title: "ID", field: "id", width: 60, headerFilter: true },
        { title: "Name", field: "name", headerFilter: true },
        {
          title: "Department",
          field: "department",
          headerFilter: "list",
          headerFilterParams: {
            valuesLookup: true,
            clearable: true,
            sort: "asc",
            placeholderEmpty: "All",
            placeholderLoaded: "All",
          },
        },
        {
          title: "Salary",
          field: "salary",
          hozAlign: "right",
          formatter: "money",
          formatterParams: { thousand: ",", symbol: "$" },
        },
        { title: "Start Date", field: "startDate", width: 110 },
        { title: "Active", field: "active", formatter: "tickCross", width: 80 },
      ])}'
      data='${JSON.stringify(EMPLOYEES)}'
      height="320px"
      layout="fitColumns"
      movable-columns="true"
      initial-sort='${JSON.stringify([{ column: "name", dir: "asc" }])}'
    ></rocket-tabulator>
  </div>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- Example 6: Row Click                                   -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <div class="card" data-signals:clickedEmployee="''">
    <h2>Row Click — Employee Detail</h2>
    <p>Click any row to see its data below.</p>

    <rocket-tabulator
      columns='${JSON.stringify([
        { title: "ID", field: "id", width: 60 },
        { title: "Name", field: "name" },
        { title: "Department", field: "department" },
        {
          title: "Salary",
          field: "salary",
          hozAlign: "right",
          formatter: "money",
          formatterParams: { thousand: ",", symbol: "$" },
        },
      ])}'
      data='${JSON.stringify(EMPLOYEES)}'
      height="280px"
      enable-row-click="true"
      data-on:tab-row-click="$clickedEmployee = JSON.stringify(evt.detail.row)"
    ></rocket-tabulator>

    <div class="output">
      Clicked: <span data-text="$clickedEmployee || '(click a row)'"></span>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- Example 7: Selectable Rows + Row Click Dialog          -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <div class="card" style="position:relative" data-signals:selectedCount="0" data-signals:selectedIds="''" data-signals:dlgName="''" data-signals:dlgDept="''" data-signals:dlgSalary="''" data-signals:dlgOpen="false">
    <h2>Checkbox Select + Row Click Dialog</h2>
    <p>Use checkboxes to select rows. Click a row to open a detail dialog.</p>

    <rocket-tabulator
      columns='${JSON.stringify([
        { title: "ID", field: "id", width: 60 },
        { title: "Name", field: "name" },
        { title: "Department", field: "department" },
        {
          title: "Salary",
          field: "salary",
          hozAlign: "right",
          formatter: "money",
          formatterParams: { thousand: ",", symbol: "$" },
        },
        { title: "Start Date", field: "startDate", width: 110 },
      ])}'
      data='${JSON.stringify(EMPLOYEES)}'
      height="320px"
      selectable-rows="true"
      enable-row-click="true"
      data-on:tab-rows-selected="$selectedCount = evt.detail.rows.length; $selectedIds = evt.detail.rows.map(function(r){return r.id}).join(', ')"
      data-on:tab-row-click="$dlgName = evt.detail.row.name; $dlgDept = evt.detail.row.department; $dlgSalary = '$' + Number(evt.detail.row.salary).toLocaleString(); $dlgOpen = true"
    ></rocket-tabulator>

    <div class="output">
      Selected rows: <strong data-text="$selectedCount"></strong>
      &nbsp;— IDs: <span data-text="$selectedIds || '(none)'"></span>
    </div>

    <!-- Dialog — centered over the grid via position:relative on .card -->
    <div data-show="$dlgOpen" style="position:absolute;inset:0;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:10;border-radius:8px">
      <div style="background:#fff;border-radius:6px;padding:.75rem 1rem;width:220px;box-shadow:0 4px 16px rgba(0,0,0,.18);font-size:.82rem">
        <h3 style="margin:0 0 .5rem;font-size:.9rem">Employee Detail</h3>
        <p style="margin:.2rem 0"><strong>Name:</strong> <span data-text="$dlgName"></span></p>
        <p style="margin:.2rem 0"><strong>Dept:</strong> <span data-text="$dlgDept"></span></p>
        <p style="margin:.2rem 0"><strong>Salary:</strong> <span data-text="$dlgSalary"></span></p>
        <button style="margin-top:.5rem;padding:.25rem .8rem;border:1px solid #ccc;border-radius:3px;cursor:pointer;background:#f0f0f0;font-size:.78rem"
                data-on:click="$dlgOpen = false">Close</button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- Example 8: Dynamic Data Swap                           -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <div class="card">
    <script type="application/json" data-signals>
      ${JSON.stringify({ filterMode: "all", empData: JSON.stringify(EMPLOYEES) })}
    </script>
    <script>
      var _empAll = ${JSON.stringify(JSON.stringify(EMPLOYEES))};
      var _empActive = ${JSON.stringify(JSON.stringify(EMPLOYEES.filter((e) => e.active)))};
      var _empInactive = ${JSON.stringify(JSON.stringify(EMPLOYEES.filter((e) => !e.active)))};
    </script>
    <h2>Dynamic Data — Filter Active/Inactive</h2>
    <p>Buttons swap data via the <code>data</code> prop (calls setData internally).</p>

    <div style="margin-bottom:0.75rem">
      <button data-on:click="$filterMode = 'all'; $empData = _empAll">All</button>
      <button data-on:click="$filterMode = 'active'; $empData = _empActive">Active Only</button>
      <button data-on:click="$filterMode = 'inactive'; $empData = _empInactive">Inactive Only</button>
    </div>

    <rocket-tabulator
      columns='${JSON.stringify([
        { title: "Name", field: "name", headerFilter: true },
        { title: "Department", field: "department", headerFilter: true },
        { title: "Active", field: "active", formatter: "tickCross", width: 80 },
      ])}'
      data='${JSON.stringify(EMPLOYEES)}'
      data-attr:data="$empData"
      height="280px"
    ></rocket-tabulator>

    <div class="output">
      Filter: <span data-text="$filterMode"></span> —
      Rows: <span data-text="$empData ? JSON.parse($empData).length : 0"></span>
    </div>
  </div>

  <datastar-inspector></datastar-inspector>
</body>
</html>`;
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
  console.log(`🚀 Rocket + Tom Select running at http://localhost:${PORT}`);
});
