// Alamat maya ini diterjemahkan oleh tenant-bootstrap.js kepada pelayan HEMSTT.
// Salinan multi-sekolah tidak menggunakan mana-mana pelayan sistem asal SK Ranggu.
const API_URL = new URL("./hemstt-api/school", location.href).href;
const SAFETY_API_URL = new URL("./hemstt-api/safety", location.href).href;
const ORGANIZATION_API_URL = new URL("./hemstt-api/organization", location.href).href;
const CONTENT_API_URL = new URL("./hemstt-api/content", location.href).href;
const DISCIPLINE_PUBLIC_API_URL = new URL("./hemstt-api/discipline", location.href).href;
const $ = (selector) => document.querySelector(selector);
const state = {
  date: "", classes: [], staffAbsences: { morning: [], afternoon: [] }, dutyTeachers: { morning: [], afternoon: [] }, meta: {}, loading: false, saveTimer: null,
  savePromise: null, pendingAttendance: new Map(), savingAttendance: new Set(), failedAttendance: new Set(), lastAttendanceEditAt: 0, staffDirty: false, dutyDirtySessions: new Set(), pendingMeta: {}, audit: new Map(), adminPin: "", session: "all",
  staffDirectory: [], adminStaffDirectory: [], schoolStats: { teachers: 58, akp: 3 },
  analytics: { period: "week", date: "", loading: false, filtersReady: false, filterPromise: null, annualLoadingYear: "", annualCache: new Map() },
  monitoring: { reports: [], loading: false, previewUrls: [], filter: "all", month: "", calendarLoading: false, calendarRecords: new Map(), selectedDate: "", requestedMode: "", requestedSession: "" },
  dutyStatus: { month: "", loading: false, records: new Map(), selectedDate: "" },
  weeklyDuty: { loading: false }, completion: { loading: false }, calendar: { loading: false }, rmtPreviewUrls: [], rmtReports: [], rmtLoading: false,
  rmtMonth: "", rmtSelectedDate: "", rmtShowAll: false, rmtScheduleLoading: false,
  dutyWeek: { anchor: "", end: "", sourceDate: "", session: "morning", editing: false, locked: false, loading: false, loadedKey: "", loadedAt: 0, dates: [], reports: [], summaries: { morning: null, afternoon: null } },
  opr: { reports: [], allReports: [], loading: false, previewUrls: [], month: "", selectedDate: "", filter: "all" }, editingRecord: null,
  organization: { items: [], adminItems: [], deletedIds: [], loading: false },
  content: { announcements: [], adminAnnouncements: [], deletedAnnouncementIds: [], latestLetters: [], letters: [], loading: false },
  staffVisibleRows: { morning: 1, afternoon: 1 },
};
const DRAFT_PREFIX = "skrg-pending-v1:";
const EDITOR_KEY = "skrg-editor-name-v1";
const DEFAULT_STAFF_NAMES = [
  "YUNUS BIN PATARAI", "RAHMATIAH BINTI MOHD JUDA", "KOMALA BINTI JOSEPH", "WARNAH BINTI SIRA", "EMRAN BIN HJ SELAMAT",
  "AG KU KEMAINDDRA BIN PG MOHD TAIB", "AHAD BIN JAAFAR", "AINATUN NADHIRAH BINTI DHARMAWI", "ANI BINTI PATOLA", "ASMADI BIN LAJJAKASI",
  "BAJAM BINTI LADUNG", "DARMAWATI BTE LOKKONG", "EVALORENNA BINTI LAMINSIN", "FARIDAH BINTI SUNU", "HALIM BIN BIDI",
  "HAMSIAH BINTI HAMID", "HASNAN BIN MAT ZIN", "JAIBY BIN JULIAN", "JAINAH BINTI SULAIMAN", "JUNAID BIN NURDIN",
  "MARIANA BINTI KASSIM", "MARINI BINTI LADI", "MASTURAH BINTI TUDA", "MOHAMMAD FIKREY BIN ABDUL GAPAR", "MOHAMMAD IKHWAN BIN ABDURAIS",
  "MOHD ALFAIZAL BIN DAUD", "MOHD MUEMIN BIN MOHD AMIN JAPAR", "MUHAMADIAN BIN SUAIBU", "NECHI BINTI SERUNAI", "NOOR SYAFIQAH NADHIRAH BINTI JAMALUDDIN",
  "NORIMAH BINTI JOYO REJO", "NORLINA BINTI BAGWAS", "NOZE BINTI TUKIJAN", "NUR FAEZAH BINTI BANTALANI", "NURUL ANISA BINTI SAPARUDIN",
  "RASMAWATI BINTI TAUSE", "RINI BINTI DAUD", "ROBIATUL AIDAWYAH", "RONI BIN BACHO", "ROSIDIAN BIN IDRIS",
  "ROSMINAH BINTI SAPAR", "RUHAYA BINTI AHMAD", "S.LILI BINTI LADI", "SABRIAH @ HABIBAH BINTI ABDUL SABAR", "SALSABILA BINTI SHAHRUDDIN",
  "SITI JAWARA BINTI LUKMAN", "SITI NAURIN FADZILAH BINTI JALAL", "SITI RABIA BIN IBRAHIM", "SUNARTI BINTI TAPPA", "TANJANG BIN TURE",
  "WAFA FARHANA BINTI ABD KADIR", "WAN MUHAMAD YUSUF BIN WAN ABDUL AZIZ", "YUSNI BINTI WAHJUDIN", "ZAMRIE BIN OMAR ALI", "HANISAH BINTI MANSOR",
  "NURAIDA BINTI KAIMUDIN", "MULYANTI BINTI MIKIL @ MOHAMED ISHAK", "RAPIDAH BINTI KARIM", "YENNY BINTI SANAUDI", "FARIDAH BINTI ACHO",
];
const AKP_STAFF_NAMES = new Set([
  "HANISAH BINTI MANSOR", "NURAIDA BINTI KAIMUDIN", "MULYANTI BINTI MIKIL @ MOHAMED ISHAK",
  "RAPIDAH BINTI KARIM", "YENNY BINTI SANAUDI", "FARIDAH BINTI ACHO",
]);
const MONITORING_CATEGORY_LABELS = { cleanliness: "Kebersihan", safety: "Keselamatan", both: "Kebersihan dan keselamatan" };
const MONITORING_STATUS_LABELS = { controlled: "Terkawal", attention: "Perlu perhatian", not_applicable: "Tidak berkaitan" };
const ADMIN_APPROVERS = {
  "YUNUS PATARAI": "Guru Besar",
  "PUAN HAJAH RAHMATIAH BINTI MOJUDA": "Penolong Kanan Pentadbiran",
  "PUAN KOMALA JOSEPH": "Penolong Kanan HEM",
  "PUAN WARNAH": "Penolong Kanan Kokurikulum",
  "TUAN HAJI EMRAN": "Penyelia Petang",
};

function administratorTitle(name, fallback = "") {
  const normalized = String(name || "").trim().toUpperCase();
  if (!normalized) return "";
  if (ADMIN_APPROVERS[normalized]) return ADMIN_APPROVERS[normalized];
  if (normalized.includes("KOMALA") && normalized.includes("JOSEPH")) return "Penolong Kanan HEM";
  if (normalized.includes("RAHMATIAH") && normalized.includes("MOJUDA")) return "Penolong Kanan Pentadbiran";
  if (normalized.includes("YUNUS") && normalized.includes("PATARAI")) return "Guru Besar";
  if (normalized.includes("WARNAH")) return "Penolong Kanan Kokurikulum";
  if (normalized.includes("EMRAN")) return "Penyelia Petang";
  return String(fallback || "").trim();
}
const ABSENCE_REASONS = [
  "Kursus / Bengkel",
  "Mesyuarat / Taklimat",
  "Urusan Rasmi",
  "Program / Aktiviti Rasmi",
  "Tugas Rasmi di Luar Sekolah",
  "Cuti Sakit / MC",
  "Cuti Rehat Khas / CRK",
  "Cuti Rehat / CR",
  "Cuti Tanpa Rekod / CTR",
  "Cuti Bersalin",
  "Cuti Kuarantin",
  "Cuti Haji",
  "Cuti Umrah",
  "Cuti Menjaga Anak",
  "Cuti Separuh Gaji",
  "Cuti Tanpa Gaji",
  "Cuti / Kebenaran Khas",
  "Lain-lain"
];
const KPI_TARGET = 96;
const MONITORING_LOCATIONS = ["Kawasan Perhimpunan", "Bilik Darjah", "Koridor", "Tangga", "Padang", "Dewan", "Tandas Murid Lelaki", "Tandas Murid Perempuan", "Tandas Guru", "Surau / Bilik Solat", "Kantin", "Kawasan RMT", "Penyediaan Makanan RMT", "Pengendalian Makanan RMT", "Pintu Pagar", "Laluan Keluar / Masuk", "Kawasan Letak Kenderaan", "Laluan Pejalan Kaki", "Kawasan Sekitar Sekolah", "Longkang & Saliran", "Tempat Pembuangan Sampah", "Landskap / Kawasan Hijau", "Bilik UBK", "Makmal Komputer", "Pusat Sumber", "Bilik Sains", "Bilik Muzik", "Stor", "Bilik khas lain", "Lain-lain"];
const CLASS_ENROLMENT_PROFILES = window.CLASS_ENROLMENT_PROFILES || {};
const CLASS_ETHNICITY_COUNTS = window.CLASS_ETHNICITY_COUNTS || {};
const IDME_POSITION_KEY = "skrg-idme-position-v1";

function withLatestClassProfiles(classes) {
  return (Array.isArray(classes) ? classes : []).map((row) => {
    const profile = CLASS_ENROLMENT_PROFILES[String(row.id)] || {};
    return {
      ...row,
      ...profile,
      enrolMale: profile.maleEnrol ?? row.enrolMale,
      enrolFemale: profile.femaleEnrol ?? row.enrolFemale,
    };
  });
}

function draftKey(date = state.date) { return `${DRAFT_PREFIX}${date}`; }

function saveDraft() {
  try {
    const draft = {
      attendanceUpdates: Array.from(state.pendingAttendance.values()),
      staffAbsences: state.staffDirty ? state.staffAbsences : null,
      dutyTeacherUpdates: Array.from(state.dutyDirtySessions).map((session) => ({ session, teachers: state.dutyTeachers[session] })),
      metaUpdates: Object.keys(state.pendingMeta).length ? state.pendingMeta : null,
    };
    if (hasPendingChanges()) localStorage.setItem(draftKey(), JSON.stringify(draft));
    else localStorage.removeItem(draftKey());
  } catch { /* Pelayar mungkin menyekat storan draf; simpanan bersama masih diteruskan. */ }
}

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey()) || "null");
    if (!draft) return false;
    for (const patch of Array.isArray(draft.attendanceUpdates) ? draft.attendanceUpdates : []) {
      const item = state.classes.find((entry) => entry.id === patch.id);
      if (!item) continue;
      const pending = { id: patch.id };
      for (const field of ["absentMale", "absentFemale", "note"]) if (Object.prototype.hasOwnProperty.call(patch, field)) {
        item[field] = patch[field]; pending[field] = patch[field];
      }
      state.pendingAttendance.set(patch.id, pending);
    }
    if (draft.staffAbsences && typeof draft.staffAbsences === "object") {
      state.staffAbsences = Array.isArray(draft.staffAbsences)
        ? { morning: draft.staffAbsences, afternoon: [] }
        : { morning: Array.isArray(draft.staffAbsences.morning) ? draft.staffAbsences.morning : [], afternoon: Array.isArray(draft.staffAbsences.afternoon) ? draft.staffAbsences.afternoon : [] };
      state.staffDirty = true;
    }
    for (const update of Array.isArray(draft.dutyTeacherUpdates) ? draft.dutyTeacherUpdates : []) {
      if (!["morning", "afternoon"].includes(update.session) || !Array.isArray(update.teachers)) continue;
      state.dutyTeachers[update.session] = update.teachers.slice(0, 5);
      state.dutyDirtySessions.add(update.session);
    }
    if (draft.metaUpdates && typeof draft.metaUpdates === "object") {
      state.pendingMeta = { ...draft.metaUpdates };
      state.meta = { ...state.meta, ...draft.metaUpdates };
    }
    return hasPendingChanges();
  } catch { return false; }
}

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function setupDraggableIdmeShortcut() {
  const shortcut = $("#idmeShortcut");
  if (!shortcut) return;
  let dragState = null;
  let suppressClick = false;

  const positionBounds = () => {
    const rect = shortcut.getBoundingClientRect();
    return { width: rect.width, height: rect.height, maxX: Math.max(8, window.innerWidth - rect.width - 8), maxY: Math.max(8, window.innerHeight - rect.height - 8) };
  };
  const applyPosition = (left, top, save = false) => {
    const bounds = positionBounds();
    const x = Math.min(bounds.maxX, Math.max(8, left));
    const y = Math.min(bounds.maxY, Math.max(8, top));
    shortcut.classList.add("is-positioned");
    shortcut.style.left = `${x}px`;
    shortcut.style.top = `${y}px`;
    if (save) {
      try { localStorage.setItem(IDME_POSITION_KEY, JSON.stringify({ x: x / bounds.maxX, y: y / bounds.maxY })); } catch { /* Kedudukan hanya kekal untuk sesi semasa jika storan disekat. */ }
    }
  };
  const restorePosition = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(IDME_POSITION_KEY) || "null");
      if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
      const bounds = positionBounds();
      applyPosition(saved.x * bounds.maxX, saved.y * bounds.maxY);
    } catch { /* Gunakan kedudukan asal jika data lama tidak sah. */ }
  };

  shortcut.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const rect = shortcut.getBoundingClientRect();
    dragState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, moved: false };
    shortcut.classList.add("is-positioned", "is-dragging");
    shortcut.style.left = `${rect.left}px`;
    shortcut.style.top = `${rect.top}px`;
    shortcut.setPointerCapture?.(event.pointerId);
  });
  shortcut.addEventListener("dragstart", (event) => event.preventDefault());
  shortcut.addEventListener("pointermove", (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) < 6) return;
    dragState.moved = true;
    event.preventDefault();
    applyPosition(dragState.left + dx, dragState.top + dy);
  });
  const finishDrag = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const moved = dragState.moved;
    dragState = null;
    shortcut.classList.remove("is-dragging");
    shortcut.releasePointerCapture?.(event.pointerId);
    if (!moved) return;
    const rect = shortcut.getBoundingClientRect();
    applyPosition(rect.left, rect.top, true);
    suppressClick = true;
    window.setTimeout(() => { suppressClick = false; }, 350);
  };
  shortcut.addEventListener("pointerup", finishDrag);
  shortcut.addEventListener("pointercancel", finishDrag);
  shortcut.addEventListener("click", (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  });
  window.addEventListener("resize", () => { if (shortcut.classList.contains("is-positioned")) restorePosition(); });
  restorePosition();
}

function safe(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

async function loadDisciplinePublicSummary() {
  const status = $("#disciplineAlertStatus");
  if (!status) return;
  try {
    const response = await fetch(DISCIPLINE_PUBLIC_API_URL, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.summary) throw new Error(data.error || "Status tidak tersedia");
    const summary = data.summary;
    const fields = { disciplinePendingAction: summary.pendingAction, disciplinePendingSsdm: summary.pendingSsdm, disciplineSsdmAttention: summary.ssdmAttention };
    for (const [id, value] of Object.entries(fields)) { const element = $(`#${id}`); if (element) element.textContent = String(Number(value) || 0); }
    const total = Object.values(fields).reduce((sum, value) => sum + (Number(value) || 0), 0);
    $("#disciplineAlertTotal").textContent = String(total);
    $("#disciplineAlertTotal").classList.toggle("clear", total === 0);
    $("#disciplineAlertBadge").textContent = String(total);
    $("#disciplineAlertBadge").classList.toggle("clear", total === 0);
    $("#disciplineTotalCases").textContent = String(Number(summary.total) || 0);
    $("#disciplineInProgress").textContent = String(Number(summary.inProgress) || 0);
    $("#disciplineCompleted").textContent = String(Number(summary.completed) || 0);
    const trend = Array.isArray(summary.trend) ? summary.trend : [];
    const trendChart = $("#disciplineTrendChart");
    if (trendChart) {
      const max = Math.max(1, ...trend.map((item) => Number(item.count) || 0));
      const points = trend.map((item, index) => {
        const x = trend.length < 2 ? 50 : 6 + index * (88 / (trend.length - 1));
        const y = 88 - ((Number(item.count) || 0) / max) * 66;
        return { x, y, ...item };
      });
      const linePoints = points.map((item) => `${item.x},${item.y}`).join(" ");
      const areaPoints = points.length ? `6,88 ${linePoints} 94,88` : "";
      trendChart.innerHTML = trend.length ? `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Carta garis trend kes disiplin enam bulan"><defs><linearGradient id="disciplineArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#168ac7" stop-opacity=".28"/><stop offset="1" stop-color="#168ac7" stop-opacity=".02"/></linearGradient></defs><line x1="6" y1="88" x2="94" y2="88"/><polygon points="${areaPoints}"/><polyline points="${linePoints}"/>${points.map((item) => `<circle cx="${item.x}" cy="${item.y}" r="2.1"><title>${safe(item.label)}: ${Number(item.count) || 0} kes</title></circle>`).join("")}</svg><div class="discipline-trend-labels">${points.map((item) => `<span><b>${Number(item.count) || 0}</b>${safe(item.label)}</span>`).join("")}</div>` : '<p>Trend belum tersedia. Sila muat semula sebentar lagi.</p>';
    }
    status.textContent = summary.updatedAt ? `Data semasa • ${formatDisplayDateTime(summary.updatedAt)}` : "Data semasa telah dimuatkan";
  } catch (error) {
    console.error(error);
    status.textContent = "Alert belum dapat dimuatkan. Buka SmartDisiplin untuk semakan.";
    status.classList.add("error");
  }
}

function activeStaffNames() {
  const names = state.staffDirectory.filter((item) => item.active !== false).map((item) => String(item.name || "").trim()).filter(Boolean);
  return [...new Set(names.length ? names : DEFAULT_STAFF_NAMES)].sort((a, b) => a.localeCompare(b, "ms"));
}

function refreshStaffNameChoices() {
  const names = activeStaffNames();
  $("#staffNames").innerHTML = names.map((name) => `<option value="${safe(name)}"></option>`).join("");
  const fillSelect = (element, placeholder) => {
    if (!element) return;
    const current = element.value;
    const choices = current && !names.includes(current) ? [current, ...names] : names;
    element.innerHTML = `<option value="">${safe(placeholder)}</option>${choices.map((name) => `<option value="${safe(name)}"${name === current ? " selected" : ""}>${safe(name)}</option>`).join("")}`;
  };
  fillSelect($("#editorName"), "Pilih nama guru / AKP");
  for (const selector of ["#preparedByMorning", "#preparedByAfternoon", "#weeklyReportPreparedBy", "#oprPreparedBy", "#letterUpdatedBy", "#editOprPreparedBy", "#editLetterUpdatedBy"]) fillSelect($(selector), "Pilih nama guru / AKP");
  for (const selector of ["#approvedByMorning", "#approvedByAfternoon", "#weeklyReportApprovedBy"]) {
    const element = $(selector); if (!element) continue;
    const current = element.value;
    element.innerHTML = `<option value="">Pilih pentadbir sekolah</option>${Object.keys(ADMIN_APPROVERS).map((name) => `<option value="${safe(name)}"${name === current ? " selected" : ""}>${safe(name)}</option>`).join("")}`;
  }
}

function staffSelectOptions(selected = "", placeholder = "Pilih nama guru / AKP") {
  const names = activeStaffNames();
  const choices = selected && !names.includes(selected) ? [selected, ...names] : names;
  return `<option value="">${safe(placeholder)}</option>${choices.map((name) => `<option value="${safe(name)}"${name === selected ? " selected" : ""}>${safe(name)}</option>`).join("")}`;
}

function editorName() { return $("#editorName").value.trim(); }

function auditKey(section, recordId, fieldName) { return `${section}:${recordId}:${fieldName}`; }

function auditDetails(section, recordId, fieldName) {
  const item = state.audit.get(auditKey(section, recordId, fieldName));
  if (!item) return { className: "", title: "" };
  const time = formatDisplayDateTime(item.updatedAt);
  return { className: " has-audit", title: `Diisi oleh: ${item.updatedBy} • ${time}` };
}

function attendanceConfirmed(classId, audits = state.audit, row = state.classes.find((item) => String(item.id) === String(classId))) {
  if (!row) return false;
  const hasMale = audits.has(auditKey("attendance", classId, "absentMale"));
  const hasFemale = audits.has(auditKey("attendance", classId, "absentFemale"));
  const hasNote = audits.has(auditKey("attendance", classId, "note"));
  const absentTotal = count(row.absentMale) + count(row.absentFemale);
  if (absentTotal === 0) return hasMale && hasFemale;

  // Rekod lama hanya mengaudit ruangan yang benar-benar disentuh. Jika satu
  // jantina bernilai 0, ruangan itu mungkin tiada audit walaupun laporan lengkap
  // sudah diterima pelayan. Anggap lengkap apabila sekurang-kurangnya satu kiraan
  // disahkan dan senarai murid tidak hadir turut diterima.
  const hasRequiredNote = Boolean(String(row.note || "").trim() && hasNote);
  return (hasMale || hasFemale) && hasRequiredNote && count(row.updatedAt) > 0;
}

function classSyncState(classId) {
  if (state.savingAttendance.has(classId)) return "saving";
  if (state.failedAttendance.has(classId)) return "error";
  if (state.pendingAttendance.has(classId)) return "pending";
  return attendanceConfirmed(classId) ? "complete" : "incomplete";
}

function classIsCompleted(classId) {
  return classSyncState(classId) === "complete";
}

function classStatusMarkup(classId) {
  const syncState = classSyncState(classId);
  const labels = {
    complete: ["Selesai", "Pengisian lengkap telah diterima oleh pelayan"],
    saving: ["Sedang disimpan", "Data sedang dihantar ke pelayan"],
    pending: ["Menunggu simpanan", "Perubahan belum disahkan oleh pelayan"],
    error: ["Belum tersimpan", "Simpanan gagal; data masih tersimpan pada telefon ini untuk dicuba semula"],
    incomplete: ["Belum selesai", "Pengisian lengkap belum diterima oleh pelayan"],
  };
  const [label, title] = labels[syncState];
  return `<span class="class-status ${syncState}" title="${title}">${label}</span>`;
}

function teacherCompletionBadgeMarkup(classId) {
  const syncState = classSyncState(classId);
  if (syncState === "complete") return '<span class="attendance-completion-badge complete" title="Pengisian lengkap telah diterima oleh pelayan"><span class="completion-check" aria-hidden="true">✓</span><em>Selesai</em></span>';
  if (syncState === "saving") return '<span class="attendance-completion-badge saving">Menyimpan…</span>';
  if (syncState === "pending") return '<span class="attendance-completion-badge pending">Menunggu</span>';
  if (syncState === "error") return '<span class="attendance-completion-badge error">Gagal simpan</span>';
  return '<span class="attendance-completion-badge incomplete" title="Pengisian lengkap belum diterima oleh pelayan">Belum</span>';
}

function classConfirmButtonMarkup(classId) {
  const syncState = classSyncState(classId);
  if (syncState === "complete") return "";
  const disabled = syncState === "saving" ? " disabled" : "";
  const label = syncState === "error" ? "Cuba simpan semula" : syncState === "pending" ? "Simpan sekarang" : "Sahkan 0 / data";
  return `<button class="class-confirm-button" type="button" data-class-confirm="${safe(classId)}"${disabled}>${label}</button>`;
}

function renderClassCompletionLists() {
  const target = $("#classCompletionLists");
  if (!target) return;
  const classes = visibleClasses();
  const renderList = (complete) => {
    const items = classes.filter((row) => classIsCompleted(row.id) === complete);
    const label = complete ? "Kelas selesai (disahkan pelayan)" : "Belum diterima sepenuhnya";
    const chips = items.length
      ? `<div class="class-chip-list">${items.map((row) => `<span class="class-chip">${safe(row.name)}</span>`).join("")}</div>`
      : `<p class="class-list-empty">Tiada kelas dalam kategori ini.</p>`;
    return `<section class="completion-list ${complete ? "complete" : "incomplete"}"><h4>${label}<strong>${items.length}</strong></h4>${chips}</section>`;
  };
  target.innerHTML = renderList(true) + renderList(false);
}

function updateClassCompletionStatus(classId) {
  const row = document.querySelector(`tr[data-class-id="${CSS.escape(String(classId))}"]`);
  if (!row) return;
  const syncState = classSyncState(classId);
  const complete = syncState === "complete";
  row.classList.toggle("class-complete", complete);
  row.classList.toggle("class-incomplete", !complete);
  row.classList.toggle("class-saving", syncState === "saving");
  row.classList.toggle("class-pending", syncState === "pending");
  row.classList.toggle("class-error", syncState === "error");
  const cell = row.querySelector("[data-class-status]");
  if (cell) cell.innerHTML = classStatusMarkup(classId);
  const teacherBadge = row.querySelector(".attendance-completion-badge");
  if (teacherBadge) teacherBadge.outerHTML = teacherCompletionBadgeMarkup(classId);
  const oldButton = row.querySelector("[data-class-confirm]");
  const newButton = classConfirmButtonMarkup(classId);
  if (oldButton) oldButton.outerHTML = newButton;
  else if (newButton) row.querySelector(".attendance-teacher")?.insertAdjacentHTML("beforeend", newButton);
  renderClassCompletionLists();
}

function applyAttendanceAudit(updates, updatedBy, updatedAt) {
  for (const patch of updates) {
    for (const fieldName of ["absentMale", "absentFemale", "note"]) {
      if (!Object.prototype.hasOwnProperty.call(patch, fieldName)) continue;
      const key = auditKey("attendance", patch.id, fieldName);
      if (fieldName === "note" && !String(patch[fieldName] ?? "").trim()) state.audit.delete(key);
      else state.audit.set(key, { section: "attendance", recordId: patch.id, fieldName, updatedBy, updatedAt });
      const input = document.querySelector(`tr[data-class-id="${patch.id}"] input[data-field="${fieldName}"]`);
      if (!input) continue;
      const details = auditDetails("attendance", patch.id, fieldName);
      input.title = details.title;
      input.classList.toggle("has-audit", Boolean(details.title));
    }
    updateClassCompletionStatus(patch.id);
  }
}

function verifiedAttendanceReceipts(updates, data) {
  const receipts = new Map((Array.isArray(data.attendanceReceipts) ? data.attendanceReceipts : []).map((receipt) => [String(receipt.id || ""), receipt]));
  return updates.map((patch) => {
    const receipt = receipts.get(String(patch.id));
    if (!receipt) throw new Error(`Pelayan belum mengesahkan rekod ${patch.id}.`);
    const confirmed = new Set(Array.isArray(receipt.confirmedFields) ? receipt.confirmedFields : []);
    const expectedMale = count(patch.absentMale, 300);
    const expectedFemale = count(patch.absentFemale, 300);
    const expectedNote = String(patch.note || "").trim();
    if (Number(receipt.absentMale) !== expectedMale || Number(receipt.absentFemale) !== expectedFemale || String(receipt.note || "").trim() !== expectedNote) {
      throw new Error(`Pengesahan pelayan tidak sepadan untuk ${patch.id}.`);
    }
    if (!confirmed.has("absentMale") || !confirmed.has("absentFemale") || (expectedNote && !confirmed.has("note"))) {
      throw new Error(`Pelayan belum mengesahkan semua medan untuk ${patch.id}.`);
    }
    return receipt;
  });
}

function updateEditingAccess() {
  const allowed = Boolean(editorName());
  document.querySelectorAll("#attendanceBody input,#staffMorningBody input,#staffAfternoonBody input,.report-notes input:not([readonly]),.report-notes textarea").forEach((element) => { element.readOnly = false; });
  document.querySelectorAll("#staffMorningBody select,#staffAfternoonBody select,.report-notes select").forEach((element) => { element.disabled = false; });
  document.querySelectorAll("#dutyMorningBody select,#dutyAfternoonBody select").forEach((element) => { element.disabled = !state.dutyWeek.editing; });
  $("#editorName").classList.toggle("invalid", !allowed);
  $("#monitoringSave").disabled = !allowed;
  $("#rmtPhotoSave").disabled = !allowed;
  if (!allowed && !state.loading) setStatus("Isi nama pengisi untuk mula");
}

function count(value, maximum = 999) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(maximum, parsed)) : 0;
}

