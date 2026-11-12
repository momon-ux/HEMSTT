/**
 * HEMSTT — pelayan pusat multi-sekolah.
 * Kod keselamatan tidak disimpan dalam GitHub. Tetapkan melalui Script Properties.
 */

const HEMSTT = Object.freeze({
  version: "1.0.0",
  sheets: {
    schools: ["id", "code", "name", "district", "state", "address", "logoUrl", "sessionMode", "morningName", "afternoonName", "status", "createdAt", "updatedAt"],
    admins: ["id", "schoolId", "fullName", "username", "passwordSalt", "passwordHash", "mustChangePassword", "active", "createdAt", "updatedAt"],
    staff: ["id", "schoolId", "name", "staffType", "active", "sortOrder", "createdAt", "updatedAt"],
    classes: ["id", "schoolId", "name", "level", "stream", "teacherName", "enrolMale", "enrolFemale", "session", "active", "sortOrder", "createdAt", "updatedAt"],
    smarttrack: ["id", "schoolId", "resource", "recordKey", "json", "updatedAt"],
    sessions: ["id", "tokenHash", "role", "adminId", "schoolId", "expiresAt", "createdAt"],
    audit: ["id", "actorRole", "actorAdminId", "schoolId", "action", "details", "createdAt"],
  },
  sessionHours: 12,
});

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    return output_(route_(String(p.action || "me"), p, "GET"));
  } catch (error) {
    return output_({ ok: false, error: safeError_(error) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    return output_(route_(String(body.action || ""), body, "POST"));
  } catch (error) {
    return output_({ ok: false, error: safeError_(error) });
  }
}

function route_(action, data, method) {
  if (method === "GET" && action === "publicSchool") return publicSchoolByCode_(data);
  if (method === "POST" && action === "smarttrackBridge") return smarttrackBridge_(data);
  if (method === "POST" && action === "superLogin") return superLogin_(data);
  if (method === "POST" && action === "schoolLogin") return schoolLogin_(data);
  const session = requireSession_(data.token);
  if (action === "me") return me_(session);
  if (action === "logout") return logout_(session);
  if (action === "schools") return requireSuper_(session) && { ok: true, schools: schoolList_() };
  if (action === "createSchool") return createSchool_(requireSuper_(session), data);
  if (action === "resetAdminPassword") return resetAdminPassword_(requireSuper_(session), data);
  if (action === "updateSchool") return updateSchool_(session, data);
  if (action === "staffDirectory") return staffDirectory_(session);
  if (action === "saveStaffDirectory") return saveStaffDirectory_(session, data);
  if (action === "classDirectory") return classDirectory_(session);
  if (action === "saveClassDirectory") return saveClassDirectory_(session, data);
  if (action === "changePassword") return changePassword_(session, data);
  throw new Error("Tindakan tidak dibenarkan.");
}

function setupHemstt() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("SUPER_ADMIN_CODE")) throw new Error("Tetapkan Script Property SUPER_ADMIN_CODE dahulu.");
  if (!props.getProperty("TEMP_SCHOOL_PASSWORD")) throw new Error("Tetapkan Script Property TEMP_SCHOOL_PASSWORD dahulu.");
  if (!props.getProperty("PASSWORD_PEPPER")) props.setProperty("PASSWORD_PEPPER", random_(48));
  let spreadsheetId = props.getProperty("DATABASE_SPREADSHEET_ID");
  let ss;
  if (spreadsheetId) ss = SpreadsheetApp.openById(spreadsheetId);
  else {
    ss = SpreadsheetApp.create("HEMSTT — Pangkalan Data Induk");
    spreadsheetId = ss.getId();
    props.setProperty("DATABASE_SPREADSHEET_ID", spreadsheetId);
  }
  Object.keys(HEMSTT.sheets).forEach((name) => ensureSheet_(ss, name, HEMSTT.sheets[name]));
  const first = ss.getSheetByName("Sheet1");
  if (first && Object.keys(HEMSTT.sheets).length > 0) ss.deleteSheet(first);
  if (!props.getProperty("LOGO_FOLDER_ID")) {
    const folder = DriveApp.createFolder("HEMSTT — Logo Sekolah");
    props.setProperty("LOGO_FOLDER_ID", folder.getId());
  }
  if (!props.getProperty("SMARTTRACK_FILES_FOLDER_ID")) {
    const folder = DriveApp.createFolder("HEMSTT — Fail SmartTrack Sekolah");
    props.setProperty("SMARTTRACK_FILES_FOLDER_ID", folder.getId());
  }
  return { ok: true, spreadsheetId: spreadsheetId, spreadsheetUrl: ss.getUrl() };
}

