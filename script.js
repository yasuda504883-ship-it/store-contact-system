const STORAGE_KEY = "store-contact-system-v1";

const progressMap = {
  "未連絡": 12,
  "連絡済": 35,
  "返信待ち": 55,
  "撮影決定": 78,
  "完了": 100,
};

const statusOrder = ["未連絡", "連絡済", "返信待ち", "撮影決定", "完了"];

const initialStores = [
  {
    id: crypto.randomUUID(),
    name: "SAMPLE OSAKA",
    area: "大阪 ミナミ",
    assignee: "安田",
    status: "未連絡",
    targetDate: "",
  },
  {
    id: crypto.randomUUID(),
    name: "SAMPLE KYOTO",
    area: "京都",
    assignee: "濱治",
    status: "連絡済",
    targetDate: "",
  },
  {
    id: crypto.randomUUID(),
    name: "SAMPLE HIROSHIMA",
    area: "広島",
    assignee: "佐藤",
    status: "返信待ち",
    targetDate: "",
  },
];

let stores = loadStores();

const form = document.getElementById("storeForm");
const tableBody = document.getElementById("storeTable");
const ganttChart = document.getElementById("ganttChart");
const totalStores = document.getElementById("totalStores");
const visibleCount = document.getElementById("visibleCount");
const filterAssignee = document.getElementById("filterAssignee");
const filterStatus = document.getElementById("filterStatus");
const resetData = document.getElementById("resetData");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const store = {
    id: crypto.randomUUID(),
    name: document.getElementById("storeName").value.trim(),
    area: document.getElementById("storeArea").value,
    assignee: document.getElementById("assignee").value,
    status: document.getElementById("status").value,
    targetDate: document.getElementById("targetDate").value,
  };

  if (!store.name) return;

  stores.unshift(store);
  saveStores();
  form.reset();
  render();
});

filterAssignee.addEventListener("change", render);
filterStatus.addEventListener("change", render);

resetData.addEventListener("click", () => {
  const ok = confirm("登録データを初期状態に戻しますか？");
  if (!ok) return;
  stores = [...initialStores];
  saveStores();
  render();
});

function loadStores() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [...initialStores];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...initialStores];
  } catch (error) {
    return [...initialStores];
  }
}

function saveStores() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
}

function getFilteredStores() {
  return stores.filter((store) => {
    const assigneeMatch = filterAssignee.value === "all" || store.assignee === filterAssignee.value;
    const statusMatch = filterStatus.value === "all" || store.status === filterStatus.value;
    return assigneeMatch && statusMatch;
  });
}

function render() {
  const filteredStores = getFilteredStores();

  totalStores.textContent = stores.length;
  visibleCount.textContent = `${filteredStores.length}件表示中`;

  renderTable(filteredStores);
  renderGantt(filteredStores);
}

function renderTable(items) {
  tableBody.innerHTML = "";

  if (items.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="empty">該当する店舗がありません。</td></tr>`;
    return;
  }

  items.forEach((store) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(store.name)}</strong></td>
      <td>${escapeHtml(store.area)}</td>
      <td>${escapeHtml(store.assignee)}</td>
      <td>${statusSelect(store)}</td>
      <td>${dateInput(store)}</td>
      <td>
        <div class="row-actions">
          <button type="button" data-action="next" data-id="${store.id}">次へ</button>
          <button type="button" class="danger" data-action="delete" data-id="${store.id}">削除</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });

  tableBody.querySelectorAll("select[data-action='status']").forEach((select) => {
    select.addEventListener("change", (event) => {
      const store = stores.find((item) => item.id === event.target.dataset.id);
      if (!store) return;
      store.status = event.target.value;
      saveStores();
      render();
    });
  });

  tableBody.querySelectorAll("input[data-action='date']").forEach((input) => {
    input.addEventListener("change", (event) => {
      const store = stores.find((item) => item.id === event.target.dataset.id);
      if (!store) return;
      store.targetDate = event.target.value;
      saveStores();
      render();
    });
  });

  tableBody.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleRowAction(button.dataset.action, button.dataset.id));
  });
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
        <span class="gantt-meta">${escapeHtml(store.assignee)} / ${escapeHtml(store.status)} ${store.targetDate ? `/ ${store.targetDate}` : ""}</span>
      </div>
      <div class="gantt-track" aria-label="${progress}%">
        <div class="gantt-bar" style="width:${progress}%"></div>
      </div>
    `;
    ganttChart.appendChild(item);
  });
}

function statusSelect(store) {
  const options = statusOrder
    .map((status) => `<option ${store.status === status ? "selected" : ""}>${status}</option>`)
    .join("");

  return `
    <select class="badge status-${store.status}" data-action="status" data-id="${store.id}">
      ${options}
    </select>
  `;
}

function dateInput(store) {
  return `<input type="date" value="${store.targetDate || ""}" data-action="date" data-id="${store.id}" />`;
}

function handleRowAction(action, id) {
  const store = stores.find((item) => item.id === id);
  if (!store) return;

  if (action === "delete") {
    const ok = confirm(`${store.name} を削除しますか？`);
    if (!ok) return;
    stores = stores.filter((item) => item.id !== id);
  }

  if (action === "next") {
    const currentIndex = statusOrder.indexOf(store.status);
    const nextIndex = Math.min(currentIndex + 1, statusOrder.length - 1);
    store.status = statusOrder[nextIndex];
  }

  saveStores();
  render();
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
