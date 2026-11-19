// Leonida Trophy Guide — tracker for the 55 GTA VI trophies.
// Loads app/data/trophies.json, keeps earned ticks in localStorage,
// and offers kind/grade/status filters, search, a spoiler mode and
// export/import of progress. Runs fully offline: the only file it
// fetches is its own data file, and source links open only on click.

const DATA_URL = 'data/trophies.json';
const STORAGE_KEY = 'leonida-trophy-tracker-v1';
const DEMO_EARNED = [2, 3, 4, 8, 15, 16, 17, 18, 19, 20, 21, 25, 28, 31, 32, 33, 35, 36, 42, 52, 53, 54, 55];

let trophies = [];
let earned = new Set();
let openId = null;
let activeKind = 'all';
let spoilerOn = false;

const listEl = document.getElementById('trophyList');
const metaEl = document.getElementById('listMeta');
const emptyEl = document.getElementById('emptyNote');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const statusEl = document.getElementById('statusFilter');
const spoilerEl = document.getElementById('spoiler');

function loadSavedProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    return new Set((names || []).filter((n) => typeof n === 'string'));
  } catch {
    return new Set();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ app: 'leonida-trophy-guide', earned: [...earned] }));
}

function seedDemoProgress() {
  const params = new URLSearchParams(location.search);
  if (params.get('demo') !== '1') return;
  if (localStorage.getItem(STORAGE_KEY)) return;
  const byId = new Map(trophies.map((t) => [t.id, t.name]));
  earned = new Set(DEMO_EARNED.map((id) => byId.get(id)).filter(Boolean));
  saveProgress();
}

function applyLaunchParams() {
  const params = new URLSearchParams(location.search);
  const kind = params.get('kind');
  if (kind && ['story', 'missable', 'collectibles', 'activities', 'online'].includes(kind)) {
    activeKind = kind;
  }
  const grade = params.get('grade');
  if (grade && ['platinum', 'gold', 'silver', 'bronze'].includes(grade)) {
    gradeEl.value = grade;
  }
  if (params.get('spoiler') === '1') {
    spoilerOn = true;
    spoilerEl.checked = true;
  }
  const open = Number(params.get('open'));
  if (Number.isInteger(open)) openId = open;
}

function gradeLetter(grade) {
  return { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' }[grade] || '?';
}

function trophyVisible(t) {
  if (activeKind === 'missable' && !t.missable) return false;
  if (activeKind === 'online') return false;
  if (activeKind !== 'all' && activeKind !== 'missable' && t.kind !== activeKind) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  const isEarned = earned.has(t.name);
  if (statusEl.value === 'earned' && !isEarned) return false;
  if (statusEl.value === 'remaining' && isEarned) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
  return true;
}

function spoilerMasked(t) {
  return spoilerOn && t.hidden && !earned.has(t.name);
}

function renderStats() {
  const total = trophies.length;
  document.getElementById('earnedCount').textContent = String(earned.size);
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) {
    totals[t.grade] += 1;
    if (earned.has(t.name)) counts[t.grade] += 1;
  }
  const gradesEl = document.getElementById('gradeCounts');
  gradesEl.replaceChildren();
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const span = document.createElement('span');
    span.className = 'grade-count';
    const dot = document.createElement('span');
    dot.className = 'dot-' + g;
    dot.textContent = '● ';
    const bold = document.createElement('b');
    bold.textContent = g[0].toUpperCase() + g.slice(1) + ' ' + counts[g] + '/' + totals[g];
    span.append(dot, bold);
    gradesEl.append(span);
  }
  const pct = total ? Math.round((earned.size / total) * 100) : 0;
  document.getElementById('platFill').style.width = pct + '%';
  document.getElementById('platLabel').textContent = pct + '% to platinum';
}