function configureSecurity(superAdminCode, temporarySchoolPassword) {
  if (!superAdminCode || String(superAdminCode).length < 8) throw new Error("Kod pentadbir utama terlalu pendek.");
  if (!temporarySchoolPassword || String(temporarySchoolPassword).length < 8) throw new Error("Kata laluan sementara terlalu pendek.");
  PropertiesService.getScriptProperties().setProperties({ SUPER_ADMIN_CODE: String(superAdminCode), TEMP_SCHOOL_PASSWORD: String(temporarySchoolPassword) }, false);
  return "Tetapan keselamatan HEMSTT telah disimpan.";
}

function superLogin_(data) {
  throttle_("super:" + clientKey_(data));
  const expected = property_("SUPER_ADMIN_CODE");
  if (!secureEqual_(clean_(data.code, 100), expected)) throw new Error("Kod Pentadbir Utama tidak sah.");
  const token = createSession_("super", "", "");
  audit_({ role: "super", adminId: "" }, "super_login", "", "Log masuk pentadbir utama");
  return { ok: true, token: token, role: "super" };
}

function schoolLogin_(data) {
  const username = clean_(data.username, 80).toLowerCase();
  throttle_("school:" + username);
  const admin = rows_("admins").find((row) => String(row.username).toLowerCase() === username);
  if (!admin || !truthy_(admin.active) || !secureEqual_(passwordHash_(clean_(data.password, 150), admin.passwordSalt), admin.passwordHash)) throw new Error("ID pentadbir atau kata laluan tidak sah.");
  const school = byId_("schools", admin.schoolId);
  if (!school || school.status !== "active") throw new Error("Akaun sekolah tidak aktif. Hubungi pentadbir utama.");
  const token = createSession_("school", admin.id, admin.schoolId);
  audit_({ role: "school", adminId: admin.id }, "school_login", admin.schoolId, username);
  return { ok: true, token: token, role: "school", mustChangePassword: truthy_(admin.mustChangePassword) };
}

function me_(session) {
  if (session.role === "super") return { ok: true, role: "super", name: "Pentadbir Utama HEMSTT" };
  const admin = byId_("admins", session.adminId);
  const school = byId_("schools", session.schoolId);
  if (!admin || !school) throw new Error("Akaun tidak dijumpai.");
  return { ok: true, role: "school", admin: publicAdmin_(admin), school: publicSchool_(school) };
}

function logout_(session) { deleteById_("sessions", session.id); return { ok: true }; }

function createSchool_(session, data) {
  return withLock_(function () {
    const code = clean_(data.code, 20).toUpperCase().replace(/[^A-Z0-9-]/g, "");
    const name = clean_(data.name, 150);
    const adminName = clean_(data.adminName, 150);
    if (!code || !name || !adminName) throw new Error("Kod, nama sekolah dan nama pentadbir diperlukan.");
    if (rows_("schools").some((row) => String(row.code).toUpperCase() === code)) throw new Error("Kod sekolah ini sudah didaftarkan.");
    const now = new Date().toISOString();
    const schoolId = Utilities.getUuid();
    const adminId = Utilities.getUuid();
    const username = "admin." + code.toLowerCase();
    const temporaryPassword = property_("TEMP_SCHOOL_PASSWORD");
    const salt = random_(32);
    append_("schools", { id: schoolId, code: code, name: name, district: clean_(data.district, 80) || "Tawau", state: clean_(data.state, 80) || "Sabah", address: clean_(data.address, 400), logoUrl: "", sessionMode: data.sessionMode === "two" ? "two" : "one", morningName: clean_(data.morningName, 60) || "Sidang Pagi", afternoonName: data.sessionMode === "two" ? clean_(data.afternoonName, 60) || "Sidang Petang" : "", status: "active", createdAt: now, updatedAt: now });
    append_("admins", { id: adminId, schoolId: schoolId, fullName: adminName, username: username, passwordSalt: salt, passwordHash: passwordHash_(temporaryPassword, salt), mustChangePassword: true, active: true, createdAt: now, updatedAt: now });
    audit_(session, "school_created", schoolId, code + " — " + name);
    return { ok: true, schoolId: schoolId, schoolCode: code, schoolName: name, username: username, temporaryPassword: temporaryPassword };
  });
}

function publicSchoolByCode_(data) {
  const code = clean_(data.schoolCode, 20).toUpperCase();
  const school = rows_("schools").find(function (row) { return String(row.code).toUpperCase() === code && row.status === "active"; });
  if (!school) throw new Error("Sekolah tidak dijumpai atau belum diaktifkan.");
  return { ok: true, school: publicSchool_(school) };
}

