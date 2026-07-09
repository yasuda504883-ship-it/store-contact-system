const STORAGE_KEY = "store-contact-system-v11";
const API_URL = window.APP_CONFIG?.API_URL || "";

const storeGroups = window.STORE_GROUPS || {};
const areas = Object.keys(storeGroups);
const assignees = ["濱治", "羽賀", "佐藤", "鈴木", "安田"];
const contactStatusOrder = ["未連絡", "連絡済", "返信待ち"];
const shootingStatusOrder = ["未設定", "撮影日確定", "撮影済", "完了"];
const caseTypeOrder = ["ホスト特集", "トップグラビア", "有料宣材", "30秒PV", "有料動画", "その他"];
const progressMap = { "未連絡": 12, "連絡済": 45, "返信待ち": 65 };

const storeMaster = Object.entries(storeGroups).flatMap(([area, names]) =>
  names.trim().split("\n").map((name) => name.trim()).filter(Boolean).map((name) => ({ name, area }))
);

const seedStores = storeMaster.map((store, index) => ({
  id: makeStoreId(store.area, store.name),
  name: store.name,
  area: store.area,
  assignee: assignees[index % assignees.length],
  status: "未連絡",
  shootingStatus: "未設定",
  caseType: "その他",
  targetDate: "",
  lastContactDate: "",
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
const syncStatus = document.getElementById("syncStatus");
const loadSheetButton = document.getElementById("loadSheet");
const seedSheetButton = document.getElementById("seedSheet");

initTabs();
initSelects();
updateStoreSuggestions();
render();
setSyncStatus(API_URL ? "同期URL設定済み。スプシ読込または初期反映できます。" : "API URLが未設定です。config.jsを確認してください。");

loadSheetButton.addEventListener("click", loadFromSheet);
seedSheetButton.addEventListener("click", seedSheetFromCurrentStores);

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
  const name = storeNameInput.value.trim();
  const area = matchedStore ? matchedStore.area : storeAreaSelect.value;
  const store = {
    id: makeStoreId(area, name),
    name,
    area,
    assignee: document.getElementById("assignee").value,
    status: document.getElementById("status").value,
    shootingStatus: "未設定",
    caseType: document.getElementById("caseType").value,
    targetDate: document.getElementById("targetDate").value,
    lastContactDate: "",
    memo: "",
  };
  if (!store.name) return;

  stores = stores.filter((item) => item.id !== store.id);
  stores.unshift(store);
  saveStores();
  syncStoreToSheet(store);
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

function initTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.toggle("active", item === button));
      document.getElementById("storesView").classList.toggle("active", view === "stores");
      document.getElementById("ganttView").classList.toggle("active", view === "gantt");
      if (view === "gantt") renderGantt(getFilteredStores());
    });
  });
}

function initSelects() {
  fillSelect(storeAreaSelect, areas);
  fillSelect(document.getElementById("assignee"), assignees);
  fillSelect(document.getElementById("status"), contactStatusOrder);
  fillSelect(document.getElementById("caseType"), caseTypeOrder);
  fillSelect(filterArea, areas, true, "全エリア");
  fillSelect(filterAssignee, assignees, true, "全員");
  fillSelect(filterStatus, contactStatusOrder, true, "すべて");
}

function updateStoreSuggestions(area = storeAreaSelect.value) {
  const source = storeMaster.filter((store) => !area || store.area === area);
  storeSuggestions.innerHTML = source.map((store) => `<option value="${escapeHtml(store.name)}" label="${escapeHtml(store.area)}"></option>`).join("");
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
    if (!Array.isArray(parsed)) return [...seedStores];
    return parsed.map((store) => ({
      ...store,
      shootingStatus: store.shootingStatus || "未設定",
      caseType: normalizeCaseType(store.caseType),
      status: normalizeContactStatus(store.status),
      memo: store.memo || "",
    }));
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
    const keywordMatch = !keyword || store.name.toLowerCase().includes(keyword) || (store.memo || "").toLowerCase().includes(keyword);
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
  const shootingFixed = stores.filter((store) => store.shootingStatus === "撮影日確定").length;
  summaryCards.innerHTML = [
    ...contactStatusOrder.map((status) => {
      const count = stores.filter((store) => store.status === status).length;
      return `<div class="summary-card"><span>${status}</span><strong>${count}</strong></div>`;
    }),
    `<div class="summary-card"><span>撮影日確定</span><strong>${shootingFixed}</strong></div>`,
  ].join("");
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

  areaList.querySelectorAll("textarea[data-action='memo']").forEach((textarea) => {
    textarea.addEventListener("blur", (event) => updateStore(event.target.dataset.id, "memo", event.target.value));
  });

  areaList.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleRowAction(button.dataset.action, button.dataset.id));
  });
}

