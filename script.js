const defaultGames = [
  { id: "guessthemovie", name: "GuessTheMovie", url: "https://guessthemovie.name/" },
  { id: "stardewdle", name: "Stardewdle", url: "https://www.stardewdle.com/game/" },
  { id: "loldle", name: "LoLdle", url: "https://loldle.net/" },
  { id: "guesstheaudio", name: "GuessTheAudio", url: "https://guesstheaudio.com/" },
  { id: "gamedle", name: "Gamedle", url: "https://www.gamedle.wtf/?lang=en" },
  { id: "guessthegame", name: "GuessThe.Game", url: "https://guessthe.game/" },
  { id: "hotsdle", name: "HOTSdle", url: "https://hotsdle.zgame.studio/" },
  { id: "krillion", name: "Krillion", url: "https://krillion.io/" },
  { id: "100hitow", name: "100 Hitów", url: "https://100hitow.pl/daily" },
  { id: "wordle", name: "Wordle", url: "https://www.nytimes.com/games/wordle/index.html" },
  { id: "connections", name: "Connections", url: "https://www.nytimes.com/games/connections" },
  { id: "whodunchat", name: "WhoDunChat", url: "https://whodunchat.ducksaint.com/" }
];

const EDIT_PIN = "5683";
const CUSTOM_GAMES_KEY = "lena-custom-games-v1";
const CATALOG_KEY = "lena-game-catalog-v1";
const LOGIN_KEY = "lena-login-until";
const LOGIN_DURATION = 24 * 60 * 60 * 1000;
function hasLogin() {
  try { return Number(localStorage.getItem(LOGIN_KEY)) > Date.now(); }
  catch { return false; }
}
let editing = hasLogin();
let removing = false;

function normalizeGameUrl(value) {
  const url = new URL(value.trim());
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Use a public http or https game link.");
  }
  url.hash = "";
  return url.href;
}

function loadCustomGames() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_GAMES_KEY));
    if (!Array.isArray(saved)) return [];
    const ids = new Set(defaultGames.map(game => game.id));
    const urls = new Set(defaultGames.map(game => normalizeGameUrl(game.url)));
    return saved.filter(game => {
      try {
        if (!game || typeof game.id !== "string" || !game.id.startsWith("custom-") ||
            typeof game.name !== "string" || !game.name.trim() || game.name.length > 200 ||
            typeof game.url !== "string") return false;
        game.url = normalizeGameUrl(game.url);
        if (ids.has(game.id) || urls.has(game.url)) return false;
        ids.add(game.id);
        urls.add(game.url);
        return true;
      } catch { return false; }
    });
  } catch { return []; }
}

function loadCatalog() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATALOG_KEY));
    if (saved && Array.isArray(saved.games) && Array.isArray(saved.removed)) {
      const ids = new Set();
      const valid = saved.games.filter(game => {
        try {
          if (!game || typeof game.id !== "string" || ids.has(game.id) ||
              typeof game.name !== "string" || !game.name.trim() || game.name.length > 200 ||
              typeof game.url !== "string") return false;
          game.url = normalizeGameUrl(game.url);
          ids.add(game.id);
          return true;
        } catch { return false; }
      });
      return { games: valid, removed: saved.removed.filter(id => ids.has(id)) };
    }
  } catch {}
  return { games: [...defaultGames, ...loadCustomGames()], removed: [] };
}
let catalog = loadCatalog();
let games = catalog.games.filter(game => !catalog.removed.includes(game.id));

function saveCatalog(next) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(next));
  catalog = next;
  games = catalog.games.filter(game => !catalog.removed.includes(game.id));
}

function requireLogin() {
  if (hasLogin()) return true;
  setEditing(false);
  return false;
}

function moveGame(id, toBin) {
  if (!requireLogin() || (toBin && !removing)) return;
  const status = document.getElementById(toBin ? "list-status" : "bin-status");
  try {
    const removed = new Set(catalog.removed);
    if (toBin) removed.add(id);
    else removed.delete(id);
    saveCatalog({ games: catalog.games, removed: [...removed] });
    if (toBin) removing = false;
    status.textContent = "";
    render();
    renderBin();
  } catch { status.textContent = "Could not save. Try again."; }
}