function staffDirectory_(session) {
  if (session.role !== "school") throw new Error("Tindakan ini hanya untuk pentadbir sekolah.");
  const staff = rows_("staff")
    .filter(function (row) { return row.schoolId === session.schoolId && truthy_(row.active); })
    .sort(function (a, b) { return Number(a.sortOrder) - Number(b.sortOrder) || String(a.name).localeCompare(String(b.name)); })
    .map(function (row) { return pick_(row, ["id", "name", "staffType", "sortOrder"]); });
  return { ok: true, staff: staff };
}

function saveStaffDirectory_(session, data) {
  if (session.role !== "school") throw new Error("Tindakan ini hanya untuk pentadbir sekolah.");
  const entries = Array.isArray(data.entries) ? data.entries.slice(0, 250) : [];
  return withLock_(function () {
    const existing = rows_("staff").filter(function (row) { return row.schoolId === session.schoolId; });
    const byId = {};
    existing.forEach(function (row) { byId[row.id] = row; });
    const now = new Date().toISOString();
    const kept = {};
    entries.forEach(function (entry, index) {
      const name = clean_(entry && entry.name, 150).toUpperCase();
      if (!name) return;
      const suppliedId = clean_(entry.id, 80);
      const id = suppliedId && byId[suppliedId] ? suppliedId : Utilities.getUuid();
      const patch = { schoolId: session.schoolId, name: name, staffType: entry.staffType === "akp" ? "akp" : "teacher", active: true, sortOrder: index + 1, updatedAt: now };
      if (byId[id]) updateById_("staff", id, patch);
      else append_("staff", Object.assign({ id: id, createdAt: now }, patch));
      kept[id] = true;
    });
    existing.forEach(function (row) { if (!kept[row.id]) updateById_("staff", row.id, { active: false, updatedAt: now }); });
    audit_(session, "staff_directory_saved", session.schoolId, String(Object.keys(kept).length) + " nama pengisi");
    return staffDirectory_(session);
  });
}

function classDirectory_(session) {
  if (session.role !== "school") throw new Error("Tindakan ini hanya untuk pentadbir sekolah.");
  const classes = schoolClasses_(session.schoolId).map(function (row) { return pick_(row, ["id", "name", "level", "stream", "teacherName", "enrolMale", "enrolFemale", "session", "sortOrder"]); });
  return { ok: true, classes: classes };
}

function schoolClasses_(schoolId) {
  return rows_("classes").filter(function (row) { return row.schoolId === schoolId && truthy_(row.active); }).sort(function (a, b) { return Number(a.sortOrder) - Number(b.sortOrder) || String(a.name).localeCompare(String(b.name)); });
}

function saveClassDirectory_(session, data) {
  if (session.role !== "school") throw new Error("Tindakan ini hanya untuk pentadbir sekolah.");
  const entries = Array.isArray(data.entries) ? data.entries.slice(0, 100) : [];
  return withLock_(function () {
    const existing = rows_("classes").filter(function (row) { return row.schoolId === session.schoolId; });
    const byId = {}; existing.forEach(function (row) { byId[row.id] = row; });
    const kept = {}, now = new Date().toISOString();
    entries.forEach(function (entry, index) {
      const name = clean_(entry && entry.name, 80);
      if (!name) return;
      const suppliedId = clean_(entry.id, 80);
      const id = suppliedId && byId[suppliedId] ? suppliedId : Utilities.getUuid();
      const patch = { schoolId: session.schoolId, name: name, level: clean_(entry.level, 50), stream: clean_(entry.stream, 50), teacherName: clean_(entry.teacherName, 150).toUpperCase(), enrolMale: Math.max(0, Math.min(100, Number(entry.enrolMale) || 0)), enrolFemale: Math.max(0, Math.min(100, Number(entry.enrolFemale) || 0)), session: entry.session === "afternoon" ? "afternoon" : "morning", active: true, sortOrder: index + 1, updatedAt: now };
      if (byId[id]) updateById_("classes", id, patch); else append_("classes", Object.assign({ id: id, createdAt: now }, patch));
      kept[id] = true;
    });
    existing.forEach(function (row) { if (!kept[row.id]) updateById_("classes", row.id, { active: false, updatedAt: now }); });
    audit_(session, "class_directory_saved", session.schoolId, String(Object.keys(kept).length) + " kelas");
    return classDirectory_(session);
  });
}

