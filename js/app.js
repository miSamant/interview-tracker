import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- Firebase init ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ---------- State ----------
let currentUser = null;
let entries = [];
let unsubscribe = null;
let activeFilter = "all";
let activeEntryId = null;
let activeTab = "overview";
let draft = null; // in-progress edits for the open modal, persists across tab switches

const STAGES = [
  { key: "applied",   label: "Applied",     color: "#5B8DEF" },
  { key: "response",  label: "Response",    color: "#F2B84B" },
  { key: "interview", label: "Interviewing",color: "#9B6BF2" },
  { key: "offer",     label: "Offer",       color: "#3FC97F" },
  { key: "rejected",  label: "Rejected",    color: "#F2555A" },
];
const stageColor = (key) => STAGES.find((s) => s.key === key)?.color || "#888";
const stageLabel = (key) => STAGES.find((s) => s.key === key)?.label || key;

function stageOf(entry) {
  if (entry.outcome === "rejected") return "rejected";
  if (entry.outcome === "offer") return "offer";
  if ((entry.rounds || []).length > 0) return "interview";
  if (entry.responseReceived) return "response";
  return "applied";
}

// ---------- DOM refs ----------
const $ = (sel) => document.querySelector(sel);
const loginScreen = $("#login-screen");
const appScreen = $("#app-screen");
const loginBtn = $("#login-btn");
const logoutBtn = $("#logout-btn");
const userChip = $("#user-chip");
const addBtn = $("#add-entry-btn");
const boardEl = $("#board");
const kpiEl = $("#kpi-grid");
const funnelEl = $("#funnel");
const filterBar = $("#filter-bar");
const modalRoot = $("#modal-root");
const emptyState = $("#empty-state");

// ---------- Auth ----------
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert("Sign-in failed: " + e.message);
  }
});
logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    userChip.innerHTML = `<img src="${user.photoURL || ''}" alt=""><span>${user.displayName || user.email}</span>`;
    subscribeEntries();
  } else {
    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    if (unsubscribe) unsubscribe();
    entries = [];
  }
});