function buildTrophyRow(t) {
  const masked = spoilerMasked(t);
  const isEarned = earned.has(t.name);
  const article = document.createElement('article');
  article.className = 'trophy' + (isEarned ? ' earned' : '') + (openId === t.id ? ' open' : '');
  article.id = 'trophy-' + t.id;

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'trophy-head';
  head.setAttribute('aria-expanded', String(openId === t.id));
  head.addEventListener('click', (event) => {
    if (event.target.tagName === 'INPUT') return;
    toggleTrophyDetail(t.id);
  });

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.setAttribute('aria-label', 'Mark ' + (masked ? 'hidden trophy' : t.name) + ' as earned');
  box.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleEarned(t.name);
  });

  const badge = document.createElement('span');
  badge.className = 'badge badge-' + t.grade;
  badge.textContent = gradeLetter(t.grade);

  const main = document.createElement('div');
  main.className = 'trophy-main';
  const name = document.createElement('span');
  name.className = 'trophy-name';
  name.textContent = masked ? 'Hidden trophy' : t.name;
  const desc = document.createElement('span');
  desc.className = 'trophy-desc';
  desc.textContent = masked ? 'Earn this trophy to reveal its name and description.' : t.description;
  const tags = document.createElement('div');
  tags.className = 'tags';
  const gradeTag = document.createElement('span');
  gradeTag.className = 'tag tag-grade-' + t.grade;
  gradeTag.textContent = t.grade;
  tags.append(gradeTag);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = t.kind;
  tags.append(kindTag);
  if (t.missable) {
    const miss = document.createElement('span');
    miss.className = 'tag tag-missable';
    miss.textContent = 'Missable';
    tags.append(miss);
  }
  if (t.hidden) {
    const hid = document.createElement('span');
    hid.className = 'tag tag-hidden';
    hid.textContent = 'Hidden';
    tags.append(hid);
  }
  const stageTag = document.createElement('span');
  stageTag.className = 'tag tag-stage';
  stageTag.textContent = 'Roadmap stage ' + t.stage;
  tags.append(stageTag);
  main.append(name, desc, tags);

  const hint = document.createElement('span');
  hint.className = 'expand-hint';
  hint.textContent = openId === t.id ? 'Hide guide ▲' : 'Guide ▼';

  head.append(box, badge, main, hint);

  const detail = document.createElement('div');
  detail.className = 'trophy-detail';
  if (t.missable) {
    const callout = document.createElement('p');
    callout.className = 'missable-callout';
    callout.textContent = 'Potentially missable — the only trophy in the list flagged this way. See the guide for the Chapter 1 step to do early.';
    detail.append(callout);
  }
  const guide = document.createElement('p');
  guide.className = 'guide';
  if (masked) {
    guide.textContent = 'Guide hidden until earned (spoiler mode is on).';
    guide.classList.add('spoiler-mask');
  } else {
    const label = document.createElement('b');
    label.textContent = 'How to get it: ';
    guide.append(label, document.createTextNode(t.guide));
  }
  detail.append(guide);
  if (!masked) {
    const source = document.createElement('p');
    source.className = 'source';
    source.textContent = 'Source: ' + t.source + ' — ';
    const link = document.createElement('a');
    link.href = t.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = t.sourceUrl;
    source.append(link);
    detail.append(source);
    if (t.count) {
      const counts = document.createElement('p');
      counts.className = 'counts';
      counts.textContent = 'Target: ' + t.count.toLocaleString('en-US') + ' · Roadmap stage ' + t.stage + ' of 3';
      detail.append(counts);
    }
  }

  article.append(head, detail);
  return article;
}

function renderTrophyList() {
  const shown = trophies.filter(trophyVisible);
  listEl.replaceChildren();
  for (const t of shown) listEl.append(buildTrophyRow(t));
  metaEl.textContent = shown.length + ' of ' + trophies.length + ' trophies shown';
  emptyEl.hidden = shown.length > 0;
  if (shown.length === 0 && activeKind === 'online') {
    emptyEl.textContent = 'No online trophies in this list — all 55 are single-player and offline.';
    emptyEl.hidden = false;
  } else if (shown.length === 0) {
    emptyEl.textContent = 'No trophies match these filters.';
  }
  renderStats();
}

function toggleEarned(name) {
  if (earned.has(name)) earned.delete(name);
  else earned.add(name);
  saveProgress();
  renderTrophyList();
}

function toggleTrophyDetail(id) {
  openId = openId === id ? null : id;
  renderTrophyList();
  if (openId !== null) {
    const row = document.getElementById('trophy-' + openId);
    if (row) row.scrollIntoView({ block: 'nearest' });
  }
}

function exportProgress() {
  const payload = { app: 'leonida-trophy-guide', exportedAt: new Date().toISOString(), earned: [...earned] };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

function importProgress(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const names = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(names)) throw new Error('no earned list');
      const known = new Set(trophies.map((t) => t.name));
      const clean = names.filter((n) => typeof n === 'string' && known.has(n));
      earned = new Set(clean);
      saveProgress();
      renderTrophyList();
    } catch {
      alert('That file is not a Leonida Trophy Guide progress export.');
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  if (!confirm('Clear all earned ticks?')) return;
  earned = new Set();
  saveProgress();
  renderTrophyList();
}

async function loadTrophyData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error('could not load ' + DATA_URL);
  const doc = await response.json();
  trophies = Array.isArray(doc) ? doc : doc.trophies;
}

function bindControls() {
  document.querySelectorAll('#kindChips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeKind = chip.dataset.kind;
      document.querySelectorAll('#kindChips .chip').forEach((c) => c.classList.toggle('active', c === chip));
      renderTrophyList();
    });
  });
  searchEl.addEventListener('input', renderTrophyList);
  gradeEl.addEventListener('change', renderTrophyList);
  statusEl.addEventListener('change', renderTrophyList);
  spoilerEl.addEventListener('change', () => {
    spoilerOn = spoilerEl.checked;
    renderTrophyList();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', (event) => {
    importProgress(event.target.files[0]);
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', resetProgress);
}

async function startGuide() {
  try {
    await loadTrophyData();
  } catch (error) {
    listEl.replaceChildren();
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'Could not load the trophy list (' + error.message + '). Serve app/ over HTTP or open index.html from the app folder.';
    listEl.append(note);
    window.__shotReady = true;
    return;
  }
  earned = loadSavedProgress();
  seedDemoProgress();
  applyLaunchParams();
  document.querySelectorAll('#kindChips .chip').forEach((c) => c.classList.toggle('active', c.dataset.kind === activeKind));
  bindControls();
  renderTrophyList();
  window.__shotReady = true;
}

startGuide();