function smarttrackBridge_(data) {
  const code = clean_(data.schoolCode, 20).toUpperCase();
  const school = rows_("schools").find(function (row) { return String(row.code).toUpperCase() === code && row.status === "active"; });
  if (!school) throw new Error("Sekolah tidak dijumpai atau belum diaktifkan.");
  const resource = clean_(data.resource, 40).toLowerCase();
  if (["school", "safety", "organization", "content", "discipline"].indexOf(resource) < 0) throw new Error("Bahagian SmartTrack tidak sah.");
  const method = clean_(data.requestMethod, 10).toUpperCase() || "GET";
  const query = data.query && typeof data.query === "object" ? data.query : {};
  let payload = data.payload && typeof data.payload === "object" ? data.payload : {};
  if (method === "GET") return { ok: true, data: smarttrackRead_(school, resource, query) };
  if (resource === "school" && payload.action) return { ok: true, data: smarttrackAdminAction_(school, payload) };
  const protectedActions = ["readAdmin", "saveAnnouncements", "deleteLetter", "saveOrganization"];
  if (method === "DELETE" || protectedActions.indexOf(clean_(payload.action, 50)) >= 0) requireSmarttrackAdmin_(payload);
  payload = externalizeSmarttrackFiles_(school, payload);
  return withLock_(function () { return { ok: true, status: method === "POST" ? 201 : 200, data: smarttrackWrite_(school, resource, method, query, payload) }; });
}

function externalizeSmarttrackFiles_(school, payload) {
  const copy = Object.assign({}, payload);
  if (Array.isArray(payload.photos)) copy.photos = payload.photos.slice(0, 6).map(function (photo) { return saveSmarttrackFile_(school, photo); }).filter(Boolean);
  if (payload.file && typeof payload.file === "object") copy.file = saveSmarttrackFile_(school, payload.file);
  if (payload.photo && typeof payload.photo === "object") copy.photo = saveSmarttrackFile_(school, payload.photo);
  if (Array.isArray(payload.entries)) copy.entries = payload.entries.map(function (entry) { const item = Object.assign({}, entry); if (item.photo && typeof item.photo === "object") item.photo = saveSmarttrackFile_(school, item.photo); return item; });
  return copy;
}

function saveSmarttrackFile_(school, file) {
  const type = clean_(file && file.type, 80);
  const name = clean_(file && file.name, 180) || "fail";
  let encoded = String(file && file.data || "");
  const dataUrl = encoded.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrl) encoded = dataUrl[2];
  if (!encoded || !/^(image\/(jpeg|png|webp)|application\/pdf)$/i.test(type)) return null;
  const bytes = Utilities.base64Decode(encoded);
  if (bytes.length > 8000000) throw new Error("Setiap fail mestilah tidak melebihi 8 MB.");
  const root = DriveApp.getFolderById(property_("SMARTTRACK_FILES_FOLDER_ID"));
  const folders = root.getFoldersByName(school.code);
  const folder = folders.hasNext() ? folders.next() : root.createFolder(school.code);
  const stored = folder.createFile(Utilities.newBlob(bytes, type, name));
  stored.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { id: stored.getId(), name: name, type: type, size: bytes.length, url: "https://drive.google.com/uc?export=view&id=" + stored.getId() };
}

function requireSmarttrackAdmin_(payload) {
  if (!secureEqual_(clean_(payload.adminPin, 120), property_("SUPER_ADMIN_CODE"))) throw new Error("Kod admin tidak sah.");
}

function smarttrackAdminAction_(school, payload) {
  requireSmarttrackAdmin_(payload);
  const action = clean_(payload.action, 50);
  if (action === "verifyAdmin") {
    const staffDirectory = rows_("staff").filter(function (row) { return row.schoolId === school.id; }).sort(function (a, b) { return Number(a.sortOrder) - Number(b.sortOrder); }).map(function (row) { return { id: row.id, name: row.name, active: truthy_(row.active), sortOrder: row.sortOrder }; });
    return { ok: true, adminName: "PENTADBIR " + school.name, staffDirectory: staffDirectory, settings: { teachers: staffDirectory.filter(function (item) { return item.active; }).length, akp: 0 } };
  }
  if (action === "updateStaffDirectory") {
    const entries = Array.isArray(payload.entries) ? payload.entries.slice(0, 250) : [];
    const existing = rows_("staff").filter(function (row) { return row.schoolId === school.id; }), byId = {}, kept = {}, now = new Date().toISOString();
    existing.forEach(function (row) { byId[String(row.id)] = row; });
    entries.forEach(function (entry, index) {
      const name = clean_(entry.name, 150).toUpperCase(); if (!name) return;
      const supplied = clean_(entry.id, 80), id = supplied && byId[supplied] ? supplied : Utilities.getUuid();
      const patch = { schoolId: school.id, name: name, staffType: "teacher", active: entry.active !== false, sortOrder: index + 1, updatedAt: now };
      if (byId[id]) updateById_("staff", id, patch); else append_("staff", Object.assign({ id: id, createdAt: now }, patch)); kept[id] = true;
    });
    existing.forEach(function (row) { if (!kept[row.id]) updateById_("staff", row.id, { active: false, updatedAt: now }); });
    return smarttrackAdminAction_(school, { action: "verifyAdmin", adminPin: payload.adminPin });
  }
  if (action === "updateClassProfiles") {
    const profiles = Array.isArray(payload.profiles) ? payload.profiles : [], now = new Date().toISOString();
    profiles.forEach(function (profile) { const current = byId_("classes", profile.id); if (current && current.schoolId === school.id) updateById_("classes", profile.id, { teacherName: clean_(profile.teacherName, 150).toUpperCase(), enrolMale: Math.max(0, Number(profile.enrolMale) || 0), enrolFemale: Math.max(0, Number(profile.enrolFemale) || 0), updatedAt: now }); });
    return { ok: true, savedAt: Date.now() };
  }
  if (action === "updateSchoolStats") return { ok: true, savedAt: Date.now(), settings: { teachers: Number(payload.teachers) || 0, akp: Number(payload.akp) || 0 } };
  throw new Error("Tindakan pentadbir tidak sah.");
}