// ---------- Firestore ----------
function subscribeEntries() {
  const q = query(collection(db, "users", currentUser.uid, "applications"), orderBy("appliedDate", "desc"));
  unsubscribe = onSnapshot(q, (snap) => {
    entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, (err) => {
    console.error(err);
    alert("Couldn't load your data. Check your Firestore security rules — see README.md.");
  });
}

async function saveEntry(data, id) {
  const col = collection(db, "users", currentUser.uid, "applications");
  if (id) {
    await updateDoc(doc(col, id), { ...data, updatedAt: serverTimestamp() });
  } else {
    await addDoc(col, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

async function removeEntry(id) {
  await deleteDoc(doc(db, "users", currentUser.uid, "applications", id));
}

// ---------- Rendering ----------
function render() {
  renderKPIs();
  renderFunnel();
  renderBoard();
}

function renderKPIs() {
  const total = entries.length;
  const responded = entries.filter((e) => e.responseReceived).length;
  const interviewing = entries.filter((e) => (e.rounds || []).length > 0).length;
  const offers = entries.filter((e) => e.outcome === "offer").length;
  const active = entries.filter((e) => e.outcome === "active").length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  const cards = [
    { label: "Total applications", value: total, sub: "all time" },
    { label: "Response rate", value: `${pct(responded)}%`, sub: `${responded} responded` },
    { label: "Interview rate", value: `${pct(interviewing)}%`, sub: `${interviewing} interviewing` },
    { label: "Offers", value: offers, sub: offers ? "🎉 nice work" : "none yet" },
    { label: "Active pipeline", value: active, sub: "in progress" },
  ];
  kpiEl.innerHTML = cards.map((c) => `
    <div class="kpi-card">
      <span class="kpi-value">${c.value}</span>
      <span class="kpi-label">${c.label}</span>
      <span class="kpi-sub">${c.sub}</span>
    </div>`).join("");
}

function renderFunnel() {
  const total = entries.length;
  const responded = entries.filter((e) => e.responseReceived).length;
  const interviewing = entries.filter((e) => (e.rounds || []).length > 0).length;
  const offers = entries.filter((e) => e.outcome === "offer").length;
  const stages = [
    { label: "Applied", n: total, color: stageColor("applied") },
    { label: "Response", n: responded, color: stageColor("response") },
    { label: "Interview", n: interviewing, color: stageColor("interview") },
    { label: "Offer", n: offers, color: stageColor("offer") },
  ];
  const max = Math.max(1, total);
  funnelEl.innerHTML = stages.map((s) => `
    <div class="funnel-row">
      <span class="funnel-label">${s.label}</span>
      <div class="funnel-track">
        <div class="funnel-bar" style="width:${(s.n / max) * 100}%; background:${s.color}"></div>
      </div>
      <span class="funnel-n">${s.n}</span>
    </div>`).join("");
}

function renderBoard() {
  const filtered = activeFilter === "all" ? entries : entries.filter((e) => stageOf(e) === activeFilter);
  filterBar.querySelectorAll(".filter-chip").forEach((c) => {
    c.classList.toggle("active", c.dataset.stage === activeFilter);
  });

  emptyState.classList.toggle("hidden", entries.length !== 0);
  if (!filtered.length) {
    boardEl.innerHTML = entries.length ? `<p class="board-empty">No entries in this stage.</p>` : "";
    return;
  }

  boardEl.innerHTML = filtered.map((e) => {
    const stage = stageOf(e);
    return `
    <button class="entry-card" data-id="${e.id}" style="border-left-color:${stageColor(stage)}">
      <div class="entry-card-top">
        <span class="entry-company">${escapeHtml(e.company || "Untitled")}</span>
        <span class="stage-badge" style="background:${stageColor(stage)}22; color:${stageColor(stage)}">${stageLabel(stage)}</span>
      </div>
      <span class="entry-role">${escapeHtml(e.role || "")}</span>
      <div class="entry-card-bottom">
        <span>${e.appliedDate ? fmtDate(e.appliedDate) : "—"}</span>
        <span>${escapeHtml(e.source || "—")}</span>
      </div>
    </button>`;
  }).join("");

  boardEl.querySelectorAll(".entry-card").forEach((el) => {
    el.addEventListener("click", () => openDetail(el.dataset.id));
  });
}

filterBar.addEventListener("click", (e) => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  activeFilter = chip.dataset.stage;
  renderBoard();
});

addBtn.addEventListener("click", () => openDetail(null));

// ---------- Detail / edit modal with tabs ----------
function openDetail(id) {
  activeEntryId = id;
  activeTab = "overview";
  const existing = id ? entries.find((e) => e.id === id) : null;
  draft = existing ? { ...existing, rounds: (existing.rounds || []).map((r) => ({ ...r })) } : blankEntry();
  renderModal();
}

function closeModal() {
  activeEntryId = null;
  draft = null;
  modalRoot.innerHTML = "";
}

function captureCurrentTab() {
  const g = (id) => document.getElementById(id);
  if (g("f-company")) draft.company = g("f-company").value;
  if (g("f-role")) draft.role = g("f-role").value;
  if (g("f-applied")) draft.appliedDate = g("f-applied").value;
  if (g("f-source")) draft.source = g("f-source").value;
  if (g("f-outcome")) draft.outcome = g("f-outcome").value;
  if (g("f-response")) draft.responseReceived = g("f-response").checked;
  if (g("f-responsedate")) draft.responseDate = g("f-responsedate").value;
  if (g("f-resume")) draft.resumeVersion = g("f-resume").value;
  if (g("f-joblink")) draft.jobLink = g("f-joblink").value;
  if (g("f-contact")) draft.contact = g("f-contact").value;
  if (g("f-notes")) draft.notes = g("f-notes").value;
  if (document.getElementById("rounds-list")) draft.rounds = collectRounds();
}

function renderModal() {
  const entry = draft;
  const isNew = !activeEntryId;

  modalRoot.innerHTML = `
  <div class="modal-backdrop">
    <div class="modal">
      <div class="modal-header">
        <input id="f-company" class="company-input" placeholder="Company name" value="${escapeAttr(entry.company)}">
        <button class="icon-btn" id="close-modal">✕</button>
      </div>
      <div class="tabs">
        <button class="tab-btn ${activeTab === "overview" ? "active" : ""}" data-tab="overview">Overview</button>
        <button class="tab-btn ${activeTab === "rounds" ? "active" : ""}" data-tab="rounds">Rounds ${entry.rounds?.length ? `(${entry.rounds.length})` : ""}</button>
        <button class="tab-btn ${activeTab === "resume" ? "active" : ""}" data-tab="resume">Resume & Links</button>
        <button class="tab-btn ${activeTab === "notes" ? "active" : ""}" data-tab="notes">Notes</button>
      </div>
      <div class="tab-body" id="tab-body"></div>
      <div class="modal-footer">
        ${!isNew ? `<button class="btn-danger" id="delete-entry">Delete</button>` : "<span></span>"}
        <div>
          <button class="btn-ghost" id="cancel-entry">Cancel</button>
          <button class="btn-primary" id="save-entry">Save</button>
        </div>
      </div>
    </div>
  </div>`;

  renderTabBody(entry);

  $("#close-modal").addEventListener("click", closeModal);
  $("#cancel-entry").addEventListener("click", closeModal);
  modalRoot.querySelector(".modal-backdrop").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeModal();
  });
  modalRoot.querySelectorAll(".tab-btn").forEach((b) => {
    b.addEventListener("click", () => { captureCurrentTab(); activeTab = b.dataset.tab; renderModal(); });
  });
  if (!isNew) $("#delete-entry").addEventListener("click", async () => {
    if (confirm(`Delete the entry for ${entry.company || "this company"}? This can't be undone.`)) {
      await removeEntry(activeEntryId);
      closeModal();
    }
  });
  $("#save-entry").addEventListener("click", () => handleSave(isNew));
}

function blankEntry() {
  return {
    company: "", role: "", jobLink: "", source: "LinkedIn", resumeVersion: "",
    contact: "", appliedDate: todayISO(), responseReceived: false, responseDate: "",
    rounds: [], outcome: "active", notes: "",
  };
}

function renderTabBody(entry) {
  const body = $("#tab-body");
  if (activeTab === "overview") {
    body.innerHTML = `
      <div class="field-grid">
        <label>Role <input id="f-role" value="${escapeAttr(entry.role)}" placeholder="e.g. Frontend Engineer"></label>
        <label>Date applied <input id="f-applied" type="date" value="${entry.appliedDate || ""}"></label>
        <label>Source
          <select id="f-source">
            ${["LinkedIn", "Company Website", "Referral", "Naukri", "Indeed", "Recruiter", "Other"]
              .map((s) => `<option ${entry.source === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </label>
        <label>Outcome
          <select id="f-outcome">
            ${["active", "offer", "rejected", "withdrawn"]
              .map((s) => `<option value="${s}" ${entry.outcome === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}
          </select>
        </label>
        <label class="checkbox-row"><input id="f-response" type="checkbox" ${entry.responseReceived ? "checked" : ""}> Received a response</label>
        <label>Response date <input id="f-responsedate" type="date" value="${entry.responseDate || ""}"></label>
      </div>`;
  } else if (activeTab === "rounds") {
    const rounds = entry.rounds || [];
    body.innerHTML = `
      <div id="rounds-list">
        ${rounds.map((r, i) => `
          <div class="round-row" data-i="${i}">
            <input class="r-title" placeholder="Round name (e.g. HR screen)" value="${escapeAttr(r.title)}">
            <input class="r-date" type="date" value="${r.date || ""}">
            <input class="r-notes" placeholder="Notes / feedback" value="${escapeAttr(r.notes)}">
            <button class="icon-btn r-remove" title="Remove round">✕</button>
          </div>`).join("") || `<p class="hint">No rounds logged yet. Add one when you get called for the next stage.</p>`}
      </div>
      <button class="btn-ghost" id="add-round">+ Add round</button>`;
    $("#add-round").addEventListener("click", () => {
      draft.rounds = collectRounds();
      draft.rounds.push({ title: "", date: todayISO(), notes: "" });
      renderTabBody(draft);
    });
    body.querySelectorAll(".r-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.closest(".round-row").dataset.i);
        draft.rounds = collectRounds();
        draft.rounds.splice(i, 1);
        renderTabBody(draft);
      });
    });
  } else if (activeTab === "resume") {
    body.innerHTML = `
      <div class="field-grid">
        <label>Resume version / filename <input id="f-resume" value="${escapeAttr(entry.resumeVersion)}" placeholder="e.g. Resume_v3_Backend.pdf"></label>
        <label>Job posting link <input id="f-joblink" value="${escapeAttr(entry.jobLink)}" placeholder="https://..."></label>
        <label>Contact / recruiter <input id="f-contact" value="${escapeAttr(entry.contact)}" placeholder="Name, email, or LinkedIn"></label>
      </div>
      <p class="hint">Resume files aren't uploaded here — just track which version/name you sent, so you know what a company has on file.</p>`;
  } else if (activeTab === "notes") {
    body.innerHTML = `<textarea id="f-notes" rows="10" placeholder="Free-form notes...">${escapeHtml(entry.notes)}</textarea>`;
  }
}

function collectRounds() {
  return Array.from(document.querySelectorAll(".round-row")).map((row) => ({
    title: row.querySelector(".r-title").value,
    date: row.querySelector(".r-date").value,
    notes: row.querySelector(".r-notes").value,
  }));
}

async function handleSave(isNew) {
  captureCurrentTab(); // pull whatever's on screen right now into draft
  const data = { ...draft };
  data.company = data.company.trim();
  if (!data.company) { alert("Company name is required."); return; }
  delete data.id;
  await saveEntry(data, isNew ? null : activeEntryId);
  closeModal();
}

// ---------- Helpers ----------
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso) { try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch { return iso; } }
function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeAttr(s) { return escapeHtml(s); }
