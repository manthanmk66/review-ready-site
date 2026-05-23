/* Live-fetch from GitHub on every page load — no rebuild required.
 * Sources:
 *   - CHANGELOG.md  → rendered below the install section
 *   - api.github.com/repos/manthanmk66/review-ready → stars + last commit
 */

const REPO = "manthanmk66/review-ready";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main`;
const API_BASE = `https://api.github.com/repos/${REPO}`;
const CACHE_BUST = `?t=${Math.floor(Date.now() / 60000)}`; // 1-min bucket

// ── Footer year
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// ── Copy buttons (hero CTA + codeblock copy + version-stamp clicks)
function flashToast(text = "copied") {
  const toast = document.querySelector("[data-toast]");
  if (!toast) return;
  toast.textContent = text;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  clearTimeout(flashToast._t);
  flashToast._t = setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => (toast.hidden = true), 240);
  }, 1600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    document.body.removeChild(ta);
    return ok;
  }
}

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = btn.getAttribute("data-copy");
    const ok = await copyText(text);
    if (ok) {
      btn.classList.add("is-copied");
      const hint = btn.querySelector("[data-copy-hint]");
      if (hint) {
        const original = hint.textContent;
        hint.textContent = "copied";
        setTimeout(() => (hint.textContent = original), 1600);
      }
      const label = btn.tagName === "BUTTON" && !btn.querySelector("[data-copy-hint]");
      if (label) {
        const orig = btn.textContent;
        btn.textContent = "copied";
        setTimeout(() => (btn.textContent = orig), 1600);
      }
      flashToast(`copied: ${text.length > 32 ? text.slice(0, 32) + "…" : text}`);
      setTimeout(() => btn.classList.remove("is-copied"), 1600);
    } else {
      flashToast("copy failed");
    }
  });
});

// ── GitHub stats: stars + last commit + latest tag
(async function loadRepoStats() {
  try {
    const [repoRes, commitsRes, tagsRes] = await Promise.all([
      fetch(`${API_BASE}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE}/commits?per_page=1`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE}/tags?per_page=1`).then((r) => (r.ok ? r.json() : null)),
    ]);

    if (repoRes && typeof repoRes.stargazers_count === "number") {
      document.querySelectorAll("[data-stars]").forEach((el) => {
        el.textContent = `★ ${repoRes.stargazers_count}`;
      });
    }

    if (Array.isArray(commitsRes) && commitsRes[0]) {
      const commit = commitsRes[0];
      const date = new Date(commit.commit.author.date);
      const rel = relativeTime(date);
      const sha = commit.sha.slice(0, 7);
      document.querySelectorAll("[data-last-commit]").forEach((el) => {
        el.innerHTML = `last commit <a href="https://github.com/${REPO}/commit/${commit.sha}" target="_blank" rel="noopener noreferrer">${sha}</a> · ${rel}`;
      });
      document.querySelectorAll("[data-updated]").forEach((el) => {
        const msg = commit.commit.message.split("\n")[0];
        const short = msg.length > 60 ? msg.slice(0, 60) + "…" : msg;
        el.innerHTML = `Last update: <a href="https://github.com/${REPO}/commit/${commit.sha}" target="_blank" rel="noopener noreferrer">${sha}</a> · ${rel} · <em>${escapeHTML(short)}</em>`;
      });
    }

    if (Array.isArray(tagsRes) && tagsRes[0]) {
      const tag = tagsRes[0].name.replace(/^v/, "");
      document.querySelectorAll("[data-version]").forEach((el) => {
        el.textContent = `v${tag}`;
      });
      document.querySelectorAll("[data-version-foot]").forEach((el) => {
        el.textContent = tag;
      });
    }
  } catch (err) {
    console.warn("Repo stats fetch failed (likely rate-limited):", err);
    // Keep the static fallback values that are already in the HTML.
  }
})();

// ── Changelog: fetch raw markdown, parse with marked, render entry-by-entry
(async function loadChangelog() {
  const target = document.querySelector("[data-changelog]");
  if (!target) return;

  try {
    const res = await fetch(`${RAW_BASE}/CHANGELOG.md${CACHE_BUST}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();

    // Wait for marked to be available
    if (typeof marked === "undefined") {
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (typeof marked !== "undefined") {
            clearInterval(check);
            resolve();
          }
        }, 40);
        setTimeout(() => {
          clearInterval(check);
          resolve();
        }, 4000);
      });
    }

    const entries = parseChangelog(md);
    if (!entries.length) {
      target.innerHTML =
        '<p class="loading">Could not parse the changelog. <a href="https://github.com/' +
        REPO +
        '/blob/main/CHANGELOG.md">Read it on GitHub →</a></p>';
      return;
    }

    target.innerHTML = entries
      .map((entry, i) => {
        const tag = i === 0 ? '<p class="cl-entry__tag">latest</p>' : "";
        const body =
          typeof marked !== "undefined"
            ? marked.parse(entry.body)
            : `<pre>${escapeHTML(entry.body)}</pre>`;
        return `
          <article class="cl-entry">
            <div class="cl-entry__meta">
              <p class="cl-entry__version">v${escapeHTML(entry.version)}</p>
              <p class="cl-entry__date">${escapeHTML(entry.date)}</p>
              ${tag}
            </div>
            <div class="cl-entry__body">${body}</div>
          </article>
        `;
      })
      .join("");
  } catch (err) {
    console.warn("Changelog fetch failed:", err);
    target.innerHTML = `
      <p class="loading">
        Couldn't load the changelog right now.
        <a href="https://github.com/${REPO}/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">Read it on GitHub →</a>
      </p>
    `;
  }
})();

// ── Parse a Keep-a-Changelog style file into structured entries.
// Format expected:
//   ## [0.3.0] - 2026-05-19
//   ### Added
//   - ...
function parseChangelog(md) {
  const lines = md.split("\n");
  const entries = [];
  let current = null;

  for (const line of lines) {
    const header = line.match(/^##\s+\[?([0-9][^\]\s]*)\]?\s*-\s*(.+?)\s*$/);
    if (header) {
      if (current) entries.push(current);
      current = { version: header[1], date: header[2], body: "" };
      continue;
    }
    if (current) {
      current.body += line + "\n";
    }
  }
  if (current) entries.push(current);
  return entries.map((e) => ({
    version: e.version.trim(),
    date: e.date.trim(),
    body: e.body.trim(),
  }));
}

// ── Helpers
function relativeTime(date) {
  const now = Date.now();
  const diff = now - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