const STORAGE_KEY = "dle-tracker-v3";

function getPolandDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function loadState() {
  const today = getPolandDate();
  let state = null;

  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    state = null;
  }

  if (!state || state.date !== today) {
    state = {
      date: today,
      completed: []
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  return state;
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toggleCompleted(id) {
  const index = state.completed.indexOf(id);
  if (index > -1) {
    state.completed.splice(index, 1);
  } else {
    state.completed.push(id);
  }
  saveState();
}

function markCompleted(id) {
  if (!state.completed.includes(id)) {
    state.completed.push(id);
    saveState();
  }
}

function render() {
  const gamesEl = document.getElementById("games");
  gamesEl.innerHTML = "";

  const completed = new Set(state.completed);

  games.forEach(game => {
    const isDone = completed.has(game.id);
    const row = document.createElement("article");
    row.className = "game" + (isDone ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "check";
    checkbox.checked = isDone;
    checkbox.setAttribute("aria-label", `Mark ${game.name} completed`);

    checkbox.addEventListener("change", () => {
      toggleCompleted(game.id);
      row.classList.toggle("done", checkbox.checked);
      updateProgress();
    });

    const link = document.createElement("a");
    link.className = "game-link";
    link.href = game.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = game.name;

    link.addEventListener("click", () => {
      markCompleted(game.id);
      row.classList.add("done");
      checkbox.checked = true;
      updateProgress();
    });

    row.append(checkbox, link);
    if (editing && removing) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-game secondary";
      remove.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
      remove.setAttribute("aria-label", `Remove ${game.name}`);
      remove.addEventListener("click", () => moveGame(game.id, true));
      row.classList.add("editable");
      row.appendChild(remove);
    }
    gamesEl.appendChild(row);
  });

  document.getElementById("bin-count").textContent = catalog.removed.length;
  document.getElementById("remove-mode").setAttribute("aria-pressed", String(removing));
  updateProgress();
}

function updateProgress() {
  const count = state.completed.filter(id => games.some(game => game.id === id)).length;
  document.getElementById("progress").textContent = `${count} / ${games.length}`;
}

function getMillisecondsUntilPolandMidnight() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);

  const values = {};
  parts.forEach(part => {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  });

  const currentPolandAsUTC = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  const tomorrow = new Date(currentPolandAsUTC);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    timeZoneName: "longOffset"
  });

  const offsetPart = offsetFormatter.formatToParts(now)
    .find(part => part.type === "timeZoneName")?.value || "GMT+01:00";

  const match = offsetPart.match(/GMT([+-])(\d{2}):?(\d{2})/);
  let offsetMinutes = 60;
  if (match) {
    offsetMinutes = (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "+" ? 1 : -1);
  }

  return tomorrow.getTime() - offsetMinutes * 60000 - now.getTime();
}

