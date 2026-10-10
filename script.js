const USERS_KEY = "taskflow-final-users-v1";
const SESSION_KEY = "taskflow-final-session-v1";
const TASKS_PREFIX = "taskflow-final-tasks-v1:";

const $ = (id) => document.getElementById(id);

/* Authentication elements */
const authView = $("authView");
const appView = $("appView");
const authForm = $("authForm");

const loginTab = $("loginTab");
const signupTab = $("signupTab");

const authTitle = $("authTitle");
const authDescription = $("authDescription");

const nameGroup = $("nameGroup");
const authName = $("authName");
const authEmail = $("authEmail");
const authPassword = $("authPassword");

const togglePassword = $("togglePassword");
const authSubmit = $("authSubmit");
const authNotice = $("authNotice");

const switchCopy = $("switchCopy");
const switchMode = $("switchMode");
const logoutButton = $("logoutButton");

/* Dashboard elements */
const taskForm = $("taskForm");
const taskInput = $("taskInput");

const pendingList = $("pendingList");
const completedList = $("completedList");

const pendingEmpty = $("pendingEmpty");
const completedEmpty = $("completedEmpty");

const pendingCount = $("pendingCount");
const completedCount = $("completedCount");
const totalCount = $("totalCount");

const pendingLabel = $("pendingLabel");
const completedLabel = $("completedLabel");

const userEmail = $("userEmail");
const userAvatar = $("userAvatar");
const todayLabel = $("todayLabel");

/* Application state */
let authMode = "login";
let currentUser = null;
let tasks = [];

/* =========================================
   LOCAL STORAGE HELPERS
========================================= */

function readJSON(key, fallback) {
    try {
        const savedValue = localStorage.getItem(key);

        if (savedValue === null) {
            return fallback;
        }

        return JSON.parse(savedValue);
    } catch (error) {
        console.error("Could not read TaskFlow data:", error);
        return fallback;
    }
}

function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("Could not save TaskFlow data:", error);
        return false;
    }
}

function getUsers() {
    const users = readJSON(USERS_KEY, []);
    return Array.isArray(users) ? users : [];
}

function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

/* =========================================
   AUTHENTICATION MESSAGES
========================================= */

function showNotice(message, type = "error") {
    authNotice.textContent = message;
    authNotice.className = `auth-notice ${type}`;
    authNotice.hidden = false;
}

function clearNotice() {
    authNotice.textContent = "";
    authNotice.className = "auth-notice";
    authNotice.hidden = true;
}

/* =========================================
   PASSWORD SHOW / HIDE EYE
========================================= */

function setPasswordVisibility(visible) {
    authPassword.type = visible ? "text" : "password";

    togglePassword.setAttribute(
        "aria-pressed",
        String(visible)
    );

    togglePassword.setAttribute(
        "aria-label",
        visible ? "Hide password" : "Show password"
    );
}

togglePassword.addEventListener("click", () => {
    const passwordIsHidden = authPassword.type === "password";

    setPasswordVisibility(passwordIsHidden);
});

/* =========================================
   LOGIN / SIGNUP MODE
========================================= */

function setAuthMode(mode) {
    authMode = mode;

    const isSignup = mode === "signup";

    loginTab.classList.toggle("active", !isSignup);
    signupTab.classList.toggle("active", isSignup);

    loginTab.setAttribute(
        "aria-selected",
        String(!isSignup)
    );

    signupTab.setAttribute(
        "aria-selected",
        String(isSignup)
    );

    nameGroup.hidden = !isSignup;
    authName.required = isSignup;
    authName.disabled = !isSignup;

    authTitle.textContent = isSignup
        ? "Create your account"
        : "Welcome back";

    authDescription.textContent = isSignup
        ? "A fresh start for your goals and to-dos."
        : "Log in to get back into your flow.";

    authSubmit.replaceChildren(
        document.createTextNode(
            isSignup ? "Create account " : "Log in "
        )
    );

    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";

    authSubmit.appendChild(arrow);

    switchCopy.textContent = isSignup
        ? "Already have an account? "
        : "New to TaskFlow? ";

    switchMode.textContent = isSignup
        ? "Log in"
        : "Create an account";

    authPassword.autocomplete = isSignup
        ? "new-password"
        : "current-password";

    setPasswordVisibility(false);
    clearNotice();
}

