const STORAGE_KEY = "store-contact-system-v6";

const areas = [
  "北海道・東北",
  "東京",
  "関東",
  "東海",
  "名古屋 栄・錦",
  "関西",
  "大阪 ミナミ",
  "大阪 キタ",
  "京都 祇園",
  "神戸",
  "中国・四国",
  "広島／流川・福山",
  "九州・沖縄",
  "その他",
];

const assignees = ["濱治", "羽賀", "佐藤", "鈴木", "安田"];
const statusOrder = ["未連絡", "連絡済", "返信待ち", "撮影決定", "完了"];
const progressMap = { "未連絡": 12, "連絡済": 35, "返信待ち": 55, "撮影決定": 78, "完了": 100 };

const storeGroups = {
  "大阪 ミナミ": `
A-TOP -MONSTAR-
Ai
IR
Ai$
ACQUA-OSAKA HONTEN-
ACQUA -本店-
ASK
ADAM
ADAM RISE
ADAM REX
Addiction
ATOM
ATOM-ALLES-
ATOM-VENUS-
ATOM-Travis-
ATOM-PLACE-
ATOM-ROYAL-
ATOM-CASTLE-
AVALANCHE
AMATERAS
ALDEBARAN
AWARD
アンデッド
&i
AMBERS
AMBIENT
アンフェア
アンリミテッド
Are50
INFINITY
XXX -crest-
XXX -nex-
XXX -faith-
EKT
ETERNAL
EDENOsaka
ELDORADO 本店
L4
ACE CENTURION
大阪男塾
大阪男塾 一ノ瀬支店
ORGODEMIR
ALLSTAR -本店-
GAIA
KiJiMUNA
KING
King On Bunny
GIFT
CRØSS GUILD
CHRONO
GRACIA
goofee
Collection -osaka-
CODE
GORGEOUS
GOAT
GOLD
THE CLUB OSAKA
THE MIYABI -OSAKA-
THE ONE
SIGNAL OSAKA
Sirius☆☆☆☆☆
ShinAi
GENESIS
GENTLY
GENTLY DIVA
GENTLY GREED
GENTLEMAN’S CLUB GENTLE
GIORGIO
DILEMMA
GO
SQUARE OSAKA
STYLE
STADIUM
SWAMP
SWAMP FOG
Celeste Osaka
CENTRAL
ZEPHYR OSAKA
空-SORA osaka-
TITLE 72c4
宝地蔵 -紅-
W
DIAMONTÉ
Dear's大阪
Dear's BACHELOR
Dear's Lucia
Dear's大阪-2nd-
TOP DANDY -OSAKA-
TOP RUN
TOP1ONE
TORANOANA
SSS
neouniverse -REIGN-
neo universe
NEVER LAND
NOVA
Nox
BINX
BEAST
PYRAMID
FOUND OUT
FUYUTSUKI -WHITE-
FUYUTSUKI -OSAKA-
FLOWER
FREAK prod. by MERRY GO ROUND
BLEACH
BLUE OSAKA
PRIDE
PRIME
HOST OF DREAM
MARIA
MERRY GO ROUND 本店
MONSTAR-本店-
YGGDRASILL -OSAKA-
UNIVERSE
UNIVERSE -core-
UNIVERSE -zero-
UNIVERSE -MAX-
UNIVERSE -LUX-
YOUth
ReAL
Rigel
REVERSE
RE:BLAZE
REGOLITH -本店-
LEGEND
Retty
LOX
WORLD 大阪本店
WORLD 大阪本店 2部
`,
  "大阪 キタ": `
ATOM-UMEDA-
ATOM -UMEDA ANNEX-
ATOM-PRINCE-
AHEAD
ELDORADO -umeda-
P'CE UMEDA
`,
  "京都 祇園": `
I'll Antique
ACQUA -Amber-
RAD Air Drop 1st
RAD ONLY
RAD SPICE
RAD REGALIS
OMEGA by ACQUA
GATE- spice-
BAR NULLA
MODE
One Chance
`,
  "神戸": `
Atena
ARROW
Anser
EVOL
Ace
Grandia
GATE
Spica
Deep
TRUE
Dream
FATE
Felicia
Prince&Princess
Rise
link
`,
  "名古屋 栄・錦": `
ACQUA NAGOYA
ABYSS
A+1
ALZA
WELT
EIGHT
KIRAMEKI
KIRINZHI
King On Bunny 名古屋店
KINZISHI
GOLD NAGOYA
Chocolat -NAGOYA-
DEAR'S NEO
NEXT LEVEL
MIKADO
LEON
Royal Collection
`,
  "広島／流川・福山": `
ICE
ACQUA -Hiroshima-
Avid
AIM by ACQUA
CROWN GROUP
b/n
FABULOUS
BLACK-EVE-
BLACK LIST
U men's club
`,
};