function smarttrackRead_(school, resource, query) {
  const records = rows_("smarttrack").filter(function (row) { return row.schoolId === school.id && row.resource === resource; });
  const parsed = records.map(function (row) {
    try { return JSON.parse(String(row.json || "{}")); } catch (error) { return {}; }
  });
  if (resource === "school") {
    if (query.mode === "analytics-years") {
      const years = parsed.map(function (item) { return Number(String(item.date || "").slice(0, 4)); }).filter(function (year) { return year >= 2000 && year <= 2100; });
      return { years: Array.from(new Set(years)).sort(function (a, b) { return b - a; }) };
    }
    if (query.mode === "analytics") return { from: query.from || "", to: query.to || "", records: [] };
    const date = clean_(query.date, 10) || Utilities.formatDate(new Date(), "Asia/Kuching", "yyyy-MM-dd");
    const saved = parsed.find(function (item) { return item.date === date; }) || {};
    const staffDirectory = rows_("staff").filter(function (row) { return row.schoolId === school.id && truthy_(row.active); }).sort(function (a, b) { return Number(a.sortOrder) - Number(b.sortOrder); }).map(function (row) { return { id: row.id, name: row.name, staffType: row.staffType, active: true, sortOrder: row.sortOrder }; });
    const classes = schoolClasses_(school.id).map(function (row) { return { id: row.id, name: row.name, level: row.level, stream: row.stream, teacherName: row.teacherName, enrolMale: Number(row.enrolMale) || 0, enrolFemale: Number(row.enrolFemale) || 0, absentMale: 0, absentFemale: 0, note: "", updatedAt: 0, session: row.session }; });
    return Object.assign({ date: date, classes: classes, staffAbsences: [], dutyTeachers: [], meta: null, audit: [], staffDirectory: staffDirectory, settings: { teachers: staffDirectory.filter(function (item) { return item.staffType !== "akp"; }).length, akp: staffDirectory.filter(function (item) { return item.staffType === "akp"; }).length } }, saved);
  }
  if (resource === "safety") {
    if (query.mode === "rmt-week") return { schedule: parsed.find(function (item) { return item.weekStart === query.date; }) || null };
    const reports = parsed.filter(function (item) { return !query.date || item.date === query.date; });
    return query.mode === "rmt" ? { from: query.from || "", to: query.to || "", reports: reports } : { reports: reports };
  }
  if (resource === "organization") return { organization: parsed };
  if (resource === "content") return query.mode === "announcements" ? { announcements: parsed.filter(function (item) { return item.kind === "announcement"; }) } : { letters: parsed.filter(function (item) { return item.kind === "letter"; }) };
  return parsed.length ? parsed[parsed.length - 1] : { status: "Tiada rekod", trend: [] };
}