function storeCard(store) {
  const shootingStatus = store.shootingStatus || "未設定";
  const caseType = normalizeCaseType(store.caseType);
  const memoPreview = store.memo ? escapeHtml(store.memo.slice(0, 24)) : "メモなし";
  return `
    <div class="store-card">
      <div class="store-main">
        <strong>${escapeHtml(store.name)}</strong>
        <small>${escapeHtml(store.area)} / ${memoPreview}</small>
      </div>
      ${selectHtml("assignee", store.id, assignees, store.assignee)}
      ${selectHtml("status", store.id, contactStatusOrder, store.status, `badge status-${store.status}`)}
      ${selectHtml("shootingStatus", store.id, shootingStatusOrder, shootingStatus, `badge shooting-${shootingStatus}`)}
      ${selectHtml("caseType", store.id, caseTypeOrder, caseType, `badge case-${caseType}`)}
      <input type="date" value="${store.targetDate || ""}" data-action="targetDate" data-id="${store.id}" />
      <div class="row-actions">
        <button type="button" data-action="contactNext" data-id="${store.id}">連絡進行</button>
        <button type="button" data-action="toggleMemo" data-id="${store.id}">メモ</button>
        <button type="button" class="danger" data-action="delete" data-id="${store.id}">削除</button>
      </div>
      <div class="memo-row" id="memo-${escapeId(store.id)}" hidden>
        <textarea data-action="memo" data-id="${store.id}" placeholder="連絡内容・反応・次回やることなどを入力">${escapeHtml(store.memo || "")}</textarea>
        <p>入力後、欄の外をクリックすると保存されます。</p>
      </div>
    </div>
  `;
}

function selectHtml(action, id, options, selected, className = "") {
  return `<select class="${className}" data-action="${action}" data-id="${id}">${options.map((option) => `<option ${selected === option ? "selected" : ""}>${option}</option>`).join("")}</select>`;
}

function updateStore(id, key, value) {
  const store = stores.find((item) => item.id === id);
  if (!store) return;
  if (key === "status") store[key] = normalizeContactStatus(value);
  else if (key === "caseType") store[key] = normalizeCaseType(value);
  else store[key] = value;
  saveStores();
  syncStoreToSheet(store);
  render();
}

function handleRowAction(action, id) {
  const store = stores.find((item) => item.id === id);
  if (!store) return;
  if (action === "delete") {
    if (!confirm(`${store.name} を削除しますか？`)) return;
    stores = stores.filter((item) => item.id !== id);
    deleteStoreFromSheet(id);
  }
  if (action === "contactNext") {
    store.status = nextContactStatus(store.status);
    if (store.status === "連絡済") store.lastContactDate = new Date().toISOString().slice(0, 10);
    syncStoreToSheet(store);
  }
  if (action === "toggleMemo") {
    const memo = document.getElementById(`memo-${escapeId(id)}`);
    if (memo) memo.hidden = !memo.hidden;
    return;
  }
  saveStores();
  render();
}

function nextContactStatus(status) {
  if (status === "未連絡") return "連絡済";
  if (status === "連絡済") return "返信待ち";
  return "連絡済";
}

function normalizeContactStatus(status) {
  if (contactStatusOrder.includes(status)) return status;
  if (status === "撮影決定" || status === "完了") return "返信待ち";
  return "未連絡";
}

function normalizeCaseType(type) {
  return caseTypeOrder.includes(type) ? type : "その他";
}

function renderGantt(items) {
  ganttChart.innerHTML = "";
  if (items.length === 0) {
    ganttChart.innerHTML = `<p class="empty">表示できるガントチャートがありません。</p>`;
    return;
  }

  items.forEach((store) => {
    const progress = progressMap[store.status] || 0;
    const item = document.createElement("div");
    item.className = "gantt-item";
    item.innerHTML = `
      <div class="gantt-top">
        <strong>${escapeHtml(store.name)}</strong>
        <span class="gantt-meta">${escapeHtml(store.area)} / ${escapeHtml(store.assignee)} / ${escapeHtml(store.status)} / ${escapeHtml(store.shootingStatus || "未設定")} / ${escapeHtml(normalizeCaseType(store.caseType))}</span>
      </div>
      <div class="gantt-track"><div class="gantt-bar" style="width:${progress}%"></div></div>
      ${store.memo ? `<p class="gantt-memo">${escapeHtml(store.memo)}</p>` : ""}
    `;
    ganttChart.appendChild(item);
  });
}