const storeMaster = Object.entries(storeGroups).flatMap(([area, names]) =>
  names
    .trim()
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, area }))
);

const seedStores = storeMaster.map((store, index) => ({
  id: crypto.randomUUID(),
  name: store.name,
  area: store.area,
  assignee: assignees[index % assignees.length],
  status: "未連絡",
  targetDate: "",
  memo: "",
}));

let stores = loadStores();

const form = document.getElementById("storeForm");
const areaList = document.getElementById("areaList");
const ganttChart = document.getElementById("ganttChart");
const totalStores = document.getElementById("totalStores");
const visibleStores = document.getElementById("visibleStores");
const visibleCount = document.getElementById("visibleCount");
const summaryCards = document.getElementById("summaryCards");
const searchText = document.getElementById("searchText");
const filterArea = document.getElementById("filterArea");
const filterAssignee = document.getElementById("filterAssignee");
const filterStatus = document.getElementById("filterStatus");
const resetData = document.getElementById("resetData");
const storeNameInput = document.getElementById("storeName");
const storeAreaSelect = document.getElementById("storeArea");
const storeSuggestions = document.getElementById("storeSuggestions");

initSelects();
updateStoreSuggestions();

storeAreaSelect.addEventListener("change", () => {
  storeNameInput.value = "";
  updateStoreSuggestions(storeAreaSelect.value);
});

storeNameInput.addEventListener("input", () => {
  const matchedStore = findMasterStore(storeNameInput.value);
  if (matchedStore) {
    storeAreaSelect.value = matchedStore.area;
    updateStoreSuggestions(matchedStore.area);
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const matchedStore = findMasterStore(storeNameInput.value);
  const store = {
    id: crypto.randomUUID(),
    name: storeNameInput.value.trim(),
    area: matchedStore ? matchedStore.area : storeAreaSelect.value,
    assignee: document.getElementById("assignee").value,
    status: document.getElementById("status").value,
    targetDate: document.getElementById("targetDate").value,
    memo: "",
  };
  if (!store.name) return;
  stores.unshift(store);
  saveStores();
  form.reset();
  updateStoreSuggestions(storeAreaSelect.value);
  render();
});

[searchText, filterArea, filterAssignee, filterStatus].forEach((element) => element.addEventListener("input", render));

resetData.addEventListener("click", () => {
  if (!confirm("登録データを初期状態に戻しますか？")) return;
  stores = [...seedStores];
  saveStores();
  render();
});

function initSelects() {
  fillSelect(storeAreaSelect, Object.keys(storeGroups));
  fillSelect(document.getElementById("assignee"), assignees);
  fillSelect(document.getElementById("status"), statusOrder);
  fillSelect(filterArea, areas, true, "全エリア");
  fillSelect(filterAssignee, assignees, true, "全員");
  fillSelect(filterStatus, statusOrder, true, "すべて");
}

function updateStoreSuggestions(area = storeAreaSelect.value) {
  const source = storeMaster.filter((store) => !area || store.area === area);
  storeSuggestions.innerHTML = source
    .map((store) => `<option value="${escapeHtml(store.name)}" label="${escapeHtml(store.area)}"></option>`)
    .join("");
}

function findMasterStore(name) {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return null;
  return storeMaster.find((store) => store.name.toLowerCase() === normalizedName) || null;
}

function fillSelect(select, values, hasAll = false, allLabel = "すべて") {
  const currentFirst = hasAll ? `<option value="all">${allLabel}</option>` : "";
  select.innerHTML = currentFirst + values.map((value) => `<option>${value}</option>`).join("");
}

function loadStores() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [...seedStores];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...seedStores];
  } catch {
    return [...seedStores];
  }
}

function saveStores() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
}

function getFilteredStores() {
  const keyword = searchText.value.trim().toLowerCase();
  return stores.filter((store) => {
    const keywordMatch = !keyword || store.name.toLowerCase().includes(keyword);
    const areaMatch = filterArea.value === "all" || store.area === filterArea.value;
    const assigneeMatch = filterAssignee.value === "all" || store.assignee === filterAssignee.value;
    const statusMatch = filterStatus.value === "all" || store.status === filterStatus.value;
    return keywordMatch && areaMatch && assigneeMatch && statusMatch;
  });
}