function smarttrackWrite_(school, resource, method, query, payload) {
  const now = new Date().toISOString();
  const key = clean_(payload.id || payload.date || payload.weekStart || query.date, 100) || Utilities.getUuid();
  const currentRows = rows_("smarttrack").filter(function (row) { return row.schoolId === school.id && row.resource === resource && row.recordKey === key; });
  if (method === "DELETE") {
    currentRows.forEach(function (row) { deleteById_("smarttrack", row.id); });
    return { ok: true, deletedId: key };
  }
  let previous = {};
  if (currentRows.length) { try { previous = JSON.parse(String(currentRows[0].json || "{}")); } catch (error) {} }
  if (resource === "school" && payload.date) {
    const baseClasses = schoolClasses_(school.id).map(function (row) { return { id: row.id, name: row.name, level: row.level, stream: row.stream, teacherName: row.teacherName, enrolMale: Number(row.enrolMale) || 0, enrolFemale: Number(row.enrolFemale) || 0, absentMale: 0, absentFemale: 0, note: "", updatedAt: 0, session: row.session }; });
    const previousById = {};
    (Array.isArray(previous.classes) ? previous.classes : []).forEach(function (item) { previousById[item.id] = item; });
    const classes = baseClasses.map(function (item) { return Object.assign({}, item, previousById[item.id] || {}); });
    const byId = {}; classes.forEach(function (item) { byId[item.id] = item; });
    const updatedAt = Date.now(), updatedBy = clean_(payload.updatedBy, 150);
    const attendanceReceipts = (Array.isArray(payload.attendanceUpdates) ? payload.attendanceUpdates : []).map(function (patch) {
      const item = byId[patch.id];
      if (!item) throw new Error("Kelas tidak dijumpai: " + clean_(patch.id, 80));
      item.absentMale = Math.max(0, Number(patch.absentMale) || 0);
      item.absentFemale = Math.max(0, Number(patch.absentFemale) || 0);
      item.note = clean_(patch.note, 1000);
      item.updatedAt = updatedAt;
      return { id: item.id, absentMale: item.absentMale, absentFemale: item.absentFemale, note: item.note, confirmedFields: item.note ? ["absentMale", "absentFemale", "note"] : ["absentMale", "absentFemale"], updatedBy: updatedBy, updatedAt: updatedAt };
    });
    const staffAbsences = Array.isArray(payload.staffAbsences) ? payload.staffAbsences : (previous.staffAbsences || []);
    const dutyTeachers = Array.isArray(previous.dutyTeachers) ? previous.dutyTeachers.slice() : [];
    (Array.isArray(payload.dutyTeacherUpdates) ? payload.dutyTeacherUpdates : []).forEach(function (update) {
      for (let i = dutyTeachers.length - 1; i >= 0; i--) if (dutyTeachers[i].session === update.session) dutyTeachers.splice(i, 1);
      (Array.isArray(update.teachers) ? update.teachers : []).forEach(function (teacherName, index) { if (teacherName) dutyTeachers.push({ session: update.session, rowOrder: index + 1, teacherName: teacherName }); });
    });
    const audit = Array.isArray(previous.audit) ? previous.audit.slice() : [];
    attendanceReceipts.forEach(function (receipt) { receipt.confirmedFields.forEach(function (fieldName) { audit.push({ section: "attendance", recordId: receipt.id, fieldName: fieldName, updatedBy: updatedBy, updatedAt: updatedAt }); }); });
    const value = Object.assign({}, previous, { date: payload.date, classes: classes, staffAbsences: staffAbsences, dutyTeachers: dutyTeachers, meta: Object.assign({}, previous.meta || {}, payload.metaUpdates || {}), audit: audit, updatedAt: updatedAt });
    const patch = { schoolId: school.id, resource: resource, recordKey: key, json: JSON.stringify(value), updatedAt: now };
    if (currentRows.length) updateById_("smarttrack", currentRows[0].id, patch); else append_("smarttrack", Object.assign({ id: Utilities.getUuid() }, patch));
    return { ok: true, savedAt: updatedAt, attendanceReceipts: attendanceReceipts };
  }
  const value = Object.assign({}, previous, payload, { id: payload.id || previous.id || key, updatedAt: Date.now() });
  if (resource === "content" && payload.action === "createLetter") value.kind = "letter";
  const rowPatch = { schoolId: school.id, resource: resource, recordKey: key, json: JSON.stringify(value), updatedAt: now };
  if (currentRows.length) updateById_("smarttrack", currentRows[0].id, rowPatch);
  else append_("smarttrack", Object.assign({ id: Utilities.getUuid() }, rowPatch));
  return Object.assign({ ok: true, savedAt: Date.now() }, value);
}

function resetAdminPassword_(session, data) {
  return withLock_(function () {
    const schoolId = clean_(data.schoolId, 80);
    const admin = rows_("admins").find((row) => row.schoolId === schoolId);
    const school = byId_("schools", schoolId);
    if (!admin || !school) throw new Error("Pentadbir sekolah tidak dijumpai.");
    const salt = random_(32);
    const temporaryPassword = property_("TEMP_SCHOOL_PASSWORD");
    updateById_("admins", admin.id, { passwordSalt: salt, passwordHash: passwordHash_(temporaryPassword, salt), mustChangePassword: true, updatedAt: new Date().toISOString() });
    invalidateSchoolSessions_(schoolId);
    audit_(session, "admin_password_reset", schoolId, admin.username);
    return { ok: true, schoolName: school.name, username: admin.username, temporaryPassword: temporaryPassword };
  });
}