function percent(part, whole) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(2)}%` : "0.00%";
}

function organizationInitials(name) {
  const ignored = new Set(["BIN", "BINTI", "BT", "BTE", "PG", "MOHD", "MUHAMMAD", "@"]);
  const parts = String(name || "").split(/\s+/).filter((part) => part && !ignored.has(part.toUpperCase()));
  return (parts.slice(0, 2).map((part) => part[0]).join("") || "HEM").toUpperCase();
}

function organizationPortrait(item, admin = false) {
  const src = item._previewUrl || item.photoUrl;
  return src
    ? `<img src="${safe(src)}" alt="Gambar ${safe(item.staffName || "pegawai HEM")}" loading="lazy">`
    : `<span class="hem-avatar-placeholder" aria-label="Gambar belum dimuat naik">${safe(organizationInitials(item.staffName))}</span>`;
}

function organizationPersonCard(item, className = "") {
  return `<article class="hem-person-card ${className}">
    <div class="hem-person-photo">${organizationPortrait(item)}</div>
    <div class="hem-person-copy"><small>${safe(item.positionTitle)}</small><strong>${safe(item.staffName)}</strong><span>${safe(item.fieldName)}</span><em>${safe(item.roleLabel)}</em></div>
  </article>`;
}

function renderOrganization() {
  const items = state.organization.items.filter((item) => item.active !== false).sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
  const leadership = items.filter((item) => Number(item.hierarchyLevel) <= 3);
  const unitPeople = items.filter((item) => Number(item.hierarchyLevel) >= 4);
  const levels = [...new Set(leadership.map((item) => Number(item.hierarchyLevel)))].sort((a, b) => a - b);
  $("#hemLeadershipChart").innerHTML = levels.map((level, index) => {
    const cards = leadership.filter((item) => Number(item.hierarchyLevel) === level).map((item) => organizationPersonCard(item, level === 2 ? "primary" : "")).join("");
    return `<div class="hem-hierarchy-level level-${level}">${cards}</div>${index < levels.length - 1 ? '<div class="hem-hierarchy-connector" aria-hidden="true"><span></span></div>' : ""}`;
  }).join("");
  const unitGroups = new Map();
  for (const item of unitPeople) {
    const fieldName = String(item.fieldName || "Unit HEM").trim() || "Unit HEM";
    if (!unitGroups.has(fieldName)) unitGroups.set(fieldName, []);
    unitGroups.get(fieldName).push(item);
  }
  const unitEntries = Array.from(unitGroups);
  const unitRows = [];
  for (let index = 0; index < unitEntries.length; index += 2) unitRows.push(unitEntries.slice(index, index + 2));
  const unitBranch = ([fieldName, people], side) => `<section class="hem-unit-branch ${side}"><h4>${safe(fieldName)}</h4><div class="hem-unit-people">${people.map((item) => organizationPersonCard(item, "unit")).join("")}</div></section>`;
  $("#hemUnitChart").innerHTML = unitPeople.length
    ? `<div class="hem-unit-heading"><span>UNIT DAN BIDANG HEM</span><small>${unitGroups.size} unit • ${unitPeople.length} pegawai</small></div><div class="hem-unit-rows">${unitRows.map((row) => `<div class="hem-unit-row">${unitBranch(row[0], "left")}${row[1] ? unitBranch(row[1], "right") : '<span class="hem-unit-empty" aria-hidden="true"></span>'}</div>`).join("")}</div>`
    : "";
  $("#hemOrganizationStatus").textContent = items.length ? "Carta ini dikemas kini melalui Tetapan Sistem." : "Belum ada organisasi HEM aktif untuk dipaparkan.";
}

async function loadOrganization(silent = false) {
  if (state.organization.loading) return;
  state.organization.loading = true;
  if (!silent) $("#hemOrganizationStatus").textContent = "Memuatkan carta organisasi HEM…";
  try {
    const response = await fetch(ORGANIZATION_API_URL, { cache: "no-store" });
    const data = await responseJson(response, "Carta organisasi HEM tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "Carta organisasi HEM tidak dapat dibuka.");
    state.organization.items = Array.isArray(data.organization) ? data.organization : [];
    renderOrganization();
  } catch (error) {
    if (!silent) $("#hemOrganizationStatus").textContent = error.message || "Carta organisasi HEM tidak dapat dibuka.";
  } finally { state.organization.loading = false; }
}

function classFigures(row) {
  const enrolMale = count(row.enrolMale);
  const enrolFemale = count(row.enrolFemale);
  const absentMale = Math.min(count(row.absentMale), enrolMale);
  const absentFemale = Math.min(count(row.absentFemale), enrolFemale);
  const enrolTotal = enrolMale + enrolFemale;
  const absentTotal = absentMale + absentFemale;
  return { enrolMale, enrolFemale, absentMale, absentFemale, enrolTotal, absentTotal, presentMale: enrolMale - absentMale, presentFemale: enrolFemale - absentFemale, presentTotal: enrolTotal - absentTotal };
}

const SESSION_LABELS = {
  all: "KESELURUHAN SEKOLAH",
  morning: "SIDANG PAGI",
  afternoon: "SIDANG PETANG",
};

function classSession(row) {
  if (/^tahun-[456]-/.test(row.id)) return "morning";
  if (/^tahun-[123]-/.test(row.id)) return "afternoon";
  return "all";
}

function dateObject(value) { return new Date(`${value}T00:00:00Z`); }
function dateValue(date) { return date.toISOString().slice(0, 10); }
function addDays(date, days) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next; }

const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const DISPLAY_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuching" });

function formatDisplayDate(value) {
  const text = String(value || "").trim();
  if (!text) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? dateObject(text) : new Date(text);
  return Number.isNaN(date.getTime()) ? text : DISPLAY_DATE_FORMATTER.format(date);
}

function formatDisplayDateTime(value) {
  if (value === undefined || value === null || value === "" || Number(value) === 0) return "—";
  const numeric = Number(value);
  const date = new Date(Number.isFinite(numeric) && numeric > 0 ? numeric : value);
  return Number.isNaN(date.getTime()) ? "—" : DISPLAY_DATE_TIME_FORMATTER.format(date);
}

function formatEmbeddedDates(value) {
  return String(value || "").replace(/\b\d{4}-\d{2}-\d{2}\b/g, (date) => formatDisplayDate(date));
}

function syncLocalizedDateInput(input) {
  const display = input.closest(".localized-date-control")?.querySelector(".localized-date-display");
  if (display) display.querySelector("span").textContent = input.value ? formatDisplayDate(input.value) : "Pilih tarikh";
}

function syncAllLocalizedDateInputs() {
  document.querySelectorAll('input[type="date"]').forEach(syncLocalizedDateInput);
}

function enhanceLocalizedDateInputs() {
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (input.closest(".localized-date-control")) return;
    const wrapper = document.createElement("span");
    wrapper.className = "localized-date-control";
    if (input.hidden) wrapper.hidden = true;
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    const display = document.createElement("span");
    display.className = "localized-date-display";
    display.setAttribute("aria-hidden", "true");
    display.innerHTML = '<span></span><b aria-hidden="true">📅</b>';
    wrapper.appendChild(display);
    input.addEventListener("input", () => syncLocalizedDateInput(input));
    input.addEventListener("change", () => syncLocalizedDateInput(input));
    syncLocalizedDateInput(input);
  });
}

function analyticsRange(period, anchorValue) {
  const anchor = dateObject(anchorValue);
  if (period === "month") {
    const from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
    return { from: dateValue(from), to: dateValue(to) };
  }
  const mondayOffset = (anchor.getUTCDay() + 6) % 7;
  const from = addDays(anchor, -mondayOffset);
  return { from: dateValue(from), to: dateValue(addDays(from, 4)) };
}

function datesInRange(from, to) {
  const values = [];
  for (let cursor = dateObject(from); cursor <= dateObject(to); cursor = addDays(cursor, 1)) {
    const weekday = cursor.getUTCDay();
    if (weekday >= 1 && weekday <= 5) values.push(dateValue(cursor));
  }
  return values;
}

function isSchoolDay(value) {
  const weekday = dateObject(value).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

function analyticsRecordSession(row) {
  if (/^tahun-[456]-/.test(row.id)) return "morning";
  if (/^tahun-[123]-/.test(row.id)) return "afternoon";
  return "all";
}

function aggregateAnalytics(records, from, to) {
  const days = datesInRange(from, to).map((date) => ({ date, all: null, morning: null, afternoon: null, recordCount: 0 }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  const totals = Object.fromEntries(["all", "morning", "afternoon"].map((session) => [session, { enrol: 0, present: 0, days: new Set(), records: 0 }]));
  const dailyTotals = new Map();
  for (const row of records) {
    const enrol = count(row.enrolMale, 300) + count(row.enrolFemale, 300);
    const absent = Math.min(count(row.absentMale, 300) + count(row.absentFemale, 300), enrol);
    const session = analyticsRecordSession(row);
    const sessions = session === "all" ? ["all"] : ["all", session];
    const day = byDate.get(row.date);
    if (!day || enrol <= 0) continue;
    day.recordCount += 1;
    for (const key of sessions) {
      const dailyKey = `${row.date}:${key}`;
      const daily = dailyTotals.get(dailyKey) || { enrol: 0, present: 0 };
      daily.enrol += enrol; daily.present += enrol - absent; dailyTotals.set(dailyKey, daily);
      totals[key].enrol += enrol; totals[key].present += enrol - absent; totals[key].records += 1; totals[key].days.add(row.date);
    }
  }
  for (const day of days) for (const session of ["all", "morning", "afternoon"]) {
    const value = dailyTotals.get(`${day.date}:${session}`);
    if (value?.enrol) day[session] = (value.present / value.enrol) * 100;
  }
  return { days, totals };
}

function analysisPercent(value) { return Number.isFinite(value) ? `${value.toFixed(2)}%` : "—"; }

function renderAnalytics(records, range) {
  const schoolDayRecords = records.filter((row) => isSchoolDay(row.date));
  const { days, totals } = aggregateAnalytics(schoolDayRecords, range.from, range.to);
  const labels = { all: "Keseluruhan", morning: "Sidang pagi", afternoon: "Sidang petang" };
  const periodLabel = $("#analysisPeriod").value === "month" ? "Purata bulanan" : "Purata mingguan";
  $("#analysisSummary").innerHTML = ["all", "morning", "afternoon"].map((session) => {
    const item = totals[session];
    const average = item.enrol ? (item.present / item.enrol) * 100 : NaN;
    return `<article class="${session}"><span>${periodLabel} — ${labels[session]}</span><strong>${analysisPercent(average)}</strong><small>${item.days.size} hari • ${item.records} rekod kelas</small></article>`;
  }).join("");
  const ranking = new Map();
  for (const row of schoolDayRecords) {
    const enrol = count(row.enrolMale, 300) + count(row.enrolFemale, 300);
    if (!enrol) continue;
    const absent = Math.min(count(row.absentMale, 300) + count(row.absentFemale, 300), enrol);
    const key = String(row.id || row.classId || row.name || row.className || "");
    if (!key) continue;
    const className = row.name || row.className || key;
    const rosterClass = state.classes.find((item) => String(item.id) === key || String(item.name) === String(className));
    const current = ranking.get(key) || { id: key, name: className, teacher: row.teacherName || row.teacher || rosterClass?.teacherName || "Nama guru belum tersedia", enrol: 0, present: 0, records: 0 };
    current.enrol += enrol; current.present += enrol - absent; current.records += 1;
    if (row.teacherName || row.teacher) current.teacher = row.teacherName || row.teacher;
    ranking.set(key, current);
  }
  const winners = [...ranking.values()].map((item) => ({ ...item, value: item.enrol ? (item.present / item.enrol) * 100 : 0 })).sort((a, b) => b.value - a.value || b.records - a.records || a.name.localeCompare(b.name, "ms")).slice(0, 3);
  const medals = [{ icon: "🥇", label: "Emas", className: "gold" }, { icon: "🥈", label: "Perak", className: "silver" }, { icon: "🥉", label: "Gangsa", className: "bronze" }];
  $("#attendancePodium").innerHTML = winners.length ? winners.map((item, index) => `<article class="podium-card ${medals[index].className}"><div class="podium-medal" aria-hidden="true">${medals[index].icon}</div><strong>${safe(item.name)}</strong><span>${item.value.toFixed(2)}%</span><small>${safe(item.teacher)}</small><small>${item.records} rekod • ${medals[index].label}</small></article>`).join("") : '<p class="monitoring-empty">Belum ada data kelas yang mencukupi untuk kedudukan emas, perak dan gangsa.</p>';
  $("#analysisRangeLabel").textContent = `${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)}`;
  $("#analysisBestPeriod").value = $("#analysisPeriod").value;
  $("#analysisBestRange").textContent = `${periodLabel} • ${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)}`;
  $("#analysisBestClass").innerHTML = winners.length ? winners.map((item, index) => `<button class="${medals[index].className}${index === 0 ? " selected" : ""}" type="button" data-analysis-best="${index}" data-best-name="${safe(item.name)}" data-best-teacher="${safe(item.teacher)}" data-best-value="${item.value.toFixed(2)}%" data-best-records="${item.records}" aria-pressed="${index === 0}"><span>${medals[index].icon}</span><div><strong>${safe(item.name)}</strong><small>${safe(item.teacher)}</small></div><b>${item.value.toFixed(2)}%</b><em>${item.records} rekod</em></button>`).join("") : '<p class="monitoring-empty">Belum ada data kelas bagi tempoh ini.</p>';
  $("#analysisBestInsight").innerHTML = winners.length ? `<strong>${safe(winners[0].name)}</strong> mendahului dengan <b>${winners[0].value.toFixed(2)}%</b> daripada ${winners[0].records} rekod.` : "Pilih tempoh lain untuk melihat pencapaian kelas.";
  const width = 1000, height = 290, left = 58, right = 24, top = 24, bottom = 48;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const groupWidth = plotWidth / Math.max(days.length, 1);
  const x = (index) => left + (index + 0.5) * groupWidth;
  const finiteValues = days.flatMap((day) => [day.all, day.morning, day.afternoon]).filter(Number.isFinite);
  const axisMin = finiteValues.length ? Math.max(0, Math.floor((Math.min(...finiteValues) - 5) / 10) * 10) : 0;
  const axisRange = Math.max(10, 100 - axisMin);
  const y = (value) => top + ((100 - Math.max(axisMin, Math.min(100, value))) / axisRange) * plotHeight;
  const colors = { all: "#0755b5", morning: "#08a06c", afternoon: "#f28b23" };
  const gridValues = Array.from({ length: 5 }, (_, index) => axisMin + (axisRange * index / 4));
  const grids = gridValues.map((value) => `<line class="chart-grid" x1="${left}" y1="${y(value)}" x2="${width-right}" y2="${y(value)}"/><text class="chart-axis-text" x="${left-10}" y="${y(value)+4}" text-anchor="end">${Math.round(value)}%</text>`).join("");
  const labelEvery = days.length > 10 ? 5 : 1;
  const xLabels = days.map((day, index) => (index % labelEvery === 0 || index === days.length - 1) ? `<text class="chart-axis-text" x="${x(index)}" y="${height-16}" text-anchor="middle">${safe(formatDisplayDate(day.date))}</text>` : "").join("");
  const sessions = ["all", "morning", "afternoon"];
  const lines = sessions.map((session) => {
    const points = days.map((day, index) => Number.isFinite(day[session]) ? { index, value: day[session], date: day.date } : null).filter(Boolean);
    if (!points.length) return "";
    const path = points.map((point, index) => `${index ? "L" : "M"}${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
    const dots = points.map((point) => `<circle class="chart-line-dot" cx="${x(point.index)}" cy="${y(point.value)}" r="4.5" fill="${colors[session]}"><title>${labels[session]} • ${safe(formatDisplayDate(point.date))}: ${point.value.toFixed(2)}%</title></circle>`).join("");
    const labelOffsetX = { all: 0, morning: -20, afternoon: 20 }[session];
    const labelOffsetY = { all: -11, morning: 17, afternoon: 17 }[session];
    const valueLabels = points.map((point) => (days.length <= 10 || point.index % labelEvery === 0 || point.index === days.length - 1) ? `<text class="chart-value-label ${session}" x="${x(point.index) + labelOffsetX}" y="${y(point.value) + labelOffsetY}" text-anchor="middle" fill="${colors[session]}">${point.value.toFixed(1)}%</text>` : "").join("");
    return `<path class="chart-line" d="${path}" stroke="${colors[session]}"/>${dots}${valueLabels}`;
  }).join("");
  $("#attendanceChart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Graf garis peratus kehadiran ${safe($("#analysisRangeLabel").textContent)}">${grids}${xLabels}${lines}</svg>`;
  $("#analysisTableBody").innerHTML = days.map((day) => `<tr><td>${safe(formatDisplayDate(day.date))}</td><td>${analysisPercent(day.all)}</td><td>${analysisPercent(day.morning)}</td><td>${analysisPercent(day.afternoon)}</td><td>${day.recordCount}</td></tr>`).join("");
  const totalRecords = schoolDayRecords.length;
  $("#analysisStatus").className = "analysis-status";
  $("#analysisStatus").textContent = totalRecords ? `${totalRecords} rekod kelas ditemui. Analisis ini tidak mengubah data asal.` : "Belum ada rekod kehadiran tersimpan dalam tempoh ini.";
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat("ms-MY", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, month, 1))));

async function setupKpiFilters() {
  if (state.analytics.filtersReady) return;
  if (state.analytics.filterPromise) return state.analytics.filterPromise;
  state.analytics.filterPromise = (async () => {
    const currentYear = Number((state.date || localDateValue()).slice(0, 4));
    const currentMonth = (state.date || localDateValue()).slice(5, 7);
    $("#kpiMonth").innerHTML = MONTH_NAMES.map((label, month) => {
      const value = String(month + 1).padStart(2, "0");
      return `<option value="${value}"${value === currentMonth ? " selected" : ""}>${safe(label)}</option>`;
    }).join("");
    let years = [];
    try {
      const response = await fetch(`${API_URL}?mode=analytics-years`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Senarai tahun tidak dapat dibuka.");
      years = (Array.isArray(data.years) ? data.years : []).map(Number).filter((year) => year >= 2000 && year <= 2100);
    } catch (error) { console.error(error); }
    if (!years.length) years = [currentYear];
    const selectedYear = years.includes(currentYear) ? currentYear : years[0];
    $("#kpiYear").innerHTML = years.map((year) => `<option value="${year}"${year === selectedYear ? " selected" : ""}>${year}</option>`).join("");
    state.analytics.filtersReady = true;
  })();
  try { await state.analytics.filterPromise; }
  finally { state.analytics.filterPromise = null; }
}

function monthlyClassRanking(records) {
  const totals = new Map();
  for (const row of records) {
    const key = String(row.id || row.classId || "");
    if (!/^tahun-[1-6]-/.test(key)) continue;
    const enrol = count(row.enrolMale, 300) + count(row.enrolFemale, 300);
    if (!enrol) continue;
    const absent = Math.min(count(row.absentMale, 300) + count(row.absentFemale, 300), enrol);
    const rosterClass = state.classes.find((item) => String(item.id) === key);
    const item = totals.get(key) || { id: key, name: row.name || row.className || rosterClass?.name || key, enrol: 0, present: 0, year: Number(key.match(/^tahun-(\d)/)?.[1] || 0) };
    item.enrol += enrol; item.present += enrol - absent; totals.set(key, item);
  }
  return [...totals.values()].map((item) => ({ ...item, value: item.enrol ? item.present / item.enrol * 100 : null }));
}

function renderMonthlyKpi(records, monthValue) {
  const classes = state.classes.filter((item) => /^tahun-[1-6]-/.test(String(item.id)));
  const totals = new Map(); let schoolEnrol = 0; let schoolPresent = 0;
  for (const row of records) {
    const enrol = count(row.enrolMale, 300) + count(row.enrolFemale, 300);
    if (!enrol) continue;
    const present = enrol - Math.min(count(row.absentMale, 300) + count(row.absentFemale, 300), enrol);
    schoolEnrol += enrol; schoolPresent += present;
    if (!/^tahun-[1-6]-/.test(String(row.id))) continue;
    const item = totals.get(String(row.id)) || { enrol: 0, present: 0 };
    item.enrol += enrol; item.present += present; totals.set(String(row.id), item);
  }
  const results = classes.map((item) => { const total = totals.get(String(item.id)); return { ...item, value: total?.enrol ? total.present / total.enrol * 100 : null, year: Number(String(item.id).match(/^tahun-(\d)/)?.[1] || 0) }; });
  const achieved = results.filter((item) => item.value !== null && item.value >= KPI_TARGET).sort((a, b) => b.value - a.value);
  const below = results.filter((item) => item.value !== null && item.value < KPI_TARGET).sort((a, b) => a.value - b.value);
  const noData = results.filter((item) => item.value === null);
  const label = new Intl.DateTimeFormat("ms-MY", { month: "long", year: "numeric" }).format(new Date(`${monthValue}-01T00:00:00Z`)).toUpperCase();
  const schoolValue = schoolEnrol ? schoolPresent / schoolEnrol * 100 : null;
  $("#kpiSummary").innerHTML = `<h4>${safe(label)}</h4><div><span>Purata Kehadiran Sekolah<strong>${schoolValue === null ? "Tiada Data" : `${schoolValue.toFixed(2)}%`}</strong></span><span>KPI Sekolah<strong>${KPI_TARGET}%</strong></span><span>Kelas Mencapai KPI<strong>${achieved.length} / ${results.length}</strong></span><span>Kelas Belum Mencapai KPI<strong>${below.length} / ${results.length}</strong></span></div><p class="${schoolValue !== null && schoolValue >= KPI_TARGET ? "kpi-pass" : "kpi-alert"}">${schoolValue === null ? "Tiada data kehadiran bagi bulan ini" : schoolValue >= KPI_TARGET ? "✅ KPI Kehadiran Sekolah Tercapai" : "⚠️ KPI Kehadiran Sekolah Belum Tercapai"}</p>`;
  const rows = (items) => items.length ? items.map((item) => `<div><strong>${safe(item.name)}</strong><span>Tahun ${item.year}</span><b>${item.value.toFixed(2)}%</b></div>`).join("") : '<p class="monitoring-empty">Tiada kelas dalam kategori ini.</p>';
  $("#kpiAchieved").innerHTML = rows(achieved); $("#kpiBelow").innerHTML = rows(below);
  $("#kpiClusters").innerHTML = Array.from({ length: 6 }, (_, index) => { const year = index + 1; const items = results.filter((item) => item.year === year); return `<section><h4>Tahun ${year}</h4>${items.map((item) => `<div><span>${safe(item.name)}</span><strong>${item.value === null ? "Tiada Data" : `${item.value.toFixed(2)}% ${item.value >= KPI_TARGET ? "✅" : "⚠️"}`}</strong></div>`).join("")}</section>`; }).join("") + (noData.length ? `<p class="analysis-note">${noData.length} kelas belum mempunyai data bagi bulan ini dan tidak dikategorikan.</p>` : "");
}

async function loadKpiAnalytics() {
  await setupKpiFilters();
  const year = $("#kpiYear").value || state.date.slice(0, 4);
  const monthNumber = $("#kpiMonth").value || state.date.slice(5, 7);
  const month = `${year}-${monthNumber}`;
  const from = `${month}-01`; const anchor = dateObject(from); const to = dateValue(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)));
  try {
    const response = await fetch(`${API_URL}?mode=analytics&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "KPI tidak dapat dibuka.");
    renderMonthlyKpi(Array.isArray(data.records) ? data.records : [], month);
  } catch (error) { $("#kpiSummary").innerHTML = `<p class="analysis-status error">${safe(error.message || "KPI tidak dapat dibuka.")}</p>`; }
}

function annualMonthWinner(records) {
  const ranked = monthlyClassRanking(records).filter((item) => item.value !== null);
  if (!ranked.length) return [];
  const highest = Math.max(...ranked.map((item) => Number(item.value.toFixed(2))));
  return ranked.filter((item) => Number(item.value.toFixed(2)) === highest).sort((a, b) => a.name.localeCompare(b.name, "ms"));
}

function renderAnnualWinners(year, months) {
  $("#annualWinnersYear").textContent = String(year);
  const monthsWithData = months.filter((item) => item.winners.length).length;
  $("#annualWinnersStatus").className = "analysis-status";
  $("#annualWinnersStatus").textContent = monthsWithData ? `${monthsWithData} daripada 12 bulan mempunyai data kehadiran bagi ${year}.` : `Belum ada data kehadiran kelas bagi ${year}.`;
  $("#annualWinnersGrid").innerHTML = months.map((item) => {
    const winners = item.winners.length ? item.winners.map((winner) => `<div class="annual-winner"><strong>🥇 ${safe(winner.name)}</strong><span>Tahun ${winner.year}</span><b>Purata Kehadiran: ${winner.value.toFixed(2)}%</b></div>`).join("") : '<p class="annual-no-data">Belum Ada Data</p>';
    const shared = item.winners.length > 1 ? '<span class="annual-shared-badge">Emas Bersama</span>' : "";
    return `<button class="annual-month-card${item.winners.length ? " has-data" : ""}" type="button" data-annual-month="${item.month}" aria-label="Buka analisis ${safe(item.label)} ${year}"><span class="annual-month-name">${safe(item.label)}</span>${shared}${winners}<small>Klik untuk lihat analisis bulanan</small></button>`;
  }).join("");
}

async function loadAnnualWinners(force = false) {
  await setupKpiFilters();
  const year = $("#kpiYear").value || state.date.slice(0, 4);
  if (!force && state.analytics.annualCache.has(year)) { renderAnnualWinners(year, state.analytics.annualCache.get(year)); return; }
  if (state.analytics.annualLoadingYear === year) return;
  state.analytics.annualLoadingYear = year;
  $("#annualWinnersYear").textContent = year;
  $("#annualWinnersStatus").className = "analysis-status";
  $("#annualWinnersStatus").textContent = `Mengira pemenang Januari hingga Disember ${year}…`;
  try {
    const responses = await Promise.all(Array.from({ length: 12 }, async (_, monthIndex) => {
      const month = String(monthIndex + 1).padStart(2, "0");
      const from = `${year}-${month}-01`;
      const to = dateValue(new Date(Date.UTC(Number(year), monthIndex + 1, 0)));
      const response = await fetch(`${API_URL}?mode=analytics&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `${MONTH_NAMES[monthIndex]} tidak dapat dianalisis.`);
      return { month, label: MONTH_NAMES[monthIndex], winners: annualMonthWinner(Array.isArray(data.records) ? data.records : []) };
    }));
    state.analytics.annualCache.set(year, responses);
    renderAnnualWinners(year, responses);
  } catch (error) {
    console.error(error);
    $("#annualWinnersStatus").className = "analysis-status error";
    $("#annualWinnersStatus").textContent = error.message || "Pencapaian tahunan tidak dapat dibuka.";
  } finally { if (state.analytics.annualLoadingYear === year) state.analytics.annualLoadingYear = ""; }
}

async function loadKpiDashboard() {
  if (!state.classes.length) return;
  await setupKpiFilters();
  await Promise.all([loadKpiAnalytics(), loadAnnualWinners()]);
}

