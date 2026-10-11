(function () {
  const app = document.getElementById("app");
  const params = new URLSearchParams(window.location.search);
  const rawTo = (params.get("to") || "").trim();

  if (!rawTo) {
    renderMaker();
    return;
  }

  const destination = resolveDestination(rawTo);
  if (!destination.ok) {
    app.innerHTML = `
      <h1>Ссылка не подошла</h1>
      <p class="muted">${escapeHtml(destination.error)}</p>
    `;
    return;
  }

  const scriptId = scriptIdFromUrl(destination.url);
  boot(destination.url, scriptId);

  async function boot(url, id) {
    app.innerHTML = `<p class="muted">Загрузка…</p>`;

    let title = titleFromUrl(url);
    let image = "";

    if (id) {
      const row = await fetchScript(id);
      if (row) {
        if (row.title) title = row.title;
        if (row.game_img) image = row.game_img;
      }
    }

    document.title = title;

    const imgHtml = image
      ? `<img class="cover" src="${escapeAttr(image)}" alt="${escapeAttr(title)}" referrerpolicy="no-referrer" />`
      : "";

    app.innerHTML = `
      ${imgHtml}
      <h1>${escapeHtml(title)}</h1>
      <a class="btn" href="${escapeAttr(url.href)}">Читать статью</a>
    `;
  }

  function renderMaker() {
    app.innerHTML = `
      <h1>Собрать ссылку на прокладку</h1>
      <p class="muted">
        Вставь адрес скрипта, например
        <code>https://diamondscripts.com/script/5</code>
      </p>
      <label class="label" for="article-url">URL статьи</label>
      <input id="article-url" class="input" type="url" placeholder="https://diamondscripts.com/script/5" />
      <button class="btn" type="button" id="make-btn">Скопировать ссылку</button>
      <p class="muted" id="make-status"></p>
    `;

    const input = document.getElementById("article-url");
    const status = document.getElementById("make-status");
    document.getElementById("make-btn").addEventListener("click", async () => {
      const result = resolveDestination(input.value.trim());
      if (!result.ok) {
        status.textContent = result.error;
        return;
      }

      const link = new URL(window.location.href);
      link.search = "";
      link.searchParams.set("to", result.url.href);
      const text = link.toString();

      try {
        await navigator.clipboard.writeText(text);
        status.textContent = "Скопировано: " + text;
      } catch {
        status.textContent = text;
      }
    });
  }

  async function fetchScript(id) {
    const url = window.CONFIG && window.CONFIG.supabaseUrl;
    const key = window.CONFIG && window.CONFIG.supabaseAnonKey;
    if (!url || !key) return null;

    try {
      const endpoint =
        url.replace(/\/$/, "") +
        "/rest/v1/scripts?select=title,game_img&id=eq." +
        encodeURIComponent(id);

      const res = await fetch(endpoint, {
        headers: {
          apikey: key,
          Authorization: "Bearer " + key,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const rows = await res.json();
      return rows && rows[0] ? rows[0] : null;
    } catch {
      return null;
    }
  }

  function scriptIdFromUrl(url) {
    const match = url.pathname.match(/\/script\/([^/]+)\/?$/i);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function resolveDestination(value) {
    if (!value) {
      return { ok: false, error: "Пустой адрес." };
    }

    const base = getSiteOrigin();
    if (!base) {
      return { ok: false, error: "Сначала укажи свой сайт в config.js." };
    }

    let parsed;
    try {
      parsed = value.startsWith("http://") || value.startsWith("https://")
        ? new URL(value)
        : new URL(value.startsWith("/") ? value : "/" + value, base.origin);
    } catch {
      return { ok: false, error: "Это не похоже на нормальный URL." };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Можно только http/https." };
    }

    if (!hostsMatch(parsed.hostname, base.hostname)) {
      return {
        ok: false,
        error: "Можно вести только на " + base.hostname + ", а не на чужие сайты.",
      };
    }

    return { ok: true, url: parsed };
  }

  function getSiteOrigin() {
    try {
      const site = (window.CONFIG && window.CONFIG.site) || "";
      if (!site || site.includes("YOUR-SITE")) return null;
      return new URL(site);
    } catch {
      return null;
    }
  }

  function hostsMatch(a, b) {
    const norm = (h) => h.replace(/^www\./, "").toLowerCase();
    return norm(a) === norm(b);
  }

  function titleFromUrl(url) {
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || url.hostname;
    const cleaned = decodeURIComponent(last)
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    if (!cleaned) return "Читать статью";
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