function updateSchool_(session, data) {
  return withLock_(function () {
    const schoolId = session.role === "super" ? clean_(data.schoolId, 80) : session.schoolId;
    const school = byId_("schools", schoolId);
    if (!school) throw new Error("Sekolah tidak dijumpai.");
    const sessionMode = data.sessionMode === "two" ? "two" : "one";
    const patch = { name: clean_(data.name, 150) || school.name, district: clean_(data.district, 80) || school.district, state: clean_(data.state, 80) || school.state, address: clean_(data.address, 400), sessionMode: sessionMode, morningName: clean_(data.morningName, 60) || "Sidang Pagi", afternoonName: sessionMode === "two" ? clean_(data.afternoonName, 60) || "Sidang Petang" : "", updatedAt: new Date().toISOString() };
    if (data.logoData) patch.logoUrl = saveLogo_(school, data.logoData, data.logoName);
    updateById_("schools", schoolId, patch);
    audit_(session, "school_updated", schoolId, patch.name);
    return { ok: true, school: publicSchool_(Object.assign({}, school, patch)) };
  });
}

function changePassword_(session, data) {
  if (session.role !== "school") throw new Error("Tindakan tidak dibenarkan.");
  return withLock_(function () {
    const admin = byId_("admins", session.adminId);
    if (!admin || !secureEqual_(passwordHash_(clean_(data.currentPassword, 150), admin.passwordSalt), admin.passwordHash)) throw new Error("Kata laluan semasa tidak betul.");
    const next = clean_(data.newPassword, 150);
    if (next.length < 8) throw new Error("Kata laluan baharu mestilah sekurang-kurangnya 8 aksara.");
    const salt = random_(32);
    updateById_("admins", admin.id, { passwordSalt: salt, passwordHash: passwordHash_(next, salt), mustChangePassword: false, updatedAt: new Date().toISOString() });
    audit_(session, "password_changed", session.schoolId, admin.username);
    return { ok: true };
  });
}

function schoolList_() {
  const admins = rows_("admins");
  return rows_("schools").map(function (school) {
    const admin = admins.find((row) => row.schoolId === school.id) || {};
    return Object.assign(publicSchool_(school), { adminName: admin.fullName || "", adminUsername: admin.username || "", mustChangePassword: truthy_(admin.mustChangePassword) });
  }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
}

function publicSchool_(school) { return pick_(school, ["id", "code", "name", "district", "state", "address", "logoUrl", "sessionMode", "morningName", "afternoonName", "status", "createdAt", "updatedAt"]); }
function publicAdmin_(admin) { const value = pick_(admin, ["id", "fullName", "username"]); value.mustChangePassword = truthy_(admin.mustChangePassword); return value; }

function createSession_(role, adminId, schoolId) {
  const token = random_(80); const now = Date.now();
  append_("sessions", { id: Utilities.getUuid(), tokenHash: digest_(token), role: role, adminId: adminId, schoolId: schoolId, expiresAt: now + HEMSTT.sessionHours * 3600000, createdAt: new Date(now).toISOString() });
  cleanupSessions_(); return token;
}

function requireSession_(token) {
  const hash = digest_(clean_(token, 160));
  const row = rows_("sessions").find((item) => secureEqual_(item.tokenHash, hash) && Number(item.expiresAt) > Date.now());
  if (!row) throw new Error("Sesi tidak sah. Sila log masuk semula.");
  return { id: row.id, role: row.role, adminId: row.adminId, schoolId: row.schoolId };
}

function requireSuper_(session) { if (!session || session.role !== "super") throw new Error("Tindakan ini hanya untuk pentadbir utama."); return session; }
function invalidateSchoolSessions_(schoolId) { const sheet = sheet_("sessions"); const data = sheet.getDataRange().getValues(); for (let i = data.length - 1; i >= 1; i--) if (String(data[i][4]) === schoolId) sheet.deleteRow(i + 1); delete ROWS_CACHE_.sessions; }
function cleanupSessions_() { const sheet = sheet_("sessions"); const data = sheet.getDataRange().getValues(); for (let i = data.length - 1; i >= 1; i--) if (Number(data[i][5]) <= Date.now()) sheet.deleteRow(i + 1); delete ROWS_CACHE_.sessions; }

function saveLogo_(school, dataUrl, originalName) {
  const match = String(dataUrl).match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!match) throw new Error("Gunakan logo PNG atau JPG yang sah.");
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 2000000) throw new Error("Logo mestilah di bawah 2 MB.");
  const ext = match[1] === "image/png" ? "png" : "jpg";
  const blob = Utilities.newBlob(bytes, match[1], clean_(school.code + "-logo." + ext, 100));
  const folder = DriveApp.getFolderById(property_("LOGO_FOLDER_ID"));
  const file = folder.createFile(blob);
  file.setDescription("Logo " + school.name + " — dimuat naik melalui HEMSTT");
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://drive.google.com/uc?export=view&id=" + file.getId();
}

