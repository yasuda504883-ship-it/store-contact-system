const STORAGE_KEY = "store-contact-system-v2";

const areas = [
  "北海道・東北",
  "東京",
  "関東",
  "東海",
  "名古屋",
  "関西",
  "大阪 ミナミ",
  "大阪 キタ",
  "京都",
  "神戸",
  "中国・四国",
  "広島",
  "九州・沖縄",
  "その他",
];

const assignees = ["濱治", "羽賀", "佐藤", "鈴木", "安田"];
const statusOrder = ["未連絡", "連絡済", "返信待ち", "撮影決定", "完了"];
const progressMap = { "未連絡": 12, "連絡済": 35, "返信待ち": 55, "撮影決定": 78, "完了": 100 };

// ここにSTAR GUYS掲載店舗を追加していくと、店名入力時の予測候補に出ます。
// name: 店名 / area: STAR GUYS掲載エリア
const storeMaster = [
  { name: "SAMPLE OSAKA MINAMI", area: "大阪 ミナミ" },
  { name: "SAMPLE OSAKA KITA", area: "大阪 キタ" },
  { name: "SAMPLE KYOTO", area: "京都" },
  { name: "SAMPLE KOBE", area: "神戸" },
  { name: "SAMPLE NAGOYA", area: "名古屋" },
  { name: "SAMPLE HIROSHIMA", area: "広島" },
  { name: "SAMPLE TOKYO", area: "東京" },
  { name: "SAMPLE FUKUOKA", area: "九州・沖縄" },
];

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
initStoreSuggestions();

storeNameInput.addEventListener("input", () => {
  const matchedStore = findMasterStore(storeNameInput.value);
  if (matchedStore) {
    storeAreaSelect.value = matchedStore.area;
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
  fillSelect(storeAreaSelect, areas);
  fillSelect(document.getElementById("assignee"), assignees);
  fillSelect(document.getElementById("status"), statusOrder);
  fillSelect(filterArea, areas, true, "全エリア");
  fillSelect(filterAssignee, assignees, true, "全員");
  fillSelect(filterStatus, statusOrder, true, "すべて");
}

function initStoreSuggestions() {
  storeSuggestions.innerHTML = storeMaster
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