function updateCountdown() {
  const ms = getMillisecondsUntilPolandMidnight();

  if (ms <= 0) {
    state = loadState();
    render();
    return;
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  document.getElementById("countdown").textContent =
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;
}

setInterval(() => {
  if (editing && !hasLogin()) setEditing(false);
  const today = getPolandDate();

  if (state.date !== today) {
    state = loadState();
    render();
  }

  updateCountdown();
}, 1000);

render();
updateCountdown();

const loginDialog = document.getElementById("login-dialog");
const pinInput = document.getElementById("edit-pin");
const editorStatus = document.getElementById("editor-status");
const urlInput = document.getElementById("game-url");
const titleInput = document.getElementById("game-title");
function setEditing(value) {
  editing = value;
  if (!value) removing = false;
  document.getElementById("edit-actions").hidden = !value;
  const loginButton = document.getElementById("edit-toggle");
  loginButton.textContent = value ? "Logged in" : "Login";
  loginButton.disabled = value;
  if (!value) {
    document.getElementById("editor").close();
    document.getElementById("bin-dialog").close();
  }
  render();
}

function renderBin() {
  const bin = document.getElementById("bin-games");
  bin.innerHTML = "";
  const removedGames = catalog.games.filter(game => catalog.removed.includes(game.id));
  if (!removedGames.length) {
    const empty = document.createElement("p");
    empty.className = "empty-bin";
    empty.textContent = "Bin is empty";
    bin.appendChild(empty);
  }
  removedGames.forEach(game => {
    const row = document.createElement("div");
    row.className = "bin-row";
    const name = document.createElement("span");
    name.textContent = game.name;
    const restore = document.createElement("button");
    restore.type = "button";
    restore.textContent = "Restore";
    restore.setAttribute("aria-label", `Restore ${game.name}`);
    restore.addEventListener("click", () => moveGame(game.id, false));
    row.append(name, restore);
    bin.appendChild(row);
  });
}

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => document.getElementById(button.dataset.close).close());
});
document.getElementById("add-game").addEventListener("click", () => {
  if (!requireLogin()) return;
  removing = false;
  render();
  document.getElementById("game-form").reset();
  editorStatus.textContent = "";
  document.getElementById("editor").showModal();
  urlInput.focus();
});
document.getElementById("remove-mode").addEventListener("click", () => {
  if (!requireLogin()) return;
  removing = !removing;
  render();
});
document.getElementById("open-bin").addEventListener("click", () => {
  if (!requireLogin()) return;
  removing = false;
  render();
  document.getElementById("bin-status").textContent = "";
  renderBin();
  document.getElementById("bin-dialog").showModal();
});
document.getElementById("edit-toggle").addEventListener("click", () => {
  if (hasLogin()) return;
  document.getElementById("login-form").reset();
  document.getElementById("login-error").textContent = "";
  loginDialog.showModal();
  pinInput.focus();
});
document.getElementById("cancel-login").addEventListener("click", () => loginDialog.close());
document.getElementById("login-form").addEventListener("submit", event => {
  event.preventDefault();
  if (pinInput.value !== EDIT_PIN) {
    document.getElementById("login-error").textContent = "Incorrect PIN.";
    pinInput.select();
    return;
  }
  try { localStorage.setItem(LOGIN_KEY, String(Date.now() + LOGIN_DURATION)); }
  catch {
    document.getElementById("login-error").textContent = "Could not save login. Try again.";
    return;
  }
  pinInput.value = "";
  loginDialog.close();
  setEditing(true);
});

document.getElementById("game-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!requireLogin()) return;
  try {
    const url = normalizeGameUrl(urlInput.value);
    const name = titleInput.value.trim();
    if (!name || name.length > 200) throw new Error("Enter a game name (up to 200 characters).");
    if (games.some(game => normalizeGameUrl(game.url) === url)) throw new Error("This game is already on your list.");
    const existing = catalog.games.find(game => normalizeGameUrl(game.url) === url);
    if (existing) throw new Error("This game is in the bin. Restore it there.");
    saveCatalog({ games: [...catalog.games, { id: `custom-${crypto.randomUUID()}`, name, url }], removed: catalog.removed });
    document.getElementById("game-form").reset();
    render();
    editorStatus.textContent = "";
    document.getElementById("editor").close();
  } catch (error) {
    editorStatus.textContent = error instanceof TypeError
      ? "Enter a valid game link, such as https://example.com/daily."
      : error.message;
  }
});

setEditing(editing);
window.addEventListener("focus", () => setEditing(hasLogin()));
window.addEventListener("storage", event => {
  if (event.key === LOGIN_KEY || event.key === null) setEditing(hasLogin());
  if (event.key === CATALOG_KEY || event.key === null) {
    catalog = loadCatalog();
    games = catalog.games.filter(game => !catalog.removed.includes(game.id));
    render();
    renderBin();
  }
});