function render() {
  const filteredStores = getFilteredStores();
  totalStores.textContent = stores.length;
  visibleStores.textContent = filteredStores.length;
  visibleCount.textContent = `${filteredStores.length}件表示中`;
  renderSummary();
  renderAreaList(filteredStores);
  renderGantt(filteredStores);
}

function renderSummary() {
  summaryCards.innerHTML = statusOrder.map((status) => {
    const count = stores.filter((store) => store.status === status).length;
    return `<div class="summary-card"><span>${status}</span><strong>${count}</strong></div>`;
  }).join("");
}

function renderAreaList(items) {
  areaList.innerHTML = "";
  if (items.length === 0) {
    areaList.innerHTML = `<p class="empty">該当する店舗がありません。</p>`;
    return;
  }

  areas.forEach((area) => {
    const areaStores = items.filter((store) => store.area === area);
    if (areaStores.length === 0) return;

    const group = document.createElement("div");
    group.className = "area-group";
    group.innerHTML = `
      <button class="area-header" type="button">
        <span class="area-title">▶ ${escapeHtml(area)}</span>
        <span class="area-count">${areaStores.length}件</span>
      </button>
      <div class="area-body">
        ${areaStores.map(storeCard).join("")}
      </div>
    `;
    areaList.appendChild(group);
  });

  areaList.querySelectorAll(".area-header").forEach((button) => {
    button.addEventListener("click", () => {
      const body = button.nextElementSibling;
      const closed = body.style.display === "none";
      body.style.display = closed ? "grid" : "none";
      button.querySelector(".area-title").textContent = `${closed ? "▶" : "▼"} ${button.querySelector(".area-title").textContent.slice(2)}`;
    });
  });

  areaList.querySelectorAll("select[data-action]").forEach((select) => {
    select.addEventListener("change", (event) => updateStore(event.target.dataset.id, event.target.dataset.action, event.target.value));
  });

  areaList.querySelectorAll("input[data-action]").forEach((input) => {
    input.addEventListener("change", (event) => updateStore(event.target.dataset.id, event.target.dataset.action, event.target.value));
  });

  areaList.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleRowAction(button.dataset.action, button.dataset.id));
  });
}

function storeCard(store) {
  return `
    <div class="store-card">
      <div class="store-main">
        <strong>${escapeHtml(store.name)}</strong>
        <small>${escapeHtml(store.area)}</small>
      </div>
      ${selectHtml("assignee", store.id, assignees, store.assignee)}
      ${selectHtml("status", store.id, statusOrder, store.status, `badge status-${store.status}`)}
      <input type="date" value="${store.targetDate || ""}" data-action="targetDate" data-id="${store.id}" />
      <div class="row-actions">
        <button type="button" data-action="next" data-id="${store.id}">次へ</button>
        <button type="button" class="danger" data-action="delete" data-id="${store.id}">削除</button>
      </div>
    </div>
  `;
}

function selectHtml(action, id, options, selected, className = "") {
  return `
    <select class="${className}" data-action="${action}" data-id="${id}">
      ${options.map((option) => `<option ${selected === option ? "selected" : ""}>${option}</option>`).join("")}
    </select>
  `;
}

function updateStore(id, key, value) {
  const store = stores.find((item) => item.id === id);
  if (!store) return;
  store[key] = value;
  saveStores();
  render();
}

function handleRowAction(action, id) {
  const store = stores.find((item) => item.id === id);
  if (!store) return;
  if (action === "delete") {
    if (!confirm(`${store.name} を削除しますか？`)) return;
    stores = stores.filter((item) => item.id !== id);
  }
  if (action === "next") {
    const currentIndex = statusOrder.indexOf(store.status);
    store.status = statusOrder[Math.min(currentIndex + 1, statusOrder.length - 1)];
  }
  saveStores();
  render();
}

function renderGantt(items) {
  ganttChart.innerHTML = "";
  if (items.length === 0) {
    ganttChart.innerHTML = `<p class="empty">表示できるガントチャートがありません。</p>`;
    return;
  }

  items.slice(0, 40).forEach((store) => {
    const progress = progressMap[store.status] || 0;
    const item = document.createElement("div");
    item.className = "gantt-item";
    item.innerHTML = `
      <div class="gantt-top">
        <strong>${escapeHtml(store.name)}</strong>
        <span class="gantt-meta">${escapeHtml(store.area)} / ${escapeHtml(store.assignee)} / ${escapeHtml(store.status)}</span>
      </div>
      <div class="gantt-track"><div class="gantt-bar" style="width:${progress}%"></div></div>
    `;
    ganttChart.appendChild(item);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
