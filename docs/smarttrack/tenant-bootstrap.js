(() => {
  "use strict";

  const code = new URLSearchParams(location.search).get("school")?.trim().toUpperCase() || "";
  const config = window.HEMSTT_CONFIG || {};

  function showError(message) {
    document.body.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#eef7ff;font-family:Inter,system-ui,sans-serif"><section style="max-width:520px;background:#fff;border:1px solid #cfe1f3;border-radius:24px;padding:32px;box-shadow:0 24px 70px #0b4d8c1f"><strong style="color:#0875d1;letter-spacing:.15em">HEMSTT</strong><h1 style="color:#082c59">Ruang sekolah belum dapat dibuka</h1><p style="color:#536b85;line-height:1.65">${String(message || "Kod sekolah tidak sah.").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</p><a href="../" style="display:inline-block;margin-top:12px;background:#075ac4;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:800">Kembali ke HEMSTT</a></section></main>`;
  }

  async function getSchool() {
    if (!code) throw new Error("Pautan ini tidak mempunyai kod sekolah.");
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(config.apiUrl || "")) throw new Error("Pelayan HEMSTT belum disambungkan.");
    const url = `${config.apiUrl}?${new URLSearchParams({ action: "publicSchool", schoolCode: code })}`;
    const response = await fetch(url, { cache: "no-store" });
    const result = await response.json();
    if (!result.ok || !result.school) throw new Error(result.error || "Sekolah tidak dijumpai.");
    return result.school;
  }

  function replaceText(root, replacements) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let value = node.nodeValue;
      replacements.forEach(([from, to]) => { value = value.replaceAll(from, to); });
      node.nodeValue = value;
    });
  }

  function applySchool(school) {
    window.HEMSTT_TENANT = Object.freeze({ ...school, code });
    document.documentElement.dataset.schoolCode = code;
    document.title = `HEM SMARTTRACK | ${school.name}`;
    replaceText(document.body, [
      ["Sekolah Kebangsaan Ranggu", school.name],
      ["SK Ranggu", school.name],
      ["Tawau, Sabah", [school.district, school.state].filter(Boolean).join(", ")],
    ]);

    document.querySelectorAll(".topbar-school-copy strong").forEach((node) => { node.textContent = `Bahagian Pengurusan Unit HEM ${school.name}`; });
    document.querySelectorAll(".topbar-school-copy span").forEach((node) => { node.textContent = `${school.name} • ${[school.district, school.state].filter(Boolean).join(", ")}`; });
    document.querySelectorAll("img.logo-school, img.crest-school, .topbar-logo-pair img:last-child").forEach((image) => {
      if (school.logoUrl) image.src = school.logoUrl;
      image.alt = `Logo ${school.name}`;
    });

    const map = document.querySelector(".school-map-frame iframe");
    if (map) map.src = `https://www.google.com/maps?q=${encodeURIComponent([school.name, school.address, school.district, school.state].filter(Boolean).join(", "))}&output=embed`;

    document.querySelectorAll('[data-session="afternoon"], [data-staff-session-panel="afternoon"], .home-session-grid .afternoon').forEach((node) => {
      if (school.sessionMode !== "two") node.hidden = true;
    });
  }

  function installApiBridge() {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      const requested = new URL(typeof input === "string" ? input : input.url, location.href);
      const marker = "/hemstt-api/";
      const markerIndex = requested.pathname.indexOf(marker);
      if (markerIndex < 0) return nativeFetch(input, init);

      const resource = requested.pathname.slice(markerIndex + marker.length).split("/")[0];
      const method = String(init.method || (typeof input !== "string" && input.method) || "GET").toUpperCase();
      let payload = {};
      if (init.body) {
        if (typeof init.body === "string") {
          try { payload = JSON.parse(init.body); } catch { payload = { rawBody: init.body }; }
        } else if (init.body instanceof FormData) {
          payload = Object.fromEntries(init.body.entries());
        }
      }
      const bridgeBody = {
        action: "smarttrackBridge",
        schoolCode: code,
        resource,
        requestMethod: method,
        query: Object.fromEntries(requested.searchParams.entries()),
        payload,
      };
      const response = await nativeFetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(bridgeBody),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({ ok: false, error: "Jawapan pelayan tidak dapat dibaca." }));
      const body = result.ok ? result.data : { error: result.error || "Permintaan tidak berjaya." };
      return new Response(JSON.stringify(body), {
        status: result.ok ? (result.status || 200) : (result.status || 400),
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    };
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  getSchool()
    .then((school) => {
      applySchool(school);
      installApiBridge();
      return loadScript("class-demographics.js?v=172");
    })
    .then(() => loadScript("app.js?v=tenant-1"))
    .catch((error) => showError(error.message));
})();