async function fetchSchoolDate(date) {
  const response = await fetch(`${API_URL}?date=${encodeURIComponent(date)}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Rekod tidak dapat dibuka.");
  return data;
}

async function fetchSafetyDate(date) {
  const response = await fetch(`${SAFETY_API_URL}?date=${encodeURIComponent(date)}`, { cache: "no-store" });
  const data = await responseJson(response, "Laporan pemantauan tidak dapat dibuka.");
  if (!response.ok) throw new Error(data.error || "Laporan pemantauan tidak dapat dibuka.");
  return Array.isArray(data.reports) ? data.reports : [];
}

async function fetchSafetyWeek(dates) {
  const results = await Promise.allSettled(dates.map(fetchSafetyDate));
  return {
    reports: results.map((result) => result.status === "fulfilled" ? result.value : []),
    failed: results.filter((result) => result.status === "rejected").length,
  };
}

function reportAuditMap(data) {
  return new Map((Array.isArray(data.audit) ? data.audit : []).map((item) => [auditKey(item.section, item.recordId, item.fieldName), item]));
}

function reportClassCompleted(data, classId) {
  const audits = reportAuditMap(data);
  const row = withLatestClassProfiles(data.classes).find((item) => String(item.id) === String(classId));
  return attendanceConfirmed(classId, audits, row);
}

function filterReportClasses(data, session) {
  const classes = withLatestClassProfiles(data.classes);
  return session === "all" ? classes : classes.filter((row) => classSession(row) === session);
}

function schoolWeekDates(anchorValue) {
  const anchor = dateObject(anchorValue);
  const monday = addDays(anchor, -((anchor.getUTCDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, index) => dateValue(addDays(monday, index)));
}

function dutyNamesFromReport(data, session) {
  const names = [];
  for (const item of Array.isArray(data?.dutyTeachers) ? data.dutyTeachers : []) {
    if (item.session !== session) continue;
    names[Math.max(0, Number(item.rowOrder || 1) - 1)] = String(item.teacherName || "").trim();
  }
  return names.slice(0, 5);
}

function weeklyDutyMetaFields(session) {
  const suffix = session === "afternoon" ? "Afternoon" : "Morning";
  return { note: `note${suffix}`, preparedBy: `preparedBy${suffix}`, approvedBy: `approvedBy${suffix}`, approvedTitle: `approvedTitle${suffix}` };
}

function weeklyDutyEntries(reports, dates, session) {
  const field = weeklyDutyMetaFields(session).note;
  return reports.map((report, index) => ({ date: dates[index], note: String(report?.meta?.[field] || "").trim() }))
    .filter((item) => item.note);
}

function weeklyDutyNoteActions(entries) {
  const warning = /perlu\s+tindakan|belum\s+selesai|rosak|kotor|bahaya|tidak\s+selamat|masalah|aduan|lewat|gangguan/i;
  return entries.flatMap((entry) => entry.note.split(/\n+|(?<=[.!?])\s+/)
    .map((item) => item.trim()).filter((item) => item && warning.test(item))
    .map((item) => ({ source: "Catatan guru bertugas", date: entry.date, location: "Catatan mingguan", issue: item, action: "Semak catatan guru bertugas", updatedBy: "" })));
}

function weeklyMonitoringData(safetyReports, dates, session) {
  const all = safetyReports.flatMap((reports, index) => reports.map((report) => ({ ...report, reportDate: report.reportDate || dates[index] })))
    .filter((report) => !isRmtReport(report) && !isRmtScheduleReport(report) && !isWeeklyDutyReport(report) && report.category !== "opr")
    .filter((report) => !report.session || report.session === session);
  const actions = all.filter((report) => report.routeStatus === "attention").map((report) => ({
    source: "Laporan Pemantauan Sekolah", date: report.reportDate, location: report.location || "Kawasan tidak dinyatakan",
    issue: cleanMonitoringText(report.issue) || "Kawasan ditandakan perlu tindakan", action: report.action || "Tindakan susulan belum dinyatakan",
    updatedBy: report.updatedBy || "",
  }));
  return { reports: all, actions };
}

function weeklyAttendanceData(reports, dates, session) {
  const records = reports.flatMap((report, dayIndex) => filterReportClasses(report, session)
    .filter((row) => reportClassCompleted(report, row.id))
    .map((row) => ({ ...classFigures(row), date: dates[dayIndex], name: row.name })));
  const totals = records.reduce((sum, row) => ({ enrol: sum.enrol + row.enrolTotal, present: sum.present + row.presentTotal }), { enrol: 0, present: 0 });
  const rate = totals.enrol ? (totals.present / totals.enrol) * 100 : null;
  const actions = rate !== null && rate < KPI_TARGET ? [{
    source: "Analisis Kehadiran Murid", date: dates[dates.length - 1], location: SESSION_LABELS[session],
    issue: `Purata kehadiran terkumpul ${rate.toFixed(2)}%, di bawah KPI sekolah ${KPI_TARGET}%.`,
    action: "Pantau ketidakhadiran murid dan laksanakan intervensi kelas berkaitan", updatedBy: "Analisis sistem",
  }] : [];
  return { records, ...totals, rate, days: new Set(records.map((row) => row.date)).size, actions };
}

function reportStaffAbsences(report, session) {
  const source = report?.staffAbsences;
  if (Array.isArray(source)) return source.filter((row) => (row.session === "afternoon" ? "afternoon" : "morning") === session);
  return Array.isArray(source?.[session]) ? source[session] : [];
}

function weeklyPresenceMetric(total, absent, days) {
  const possible = total * days;
  const present = Math.max(0, possible - absent);
  return { total, absent, present, days, averagePresent: days ? present / days : 0, rate: possible ? (present / possible) * 100 : null };
}

function weeklyStaffData(reports, dates) {
  const absenceCounts = { morning: 0, afternoon: 0, akp: 0 };
  for (const report of reports) for (const session of ["morning", "afternoon"]) {
    for (const row of reportStaffAbsences(report, session).filter(staffAbsenceRowHasValue)) {
      const name = String(row.staffName || "").trim().toUpperCase();
      if (AKP_STAFF_NAMES.has(name)) absenceCounts.akp += 1;
      else absenceCounts[session] += 1;
    }
  }
  const days = dates.length;
  const teachers = count(state.schoolStats.teachers, 500);
  const akp = count(state.schoolStats.akp, 100);
  const morning = weeklyPresenceMetric(teachers, absenceCounts.morning, days);
  const afternoon = weeklyPresenceMetric(teachers, absenceCounts.afternoon, days);
  const akpMetric = weeklyPresenceMetric(akp, absenceCounts.akp, days);
  return { morning, afternoon, akp: akpMetric, absent: absenceCounts.morning + absenceCounts.afternoon + absenceCounts.akp, days };
}

function weeklyRmtData(safetyReports, dates, session) {
  const reports = safetyReports.flatMap((items, index) => items.map((report) => ({ ...report, reportDate: report.reportDate || dates[index] })))
    .filter((report) => isRmtReport(report) && (!report.session || report.session === session));
  let recipients = 0, supplied = 0;
  const actions = [];
  for (const report of reports) {
    let details = null;
    try { details = String(report.issue || "").startsWith("[rmt-v2]") ? JSON.parse(String(report.issue).slice(8)) : null; } catch { details = null; }
    const recipientCount = count(details?.recipients);
    const suppliedCount = count(details?.supplied);
    recipients += recipientCount; supplied += suppliedCount;
    const rating = String(details?.rating || "");
    if ((recipientCount && suppliedCount < recipientCount) || /kurang|tidak memuaskan|bermasalah/i.test(rating)) actions.push({
      source: "Laporan Guru Bertugas RMT", date: report.reportDate, location: report.location || "RMT",
      issue: suppliedCount < recipientCount ? `${suppliedCount} hidangan dibekalkan untuk ${recipientCount} penerima.` : `Penilaian RMT: ${rating}.`,
      action: "Semak bekalan dan pelaksanaan RMT", updatedBy: report.updatedBy || "",
    });
  }
  return { reports, recipients, supplied, days: new Set(reports.map((report) => report.reportDate)).size, actions };
}

function generateWeeklyDutySummary(session, entries, dates, analysis, actionItems = []) {
  const label = SESSION_LABELS[session];
  const lastDate = dates[dates.length - 1];
  const range = dates.length === 1 ? formatDisplayDate(dates[0]) : `${formatDisplayDate(dates[0])} hingga ${formatDisplayDate(lastDate)}`;
  const allText = entries.map((item) => item.note).join(" ").toLowerCase();
  const findings = [];
  if (/disiplin/.test(allText) && /terkawal|baik|memuaskan/.test(allText)) findings.push("disiplin murid berada dalam keadaan terkawal");
  if (/kebersihan/.test(allText) && /memuaskan|baik|bersih/.test(allText)) findings.push("kebersihan sekolah berada pada tahap memuaskan");
  if (/pdp|pengajaran|pembelajaran/.test(allText) && /jadual|berjalan|dijalankan/.test(allText)) findings.push("PdP berjalan mengikut jadual");
  if (/rmt/.test(allText)) findings.push("pelaksanaan RMT turut direkodkan");
  if (/sukan|sukantara|latihan/.test(allText)) findings.push("aktiviti sukan dilaksanakan mengikut perancangan");
  const { attendance, staff, rmt, monitoring } = analysis;
  const paragraphs = [`Rumusan automatik ${label} bagi ${range} menghimpunkan semua rekod HEM SmartTrack yang tersedia setakat ${formatDisplayDate(lastDate)}.`];
  if (attendance.rate !== null) paragraphs.push(`Kehadiran murid: ${attendance.present}/${attendance.enrol} kehadiran harian terkumpul daripada ${attendance.records.length} rekod kelas (${attendance.rate.toFixed(2)}%), ${attendance.rate >= KPI_TARGET ? "mencapai" : "belum mencapai"} KPI sekolah ${KPI_TARGET}%.`);
  else paragraphs.push("Kehadiran murid: belum ada rekod kelas lengkap untuk dianalisis dalam tempoh ini.");
  const sessionStaff = staff[session];
  if (sessionStaff.rate !== null) paragraphs.push(`Keberadaan guru ${label}: purata mingguan ${sessionStaff.rate.toFixed(2)}%, dengan ${sessionStaff.absent} rekod tidak berada. Keberadaan AKP: purata mingguan ${staff.akp.rate === null ? "—" : `${staff.akp.rate.toFixed(2)}%`}, dengan ${staff.akp.absent} rekod tidak berada.`);
  paragraphs.push(rmt.reports.length ? `RMT: ${rmt.reports.length} laporan bagi ${rmt.days} hari merekodkan ${rmt.supplied} hidangan untuk ${rmt.recipients} penerima.` : "RMT: belum ada laporan bagi sidang ini dalam tempoh semasa.");
  paragraphs.push(`Pemantauan sekolah: ${monitoring.reports.length} rekod diterima; ${monitoring.actions.length} memerlukan perhatian.`);
  if (findings.length) paragraphs.push(`Catatan guru bertugas menunjukkan ${findings.join(", ")}.`);
  const actionCount = actionItems.length;
  const locations = [...new Set(actionItems.map((item) => item.location).filter(Boolean))].slice(0, 4);
  paragraphs.push(actionCount ? `Tindakan susulan: ${actionCount} perkara dikenal pasti${locations.length ? ` melibatkan ${locations.join(", ")}` : ""}.` : "Tindakan susulan: tiada perkara perlu tindakan dikenal pasti setakat ini.");
  return paragraphs.join("\n\n");
}

function parseWeeklyDutyStoredReport(report) {
  const text = String(report?.issue || "");
  if (!text.startsWith("[weekly-duty-v1]")) return null;
  try { return { ...JSON.parse(text.slice(16)), createdAt: report.createdAt || "" }; }
  catch { return null; }
}

async function fetchStoredWeeklyDutyReports(anchor) {
  const response = await fetch(`${SAFETY_API_URL}?date=${encodeURIComponent(anchor)}`, { cache: "no-store" });
  const data = await responseJson(response, "Laporan mingguan tidak dapat dibuka.");
  if (!response.ok) throw new Error(data.error || "Laporan mingguan tidak dapat dibuka.");
  const stored = { morning: null, afternoon: null };
  for (const raw of Array.isArray(data.reports) ? data.reports : []) {
    const parsed = parseWeeklyDutyStoredReport(raw);
    if (!parsed || !["morning", "afternoon"].includes(parsed.session)) continue;
    if (!stored[parsed.session] || new Date(parsed.createdAt || 0) > new Date(stored[parsed.session].createdAt || 0)) stored[parsed.session] = parsed;
  }
  return stored;
}

function buildWeeklyDutyReport(reports, dates, session, stored = null, safetyWeek = { reports: [], failed: 0 }) {
  const fields = weeklyDutyMetaFields(session);
  const anchorMeta = reports[0]?.meta || {};
  const entries = weeklyDutyEntries(reports, dates, session);
  const monitoring = weeklyMonitoringData(safetyWeek.reports, dates, session);
  const attendance = weeklyAttendanceData(reports, dates, session);
  const staff = weeklyStaffData(reports, dates);
  const rmt = weeklyRmtData(safetyWeek.reports, dates, session);
  const actionItems = [...monitoring.actions, ...rmt.actions, ...attendance.actions, ...weeklyDutyNoteActions(entries)];
  const analysis = { attendance, staff, rmt, monitoring };
  const generated = generateWeeklyDutySummary(session, entries, dates, analysis, actionItems);
  const sourceFingerprint = JSON.stringify({
    entries, attendance: { enrol: attendance.enrol, present: attendance.present, records: attendance.records.length },
    staff: { morning: staff.morning.absent, afternoon: staff.afternoon.absent, akp: staff.akp.absent, days: staff.days }, rmt: { reports: rmt.reports.length, recipients: rmt.recipients, supplied: rmt.supplied },
    monitoring: monitoring.reports.length,
    actionItems: actionItems.map(({ date, location, issue, action }) => ({ date, location, issue, action })),
  });
  const storedMatchesSources = Boolean(stored?.summary) && stored?.sourceFingerprint === sourceFingerprint;
  const latestValue = (field) => reports.map((report) => String(report?.meta?.[field] || "").trim()).filter(Boolean).pop() || "";
  const approvedBy = String(stored?.approvedBy || "").trim() || String(anchorMeta[fields.approvedBy] || "").trim() || latestValue(fields.approvedBy);
  const storedApprovedTitle = String(stored?.approvedTitle || "").trim() || String(anchorMeta[fields.approvedTitle] || "").trim() || latestValue(fields.approvedTitle);
  return {
    summary: storedMatchesSources ? String(stored.summary).trim() : generated, generated, sourceFingerprint,
    saved: storedMatchesSources, editing: false, entries, actionItems, analysis,
    sourceCounts: { attendance: attendance.records.length, staffAbsences: staff.absent, rmt: rmt.reports.length, monitoring: monitoring.reports.length, dutyNotes: entries.length, unavailableDays: safetyWeek.failed },
    preparedBy: String(stored?.preparedBy || "").trim() || String(anchorMeta[fields.preparedBy] || "").trim() || latestValue(fields.preparedBy),
    approvedBy,
    approvedTitle: administratorTitle(approvedBy, storedApprovedTitle),
  };
}

function renderWeeklyDutyReport() {
  const session = state.dutyWeek.session || "morning";
  const report = state.dutyWeek.summaries[session];
  if (!report) return;
  if (!report.preparedBy && editorName()) report.preparedBy = editorName();
  report.approvedTitle = administratorTitle(report.approvedBy, report.approvedTitle);
  const names = (state.dutyTeachers[session] || []).filter(Boolean);
  $("#dutyRosterTitle").textContent = SESSION_LABELS[session];
  $("#dutyRosterCount").textContent = `${names.length} orang`;
  $("#weeklyReportState").textContent = report.saved ? "✓ Laporan disahkan" : "Draf automatik";
  $("#weeklyReportState").classList.toggle("saved", report.saved);
  $("#weeklyAttendanceRate").textContent = report.analysis.attendance.rate === null ? "—" : `${report.analysis.attendance.rate.toFixed(2)}%`;
  $("#weeklyTeacherMorningRate").textContent = report.analysis.staff.morning.rate === null ? "—" : `${report.analysis.staff.morning.rate.toFixed(2)}%`;
  $("#weeklyTeacherAfternoonRate").textContent = report.analysis.staff.afternoon.rate === null ? "—" : `${report.analysis.staff.afternoon.rate.toFixed(2)}%`;
  $("#weeklyAkpPresenceRate").textContent = report.analysis.staff.akp.rate === null ? "—" : `${report.analysis.staff.akp.rate.toFixed(2)}%`;
  $("#weeklyRmtCount").textContent = String(report.analysis.rmt.reports.length);
  $("#weeklyReportActionCount").textContent = String(report.actionItems.length);
  const actionSource = $("#weeklyReportActionSources");
  actionSource.hidden = !report.actionItems.length;
  actionSource.innerHTML = report.actionItems.length ? `<summary>Lihat sumber ${report.actionItems.length} perkara minggu ini</summary><div>${report.actionItems.map((item) => `<article><div><strong>${safe(item.location)}</strong><span>${safe(formatDisplayDate(item.date))} • ${safe(item.source)}</span></div><p>${safe(item.issue)}</p><small><b>Tindakan:</b> ${safe(item.action)}${item.updatedBy ? ` • Diisi oleh ${safe(item.updatedBy)}` : ""}</small></article>`).join("")}</div>` : "";
  $("#weeklyReportSummary").value = report.summary;
  $("#weeklyReportSummary").readOnly = !report.editing;
  $("#weeklyReportSummary").setAttribute("aria-readonly", String(!report.editing));
  $("#weeklyReportPreparedBy").value = report.preparedBy || "";
  $("#weeklyReportApprovedBy").value = report.approvedBy || "";
  $("#weeklyReportApprovedTitle").value = report.approvedTitle || "";
  $("#weeklyReportSources").textContent = `Dijana daripada ${report.sourceCounts.attendance} rekod kelas • ${report.sourceCounts.staffAbsences} rekod tidak berada • ${report.sourceCounts.rmt} laporan RMT • ${report.sourceCounts.monitoring} rekod pemantauan • ${report.sourceCounts.dutyNotes} catatan guru bertugas. Tempoh analisis: ${formatDisplayDate(state.dutyWeek.anchor)} hingga ${formatDisplayDate(state.dutyWeek.end)}.${report.sourceCounts.unavailableDays ? ` ${report.sourceCounts.unavailableDays} hari belum dapat disemak; cuba jana semula.` : ""}`;
  $("#weeklyReportEdit").textContent = report.editing ? "✓ Selesai edit" : "✎ Edit rumusan";
  $("#weeklyReportSave").textContent = report.saved ? "✓ Simpan versi baharu" : "✓ Sahkan laporan minggu";
}

function setDailyDutySession(session = "morning") {
  state.dutyWeek.session = session;
  document.querySelectorAll("[data-daily-duty-tab]").forEach((button) => {
    const active = button.dataset.dailyDutyTab === session;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-daily-duty-panel]").forEach((panel) => { panel.hidden = panel.dataset.dailyDutyPanel !== session; });
  renderWeeklyDutyReport();
}

async function loadDutyWeekTemplate(currentData = null, force = false) {
  const weekDates = schoolWeekDates(state.date);
  const dates = weekDates.filter((date) => date <= state.date);
  if (!dates.length) dates.push(weekDates[0]);
  const weekKey = dates.join(":");
  if (state.dutyWeek.loading) return;
  if (!force && state.dutyWeek.loadedKey === weekKey && Date.now() - state.dutyWeek.loadedAt < 60000) return;
  state.dutyWeek.loading = true;
  if ($("#dutyWeekState")) $("#dutyWeekState").textContent = "Memuatkan…";
  try {
    const [reports, storedReports, safetyWeek] = await Promise.all([
      Promise.all(dates.map(fetchSchoolDate)),
      fetchStoredWeeklyDutyReports(dates[0]),
      fetchSafetyWeek(dates),
    ]);
    const sourceIndexes = {
      morning: reports.findIndex((report) => dutyNamesFromReport(report, "morning").some(Boolean)),
      afternoon: reports.findIndex((report) => dutyNamesFromReport(report, "afternoon").some(Boolean)),
    };
    const hasWeeklyNames = Object.values(sourceIndexes).some((index) => index >= 0);
    const firstSourceIndex = Object.values(sourceIndexes).filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? -1;
    state.dutyTeachers = {
      morning: sourceIndexes.morning >= 0 ? dutyNamesFromReport(reports[sourceIndexes.morning], "morning") : [],
      afternoon: sourceIndexes.afternoon >= 0 ? dutyNamesFromReport(reports[sourceIndexes.afternoon], "afternoon") : [],
    };
    state.dutyWeek = {
      ...state.dutyWeek,
      anchor: dates[0], end: dates[dates.length - 1], sourceDate: firstSourceIndex >= 0 ? dates[firstSourceIndex] : "",
      editing: !hasWeeklyNames, locked: hasWeeklyNames, loading: false, loadedKey: weekKey, loadedAt: Date.now(), dates, reports,
      summaries: { morning: buildWeeklyDutyReport(reports, dates, "morning", storedReports.morning, safetyWeek), afternoon: buildWeeklyDutyReport(reports, dates, "afternoon", storedReports.afternoon, safetyWeek) },
    };
    renderDutyTeachers();
    setDailyDutySession(state.dutyWeek.session || "morning");
  } catch (error) {
    console.error(error);
    state.dutyWeek.loading = false;
    if ($("#dutyWeekState")) $("#dutyWeekState").textContent = "Senarai minggu belum dapat dimuatkan";
  }
}

async function saveDutyWeekTemplate() {
  if (!editorName()) { updateEditingAccess(); setStatus("Pilih nama pengisi dahulu.", "error"); return; }
  const selectedCount = ["morning", "afternoon"].flatMap((session) => state.dutyTeachers[session] || []).filter(Boolean).length;
  if (!selectedCount) { setStatus("Pilih sekurang-kurangnya seorang guru bertugas.", "error"); return; }
  const button = $("#dutyWeekSave");
  button.disabled = true;
  $("#dutyWeekState").textContent = "Menyimpan senarai minggu…";
  try {
    const dutyTeacherUpdates = ["morning", "afternoon"].map((session) => ({ session, teachers: Array.from({ length: 5 }, (_, index) => state.dutyTeachers[session]?.[index] || "") }));
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: state.dutyWeek.anchor, attendanceUpdates: [], dutyTeacherUpdates, updatedBy: editorName() }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Senarai mingguan gagal disimpan.");
    state.dutyWeek.editing = false;
    state.dutyWeek.locked = true;
    state.dutyWeek.sourceDate = state.dutyWeek.anchor;
    state.dutyWeek.loadedAt = Date.now();
    renderDutyTeachers();
    setDailyDutySession(state.dutyWeek.session || "morning");
    setStatus("Senarai guru bertugas minggu ini telah disimpan dan dikunci.", "saved");
  } catch (error) {
    console.error(error);
    $("#dutyWeekState").textContent = error.message || "Senarai mingguan gagal disimpan.";
    setStatus("Senarai mingguan belum tersimpan.", "error");
  } finally { button.disabled = false; }
}

async function saveWeeklyDutyReport() {
  if (!editorName()) { updateEditingAccess(); setStatus("Pilih nama pengisi dahulu.", "error"); return; }
  const session = state.dutyWeek.session || "morning";
  const report = state.dutyWeek.summaries[session];
  if (!report) return;
  const summary = $("#weeklyReportSummary").value.trim();
  const preparedBy = $("#weeklyReportPreparedBy").value.trim();
  if (!summary) { setStatus("Lengkapkan rumusan laporan minggu dahulu.", "error"); return; }
  if (!preparedBy) { setStatus("Pilih nama guru yang menyediakan laporan.", "error"); return; }
  const approvedBy = $("#weeklyReportApprovedBy").value.trim();
  const details = {
    session, anchor: state.dutyWeek.anchor, end: state.dutyWeek.end, summary,
    sourceFingerprint: report.sourceFingerprint,
    preparedBy, approvedBy, approvedTitle: administratorTitle(approvedBy, $("#weeklyReportApprovedTitle").value),
  };
  const payload = {
    date: state.dutyWeek.anchor, updatedBy: editorName(), category: "both", session,
    location: `Laporan Mingguan Guru Bertugas • ${formatDisplayDate(state.dutyWeek.anchor)} – ${formatDisplayDate(state.dutyWeek.end)}`,
    routeStatus: "not_applicable", parkingStatus: "not_applicable",
    issue: `[weekly-duty-v1]${JSON.stringify(details)}`, action: summary, photos: [],
  };
  const button = $("#weeklyReportSave");
  button.disabled = true;
  $("#weeklyReportState").textContent = "Menyimpan laporan…";
  try {
    const response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await responseJson(response, "Laporan mingguan gagal disimpan.");
    if (!response.ok) throw new Error(data.error || "Laporan mingguan gagal disimpan.");
    Object.assign(report, details, { saved: true, editing: false });
    renderWeeklyDutyReport();
    setStatus(`Laporan mingguan ${SESSION_LABELS[session]} telah disahkan dan disimpan.`, "saved");
  } catch (error) {
    console.error(error);
    $("#weeklyReportState").textContent = error.message || "Laporan mingguan gagal disimpan.";
    setStatus("Laporan mingguan belum tersimpan.", "error");
  } finally { button.disabled = false; }
}

async function loadWeeklyDuty() {
  if (state.weeklyDuty.loading) return;
  state.weeklyDuty.loading = true;
  $("#weeklyDutyRefresh").disabled = true;
  $("#weeklyDutyStatus").textContent = "Memuatkan senarai guru bertugas minggu ini…";
  try {
    const dates = schoolWeekDates($("#weeklyDutyDate").value || state.date);
    const reports = await Promise.all(dates.map(fetchSchoolDate));
    const weekdayFormatter = new Intl.DateTimeFormat("ms-MY", { weekday: "long", timeZone: "UTC" });
    const getNames = (data, session) => (Array.isArray(data.dutyTeachers) ? data.dutyTeachers : []).filter((item) => item.session === session).sort((a, b) => Number(a.rowOrder) - Number(b.rowOrder)).map((item) => String(item.teacherName || "").trim()).filter(Boolean);
    $("#weeklyDutyGrid").innerHTML = reports.map((data, index) => {
      const morning = getNames(data, "morning"), afternoon = getNames(data, "afternoon");
      const list = (names) => names.length ? `<ol>${names.map((name) => `<li>${safe(name)}</li>`).join("")}</ol>` : "<p>Belum diisi.</p>";
      return `<article class="weekly-duty-day"><div class="weekly-duty-date"><strong>${safe(formatDisplayDate(dates[index]))}</strong><small>${safe(weekdayFormatter.format(dateObject(dates[index])))}</small></div><div class="weekly-duty-session"><h4>Sidang Pagi</h4>${list(morning)}</div><div class="weekly-duty-session afternoon"><h4>Sidang Petang</h4>${list(afternoon)}</div></article>`;
    }).join("");
    $("#weeklyDutyStatus").textContent = `Senarai ${formatDisplayDate(dates[0])} hingga ${formatDisplayDate(dates[4])} berjaya dimuatkan.`;
  } catch (error) {
    $("#weeklyDutyStatus").textContent = error.message || "Senarai mingguan tidak dapat dibuka.";
    $("#weeklyDutyGrid").innerHTML = "";
  } finally { state.weeklyDuty.loading = false; $("#weeklyDutyRefresh").disabled = false; }
}

async function loadCompletionView() {
  if (state.completion.loading) return;
  state.completion.loading = true; $("#completionRefresh").disabled = true; $("#completionStatus").textContent = "Menyemak status kelas…";
  try {
    const date = $("#completionDate").value || state.date;
    const data = await fetchSchoolDate(date);
    const classes = filterReportClasses(data, $("#completionSession").value);
    const renderList = (complete) => {
      const items = classes.filter((row) => reportClassCompleted(data, row.id) === complete);
      return `<section class="completion-list ${complete ? "complete" : "incomplete"}"><h4>${complete ? "Kelas selesai" : "Kelas belum selesai"}<strong>${items.length}</strong></h4>${items.length ? `<div class="class-chip-list">${items.map((row) => `<span class="class-chip">${safe(row.name)}</span>`).join("")}</div>` : '<p class="class-list-empty">Tiada kelas dalam kategori ini.</p>'}</section>`;
    };
    $("#completionListsView").innerHTML = renderList(true) + renderList(false);
    $("#completionStatus").textContent = `${classes.length} kelas disemak bagi ${formatDisplayDate(date)}.`;
  } catch (error) { $("#completionStatus").textContent = error.message || "Status kelas tidak dapat dibuka."; $("#completionListsView").innerHTML = ""; }
  finally { state.completion.loading = false; $("#completionRefresh").disabled = false; }
}

async function loadCalendarRecord() {
  if (state.calendar.loading) return;
  state.calendar.loading = true; $("#calendarRefresh").disabled = true; $("#calendarStatus").textContent = "Membuka rekod tarikh pilihan…";
  try {
    const date = $("#calendarDate").value || state.date;
    const data = await fetchSchoolDate(date), audits = Array.isArray(data.audit) ? data.audit : [];
    const classes = withLatestClassProfiles(data.classes);
    $("#calendarTableBody").innerHTML = classes.map((row) => {
      const classAudits = audits.filter((item) => item.section === "attendance" && String(item.recordId) === String(row.id)).sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
      const latest = classAudits[0], completed = reportClassCompleted(data, row.id), figures = classFigures(row);
      const time = latest ? formatDisplayDateTime(latest.updatedAt) : "—";
      return `<tr><td><strong>${safe(row.name)}</strong></td><td>${safe(row.teacherName || "—")}</td><td>${percent(figures.presentTotal, figures.enrolTotal)}</td><td>${completed ? '<span class="class-status complete">Selesai</span>' : '<span class="class-status incomplete">Belum selesai</span>'}</td><td>${safe(latest?.updatedBy || "—")}</td><td>${safe(time)}</td></tr>`;
    }).join("");
    $("#calendarStatus").textContent = `${classes.length} kelas dipaparkan bagi ${formatDisplayDate(date)}. Halakan tetikus pada data kehadiran harian untuk butiran pengisi setiap medan.`;
  } catch (error) { $("#calendarStatus").textContent = error.message || "Rekod kalendar tidak dapat dibuka."; $("#calendarTableBody").innerHTML = ""; }
  finally { state.calendar.loading = false; $("#calendarRefresh").disabled = false; }
}

function isoWeekNumber(value) {
  const date = dateObject(value); const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function setupRmtTemplate() {
  const inputs = (target, count) => { $(target).innerHTML = Array.from({ length: count }, (_, index) => `<label><span>${index + 1}.</span><input class="rmt-name-input" type="text" list="staffNames" placeholder="Pilih nama guru"></label>`).join(""); };
  inputs("#rmtMorningNames", 4); inputs("#rmtAfternoonNames", 4);
  const entryDate = state.date;
  const dates = schoolWeekDates(entryDate);
  $("#rmtWeek").value = ""; $("#rmtFrom").value = entryDate; $("#rmtTo").value = dates[4];
  state.rmtMonth = state.date.slice(0, 7);
  $("#rmtCalendarMonth").value = state.rmtMonth;
  syncAllLocalizedDateInputs();
  updateRmtTotal();
}

async function changeRmtEntryDate() {
  const entryDate = $("#rmtFrom").value || state.date;
  const dates = schoolWeekDates(entryDate);
  $("#rmtTo").value = dates[4];
  syncAllLocalizedDateInputs();
  await loadRmtWeek();
}

function updateRmtTotal() {
  $("#rmtComputedTotal").textContent = count($("#rmtMorningCount").value) + count($("#rmtAfternoonCount").value);
}

function renderRmtImagePreview(files) {
  for (const url of state.rmtPreviewUrls) URL.revokeObjectURL(url);
  state.rmtPreviewUrls = [];
  const selected = Array.from(files || []);
  const status = $("#rmtPhotoStatus");
  const preview = $("#rmtImagePreview");
  if (selected.length > 4) {
    $("#rmtPhotos").value = "";
    preview.innerHTML = "";
    status.textContent = "Maksimum 4 gambar sahaja.";
    return;
  }
  if (!selected.length) {
    preview.innerHTML = "";
    status.textContent = "";
    return;
  }
  const invalid = selected.some((file) => !(file.type || "").startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name));
  if (invalid) {
    $("#rmtPhotos").value = "";
    preview.innerHTML = "";
    status.textContent = "Sila pilih fail gambar sahaja.";
    return;
  }
  state.rmtPreviewUrls = selected.map((file) => URL.createObjectURL(file));
  preview.innerHTML = state.rmtPreviewUrls.map((url, index) => `<figure><img src="${safe(url)}" alt="Gambar laporan RMT ${index + 1}"><figcaption>Gambar RMT ${index + 1}</figcaption></figure>`).join("");
  status.textContent = `${selected.length} gambar dipilih dan sedia untuk semakan.`;
}

function clearRmtPreview() {
  for (const url of state.rmtPreviewUrls) URL.revokeObjectURL(url);
  state.rmtPreviewUrls = [];
  $("#rmtPhotos").value = "";
  $("#rmtImagePreview").innerHTML = "";
}

function isRmtScheduleReport(report) {
  return String(report?.location || "").startsWith("RMT • Senarai Guru Mingguan");
}

function isRmtReport(report) {
  return String(report?.location || "").startsWith("RMT •") && !isRmtScheduleReport(report);
}

function isWeeklyDutyReport(report) {
  return String(report?.issue || "").startsWith("[weekly-duty-v1]");
}

function rmtMonthRange(month = state.rmtMonth || state.date.slice(0, 7)) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const year = Number(match?.[1] || state.date.slice(0, 4));
  const monthNumber = Number(match?.[2] || state.date.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const normalized = `${year}-${String(monthNumber).padStart(2, "0")}`;
  return { month: normalized, from: `${normalized}-01`, to: `${normalized}-${String(lastDay).padStart(2, "0")}`, year, monthNumber, lastDay };
}

function dutyStatusMonthRange(month = state.dutyStatus.month || state.date.slice(0, 7)) {
  return rmtMonthRange(month);
}

function dutyStatusMonitoringReports(reports = []) {
  return reports.filter((report) => !isRmtReport(report) && !isRmtScheduleReport(report) && !isWeeklyDutyReport(report) && report.category !== "opr");
}

function dutyStatusNotePresent(report) {
  const details = monitoringIssueDetails(report?.issue || "");
  return Boolean(details.note || Object.keys(details.aspects).length || String(report?.action || "").trim());
}

function dutyStatusSessionRecord(monitoring, session) {
  const items = monitoring.filter((report) => report.session === session);
  const photos = items.flatMap((report) => Array.isArray(report.photos) ? report.photos : []);
  const notes = items.filter(dutyStatusNotePresent);
  const complete = items.length > 0 && items.every((report) => (Array.isArray(report.photos) && report.photos.length > 0) && dutyStatusNotePresent(report));
  const attention = items.some((report) => report.routeStatus === "attention" || Object.values(monitoringIssueDetails(report.issue).aspects).includes("attention"));
  return { session, items, photos, notes, attention, status: complete ? "complete" : items.length ? "partial" : "missing" };
}

function dutyStatusDayRecord(date, school = {}, safetyReports = []) {
  const monitoring = dutyStatusMonitoringReports(safetyReports).map((report) => ({ ...report, reportDate: report.reportDate || date }));
  const sessions = { morning: dutyStatusSessionRecord(monitoring, "morning"), afternoon: dutyStatusSessionRecord(monitoring, "afternoon") };
  const staffRows = ["morning", "afternoon"].flatMap((session) => reportStaffAbsences(school, session).filter(staffAbsenceRowHasValue));
  const meta = school?.meta || {};
  const dutyNotes = [meta.noteMorning, meta.noteAfternoon].map((value) => String(value || "").trim()).filter(Boolean);
  const photos = monitoring.flatMap((report) => Array.isArray(report.photos) ? report.photos : []);
  const notes = monitoring.filter(dutyStatusNotePresent);
  const hasAny = monitoring.length > 0;
  const monitoringComplete = sessions.morning.status === "complete" && sessions.afternoon.status === "complete";
  const names = Array.from(new Set(monitoring.map((report) => String(report.updatedBy || "").trim()).filter(Boolean)));
  return { date, status: monitoringComplete ? "complete" : hasAny ? "partial" : "missing", monitoring, sessions, staffRows, dutyNotes, photos, notes, names };
}

function dutyStatusLabel(status) {
  return status === "complete" ? "Lengkap bergambar" : status === "partial" ? "Sudah diisi, perlu dilengkapkan" : status === "missing" ? "Belum diisi" : "Tiada pemantauan";
}

function renderDutyStatusDetail() {
  const target = $("#dutyStatusDetail");
  const date = state.dutyStatus.selectedDate;
  if (!date) { target.innerHTML = "<p>Pilih satu tarikh pada kalendar untuk melihat butiran pengisian.</p>"; return; }
  const record = state.dutyStatus.records.get(date);
  if (!record) { target.innerHTML = `<p>Tiada pemantauan diperlukan pada ${safe(formatDisplayDate(date))}.</p>`; return; }
  const nameText = record.names.length ? record.names.map(rmtTeacherShortName).join(", ") : "Belum dikenal pasti";
  const sessionCard = (session) => {
    const item = record.sessions?.[session] || dutyStatusSessionRecord(record.monitoring, session);
    const label = monitoringSessionLabel(session);
    const stateLabel = item.status === "complete" ? "Lengkap" : item.status === "partial" ? "Perlu dilengkapkan" : "Belum diisi";
    const alert = item.attention ? '<b class="duty-session-alert">! Perlu tindakan</b>' : "";
    return `<article class="duty-session-action-card ${item.status}"><header><div><small>${session === "morning" ? "🌅" : "🌇"} ${safe(label)}</small><strong>${safe(stateLabel)}</strong></div>${alert}</header><p>${item.items.length} kawasan • ${item.photos.length} gambar • ${item.notes.length} catatan</p><div><button type="button" data-duty-monitoring-action="view" data-duty-session="${session}"${item.items.length ? "" : " disabled"}>Lihat laporan</button><button class="primary" type="button" data-duty-monitoring-action="add" data-duty-session="${session}">＋ Tambah rekod</button></div></article>`;
  };
  target.innerHTML = `<div class="duty-status-detail-head"><div><span class="duty-status-pill ${record.status}">${safe(dutyStatusLabel(record.status))}</span><h3>${safe(formatDisplayDate(date))}</h3><p>Pengisi: <strong>${safe(nameText)}</strong></p></div><div class="duty-status-actions"><a href="#keberadaan-guru-akp" data-duty-open="staff">Keberadaan Guru &amp; AKP</a></div></div><div class="duty-session-action-grid">${sessionCard("morning")}${sessionCard("afternoon")}</div>`;
}

function renderDutyStatusCalendar() {
  const range = dutyStatusMonthRange();
  const today = localDateValue();
  const records = Array.from(state.dutyStatus.records.values());
  const recorded = records.filter((item) => item.status !== "missing").length;
  $("#dutyStatusRecorded").textContent = recorded;
  $("#dutyStatusComplete").textContent = records.filter((item) => item.status === "complete").length;
  $("#dutyStatusPartial").textContent = records.filter((item) => item.status === "partial").length;
  $("#dutyStatusMissing").textContent = records.filter((item) => item.status === "missing").length;
  const firstDayOffset = (new Date(Date.UTC(range.year, range.monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const cells = Array.from({ length: firstDayOffset }, () => '<span class="duty-status-spacer" aria-hidden="true"></span>');
  for (let day = 1; day <= range.lastDay; day++) {
    const date = `${range.month}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const inactive = weekday === 0 || weekday === 6 || date > today;
    const record = state.dutyStatus.records.get(date);
    const status = inactive ? "weekend" : record?.status || "missing";
    const selected = state.dutyStatus.selectedDate === date ? " selected" : "";
    const sessionMark = (session) => record?.sessions?.[session]?.status === "complete" ? "✓" : record?.sessions?.[session]?.status === "partial" ? "!" : "—";
    const sessionText = inactive ? "" : `P ${sessionMark("morning")} • PTG ${sessionMark("afternoon")}`;
    const note = inactive ? (date > today ? "Akan datang" : "Tiada tugas") : status === "complete" ? "✓ Lengkap" : status === "partial" ? "Perlu lengkap" : "Belum diisi";
    cells.push(`<button class="duty-status-day ${status}${selected}" type="button" data-duty-date="${date}"${inactive ? " disabled" : ""} aria-label="${safe(formatDisplayDate(date))}: ${safe(note)}${sessionText ? `, ${safe(sessionText)}` : ""}"><strong>${day}</strong><span>${safe(note)}</span>${sessionText ? `<small title="${safe(record?.names?.join(", ") || "Status sidang")}">${safe(sessionText)}</small>` : ""}</button>`);
  }
  $("#dutyStatusCalendar").innerHTML = cells.join("");
  $("#dutyStatusMessage").textContent = state.dutyStatus.loading ? "Memuatkan status pengisian…" : `${recorded} hari mempunyai rekod bagi bulan ini. Klik tarikh untuk melihat butiran.`;
  renderDutyStatusDetail();
}

