const games = [
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
  { id: "connections", name: "Connections", url: "https://www.nytimes.com/games/connections" }
];

const STORAGE_KEY = "dle-tracker-v2";

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

    // Toggle checkbox directly without following the link
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

    // Clicking the link marks as completed
    link.addEventListener("click", () => {
      markCompleted(game.id);
      row.classList.add("done");
      checkbox.checked = true;
      updateProgress();
    });

    row.append(checkbox, link);
    gamesEl.appendChild(row);
  });

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
  const today = getPolandDate();

  if (state.date !== today) {
    state = loadState();
    render();
  }

  updateCountdown();
}, 1000);

render();
updateCountdown();