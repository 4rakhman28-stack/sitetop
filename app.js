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
    app.innerHTML = `<a class="btn-gold" href="#">Get Script</a>`;
    return;
  }

  startCountdown(destination.url.href);

  function startCountdown(target) {
    let left = Number(window.CONFIG && window.CONFIG.countdown);
    if (!Number.isFinite(left) || left < 0) left = 5;

    app.innerHTML = `
      <a class="btn-gold is-wait" id="get-btn" href="#">Get Script ${left}</a>
    `;

    const btn = document.getElementById("get-btn");
    btn.addEventListener("click", (event) => {
      if (left > 0) event.preventDefault();
    });

    const timer = setInterval(() => {
      left -= 1;
      if (left > 0) {
        btn.textContent = "Get Script " + left;
        return;
      }

      clearInterval(timer);
      btn.textContent = "Get Script";
      btn.classList.remove("is-wait");
      btn.setAttribute("href", target);
    }, 1000);
  }

  function renderMaker() {
    app.innerHTML = `
      <input id="article-url" class="input" type="url" placeholder="https://pastebin.com/xxxxx" />
      <button class="btn-gold" type="button" id="make-btn">Copy link</button>
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
        status.textContent = text;
      } catch {
        status.textContent = text;
      }
    });
  }

  function resolveDestination(value) {
    if (!value) {
      return { ok: false, error: "Empty URL." };
    }

    const base = getSiteOrigin();
    if (!base) {
      return { ok: false, error: "Set pastebin.com in config.js." };
    }

    let parsed;
    try {
      parsed = value.startsWith("http://") || value.startsWith("https://")
        ? new URL(value)
        : new URL(value.startsWith("/") ? value : "/" + value, base.origin);
    } catch {
      return { ok: false, error: "Bad URL." };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Need http/https." };
    }

    if (!hostsMatch(parsed.hostname, base.hostname)) {
      return { ok: false, error: "Only " + base.hostname };
    }

    return { ok: true, url: parsed };
  }

  function getSiteOrigin() {
    try {
      const site = (window.CONFIG && window.CONFIG.site) || "";
      return new URL(site);
    } catch {
      return null;
    }
  }

  function hostsMatch(a, b) {
    const norm = (h) => h.replace(/^www\./, "").toLowerCase();
    return norm(a) === norm(b);
  }
})();