async function loadDutyStatusCalendar() {
  if (state.dutyStatus.loading) return;
  state.dutyStatus.loading = true;
  state.dutyStatus.month = $("#dutyStatusMonth").value || state.dutyStatus.month || state.date.slice(0, 7);
  $("#dutyStatusMonth").value = state.dutyStatus.month;
  $("#dutyStatusMessage").textContent = "Memuatkan status pengisian…";
  try {
    const range = dutyStatusMonthRange();
    const today = localDateValue();
    const dates = Array.from({ length: range.lastDay }, (_, index) => `${range.month}-${String(index + 1).padStart(2, "0")}`)
      .filter((date) => { const day = new Date(`${date}T00:00:00Z`).getUTCDay(); return day !== 0 && day !== 6 && date <= today; });
    const results = await Promise.allSettled(dates.map(async (date) => {
      const [school, safety] = await Promise.all([fetchSchoolDate(date), fetchSafetyDate(date)]);
      return dutyStatusDayRecord(date, school, safety);
    }));
    state.dutyStatus.records = new Map(results.map((result, index) => [dates[index], result.status === "fulfilled" ? result.value : dutyStatusDayRecord(dates[index]) ]));
    if (!state.dutyStatus.selectedDate?.startsWith(`${range.month}-`)) {
      state.dutyStatus.selectedDate = dates.includes(today) ? today : [...dates].reverse().find((date) => state.dutyStatus.records.get(date)?.status !== "missing") || dates.at(-1) || "";
    }
  } catch (error) {
    console.error(error);
    $("#dutyStatusMessage").textContent = "Status pengisian tidak dapat dimuatkan. Cuba lagi sebentar.";
  } finally { state.dutyStatus.loading = false; renderDutyStatusCalendar(); }
}

async function openDutyStatusMonitoring(action, session) {
  const date = state.dutyStatus.selectedDate;
  if (!date) return;
  state.date = date;
  state.monitoring.selectedDate = date;
  state.monitoring.month = date.slice(0, 7);
  state.monitoring.requestedMode = action;
  state.monitoring.requestedSession = session;
  $("#monitoringCalendarMonth").value = state.monitoring.month;
  syncReportDateInputs();
  resetMonitoringFormForDate();
  $("#monitoringSession").value = session;
  const host = $("#dutyStatusMonitoringWorkspace");
  host.hidden = false;
  host.appendChild($("#monitoringDayWorkspace"));
  await loadMonitoringReports();
  $("#monitoringSession").value = session;
  $("#monitoringFormDisclosure").open = action === "add";
  host.scrollIntoView({ behavior: "smooth", block: "start" });
}

function rmtNameValues(target) {
  return Array.from($(target).querySelectorAll(".rmt-name-input")).map((input) => input.value.trim()).filter(Boolean);
}

function setRmtNameValues(target, names = []) {
  $(target).querySelectorAll(".rmt-name-input").forEach((input, index) => { input.value = names[index] || ""; });
}

function renderRmtDutySnapshot(message = "") {
  const morningNames = rmtNameValues("#rmtMorningNames");
  const afternoonNames = rmtNameValues("#rmtAfternoonNames");
  $("#rmtMorningSnapshot").textContent = morningNames.length ? morningNames.join(" • ") : "Belum ditetapkan";
  $("#rmtAfternoonSnapshot").textContent = afternoonNames.length ? afternoonNames.join(" • ") : "Belum ditetapkan";
  $("#rmtDutySnapshotStatus").textContent = message || "Senarai guru bagi minggu tarikh pengisian.";
}

async function loadRmtWeek() {
  if (state.rmtScheduleLoading) return;
  state.rmtScheduleLoading = true;
  const date = $("#rmtFrom").value || state.date;
  $("#rmtDutyStatus").textContent = "Memuatkan senarai guru mingguan…";
  try {
    const response = await fetch(`${SAFETY_API_URL}?mode=rmt-week&date=${encodeURIComponent(date)}`, { cache: "no-store" });
    const data = await responseJson(response, "Senarai guru RMT tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "Senarai guru RMT tidak dapat dibuka.");
    let schedule = data.schedule;
    if (!Object.prototype.hasOwnProperty.call(data, "schedule")) {
      const legacyResponse = await fetch(`${SAFETY_API_URL}?date=${encodeURIComponent(date)}&limit=20`, { cache: "no-store" });
      const legacyData = await responseJson(legacyResponse, "Senarai guru RMT tidak dapat dibuka.");
      const savedRecord = (Array.isArray(legacyData.reports) ? legacyData.reports : []).find(isRmtScheduleReport);
      if (savedRecord && String(savedRecord.issue || "").startsWith("[rmt-week]")) {
        try { schedule = JSON.parse(String(savedRecord.issue).slice(10)); } catch { schedule = null; }
      }
    }
    if (!schedule) {
      $("#rmtWeek").value = "";
      setRmtNameValues("#rmtMorningNames"); setRmtNameValues("#rmtAfternoonNames");
      $("#rmtDutyStatus").textContent = "Belum ada senarai guru RMT disimpan bagi minggu ini.";
      renderRmtDutySnapshot("Belum ada senarai guru RMT disimpan bagi minggu ini.");
      return;
    }
    const filledDate = schedule.filledDate || date || state.date;
    const weekDates = schoolWeekDates(filledDate);
    $("#rmtWeek").value = schedule.weekNumber || isoWeekNumber(filledDate);
    $("#rmtFrom").value = filledDate;
    $("#rmtTo").value = schedule.weekEnd || weekDates[4];
    $("#rmtMorningCount").value = schedule.morningCount;
    $("#rmtAfternoonCount").value = schedule.afternoonCount;
    setRmtNameValues("#rmtMorningNames", schedule.morningNames);
    setRmtNameValues("#rmtAfternoonNames", schedule.afternoonNames);
    updateRmtTotal(); syncAllLocalizedDateInputs();
    const scheduleMessage = `Minggu ${schedule.weekNumber || isoWeekNumber(filledDate)} • Dikemas kini oleh ${schedule.updatedBy || "guru bertugas"} pada ${formatDisplayDate(filledDate)}.`;
    $("#rmtDutyStatus").textContent = scheduleMessage;
    renderRmtDutySnapshot(scheduleMessage);
  } catch (error) {
    $("#rmtDutyStatus").textContent = error.message || "Senarai guru RMT tidak dapat dibuka.";
    renderRmtDutySnapshot(error.message || "Senarai guru RMT tidak dapat dibuka.");
  } finally { state.rmtScheduleLoading = false; }
}

async function saveRmtWeek() {
  if (!editorName()) { $("#rmtDutyStatus").textContent = "Pilih nama pengisi di bahagian atas dahulu."; $("#editorName").focus(); return; }
  if (!$("#rmtWeek").checkValidity()) { $("#rmtDutyStatus").textContent = "Masukkan nombor minggu sekolah yang betul antara 1 hingga 53."; $("#rmtWeek").reportValidity(); return; }
  const morningNames = rmtNameValues("#rmtMorningNames"), afternoonNames = rmtNameValues("#rmtAfternoonNames");
  const button = $("#rmtDutySave"); button.disabled = true; $("#rmtDutyStatus").textContent = "Menyimpan senarai guru mingguan…";
  try {
    const filledDate = $("#rmtFrom").value || state.date;
    const weekDates = schoolWeekDates(filledDate);
    const payload = { action: "saveRmtWeek", weekStart: weekDates[0], weekEnd: weekDates[4], filledDate, weekNumber: count($("#rmtWeek").value, 53), morningCount: count($("#rmtMorningCount").value, 9999), afternoonCount: count($("#rmtAfternoonCount").value, 9999), morningNames, afternoonNames, updatedBy: editorName() };
    let response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    let data = await responseJson(response, "Senarai guru RMT gagal disimpan.");
    if (!response.ok || !data.schedule) {
      const legacySchedule = { weekStart: payload.weekStart, weekEnd: payload.weekEnd, filledDate: payload.filledDate, weekNumber: payload.weekNumber, morningCount: payload.morningCount, afternoonCount: payload.afternoonCount, morningNames, afternoonNames, updatedBy: payload.updatedBy, updatedAt: Date.now() };
      response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: payload.weekStart, updatedBy: payload.updatedBy, category: "both", session: "morning", location: `RMT • Senarai Guru Mingguan • Minggu ${payload.weekNumber}`, routeStatus: "not_applicable", parkingStatus: "not_applicable", issue: `[rmt-week]${JSON.stringify(legacySchedule)}`, action: "Senarai guru bertugas RMT mingguan", photos: [] }) });
      data = await responseJson(response, "Senarai guru RMT gagal disimpan.");
    }
    if (!response.ok) throw new Error(data.error || "Senarai guru RMT gagal disimpan.");
    const savedMessage = `Senarai guru RMT berjaya disimpan pada ${formatDisplayDate(filledDate)} dan boleh dilihat pada semua peranti.`;
    $("#rmtDutyStatus").textContent = savedMessage;
    renderRmtDutySnapshot(savedMessage);
    $("#rmtDutyEditor").open = false;
  } catch (error) { $("#rmtDutyStatus").textContent = error.message || "Senarai guru RMT gagal disimpan."; }
  finally { button.disabled = false; }
}

function rmtReportsForDisplay() {
  if (state.rmtShowAll) return state.rmtReports;
  if (!state.rmtSelectedDate) return [];
  return state.rmtReports.filter((report) => report.reportDate === state.rmtSelectedDate);
}

function ensureRmtArchiveDefaultDate() {
  const archiveDate = $("#rmtArchiveDate");
  const defaultDate = archiveDate.value || state.date || localDateValue();
  if (!state.rmtSelectedDate) state.rmtSelectedDate = defaultDate;
  state.rmtMonth = state.rmtSelectedDate.slice(0, 7);
  archiveDate.value = state.rmtSelectedDate;
  $("#rmtCalendarMonth").value = state.rmtMonth;
  syncAllLocalizedDateInputs();
}

function rmtTeacherShortName(value) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const relationIndex = words.findIndex((word) => ["BIN", "BINTI", "BTE", "BT", "A/L", "A/P"].includes(word.toUpperCase()));
  const firstName = (relationIndex > 0 ? words.slice(0, relationIndex) : words.slice(0, 2)).slice(0, words[0]?.toUpperCase() === "AG" ? 3 : 2);
  return firstName.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ") || "Guru";
}

function rmtReportDetails(report) {
  try { return String(report?.issue || "").startsWith("[rmt-v2]") ? JSON.parse(String(report.issue).slice(8)) : null; }
  catch { return null; }
}

function rmtMenuShortName(value) {
  return String(value || "Menu tidak dinyatakan")
    .replace(/^Menu RMT \(Bulan Puasa\)\s*-\s*/i, "Puasa · ")
    .replace(/^Menu RMT\s+\d+\s*-\s*/i, "")
    .replace(/^Tiada Dalam Senarai Menu RMT$/i, "Menu lain");
}

function rmtCalendarReport(report, sessionLabel) {
  const details = rmtReportDetails(report) || {};
  const menu = rmtMenuShortName(details.menu);
  const supplied = Number(details.supplied || 0);
  const recipients = Number(details.recipients || 0);
  const ratio = recipients ? `${supplied}/${recipients}` : supplied ? String(supplied) : "—";
  const teacher = rmtTeacherShortName(report?.updatedBy);
  const title = `${sessionLabel}: ${menu}; RMT ${ratio}; diisi oleh ${teacher}`;
  return `<small class="rmt-day-report" title="${safe(title)}"><i>${safe(sessionLabel)} · ${safe(menu)}</i><em>RMT ${safe(ratio)}</em></small>`;
}

function renderRmtReports() {
  const sessionLabel = (value) => value === "afternoon" ? "Sidang Petang" : "Sidang Pagi";
  const reports = rmtReportsForDisplay();
  $("#rmtGalleryTitle").textContent = state.rmtSelectedDate ? `Laporan ${formatDisplayDate(state.rmtSelectedDate)}` : "Pilih Tarikh pada Kalendar";
  $("#rmtGallerySubtitle").textContent = state.rmtSelectedDate ? `${reports.length} laporan ditemui pada tarikh ini.` : "Gambar hanya dipaparkan selepas pentadbir memilih tarikh.";
  $("#rmtSharedGallery").innerHTML = reports.map((report) => {
    const created = formatDisplayDateTime(report.createdAt);
    const displayLocation = formatEmbeddedDates(report.location);
    const photos = (Array.isArray(report.photos) ? report.photos : []).map((photo, index) => `<a href="${safe(photo.url)}" target="_blank" rel="noopener"><img src="${safe(photo.url)}" loading="lazy" alt="Gambar RMT ${safe(displayLocation)} ${index + 1}"></a>`).join("");
    const details = rmtReportDetails(report);
    const content = details ? `<dl class="rmt-report-details"><div><dt>Penerima</dt><dd>${safe(details.recipients)} orang</dd></div><div><dt>Dibekalkan</dt><dd>${safe(details.supplied)} hidangan</dd></div><div><dt>Menu</dt><dd>${safe(details.menu)}</dd></div><div><dt>Penilaian</dt><dd>${safe(details.rating)}</dd></div>${details.notes ? `<div><dt>Catatan</dt><dd>${safe(details.notes)}</dd></div>` : ""}</dl>` : `<p>${safe(formatEmbeddedDates(report.action))}</p>`;
    return `<article class="rmt-shared-report"><div class="monitoring-photo-grid">${photos}</div><div><span class="category-badge">${sessionLabel(report.session)}</span><h4>${safe(displayLocation)}</h4><p>Diisi oleh <strong>${safe(report.updatedBy || "—")}</strong></p><small>${safe(created)}</small>${content}</div></article>`;
  }).join("");
  if (!reports.length) $("#rmtSharedGallery").innerHTML = `<p class="monitoring-empty">${state.rmtSelectedDate ? "Belum ada laporan RMT pada tarikh ini." : "Klik satu tarikh pada kalendar untuk membuka laporan dan gambar."}</p>`;
  $("#rmtSharedStatus").textContent = reports.length ? `${reports.length} laporan RMT dipaparkan.` : state.rmtSelectedDate ? "Belum ada laporan RMT pada tarikh ini." : "Menunggu tarikh dipilih.";
}

function renderRmtCalendar() {
  const range = rmtMonthRange();
  const reportsByDate = new Map();
  for (const report of state.rmtReports) {
    const sessions = reportsByDate.get(report.reportDate) || { morning: [], afternoon: [] };
    sessions[report.session === "afternoon" ? "afternoon" : "morning"].push(report);
    reportsByDate.set(report.reportDate, sessions);
  }
  const totalMorning = state.rmtReports.filter((item) => item.session === "morning").length;
  const totalAfternoon = state.rmtReports.filter((item) => item.session === "afternoon").length;
  const completeDays = Array.from(reportsByDate.values()).filter((sessions) => sessions.morning.length && sessions.afternoon.length).length;
  $("#rmtSummaryTotal").textContent = state.rmtReports.length;
  $("#rmtSummaryMorning").textContent = totalMorning;
  $("#rmtSummaryAfternoon").textContent = totalAfternoon;
  $("#rmtSummaryComplete").textContent = completeDays;
  const firstDayOffset = (new Date(Date.UTC(range.year, range.monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const cells = Array.from({ length: firstDayOffset }, () => '<span class="rmt-calendar-spacer" aria-hidden="true"></span>');
  for (let day = 1; day <= range.lastDay; day++) {
    const date = `${range.month}-${String(day).padStart(2, "0")}`;
    const dateObjectValue = new Date(`${date}T00:00:00Z`), weekday = dateObjectValue.getUTCDay();
    const sessions = reportsByDate.get(date) || { morning: [], afternoon: [] };
    const hasMorning = sessions.morning.length > 0, hasAfternoon = sessions.afternoon.length > 0;
    const morningTeacher = hasMorning ? rmtTeacherShortName(sessions.morning[0].updatedBy) : "";
    const afternoonTeacher = hasAfternoon ? rmtTeacherShortName(sessions.afternoon[0].updatedBy) : "";
    let status = "missing", label = "Belum ada laporan";
    if (weekday === 0 || weekday === 6) { status = "weekend"; label = "Tiada RMT"; }
    else if (date > localDateValue()) { status = "future"; label = "Tarikh akan datang"; }
    else if (hasMorning && hasAfternoon) { status = "both"; label = `Pagi: ${morningTeacher}; Petang: ${afternoonTeacher}`; }
    else if (hasMorning) { status = "morning-only"; label = `Sidang pagi: ${morningTeacher}`; }
    else if (hasAfternoon) { status = "afternoon-only"; label = `Sidang petang: ${afternoonTeacher}`; }
    const selected = !state.rmtShowAll && state.rmtSelectedDate === date ? " selected" : "";
    const details = status === "weekend" ? '<small class="rmt-day-note">Tiada RMT</small>' : `${hasMorning ? rmtCalendarReport(sessions.morning[0], "P") : ""}${hasAfternoon ? rmtCalendarReport(sessions.afternoon[0], "PTG") : ""}${status === "missing" ? '<small class="rmt-day-note">Belum diisi</small>' : ""}`;
    cells.push(`<button class="rmt-calendar-day ${status}${selected}" type="button" data-rmt-date="${date}" aria-label="${safe(formatDisplayDate(date))}: ${safe(label)}"><span>${day}</span>${details}</button>`);
  }
  $("#rmtCalendarGrid").innerHTML = cells.join("");
  $("#rmtCalendarStatus").textContent = state.rmtReports.length ? `${state.rmtReports.length} laporan berjaya dipulihkan dan dipaparkan bagi bulan ini.` : "Belum ada laporan RMT dalam bulan pilihan.";
  $("#rmtShowAll").hidden = !state.rmtSelectedDate;
}

async function loadRmtReportsFromDailyArchive(range) {
  const dates = Array.from({ length: range.lastDay }, (_, index) => `${range.month}-${String(index + 1).padStart(2, "0")}`);
  const results = await Promise.all(dates.map(async (date) => {
    try {
      const response = await fetch(`${SAFETY_API_URL}?date=${encodeURIComponent(date)}&limit=20`, { cache: "no-store" });
      const data = await responseJson(response, "");
      return response.ok && Array.isArray(data.reports) ? data.reports.filter(isRmtReport) : [];
    } catch { return []; }
  }));
  return results.flat();
}

async function loadRmtReports() {
  if (state.rmtLoading) return;
  state.rmtLoading = true;
  $("#rmtSharedStatus").textContent = "Memuatkan semua laporan RMT…";
  $("#rmtCalendarStatus").textContent = "Memuatkan rekod RMT…";
  try {
    state.rmtMonth = $("#rmtCalendarMonth").value || state.rmtMonth || state.date.slice(0, 7);
    const range = rmtMonthRange(state.rmtMonth);
    const response = await fetch(`${SAFETY_API_URL}?mode=rmt&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, { cache: "no-store" });
    const data = await responseJson(response, "Gambar RMT tidak dapat dibuka.");
    const supportsMonthlyArchive = response.ok && data.from === range.from && data.to === range.to;
    state.rmtReports = supportsMonthlyArchive && Array.isArray(data.reports)
      ? data.reports.filter(isRmtReport)
      : await loadRmtReportsFromDailyArchive(range);
    state.rmtReports.sort((a, b) => String(b.reportDate || "").localeCompare(String(a.reportDate || "")) || Number(b.createdAt || 0) - Number(a.createdAt || 0));
    if (state.rmtSelectedDate && !state.rmtSelectedDate.startsWith(`${range.month}-`)) state.rmtSelectedDate = "";
    renderRmtCalendar(); renderRmtReports();
  } catch (error) {
    console.error(error);
    state.rmtReports = [];
    $("#rmtSharedGallery").innerHTML = "";
    $("#rmtSharedStatus").textContent = error.message || "Gambar RMT tidak dapat dibuka.";
    $("#rmtCalendarStatus").textContent = error.message || "Kalendar RMT tidak dapat dibuka.";
  } finally { state.rmtLoading = false; }
}

async function saveRmtPhotos() {
  if (!editorName()) {
    $("#rmtPhotoStatus").textContent = "Pilih nama pengisi di bahagian atas dahulu.";
    $("#editorName").focus();
    return;
  }
  let files;
  try { files = validateMonitoringFiles($("#rmtPhotos").files); }
  catch (error) { $("#rmtPhotoStatus").textContent = error.message; return; }
  $("#rmtPhotoSave").disabled = true;
  $("#rmtPhotoStatus").textContent = "Mengecilkan dan memuat naik gambar RMT…";
  try {
    const photos = await Promise.all(files.map(prepareMonitoringPhoto));
    const week = count($("#rmtWeek").value, 53);
    const morning = count($("#rmtMorningCount").value), afternoon = count($("#rmtAfternoonCount").value);
    const payload = {
      date: $("#rmtFrom").value || state.date,
      updatedBy: editorName(),
      category: "both",
      session: $("#rmtPhotoSession").value,
      location: `RMT • Minggu ${week}`,
      routeStatus: "not_applicable",
      parkingStatus: "not_applicable",
      issue: `Bukti laporan Guru Bertugas RMT ${$("#rmtPhotoSession").value === "afternoon" ? "Sidang Petang" : "Sidang Pagi"}`,
      action: `Jumlah murid RMT — Pagi: ${morning} • Petang: ${afternoon} • Tarikh pengisian: ${formatDisplayDate($("#rmtFrom").value)}`,
      photos,
    };
    const response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await responseJson(response, "Gambar RMT gagal disimpan.");
    if (!response.ok) throw new Error(result.error || "Gambar RMT gagal disimpan.");
    clearRmtPreview();
    $("#rmtPhotoStatus").textContent = "Gambar RMT berjaya disimpan dan boleh dilihat oleh guru lain.";
    state.rmtMonth = String(payload.date).slice(0, 7); $("#rmtCalendarMonth").value = state.rmtMonth; state.rmtSelectedDate = payload.date; state.rmtShowAll = false;
    await loadRmtReports();
  } catch (error) {
    console.error(error);
    $("#rmtPhotoStatus").textContent = error.message || "Gambar RMT gagal disimpan.";
  } finally { updateEditingAccess(); }
}

async function saveRmtReport(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector("[data-rmt-status]");
  if (!editorName()) { status.textContent = "Pilih nama pengisi di bahagian atas dahulu."; $("#editorName").focus(); return; }
  const value = (field) => form.querySelector(`[data-rmt-field="${field}"]`).value.trim();
  const session = value("session");
  let files;
  try { files = validateMonitoringFiles(form.querySelector('[data-rmt-field="photos"]').files); }
  catch (error) { status.textContent = error.message; return; }
  const button = form.querySelector('button[type="submit"]'); button.disabled = true; status.textContent = "Memproses dan menyimpan laporan RMT…";
  try {
    const details = { recipients: count(value("recipients")), supplied: count(value("supplied")), menu: value("menu"), rating: value("rating"), notes: value("notes") };
    const photos = await Promise.all(files.map(prepareMonitoringPhoto));
    const payload = { date: state.date, updatedBy: editorName(), category: "both", session, location: `RMT • ${session === "morning" ? "Sidang Pagi" : "Sidang Petang"} • ${formatDisplayDate(state.date)}`, routeStatus: "not_applicable", parkingStatus: "not_applicable", issue: `[rmt-v2]${JSON.stringify(details)}`, action: details.notes || "Laporan RMT lengkap", photos };
    const response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await responseJson(response, "Laporan RMT gagal disimpan.");
    if (!response.ok) throw new Error(result.error || "Laporan RMT gagal disimpan.");
    form.reset(); form.querySelector("[data-rmt-preview]").innerHTML = ""; status.textContent = "Laporan RMT berjaya disimpan dan tersedia pada semua peranti."; state.rmtMonth = state.date.slice(0, 7); $("#rmtCalendarMonth").value = state.rmtMonth; state.rmtSelectedDate = state.date; state.rmtShowAll = false; await loadRmtReports();
  } catch (error) { status.textContent = error.message || "Laporan RMT gagal disimpan."; }
  finally { button.disabled = false; }
}

function setSidebar(open) {
  document.body.classList.toggle("sidebar-open", open);
  $("#mainSidebar").setAttribute("aria-hidden", String(!open));
  $("#menuToggle").setAttribute("aria-expanded", String(open));
  $("#menuToggle").textContent = open ? "✕ Tutup" : "☰ Menu";
}

function setupSidebarSwipe() {
  let gesture = null;
  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;
  const resetGesture = () => { gesture = null; };

  document.addEventListener("touchstart", (event) => {
    if (!isMobile() || event.touches.length !== 1 || document.body.classList.contains("modal-open")) return;
    const touch = event.touches[0];
    const sidebarOpen = document.body.classList.contains("sidebar-open");
    const openZone = Math.min(150, window.innerWidth * 0.3);
    if (!sidebarOpen && touch.clientX <= openZone) {
      gesture = { startX: touch.clientX, startY: touch.clientY, lastX: touch.clientX, lastY: touch.clientY, startedAt: Date.now(), horizontal: false };
    }
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (!gesture || event.touches.length !== 1) return;
    const touch = event.touches[0];
    gesture.lastX = touch.clientX;
    gesture.lastY = touch.clientY;
    const dx = gesture.lastX - gesture.startX;
    const dy = gesture.lastY - gesture.startY;
    if (dx > 6 && dx > Math.abs(dy)) {
      gesture.horizontal = true;
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("touchend", (event) => {
    if (!gesture) return;
    const touch = event.changedTouches[0];
    const dx = (touch?.clientX ?? gesture.lastX) - gesture.startX;
    const dy = (touch?.clientY ?? gesture.lastY) - gesture.startY;
    const quickEnough = Date.now() - gesture.startedAt <= 1200;
    const deliberateSwipe = gesture.horizontal && quickEnough && dx >= 24 && dx > Math.abs(dy);
    if (deliberateSwipe) setSidebar(true);
    resetGesture();
  }, { passive: true });

  document.addEventListener("touchcancel", resetGesture, { passive: true });
}

async function loadAnalytics() {
  if (state.analytics.loading) return;
  state.analytics.loading = true;
  const range = analyticsRange($("#analysisPeriod").value, $("#analysisDate").value || state.date);
  $("#analysisStatus").className = "analysis-status";
  $("#analysisStatus").textContent = "Memuatkan analisis…";
  $("#analysisRefresh").disabled = true;
  try {
    const response = await fetch(`${API_URL}?mode=analytics&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analisis tidak dapat dibuka.");
    renderAnalytics(Array.isArray(data.records) ? data.records : [], range);
  } catch (error) {
    console.error(error);
    $("#analysisStatus").className = "analysis-status error";
    $("#analysisStatus").textContent = error.message || "Analisis tidak dapat dibuka. Cuba lagi.";
  } finally { state.analytics.loading = false; $("#analysisRefresh").disabled = false; }
}

function clearMonitoringPreview() {
  for (const url of state.monitoring.previewUrls) URL.revokeObjectURL(url);
  state.monitoring.previewUrls = [];
  $("#monitoringPreview").innerHTML = "";
}

function validateMonitoringFiles(files) {
  const selected = Array.from(files || []);
  if (!selected.length) throw new Error("Pilih sekurang-kurangnya satu gambar.");
  if (selected.length > 4) throw new Error("Maksimum 4 gambar bagi setiap laporan.");
  if (selected.some((file) => !(file.type || "").startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))) {
    throw new Error("Fail yang dipilih mestilah gambar.");
  }
  if (selected.some((file) => file.size > 25 * 1024 * 1024)) throw new Error("Setiap gambar asal mestilah tidak melebihi 25 MB.");
  return selected;
}

function readBlobAsBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] || "");
    reader.onerror = () => reject(new Error("Gambar yang telah diproses tidak dapat dibaca."));
    reader.readAsDataURL(blob);
  });
}

function loadMonitoringImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Gambar ${file.name} tidak dapat dibuka. Jika gambar HEIC gagal, pilih versi JPG.`));
    };
    image.src = url;
  });
}

async function prepareMonitoringPhoto(file, index) {
  const image = await loadMonitoringImage(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(`Gambar ${file.name} tidak dapat diproses.`);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    (result) => result ? resolve(result) : reject(new Error(`Gambar ${file.name} tidak dapat dikecilkan.`)),
    "image/jpeg",
    0.82,
  ));
  return {
    name: `gambar-${index + 1}.jpg`,
    type: "image/jpeg",
    size: blob.size,
    data: await readBlobAsBase64(blob),
  };
}

async function responseJson(response, fallbackMessage) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { throw new Error(response.ok ? fallbackMessage : `${fallbackMessage} Pelayan memberi respons yang tidak lengkap.`); }
}

function renderMonitoringPreview(files) {
  clearMonitoringPreview();
  try {
    const selected = validateMonitoringFiles(files);
    state.monitoring.previewUrls = selected.map((file) => URL.createObjectURL(file));
    $("#monitoringPreview").innerHTML = state.monitoring.previewUrls.map((url, index) =>
      `<figure><img src="${safe(url)}" alt="Pratonton gambar ${index + 1}"><figcaption>Gambar ${index + 1}</figcaption></figure>`
    ).join("");
    $("#monitoringFormStatus").textContent = `${selected.length} gambar dipilih.`;
  } catch (error) {
    $("#monitoringPhotos").value = "";
    $("#monitoringFormStatus").textContent = error.message;
  }
}

function monitoringStatusClass(value) {
  return value === "controlled" ? "controlled" : value === "attention" ? "attention" : "neutral";
}

function monitoringLocationOptions(selected = "") {
  return `<option value="">Pilih kawasan / kategori</option>${MONITORING_LOCATIONS.map((location) => `<option value="${safe(location)}"${location === selected ? " selected" : ""}>${safe(location)}</option>`).join("")}`;
}

function monitoringStatusLabel(value) {
  return value === "controlled" ? "Baik" : value === "attention" ? "Perlu Tindakan" : "Memuaskan";
}

function monitoringSessionLabel(value) {
  return value === "morning" ? "Sidang Pagi" : value === "afternoon" ? "Sidang Petang" : "Sidang belum ditetapkan";
}

const MONITORING_ASPECTS = [
  ["cleanliness", "Kebersihan", "✨"],
  ["safety", "Keselamatan", "🛡️"],
  ["damage", "Kerosakan", "🔧"],
  ["facilities", "Kemudahan", "🏫"],
];

function monitoringIssueDetails(value = "") {
  const withoutBatch = String(value).replace(/^\[smart-report:[^\]]+\]\s*/i, "").trim();
  const match = withoutBatch.match(/^\[inspection-v1:([^\]]+)\]\s*/i);
  if (!match) return { note: withoutBatch, aspects: {} };
  try {
    const data = JSON.parse(decodeURIComponent(match[1]));
    return { note: String(data.note || withoutBatch.slice(match[0].length)).trim(), aspects: data.aspects && typeof data.aspects === "object" ? data.aspects : {} };
  } catch (error) {
    console.warn("Butiran pemeriksaan lama tidak dapat dibaca.", error);
    return { note: withoutBatch.slice(match[0].length).trim(), aspects: {} };
  }
}

function cleanMonitoringText(value = "") {
  return monitoringIssueDetails(value).note;
}

function monitoringAspectBadges(value = "") {
  const aspects = monitoringIssueDetails(value).aspects;
  const badges = MONITORING_ASPECTS.map(([key, label, icon]) => {
    const status = aspects[key];
    if (!status) return "";
    const text = status === "good" ? "Baik" : status === "attention" ? "Perlu tindakan" : "Tidak berkaitan";
    return `<span class="monitoring-aspect-badge ${safe(status)}">${icon} ${safe(label)}: ${safe(text)}</span>`;
  }).filter(Boolean).join("");
  return badges ? `<div class="monitoring-aspect-badges">${badges}</div>` : "";
}

function monitoringCalendarRange(month = state.monitoring.month || state.date.slice(0, 7)) {
  return rmtMonthRange(month);
}

function monitoringCalendarRecord(date, reports = []) {
  const items = dutyStatusMonitoringReports(reports).map((report) => ({ ...report, reportDate: report.reportDate || date }));
  const complete = items.length > 0 && items.every((report) => {
    const aspects = monitoringIssueDetails(report.issue).aspects;
    return Array.isArray(report.photos) && report.photos.length > 0 && (Object.keys(aspects).length > 0 || Boolean(cleanMonitoringText(report.issue)));
  });
  const attention = items.some((report) => report.routeStatus === "attention" || Object.values(monitoringIssueDetails(report.issue).aspects).includes("attention"));
  const names = Array.from(new Set(items.map((report) => String(report.updatedBy || "").trim()).filter(Boolean)));
  const photos = items.flatMap((report) => Array.isArray(report.photos) ? report.photos : []);
  return { date, status: complete ? "complete" : items.length ? "partial" : "missing", attention, items, names, photos };
}

function monitoringCalendarStatusLabel(status) {
  return status === "complete" ? "Lengkap" : status === "partial" ? "Perlu lengkap" : "Belum diisi";
}

function renderMonitoringSelectedDay() {
  const workspace = $("#monitoringDayWorkspace");
  const date = state.monitoring.selectedDate;
  if (!date) { workspace.hidden = true; return; }
  workspace.hidden = false;
  const record = state.monitoring.calendarRecords.get(date) || monitoringCalendarRecord(date, state.monitoring.reports);
  const names = record.names.length ? record.names.map(rmtTeacherShortName).join(", ") : "Belum ada pengisi";
  $("#monitoringSelectedDayHead").innerHTML = `<div><span class="duty-status-pill ${record.status}">${safe(monitoringCalendarStatusLabel(record.status))}</span><h3>${safe(formatDisplayDate(date))}</h3><p>${safe(names)}${record.items.length ? ` • ${record.items.length} kawasan` : ""}</p></div>${record.attention ? '<strong class="monitoring-day-alert">⚠ Perlu tindakan pentadbir</strong>' : '<span class="monitoring-day-clear">Tiada amaran tindakan</span>'}`;
  $("#monitoringFormDisclosure").open = record.status !== "complete";
  $("#monitoringArchiveSection").hidden = !record.items.length;
}

function renderMonitoringCalendar() {
  const range = monitoringCalendarRange();
  const today = localDateValue();
  const firstDayOffset = (new Date(Date.UTC(range.year, range.monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const cells = Array.from({ length: firstDayOffset }, () => '<span class="duty-status-spacer" aria-hidden="true"></span>');
  let recorded = 0;
  for (let day = 1; day <= range.lastDay; day++) {
    const date = `${range.month}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const inactive = weekday === 0 || weekday === 6 || date > today;
    const record = state.monitoring.calendarRecords.get(date);
    const status = inactive ? "weekend" : record?.status || "missing";
    if (!inactive && status !== "missing") recorded += 1;
    const selected = state.monitoring.selectedDate === date ? " selected" : "";
    const names = record?.names?.slice(0, 2).map(rmtTeacherShortName).join(" · ") || "";
    const note = inactive ? (date > today ? "Akan datang" : "Tiada tugas") : monitoringCalendarStatusLabel(status);
    const alert = !inactive && record?.attention ? '<b class="monitoring-calendar-alert" aria-label="Perlu tindakan pentadbir">!</b>' : "";
    cells.push(`<button class="duty-status-day monitoring-calendar-day ${status}${selected}${record?.attention ? " has-alert" : ""}" type="button" data-monitoring-date="${date}"${inactive ? " disabled" : ""} aria-label="${safe(formatDisplayDate(date))}: ${safe(note)}${record?.attention ? ", perlu tindakan pentadbir" : ""}">${alert}<strong>${day}</strong><span>${safe(note)}</span>${names ? `<small title="${safe(record.names.join(", "))}">${safe(names)}</small>` : ""}</button>`);
  }
  $("#monitoringCalendar").innerHTML = cells.join("");
  $("#monitoringCalendarStatus").textContent = state.monitoring.calendarLoading ? "Memuatkan kalendar pemantauan…" : `${recorded} hari mempunyai laporan. Klik petak tarikh untuk mengisi atau melihat laporan.`;
  renderMonitoringSelectedDay();
}

function resetMonitoringFormForDate() {
  $("#monitoringItems").innerHTML = '<p class="monitoring-empty">Belum ada kawasan dipilih. Scroll senarai di atas dan tekan kawasan yang dipantau.</p>';
  $("#monitoringPhotos").value = "";
  $("#monitoringSession").value = "";
  $("#monitoringFormStatus").textContent = "";
  clearMonitoringPreview();
  syncMonitoringLocationSelection();
}

async function openMonitoringCalendarDate(date) {
  state.monitoring.selectedDate = date;
  state.date = date;
  syncReportDateInputs();
  resetMonitoringFormForDate();
  renderMonitoringCalendar();
  await loadMonitoringReports();
  $("#monitoringDayWorkspace").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadMonitoringCalendar() {
  if (state.monitoring.calendarLoading) return;
  state.monitoring.calendarLoading = true;
  state.monitoring.month = $("#monitoringCalendarMonth").value || state.monitoring.month || state.date.slice(0, 7);
  $("#monitoringCalendarMonth").value = state.monitoring.month;
  $("#monitoringCalendarStatus").textContent = "Memuatkan kalendar pemantauan…";
  try {
    const range = monitoringCalendarRange();
    const today = localDateValue();
    const dates = Array.from({ length: range.lastDay }, (_, index) => `${range.month}-${String(index + 1).padStart(2, "0")}`)
      .filter((date) => { const day = new Date(`${date}T00:00:00Z`).getUTCDay(); return day !== 0 && day !== 6 && date <= today; });
    const results = await Promise.allSettled(dates.map(fetchSafetyDate));
    state.monitoring.calendarRecords = new Map(results.map((result, index) => [dates[index], monitoringCalendarRecord(dates[index], result.status === "fulfilled" ? result.value : [])]));
    if (!state.monitoring.selectedDate?.startsWith(`${range.month}-`)) state.monitoring.selectedDate = dates.includes(today) ? today : dates.at(-1) || "";
  } catch (error) {
    console.error(error);
    $("#monitoringCalendarStatus").textContent = "Kalendar pemantauan tidak dapat dimuatkan. Cuba lagi sebentar.";
  } finally {
    state.monitoring.calendarLoading = false;
    renderMonitoringCalendar();
  }
  if (state.monitoring.selectedDate) {
    state.date = state.monitoring.selectedDate;
    syncReportDateInputs();
    await loadMonitoringReports();
  }
}

function monitoringBatchId(report) {
  const match = String(report.issue || "").match(/^\[smart-report:([^\]]+)\]/i);
  if (match) return match[1];
  return `${report.session || "legacy"}-${String(report.updatedBy || "tanpa-nama").trim().toLowerCase().replace(/\s+/g, "-")}`;
}

function groupedMonitoringReports() {
  const reports = state.monitoring.reports.filter((report) => !isRmtReport(report) && !isRmtScheduleReport(report) && !isWeeklyDutyReport(report) && report.category !== "opr");
  const groups = new Map();
  for (const report of reports) {
    const key = monitoringBatchId(report);
    if (!groups.has(key)) groups.set(key, { id: key, session: report.session || "legacy", updatedBy: report.updatedBy || "—", createdAt: report.createdAt, items: [] });
    const group = groups.get(key);
    group.items.push(report);
    if (new Date(report.createdAt || 0) > new Date(group.createdAt || 0)) group.createdAt = report.createdAt;
  }
  return Array.from(groups.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function setMonitoringTab(tab) {
  document.querySelectorAll("[data-monitoring-tab]").forEach((button) => {
    const active = button.dataset.monitoringTab === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-monitoring-panel]").forEach((panel) => { panel.hidden = panel.dataset.monitoringPanel !== tab; });
}

function syncMonitoringLocationSelection() {
  const selected = new Set(Array.from(document.querySelectorAll('#monitoringItems [data-monitoring-field="location"]')).map((field) => field.value));
  document.querySelectorAll("[data-monitoring-location]").forEach((button) => {
    const active = selected.has(button.dataset.monitoringLocation);
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
    button.querySelector("span").textContent = active ? "✓" : "+";
  });
  $("#monitoringSelectedCount").textContent = `${selected.size} dipilih`;
}

function renderMonitoringLocationChecklist() {
  $("#monitoringLocationChecklist").innerHTML = MONITORING_LOCATIONS.map((location) => `<button type="button" data-monitoring-location="${safe(location)}" aria-pressed="false"><span>+</span>${safe(location)}</button>`).join("");
  syncMonitoringLocationSelection();
}

function addMonitoringItem(selectedLocation = "") {
  const container = $("#monitoringItems");
  const location = selectedLocation || "";
  if (!location) { $("#monitoringFormStatus").textContent = "Pilih kawasan yang dipantau dahulu."; return; }
  const duplicate = Array.from(container.querySelectorAll('[data-monitoring-field="location"]')).some((field) => field.value === location);
  if (duplicate) { $("#monitoringFormStatus").textContent = `${location} sudah dimasukkan dalam laporan ini.`; return; }
  container.querySelector(".monitoring-empty")?.remove();
  container.querySelectorAll(".monitoring-item-card").forEach((item) => { item.open = false; });
  const index = container.querySelectorAll(".monitoring-item-card").length + 1;
  const card = document.createElement("details");
  card.className = "monitoring-item-card";
  card.open = true;
  const aspectFields = MONITORING_ASPECTS.map(([key, label, icon]) => `<label class="monitoring-aspect-field"><span>${icon} ${safe(label)}</span><select data-monitoring-aspect="${safe(key)}" aria-label="Keadaan ${safe(label)}"><option value="">Belum dinilai</option><option value="good">✓ Baik</option><option value="attention">⚠ Perlu tindakan</option><option value="na">— Tidak berkaitan</option></select></label>`).join("");
  card.innerHTML = `<summary><span class="monitoring-step">${index}</span><span><strong data-monitoring-item-title>${safe(location)}</strong><small data-monitoring-item-status>Belum dinilai</small></span><button class="monitoring-remove" type="button" aria-label="Buang ${safe(location)}">Buang</button></summary><div class="monitoring-item-content"><input data-monitoring-field="location" type="hidden" value="${safe(location)}"><input data-monitoring-field="status" type="hidden" value="controlled"><label class="other-location"${location === "Lain-lain" ? "" : " hidden"}>Nama kawasan<input data-monitoring-field="otherLocation" maxlength="180" placeholder="Contoh: Bilik Kesihatan"></label><div class="monitoring-inspection-head"><div><strong>Semakan keadaan</strong><small>Pilih keadaan bagi aspek yang diperiksa.</small></div><button type="button" data-monitoring-all-good>✓ Semua baik</button></div><div class="monitoring-aspect-grid">${aspectFields}</div><div class="monitoring-auto-status"><span>Status keseluruhan dijana automatik</span><strong data-monitoring-auto-status>Belum dinilai</strong></div><label>Penemuan / catatan ringkas — pilihan<textarea data-monitoring-field="note" rows="2" maxlength="1500" placeholder="Contoh: Lantai bersih, lampu koridor tidak menyala"></textarea></label><label class="follow-up" hidden>Tindakan susulan<textarea data-monitoring-field="action" rows="2" maxlength="1500" placeholder="Nyatakan tindakan yang perlu dibuat"></textarea></label></div>`;
  container.appendChild(card);
  syncMonitoringLocationSelection();
  $("#monitoringFormStatus").textContent = `${container.querySelectorAll(".monitoring-item-card").length} kawasan dimasukkan dalam satu laporan.`;
}

function renderMonitoringReports() {
  const groups = groupedMonitoringReports();
  const allItems = groups.flatMap((group) => group.items);
  const statusCount = (status) => allItems.filter((item) => item.routeStatus === status).length;
  const issues = allItems.filter((item) => item.routeStatus === "attention");
  const filter = state.monitoring.filter || "all";
  const filterLabels = { all: "Semua kawasan", controlled: "Baik", not_applicable: "Memuaskan", attention: "Perlu tindakan" };
  const filteredGroups = groups.map((group) => ({ ...group, items: filter === "all" ? group.items : group.items.filter((item) => item.routeStatus === filter) })).filter((group) => group.items.length);
  const metricButton = (value, icon, count, label, className = "") => `<button class="${className}${filter === value ? " active-filter" : ""}" type="button" data-monitoring-filter="${value}" aria-pressed="${filter === value}" aria-label="Lihat ${label.toLowerCase()}"><span>${icon}</span><strong>${count}</strong><small>${label}</small></button>`;
  $("#monitoringSmartSummary").innerHTML = `<div class="monitoring-summary-title"><div><span>${safe($("#monitoringDateLabel").textContent)}</span><h3>Ringkasan Pemantauan</h3></div><button class="secondary-button" type="button" data-monitoring-open="archive">Lihat arkib</button></div><div class="monitoring-summary-metrics">${metricButton("all", "📍", allItems.length, "Kawasan")}${metricButton("controlled", "✓", statusCount("controlled"), "Baik", "good")}${metricButton("not_applicable", "●", statusCount("not_applicable"), "Memuaskan", "fair")}${metricButton("attention", "!", statusCount("attention"), "Perlu tindakan", "alert")}</div>${issues.length ? `<div class="monitoring-alert-list"><strong>Perhatian pentadbir</strong>${issues.map((item) => `<span><b>${safe(item.location)}</b> — ${safe(cleanMonitoringText(item.issue) || "Memerlukan tindakan")}</span>`).join("")}</div>` : `<p class="monitoring-summary-empty">${groups.length ? "Tiada kawasan berstatus perlu tindakan pada tarikh ini." : "Belum ada laporan pada tarikh ini."}</p>`}`;
  const renderGroup = (group) => {
    const items = group.items.map((report) => {
      const photoList = Array.isArray(report.photos) ? report.photos : [];
      const photos = photoList.map((photo, index) => `<a href="${safe(photo.url)}" target="_blank" rel="noopener"><img src="${safe(photo.url)}" loading="lazy" alt="${safe(report.location)}, gambar ${index + 1}"></a>`).join("");
      const thumbnail = photoList[0]?.url ? `<img class="monitoring-location-thumb" src="${safe(photoList[0].url)}" loading="lazy" alt="Pratonton ${safe(report.location)}">` : '<span class="monitoring-location-thumb empty" aria-label="Tiada gambar">📷</span>';
      return `<details class="monitoring-location-result"${filter !== "all" ? " open" : ""}><summary>${thumbnail}<span class="monitoring-result-status ${monitoringStatusClass(report.routeStatus)}">${report.routeStatus === "controlled" ? "✓" : report.routeStatus === "attention" ? "!" : "●"}</span><strong>${safe(report.location)}</strong><small>${safe(monitoringStatusLabel(report.routeStatus))}</small></summary><div class="monitoring-location-result-body"><div class="monitoring-photo-grid">${photos || '<span class="monitoring-no-photo">Tiada gambar dilampirkan</span>'}</div><div class="monitoring-result-copy">${monitoringAspectBadges(report.issue)}<dl><div><dt>Penemuan / catatan</dt><dd>${safe(cleanMonitoringText(report.issue) || "Tiada catatan tambahan")}</dd></div>${report.routeStatus === "attention" ? `<div><dt>Tindakan susulan</dt><dd>${safe(report.action || "Belum dinyatakan")}</dd></div>` : ""}</dl></div></div></details>`;
    }).join("");
    return `<article class="monitoring-master-report"><header><div><p class="monitoring-report-kicker">LAPORAN PEMANTAUAN SEKOLAH</p><h3>Kebersihan &amp; Keselamatan</h3></div><span class="category-badge">${safe(monitoringSessionLabel(group.session))}</span></header><div class="monitoring-report-meta"><div><span>Tarikh</span><strong>${safe(formatDisplayDate(state.date))}</strong></div><div><span>Sidang</span><strong>${safe(monitoringSessionLabel(group.session))}</strong></div><div><span>Kawasan</span><strong>${group.items.length} dipantau</strong></div></div><div class="monitoring-report-status-line"><span class="controlled">${group.items.filter((item) => item.routeStatus === "controlled").length} baik</span><span class="neutral">${group.items.filter((item) => item.routeStatus === "not_applicable").length} memuaskan</span><span class="attention">${group.items.filter((item) => item.routeStatus === "attention").length} perlu tindakan</span></div><div class="monitoring-location-results">${items}</div><footer class="monitoring-prepared-by"><span>Disediakan oleh</span><strong>${safe(group.updatedBy)}</strong><small>${safe(formatDisplayDateTime(group.createdAt))}</small></footer></article>`;
  };
  const filterBar = filter !== "all" ? `<div class="monitoring-active-filter"><span>Menunjukkan: <strong>${safe(filterLabels[filter])}</strong></span><button type="button" data-monitoring-filter="all">Tunjuk semua</button></div>` : "";
  const archiveGroups = [
    ["morning", "Sidang Pagi"], ["afternoon", "Sidang Petang"], ["legacy", "Laporan lama — sidang belum ditetapkan"],
  ].map(([session, label]) => {
    const grouped = filteredGroups.filter((report) => report.session === session);
    if (session === "legacy" && !grouped.length) return "";
    return `<section class="monitoring-session-group"><h4>${label} <span>${grouped.length} laporan lengkap</span></h4>${grouped.length ? grouped.map(renderGroup).join("") : '<p class="monitoring-empty">Belum ada laporan untuk sidang ini.</p>'}</section>`;
  }).join("");
  $("#monitoringGallery").innerHTML = `${filterBar}${filteredGroups.length ? archiveGroups : `<p class="monitoring-empty">Tiada kawasan berstatus “${safe(filterLabels[filter])}” pada tarikh ini.</p>`}`;
  $("#monitoringListStatus").textContent = groups.length ? `${groups.length} laporan lengkap • ${allItems.length} kawasan dipantau.` : "Belum ada laporan bergambar pada tarikh ini.";
  if (state.monitoring.selectedDate === state.date) {
    state.monitoring.calendarRecords.set(state.date, monitoringCalendarRecord(state.date, state.monitoring.reports));
    renderMonitoringCalendar();
  } else renderMonitoringSelectedDay();
}

async function loadMonitoringReports() {
  if (state.monitoring.loading) return;
  state.monitoring.loading = true;
  $("#monitoringListStatus").className = "monitoring-list-status";
  $("#monitoringListStatus").textContent = "Memuatkan laporan…";
  try {
    const response = await fetch(`${SAFETY_API_URL}?date=${encodeURIComponent(state.date)}`, { cache: "no-store" });
    const data = await responseJson(response, "Laporan bergambar tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "Laporan bergambar tidak dapat dibuka.");
    state.monitoring.reports = Array.isArray(data.reports) ? data.reports : [];
    renderMonitoringReports();
  } catch (error) {
    console.error(error);
    state.monitoring.reports = [];
    $("#monitoringGallery").innerHTML = "";
    $("#monitoringListStatus").className = "monitoring-list-status error";
    $("#monitoringListStatus").textContent = error.message || "Laporan bergambar tidak dapat dibuka. Cuba lagi.";
    renderMonitoringSelectedDay();
  } finally { state.monitoring.loading = false; }
}

async function saveMonitoringReport(event) {
  event.preventDefault();
  if (!editorName()) {
    $("#monitoringFormStatus").textContent = "Pilih nama pengisi di bahagian atas dahulu.";
    $("#editorName").focus();
    return;
  }
  const session = $("#monitoringSession").value;
  const cards = Array.from(document.querySelectorAll("#monitoringItems .monitoring-item-card"));
  if (!session) { $("#monitoringFormStatus").textContent = "Sila pilih sidang laporan."; return; }
  if (!cards.length) { $("#monitoringFormStatus").textContent = "Tambah sekurang-kurangnya satu pemantauan."; return; }
  $("#monitoringSave").disabled = true;
  $("#monitoringFormStatus").textContent = `Menyediakan satu laporan lengkap dengan ${cards.length} kawasan…`;
  try {
    const sharedFiles = validateMonitoringFiles($("#monitoringPhotos").files);
    const sharedPhotos = await Promise.all(sharedFiles.map(prepareMonitoringPhoto));
    const batchId = `${state.date}-${session}-${Date.now().toString(36)}`;
    for (const card of cards) {
      const field = (name) => card.querySelector(`[data-monitoring-field="${name}"]`);
      const locationChoice = field("location").value;
      const location = locationChoice === "Lain-lain" ? field("otherLocation").value.trim() : locationChoice;
      const status = field("status").value;
      const action = field("action").value.trim();
      const aspects = Object.fromEntries(Array.from(card.querySelectorAll("[data-monitoring-aspect]")).map((input) => [input.dataset.monitoringAspect, input.value]).filter(([, value]) => value));
      if (!location) throw new Error("Sila pilih atau nyatakan lokasi pemantauan.");
      if (!Object.keys(aspects).length) throw new Error(`Sila nilai sekurang-kurangnya satu aspek untuk ${location}.`);
      if (status === "attention" && !action) throw new Error("Sila nyatakan tindakan susulan bagi status Perlu Tindakan.");
      const note = field("note").value.trim() || (status === "controlled" ? "Kawasan dalam keadaan baik." : status === "not_applicable" ? "Kawasan dalam keadaan memuaskan." : "Pemantauan memerlukan tindakan.");
      const inspection = encodeURIComponent(JSON.stringify({ aspects, note }));
      const payload = { date: state.date, updatedBy: editorName(), category: "both", session, location, routeStatus: status, parkingStatus: "not_applicable", issue: `[smart-report:${batchId}] [inspection-v1:${inspection}] ${note}`, action: action || "Tiada tindakan susulan diperlukan.", photos: sharedPhotos, reportGroupId: batchId };
      const response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await responseJson(response, "Laporan gagal disimpan.");
      if (!response.ok) throw new Error(result.error || "Laporan gagal disimpan.");
    }
    $("#monitoringItems").innerHTML = '<p class="monitoring-empty">Belum ada kawasan dipilih. Scroll senarai di atas dan tekan kawasan yang dipantau.</p>';
    $("#monitoringPhotos").value = "";
    clearMonitoringPreview();
    syncMonitoringLocationSelection();
    $("#monitoringFormStatus").textContent = `Satu laporan lengkap dengan ${cards.length} kawasan berjaya disimpan.`;
    if (document.body.dataset.activeView === "dutyStatus") {
      await loadMonitoringReports();
      await loadDutyStatusCalendar();
      $("#dutyStatusMonitoringWorkspace").hidden = false;
    } else await loadMonitoringCalendar();
  } catch (error) {
    console.error(error);
    $("#monitoringFormStatus").textContent = error.message || "Laporan gagal disimpan. Cuba lagi.";
  } finally { updateEditingAccess(); }
}

function clearOprPreview() {
  for (const url of state.opr.previewUrls) URL.revokeObjectURL(url);
  state.opr.previewUrls = [];
  $("#oprPreview").innerHTML = "";
}

function renderOprPreview(files) {
  clearOprPreview();
  try {
    const selected = validateMonitoringFiles(files);
    state.opr.previewUrls = selected.map((file) => URL.createObjectURL(file));
    $("#oprPreview").innerHTML = state.opr.previewUrls.map((url, index) => `<figure><img src="${safe(url)}" alt="Pratonton gambar OPR ${index + 1}"><figcaption>Gambar program ${index + 1}</figcaption></figure>`).join("");
    $("#oprFormStatus").textContent = `${selected.length} gambar dipilih.`;
  } catch (error) {
    $("#oprPhotos").value = "";
    $("#oprFormStatus").textContent = error.message;
  }
}

function renderOprReports() {
  $("#oprGallery").innerHTML = state.opr.reports.map((report) => {
    const created = formatDisplayDateTime(report.createdAt);
    const photos = (Array.isArray(report.photos) ? report.photos : []).map((photo, index) => `<a href="${safe(photo.url)}" target="_blank" rel="noopener"><img src="${safe(photo.url)}" loading="lazy" alt="${safe(report.location)} gambar ${index + 1}"></a>`).join("");
    const audit = report.lastEditedAt ? `<p class="record-audit">Dikemas kini oleh <strong>${safe(report.lastEditedBy || "—")}</strong> • ${safe(formatAuditTime(report.lastEditedAt))}</p>` : `<p class="record-audit">Rekod asal • ${safe(created)}</p>`;
    return `<article class="monitoring-report"><div class="monitoring-photo-grid">${photos}</div><div class="monitoring-report-body"><div class="monitoring-report-top"><span class="category-badge">OPR HEM</span><time>${safe(created)}</time></div><h3>${safe(report.location)}</h3><p class="monitoring-by">Disediakan oleh <strong>${safe(report.updatedBy || "—")}</strong></p><dl><div><dt>Tarikh program</dt><dd>${safe(formatDisplayDate(report.reportDate))}</dd></div></dl>${audit}<button class="record-edit-button" type="button" data-edit-opr="${safe(report.id)}">✎ Edit OPR</button></div></article>`;
  }).join("");
  $("#oprListStatus").textContent = state.opr.reports.length ? `${state.opr.reports.length} rekod` : "Tiada rekod";
}

function oprCalendarDate(value) {
  return String(value || "").slice(0, 10);
}

function oprCalendarMonthDates() {
  const month = state.opr.month || state.date.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: lastDay }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

function selectedOprLetters() {
  return (state.content.letters || []).filter((letter) => oprCalendarDate(letter.letterDate) === state.opr.selectedDate);
}

function renderOprCalendarDetail() {
  const selectedDate = state.opr.selectedDate;
  state.opr.reports = (state.opr.allReports || []).filter((report) => oprCalendarDate(report.reportDate) === selectedDate);
  const letters = selectedOprLetters();
  $("#oprCalendarDetailTitle").textContent = selectedDate ? formatDisplayDate(selectedDate) : "Pilih tarikh pada kalender";
  $("#oprCalendarDetailCount").textContent = selectedDate ? `${state.opr.reports.length} OPR HEM • ${letters.length} surat` : "OPR dan surat untuk tarikh pilihan akan dipaparkan di sini.";
  $("#oprDetailSection").hidden = state.opr.filter === "letter";
  $("#letterDetailSection").hidden = state.opr.filter === "opr";
  $("#oprAddButton").hidden = state.opr.filter === "letter";
  $("#letterAddButton").hidden = state.opr.filter === "opr";
  renderOprReports();
  $("#latestLetterGrid").innerHTML = letters.map((item) => letterCard(item)).join("");
  $("#letterListStatus").textContent = letters.length ? `${letters.length} rekod` : "Tiada rekod";
}

function renderOprCalendar() {
  const dates = oprCalendarMonthDates();
  if (!dates.length) return;
  const month = state.opr.month;
  const firstDay = new Date(`${dates[0]}T00:00:00Z`).getUTCDay();
  const leading = (firstDay + 6) % 7;
  const today = localDateValue();
  const oprByDate = new Map();
  const letterByDate = new Map();
  (state.opr.allReports || []).forEach((report) => { const date = oprCalendarDate(report.reportDate); if (date.startsWith(month)) oprByDate.set(date, (oprByDate.get(date) || 0) + 1); });
  (state.content.letters || []).forEach((letter) => { const date = oprCalendarDate(letter.letterDate); if (date.startsWith(month)) letterByDate.set(date, (letterByDate.get(date) || 0) + 1); });
  const monthOpr = Array.from(oprByDate.values()).reduce((sum, count) => sum + count, 0);
  const monthLetters = Array.from(letterByDate.values()).reduce((sum, count) => sum + count, 0);
  const activeDates = new Set([...oprByDate.keys(), ...letterByDate.keys()]);
  const contributors = new Set([
    ...(state.opr.allReports || []).filter((item) => oprCalendarDate(item.reportDate).startsWith(month)).map((item) => item.updatedBy).filter(Boolean),
    ...(state.content.letters || []).filter((item) => oprCalendarDate(item.letterDate).startsWith(month)).map((item) => item.updatedBy).filter(Boolean),
  ]).size;
  $("#oprCalendarSummary").innerHTML = `<article><span>OPR bulan ini</span><strong>${monthOpr}</strong></article><article><span>Surat bulan ini</span><strong>${monthLetters}</strong></article><article><span>Tarikh berisi</span><strong>${activeDates.size}</strong></article><article><span>Pengisi</span><strong>${contributors}</strong></article>`;
  const blank = '<span class="opr-calendar-blank" aria-hidden="true"></span>';
  const cells = dates.map((date) => {
    const oprCount = oprByDate.get(date) || 0;
    const letterCount = letterByDate.get(date) || 0;
    const shownOpr = state.opr.filter !== "letter" ? oprCount : 0;
    const shownLetters = state.opr.filter !== "opr" ? letterCount : 0;
    const day = Number(date.slice(-2));
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const type = shownOpr && shownLetters ? "both" : shownOpr ? "opr-only" : shownLetters ? "letter-only" : "empty";
    const labels = [
      shownOpr ? `<small class="opr-count" title="${shownOpr} OPR HEM"><span class="opr-doc-icon" aria-hidden="true">📸</span><b>${shownOpr}</b><em>OPR</em></small>` : "",
      shownLetters ? `<small class="letter-count" title="${shownLetters} Surat Menyurat"><span class="opr-doc-icon" aria-hidden="true">✉️</span><b>${shownLetters}</b><em>Surat</em></small>` : "",
    ].join("");
    return `<button class="opr-calendar-day ${type}${weekday === 0 || weekday === 6 ? " weekend" : ""}${date === state.opr.selectedDate ? " selected" : ""}${date === today ? " today" : ""}" type="button" data-opr-date="${date}" aria-label="${safe(formatDisplayDate(date))}, ${oprCount} OPR dan ${letterCount} surat"><span>${day}</span><span class="opr-day-counts">${labels || "<small>Tiada rekod</small>"}</span></button>`;
  });
  const trailingCount = (7 - ((leading + dates.length) % 7)) % 7;
  $("#oprCalendarGrid").innerHTML = blank.repeat(leading) + cells.join("") + blank.repeat(trailingCount);
  $("#oprCalendarMonth").value = month;
  $("#oprCalendarStatus").textContent = `${monthOpr} OPR HEM dan ${monthLetters} surat ditemui untuk bulan ini.`;
  document.querySelectorAll("[data-opr-filter]").forEach((button) => {
    const active = button.dataset.oprFilter === state.opr.filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  renderOprCalendarDetail();
}

async function loadOprReports() {
  if (state.opr.loading) return;
  state.opr.loading = true;
  $("#oprCalendarStatus").textContent = "Memuatkan kalender dokumen HEM…";
  try {
    const [oprResponse, letterResponse] = await Promise.all([
      fetch(`${SAFETY_API_URL}?category=opr&limit=250`, { cache: "no-store" }),
      fetch(`${CONTENT_API_URL}?mode=letters&all=1`, { cache: "no-store" }),
    ]);
    const [oprData, letterData] = await Promise.all([
      responseJson(oprResponse, "OPR HEM tidak dapat dibuka."),
      responseJson(letterResponse, "Surat HEM tidak dapat dibuka."),
    ]);
    if (!oprResponse.ok) throw new Error(oprData.error || "OPR HEM tidak dapat dibuka.");
    if (!letterResponse.ok) throw new Error(letterData.error || "Surat HEM tidak dapat dibuka.");
    state.opr.allReports = (Array.isArray(oprData.reports) ? oprData.reports : []).filter((report) => report.category === "opr");
    state.content.letters = Array.isArray(letterData.letters) ? letterData.letters : [];
    state.opr.month = $("#oprCalendarMonth").value || state.opr.month || state.date.slice(0, 7);
    const datesWithRecords = [...state.opr.allReports.map((item) => oprCalendarDate(item.reportDate)), ...state.content.letters.map((item) => oprCalendarDate(item.letterDate))].filter((date) => date.startsWith(state.opr.month)).sort();
    if (!state.opr.selectedDate.startsWith(state.opr.month)) state.opr.selectedDate = state.date.startsWith(state.opr.month) ? state.date : datesWithRecords.at(-1) || `${state.opr.month}-01`;
    renderOprCalendar();
  } catch (error) {
    state.opr.reports = []; state.opr.allReports = [];
    $("#oprGallery").innerHTML = "";
    $("#oprCalendarGrid").innerHTML = "";
    $("#oprCalendarStatus").textContent = error.message || "Kalender dokumen HEM tidak dapat dibuka.";
  } finally { state.opr.loading = false; }
}

function shiftOprMonth(amount) {
  const [year, month] = (state.opr.month || state.date.slice(0, 7)).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1));
  state.opr.month = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
  state.opr.selectedDate = "";
  $("#oprCalendarMonth").value = state.opr.month;
  loadOprReports();
}

function openOprEntry(type) {
  const date = state.opr.selectedDate || state.date;
  $("#oprEntryPanel").hidden = type !== "opr";
  $("#letterEntryPanel").hidden = type !== "letter";
  document.body.classList.add("opr-entry-open");
  if (type === "opr") { $("#oprDate").value = date; $("#oprProgram").focus(); }
  else { $("#letterDate").value = date; $("#letterName").focus(); }
  syncAllLocalizedDateInputs();
  $(`#${type === "opr" ? "opr" : "letter"}EntryPanel`).scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveOprReport(event) {
  event.preventDefault();
  const preparedBy = $("#oprPreparedBy").value.trim();
  if (!preparedBy) { $("#oprFormStatus").textContent = "Sila pilih nama guru pada ruangan Disediakan oleh."; return; }
  let files;
  try { files = validateMonitoringFiles($("#oprPhotos").files); }
  catch (error) { $("#oprFormStatus").textContent = error.message; return; }
  $("#oprSave").disabled = true;
  $("#oprFormStatus").textContent = "Mengecilkan dan memuat naik gambar OPR HEM…";
  try {
    const photos = await Promise.all(files.map(prepareMonitoringPhoto));
    const program = $("#oprProgram").value.trim();
    const date = $("#oprDate").value || state.date;
    const payload = { date, updatedBy: preparedBy, category: "opr", session: "morning", location: program, routeStatus: "not_applicable", parkingStatus: "not_applicable", issue: `One Page Report HEM: ${program}`, action: `Disediakan oleh ${preparedBy}`, photos };
    const response = await fetch(SAFETY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await responseJson(response, "OPR HEM gagal disimpan.");
    if (!response.ok) throw new Error(result.error || "OPR HEM gagal disimpan.");
    $("#oprProgram").value = "";
    $("#oprPhotos").value = "";
    clearOprPreview();
    $("#oprFormStatus").textContent = result.archive?.ok === false
      ? `OPR HEM selamat dalam sistem. ${result.archive.warning || "Salinan Google Drive belum berjaya."}`
      : "OPR HEM berjaya disimpan dalam sistem dan dua simpanan Google Drive.";
    state.opr.month = date.slice(0, 7); state.opr.selectedDate = date;
    $("#oprEntryPanel").hidden = true;
    document.body.classList.remove("opr-entry-open");
    await loadOprReports();
  } catch (error) {
    $("#oprFormStatus").textContent = error.message || "OPR HEM gagal disimpan.";
  } finally { $("#oprSave").disabled = false; }
}

const TICKER_SPEED_PX_PER_SECOND = 85;

function tickerText(messages) {
  return messages.map((item) => String(item.message || "").trim()).filter(Boolean).join(" • ");
}

function tickerUnit(text) {
  return `<span class="ticker-sequence">${safe(text)}<span class="ticker-divider" aria-hidden="true">•</span></span>`;
}

function renderSeamlessTicker(track, messages, speed = TICKER_SPEED_PX_PER_SECOND) {
  const text = tickerText(messages);
  if (!text) {
    track.innerHTML = "";
    track.classList.remove("is-running");
    track.style.removeProperty("--ticker-duration");
    return false;
  }

  const unit = tickerUnit(text);
  track.classList.remove("is-running");
  track.innerHTML = `<span class="ticker-group">${unit}</span><span class="ticker-group" aria-hidden="true">${unit}</span>`;

  requestAnimationFrame(() => {
    const groups = track.querySelectorAll(".ticker-group");
    if (groups.length !== 2) return;
    const viewportWidth = track.parentElement?.clientWidth || window.innerWidth;
    const unitWidth = Math.max(1, groups[0].scrollWidth);
    const repeats = Math.max(1, Math.ceil((viewportWidth + unitWidth) / unitWidth));
    const continuousContent = unit.repeat(repeats);
    groups[0].innerHTML = continuousContent;
    groups[1].innerHTML = continuousContent;
    const distance = Math.max(1, groups[0].scrollWidth);
    track.style.setProperty("--ticker-duration", `${Math.max(6, distance / speed).toFixed(2)}s`);
    void track.offsetWidth;
    track.classList.add("is-running");
  });
  return true;
}

function renderTicker() {
  const ticker = $("#globalNewsTicker"), track = $("#newsTickerTrack");
  const hasMessages = renderSeamlessTicker(track, state.content.announcements);
  ticker.hidden = !hasMessages;
  document.body.classList.toggle("ticker-visible", hasMessages);
}

function formatLetterDate(value) {
  return formatDisplayDate(value);
}

function formatAuditTime(value) {
  return formatDisplayDateTime(value);
}

function letterCard(letter, admin = false) {
  const fileLabel = letter.fileName || (letter.driveUrl ? "Buka di Google Drive" : "Buka surat");
  const audit = letter.lastEditedAt ? `Dikemas kini oleh <strong>${safe(letter.lastEditedBy || "—")}</strong> • ${safe(formatAuditTime(letter.lastEditedAt))}` : `Rekod asal • ${safe(formatAuditTime(letter.uploadedAt))}`;
  return `<article class="hem-letter-card"><div class="letter-card-top"><span class="category-badge">${safe(letter.category || "Surat HEM")}</span><time>${safe(formatLetterDate(letter.letterDate))}</time></div><h4>${safe(letter.title)}</h4><dl><div><dt>No. rujukan</dt><dd>${safe(letter.referenceNo || "—")}</dd></div><div><dt>Dimuat naik oleh</dt><dd>${safe(letter.updatedBy || "—")}</dd></div>${letter.note ? `<div><dt>Catatan</dt><dd>${safe(letter.note)}</dd></div>` : ""}</dl><div class="letter-card-actions"><a class="letter-open-button" href="${safe(letter.fileUrl || letter.driveUrl || "#")}" target="_blank" rel="noopener">📄 ${safe(fileLabel)} ↗</a>${admin ? "" : `<button class="record-edit-button" type="button" data-edit-letter="${safe(letter.id)}">✎ Edit surat</button>`}</div><p class="record-audit">${audit}</p>${admin ? `<small>Dimuat naik ${safe(formatAuditTime(letter.uploadedAt))}</small>` : ""}</article>`;
}

function requireRecordEditor() {
  const name = editorName();
  if (name) return name;
  setStatus("Pilih Nama pengisi dahulu sebelum mengedit rekod.", "error");
  $("#identityBar").hidden = false;
  $("#identityBar").scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => $("#editorName").focus(), 350);
  return "";
}

function openRecordEditor(type, id) {
  const editor = requireRecordEditor();
  if (!editor) return;
  const record = type === "opr"
    ? state.opr.reports.find((item) => String(item.id) === String(id))
    : [...state.content.latestLetters, ...state.content.letters].find((item) => String(item.id) === String(id));
  if (!record) return;
  state.editingRecord = record;
  $("#recordEditType").value = type; $("#recordEditId").value = id;
  $("#oprEditFields").hidden = type !== "opr"; $("#letterEditFields").hidden = type !== "letter";
  $("#oprEditFields").querySelectorAll("input,select,textarea").forEach((field) => { field.disabled = type !== "opr"; });
  $("#letterEditFields").querySelectorAll("input,select,textarea").forEach((field) => { field.disabled = type !== "letter"; });
  $("#recordEditTitle").textContent = type === "opr" ? "Edit OPR HEM" : "Edit Surat Menyurat HEM";
  $("#recordEditorName").textContent = editor; $("#recordEditStatus").textContent = "";
  if (type === "opr") {
    $("#editOprProgram").value = record.location || ""; $("#editOprDate").value = record.reportDate || state.date;
    $("#editOprPreparedBy").value = record.updatedBy || "";
  } else {
    $("#editLetterName").value = record.title || ""; $("#editLetterDate").value = record.letterDate || state.date;
    $("#editLetterCategory").value = record.category || "Surat Masuk"; $("#editLetterReference").value = record.referenceNo || "";
    $("#editLetterUpdatedBy").value = record.updatedBy || ""; $("#editLetterDriveUrl").value = record.driveUrl || "";
    $("#editLetterNote").value = record.note || "";
  }
  syncAllLocalizedDateInputs();
  $("#recordEditModal").hidden = false; document.body.classList.add("modal-open");
}

function closeRecordEditor() {
  state.editingRecord = null; $("#recordEditModal").hidden = true; document.body.classList.remove("modal-open");
}

async function saveRecordEdit(event) {
  event.preventDefault();
  const type = $("#recordEditType").value, id = $("#recordEditId").value, editor = requireRecordEditor();
  if (!editor) return;
  $("#recordEditSave").disabled = true; $("#recordEditStatus").textContent = "Menyimpan perubahan…";
  try {
    let response;
    if (type === "opr") {
      response = await fetch(SAFETY_API_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, program: $("#editOprProgram").value.trim(), date: $("#editOprDate").value, preparedBy: $("#editOprPreparedBy").value, editorName: editor }) });
    } else {
      response = await fetch(CONTENT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateLetter", id, title: $("#editLetterName").value.trim(), letterDate: $("#editLetterDate").value, category: $("#editLetterCategory").value, referenceNo: $("#editLetterReference").value.trim(), note: $("#editLetterNote").value.trim(), updatedBy: $("#editLetterUpdatedBy").value, driveUrl: $("#editLetterDriveUrl").value.trim(), editorName: editor }) });
    }
    const data = await responseJson(response, "Rekod gagal dikemas kini.");
    if (!response.ok) throw new Error(data.error || "Rekod gagal dikemas kini.");
    if (type === "opr") await loadOprReports();
    else {
      await loadPublicContent();
      if (!$("#letterArchive").hidden) { $("#letterArchive").hidden = true; await toggleLetterArchive(); }
      await loadOprReports();
    }
    closeRecordEditor(); setStatus(`Rekod berjaya dikemas kini oleh ${editor}.`, "saved");
  } catch (error) { $("#recordEditStatus").textContent = error.message || "Rekod gagal dikemas kini."; }
  finally { $("#recordEditSave").disabled = false; }
}

function renderPublicLetters() {
  if (document.body.dataset.activeView === "opr" && state.opr.allReports.length) { renderOprCalendarDetail(); return; }
  $("#latestLetterGrid").innerHTML = state.content.latestLetters.map((item) => letterCard(item)).join("");
  $("#letterListStatus").textContent = state.content.latestLetters.length ? `${state.content.latestLetters.length} surat HEM terbaharu.` : "Belum ada surat HEM dimuat naik.";
}

async function loadPublicContent(quiet = false) {
  if (state.content.loading) return;
  state.content.loading = true;
  try {
    const [announcementResponse, letterResponse] = await Promise.all([
      fetch(`${CONTENT_API_URL}?mode=announcements`, { cache: "no-store" }),
      fetch(`${CONTENT_API_URL}?mode=letters`, { cache: "no-store" }),
    ]);
    const [announcementData, letterData] = await Promise.all([
      responseJson(announcementResponse, "Makluman tidak dapat dibuka."),
      responseJson(letterResponse, "Surat HEM tidak dapat dibuka."),
    ]);
    if (!announcementResponse.ok) throw new Error(announcementData.error || "Makluman tidak dapat dibuka.");
    if (!letterResponse.ok) throw new Error(letterData.error || "Surat HEM tidak dapat dibuka.");
    state.content.announcements = Array.isArray(announcementData.announcements) ? announcementData.announcements : [];
    state.content.latestLetters = Array.isArray(letterData.letters) ? letterData.letters.slice(0, 2) : [];
    renderTicker(); renderPublicLetters();
  } catch (error) {
    if (!quiet) $("#letterListStatus").textContent = error.message || "Kandungan HEM tidak dapat dibuka.";
  } finally { state.content.loading = false; }
}

async function toggleLetterArchive() {
  const archive = $("#letterArchive"), opening = archive.hidden;
  archive.hidden = !opening;
  $("#letterArchiveToggle").setAttribute("aria-expanded", String(opening));
  $("#letterArchiveToggle").textContent = opening ? "Tutup Arkib Surat" : "Lihat Semua Surat HEM";
  if (!opening) return;
  $("#letterArchiveStatus").textContent = "Memuatkan arkib surat…";
  try {
    const response = await fetch(`${CONTENT_API_URL}?mode=letters&all=1`, { cache: "no-store" });
    const data = await responseJson(response, "Arkib surat tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "Arkib surat tidak dapat dibuka.");
    state.content.letters = Array.isArray(data.letters) ? data.letters : [];
    $("#letterArchiveGrid").innerHTML = state.content.letters.map((item) => letterCard(item)).join("");
    $("#letterArchiveStatus").textContent = state.content.letters.length ? `${state.content.letters.length} surat tersimpan dalam arkib.` : "Arkib surat masih kosong.";
  } catch (error) { $("#letterArchiveStatus").textContent = error.message || "Arkib surat tidak dapat dibuka."; }
}

function renderAdminAnnouncements() {
  $("#adminAnnouncementList").innerHTML = state.content.adminAnnouncements.map((item, index) => `<article class="admin-announcement-row" data-announcement-index="${index}"><span class="announcement-order">${index + 1}</span><textarea data-announcement-message maxlength="500" rows="2" aria-label="Teks makluman ${index + 1}">${safe(item.message || "")}</textarea><div class="announcement-actions"><button type="button" data-announcement-move="up" aria-label="Naikkan makluman" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-announcement-move="down" aria-label="Turunkan makluman" ${index === state.content.adminAnnouncements.length - 1 ? "disabled" : ""}>↓</button><button class="${item.active === false ? "inactive" : "active"}" type="button" data-announcement-toggle>${item.active === false ? "Tidak aktif" : "Aktif"}</button><button class="danger" type="button" data-announcement-delete>Padam</button></div></article>`).join("") || '<p class="monitoring-empty">Belum ada makluman. Tekan “+ Tambah makluman”.</p>';
  renderAdminTickerPreview();
}

function syncAdminAnnouncements() {
  document.querySelectorAll("[data-announcement-index]").forEach((row) => {
    const index = Number(row.dataset.announcementIndex);
    if (state.content.adminAnnouncements[index]) state.content.adminAnnouncements[index].message = row.querySelector("[data-announcement-message]").value;
  });
}

function renderAdminTickerPreview() {
  const active = state.content.adminAnnouncements.filter((item) => item.active !== false && String(item.message || "").trim());
  const track = $("#adminTickerPreviewTrack");
  if (!renderSeamlessTicker(track, active, 78)) track.innerHTML = '<span class="ticker-empty">Pratonton makluman akan muncul di sini.</span>';
}

function renderAdminLetters() {
  $("#adminLetterList").innerHTML = state.content.letters.length ? `<h3>Arkib semasa (${state.content.letters.length})</h3><div class="hem-letter-grid">${state.content.letters.map((item) => letterCard(item, true)).join("")}</div>` : '<p class="monitoring-empty">Belum ada surat HEM disimpan.</p>';
}

async function loadAdminContent() {
  const response = await fetch(CONTENT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "readAdmin", adminPin: state.adminPin }) });
  const data = await responseJson(response, "Kandungan pentadbir tidak dapat dibuka.");
  if (!response.ok) throw new Error(data.error || "Kandungan pentadbir tidak dapat dibuka.");
  state.content.adminAnnouncements = (Array.isArray(data.announcements) ? data.announcements : []).map((item) => ({ ...item, active: Boolean(item.active) }));
  state.content.deletedAnnouncementIds = [];
  state.content.letters = Array.isArray(data.letters) ? data.letters : [];
  renderAdminAnnouncements(); renderAdminLetters(); refreshStaffNameChoices();
}

async function saveAdminAnnouncements() {
  syncAdminAnnouncements();
  if (state.content.adminAnnouncements.some((item) => !String(item.message || "").trim())) { $("#adminAnnouncementStatus").textContent = "Isi teks semua makluman atau padam baris kosong."; return; }
  $("#adminAnnouncementSave").disabled = true; $("#adminAnnouncementStatus").textContent = "Menyimpan…";
  try {
    const response = await fetch(CONTENT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveAnnouncements", adminPin: state.adminPin, entries: state.content.adminAnnouncements, deletedIds: state.content.deletedAnnouncementIds }) });
    const data = await responseJson(response, "Makluman gagal disimpan.");
    if (!response.ok) throw new Error(data.error || "Makluman gagal disimpan.");
    state.content.adminAnnouncements = (data.announcements || []).map((item) => ({ ...item, active: Boolean(item.active) }));
    state.content.deletedAnnouncementIds = [];
    renderAdminAnnouncements(); await loadPublicContent();
    $("#adminAnnouncementStatus").textContent = "Makluman berjaya dikemas kini untuk semua peranti.";
  } catch (error) { $("#adminAnnouncementStatus").textContent = error.message || "Makluman gagal disimpan."; }
  finally { $("#adminAnnouncementSave").disabled = false; }
}

async function encodeLetterFile(file) {
  if (!file) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error("Fail surat mestilah tidak melebihi 8 MB.");
  const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) throw new Error("Gunakan fail PDF, DOC, DOCX, JPG, PNG atau WebP sahaja.");
  const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("Fail tidak dapat dibaca.")); reader.readAsDataURL(file); });
  return { name: file.name, type: file.type, data };
}

