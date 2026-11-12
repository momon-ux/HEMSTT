
(() => {
  "use strict";

  const config = window.HEMSTT_CONFIG || {};
  const app = document.querySelector("#app");
  const state = { token: sessionStorage.getItem("hemstt_token") || "", me: null, schools: [] };

  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const formData = (form) => Object.fromEntries(new FormData(form).entries());
  const apiReady = () => {
    const url = String(config.apiUrl || "");
    return url.startsWith("https://script.google.com/macros/s/") && url.endsWith("/exec");
  };

  async function api(action, payload = {}, method = "POST") {
    if (!apiReady()) throw new Error("Pelayan HEMSTT belum disambungkan. Pentadbir utama perlu melengkapkan URL Google Apps Script.");
    let response;
    if (method === "GET") {
      const params = new URLSearchParams({ action, token: state.token, ...payload });
      response = await fetch(
        config.apiUrl + "?" + params,
        { cache: "no-store" }
      );
    } else {
      response = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, token: state.token, ...payload }),
      });
    }
    const result = await response.json().catch(() => ({ ok: false, error: "Jawapan pelayan tidak dapat dibaca." }));
    if (!result.ok) throw new Error(result.error || "Permintaan tidak berjaya.");
    return result;
  }

  function notice(message, type = "error") {
    const node = document.querySelector("#notice");
    if (!node) return;
    node.className = "notice " + type;
    node.textContent = message;
    node.hidden = false;
  }

  function loginView() {
    app.innerHTML = `
      <main class="login-page">
        <section class="login-hero">
          <div class="aurora a1"></div><div class="aurora a2"></div>
          <div class="hero-content">
            <span class="platform-pill"><i></i> PLATFORM MULTI-SEKOLAH</span>
            <div class="hero-logo">HEM<span>STT</span></div>
            <h1>Pengurusan HEM<br><em>lebih tersusun.</em></h1>
            <p>Satu platform induk untuk pelbagai sekolah. Setiap sekolah mempunyai identiti, pentadbir dan data yang berasingan.</p>
            <div class="hero-metrics"><div><b>1</b><span>Platform<br>induk</span></div><div><b>∞</b><span>Sekolah boleh<br>disertakan</span></div><div><b>24/7</b><span>Akses<br>berpusat</span></div></div>
          </div>
          <div class="hero-features"><div><b>◈</b><span><strong>Pelbagai sekolah</strong><small>Data diasingkan mengikut kod sekolah</small></span></div><div><b>✓</b><span><strong>Akses terkawal</strong><small>Pentadbir mengurus sekolah sendiri</small></span></div><div><b>↻</b><span><strong>Satu kemas kini</strong><small>Fungsi induk dikongsi semua sekolah</small></span></div></div>
        </section>
        <section class="login-side">
          <form id="loginForm" class="glass-card login-card">
            <div class="mobile-logo">HEM<span>STT</span></div>
            <div class="login-heading"><div><small>SELAMAT DATANG</small><h2>Log masuk HEMSTT</h2></div><span class="safe">✓ Selamat</span></div>
            <p>Masuk ke ruang pengurusan sekolah anda.</p>
            <div class="login-tabs"><button type="button" class="active" data-mode="school">Pentadbir Sekolah</button><button type="button" data-mode="super">Pentadbir Utama</button></div>
            <div id="schoolFields"><label>ID Pentadbir<input name="username" autocomplete="username" placeholder="Contoh: admin.xba3037"></label><label>Kata laluan<input name="password" type="password" autocomplete="current-password" placeholder="Masukkan kata laluan"></label></div>
            <div id="superFields" hidden><label>Kod Pentadbir Utama<input name="code" type="password" placeholder="Masukkan kod akses induk"></label></div>
            <div id="notice" class="notice" hidden></div>
            <button class="primary wide" type="submit">Log masuk <span>→</span></button>
            <div class="privacy-note">▣ Kata laluan disahkan di pelayan dan tidak dipaparkan secara terbuka.</div>
          </form>
        </section>
      </main>`;

    let mode = "school";
    document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
      mode = button.dataset.mode;
      document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelector("#schoolFields").hidden = mode !== "school";
      document.querySelector("#superFields").hidden = mode !== "super";
      document.querySelector("#notice").hidden = true;
    }));
    document.querySelector("#loginForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector("button[type=submit]");
      button.disabled = true; button.textContent = "Mengesahkan…";
      try {
        const data = formData(event.currentTarget);
        const result = mode === "super" ? await api("superLogin", { code: data.code }) : await api("schoolLogin", { username: data.username, password: data.password });
        state.token = result.token; sessionStorage.setItem("hemstt_token", state.token);
        await hydrate();
      } catch (error) { notice(error.message); }
      finally { button.disabled = false; button.innerHTML = "Log masuk <span>→</span>"; }
    });
  }

  function shell(content, section = "Dashboard") {
    const isSuper = state.me.role === "super";
    app.innerHTML = `<div class="shell">
      <aside class="sidebar"><div class="side-brand"><span class="brand-orb">H</span><div><b>HEMSTT</b><small>${isSuper ? "Platform Induk" : esc(state.me.school.code)}</small></div></div><nav><button class="active">⌂ <span>Dashboard</span></button><button>${isSuper ? "▦" : "◇"} <span>${isSuper ? "Sekolah" : "Modul HEM"}</span></button><button>◷ <span>Aktiviti</span></button><button>⚙ <span>Tetapan</span></button></nav><button id="logout" class="logout">⇥ <span>Log keluar</span></button></aside>
      <section class="workspace"><header class="topbar"><button id="mobileMenu" class="mobile-menu">☰</button><div><small>${isSuper ? "PENTADBIR UTAMA" : "PENTADBIR SEKOLAH"}</small><strong>${esc(section)}</strong></div><div class="user-chip"><span>${isSuper ? "PU" : esc((state.me.admin.fullName || "PS").slice(0, 2).toUpperCase())}</span><div><b>${isSuper ? "Pentadbir Utama" : esc(state.me.admin.fullName)}</b><small>${isSuper ? "Semua sekolah" : esc(state.me.school.code)}</small></div></div></header><main class="content">${content}</main></section>
    </div>`;
    document.querySelector("#logout").addEventListener("click", logout);
    document.querySelector("#mobileMenu").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
  }

  const schoolCard = (school) => `<article class="school-card"><div class="school-badge">${school.logoUrl ? `<img src="${esc(school.logoUrl)}" alt="">` : "🏫"}</div><div class="school-info"><div><h3>${esc(school.name)}</h3><span class="status ${esc(school.status)}">${school.status === "active" ? "Aktif" : "Tidak aktif"}</span></div><p>${esc(school.code)} · ${esc(school.district)}, ${esc(school.state)}</p><div class="mini-meta"><span>♙ ${esc(school.adminName || "Belum ditetapkan")}</span><span>⌁ ${esc(school.adminUsername || "—")}</span><span>◫ ${school.sessionMode === "two" ? "Dua sidang" : "Satu sidang"}</span></div></div><button class="secondary reset-password" data-id="${esc(school.id)}" data-name="${esc(school.name)}">↻ Reset kata laluan</button></article>`;

  async function superView() {
    const result = await api("schools"); state.schools = result.schools || [];
    const active = state.schools.filter((s) => s.status === "active").length;
    const dual = state.schools.filter((s) => s.sessionMode === "two").length;
    shell(`<div class="page-heading"><div><small>RINGKASAN PLATFORM</small><h1>Selamat datang, Pentadbir Utama</h1><p>Pantau sekolah dan urus akses daripada satu tempat.</p></div><button id="addSchool" class="primary">＋ Tambah sekolah</button></div>
      <div id="notice" class="notice" hidden></div>
      <section class="stats"><article><i class="blue">▦</i><div><small>Jumlah sekolah</small><b>${state.schools.length}</b><p>Berdaftar dalam HEMSTT</p></div></article><article><i class="green">✓</i><div><small>Sekolah aktif</small><b>${active}</b><p>Boleh menggunakan sistem</p></div></article><article><i class="amber">♙</i><div><small>Pentadbir sekolah</small><b>${state.schools.length}</b><p>Akaun berasingan</p></div></article><article><i class="violet">◫</i><div><small>Dua sidang</small><b>${dual}</b><p>Tetapan mengikut sekolah</p></div></article></section>
      <section class="panel"><div class="panel-heading"><div><small>SEKOLAH BERDAFTAR</small><h2>Senarai sekolah</h2></div><button id="reload" class="ghost">↻ Muat semula</button></div><div class="school-list">${state.schools.length ? state.schools.map(schoolCard).join("") : `<div class="empty"><span>🏫</span><h3>Belum ada sekolah</h3><p>Tambah sekolah pertama untuk menjana ruang HEMSTT dan akaun pentadbirnya.</p></div>`}</div></section>`);
    document.querySelector("#addSchool").addEventListener("click", openSchoolModal);
    document.querySelector("#reload").addEventListener("click", superView);
    document.querySelectorAll(".reset-password").forEach((button) => button.addEventListener("click", () => resetPassword(button.dataset.id, button.dataset.name)));
  }

  function openSchoolModal() {
    document.body.insertAdjacentHTML("beforeend", `<div id="modal" class="modal-backdrop"><form id="schoolForm" class="modal glass-card"><div class="modal-heading"><div><small>PENDAFTARAN SEKOLAH</small><h2>Tambah sekolah baharu</h2></div><button type="button" class="close">×</button></div><div class="form-grid"><label>Kod sekolah<input name="code" placeholder="Contoh: XBA3037" required></label><label>Nama sekolah<input name="name" placeholder="Nama penuh sekolah" required></label><label>Daerah<input name="district" value="Tawau" required></label><label>Negeri<input name="state" value="Sabah" required></label><label class="full">Alamat<textarea name="address" placeholder="Alamat sekolah"></textarea></label><label>Struktur sidang<select name="sessionMode"><option value="one">Satu sidang</option><option value="two">Dua sidang</option></select></label><label>Nama pentadbir sekolah<input name="adminName" required></label><label>Nama sidang utama<input name="morningName" value="Sidang Pagi"></label><label id="afternoonField" hidden>Nama sidang kedua<input name="afternoonName" value="Sidang Petang"></label></div><div id="modalNotice" class="notice" hidden></div><div class="info">✓ Sistem menjana ID pentadbir. Kata laluan sementara mesti ditukar semasa log masuk pertama.</div><div class="modal-actions"><button type="button" class="ghost close">Batal</button><button class="primary" type="submit">Cipta sekolah & akaun</button></div></form></div>`);
    const modal = document.querySelector("#modal");
    modal.querySelectorAll(".close").forEach((button) => button.addEventListener("click", () => modal.remove()));
    const select = modal.querySelector("select[name=sessionMode]");
    select.addEventListener("change", () => modal.querySelector("#afternoonField").hidden = select.value !== "two");
    modal.querySelector("#schoolForm").addEventListener("submit", async (event) => {
      event.preventDefault(); const button = event.currentTarget.querySelector("button[type=submit]"); button.disabled = true;
      try { const result = await api("createSchool", formData(event.currentTarget)); modal.remove(); credentialModal(result); }
      catch (error) { const box = modal.querySelector("#modalNotice"); box.textContent = error.message; box.hidden = false; }
      finally { button.disabled = false; }
    });
  }

  function credentialModal(data) {
    document.body.insertAdjacentHTML("beforeend", `<div id="credentialModal" class="modal-backdrop"><div class="modal credential"><span class="success-round">✓</span><small>AKAUN BERJAYA DISEDIAKAN</small><h2>${esc(data.schoolName)}</h2><p>Simpan dan berikan maklumat ini kepada pentadbir sekolah.</p><div class="credential-line"><span>ID Pentadbir</span><b>${esc(data.username)}</b><button data-copy="${esc(data.username)}">Salin</button></div><div class="credential-line"><span>Kata laluan sementara</span><b>${esc(data.temporaryPassword)}</b><button data-copy="${esc(data.temporaryPassword)}">Salin</button></div><div class="warning">Kata laluan hanya dipaparkan sekarang dan wajib ditukar selepas log masuk.</div><button id="credentialDone" class="primary wide">Selesai</button></div></div>`);
    document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Disalin ✓"; }));
    document.querySelector("#credentialDone").addEventListener("click", () => { document.querySelector("#credentialModal").remove(); superView(); });
  }

  async function resetPassword(id, name) {
    if (!confirm("Jana kata laluan sementara baharu untuk " + name + "?")) return;
    try { credentialModal(await api("resetAdminPassword", { schoolId: id })); } catch (error) { notice(error.message); }
  }

  const modules = [
    ["E-JKM & Kehadiran", "Rekod kehadiran murid", "blue", "✓"], ["Guru Bertugas Mingguan", "Senarai dan rumusan", "violet", "♙"], ["Keberadaan Guru & AKP", "Rekod keberadaan staf", "green", "◷"], ["Pemantauan Sekolah", "Kebersihan dan keselamatan", "amber", "◈"], ["Guru Bertugas RMT", "Laporan dan arkib RMT", "rose", "⌁"], ["OPR & Surat-menyurat", "Dokumen dan simpanan", "cyan", "▤"]
  ];

  function schoolView() {
    const { school, admin } = state.me;
    shell(`<section class="school-hero"><div class="school-crest">${school.logoUrl ? `<img src="${esc(school.logoUrl)}" alt="Logo sekolah">` : "🏫"}</div><div><small>RUANG SEKOLAH</small><h1>${esc(school.name)}</h1><p>${esc(school.code)} · ${esc(school.district)}, ${esc(school.state)}</p></div><button id="editSchool" class="secondary">⚙ Edit profil sekolah</button></section>
      <div id="notice" class="notice" hidden></div>
      <section class="school-facts"><article><small>Struktur sekolah</small><b>${school.sessionMode === "two" ? "Dua sidang" : "Satu sidang"}</b><p>${esc(school.morningName)}${school.afternoonName ? ` · ${esc(school.afternoonName)}` : ""}</p></article><article><small>Pentadbir sekolah</small><b>${esc(admin.fullName)}</b><p>${esc(admin.username)}</p></article><article><small>Status akaun</small><b class="green-text">Aktif</b><p>Data sekolah diasingkan</p></article></section>
      <section class="panel"><div class="panel-heading"><div><small>FUNGSI INDUK HEMSTT</small><h2>Modul pengurusan HEM</h2><p>Setiap modul menggunakan identiti dan tetapan sekolah ini.</p></div></div><div class="module-grid">${modules.map(([name, desc, color, icon]) => `<article><i class="${color}">${icon}</i><div><h3>${name}</h3><p>${desc}</p></div><span>Penyediaan</span></article>`).join("")}</div></section>`, school.name);
    document.querySelector("#editSchool").addEventListener("click", openEditSchool);
    if (admin.mustChangePassword) openPasswordModal(true);
  }

  function openEditSchool() {
    const school = state.me.school;
    document.body.insertAdjacentHTML("beforeend", `<div id="modal" class="modal-backdrop"><form id="editForm" class="modal glass-card"><div class="modal-heading"><div><small>PROFIL SEKOLAH</small><h2>Kemas kini identiti sekolah</h2></div><button type="button" class="close">×</button></div><div class="form-grid"><label class="full">Nama sekolah<input name="name" value="${esc(school.name)}" required></label><label>Daerah<input name="district" value="${esc(school.district)}"></label><label>Negeri<input name="state" value="${esc(school.state)}"></label><label class="full">Alamat<textarea name="address">${esc(school.address)}</textarea></label><label>Struktur sidang<select name="sessionMode"><option value="one" ${school.sessionMode === "one" ? "selected" : ""}>Satu sidang</option><option value="two" ${school.sessionMode === "two" ? "selected" : ""}>Dua sidang</option></select></label><label>Nama sidang utama<input name="morningName" value="${esc(school.morningName)}"></label><label id="afternoonField" ${school.sessionMode === "two" ? "" : "hidden"}>Nama sidang kedua<input name="afternoonName" value="${esc(school.afternoonName || "Sidang Petang")}"></label><label class="full">Logo sekolah<input name="logo" type="file" accept="image/png,image/jpeg"></label></div><div id="modalNotice" class="notice" hidden></div><div class="modal-actions"><button type="button" class="ghost close">Batal</button><button class="primary">Simpan perubahan</button></div></form></div>`);
    const modal = document.querySelector("#modal"); modal.querySelectorAll(".close").forEach(b => b.addEventListener("click", () => modal.remove()));
    const select = modal.querySelector("select"); select.addEventListener("change", () => modal.querySelector("#afternoonField").hidden = select.value !== "two");
    modal.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault(); const data = formData(event.currentTarget); const file = event.currentTarget.logo.files[0];
      try {
        if (file) { if (file.size > 2_000_000) throw new Error("Logo mestilah di bawah 2 MB."); data.logoData = await fileToData(file); data.logoName = file.name; }
        await api("updateSchool", data); modal.remove(); await hydrate(); notice("Profil sekolah berjaya dikemas kini.", "success");
      } catch (error) { const box = modal.querySelector("#modalNotice"); box.textContent = error.message; box.hidden = false; }
    });
  }

  const fileToData = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });

  function openPasswordModal(forced) {
    if (document.querySelector("#passwordModal")) return;
    document.body.insertAdjacentHTML("beforeend", `<div id="passwordModal" class="modal-backdrop"><form id="passwordForm" class="modal password-modal"><span class="success-round key">⌁</span><small>KESELAMATAN AKAUN</small><h2>${forced ? "Tukar kata laluan sementara" : "Tukar kata laluan"}</h2><p>${forced ? "Log masuk pertama memerlukan kata laluan baharu sebelum meneruskan." : "Gunakan kata laluan yang sukar diteka."}</p><label>Kata laluan semasa<input name="currentPassword" type="password" required></label><label>Kata laluan baharu<input name="newPassword" type="password" minlength="8" required></label><label>Sahkan kata laluan<input name="confirmPassword" type="password" minlength="8" required></label><div id="passwordNotice" class="notice" hidden></div><button class="primary wide">Simpan kata laluan baharu</button></form></div>`);
    document.querySelector("#passwordForm").addEventListener("submit", async (event) => { event.preventDefault(); const data = formData(event.currentTarget); const box = document.querySelector("#passwordNotice"); if (data.newPassword !== data.confirmPassword) { box.textContent = "Pengesahan kata laluan tidak sepadan."; box.hidden = false; return; } try { await api("changePassword", data); document.querySelector("#passwordModal").remove(); await hydrate(); } catch (error) { box.textContent = error.message; box.hidden = false; } });
  }

  async function hydrate() {
    try { const result = await api("me"); state.me = result; state.me.role === "super" ? await superView() : schoolView(); }
    catch { logout(false); }
  }

  async function logout(callServer = true) {
    if (callServer && state.token) { try { await api("logout"); } catch {} }
    state.token = ""; state.me = null; sessionStorage.removeItem("hemstt_token"); loginView();
  }

  state.token ? hydrate() : loginView();
})();
