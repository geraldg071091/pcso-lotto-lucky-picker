// PCSO Lotto Generator: zero-dependency server (Node 18+). Run: node server.js
const http = require("http"), fs = require("fs"), path = require("path");
const PCSO = "https://www.pcso.gov.ph/SearchLottoResult.aspx";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CACHE = path.join(__dirname, "cache"); fs.mkdirSync(CACHE, { recursive: true });
const decode = s => s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");

// Read every form control from the page so no field name is hardcoded
function parseForm(html) {
  const fields = {}, selects = {};
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const t = m[0], name = (t.match(/name="([^"]*)"/i) || [])[1];
    if (!name) continue;
    const type = ((t.match(/type="([^"]*)"/i) || [])[1] || "text").toLowerCase();
    const value = decode((t.match(/value="([^"]*)"/i) || [])[1] || "");
    if (type === "submit") fields[name] = { submit: true, value }; else if (type !== "checkbox") fields[name] = { value };
  }
  for (const m of html.matchAll(/<select\b[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/select>/gi)) {
    const opts = [...m[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(o => ({
      value: decode((o[1].match(/value="([^"]*)"/i) || [])[1] ?? o[2].trim()), text: decode(o[2].replace(/<[^>]+>/g,"").trim()),
      selected: /selected/i.test(o[1]) }));
    selects[m[1]] = opts;
  }
  return { fields, selects };
}
const findName = (form, suffixes) => {
  const names = Object.keys(form.selects);
  for (const sfx of [].concat(suffixes)) { const n = names.find(n => n.toLowerCase().endsWith(sfx.toLowerCase())); if (n) return n; }
  return null;
};

/* An option matches if its value equals what we need, or its label does.
   Value first: PCSO labels drift ("Megalotto" vs "Mega Lotto"), values do not. */
function pickOpt(opts, wanted) {
  const w = [].concat(wanted).map(x => String(x).toLowerCase().replace(/\s/g, ""));
  return opts.find(o => w.includes(o.value.toLowerCase().replace(/\s/g, "")))
      ?? opts.find(o => w.includes(o.text.toLowerCase().replace(/\s/g, "")));
}

/* Game labels on the page are inconsistent: "Ultra Lotto 6/58", "Megalotto 6/45",
   "Superlotto 6/49". Match on the numeric suffix, which is always present. */
const GAME_LABEL_ALIASES = {
  "6/58": ["ultralotto658", "ultra658", "658"],
  "6/55": ["grandlotto655", "grand655", "655"],
  "6/49": ["superlotto649", "superlotto", "649"],
  "6/45": ["megalotto645", "megalotto", "645"],
  "6/42": ["lotto642", "642"],
  "6D":   ["6dlotto", "6d"],
};
function gameOpt(opts, label) {
  const keys = GAME_LABEL_ALIASES[label] ?? [label.replace(/[^\w]/g, "")];
  const norm = t => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  // never accept the placeholder row
  const real = opts.filter(o => o.value !== "0" && !/^--/.test(o.text.trim()));
  return real.find(o => keys.includes(norm(o.text)))
      ?? real.find(o => keys.some(k => norm(o.text).includes(k)));
}

async function search(label, from, to) {
  const g = await fetch(PCSO, { headers: { "User-Agent": UA } });
  if (!g.ok) throw new Error("PCSO GET " + g.status);
  const html = await g.text();
  const cookie = (g.headers.getSetCookie ? g.headers.getSetCookie() : []).map(c => c.split(";")[0]).join("; ");
  const form = parseForm(html), body = new URLSearchParams();
  for (const [n, f] of Object.entries(form.fields)) if (!f.submit) body.set(n, f.value);
  for (const [n, opts] of Object.entries(form.selects)) { const s = opts.find(o => o.selected) || opts[0]; if (s) body.set(n, s.value); }

  /* Every field must resolve. A silent miss posts a stale default, which is how
     this fetch spent several rounds asking PCSO for "day 1 to day 5". */
  const setValue = (name, value) => body.set(name, String(value));

  const setSelect = (suffix, wanted, custom) => {
    const n = findName(form, suffix);
    if (!n) throw new Error("field not found: " + suffix + " | selects: " + Object.keys(form.selects).join(", "));
    const o = custom ? custom(form.selects[n]) : pickOpt(form.selects[n], wanted);
    if (!o) {
      const seen = form.selects[n].map(x => x.value + "=" + x.text).join(" | ");
      throw new Error("no option for " + suffix + " wanted " + JSON.stringify(wanted) + " | options: " + seen);
    }
    setValue(n, o.value);
    return n;
  };

  /* Years are often absent from the dropdown. If the year we need is not offered,
     add the field ourselves rather than posting a wrong year. */
  const setYear = (suffix, year) => {
    const n = findName(form, suffix);
    if (!n) throw new Error("field not found: " + suffix);
    const o = pickOpt(form.selects[n], [year]);
    setValue(n, o ? o.value : year);
    if (!o) console.warn("year " + year + " not in " + suffix + " options; posting it directly");
  };

  setSelect("ddlStartMonth", [MONTHS[from.getMonth()], from.getMonth() + 1]);
  setSelect(["ddlStartDate", "ddlStartDay"], [from.getDate(), String(from.getDate()).padStart(2, "0")]);
  setYear("ddlStartYear", from.getFullYear());
  setSelect("ddlEndMonth", [MONTHS[to.getMonth()], to.getMonth() + 1]);
  setSelect(["ddlEndDay", "ddlEndDate"], [to.getDate(), String(to.getDate()).padStart(2, "0")]);
  setYear("ddlEndYear", to.getFullYear());
  setSelect("ddlSelectGame", [], o => gameOpt(o, label));

  const btn = Object.entries(form.fields).find(([n, f]) => f.submit && /search/i.test(n + f.value));
  if (btn) body.set(btn[0], btn[1].value);

  const r = await fetch(PCSO, { method: "POST", redirect: "follow",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, Referer: PCSO, cookie }, body });
  if (!r.ok) throw new Error("PCSO POST " + r.status);
  const sent = body.get(findName(form, "ddlStartYear")) + "-" + body.get(findName(form, "ddlStartMonth"))
             + "-" + body.get(findName(form, ["ddlStartDate", "ddlStartDay"])) + " to "
             + body.get(findName(form, "ddlEndYear")) + "-" + body.get(findName(form, "ddlEndMonth"))
             + "-" + body.get(findName(form, ["ddlEndDay", "ddlEndDate"]))
             + " | game=" + body.get(findName(form, "ddlSelectGame"));
  const rows = parseRows(await r.text());
  console.log("PCSO " + label + " asked " + sent + " -> " + rows.length + " rows");
  return rows;
}

function parseRows(html) {
  const draws = [];
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const td = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(c => decode(c[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim());
    if (td.length < 3) continue;

    // the draw date drives row identity, so find it wherever it sits
    const dateCell = td.find(c => /\d{1,2}\/\d{1,2}\/\d{4}/.test(c));
    if (!dateCell) continue;
    const [mm, dd, yy] = dateCell.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/).slice(1).map(Number);
    const date = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

    // numbers: the cell holding a dash- or space-separated group of 2-digit values
    const numCell = td.find(c => {
      const g = c.match(/\d+/g) || [];
      return g.length >= 6 && /[-\s,]/.test(c) && !/\d{1,2}\/\d{1,2}\/\d{4}/.test(c);
    });
    if (!numCell) continue;
    const nums = (numCell.match(/\d+/g) || []).map(Number);

    // A published prize always carries grouped thousands or decimals
    // ("478,298,684.14", "73,946.00", "4,500.00"). A bare integer never does,
    // and that is what separates the jackpot cell from the winner count.
    const isMoney = (c) =>
      /\u20b1|PHP/i.test(c) || /\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?/.test(c);
    const isCount = (c) => /^\d{1,7}$/.test(c) && !isMoney(c);

    // prize first, so a bare "12" in a lower-table row cannot claim it
    const moneyCell = td.find(c => c !== dateCell && c !== numCell && isMoney(c));
    // winners: a bare integer that is not the prize and not the number set
    const winnerCell = td.find(c =>
      c !== dateCell && c !== numCell && c !== moneyCell && isCount(c));

    if (nums.length) {
      draws.push({
        date,
        nums,
        jackpot: moneyCell ? moneyCell.replace(/^\s*|-\s*$/g, "") : "",
        winners: winnerCell || "",
      });
    }
  }
  return draws;
}

async function eightYears(label) {
  const file = path.join(CACHE, "v5-" + label.replace("/", "-") + ".json");
  try { const c = JSON.parse(fs.readFileSync(file)); if (Date.now() - c.at < 6 * 3600e3) return c.draws; } catch {}
  const end = new Date(), all = new Map();
  for (let y = 8; y >= 0; y--) { // one-year slices keep each PCSO response small
    const to = y === 0 ? end : new Date(end.getFullYear() - y, 11, 31);
    const from = y === 8 ? new Date(end.getFullYear() - 8, end.getMonth(), end.getDate()) : new Date(end.getFullYear() - y, 0, 1);
    for (const d of await search(label, from, to)) all.set(d.date + d.nums.join(), d);
  }
  // Newest first. A Map keeps insertion order and PCSO answers oldest-slice
  // first, so without this the list starts in 2019.
  const draws = [...all.values()].sort((a, b) => b.date.localeCompare(a.date));
  if (!draws.length) throw new Error("PCSO returned no rows");
  console.log("PCSO " + label + " merged " + draws.length + " draws, newest " + draws[0].date + ", oldest " + draws[draws.length - 1].date);
  fs.writeFileSync(file, JSON.stringify({ at: Date.now(), draws }));
  return draws;
}

const STATIC = { "/manifest.json": ["application/manifest+json", "manifest.json"], "/sw.js": ["text/javascript", "sw.js"],
  "/icon-192.png": ["image/png", "icon-192.png"], "/icon-512.png": ["image/png", "icon-512.png"] };
const PORT = process.env.PORT || 3000;
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/api/pcso") {
    try { const draws = await eightYears(u.searchParams.get("label")); res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ draws })); }
    catch (e) { console.error("PCSO failed:", e.message); res.writeHead(502, {"Content-Type":"application/json"}); res.end(JSON.stringify({ error: e.message })); }
  } else if (STATIC[u.pathname]) {
    res.writeHead(200, {"Content-Type": STATIC[u.pathname][0]}); res.end(fs.readFileSync(path.join(__dirname, STATIC[u.pathname][1])));
  } else { res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"}); res.end(fs.readFileSync(path.join(__dirname, "index.html"))); }
}).listen(PORT, "0.0.0.0", () => {
  console.log("On this computer: http://localhost:" + PORT);
  for (const list of Object.values(require("os").networkInterfaces()))
    for (const i of list) if (i.family === "IPv4" && !i.internal) console.log("On your phone (same Wi-Fi): http://" + i.address + ":" + PORT);
});