function makeStoreId(area, name) {
  return `${area}__${name}`.replace(/\s+/g, "_");
}

function toSheetStore(store) {
  return {
    "店舗ID": store.id,
    "店舗名": store.name,
    "エリア": store.area,
    "契約状況": "",
    "店舗URL": "",
    "Instagram": "",
  };
}

function toSheetSales(store) {
  return {
    "店舗ID": store.id,
    "担当者": store.assignee,
    "ステータス": store.status,
    "撮影ステータス": store.shootingStatus || "未設定",
    "案件種別": normalizeCaseType(store.caseType),
    "最終連絡日": store.lastContactDate || "",
    "次回連絡日": store.targetDate || "",
    "メモ": store.memo || "",
  };
}

function fromSheetRows(storeRows, salesRows) {
  const salesMap = new Map(salesRows.map((row) => [String(row["店舗ID"]), row]));
  return storeRows.map((row) => {
    const id = String(row["店舗ID"]);
    const sales = salesMap.get(id) || {};
    return {
      id,
      name: row["店舗名"] || "",
      area: row["エリア"] || "その他",
      assignee: sales["担当者"] || "安田",
      status: normalizeContactStatus(sales["ステータス"] || "未連絡"),
      shootingStatus: sales["撮影ステータス"] || "未設定",
      caseType: normalizeCaseType(sales["案件種別"] || "その他"),
      lastContactDate: sales["最終連絡日"] || "",
      targetDate: sales["次回連絡日"] || "",
      memo: sales["メモ"] || "",
    };
  }).filter((store) => store.id && store.name);
}

function setSyncStatus(message) {
  if (syncStatus) syncStatus.textContent = message;
}

function apiGet(action, data = {}) {
  if (!API_URL) return Promise.reject(new Error("API URLが未設定です"));
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const params = new URLSearchParams({ action, callback: callbackName, data: JSON.stringify({ action, ...data }) });
    window[callbackName] = (response) => {
      delete window[callbackName];
      script.remove();
      resolve(response);
    };
    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("API通信に失敗しました"));
    };
    script.src = `${API_URL}?${params.toString()}`;
    document.body.appendChild(script);
  });
}

function apiPost(action, data = {}) {
  if (!API_URL) return;
  fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...data }),
  }).catch(() => {});
}

async function loadFromSheet() {
  try {
    setSyncStatus("スプシから読み込み中...");
    const response = await apiGet("read");
    if (!response.ok) throw new Error(response.error || "読み込みに失敗しました");
    const sheetStores = fromSheetRows(response.stores || [], response.sales || []);
    if (sheetStores.length === 0) {
      setSyncStatus("スプシは空です。先に「現在の店舗をスプシへ初期反映」を押してください。");
      return;
    }
    stores = sheetStores;
    saveStores();
    render();
    setSyncStatus(`スプシから${stores.length}件読み込みました。`);
  } catch (error) {
    setSyncStatus(`読み込みエラー: ${error.message}`);
  }
}

function seedSheetFromCurrentStores() {
  if (!confirm("現在表示している店舗データをスプレッドシートへ反映しますか？")) return;
  setSyncStatus("スプシへ初期反映中... 数十秒かかる場合があります。");
  const items = stores.map((store) => ({ store: toSheetStore(store), sales: toSheetSales(store) }));
  const chunks = [];
  for (let i = 0; i < items.length; i += 30) chunks.push(items.slice(i, i + 30));
  chunks.forEach((chunk, index) => {
    setTimeout(() => {
      apiPost("bulkUpsert", { stores: chunk });
      if (index === chunks.length - 1) setSyncStatus(`初期反映を送信しました。少し待ってからスプシを確認してください。送信件数: ${items.length}件`);
    }, index * 1200);
  });
}

function syncStoreToSheet(store) {
  apiPost("upsertStore", { store: toSheetStore(store) });
  apiPost("updateSales", { sales: toSheetSales(store) });
  setSyncStatus(`保存送信: ${store.name}`);
}

function deleteStoreFromSheet(id) {
  apiPost("deleteStore", { storeId: id });
  setSyncStatus("削除をスプシへ送信しました");
}

function escapeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
