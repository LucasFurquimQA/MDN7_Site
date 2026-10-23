'use strict';
/* ================= Parsing ================= */

function decodeBuffer(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\uFEFF/, ''); }
  catch { return new TextDecoder('windows-1252').decode(buf); }
}

// Corrige texto UTF-8 que foi gravado com dupla codificação (ex.: "Â°" -> "°")
function fixMojibake(s) {
  if (!/[ÂÃÎ][\u0080-\u00FF]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, c => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch { return s; }
}

function detectDelimiter(text) {
  const head = text.slice(0, 5000).split(/\r?\n/).slice(0, 5).join('\n');
  let best = ',', n = -1;
  for (const d of [';', ',', '\t', '|']) {
    const c = head.split(d).length;
    if (c > n) { n = c; best = d; }
  }
  return best;
}

function parseCSV(text, delim) {
  const rows = [];
  let row = [], field = '', q = false;
  const len = text.length;
  for (let i = 0; i < len; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function toNum(s) {
  if (s === undefined || s === null) return NaN;
  s = s.trim();
  if (s === '') return NaN;
  const n = +s;
  if (!isNaN(n)) return n;
  if (/^-?\d+,\d+$/.test(s)) return +s.replace(',', '.');
  return NaN;
}

const PALETTE_N = 24;
const PALETTE = ['#d4b55f', '#5ec8e5', '#f0f0e8', '#e5604d', '#7bd88f', '#b58df0', '#f09a4d', '#e86fb0'];
const colorFor = i => i < PALETTE.length ? PALETTE[i] : `hsl(${(i * 137.508) % 360} ${65 + (i % 3) * 10}% ${58 + (i % 2) * 6}%)`;

function analyze(text, fileName) {
  const delim = detectDelimiter(text);
  const rows = parseCSV(text, delim);
  if (rows.length < 2) throw new Error('Arquivo sem dados.');
  let headers = rows[0].map(h => h.trim());
  const keep = headers.map((h, i) => h !== '' || rows.slice(1, 50).some(r => (r[i] || '').trim() !== ''));
  const idx = headers.map((_, i) => i).filter(i => keep[i]);
  headers = idx.map(i => headers[i] || `col${i + 1}`);
  const data = rows.slice(1).map(r => idx.map(i => r[i] === undefined ? '' : r[i]));
  const nCol = headers.length, nRow = data.length;

  const sample = data.length > 600 ? data.filter((_, i) => i % Math.ceil(data.length / 600) === 0) : data;
  const numFrac = c => sample.filter(r => !isNaN(toNum(r[c]))).length / sample.length;
  const fracs = headers.map((_, c) => numFrac(c));
  const used = new Set();
  const find = re => headers.findIndex((h, i) => !used.has(i) && re.test(h));

  let timeCol = find(/^(sec|seconds|time|timestamp|tempo|t|elapsed|hora)\b|^(sec|time|tempo)/i);
  if (timeCol >= 0 && fracs[timeCol] < 0.8) {
    const ok = sample.every(r => !isNaN(Date.parse(r[timeCol])));
    if (!ok) timeCol = -1;
  }
  if (timeCol < 0) {
    const dc = headers.findIndex((h, i) => fracs[i] < 0.3 && sample.every(r => !isNaN(Date.parse(r[i])) && /\d/.test(r[i])));
    timeCol = dc;
  }
  if (timeCol >= 0) used.add(timeCol);
  const latCol = find(/^lat/i); if (latCol >= 0) used.add(latCol);
  const lonCol = find(/^lon/i); if (lonCol >= 0) used.add(lonCol);
  const unitCol = find(/^(unit|unid)/i);

  const getTime = r => {
    const s = r[timeCol], n = toNum(s);
    return isNaN(n) ? Date.parse(s) / 1000 : n;
  };

  // formato longo: coluna categórica + coluna de valor
  let nameCol = -1, valCol = -1;
  const cands = headers.map((h, i) => i).filter(i => !used.has(i) && i !== unitCol && fracs[i] < 0.5);
  for (const c of cands) {
    const u = new Set(sample.map(r => r[c]));
    if (u.size >= 1 && u.size <= 300 && u.size < sample.length * 0.3) {
      if (nameCol < 0 || /pid|name|param|chan|sensor|nome|signal/i.test(headers[c])) nameCol = c;
    }
  }
  if (nameCol >= 0) {
    used.add(nameCol);
    valCol = find(/^(value|valor|val)/i);
    if (valCol < 0) valCol = headers.findIndex((h, i) => !used.has(i) && fracs[i] >= 0.8);
    if (valCol < 0) nameCol = -1;
  }

  const channels = [];
  const mkChan = (name, unit) => ({
    name, unit: unit || '', t: [], v: [], lat: [], lon: [], hasGps: false, color: '',
  });

  if (nameCol >= 0) {
    const map = new Map();
    data.forEach((r, i) => {
      const v = toNum(r[valCol]);
      if (isNaN(v)) return;
      const name = r[nameCol];
      let ch = map.get(name);
      if (!ch) { ch = mkChan(name, unitCol >= 0 ? fixMojibake(r[unitCol]) : ''); map.set(name, ch); channels.push(ch); }
      ch.t.push(timeCol >= 0 ? getTime(r) : i);
      ch.v.push(v);
      ch.lat.push(latCol >= 0 ? toNum(r[latCol]) : NaN);
      ch.lon.push(lonCol >= 0 ? toNum(r[lonCol]) : NaN);
    });
  } else {
    headers.forEach((h, c) => {
      if (used.has(c) || c === unitCol || fracs[c] < 0.5) return;
      const m = h.match(/^(.*?)\s*[\[(]([^\])]*)[\])]\s*$/);
      const ch = mkChan(m ? m[1] : h, m ? m[2] : '');
      data.forEach((r, i) => {
        const v = toNum(r[c]);
        if (isNaN(v)) return;
        ch.t.push(timeCol >= 0 ? getTime(r) : i);
        ch.v.push(v);
        ch.lat.push(latCol >= 0 ? toNum(r[latCol]) : NaN);
        ch.lon.push(lonCol >= 0 ? toNum(r[lonCol]) : NaN);
      });
      if (ch.v.length) channels.push(ch);
    });
  }
  if (!channels.length) throw new Error('Nenhuma coluna numérica encontrada.');

  channels.forEach((ch, i) => {
    let order = null;
    for (let k = 1; k < ch.t.length; k++) if (ch.t[k] < ch.t[k - 1]) { order = ch.t.map((_, j) => j).sort((a, b) => ch.t[a] - ch.t[b]); break; }
    const pick = a => order ? Float64Array.from(order, j => a[j]) : Float64Array.from(a);
    ch.t = pick(ch.t); ch.v = pick(ch.v); ch.lat = pick(ch.lat); ch.lon = pick(ch.lon);
    ch.hasGps = ch.lat.some((x, k) => isFinite(x) && isFinite(ch.lon[k]) && (x !== 0 || ch.lon[k] !== 0));
    let mn = Infinity, mx = -Infinity;
    for (const x of ch.v) { if (x < mn) mn = x; if (x > mx) mx = x; }
    ch.min = mn; ch.max = mx;
    ch.color = colorFor(i);
    ch.id = i;
  });

  return {
    fileName, delim, rows: nRow, headers, channels,
    format: nameCol >= 0 ? 'longo' : 'largo',
    cols: { time: headers[timeCol], name: headers[nameCol], value: headers[valCol], unit: headers[unitCol], lat: headers[latCol], lon: headers[lonCol] },
  };
}

if (typeof module !== 'undefined') { module.exports = { analyze, decodeBuffer }; }

/* ================= Util ================= */
if (typeof document !== 'undefined') (function () {
  const $ = id => document.getElementById(id);
  const S = {
    ds: null, sel: new Set(), t0: 0, t1: 1, a: 0, b: 1, cursor: null, mode: 'stack',
    tab: 'chart', sortKey: 'name', sortDir: 1,
  };
  
  const lowerBound = (arr, x) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; } return lo; };
  const nearest = (ch, t) => {
    let i = lowerBound(ch.t, t);
    if (i > 0 && (i === ch.t.length || t - ch.t[i - 1] < ch.t[i] - t)) i--;
    return Math.min(i, ch.t.length - 1);
  };
  const fmtNum = x => {
    if (!isFinite(x)) return '–';
    const a = Math.abs(x);
    if (a === 0) return '0';
    if (a >= 1e6 || a < 1e-3) return x.toExponential(2);
    return (+x.toFixed(a >= 1000 ? 1 : a >= 100 ? 2 : 3)).toString();
  };
  const fmtT = (t, span) => {
    const r = t - S.t0;
    if (Math.abs(r) < 60 || span < 30) return (span < 5 ? r.toFixed(2) : r.toFixed(1)) + 's';
    const m = Math.floor(r / 60), s = r - m * 60;
    return `${m}:${s.toFixed(span < 120 ? 1 : 0).padStart(span < 120 ? 4 : 2, '0')}`;
  };
  const clock = t => {
    if (S.t1 > 86400 * 2) return '';
    const h = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, s = Math.floor(t % 60);
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ================= Load ================= */
  const MAX_BYTES = 10 * 1024 * 1024;
  const dropError = msg => { $('dropError').textContent = msg; $('dropError').hidden = !msg; };

  // Só os dados já processados ficam no navegador (IndexedDB); o CSV original nunca é guardado nem enviado.
  const DB_NAME = 'midnigh7-log-analyzer', STORE = 'session', KEY = 'current';
  const openDb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  async function cacheOp(mode, fn) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  }
  const saveCache = () => cacheOp('readwrite', s => s.put({ ds: S.ds, sel: [...S.sel] }, KEY)).catch(() => { });
  const clearCache = () => cacheOp('readwrite', s => s.delete(KEY)).catch(() => { });
  const readCache = () => cacheOp('readonly', s => s.get(KEY)).catch(() => undefined);

  function showDataset(ds, sel) {
    S.ds = ds;
    S.t0 = Math.min(...ds.channels.map(c => c.t[0]));
    S.t1 = Math.max(...ds.channels.map(c => c.t[c.t.length - 1]));
    if (S.t1 <= S.t0) S.t1 = S.t0 + 1;
    S.a = S.t0; S.b = S.t1; S.cursor = null; V = { z: 1, x: 0, y: 0 };
    S.sel = new Set(sel || ds.channels.slice(0, 3).map(c => c.id));
    $('drop').hidden = true; $('app').hidden = false; $('clearBtn').hidden = false;
    $('fileInfo').textContent = `${ds.fileName} · ${ds.channels.length} canais · ${ds.rows} linhas`;
    buildList(); buildSelects(); buildInfo(); showTab('chart');
  }
  async function loadFile(file) {
    dropError('');
    if (!/\.csv$/i.test(file.name)) { dropError('Envie um arquivo no formato .csv.'); return; }
    if (file.size > MAX_BYTES) { dropError(`O arquivo tem ${(file.size / 1048576).toFixed(1)} MB. O limite é 10 MB.`); return; }
    try {
      const ds = analyze(decodeBuffer(await file.arrayBuffer()), file.name);
      showDataset(ds);
      await saveCache();
    } catch (e) { dropError('Não foi possível ler o arquivo: ' + e.message); }
  }
  $('fileInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadFile(f); };
  $('clearBtn').onclick = async () => {
    if (!confirm('Apagar os dados salvos neste navegador?')) return;
    await clearCache();
    S.ds = null; $('app').hidden = true; $('drop').hidden = false; $('clearBtn').hidden = true; $('fileInfo').textContent = '';
  };
  ['dragover', 'dragenter'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); $('drop').classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); $('drop').classList.remove('over'); }));
  document.addEventListener('drop', e => e.dataTransfer.files[0] && loadFile(e.dataTransfer.files[0]));
  readCache().then(saved => { if (saved && saved.ds && !S.ds) showDataset(saved.ds, saved.sel); });

  /* ================= Sidebar ================= */
  function buildList() {
    const q = $('search').value.toLowerCase();
    const ul = $('chanList'); ul.innerHTML = '';
    for (const ch of S.ds.channels) {
      if (q && !ch.name.toLowerCase().includes(q)) continue;
      const li = document.createElement('li');
      li.innerHTML = `<input type="checkbox" ${S.sel.has(ch.id) ? 'checked' : ''}><span class="dot" style="background:${ch.color}"></span><span class="nm" title="${esc(ch.name)}">${esc(ch.name)}</span><span class="un">${esc(ch.unit)}</span>`;
      li.onclick = e => {
        if (e.target.tagName !== 'INPUT') li.firstChild.checked = !li.firstChild.checked;
        li.firstChild.checked ? S.sel.add(ch.id) : S.sel.delete(ch.id);
        refresh();
      };
      ul.appendChild(li);
    }
  }
  $('search').oninput = buildList;
  $('selAll').onclick = () => { S.ds.channels.forEach(c => S.sel.add(c.id)); buildList(); refresh(); };
  $('selNone').onclick = () => { S.sel.clear(); buildList(); refresh(); };
  $('menuBtn').onclick = () => $('side').classList.toggle('open');
  $('side').addEventListener('click', e => { if (e.target === $('side')) $('side').classList.remove('open'); });

  function buildSelects() {
    const gps = S.ds.channels.filter(c => c.hasGps);
    $('mapChan').innerHTML = gps.length ? gps.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') : '<option value="">(sem GPS)</option>';
    const pref = gps.find(c => /speed|veloc/i.test(c.name)) || gps[0];
    if (pref) $('mapChan').value = pref.id;
  }

  /* ================= Tabs ================= */
  function showTab(t) {
    S.tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    document.querySelectorAll('.tab').forEach(d => d.hidden = d.id !== 'tab-' + t);
    refresh();
  }
  $('tabs').onclick = e => e.target.dataset.tab && showTab(e.target.dataset.tab);
  function refresh() {
    if (!S.ds) return;
    ({ chart: drawChart, map: drawMap, stats: buildStats, info: () => { } })[S.tab]();
    if (S.tab === 'chart') buildLegend();
  }
  window.addEventListener('resize', refresh);

  /* ================= Chart ================= */
  const cv = $('chart'), ctx = cv.getContext('2d');
  const M = { l: 58, r: 10, b: 22 };
  let layout = null;

  function visibleChannels() { return S.ds.channels.filter(c => S.sel.has(c.id)); }

  function drawChart() {
    const wrap = $('chartWrap'), dpr = window.devicePixelRatio || 1;
    const chs = visibleChannels();
    const W = wrap.clientWidth, H0 = wrap.clientHeight;
    const n = Math.max(chs.length, 1);
    const stack = S.mode === 'stack';
    const panelH = stack ? Math.max(100, Math.floor((H0 - M.b) / n)) : H0 - M.b;
    const H = stack ? panelH * n + M.b : H0;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = '11px Courier New, monospace'; ctx.textBaseline = 'middle';
    const pw = W - M.l - M.r, span = S.b - S.a;
    const xOf = t => M.l + (t - S.a) / span * pw;
    layout = { W, H, pw, stack, panelH, n: chs.length, chs };

    // eixo X
    const ticks = niceTicks(S.a, S.b, Math.max(2, Math.floor(pw / 90)));
    ctx.strokeStyle = '#ffffff1f'; ctx.fillStyle = '#a4a59e'; ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    const plotBottom = H - M.b;
    for (const t of ticks) {
      const x = Math.round(xOf(t)) + .5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotBottom); ctx.stroke();
      ctx.fillText(fmtT(t, span), x, plotBottom + 11);
    }
    if (!chs.length) { ctx.fillStyle = '#a4a59e'; ctx.textAlign = 'center'; ctx.fillText('Selecione canais na lista', W / 2, H / 2); return; }

    chs.forEach((ch, i) => {
      const top = stack ? i * panelH : 0, h = panelH;
      const lo = Math.max(0, lowerBound(ch.t, S.a) - 1), hi = Math.min(ch.t.length, lowerBound(ch.t, S.b) + 1);
      let mn = Infinity, mx = -Infinity;
      for (let k = lo; k < hi; k++) { const v = ch.v[k]; if (v < mn) mn = v; if (v > mx) mx = v; }
      if (!isFinite(mn)) { mn = ch.min; mx = ch.max; }
      if (mn === mx) { mn -= 1; mx += 1; }
      const pad = (mx - mn) * 0.06; mn -= pad; mx += pad;
      const yOf = v => top + 6 + (1 - (v - mn) / (mx - mn)) * (h - 14);
      ch._view = { mn, mx, top, h };

      if (stack) {
        ctx.strokeStyle = '#ffffff1f'; ctx.beginPath(); ctx.moveTo(M.l, top + h - .5); ctx.lineTo(W - M.r, top + h - .5); ctx.stroke();
        ctx.textAlign = 'right'; ctx.fillStyle = '#a4a59e';
        const yt = niceTicks(mn, mx, Math.max(2, Math.floor(h / 36)));
        for (const v of yt) {
          const y = Math.round(yOf(v)) + .5;
          ctx.strokeStyle = '#ffffff0d'; ctx.beginPath(); ctx.moveTo(M.l, y); ctx.lineTo(W - M.r, y); ctx.stroke();
          ctx.fillText(fmtNum(v), M.l - 5, y);
        }
        ctx.textAlign = 'left'; ctx.fillStyle = ch.color; ctx.font = 'bold 11px Courier New, monospace';
        ctx.fillText(`${ch.name}${ch.unit ? ' (' + ch.unit + ')' : ''}`, M.l + 6, top + 11);
        ctx.font = '11px Courier New, monospace';
      }

      ctx.save(); ctx.beginPath(); ctx.rect(M.l, top, pw, h); ctx.clip();
      ctx.strokeStyle = ch.color; ctx.lineWidth = 1.4; ctx.beginPath();
      // no modo sobreposto cada canal é normalizado pelo seu intervalo total
      const yv = stack ? yOf : (v => top + 6 + (1 - (v - ch.min) / ((ch.max - ch.min) || 1)) * (h - 14));
      const cnt = hi - lo;
      if (cnt > pw * 2) {
        let k = lo;
        for (let px = 0; px < pw; px++) {
          const tEnd = S.a + (px + 1) / pw * span;
          let bmn = Infinity, bmx = -Infinity, first = NaN, last = NaN, any = false;
          while (k < hi && ch.t[k] < tEnd) { const v = ch.v[k]; if (!any) first = v; any = true; last = v; if (v < bmn) bmn = v; if (v > bmx) bmx = v; k++; }
          if (!any) continue;
          const x = M.l + px + .5;
          ctx.moveTo(x, yv(bmn)); ctx.lineTo(x, yv(bmx));
        }
      } else {
        for (let k = lo; k < hi; k++) { const x = xOf(ch.t[k]), y = yv(ch.v[k]); k === lo ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      }
      ctx.stroke();
      if (cnt < pw / 4) { ctx.fillStyle = ch.color; for (let k = lo; k < hi; k++) ctx.fillRect(xOf(ch.t[k]) - 1.5, yv(ch.v[k]) - 1.5, 3, 3); }
      ctx.restore();
      ch._yv = yv;
    });

    if (!stack) { // legenda de escala: 0-100% do intervalo do canal
      ctx.fillStyle = '#a4a59e'; ctx.textAlign = 'right';
      ctx.fillText('máx', M.l - 5, 12); ctx.fillText('mín', M.l - 5, plotBottom - 8);
    }

    if (S.cursor !== null && S.cursor >= S.a && S.cursor <= S.b) {
      const x = Math.round(xOf(S.cursor)) + .5;
      ctx.strokeStyle = '#f3f3ed'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotBottom); ctx.stroke(); ctx.setLineDash([]);
      chs.forEach(ch => {
        const k = nearest(ch, S.cursor);
        if (ch._yv) { ctx.fillStyle = ch.color; ctx.beginPath(); ctx.arc(xOf(ch.t[k]), ch._yv(ch.v[k]), 3.5, 0, 7); ctx.fill(); }
      });
    }
    updateReadout();
  }

  function niceTicks(a, b, count) {
    const raw = (b - a) / count, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p, step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
    const out = [];
    for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toPrecision(12));
    return out;
  }

  function updateReadout() {
    const el = $('readout');
    if (S.cursor === null) { el.textContent = 'Passe o mouse / toque no gráfico para ler valores'; return; }
    const c = clock(S.cursor);
    el.textContent = `t = ${fmtT(S.cursor, S.b - S.a)}${c ? ' (' + c + ')' : ''}`;
  }

  function buildLegend() {
    const lg = $('legend');
    lg.innerHTML = visibleChannels().map(ch => {
      let txt = '';
      if (S.cursor !== null) txt = ' = ' + fmtNum(ch.v[nearest(ch, S.cursor)]);
      return `<span><i style="background:${ch.color}"></i>${esc(ch.name)}${txt} ${esc(ch.unit)}</span>`;
    }).join('');
  }

  const setCursorFromX = x => {
    const t = S.a + (x - M.l) / layout.pw * (S.b - S.a);
    S.cursor = Math.min(S.b, Math.max(S.a, t));
    drawChart(); buildLegend();
  };
  const clampView = () => {
    const full = S.t1 - S.t0; let span = Math.min(S.b - S.a, full);
    const minSpan = full / 5000; if (span < minSpan) span = minSpan;
    let a = S.a; if (a < S.t0) a = S.t0; if (a + span > S.t1) a = S.t1 - span;
    S.a = a; S.b = a + span;
  };
  const zoomAt = (t, f) => {
    S.a = t - (t - S.a) * f; S.b = t + (S.b - t) * f; clampView(); drawChart(); drawMapIfVisible();
  };
  const drawMapIfVisible = () => { };

  const ptrs = new Map(); let drag = null;
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    drag = { x: e.offsetX, a: S.a, b: S.b, moved: false, dist: pinchDist() };
  });
  cv.addEventListener('pointermove', e => {
    if (!layout) return;
    const p = ptrs.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse') setCursorFromX(e.offsetX); return; }
    p.x = e.offsetX; p.y = e.offsetY;
    if (ptrs.size >= 2) {
      const d = pinchDist(), mid = [...ptrs.values()].reduce((s, q) => s + q.x, 0) / ptrs.size;
      if (drag.dist && d) { zoomAt(S.a + (mid - M.l) / layout.pw * (S.b - S.a), drag.dist / d); }
      drag.dist = d; drag.moved = true; return;
    }
    const dx = e.offsetX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    if (drag.moved) {
      const dt = dx / layout.pw * (drag.b - drag.a);
      S.a = drag.a - dt; S.b = drag.b - dt; clampView(); drawChart();
    }
  });
  const end = e => {
    if (drag && !drag.moved && ptrs.size === 1) setCursorFromX(e.offsetX);
    ptrs.delete(e.pointerId); drag = ptrs.size ? { x: 0, a: S.a, b: S.b, moved: true, dist: pinchDist() } : null;
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !ptrs.size) { S.cursor = null; drawChart(); buildLegend(); } });
  function pinchDist() { const a = [...ptrs.values()]; return a.length >= 2 ? Math.abs(a[0].x - a[1].x) || 1 : 0; }
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const t = S.a + (e.offsetX - M.l) / layout.pw * (S.b - S.a);
    if (e.shiftKey) { const dt = (S.b - S.a) * 0.1 * Math.sign(e.deltaY); S.a += dt; S.b += dt; clampView(); drawChart(); }
    else zoomAt(t, e.deltaY > 0 ? 1.25 : 0.8);
  }, { passive: false });
  cv.addEventListener('dblclick', () => { S.a = S.t0; S.b = S.t1; drawChart(); });
  $('zin').onclick = () => zoomAt((S.a + S.b) / 2, 0.6);
  $('zout').onclick = () => zoomAt((S.a + S.b) / 2, 1.6);
  $('zreset').onclick = () => { S.a = S.t0; S.b = S.t1; drawChart(); };
  $('mode').onchange = e => { S.mode = e.target.value; drawChart(); };

  /* ================= Map ================= */
  let V = { z: 1, x: 0, y: 0 }, mapState = null;
  function drawMap() {
    const c = $('map'), wrap = $('mapWrap'), dpr = window.devicePixelRatio || 1;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const ch = S.ds.channels[+$('mapChan').value];
    if (!ch || !ch.hasGps) { mapState = null; $('mapInfo').textContent = 'Este log não possui coordenadas GPS.'; return; }
    const pts = [];
    for (let i = 0; i < ch.t.length; i++) {
      if (isFinite(ch.lat[i]) && isFinite(ch.lon[i]) && (ch.lat[i] || ch.lon[i])) pts.push(i);
    }
    let la0 = 90, la1 = -90, lo0 = 180, lo1 = -180;
    for (const i of pts) { la0 = Math.min(la0, ch.lat[i]); la1 = Math.max(la1, ch.lat[i]); lo0 = Math.min(lo0, ch.lon[i]); lo1 = Math.max(lo1, ch.lon[i]); }
    const kx = Math.cos((la0 + la1) / 2 * Math.PI / 180);
    const w = Math.max((lo1 - lo0) * kx, 1e-6), h = Math.max(la1 - la0, 1e-6), pad = 30;
    const sc = Math.min((W - 2 * pad) / w, (H - 2 * pad - 24) / h);
    const ox = (W - w * sc) / 2, oy = (H - 24 - h * sc) / 2;
    const px = i => (ox + (ch.lon[i] - lo0) * kx * sc) * V.z + V.x, py = i => (oy + (la1 - ch.lat[i]) * sc) * V.z + V.y;
    mapState = { ch, pts, px, py };
    const range = ch.max - ch.min || 1;
    const col = v => { const f = (v - ch.min) / range; return `hsl(${240 - f * 240} 85% 55%)`; };
    const inView = i => ch.t[i] >= S.a && ch.t[i] <= S.b;
    g.lineWidth = 2; g.lineJoin = 'round';
    for (let j = 1; j < pts.length; j++) {
      const i0 = pts[j - 1], i1 = pts[j];
      g.strokeStyle = inView(i1) ? col(ch.v[i1]) : '#ffffff26';
      g.beginPath(); g.moveTo(px(i0), py(i0)); g.lineTo(px(i1), py(i1)); g.stroke();
    }
    if (pts.length) {
      const dot = (i, color) => { g.fillStyle = color; g.beginPath(); g.arc(px(i), py(i), 6, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); };
      dot(pts[0], '#22c55e'); dot(pts[pts.length - 1], '#ef4444');
      if (S.cursor !== null) {
        let best = pts[0], bd = Infinity;
        for (const i of pts) { const d = Math.abs(ch.t[i] - S.cursor); if (d < bd) { bd = d; best = i; } }
        dot(best, '#f3f3ed');
      }
    }
    const gr = g.createLinearGradient(pad, 0, W - pad, 0);
    for (let k = 0; k <= 10; k++) gr.addColorStop(k / 10, `hsl(${240 - k * 24} 85% 55%)`);
    g.fillStyle = gr; g.fillRect(pad, H - 18, W - 2 * pad, 8);
    g.fillStyle = '#a4a59e'; g.font = '11px Courier New, monospace'; g.textBaseline = 'alphabetic';
    g.textAlign = 'left'; g.fillText(fmtNum(ch.min) + ' ' + ch.unit, pad, H - 22);
    g.textAlign = 'right'; g.fillText(fmtNum(ch.max) + ' ' + ch.unit, W - pad, H - 22);
    $('mapInfo').textContent = `${pts.length} pontos · verde = início, vermelho = fim · trecho colorido = intervalo visível no gráfico`;
  }
  $('mapChan').onchange = () => { $('mapTip').hidden = true; drawMap(); };

  const mc = $('map'), tip = $('mapTip');
  const mapZoom = (mx, my, f) => {
    const z = Math.min(200, Math.max(1, V.z * f)); f = z / V.z;
    V.x = mx - (mx - V.x) * f; V.y = my - (my - V.y) * f; V.z = z;
    if (z === 1) { V.x = 0; V.y = 0; }
  };
  function showTip(mx, my) {
    if (!mapState) return;
    const { ch, pts, px, py } = mapState;
    let best = -1, bd = Infinity;
    for (const i of pts) { const d = (px(i) - mx) ** 2 + (py(i) - my) ** 2; if (d < bd) { bd = d; best = i; } }
    if (best < 0 || bd > 40 * 40) { if (!tip.hidden) { tip.hidden = true; S.cursor = null; drawMap(); } return; }
    S.cursor = ch.t[best];
    drawMap();
    const t = ch.t[best], c = clock(t);
    const others = S.ds.channels.filter(o => o !== ch && S.sel.has(o.id));
    const rows = `<tr class="cur"><td><i style="background:${ch.color}"></i>${esc(ch.name)}</td><td>${fmtNum(ch.v[best])} ${esc(ch.unit)}</td></tr>` +
      others.map(o => `<tr><td><i style="background:${o.color}"></i>${esc(o.name)}</td><td>${fmtNum(o.v[nearest(o, t)])} ${esc(o.unit)}</td></tr>`).join('');
    tip.innerHTML = `<b>t = ${fmtT(t, S.t1 - S.t0)}${c ? ' · ' + c : ''}</b><div class="muted">${ch.lat[best].toFixed(6)}, ${ch.lon[best].toFixed(6)}</div><table>${rows}</table>`;
    tip.hidden = false;
    const W = mc.clientWidth, H = mc.clientHeight, tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = px(best) + 14, y = py(best) + 14;
    if (x + tw > W) x = px(best) - tw - 14;
    if (y + th > H) y = H - th - 4;
    tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
  }
  const mp = new Map(); let mdrag = null;
  mc.addEventListener('pointerdown', e => {
    mc.setPointerCapture(e.pointerId); mp.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    mdrag = { x: e.offsetX, y: e.offsetY, vx: V.x, vy: V.y, moved: false, d: mapPinch() };
  });
  mc.addEventListener('pointermove', e => {
    const p = mp.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse') showTip(e.offsetX, e.offsetY); return; }
    p.x = e.offsetX; p.y = e.offsetY;
    if (mp.size >= 2) {
      const d = mapPinch(), pts = [...mp.values()];
      if (mdrag.d && d) mapZoom((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, d / mdrag.d);
      mdrag.d = d; mdrag.moved = true; tip.hidden = true; drawMap(); return;
    }
    const dx = e.offsetX - mdrag.x, dy = e.offsetY - mdrag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) mdrag.moved = true;
    if (mdrag.moved) { V.x = mdrag.vx + dx; V.y = mdrag.vy + dy; tip.hidden = true; drawMap(); }
  });
  const mEnd = e => {
    if (mdrag && !mdrag.moved && mp.size === 1) showTip(e.offsetX, e.offsetY);
    mp.delete(e.pointerId); mdrag = mp.size ? { x: 0, y: 0, vx: V.x, vy: V.y, moved: true, d: mapPinch() } : null;
  };
  mc.addEventListener('pointerup', mEnd); mc.addEventListener('pointercancel', mEnd);
  mc.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !mp.size) tip.hidden = true; });
  function mapPinch() { const a = [...mp.values()]; return a.length >= 2 ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1 : 0; }
  mc.addEventListener('wheel', e => { e.preventDefault(); mapZoom(e.offsetX, e.offsetY, e.deltaY > 0 ? 0.8 : 1.25); drawMap(); showTip(e.offsetX, e.offsetY); }, { passive: false });
  mc.addEventListener('dblclick', e => { mapZoom(e.offsetX, e.offsetY, 2); drawMap(); });
  $('mzin').onclick = () => { mapZoom(mc.clientWidth / 2, mc.clientHeight / 2, 1.5); drawMap(); };
  $('mzout').onclick = () => { mapZoom(mc.clientWidth / 2, mc.clientHeight / 2, 1 / 1.5); drawMap(); };
  $('mzreset').onclick = () => { V = { z: 1, x: 0, y: 0 }; tip.hidden = true; drawMap(); };

  /* ================= Stats ================= */
  function computeStats(ch, onlyView) {
    let lo = 0, hi = ch.t.length;
    if (onlyView) { lo = lowerBound(ch.t, S.a); hi = lowerBound(ch.t, S.b + 1e-9); }
    const v = Array.from(ch.v.subarray(lo, hi));
    const n = v.length;
    if (!n) return { name: ch.name, unit: ch.unit, n: 0 };
    let sum = 0, mn = Infinity, mx = -Infinity;
    for (const x of v) { sum += x; if (x < mn) mn = x; if (x > mx) mx = x; }
    const mean = sum / n;
    let sq = 0; for (const x of v) sq += (x - mean) ** 2;
    const s = v.slice().sort((a, b) => a - b);
    const q = p => s[Math.min(n - 1, Math.floor(p * (n - 1) + .5))];
    return { name: ch.name, unit: ch.unit, n, min: mn, max: mx, mean, median: q(.5), p95: q(.95), std: Math.sqrt(sq / n), first: v[0], last: v[n - 1] };
  }
  const STAT_COLS = [['name', 'Canal'], ['unit', 'Un.'], ['n', 'N'], ['min', 'Mín'], ['max', 'Máx'], ['mean', 'Média'], ['median', 'Mediana'], ['p95', 'P95'], ['std', 'Desv.'], ['first', 'Primeiro'], ['last', 'Último']];
  let lastStats = [];
  function buildStats() {
    const ov = $('statsView').checked, os = $('statsSel').checked;
    let chs = S.ds.channels; if (os) chs = chs.filter(c => S.sel.has(c.id));
    lastStats = chs.map(c => computeStats(c, ov));
    const k = S.sortKey;
    lastStats.sort((a, b) => (typeof a[k] === 'string' ? a[k].localeCompare(b[k]) : (a[k] ?? -Infinity) - (b[k] ?? -Infinity)) * S.sortDir);
    $('statsTable').innerHTML = '<tr>' + STAT_COLS.map(([k, l]) => `<th data-k="${k}">${l}${k === S.sortKey ? (S.sortDir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('') + '</tr>' +
      lastStats.map(r => '<tr>' + STAT_COLS.map(([k]) => `<td>${k === 'name' || k === 'unit' ? esc(r[k]) : k === 'n' ? r[k] : fmtNum(r[k])}</td>`).join('') + '</tr>').join('');
  }
  $('statsTable').onclick = e => {
    const k = e.target.dataset.k; if (!k) return;
    S.sortDir = S.sortKey === k ? -S.sortDir : 1; S.sortKey = k; buildStats();
  };
  $('statsView').onchange = $('statsSel').onchange = buildStats;
  $('statsCsv').onclick = () => {
    const csv = [STAT_COLS.map(c => c[1]).join(';')].concat(lastStats.map(r => STAT_COLS.map(([k]) => r[k] ?? '').join(';'))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv' }));
    a.download = 'estatisticas.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  /* ================= Info ================= */
  function buildInfo() {
    const d = S.ds, c = d.cols;
    const rows = [['Arquivo', d.fileName], ['Formato detectado', d.format], ['Delimitador', d.delim === '\t' ? 'TAB' : d.delim], ['Linhas de dados', d.rows],
      ['Canais', d.channels.length], ['Duração', (S.t1 - S.t0).toFixed(2) + ' s'], ['Coluna de tempo', c.time || '(índice)'],
      ['Coluna de nome', c.name || '—'], ['Coluna de valor', c.value || '—'], ['Coluna de unidade', c.unit || '—'], ['Latitude', c.lat || '—'], ['Longitude', c.lon || '—']];
    $('infoTable').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td style="text-align:left">${esc(r[1])}</td></tr>`).join('');
  }

})();
