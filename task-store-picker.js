(() => {
  const originalForm = document.getElementById("taskForm");
  const storeInput = document.getElementById("taskStore");
  const areaSelect = document.getElementById("taskStoreArea");
  const suggestions = document.getElementById("taskStoreSuggestions");

  if (!originalForm || !storeInput || !areaSelect || !suggestions) return;

  // tasks.js が付けた旧形式の送信処理を外し、案件管理と同じ入力方式に差し替える。
  const form = originalForm.cloneNode(true);
  originalForm.replaceWith(form);

  const titleInput = form.querySelector("#taskTitle");
  const assigneeSelect = form.querySelector("#taskAssignee");
  const dueDateInput = form.querySelector("#taskDueDate");
  const prioritySelect = form.querySelector("#taskPriority");
  const taskStoreInput = form.querySelector("#taskStore");
  const taskAreaSelect = form.querySelector("#taskStoreArea");
  const memoInput = form.querySelector("#taskMemo");

  const areaNames = Object.keys(window.STORE_GROUPS || {});
  taskAreaSelect.innerHTML = areaNames.map((area) => `<option>${escapePickerHtml(area)}</option>`).join("");

  function registeredStores() {
    if (typeof stores === "undefined") return [];
    return stores.map((store) => ({
      id: store.id,
      name: store.name,
      area: store.area,
      assignee: store.assignee,
      registered: true,
    }));
  }

  function manualStores() {
    if (typeof tasks === "undefined") return [];
    return tasks
      .filter((task) => task.store && !task.storeId)
      .map((task) => ({ id: "", name: task.store, area: task.storeArea || "", registered: false }));
  }

  function allStoreCandidates() {
    const seen = new Set();
    return [...registeredStores(), ...taskStoreMaster, ...manualStores()].filter((store) => {
      const key = `${store.area}__${store.name}`;
      if (!store.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function updateSuggestions(area = taskAreaSelect.value) {
    const source = allStoreCandidates().filter((store) => !area || !store.area || store.area === area);
    suggestions.innerHTML = source
      .map((store) => `<option value="${escapePickerHtml(store.name)}" label="${escapePickerHtml(store.area || "手入力店舗")}"></option>`)
      .join("");
  }

  function findMatchedStore(name, area = "") {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized) return null;
    const candidates = allStoreCandidates().filter((store) => store.name.toLowerCase() === normalized);
    return candidates.find((store) => store.area === area) || candidates[0] || null;
  }

  function applyMatchedStore() {
    const matched = findMatchedStore(taskStoreInput.value, taskAreaSelect.value);
    if (!matched) return;
    if (matched.area && areaNames.includes(matched.area)) {
      taskAreaSelect.value = matched.area;
      updateSuggestions(matched.area);
    }
    const registered = registeredStores().find((store) => store.name === matched.name && store.area === matched.area);
    if (registered?.assignee) assigneeSelect.value = registered.assignee;
  }

  taskAreaSelect.addEventListener("change", () => {
    taskStoreInput.value = "";
    updateSuggestions(taskAreaSelect.value);
  });

  taskStoreInput.addEventListener("input", applyMatchedStore);
  taskStoreInput.addEventListener("change", applyMatchedStore);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    const typedStoreName = taskStoreInput.value.trim();
    const selectedArea = taskAreaSelect.value;
    const matchedStore = findMatchedStore(typedStoreName, selectedArea);
    const officialStore = matchedStore && taskStoreMaster.find((store) => store.name === matchedStore.name && store.area === matchedStore.area);

    const task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      assignee: assigneeSelect.value,
      dueDate: dueDateInput.value,
      priority: prioritySelect.value,
      storeId: officialStore?.id || "",
      store: typedStoreName,
      storeArea: matchedStore?.area || selectedArea || "",
      memo: memoInput.value.trim(),
      status: "未着手",
      completedAt: "",
      createdAt: new Date().toISOString(),
    };

    tasks.unshift(task);
    saveTasks();
    syncTaskToSheet(task);
    form.reset();
    prioritySelect.value = "中";
    if (areaNames.length) taskAreaSelect.value = areaNames[0];
    updateSuggestions(taskAreaSelect.value);
    renderTasks();
  });

  updateSuggestions(taskAreaSelect.value);
})();

function escapePickerHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