function audit_(session, action, schoolId, details) { append_("audit", { id: Utilities.getUuid(), actorRole: session.role, actorAdminId: session.adminId || "", schoolId: schoolId || "", action: action, details: clean_(details, 500), createdAt: new Date().toISOString() }); }
function throttle_(key) { const cache = CacheService.getScriptCache(); const cacheKey = "login:" + digest_(key).slice(0, 30); const count = Number(cache.get(cacheKey) || 0) + 1; if (count > 12) throw new Error("Terlalu banyak cubaan. Sila tunggu beberapa minit."); cache.put(cacheKey, String(count), 300); }
function clientKey_(data) { return clean_(data.clientKey || "browser", 80); }
function property_(name) { const value = PropertiesService.getScriptProperties().getProperty(name); if (!value) throw new Error("Tetapan pelayan " + name + " belum disediakan."); return value; }
function passwordHash_(password, salt) { return hmac_(salt + "|" + password, property_("PASSWORD_PEPPER")); }
function digest_(value) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8)); }
function hmac_(value, key) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(value), String(key), Utilities.Charset.UTF_8)); }
function secureEqual_(a, b) { a = String(a || ""); b = String(b || ""); if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
function random_(length) { let value = ""; while (value.length < length) value += Utilities.getUuid().replace(/-/g, ""); return value.slice(0, length); }
function truthy_(value) { return value === true || String(value).toLowerCase() === "true" || Number(value) === 1; }
function clean_(value, max) { return String(value == null ? "" : value).trim().slice(0, max || 180); }
function safeError_(error) { const message = error && error.message ? error.message : "Ralat pelayan berlaku."; console.error(error && error.stack ? error.stack : error); return message; }
function output_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function withLock_(callback) { const lock = LockService.getScriptLock(); lock.waitLock(20000); try { return callback(); } finally { lock.releaseLock(); } }
function pick_(source, keys) { const out = {}; keys.forEach((key) => out[key] = source[key] == null ? "" : source[key]); return out; }
let DB_CACHE_ = null;
const SHEET_CACHE_ = {};
const ROWS_CACHE_ = {};
function db_() { if (!DB_CACHE_) DB_CACHE_ = SpreadsheetApp.openById(property_("DATABASE_SPREADSHEET_ID")); return DB_CACHE_; }

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const current = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0] : [];
  if (sheet.getLastRow() === 0 || headers.some((header, i) => current[i] !== header)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#0b63d9").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sheet_(name) { if (!SHEET_CACHE_[name]) SHEET_CACHE_[name] = ensureSheet_(db_(), name, HEMSTT.sheets[name]); return SHEET_CACHE_[name]; }
function rows_(name) { if (ROWS_CACHE_[name]) return ROWS_CACHE_[name]; const sheet = sheet_(name); const values = sheet.getDataRange().getValues(); if (values.length < 2) return ROWS_CACHE_[name] = []; const headers = HEMSTT.sheets[name]; return ROWS_CACHE_[name] = values.slice(1).filter((row) => row.some((cell) => cell !== "")).map(function (row) { const out = {}; headers.forEach((header, i) => out[header] = row[i]); return out; }); }
function append_(name, object) { const headers = HEMSTT.sheets[name]; sheet_(name).appendRow(headers.map((header) => object[header] == null ? "" : object[header])); delete ROWS_CACHE_[name]; }
function byId_(name, id) { return rows_(name).find((row) => String(row.id) === String(id)); }

function updateById_(name, id, patch) {
  const sheet = sheet_(name); const values = sheet.getDataRange().getValues(); const headers = HEMSTT.sheets[name]; const idIndex = headers.indexOf("id");
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) !== String(id)) continue;
    Object.keys(patch).forEach(function (key) { const index = headers.indexOf(key); if (index >= 0) values[i][index] = patch[key]; });
    sheet.getRange(i + 1, 1, 1, headers.length).setValues([values[i].slice(0, headers.length)]);
    delete ROWS_CACHE_[name];
    return;
  }
  throw new Error("Rekod tidak dijumpai.");
}

function deleteById_(name, id) {
  const sheet = sheet_(name); const values = sheet.getDataRange().getValues(); const idIndex = HEMSTT.sheets[name].indexOf("id");
  for (let i = values.length - 1; i >= 1; i--) if (String(values[i][idIndex]) === String(id)) sheet.deleteRow(i + 1);
  delete ROWS_CACHE_[name];
}