loginTab.addEventListener("click", () => {
    setAuthMode("login");
});

signupTab.addEventListener("click", () => {
    setAuthMode("signup");
});

switchMode.addEventListener("click", () => {
    setAuthMode(
        authMode === "login" ? "signup" : "login"
    );
});

/* =========================================
   LOGIN / SIGNUP FORM SUBMISSION
========================================= */

authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearNotice();

    const email = normalizeEmail(authEmail.value);
    const password = authPassword.value;

    if (!authEmail.checkValidity() || !email) {
        showNotice("Please enter a valid email address.");
        authEmail.focus();
        return;
    }

    if (password.length < 6) {
        showNotice("Password must contain at least 6 characters.");
        authPassword.focus();
        return;
    }

    const users = getUsers();

    /* SIGNUP */
    if (authMode === "signup") {
        const name = authName.value.trim();

        if (name.length < 2) {
            showNotice(
                "Please enter a name with at least 2 characters."
            );
            authName.focus();
            return;
        }

        const accountExists = users.some(
            (user) => user.email === email
        );

        if (accountExists) {
            showNotice(
                "An account with this email already exists. Please log in."
            );
            return;
        }

        /*
         * Demo only: passwords are stored in localStorage.
         * This is NOT secure production authentication.
         */
        const newUser = {
            name: name,
            email: email,
            password: password
        };

        users.push(newUser);

        if (!writeJSON(USERS_KEY, users)) {
            showNotice(
                "Could not save your account. Check browser storage settings."
            );
            return;
        }

        currentUser = {
            name: newUser.name,
            email: newUser.email
        };

        if (!writeJSON(SESSION_KEY, { email: email })) {
            showNotice(
                "Account created, but this browser could not save your session."
            );
            currentUser = null;
            return;
        }

        showDashboard();
        return;
    }

    /* LOGIN */
    const matchedUser = users.find(
        (user) =>
            user.email === email &&
            user.password === password
    );

    if (!matchedUser) {
        showNotice(
            "Incorrect email or password. Please try again."
        );
        return;
    }

    currentUser = {
        name: matchedUser.name,
        email: matchedUser.email
    };

    if (!writeJSON(SESSION_KEY, { email: email })) {
        showNotice(
            "Login succeeded, but the session could not be saved."
        );
    }

    showDashboard();
});

/* =========================================
   TASK STORAGE
========================================= */

function taskStorageKey() {
    return (
        TASKS_PREFIX +
        encodeURIComponent(currentUser.email)
    );
}

function loadTasks() {
    const savedTasks = readJSON(taskStorageKey(), []);

    if (!Array.isArray(savedTasks)) {
        return [];
    }

    return savedTasks.filter(
        (task) =>
            task &&
            typeof task.id === "string" &&
            typeof task.text === "string" &&
            typeof task.completed === "boolean"
    );
}

function saveTasks() {
    const saved = writeJSON(taskStorageKey(), tasks);

    if (!saved) {
        console.error(
            "Tasks could not be saved. Browser storage may be full or disabled."
        );
    }

    return saved;
}

/* =========================================
   SHOW DASHBOARD
========================================= */