async function saveLetter(event) {
  event.preventDefault();
  const fileInput = $("#letterFile"), driveUrl = $("#letterDriveUrl").value.trim();
  if (!fileInput.files?.[0] && !driveUrl) { $("#letterStatus").textContent = "Pilih fail surat atau masukkan pautan Google Drive."; return; }
  $("#letterSave").disabled = true; $("#letterStatus").textContent = "Memuat naik dan menyimpan surat…";
  try {
    const file = await encodeLetterFile(fileInput.files?.[0]);
    const payload = { action: "createLetter", title: $("#letterName").value.trim(), letterDate: $("#letterDate").value, category: $("#letterCategory").value, referenceNo: $("#letterReference").value.trim(), note: $("#letterNote").value.trim(), updatedBy: $("#letterUpdatedBy").value, driveUrl, file };
    const response = await fetch(CONTENT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await responseJson(response, "Surat gagal disimpan.");
    if (!response.ok) throw new Error(data.error || "Surat gagal disimpan.");
    $("#letterForm").reset(); $("#letterDate").value = state.date; syncAllLocalizedDateInputs(); refreshStaffNameChoices();
    await loadPublicContent();
    if (!$("#letterArchive").hidden) { $("#letterArchive").hidden = true; await toggleLetterArchive(); }
    const savedDate = payload.letterDate || state.date;
    state.opr.month = savedDate.slice(0, 7); state.opr.selectedDate = savedDate;
    $("#letterEntryPanel").hidden = true;
    document.body.classList.remove("opr-entry-open");
    await loadOprReports();
    $("#letterStatus").textContent = data.archive?.ok === false
      ? `Surat selamat dalam sistem. ${data.archive.warning || "Salinan Google Drive belum berjaya."}`
      : file
        ? "Surat berjaya disimpan dalam sistem dan dua simpanan Google Drive."
        : "Surat berjaya disimpan melalui pautan Google Drive yang diberikan.";
  } catch (error) { $("#letterStatus").textContent = error.message || "Surat gagal disimpan."; }
  finally { $("#letterSave").disabled = false; }
}

function visibleClasses() {
  return state.session === "all" ? state.classes : state.classes.filter((row) => classSession(row) === state.session);
}

function updateSessionVisibility() {
  document.querySelectorAll("[data-report-session]").forEach((element) => {
    element.classList.toggle("session-hidden", state.session !== "all" && element.dataset.reportSession !== state.session);
  });
}

function setStatus(message, type = "") {
  const element = $("#saveStatus");
  element.textContent = message;
  element.className = `save-status ${type}`.trim();
  const attendanceStatus = $("#attendanceSyncStatus");
  if (attendanceStatus) {
    attendanceStatus.textContent = message;
    attendanceStatus.className = `attendance-sync-status ${type}`.trim();
  }
}

function updateDateHeading() {
  const date = dateObject(state.date);
  if (Number.isNaN(date.getTime())) return;
  const longDate = formatDisplayDate(state.date);
  const weekday = new Intl.DateTimeFormat("ms-MY", { weekday: "long", timeZone: "UTC" }).format(date);
  $("#dateLong").textContent = longDate;
  $("#dayLong").textContent = weekday;
  $("#homeSummaryDate").textContent = `${longDate} • ${weekday}`;
  $("#monitoringDateLabel").textContent = longDate;
}

function renderAttendance() {
  const rows = visibleClasses();
  $("#sessionReportLabel").textContent = SESSION_LABELS[state.session] || SESSION_LABELS.all;
  $("#attendanceBody").innerHTML = rows.map((row, index) => {
    const f = classFigures(row);
    const syncState = classSyncState(row.id);
    const complete = syncState === "complete";
    return `<tr class="${complete ? "class-complete" : "class-incomplete"}${syncState === "saving" ? " class-saving" : ""}${syncState === "pending" ? " class-pending" : ""}${syncState === "error" ? " class-error" : ""}" data-class-id="${safe(row.id)}">
      <td class="attendance-index" data-label="Bil">${index + 1}</td><td class="attendance-teacher" data-label="Guru kelas">${safe(row.teacherName || "—")}${teacherCompletionBadgeMarkup(row.id)}${classConfirmButtonMarkup(row.id)}</td><td class="attendance-class" data-label="Kelas"><strong>${safe(row.name)}</strong></td><td class="attendance-status" data-class-status>${classStatusMarkup(row.id)}</td>
      <td class="attendance-metric" data-label="Daftar L">${f.enrolMale}</td><td class="attendance-metric" data-label="Daftar P">${f.enrolFemale}</td><td class="attendance-metric" data-label="Daftar Jumlah"><strong>${f.enrolTotal}</strong></td>
      <td class="attendance-metric" data-label="Hadir L">${f.presentMale}</td><td class="attendance-metric" data-label="Hadir P">${f.presentFemale}</td><td class="attendance-metric" data-label="Hadir Jumlah"><strong>${f.presentTotal}</strong></td><td class="attendance-percent" data-label="Peratus hadir"><strong>${percent(f.presentTotal, f.enrolTotal)}</strong></td>
      <td class="attendance-metric attendance-edit" data-label="Tidak hadir L"><input class="cell-input num-input${auditDetails("attendance", row.id, "absentMale").className}" type="number" inputmode="numeric" min="0" max="${f.enrolMale}" value="${f.absentMale}" data-field="absentMale" aria-label="Lelaki tidak hadir ${safe(row.name)}" title="${safe(auditDetails("attendance", row.id, "absentMale").title)}"></td>
      <td class="attendance-metric attendance-edit" data-label="Tidak hadir P"><input class="cell-input num-input${auditDetails("attendance", row.id, "absentFemale").className}" type="number" inputmode="numeric" min="0" max="${f.enrolFemale}" value="${f.absentFemale}" data-field="absentFemale" aria-label="Perempuan tidak hadir ${safe(row.name)}" title="${safe(auditDetails("attendance", row.id, "absentFemale").title)}"></td>
      <td class="attendance-metric" data-label="Tidak hadir Jumlah"><strong>${f.absentTotal}</strong></td><td class="attendance-percent attendance-absent-percent" data-label="Peratus tidak hadir">${percent(f.absentTotal, f.enrolTotal)}</td>
      <td class="attendance-note" data-label="Senarai murid tidak hadir"><input class="cell-input note-input${auditDetails("attendance", row.id, "note").className}" type="text" value="${safe(row.note)}" data-field="note" placeholder="Nama murid tidak hadir" aria-label="Senarai murid tidak hadir ${safe(row.name)}" title="${safe(auditDetails("attendance", row.id, "note").title)}"></td>
    </tr>`;
  }).join("");
  renderClassCompletionLists();
  renderTotals();
}

function renderHomeClassTotals() {
  const groups = [
    { selector: "#homeAfternoonClasses", years: [1, 2, 3] },
    { selector: "#homeMorningClasses", years: [4, 5, 6] },
  ];
  for (const group of groups) {
    const target = $(group.selector);
    if (!target) continue;
    const rows = state.classes.filter((row) => {
      const match = String(row.id || "").match(/^tahun-([1-6])-/);
      return match && group.years.includes(Number(match[1]));
    });
    target.innerHTML = rows.length
      ? `<p class="home-class-hint">Pilih kelas untuk melihat pecahan kaum murid.</p>${rows.map((row) => {
        const total = classFigures(row).enrolTotal;
        const breakdown = Object.entries(CLASS_ETHNICITY_COUNTS[String(row.id)] || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ms"));
        const ethnicity = breakdown.length
          ? `<div class="home-ethnicity-breakdown" aria-label="Pecahan kaum ${safe(row.name)}">${breakdown.map(([name, countValue]) => `<span><strong>${safe(name.toLocaleLowerCase("ms").replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("ms")))}</strong><em>${countValue}</em></span>`).join("")}</div>`
          : '<div class="home-ethnicity-breakdown"><span>Maklumat kaum belum tersedia.</span></div>';
        return `<details class="home-class-total"><summary title="Pilih untuk lihat pecahan kaum ${safe(row.name)}"><span>${safe(row.name)}</span><b aria-label="${total} murid">${total}</b></summary>${ethnicity}</details>`;
      }).join("")}`
      : "<p>Tiada maklumat kelas.</p>";
  }
}

function renderEnrolmentOverview() {
  const levelTotals = new Map([["Prasekolah", { male: 0, female: 0, total: 0 }]]);
  for (let year = 1; year <= 6; year += 1) levelTotals.set(`Tahun ${year}`, { male: 0, female: 0, total: 0 });
  for (const row of state.classes) {
    const figures = classFigures(row);
    const yearMatch = String(row.id || "").match(/^tahun-([1-6])-/);
    const key = String(row.id || "").startsWith("pra-") ? "Prasekolah" : yearMatch ? `Tahun ${yearMatch[1]}` : "";
    if (!key || !levelTotals.has(key)) continue;
    const item = levelTotals.get(key);
    item.male += figures.enrolMale;
    item.female += figures.enrolFemale;
    item.total += figures.enrolTotal;
  }
  const preschool = levelTotals.get("Prasekolah");
  const primary = [...levelTotals.entries()].filter(([key]) => key.startsWith("Tahun ")).reduce((sum, [, item]) => ({
    male: sum.male + item.male, female: sum.female + item.female, total: sum.total + item.total,
  }), { male: 0, female: 0, total: 0 });
  $("#primaryEnrolTotal").textContent = primary.total;
  $("#preschoolEnrolTotal").textContent = preschool.total;
  $("#schoolEnrolTotal").textContent = primary.total + preschool.total;
  $("#primaryMaleTotal").textContent = primary.male;
  $("#primaryFemaleTotal").textContent = primary.female;
  $("#yearEnrolTotals").innerHTML = [...levelTotals.entries()].map(([label, item]) => `<span><b>${safe(label)}</b><strong>${item.total}</strong></span>`).join("");
}

function renderTotals() {
  const totals = visibleClasses().reduce((sum, row) => {
    const f = classFigures(row);
    Object.keys(f).forEach((key) => { sum[key] = (sum[key] || 0) + f[key]; });
    return sum;
  }, {});
  const totalLabel = state.session === "all" ? "JUMLAH KESELURUHAN" : `JUMLAH ${SESSION_LABELS[state.session]}`;
  const completedCount = visibleClasses().filter((row) => classIsCompleted(row.id)).length;
  $("#attendanceTotals").innerHTML = `<tr><td class="attendance-total-title" colspan="3">${totalLabel}</td><td data-label="Kelas selesai"><strong>${completedCount}/${visibleClasses().length}</strong></td><td data-label="Daftar L">${totals.enrolMale || 0}</td><td data-label="Daftar P">${totals.enrolFemale || 0}</td><td data-label="Daftar Jumlah">${totals.enrolTotal || 0}</td><td data-label="Hadir L">${totals.presentMale || 0}</td><td data-label="Hadir P">${totals.presentFemale || 0}</td><td data-label="Hadir Jumlah">${totals.presentTotal || 0}</td><td class="attendance-total-percent" data-label="Peratus hadir">${percent(totals.presentTotal || 0, totals.enrolTotal || 0)}</td><td data-label="Tidak hadir L">${totals.absentMale || 0}</td><td data-label="Tidak hadir P">${totals.absentFemale || 0}</td><td data-label="Tidak hadir Jumlah">${totals.absentTotal || 0}</td><td class="attendance-total-percent" data-label="Peratus tidak hadir">${percent(totals.absentTotal || 0, totals.enrolTotal || 0)}</td><td class="attendance-total-note"></td></tr>`;
  $("#summaryEnrol").textContent = totals.enrolTotal || 0;
  $("#summaryPresent").textContent = totals.presentTotal || 0;
  $("#summaryAbsent").textContent = totals.absentTotal || 0;
  $("#summaryPercent").textContent = percent(totals.presentTotal || 0, totals.enrolTotal || 0);
  renderEnrolmentOverview();
  renderHomeClassTotals();
}

function renderDutyTeachers() {
  const editing = Boolean(state.dutyWeek.editing);
  for (const session of ["morning", "afternoon"]) {
    while (state.dutyTeachers[session].length < 5) state.dutyTeachers[session].push("");
    state.dutyTeachers[session] = state.dutyTeachers[session].slice(0, 5);
    const target = session === "morning" ? $("#dutyMorningBody") : $("#dutyAfternoonBody");
    target.innerHTML = state.dutyTeachers[session].map((teacherName, index) => {
      const recordId = `${session}:${index + 1}`;
      const details = auditDetails("duty", recordId, "teacherName");
      return `<tr data-duty-session="${session}" data-duty-index="${index}"${!editing && !teacherName ? " hidden" : ""}><td>${index + 1}</td><td><select class="cell-input staff-name-select${details.className}" data-field="teacherName" aria-label="Guru bertugas ${SESSION_LABELS[session]} ${index + 1}" title="${safe(details.title)}"${editing ? "" : " disabled"}>${staffSelectOptions(teacherName, "Pilih nama guru")}</select></td></tr>`;
    }).join("");
  }
  const dates = state.dutyWeek.anchor && state.dutyWeek.end ? `${formatDisplayDate(state.dutyWeek.anchor)} – ${formatDisplayDate(state.dutyWeek.end)}` : "Memuatkan minggu…";
  $("#dutyWeekLabel").textContent = dates;
  const selectedCount = ["morning", "afternoon"].flatMap((session) => state.dutyTeachers[session] || []).filter(Boolean).length;
  $("#dutyWeekState").textContent = editing ? (selectedCount ? "Sedang diedit" : "Belum diisi") : `🔒 Terkunci • ${selectedCount} guru`;
  $("#dutyWeekState").classList.toggle("locked", !editing && selectedCount > 0);
  $("#dutyWeekEdit").hidden = editing || !selectedCount;
  $("#dutyWeekSave").hidden = !editing;
  updateEditingAccess();
}

function decodeAbsenceReason(value) {
  const text = String(value || "");
  if (text.startsWith("[v2]")) {
    const [reason = "", ...noteParts] = text.slice(4).split("|||");
    return { reasonCategory: reason, reasonNote: noteParts.join("|||") };
  }
  const known = ABSENCE_REASONS.find((item) => text === item || text.startsWith(`${item} — `));
  return known ? { reasonCategory: known, reasonNote: text.slice(known.length).replace(/^\s*—\s*/, "") } : { reasonCategory: text ? "Lain-lain" : "", reasonNote: text };
}

function encodeAbsenceReason(row) {
  const reason = String(row.reasonCategory || "").trim();
  const note = String(row.reasonNote || "").trim();
  return reason || note ? `[v2]${reason}|||${note}` : "";
}

function staffAbsenceRowHasValue(row = {}) {
  return Boolean(String(row.staffName || "").trim() || String(row.reasonCategory || "").trim() || String(row.reasonNote || "").trim());
}

function setStaffSessionPanel(session = "morning") {
  document.querySelectorAll("[data-staff-session-tab]").forEach((button) => {
    const active = button.dataset.staffSessionTab === session;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-staff-session-panel]").forEach((panel) => { panel.hidden = panel.dataset.staffSessionPanel !== session; });
}

function syncStaffCompactUI(session) {
  const rows = Array.isArray(state.staffAbsences[session]) ? state.staffAbsences[session] : [];
  const target = session === "morning" ? $("#staffMorningBody") : $("#staffAfternoonBody");
  const countTarget = session === "morning" ? $("#staffMorningCount") : $("#staffAfternoonCount");
  const filledCount = rows.filter(staffAbsenceRowHasValue).length;
  countTarget.textContent = filledCount;
  countTarget.title = `${filledCount} rekod diisi`;
  let lastFilledIndex = -1;
  rows.forEach((row, index) => { if (staffAbsenceRowHasValue(row)) lastFilledIndex = index; });
  const requestedCount = Math.max(1, Number(state.staffVisibleRows[session]) || 1);
  const visibleCount = Math.min(rows.length, Math.max(requestedCount, lastFilledIndex + 1));
  state.staffVisibleRows[session] = visibleCount;
  Array.from(target.querySelectorAll("tr[data-staff-index]")).forEach((row, index) => { row.hidden = index >= visibleCount; });
  const addButton = document.querySelector(`[data-staff-add="${session}"]`);
  if (addButton) addButton.hidden = visibleCount >= rows.length;
}

function renderStaff() {
  for (const session of ["morning", "afternoon"]) {
    const rows = Array.isArray(state.staffAbsences[session]) ? state.staffAbsences[session] : [];
    while (rows.length < 8) rows.push({ staffName: "", reason: "", reasonCategory: "", reasonNote: "" });
    state.staffAbsences[session] = rows.slice(0, 8);
    const target = session === "morning" ? $("#staffMorningBody") : $("#staffAfternoonBody");
    target.innerHTML = state.staffAbsences[session].map((row, index) => {
      const recordId = `${session}:${index + 1}`;
      const staffAudit = auditDetails("staff", recordId, "staffName");
      const savedName = String(row.staffName || "");
      const decoded = row.reasonCategory !== undefined ? row : decodeAbsenceReason(row.reason);
      row.reasonCategory = decoded.reasonCategory || ""; row.reasonNote = decoded.reasonNote || "";
      const required = row.reasonCategory === "Lain-lain" ? " required" : "";
      const reasonOptions = [`<option value="">Pilih sebab</option>`, ...ABSENCE_REASONS.map((reason) => `<option value="${safe(reason)}"${row.reasonCategory === reason ? " selected" : ""}>${safe(reason)}</option>`)].join("");
      return `<tr data-staff-session="${session}" data-staff-index="${index}"><td>${index + 1}</td><td><select class="cell-input staff-name-select${staffAudit.className}" data-field="staffName" aria-label="Nama guru atau AKP ${SESSION_LABELS[session]} ${index + 1}" title="${safe(staffAudit.title)}">${staffSelectOptions(savedName)}</select></td><td><select class="cell-input absence-reason" data-field="reasonCategory" aria-label="Sebab ${SESSION_LABELS[session]} ${index + 1}">${reasonOptions}</select></td><td><input class="cell-input" data-field="reasonNote" value="${safe(row.reasonNote || "")}" placeholder="${row.reasonCategory === "Lain-lain" ? "Nyatakan sebab (wajib)" : "Catatan tambahan (pilihan)"}"${required}></td></tr>`;
    }).join("");
    syncStaffCompactUI(session);
  }
  updateEditingAccess();
}

function renderMeta() {
  for (const [selector, field] of [["#reportNoteMorning", "noteMorning"], ["#preparedByMorning", "preparedByMorning"], ["#reportNoteAfternoon", "noteAfternoon"], ["#preparedByAfternoon", "preparedByAfternoon"], ["#approvedByMorning", "approvedByMorning"], ["#approvedTitleMorning", "approvedTitleMorning"], ["#approvedByAfternoon", "approvedByAfternoon"], ["#approvedTitleAfternoon", "approvedTitleAfternoon"]]) {
    const element = $(selector); if (element) element.value = state.meta[field] || "";
  }
  const legacyApproval = [state.meta.approvedBy, state.meta.approvedTitle].filter(Boolean).join(" · ");
  if ($("#legacyApprovalNote")) $("#legacyApprovalNote").hidden = !legacyApproval;
  if ($("#legacyApprovalValue")) $("#legacyApprovalValue").textContent = legacyApproval;
  for (const [selector, field] of [["#reportNoteMorning", "noteMorning"], ["#preparedByMorning", "preparedByMorning"], ["#reportNoteAfternoon", "noteAfternoon"], ["#preparedByAfternoon", "preparedByAfternoon"], ["#approvedByMorning", "approvedByMorning"], ["#approvedTitleMorning", "approvedTitleMorning"], ["#approvedByAfternoon", "approvedByAfternoon"], ["#approvedTitleAfternoon", "approvedTitleAfternoon"]]) {
    const element = $(selector);
    if (!element) continue;
    const details = auditDetails("meta", "report", field);
    element.title = details.title;
    element.classList.toggle("has-audit", Boolean(details.title));
  }
  updateEditingAccess();
}

function renderAdminClasses() {
  $("#adminClassBody").innerHTML = state.classes.map((row) => `<tr data-admin-class-id="${safe(row.id)}">
    <td><strong>${safe(row.name)}</strong></td>
    <td><input data-admin-field="teacherName" type="text" maxlength="140" value="${safe(row.teacherName)}" aria-label="Nama guru kelas ${safe(row.name)}"></td>
    <td><input data-admin-field="enrolMale" type="number" min="0" max="300" inputmode="numeric" value="${count(row.enrolMale)}" aria-label="Bilangan murid lelaki ${safe(row.name)}"></td>
    <td><input data-admin-field="enrolFemale" type="number" min="0" max="300" inputmode="numeric" value="${count(row.enrolFemale)}" aria-label="Bilangan murid perempuan ${safe(row.name)}"></td>
  </tr>`).join("");
}

function renderAdminStaffDirectory() {
  $("#adminStaffBody").innerHTML = state.adminStaffDirectory.map((item, index) => {
    const active = item.active !== false;
    return `<tr data-admin-staff-id="${item.id || ""}" data-admin-staff-active="${active}">
      <td>${index + 1}</td>
      <td><input data-admin-staff-name type="text" maxlength="140" value="${safe(item.name)}" aria-label="Nama guru atau AKP ${index + 1}"></td>
      <td><span class="staff-status ${active ? "active" : "inactive"}">${active ? "Aktif" : "Tidak aktif"}</span></td>
      <td><button class="staff-toggle-button ${active ? "deactivate" : "activate"}" type="button" data-admin-staff-toggle>${active ? "Nyahaktif" : "Aktifkan"}</button></td>
    </tr>`;
  }).join("");
}

function renderSchoolStats() {
  $("#teacherStat").textContent = count(state.schoolStats.teachers, 500);
  $("#akpStat").textContent = count(state.schoolStats.akp, 100);
  if ($("#adminTeacherCount")) $("#adminTeacherCount").value = count(state.schoolStats.teachers, 500);
  if ($("#adminAkpCount")) $("#adminAkpCount").value = count(state.schoolStats.akp, 100);
}

function addAdminStaffRow() {
  syncAdminStaffDirectoryFromRows();
  state.adminStaffDirectory.push({ id: null, name: "", active: true });
  renderAdminStaffDirectory();
  $("#adminStaffBody tr:last-child input")?.focus();
}

function syncAdminStaffDirectoryFromRows() {
  state.adminStaffDirectory = Array.from(document.querySelectorAll("#adminStaffBody tr")).map((row) => ({
    id: row.dataset.adminStaffId ? Number(row.dataset.adminStaffId) : null,
    name: row.querySelector("[data-admin-staff-name]").value.trim(),
    active: row.dataset.adminStaffActive === "true",
  }));
}

function organizationStaffOptions(selectedId) {
  return `<option value="">Pilih guru / pegawai</option>${state.adminStaffDirectory.map((item) => `<option value="${Number(item.id) || ""}"${Number(item.id) === Number(selectedId) ? " selected" : ""}>${safe(item.name)}${item.active === false ? " (tidak aktif)" : ""}</option>`).join("")}`;
}

function renderAdminOrganization() {
  const target = $("#adminOrganizationList");
  if (!state.organization.adminItems.length) {
    target.innerHTML = '<p class="organization-admin-empty">Belum ada rekod. Tekan “+ Tambah pegawai / bidang”.</p>';
    return;
  }
  target.innerHTML = state.organization.adminItems.map((item, index) => `<article class="organization-admin-card" data-organization-index="${index}" data-organization-id="${safe(item.id || "")}">
    <div class="organization-photo-editor">
      <div class="organization-photo-preview">${organizationPortrait(item, true)}</div>
      <label class="secondary-button organization-photo-button">Upload / Tukar gambar<input data-organization-photo type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden></label>
      <button class="organization-remove-photo" data-organization-remove-photo type="button"${item.photoUrl || item._previewUrl ? "" : " disabled"}>Padam gambar</button>
    </div>
    <div class="organization-admin-fields">
      <label>Nama pegawai<select data-organization-field="staffId" required>${organizationStaffOptions(item.staffId)}</select></label>
      <label>Jawatan<input data-organization-field="positionTitle" type="text" maxlength="100" value="${safe(item.positionTitle || "")}" placeholder="Contoh: Penyelaras"></label>
      <label>Bidang HEM<input data-organization-field="fieldName" type="text" maxlength="140" value="${safe(item.fieldName || "")}" placeholder="Contoh: Disiplin &amp; Sahsiah Murid"></label>
      <label>Peranan<input data-organization-field="roleLabel" type="text" maxlength="100" value="${safe(item.roleLabel || "")}" placeholder="Contoh: Penyelaras / AJK"></label>
      <label>Tahap hierarki<select data-organization-field="hierarchyLevel">${[[1,"1 - Guru Besar"],[2,"2 - Penolong Kanan HEM"],[3,"3 - Setiausaha HEM"],[4,"4 - Penyelaras Unit"],[5,"5 - AJK / Pegawai"]].map(([value,label]) => `<option value="${value}"${Number(item.hierarchyLevel) === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
      <label>Susunan<input data-organization-field="sortOrder" type="number" min="1" max="999" value="${count(item.sortOrder || index + 1, 999)}"></label>
    </div>
    <div class="organization-admin-actions">
      <span class="staff-status ${item.active === false ? "inactive" : "active"}">${item.active === false ? "Tidak aktif" : "Aktif"}</span>
      <button class="staff-toggle-button ${item.active === false ? "activate" : "deactivate"}" data-organization-toggle type="button">${item.active === false ? "Aktifkan" : "Nyahaktif"}</button>
      <button class="organization-delete-button" data-organization-delete type="button">Padam rekod</button>
    </div>
  </article>`).join("");
}

function syncAdminOrganizationFromRows() {
  document.querySelectorAll("#adminOrganizationList [data-organization-index]").forEach((row) => {
    const index = Number(row.dataset.organizationIndex), item = state.organization.adminItems[index];
    if (!item) return;
    for (const field of ["staffId", "positionTitle", "fieldName", "roleLabel", "hierarchyLevel", "sortOrder"]) {
      const input = row.querySelector(`[data-organization-field="${field}"]`);
      if (!input) continue;
      item[field] = ["staffId", "hierarchyLevel", "sortOrder"].includes(field) ? Number(input.value) : input.value.trim();
    }
  });
}

function addOrganizationRow() {
  syncAdminOrganizationFromRows();
  state.organization.adminItems.push({ id: "", staffId: "", staffName: "", fieldName: "", positionTitle: "Penyelaras", roleLabel: "Penyelaras", hierarchyLevel: 4, sortOrder: state.organization.adminItems.length + 1, active: true, photoUrl: "", removePhoto: false });
  renderAdminOrganization();
  $("#adminOrganizationList [data-organization-index]:last-child select")?.focus();
}

async function loadAdminOrganization() {
  $("#adminOrganizationStatus").textContent = "Memuatkan organisasi HEM…";
  try {
    const response = await fetch(ORGANIZATION_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "readAdmin", adminPin: state.adminPin }) });
    const data = await responseJson(response, "Organisasi HEM tidak dapat dibuka.");
    if (!response.ok) throw new Error(data.error || "Organisasi HEM tidak dapat dibuka.");
    state.organization.adminItems = (Array.isArray(data.organization) ? data.organization : []).map((item) => ({ ...item, _file: null, _previewUrl: "", removePhoto: false }));
    state.organization.deletedIds = [];
    renderAdminOrganization();
    $("#adminOrganizationStatus").textContent = "Organisasi HEM sedia untuk dikemas kini.";
  } catch (error) { $("#adminOrganizationStatus").textContent = error.message || "Organisasi HEM tidak dapat dibuka."; }
}

async function prepareOrganizationPhoto(file) {
  if (!file || !(file.type || "").startsWith("image/") || file.size > 25 * 1024 * 1024) throw new Error("Pilih gambar JPG, PNG atau WebP yang tidak melebihi 25 MB.");
  const image = await loadMonitoringImage(file), size = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, Math.round((image.naturalWidth - size) / 2)), sourceY = Math.max(0, Math.round((image.naturalHeight - size) / 2));
  const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 640;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Gambar profil tidak dapat diproses.");
  context.fillStyle = "#ffffff"; context.fillRect(0, 0, 640, 640); context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 640, 640);
  const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Gambar profil tidak dapat dikecilkan.")), "image/jpeg", 0.86));
  return { name: "profil-hem.jpg", type: "image/jpeg", data: await readBlobAsBase64(blob) };
}

async function saveOrganization() {
  syncAdminOrganizationFromRows();
  const items = state.organization.adminItems;
  if (!items.length || items.some((item) => !Number(item.staffId) || !item.fieldName || !item.positionTitle || !item.roleLabel)) {
    $("#adminOrganizationStatus").textContent = "Lengkapkan nama, bidang, jawatan dan peranan bagi setiap rekod."; return;
  }
  $("#adminOrganizationSave").disabled = true; $("#adminOrganizationStatus").textContent = "Memproses gambar dan menyimpan…";
  try {
    const entries = [];
    for (const item of items) entries.push({
      id: item.id || "", staffId: Number(item.staffId), fieldName: item.fieldName, positionTitle: item.positionTitle, roleLabel: item.roleLabel,
      hierarchyLevel: Number(item.hierarchyLevel), sortOrder: Number(item.sortOrder), active: item.active !== false, removePhoto: item.removePhoto === true,
      photo: item._file ? await prepareOrganizationPhoto(item._file) : null,
    });
    const response = await fetch(ORGANIZATION_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveOrganization", adminPin: state.adminPin, entries, deletedIds: state.organization.deletedIds }) });
    const data = await responseJson(response, "Organisasi HEM gagal disimpan.");
    if (!response.ok) throw new Error(data.error || "Organisasi HEM gagal disimpan.");
    for (const item of state.organization.adminItems) if (item._previewUrl) URL.revokeObjectURL(item._previewUrl);
    state.organization.adminItems = (Array.isArray(data.organization) ? data.organization : []).map((item) => ({ ...item, _file: null, _previewUrl: "", removePhoto: false }));
    state.organization.deletedIds = [];
    state.organization.items = state.organization.adminItems.filter((item) => item.active !== false);
    renderAdminOrganization(); renderOrganization();
    $("#adminOrganizationStatus").textContent = "Organisasi HEM berjaya disimpan dan dikemas kini pada semua peranti.";
  } catch (error) { $("#adminOrganizationStatus").textContent = error.message || "Organisasi HEM gagal disimpan."; }
  finally { $("#adminOrganizationSave").disabled = false; }
}

function showAdminLogin(message = "") {
  state.adminPin = "";
  $("#adminSettingsView").hidden = true;
  $("#adminLoginView").hidden = false;
  $("#adminPin").value = "";
  $("#adminError").textContent = message;
  setTimeout(() => $("#adminPin").focus(), 0);
}

function closeAdminModal() {
  state.adminPin = "";
  $("#adminPin").value = "";
  $("#adminModal").hidden = true;
  document.body.classList.remove("modal-open");
}

async function verifyAdmin(event) {
  event.preventDefault();
  const pin = $("#adminPin").value;
  $("#adminError").textContent = "Mengesahkan…";
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verifyAdmin", adminPin: pin }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Kod admin tidak sah.");
    state.adminPin = pin;
    state.adminStaffDirectory = Array.isArray(data.staffDirectory) ? data.staffDirectory.map((item) => ({ ...item, active: Boolean(item.active) })) : [];
    if (data.settings) state.schoolStats = { teachers: count(data.settings.teachers, 500), akp: count(data.settings.akp, 100) };
    $("#adminPin").value = "";
    $("#adminLoginView").hidden = true;
    $("#adminSettingsView").hidden = false;
    $("#profileEffectiveDate").value = state.date || localDateValue();
    syncAllLocalizedDateInputs();
    $("#adminSaveStatus").textContent = "";
    renderAdminClasses(); renderSchoolStats();
    renderAdminStaffDirectory();
    await Promise.all([loadAdminOrganization(), loadAdminContent()]);
  } catch (error) {
    state.adminPin = "";
    $("#adminError").textContent = error.message || "Kod admin tidak sah.";
  }
}

async function saveSchoolStats() {
  const teachers = count($("#adminTeacherCount").value, 500), akp = count($("#adminAkpCount").value, 100);
  $("#adminStatsSave").disabled = true; $("#adminStatsStatus").textContent = "Menyimpan…";
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateSchoolStats", adminPin: state.adminPin, teachers, akp }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Statistik gagal disimpan.");
    state.schoolStats = { teachers, akp }; renderSchoolStats(); $("#adminStatsStatus").textContent = "Statistik warga berjaya dikemas kini.";
  } catch (error) { $("#adminStatsStatus").textContent = error.message || "Statistik gagal disimpan."; }
  finally { $("#adminStatsSave").disabled = false; }
}

async function saveStaffDirectory() {
  const entries = Array.from(document.querySelectorAll("#adminStaffBody tr")).map((row) => ({
    id: row.dataset.adminStaffId ? Number(row.dataset.adminStaffId) : null,
    name: row.querySelector("[data-admin-staff-name]").value.trim(),
    active: row.dataset.adminStaffActive === "true",
  }));
  if (entries.some((item) => !item.name)) { $("#adminStaffSaveStatus").textContent = "Sila isi semua nama dahulu."; return; }
  $("#adminStaffSave").disabled = true;
  $("#adminStaffSaveStatus").textContent = "Menyimpan…";
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateStaffDirectory", adminPin: state.adminPin, entries }) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 403) { showAdminLogin("Sesi admin tamat. Masukkan kod semula."); return; }
      throw new Error(data.error || "Senarai nama gagal disimpan.");
    }
    state.adminStaffDirectory = Array.isArray(data.staffDirectory) ? data.staffDirectory.map((item) => ({ ...item, active: Boolean(item.active) })) : entries;
    state.staffDirectory = state.adminStaffDirectory.filter((item) => item.active);
    refreshStaffNameChoices(); renderStaff(); renderAdminStaffDirectory(); updateEditingAccess();
    if (state.organization.adminItems.length) renderAdminOrganization();
    $("#adminStaffSaveStatus").textContent = "Senarai nama berjaya dikemas kini untuk semua guru.";
  } catch (error) {
    $("#adminStaffSaveStatus").textContent = error.message || "Senarai nama gagal disimpan.";
  } finally { $("#adminStaffSave").disabled = false; }
}

async function saveClassProfiles() {
  const effectiveDate = $("#profileEffectiveDate").value;
  if (!effectiveDate) { $("#adminSaveStatus").textContent = "Pilih tarikh berkuat kuasa."; return; }
  const profiles = Array.from(document.querySelectorAll("#adminClassBody tr")).map((row) => ({
    id: row.dataset.adminClassId,
    teacherName: row.querySelector('[data-admin-field="teacherName"]').value.trim(),
    enrolMale: count(row.querySelector('[data-admin-field="enrolMale"]').value, 300),
    enrolFemale: count(row.querySelector('[data-admin-field="enrolFemale"]').value, 300),
  }));
  $("#adminSave").disabled = true;
  $("#adminSaveStatus").textContent = "Menyimpan…";
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateClassProfiles", adminPin: state.adminPin, effectiveDate, profiles }) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 403) { showAdminLogin("Sesi admin tamat. Masukkan kod semula."); return; }
      throw new Error(data.error || "Tetapan gagal disimpan.");
    }
    $("#adminSaveStatus").textContent = "Tetapan berjaya disimpan.";
    if (effectiveDate <= state.date) await loadReport(true);
  } catch (error) {
    $("#adminSaveStatus").textContent = error.message || "Tetapan gagal disimpan.";
  } finally { $("#adminSave").disabled = false; }
}

function hasPendingChanges() {
  return state.pendingAttendance.size > 0 || state.staffDirty || state.dutyDirtySessions.size > 0 || Object.keys(state.pendingMeta).length > 0;
}

async function loadReport(silent = false) {
  state.loading = true;
  if (!silent) setStatus("Memuatkan data…");
  updateDateHeading();
  try {
    const response = await fetch(`${API_URL}?date=${encodeURIComponent(state.date)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Data tidak dapat dibuka");
    state.classes = withLatestClassProfiles(data.classes);
    state.staffAbsences = { morning: [], afternoon: [] };
    state.staffVisibleRows = { morning: 1, afternoon: 1 };
    for (const item of Array.isArray(data.staffAbsences) ? data.staffAbsences : []) {
      const session = item.session === "afternoon" ? "afternoon" : "morning";
      state.staffAbsences[session].push({ staffName: item.staffName || "", reason: item.reason || "", ...decodeAbsenceReason(item.reason) });
    }
    const dailyDutyActive = HASH_VIEWS[window.location.hash.replace(/^#/, "")] === "dailyDuty";
    if (!dailyDutyActive) {
      state.dutyTeachers = { morning: [], afternoon: [] };
      for (const item of Array.isArray(data.dutyTeachers) ? data.dutyTeachers : []) {
        if (!["morning", "afternoon"].includes(item.session)) continue;
        state.dutyTeachers[item.session][Number(item.rowOrder) - 1] = item.teacherName || "";
      }
    }
    state.meta = data.meta || {};
    if (Array.isArray(data.staffDirectory)) state.staffDirectory = data.staffDirectory.map((item) => ({ ...item, active: Boolean(item.active) }));
    if (data.settings) { state.schoolStats = { teachers: count(data.settings.teachers, 500), akp: count(data.settings.akp, 100) }; renderSchoolStats(); }
    refreshStaffNameChoices();
    state.audit = new Map((Array.isArray(data.audit) ? data.audit : []).map((item) => [auditKey(item.section, item.recordId, item.fieldName), item]));
    const restoredDraft = !silent && restoreDraft();
    renderAttendance(); renderDutyTeachers(); renderStaff(); renderMeta(); updateSessionVisibility();
    if (HASH_VIEWS[window.location.hash.replace(/^#/, "")] === "dailyDuty") await loadDutyWeekTemplate(data);
    if (HASH_VIEWS[window.location.hash.replace(/^#/, "")] === "analysis") await loadKpiDashboard();
    if (!silent) {
      setStatus(restoredDraft ? "Menyambung simpanan tertangguh…" : "Data bersama sedia", restoredDraft ? "" : "saved");
      if (restoredDraft) scheduleSave();
    }
  } catch (error) {
    console.error(error);
    if (!silent) {
      setStatus("Sambungan data terganggu", "error");
      alert("Data kehadiran belum dapat dibuka. Sila semak internet dan muat semula halaman.");
    }
  } finally { state.loading = false; }
}

function scheduleSave() {
  if (state.loading) return;
  if (!editorName()) { updateEditingAccess(); return; }
  clearTimeout(state.saveTimer);
  setStatus("Menyimpan perubahan…");
  state.saveTimer = setTimeout(() => flushSave(), 650);
}

async function flushSave() {
  clearTimeout(state.saveTimer);
  const incompleteOther = ["morning", "afternoon"].flatMap((session) => state.staffAbsences[session] || []).some((item) => item.reasonCategory === "Lain-lain" && !String(item.reasonNote || "").trim());
  if (incompleteOther) { setStatus("Sila nyatakan sebab ketiadaan.", "error"); return; }
  if (state.savePromise) {
    await state.savePromise;
    if (hasPendingChanges()) return flushSave();
    return;
  }
  if (!hasPendingChanges()) return;
  const snapshot = {
    date: state.date,
    attendanceUpdates: Array.from(state.pendingAttendance.values()).map((item) => ({ ...item })),
    staffAbsences: state.staffDirty ? ["morning", "afternoon"].flatMap((session) => state.staffAbsences[session].map((item) => ({ ...item, session }))) : null,
    dutyTeacherUpdates: Array.from(state.dutyDirtySessions).map((session) => ({ session, teachers: [...state.dutyTeachers[session]] })),
    metaUpdates: { ...state.pendingMeta },
    updatedBy: editorName(),
  };
  const attendanceIds = snapshot.attendanceUpdates.map((item) => item.id);
  for (const classId of attendanceIds) {
    state.savingAttendance.add(classId);
    state.failedAttendance.delete(classId);
    updateClassCompletionStatus(classId);
  }
  state.pendingAttendance.clear(); state.staffDirty = false; state.dutyDirtySessions.clear(); state.pendingMeta = {};
  const payload = { date: snapshot.date, attendanceUpdates: snapshot.attendanceUpdates, updatedBy: snapshot.updatedBy };
  if (snapshot.staffAbsences) payload.staffAbsences = snapshot.staffAbsences;
  if (snapshot.dutyTeacherUpdates.length) payload.dutyTeacherUpdates = snapshot.dutyTeacherUpdates;
  if (Object.keys(snapshot.metaUpdates).length) payload.metaUpdates = snapshot.metaUpdates;
  state.savePromise = (async () => {
    try {
      const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Simpanan gagal");
      const attendanceReceipts = verifiedAttendanceReceipts(snapshot.attendanceUpdates, data);
      const time = new Date(data.savedAt || Date.now()).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
      for (const classId of attendanceIds) state.savingAttendance.delete(classId);
      for (const receipt of attendanceReceipts) {
        applyAttendanceAudit([receipt], receipt.updatedBy || snapshot.updatedBy, receipt.updatedAt || data.savedAt || Date.now());
      }
      if (!hasPendingChanges()) setStatus(`Tersimpan ${time}`, "saved");
      saveDraft();
      if (!hasPendingChanges() && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) loadReport(true);
    } catch (error) {
      console.error(error);
      for (const classId of attendanceIds) {
        state.savingAttendance.delete(classId);
        state.failedAttendance.add(classId);
      }
      for (const oldPatch of snapshot.attendanceUpdates) {
        const newerPatch = state.pendingAttendance.get(oldPatch.id) || { id: oldPatch.id };
        state.pendingAttendance.set(oldPatch.id, { ...oldPatch, ...newerPatch });
      }
      if (snapshot.staffAbsences && !state.staffDirty) state.staffDirty = true;
      for (const update of snapshot.dutyTeacherUpdates) state.dutyDirtySessions.add(update.session);
      state.pendingMeta = { ...snapshot.metaUpdates, ...state.pendingMeta };
      saveDraft();
      setStatus("Belum tersimpan — cuba lagi", "error");
      for (const classId of attendanceIds) updateClassCompletionStatus(classId);
    }
  })();
  await state.savePromise;
  state.savePromise = null;
  if (hasPendingChanges()) scheduleSave();
}

$("#attendanceBody").addEventListener("input", (event) => {
  const input = event.target.closest("input[data-field]");
  if (!input) return;
  const row = input.closest("tr[data-class-id]");
  const item = state.classes.find((entry) => entry.id === row.dataset.classId);
  if (!item) return;
  const field = input.dataset.field;
  if (field === "note") item[field] = input.value;
  else {
    const maximum = field === "absentMale" ? count(item.enrolMale) : count(item.enrolFemale);
    item[field] = Math.min(count(input.value), maximum);
    input.value = item[field];
  }
  const pending = {
    id: item.id,
    absentMale: count(item.absentMale),
    absentFemale: count(item.absentFemale),
    note: String(item.note || ""),
  };
  state.pendingAttendance.set(item.id, pending);
  state.failedAttendance.delete(item.id);
  state.lastAttendanceEditAt = Date.now();
  updateClassCompletionStatus(item.id);
  saveDraft();
  renderTotals(); scheduleSave();
});

$("#attendanceBody").addEventListener("click", (event) => {
  const button = event.target.closest("[data-class-confirm]");
  if (!button) return;
  const classId = button.dataset.classConfirm;
  const item = state.classes.find((entry) => String(entry.id) === String(classId));
  if (!item) return;
  const absentTotal = count(item.absentMale) + count(item.absentFemale);
  if (absentTotal > 0 && !String(item.note || "").trim()) {
    setStatus("Sila isi senarai murid tidak hadir sebelum mengesahkan kelas.", "error");
    const noteInput = document.querySelector(`tr[data-class-id="${CSS.escape(String(classId))}"] input[data-field="note"]`);
    noteInput?.focus();
    return;
  }
  state.pendingAttendance.set(classId, {
    id: classId,
    absentMale: count(item.absentMale),
    absentFemale: count(item.absentFemale),
    note: String(item.note || ""),
  });
  state.failedAttendance.delete(classId);
  state.lastAttendanceEditAt = Date.now();
  updateClassCompletionStatus(classId);
  saveDraft();
  scheduleSave();
});

function updateStaffRow(event) {
  const input = event.target.closest("input[data-field],select[data-field]");
  if (!input) return;
  const row = input.closest("tr");
  const index = Number(row.dataset.staffIndex);
  const session = row.dataset.staffSession;
  state.staffAbsences[session][index][input.dataset.field] = input.value;
  const item = state.staffAbsences[session][index];
  if (input.dataset.field === "reasonCategory" && item.reasonCategory && !ABSENCE_REASONS.includes(item.reasonCategory)) {
    item.reasonNote = item.reasonCategory;
    item.reasonCategory = "Lain-lain";
  }
  item.reason = encodeAbsenceReason(item);
  state.staffDirty = true;
  syncStaffCompactUI(session);
  saveDraft();
  if (item.reasonCategory === "Lain-lain" && !String(item.reasonNote || "").trim()) {
    setStatus("Sila nyatakan sebab ketiadaan.", "error");
    if (input.dataset.field === "reasonCategory") renderStaff();
    return;
  }
  if (input.dataset.field === "reasonCategory") renderStaff();
  scheduleSave();
}
for (const selector of ["#staffMorningBody", "#staffAfternoonBody"]) {
  $(selector).addEventListener("input", (event) => { if (event.target.matches('input[data-field="reasonNote"]')) updateStaffRow(event); });
  $(selector).addEventListener("change", (event) => { if (event.target.matches("select[data-field],input[data-field]")) updateStaffRow(event); });
}

document.querySelectorAll("[data-staff-session-tab]").forEach((button) => button.addEventListener("click", () => setStaffSessionPanel(button.dataset.staffSessionTab)));
document.querySelectorAll("[data-staff-add]").forEach((button) => button.addEventListener("click", () => {
  const session = button.dataset.staffAdd;
  const panel = document.querySelector(`[data-staff-session-panel="${session}"]`);
  const rows = panel?.querySelectorAll("tr[data-staff-index]");
  if (!rows?.length) return;
  state.staffVisibleRows[session] = Math.min(rows.length, (Number(state.staffVisibleRows[session]) || 1) + 1);
  syncStaffCompactUI(session);
  const row = rows[state.staffVisibleRows[session] - 1];
  row.querySelector("select[data-field=\"staffName\"]")?.focus();
}));

for (const selector of ["#dutyMorningBody", "#dutyAfternoonBody"]) {
  const updateDutyTeacher = (event) => {
    const input = event.target.closest("select[data-field]");
    if (!input) return;
    const row = input.closest("tr[data-duty-session]");
    const session = row.dataset.dutySession;
    state.dutyTeachers[session][Number(row.dataset.dutyIndex)] = input.value;
    state.dutyWeek.editing = true;
    renderDutyTeachers();
    setDailyDutySession(session);
  };
  $(selector).addEventListener("change", updateDutyTeacher);
}

document.querySelectorAll("[data-daily-duty-tab]").forEach((button) => button.addEventListener("click", () => setDailyDutySession(button.dataset.dailyDutyTab)));
$("#dutyWeekEdit").addEventListener("click", () => { state.dutyWeek.editing = true; renderDutyTeachers(); setDailyDutySession(state.dutyWeek.session || "morning"); });
$("#dutyWeekSave").addEventListener("click", saveDutyWeekTemplate);

$("#weeklyReportSummary").addEventListener("input", (event) => {
  const report = state.dutyWeek.summaries[state.dutyWeek.session || "morning"];
  if (!report) return;
  report.summary = event.target.value;
  report.saved = false;
});
$("#weeklyReportPreparedBy").addEventListener("change", (event) => {
  const report = state.dutyWeek.summaries[state.dutyWeek.session || "morning"];
  if (!report) return;
  report.preparedBy = event.target.value;
  report.saved = false;
  renderWeeklyDutyReport();
});
$("#weeklyReportApprovedBy").addEventListener("change", (event) => {
  const report = state.dutyWeek.summaries[state.dutyWeek.session || "morning"];
  if (!report) return;
  report.approvedBy = event.target.value;
  report.approvedTitle = administratorTitle(event.target.value);
  report.saved = false;
  renderWeeklyDutyReport();
});
$("#weeklyReportGenerate").addEventListener("click", () => {
  const report = state.dutyWeek.summaries[state.dutyWeek.session || "morning"];
  if (!report) return;
  report.summary = report.generated;
  report.saved = false;
  report.editing = true;
  renderWeeklyDutyReport();
  $("#weeklyReportSummary").focus();
});
$("#weeklyReportEdit").addEventListener("click", () => {
  const report = state.dutyWeek.summaries[state.dutyWeek.session || "morning"];
  if (!report) return;
  if (report.editing) report.summary = $("#weeklyReportSummary").value.trim();
  report.editing = !report.editing;
  renderWeeklyDutyReport();
  if (report.editing) $("#weeklyReportSummary").focus();
});
$("#weeklyReportSave").addEventListener("click", saveWeeklyDutyReport);

function syncReportDateInputs() {
  ["#reportDate", "#staffPageDate", "#dailyDutyDate", "#monitoringDate", "#oprDate", "#rmtArchiveDate"].forEach((selector) => { $(selector).value = state.date; });
  syncAllLocalizedDateInputs();
}

async function changeReportDate(event) {
  if (!event.target.value || event.target.value === state.date) return;
  await flushSave();
  state.date = event.target.value;
  syncReportDateInputs();
  state.pendingAttendance.clear(); state.savingAttendance.clear(); state.failedAttendance.clear(); state.staffDirty = false; state.dutyDirtySessions.clear(); state.pendingMeta = {};
  loadReport();
  loadMonitoringReports();
}

["#reportDate", "#staffPageDate", "#dailyDutyDate", "#monitoringDate"].forEach((selector) => $(selector).addEventListener("change", changeReportDate));
$("#sessionFilter").addEventListener("change", (event) => {
  state.session = event.target.value;
  renderAttendance();
  updateSessionVisibility();
  updateEditingAccess();
});
const VIEW_HASHES = { home: "utama", attendance: "e-jkm", staff: "keberadaan-guru-akp", dailyDuty: "guru-bertugas-mingguan", dutyStatus: "status-guru-bertugas", duty: "guru-bertugas", calendar: "rekod-kalendar", monitoring: "laporan-pemantauan", analysis: "analisis", rmtStatus: "guru-rmt-status", rmtReport: "guru-rmt-laporan", rmtArchive: "guru-rmt-arkib", opr: "template-opr-hem" };
const HASH_VIEWS = Object.fromEntries(Object.entries(VIEW_HASHES).map(([view, hash]) => [hash, view]));
const RMT_VIEWS = ["rmtStatus", "rmtReport", "rmtArchive"];
const DUTY_VIEWS = ["dailyDuty", "staff", "monitoring", "dutyStatus"];
HASH_VIEWS["guru-bertugas-harian"] = "dailyDuty";
HASH_VIEWS["guru-rmt"] = "rmtStatus";
HASH_VIEWS["guru-rmt-maklumat"] = "rmtStatus";
HASH_VIEWS["laporan-bergambar"] = "monitoring";
HASH_VIEWS.kehadiran = "attendance";
HASH_VIEWS["rekod-pengisian-kelas"] = "attendance";
HASH_VIEWS["status-kelas"] = "attendance";

function activateViewFromHash() {
  let requested = HASH_VIEWS[window.location.hash.replace(/^#/, "")] || "home";
  if (requested === "calendar" && !state.adminPin) {
    requested = "home";
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#utama`);
  }
  const isRmtView = RMT_VIEWS.includes(requested);
  const isDutyView = DUTY_VIEWS.includes(requested);
  if (requested === "opr") window.scrollTo({ top: 0, behavior: "auto" });
  document.body.classList.toggle("rmt-view-active", isRmtView);
  document.body.classList.toggle("opr-view-active", requested === "opr");
  if (requested !== "opr") {
    $("#oprCalendarDetail").classList.remove("is-open");
    $("#oprEntryPanel").hidden = true; $("#letterEntryPanel").hidden = true;
    document.body.classList.remove("opr-entry-open");
  }
  document.body.dataset.activeView = requested;
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== requested;
  });
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    if (link.dataset.viewLink === requested) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  $("#rmtNavGroup").open = isRmtView;
  $("#dutyNavGroup").open = isDutyView;
  $("#top").hidden = false;
  $("#identityBar").hidden = !(["attendance", "staff", "dailyDuty", "monitoring", "dutyStatus"].includes(requested) || isRmtView);
  $("#printButton").hidden = requested !== "attendance";
  if (requested === "analysis") { loadAnalytics(); if (state.classes.length) loadKpiDashboard(); }
  if (requested === "monitoring") {
    $("#monitoringWorkspaceHome").appendChild($("#monitoringDayWorkspace"));
    loadMonitoringCalendar();
  }
  if (requested === "dutyStatus") loadDutyStatusCalendar();
  if (requested === "dailyDuty" && state.classes.length) loadDutyWeekTemplate(null, true);
  if (requested === "duty") loadWeeklyDuty();
  if (requested === "completion") loadCompletionView();
  if (requested === "calendar") loadCalendarRecord();
  if (requested === "rmtStatus") loadRmtWeek();
  if (requested === "rmtArchive") ensureRmtArchiveDefaultDate();
  if (["rmtStatus", "rmtArchive"].includes(requested)) loadRmtReports();
  if (requested === "opr") loadOprReports();
  setSidebar(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.addEventListener("hashchange", activateViewFromHash);
[["#dutyNavGroup", "#rmtNavGroup"], ["#rmtNavGroup", "#dutyNavGroup"]].forEach(([currentSelector, otherSelector]) => {
  const current = $(currentSelector);
  current.querySelector("summary").addEventListener("click", () => {
    if (!current.open) $(otherSelector).open = false;
  });
});
$("#printButton").addEventListener("click", () => window.print());
$("#analysisRefresh").addEventListener("click", loadAnalytics);
$("#analysisPeriod").addEventListener("change", () => { $("#analysisBestPeriod").value = $("#analysisPeriod").value; loadAnalytics(); });
$("#analysisBestPeriod").addEventListener("change", () => { $("#analysisPeriod").value = $("#analysisBestPeriod").value; loadAnalytics(); });
$("#analysisBestClass").addEventListener("click", (event) => {
  const button = event.target.closest("[data-analysis-best]");
  if (!button) return;
  $("#analysisBestClass").querySelectorAll("[data-analysis-best]").forEach((item) => { const selected = item === button; item.classList.toggle("selected", selected); item.setAttribute("aria-pressed", String(selected)); });
  $("#analysisBestInsight").innerHTML = `<strong>${safe(button.dataset.bestName)}</strong> mencatat <b>${safe(button.dataset.bestValue)}</b> daripada ${safe(button.dataset.bestRecords)} rekod • ${safe(button.dataset.bestTeacher)}.`;
});
$("#kpiMonth").addEventListener("change", loadKpiAnalytics);
$("#kpiYear").addEventListener("change", () => {
  loadKpiAnalytics();
  loadAnnualWinners();
});
$("#annualWinnersGrid").addEventListener("click", (event) => {
  const card = event.target.closest("[data-annual-month]");
  if (!card) return;
  $("#kpiMonth").value = card.dataset.annualMonth;
  loadKpiAnalytics();
  document.querySelector(".kpi-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#weeklyDutyRefresh").addEventListener("click", loadWeeklyDuty);
$("#completionRefresh").addEventListener("click", loadCompletionView);
$("#completionSession").addEventListener("change", loadCompletionView);
$("#calendarRefresh").addEventListener("click", loadCalendarRecord);
$("#rmtPhotos").addEventListener("change", (event) => renderRmtImagePreview(event.target.files));
$("#rmtMorningCount").addEventListener("input", updateRmtTotal);
$("#rmtAfternoonCount").addEventListener("input", updateRmtTotal);
$("#rmtDutySave").addEventListener("click", saveRmtWeek);
function updateRmtDutySessionView() {
  const selected = $("#rmtDutySessionView").value;
  document.querySelectorAll("[data-rmt-duty-panel]").forEach((panel) => { panel.hidden = panel.dataset.rmtDutyPanel !== selected; });
}
$("#rmtDutySessionView").addEventListener("change", updateRmtDutySessionView);
$("#rmtPhotoSave").addEventListener("click", saveRmtPhotos);
$("#rmtPhotoRefresh").addEventListener("click", loadRmtReports);
$("#rmtFrom").addEventListener("change", changeRmtEntryDate);
$("#rmtCalendarMonth").addEventListener("change", () => { state.rmtMonth = $("#rmtCalendarMonth").value; state.rmtShowAll = false; state.rmtSelectedDate = ""; loadRmtReports(); });
$("#rmtArchiveDate").addEventListener("change", async () => {
  const date = $("#rmtArchiveDate").value;
  if (!date) return;
  state.rmtSelectedDate = date;
  state.rmtMonth = date.slice(0, 7);
  $("#rmtCalendarMonth").value = state.rmtMonth;
  await loadRmtReports();
});
$("#rmtShowAll").addEventListener("click", () => { state.rmtShowAll = false; state.rmtSelectedDate = ""; renderRmtCalendar(); renderRmtReports(); });
$("#rmtCalendarGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-rmt-date]");
  if (!button) return;
  state.rmtSelectedDate = button.dataset.rmtDate;
  state.rmtShowAll = false;
  $("#rmtArchiveDate").value = state.rmtSelectedDate;
  syncAllLocalizedDateInputs();
  window.location.hash = VIEW_HASHES.rmtArchive;
});
$("#menuToggle").addEventListener("click", () => setSidebar(!document.body.classList.contains("sidebar-open")));
$("#dutyStatusMonth").addEventListener("change", () => {
  state.dutyStatus.month = $("#dutyStatusMonth").value;
  state.dutyStatus.selectedDate = "";
  $("#dutyStatusMonitoringWorkspace").hidden = true;
  loadDutyStatusCalendar();
});
$("#dutyStatusCalendar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-duty-date]");
  if (!button) return;
  state.dutyStatus.selectedDate = button.dataset.dutyDate;
  $("#dutyStatusMonitoringWorkspace").hidden = true;
  renderDutyStatusCalendar();
});
$("#dutyStatusDetail").addEventListener("click", (event) => {
  const monitoringButton = event.target.closest("[data-duty-monitoring-action]");
  if (monitoringButton) {
    openDutyStatusMonitoring(monitoringButton.dataset.dutyMonitoringAction, monitoringButton.dataset.dutySession);
    return;
  }
  const link = event.target.closest("[data-duty-open]");
  if (!link || !state.dutyStatus.selectedDate) return;
  state.date = state.dutyStatus.selectedDate;
  syncReportDateInputs();
});
$("#sidebarBackdrop").addEventListener("click", () => setSidebar(false));
document.querySelectorAll("[data-view-link]").forEach((link) => link.addEventListener("click", () => setSidebar(false)));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { setSidebar(false); if (!$("#recordEditModal").hidden) closeRecordEditor(); } });
$("#monitoringRefresh").addEventListener("click", loadMonitoringReports);
$("#monitoringCalendarMonth").addEventListener("change", () => {
  state.monitoring.month = $("#monitoringCalendarMonth").value;
  state.monitoring.selectedDate = "";
  state.monitoring.reports = [];
  loadMonitoringCalendar();
});
$("#monitoringCalendar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-monitoring-date]");
  if (button) openMonitoringCalendarDate(button.dataset.monitoringDate);
});
$("#monitoringPhotos").addEventListener("change", (event) => renderMonitoringPreview(event.target.files));
$("#monitoringForm").addEventListener("submit", saveMonitoringReport);
renderMonitoringLocationChecklist();
$("#monitoringLocationChecklist").addEventListener("click", (event) => {
  const button = event.target.closest("[data-monitoring-location]");
  if (!button) return;
  const existing = Array.from(document.querySelectorAll('#monitoringItems [data-monitoring-field="location"]')).find((field) => field.value === button.dataset.monitoringLocation)?.closest(".monitoring-item-card");
  if (existing) {
    existing.remove();
    const count = $("#monitoringItems").querySelectorAll(".monitoring-item-card").length;
    if (!count) $("#monitoringItems").innerHTML = '<p class="monitoring-empty">Belum ada kawasan dipilih. Scroll senarai di atas dan tekan kawasan yang dipantau.</p>';
    syncMonitoringLocationSelection();
    $("#monitoringFormStatus").textContent = count ? `${count} kawasan dalam laporan ini.` : "";
    return;
  }
  addMonitoringItem(button.dataset.monitoringLocation);
});
document.querySelectorAll("[data-monitoring-tab]").forEach((button) => button.addEventListener("click", () => setMonitoringTab(button.dataset.monitoringTab)));
$("#monitoringReports").addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-monitoring-open]");
  if (openButton) { setMonitoringTab(openButton.dataset.monitoringOpen); return; }
  const filterButton = event.target.closest("[data-monitoring-filter]");
  if (!filterButton) return;
  state.monitoring.filter = filterButton.dataset.monitoringFilter || "all";
  renderMonitoringReports();
  setMonitoringTab("archive");
});
$("#monitoringItems").addEventListener("click", (event) => {
  const removeButton = event.target.closest(".monitoring-remove");
  if (removeButton) { event.preventDefault(); removeButton.closest(".monitoring-item-card").remove(); const count = $("#monitoringItems").querySelectorAll(".monitoring-item-card").length; if (!count) $("#monitoringItems").innerHTML = '<p class="monitoring-empty">Belum ada kawasan dipilih. Scroll senarai di atas dan tekan kawasan yang dipantau.</p>'; syncMonitoringLocationSelection(); $("#monitoringFormStatus").textContent = count ? `${count} kawasan dalam laporan ini.` : ""; return; }
  const allGoodButton = event.target.closest("[data-monitoring-all-good]");
  if (!allGoodButton) return;
  event.preventDefault();
  const card = allGoodButton.closest(".monitoring-item-card");
  card.querySelectorAll("[data-monitoring-aspect]").forEach((input) => { input.value = "good"; input.className = "is-good"; });
  const status = card.querySelector('[data-monitoring-field="status"]');
  status.value = "controlled";
  status.dispatchEvent(new Event("change", { bubbles: true }));
});
$("#monitoringItems").addEventListener("change", (event) => {
  const card = event.target.closest(".monitoring-item-card"); if (!card) return;
  if (event.target.matches('[data-monitoring-field="status"]')) { const follow = card.querySelector(".follow-up"); follow.hidden = event.target.value !== "attention"; follow.querySelector("textarea").required = event.target.value === "attention"; const label = monitoringStatusLabel(event.target.value); card.querySelector("[data-monitoring-item-status]").textContent = label; const autoStatus = card.querySelector("[data-monitoring-auto-status]"); if (autoStatus) { autoStatus.textContent = `${event.target.value === "controlled" ? "🟢" : event.target.value === "attention" ? "🔴" : "🟡"} ${label}`; autoStatus.className = monitoringStatusClass(event.target.value); } }
  if (event.target.matches("[data-monitoring-aspect]")) {
    event.target.className = event.target.value ? `is-${event.target.value}` : "";
    const values = Array.from(card.querySelectorAll("[data-monitoring-aspect]")).map((input) => input.value);
    const assessed = values.filter(Boolean);
    const status = card.querySelector('[data-monitoring-field="status"]');
    status.value = values.includes("attention") ? "attention" : assessed.length && assessed.every((value) => value === "na") ? "not_applicable" : "controlled";
    if (assessed.length) status.dispatchEvent(new Event("change", { bubbles: true }));
  }
});
$("#oprPhotos").addEventListener("change", (event) => renderOprPreview(event.target.files));
$("#oprForm").addEventListener("submit", saveOprReport);
$("#oprRefresh").addEventListener("click", loadOprReports);
$("#oprMonthPrevious").addEventListener("click", () => shiftOprMonth(-1));
$("#oprMonthNext").addEventListener("click", () => shiftOprMonth(1));
$("#oprMonthToday").addEventListener("click", () => { state.opr.month = localDateValue().slice(0, 7); state.opr.selectedDate = localDateValue(); $("#oprCalendarMonth").value = state.opr.month; loadOprReports(); });
$("#oprCalendarMonth").addEventListener("change", (event) => { state.opr.month = event.target.value || state.date.slice(0, 7); state.opr.selectedDate = ""; loadOprReports(); });
$("#oprCalendarGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-opr-date]"); if (!button) return; state.opr.selectedDate = button.dataset.oprDate; renderOprCalendar(); $("#oprCalendarDetail").classList.add("is-open"); });
document.querySelectorAll("[data-opr-filter]").forEach((button) => button.addEventListener("click", () => { state.opr.filter = button.dataset.oprFilter; renderOprCalendar(); }));
$("#oprAddButton").addEventListener("click", () => openOprEntry("opr"));
$("#letterAddButton").addEventListener("click", () => openOprEntry("letter"));
$("#oprDetailClose").addEventListener("click", () => { $("#oprCalendarDetail").classList.remove("is-open"); });
$("#oprFormClose").addEventListener("click", () => { $("#oprEntryPanel").hidden = true; document.body.classList.remove("opr-entry-open"); });
$("#letterFormClose").addEventListener("click", () => { $("#letterEntryPanel").hidden = true; document.body.classList.remove("opr-entry-open"); });
$("#oprGallery").addEventListener("click", (event) => { const button = event.target.closest("[data-edit-opr]"); if (button) openRecordEditor("opr", button.dataset.editOpr); });
$("#letterArchiveToggle").addEventListener("click", toggleLetterArchive);
$("#latestLetterGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-edit-letter]"); if (button) openRecordEditor("letter", button.dataset.editLetter); });
$("#letterArchiveGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-edit-letter]"); if (button) openRecordEditor("letter", button.dataset.editLetter); });
$("#recordEditForm").addEventListener("submit", saveRecordEdit);
$("#recordEditClose").addEventListener("click", closeRecordEditor);
$("#recordEditModal").addEventListener("click", (event) => { if (event.target === $("#recordEditModal")) closeRecordEditor(); });
$("#adminButton").addEventListener("click", async () => {
  await flushSave();
  $("#adminModal").hidden = false;
  document.body.classList.add("modal-open");
  showAdminLogin();
});
$("#adminClose").addEventListener("click", closeAdminModal);
$("[data-admin-calendar-link]").addEventListener("click", (event) => {
  event.preventDefault();
  $("#adminModal").hidden = true;
  document.body.classList.remove("modal-open");
  window.location.hash = VIEW_HASHES.calendar;
});
$("#adminLoginForm").addEventListener("submit", verifyAdmin);
$("#adminSave").addEventListener("click", saveClassProfiles);
$("#adminStaffAdd").addEventListener("click", addAdminStaffRow);
$("#adminStaffSave").addEventListener("click", saveStaffDirectory);
$("#adminStatsSave").addEventListener("click", saveSchoolStats);
$("#adminOrganizationAdd").addEventListener("click", addOrganizationRow);
$("#adminOrganizationSave").addEventListener("click", saveOrganization);
$("#adminAnnouncementAdd").addEventListener("click", () => { syncAdminAnnouncements(); state.content.adminAnnouncements.push({ id: "", message: "", active: true }); renderAdminAnnouncements(); });
$("#adminAnnouncementSave").addEventListener("click", saveAdminAnnouncements);
$("#adminAnnouncementList").addEventListener("input", () => { syncAdminAnnouncements(); renderAdminTickerPreview(); });
$("#adminAnnouncementList").addEventListener("click", (event) => {
  const row = event.target.closest("[data-announcement-index]"); if (!row) return;
  syncAdminAnnouncements();
  const index = Number(row.dataset.announcementIndex), item = state.content.adminAnnouncements[index];
  const direction = event.target.closest("[data-announcement-move]")?.dataset.announcementMove;
  if (direction === "up" && index > 0) [state.content.adminAnnouncements[index - 1], state.content.adminAnnouncements[index]] = [item, state.content.adminAnnouncements[index - 1]];
  else if (direction === "down" && index < state.content.adminAnnouncements.length - 1) [state.content.adminAnnouncements[index + 1], state.content.adminAnnouncements[index]] = [item, state.content.adminAnnouncements[index + 1]];
  else if (event.target.closest("[data-announcement-toggle]")) item.active = item.active === false;
  else if (event.target.closest("[data-announcement-delete]")) { if (item.id) state.content.deletedAnnouncementIds.push(item.id); state.content.adminAnnouncements.splice(index, 1); }
  else return;
  renderAdminAnnouncements();
});
$("#letterForm").addEventListener("submit", saveLetter);
$("#adminOrganizationList").addEventListener("input", syncAdminOrganizationFromRows);
$("#adminOrganizationList").addEventListener("change", (event) => {
  const row = event.target.closest("[data-organization-index]"); if (!row) return;
  syncAdminOrganizationFromRows();
  const index = Number(row.dataset.organizationIndex), item = state.organization.adminItems[index];
  if (event.target.matches('[data-organization-field="staffId"]')) {
    item.staffName = state.adminStaffDirectory.find((staff) => Number(staff.id) === Number(item.staffId))?.name || "";
  }
  if (event.target.matches("[data-organization-photo]")) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!(file.type || "").startsWith("image/") || file.size > 25 * 1024 * 1024) { event.target.value = ""; $("#adminOrganizationStatus").textContent = "Pilih gambar yang sah dan tidak melebihi 25 MB."; return; }
    if (item._previewUrl) URL.revokeObjectURL(item._previewUrl);
    item._file = file; item._previewUrl = URL.createObjectURL(file); item.removePhoto = false;
  }
  renderAdminOrganization();
});
$("#adminOrganizationList").addEventListener("click", (event) => {
  const row = event.target.closest("[data-organization-index]"); if (!row) return;
  syncAdminOrganizationFromRows();
  const index = Number(row.dataset.organizationIndex), item = state.organization.adminItems[index];
  if (event.target.closest("[data-organization-toggle]")) item.active = item.active === false;
  else if (event.target.closest("[data-organization-remove-photo]")) {
    if (item._previewUrl) URL.revokeObjectURL(item._previewUrl);
    item._file = null; item._previewUrl = ""; item.photoUrl = ""; item.removePhoto = true;
  } else if (event.target.closest("[data-organization-delete]")) {
    if (item.id) state.organization.deletedIds.push(item.id);
    if (item._previewUrl) URL.revokeObjectURL(item._previewUrl);
    state.organization.adminItems.splice(index, 1);
  } else return;
  renderAdminOrganization();
});
$("#adminStaffBody").addEventListener("input", (event) => {
  const input = event.target.closest("[data-admin-staff-name]");
  if (!input) return;
  input.value = input.value.toUpperCase();
  const row = input.closest("tr");
  const index = Array.from(row.parentElement.children).indexOf(row);
  state.adminStaffDirectory[index] = { ...state.adminStaffDirectory[index], name: input.value };
});
$("#adminStaffBody").addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-staff-toggle]");
  if (!button) return;
  const row = button.closest("tr");
  row.dataset.adminStaffActive = String(row.dataset.adminStaffActive !== "true");
  const index = Array.from(row.parentElement.children).indexOf(row);
  state.adminStaffDirectory[index] = { ...state.adminStaffDirectory[index], name: row.querySelector("[data-admin-staff-name]").value, active: row.dataset.adminStaffActive === "true" };
  renderAdminStaffDirectory();
});
$("#adminModal").addEventListener("click", (event) => { if (event.target === $("#adminModal")) closeAdminModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("#adminModal").hidden) closeAdminModal(); });

