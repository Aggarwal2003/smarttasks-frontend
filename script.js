// ======= CONFIG =======
const BASE_URL = "https://smarttasks-backend.onrender.com/api";
; // change to your Render URL in production

// ======= STATE =======
let token = "";
let currentCategory = "all";
let currentSearchQuery = "";
let currentPriorityFilter = "all";
let editTaskId = "";
let allTasks = [];

// ======= DOM SHORTCUTS =======
const authContainer = document.getElementById("authContainer");
const dashboard = document.getElementById("dashboard");

const signupBox = document.getElementById("signupBox");
const loginBox = document.getElementById("loginBox");

const signupName = document.getElementById("signupName");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const usernameEl = document.getElementById("username");

const titleEl = document.getElementById("title");
const descriptionEl = document.getElementById("description");
const categoryEl = document.getElementById("category");
const priorityEl = document.getElementById("priority");

const searchBox = document.getElementById("searchBox");
const tasksList = document.getElementById("tasksList");

const statTotal = document.getElementById("statTotal");
const statCompleted = document.getElementById("statCompleted");
const statHigh = document.getElementById("statHigh");

const editPopup = document.getElementById("editPopup");
const editTitle = document.getElementById("editTitle");
const editDescription = document.getElementById("editDescription");
const editCategory = document.getElementById("editCategory");
const editPriority = document.getElementById("editPriority");

// ======= AUTH UI SWITCH =======
function showSignup() {
  signupBox.style.display = "block";
  loginBox.style.display = "none";
}

function showLogin() {
  signupBox.style.display = "none";
  loginBox.style.display = "block";
}

// ======= AUTH LOGIC =======

async function signup() {
  const name = signupName.value.trim();
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();

  if (!name || !email || !password) {
    alert("Please fill all fields");
    return;
  }

  try {
    await axios.post(`${BASE_URL}/auth/signup`, { name, email, password });
    alert("Signup successful! You can login now.");
    showLogin();
  } catch (err) {
    console.error(err);
    alert("Signup failed.");
  }
}

async function login() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    token = res.data.token;
    usernameEl.textContent = res.data.user.name;

    authContainer.style.display = "none";
    dashboard.style.display = "flex";

    await loadTasks();
  } catch (err) {
    console.error(err);
    alert("Login failed.");
  }
}

// ======= TASK CRUD =======

async function createTask() {
  if (!token) return alert("Please login first.");

  const title = titleEl.value.trim();
  const description = descriptionEl.value.trim();
  const category = categoryEl.value.trim().toLowerCase() || "general";
  const priority = priorityEl.value;

  if (!title) {
    alert("Task title is required.");
    return;
  }

  try {
    await axios.post(
      `${BASE_URL}/tasks`,
      { title, description, category, priority },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    titleEl.value = "";
    descriptionEl.value = "";
    categoryEl.value = "";
    priorityEl.value = "medium";

    await loadTasks();
  } catch (err) {
    console.error(err);
    alert("Error creating task.");
  }
}

async function loadTasks() {
  if (!token) return;

  try {
    const res = await axios.get(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    allTasks = res.data.tasks || [];
    renderTasks();
    updateStats();
  } catch (err) {
    console.error(err);
    alert("Error loading tasks.");
  }
}

function renderTasks() {
  tasksList.innerHTML = "";

  allTasks.forEach((t) => {
    // Priority filter
    if (currentPriorityFilter !== "all" && t.priority !== currentPriorityFilter)
      return;

    // Category filter
    if (currentCategory !== "all" && t.category !== currentCategory) return;

    // Search filter
    if (currentSearchQuery.length > 0) {
      const inTitle = (t.title || "")
        .toLowerCase()
        .includes(currentSearchQuery);
      const inDesc = (t.description || "")
        .toLowerCase()
        .includes(currentSearchQuery);
      if (!inTitle && !inDesc) return;
    }

    const card = document.createElement("div");
    card.className = "task-card" + (t.completed ? " done" : "");

    const priorityClass =
      t.priority === "high"
        ? "priority-high"
        : t.priority === "medium"
        ? "priority-medium"
        : "priority-low";

    card.innerHTML = `
      <div class="task-header-row">
        <input type="checkbox" class="task-checkbox" ${
          t.completed ? "checked" : ""
        } onchange="toggleCompleted('${t._id}')">
        <div class="task-title-text">${escapeHtml(t.title || "")}</div>
      </div>

      <div class="task-desc">
        ${escapeHtml(t.description || "")}
      </div>

      <div class="task-meta-row">
        <div class="task-pill ${priorityClass}">
          ⚡ ${t.priority.toUpperCase()}
        </div>
        <div class="task-pill category-pill">
          📂 ${escapeHtml(t.category || "general")}
        </div>
        <div class="task-actions">
          <button class="action-btn" onclick="openEditPopup('${t._id}')">✏️ Edit</button>
          <button class="action-btn delete" onclick="deleteTask('${t._id}')">🗑 Delete</button>
        </div>
      </div>
    `;

    tasksList.appendChild(card);
  });
}

async function toggleCompleted(id) {
  try {
    await axios.patch(
      `${BASE_URL}/tasks/${id}/toggle`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await loadTasks();
  } catch (err) {
    console.error(err);
    alert("Error updating task.");
  }
}

async function deleteTask(id) {
  if (!confirm("Delete this task?")) return;

  try {
    await axios.delete(`${BASE_URL}/tasks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadTasks();
  } catch (err) {
    console.error(err);
    alert("Error deleting task.");
  }
}

// ======= EDIT POPUP =======

function openEditPopup(id) {
  const task = allTasks.find((t) => t._id === id);
  if (!task) return;

  editTaskId = id;
  editTitle.value = task.title || "";
  editDescription.value = task.description || "";
  editCategory.value = task.category || "";
  editPriority.value = task.priority || "medium";

  editPopup.style.display = "flex";
}

function closePopup() {
  editPopup.style.display = "none";
}

async function updateTask() {
  if (!editTaskId) return;

  try {
    await axios.put(
      `${BASE_URL}/tasks/${editTaskId}`,
      {
        title: editTitle.value.trim(),
        description: editDescription.value.trim(),
        category: editCategory.value.trim().toLowerCase(),
        priority: editPriority.value,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    closePopup();
    await loadTasks();
  } catch (err) {
    console.error(err);
    alert("Error updating task.");
  }
}

// ======= FILTERS & SEARCH =======

function filterTasks(priority) {
  currentPriorityFilter = priority;
  renderTasks();
}

function setCategory(category) {
  currentCategory = category;
  renderTasks();
}

function searchTasks() {
  currentSearchQuery = (searchBox.value || "").toLowerCase();
  renderTasks();
}

// ======= STATS (frontend only) =======

function updateStats() {
  const total = allTasks.length;
  const completed = allTasks.filter((t) => t.completed).length;
  const high = allTasks.filter((t) => t.priority === "high").length;

  statTotal.textContent = total;
  statCompleted.textContent = completed;
  statHigh.textContent = high;
}

// ======= DARK MODE =======

function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
}

// ======= LOGOUT =======

function logout() {
  token = "";
  currentCategory = "all";
  currentPriorityFilter = "all";
  currentSearchQuery = "";
  allTasks = [];
  tasksList.innerHTML = "";

  dashboard.style.display = "none";
  authContainer.style.display = "flex";
}

// ======= HELPERS =======

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