function showDashboard() {
    if (!currentUser) {
        return;
    }

    authView.hidden = true;
    appView.hidden = false;

    userEmail.textContent = currentUser.email;

    userAvatar.textContent = (
        currentUser.name || currentUser.email
    ).charAt(0).toUpperCase();

    todayLabel.textContent = new Intl.DateTimeFormat(
        undefined,
        {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    ).format(new Date());

    tasks = loadTasks();

    renderTasks();
    taskInput.focus();
}

/* =========================================
   LOGOUT
========================================= */

function showLogin() {
    currentUser = null;
    tasks = [];

    appView.hidden = true;
    authView.hidden = false;

    authForm.reset();

    setAuthMode("login");
    setPasswordVisibility(false);
}

logoutButton.addEventListener("click", () => {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch (error) {
        console.error("Could not clear session:", error);
    }

    showLogin();
});

/* =========================================
   ADD TASK
========================================= */

function addTask(text) {
    const id =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()
                  .toString(16)
                  .slice(2)}`;

    const newTask = {
        id: id,
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);

    saveTasks();
    renderTasks();
}

/* =========================================
   COMPLETE / UNCOMPLETE TASK
========================================= */

function toggleTask(id) {
    tasks = tasks.map((task) => {
        if (task.id === id) {
            return {
                ...task,
                completed: !task.completed
            };
        }

        return task;
    });

    saveTasks();
    renderTasks();
}

/* =========================================
   DELETE TASK
========================================= */

function deleteTask(id) {
    tasks = tasks.filter(
        (task) => task.id !== id
    );

    saveTasks();
    renderTasks();
}

/* =========================================
   CREATE TASK HTML ELEMENTS SAFELY
========================================= */

function createTaskElement(task) {
    const item = document.createElement("li");

    item.className = task.completed
        ? "task-item completed"
        : "task-item";

    /* Checkbox */
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;

    checkbox.setAttribute(
        "aria-label",
        task.completed ? "Restore task" : "Complete task"
    );

    checkbox.addEventListener("change", () => {
        toggleTask(task.id);
    });

    /* Task description */
    const text = document.createElement("span");

    text.className = "task-text";
    text.textContent = task.text;

    /* Delete button */
    const removeButton = document.createElement("button");

    removeButton.type = "button";
    removeButton.className = "delete-button";
    removeButton.textContent = "Delete";

    removeButton.setAttribute(
        "aria-label",
        `Delete task: ${task.text}`
    );

    removeButton.addEventListener("click", () => {
        deleteTask(task.id);
    });

    item.append(
        checkbox,
        text,
        removeButton
    );

    return item;
}

/* =========================================
   RENDER TASKS AND UPDATE COUNTERS
========================================= */

function renderTasks() {
    pendingList.replaceChildren();
    completedList.replaceChildren();

    const pendingTasks = tasks.filter(
        (task) => !task.completed
    );

    const completedTasks = tasks.filter(
        (task) => task.completed
    );

    pendingTasks.forEach((task) => {
        pendingList.appendChild(
            createTaskElement(task)
        );
    });

    completedTasks.forEach((task) => {
        completedList.appendChild(
            createTaskElement(task)
        );
    });

    pendingEmpty.hidden = pendingTasks.length > 0;
    completedEmpty.hidden = completedTasks.length > 0;

    pendingCount.textContent = String(
        pendingTasks.length
    );

    completedCount.textContent = String(
        completedTasks.length
    );

    totalCount.textContent = String(tasks.length);

    pendingLabel.textContent =
        `${pendingTasks.length} ` +
        `${pendingTasks.length === 1 ? "task" : "tasks"}`;

    completedLabel.textContent =
        `${completedTasks.length} ` +
        `${completedTasks.length === 1 ? "task" : "tasks"}`;
}

/* =========================================
   ADD TASK FORM SUBMISSION
========================================= */

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = taskInput.value.trim();

    if (!text) {
        taskInput.focus();
        return;
    }

    if (!currentUser) {
        return;
    }

    addTask(text);

    taskInput.value = "";
    taskInput.focus();
});

/* =========================================
   RESTORE LOGIN SESSION
========================================= */

function restoreSession() {
    const session = readJSON(SESSION_KEY, null);

    if (
        !session ||
        typeof session.email !== "string"
    ) {
        showLogin();
        return;
    }

    const user = getUsers().find(
        (account) => account.email === session.email
    );

    if (!user) {
        try {
            localStorage.removeItem(SESSION_KEY);
        } catch (error) {
            console.error(
                "Could not clear invalid session:",
                error
            );
        }

        showLogin();
        return;
    }

    currentUser = {
        name: user.name,
        email: user.email
    };

    showDashboard();
}

/* =========================================
   START APPLICATION
========================================= */

setAuthMode("login");
restoreSession();