document.querySelectorAll("[data-rmt-session]").forEach((form) => {
  form.addEventListener("submit", saveRmtReport);
  form.querySelector('[data-rmt-field="photos"]').addEventListener("change", (event) => {
    const preview = form.querySelector("[data-rmt-preview]");
    try { const files = validateMonitoringFiles(event.target.files); preview.innerHTML = files.map((file, index) => `<figure><img src="${URL.createObjectURL(file)}" alt="Pratonton RMT ${index + 1}"><figcaption>Gambar ${index + 1}</figcaption></figure>`).join(""); }
    catch (error) { event.target.value = ""; preview.textContent = error.message; }
  });
});

$("#editorName").addEventListener("input", (event) => {
  const name = event.target.value.trim();
  try {
    if (name) localStorage.setItem(EDITOR_KEY, name);
    else localStorage.removeItem(EDITOR_KEY);
  } catch { /* Nama masih boleh digunakan untuk sesi semasa. */ }
  updateEditingAccess();
  if (name) {
    if (hasPendingChanges()) scheduleSave();
    else setStatus("Nama pengisi sedia", "saved");
  }
});
$("#editorName").addEventListener("change", (event) => {
  const match = activeStaffNames().find((name) => name.toLocaleLowerCase("ms") === event.target.value.trim().toLocaleLowerCase("ms"));
  if (match && event.target.value !== match) {
    event.target.value = match;
    event.target.dispatchEvent(new Event("input", { bubbles: true }));
  }
});

state.date = localDateValue();
state.opr.month = state.date.slice(0, 7);
state.opr.selectedDate = state.date;
$("#oprCalendarMonth").value = state.opr.month;
state.dutyStatus.month = state.date.slice(0, 7);
$("#dutyStatusMonth").value = state.dutyStatus.month;
syncReportDateInputs();
state.analytics.date = state.date;
$("#analysisDate").value = state.date;
$("#weeklyDutyDate").value = state.date;
$("#completionDate").value = state.date;
$("#calendarDate").value = state.date;
$("#letterDate").value = state.date;
setupRmtTemplate();
setupDraggableIdmeShortcut();
setupSidebarSwipe();
updateRmtDutySessionView();
enhanceLocalizedDateInputs();
setupKpiFilters();
refreshStaffNameChoices();
try { $("#editorName").value = localStorage.getItem(EDITOR_KEY) || ""; } catch { /* abaikan */ }
activateViewFromHash();
loadReport();
loadAnalytics();
loadOrganization();
loadPublicContent();
loadDisciplinePublicSummary();

setInterval(() => {
  const recentlyEditingAttendance = Date.now() - state.lastAttendanceEditAt < 8000;
  if (document.visibilityState === "visible" && !recentlyEditingAttendance && !state.loading && !state.savePromise && !hasPendingChanges()) loadReport(true);
}, 15000);

function refreshSharedAttendanceAfterReturn() {
  if (document.visibilityState === "visible" && !state.loading && !state.savePromise && !hasPendingChanges()) loadReport(true);
}

document.addEventListener("visibilitychange", refreshSharedAttendanceAfterReturn);
window.addEventListener("focus", refreshSharedAttendanceAfterReturn);
window.addEventListener("pageshow", refreshSharedAttendanceAfterReturn);

setInterval(() => {
  const monitoringEditing = $("#monitoringReports").contains(document.activeElement);
  if (document.visibilityState === "visible" && document.body.dataset.activeView === "monitoring" && !monitoringEditing && !state.monitoring.loading) loadMonitoringReports();
}, 30000);

setInterval(() => {
  if (document.visibilityState === "visible" && $("#adminModal").hidden) loadOrganization(true);
}, 60000);

setInterval(() => {
  if (document.visibilityState === "visible" && $("#adminModal").hidden) loadPublicContent(true);
}, 60000);

setInterval(() => {
  if (document.visibilityState === "visible") loadDisciplinePublicSummary();
}, 60000);

window.addEventListener("online", () => { if (hasPendingChanges()) scheduleSave(); });
let tickerResizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(tickerResizeTimer);
  tickerResizeTimer = setTimeout(() => {
    renderTicker();
    if (!$("#adminModal").hidden) renderAdminTickerPreview();
  }, 180);
});
window.addEventListener("beforeunload", (event) => {
  if (!hasPendingChanges() && !state.savePromise) return;
  event.preventDefault(); event.returnValue = "";
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js?v=177", { scope: "./", updateViaCache: "none" })
      .catch((error) => console.warn("PWA tidak dapat diaktifkan:", error));
  });
}
