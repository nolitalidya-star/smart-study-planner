
const content = document.getElementById("content");

const api = async (url, options = {}) => {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json"
        },
        ...options
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Terjadi kesalahan");
    }

    return data;
};


// =====================
// DASHBOARD
// =====================

async function dashboard() {

    const data = await api("/api/dashboard");
    const tasks = await api("/api/tasks");

    document.getElementById("pageTitle").textContent =
        "Good morning! ✦";

    content.innerHTML = `

        <div class="stats">

            <div class="card">
                <h3>Total Tasks</h3>
                <strong>${data.total}</strong>
            </div>

            <div class="card">
                <h3>Completed</h3>
                <strong>${data.completed}</strong>
            </div>

            <div class="card">
                <h3>In Progress</h3>
                <strong>${data.pending}</strong>
            </div>

            <div class="card">
                <h3>Overdue</h3>
                <strong>${data.overdue}</strong>
            </div>

        </div>

        <div class="content-grid">

            <div class="panel">
                <h2>Recent Tasks</h2>

                <div id="taskList">

                    ${tasks.map(task => `

                        <div class="task-item">

                            <div>
                                <b>${escapeHTML(task.title)}</b>

                                <small>
                                    ${escapeHTML(task.subject)}
                                    · ${task.due_date || "Tanpa deadline"}
                                </small>
                            </div>

                            <span class="priority">
                                ${escapeHTML(task.priority)}
                            </span>

                        </div>

                    `).join("") || "Belum ada tugas."}

                </div>
            </div>

            <div class="panel">

                <h2>Your Progress</h2>

                <h1>${data.progress}%</h1>

                <div class="progress">

                    <div class="progress-bar"
                         style="width:${data.progress}%">
                    </div>

                </div>

                <p>
                    ${data.completed} dari ${data.total}
                    tugas telah selesai.
                </p>

            </div>

        </div>

    `;
}


// =====================
// HTML ESCAPE
// =====================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// =====================
// TASK MANAGEMENT
// =====================

async function showTasks() {

    const tasks = await api("/api/tasks");

    document.getElementById("pageTitle").textContent =
        "My Tasks";

    content.innerHTML = `

        <div class="panel">

            <h2>My Task List</h2>

            <button class="add-button" onclick="addTask()">
                + Add Task
            </button>

            <div id="taskList">

                ${tasks.map(task => `

                    <div class="task-item">

                        <div>
                            <b>${escapeHTML(task.title)}</b>

                            <small>
                                ${escapeHTML(task.subject)}
                                · ${task.due_date || "Tanpa deadline"}
                                · ${escapeHTML(task.status)}
                            </small>
                        </div>

                        <div>
                            <button onclick="finishTask(${task.id}, '${task.status}')">
                                ${task.status === "Selesai" ? "Undo" : "Selesai"}
                            </button>

                            <button onclick="deleteTask(${task.id})">
                                Hapus
                            </button>
                        </div>

                    </div>

                `).join("") || "Belum ada tugas."}

            </div>

        </div>

    `;
}


// =====================
// ADD TASK
// =====================

async function addTask() {

    const title = prompt("Masukkan nama tugas:");

    if (!title || !title.trim()) return;

    const description = prompt("Deskripsi tugas (opsional):") || "";

    const due_date = prompt(
        "Deadline (YYYY-MM-DD), kosongkan jika tidak ada:"
    ) || "";

    if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
        alert("Format tanggal harus YYYY-MM-DD");
        return;
    }

    const priority = prompt(
        "Prioritas: Rendah, Sedang, atau Tinggi",
        "Sedang"
    ) || "Sedang";

    if (!["Rendah", "Sedang", "Tinggi"].includes(priority)) {
        alert("Prioritas tidak valid.");
        return;
    }

    await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
            title,
            description,
            due_date,
            priority
        })
    });

    alert("Tugas berhasil ditambahkan!");

    showTasks();
}


// =====================
// COMPLETE TASK
// =====================

async function finishTask(id, status) {

    await api("/api/tasks/" + id, {
        method: "PUT",
        body: JSON.stringify({
            status: status === "Selesai" ? "Belum" : "Selesai"
        })
    });

    showTasks();
}


// =====================
// DELETE TASK
// =====================

async function deleteTask(id) {

    if (!confirm("Hapus tugas ini?")) return;

    await api("/api/tasks/" + id, {
        method: "DELETE"
    });

    showTasks();
}


// =====================
// SUBJECTS
// =====================

async function showSubjects() {

    const subjects = await api("/api/subjects");

    document.getElementById("pageTitle").textContent =
        "Subjects";

    content.innerHTML = `

        <div class="panel">

            <h2>My Subjects</h2>

            <button class="add-button"
                    onclick="addSubject()">
                + Add Subject
            </button>

            ${subjects.map(subject => `

                <div class="task-item">

                    <b>${escapeHTML(subject.name)}</b>

                </div>

            `).join("")}

        </div>

    `;
}


async function addSubject() {

    const name = prompt("Nama mata pelajaran:");

    if (!name || !name.trim()) return;

    try {
        await api("/api/subjects", {
            method: "POST",
            body: JSON.stringify({ name })
        });

        showSubjects();

    } catch (error) {
        alert(error.message);
    }
}


// =====================
// SCHEDULE
// =====================

async function showSchedule() {

    const schedules = await api("/api/schedules");

    document.getElementById("pageTitle").textContent =
        "Study Schedule";

    content.innerHTML = `

        <div class="panel">

            <h2>Study Sessions</h2>

            <button class="add-button"
                    onclick="addSchedule()">
                + Add Schedule
            </button>

            ${schedules.map(item => `

                <div class="task-item">

                    <div>
                        <b>${escapeHTML(item.title)}</b>

                        <small>
                            ${item.study_date}
                            · ${item.start_time}
                            - ${item.end_time}
                        </small>
                    </div>

                </div>

            `).join("") || "Belum ada jadwal."}

        </div>

    `;
}


async function addSchedule() {

    const title = prompt("Nama kegiatan:");

    if (!title || !title.trim()) return;

    const study_date = prompt("Tanggal (YYYY-MM-DD):");
    const start_time = prompt("Jam mulai (HH:MM):");
    const end_time = prompt("Jam selesai (HH:MM):");

    if (!study_date || !start_time || !end_time) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(study_date) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(start_time) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(end_time) ||
        end_time <= start_time) {
        alert("Tanggal atau waktu tidak valid.");
        return;
    }

    await api("/api/schedules", {
        method: "POST",
        body: JSON.stringify({
            title,
            study_date,
            start_time,
            end_time
        })
    });

    showSchedule();
}


// =====================
// NOTES
// =====================

async function showNotes() {

    const notes = await api("/api/notes");

    document.getElementById("pageTitle").textContent =
        "Study Notes";

    content.innerHTML = `

        <div class="panel">

            <h2>My Notes</h2>

            <button class="add-button"
                    onclick="addNote()">
                + Add Note
            </button>

            ${notes.map(note => `

                <div class="task-item">

                    <div>
                        <b>${escapeHTML(note.title)}</b>

                        <small>${escapeHTML(note.content)}</small>
                    </div>

                </div>

            `).join("") || "Belum ada catatan."}

        </div>

    `;
}


async function addNote() {

    const title = prompt("Judul catatan:");

    if (!title || !title.trim()) return;

    const contentText = prompt("Isi catatan:") || "";

    await api("/api/notes", {
        method: "POST",
        body: JSON.stringify({
            title,
            content: contentText
        })
    });

    showNotes();
}


// =====================
// CALENDAR
// =====================

async function showCalendar() {

    const tasks = await api("/api/tasks");

    document.getElementById("pageTitle").textContent =
        "Calendar";

    content.innerHTML = `

        <div class="panel">

            <h2>Upcoming Deadlines</h2>

            ${tasks.filter(t => t.due_date).map(t => `

                <div class="task-item">

                    <div>
                        <b>${escapeHTML(t.title)}</b>

                        <small>${t.due_date}</small>
                    </div>

                </div>

            `).join("") || "Belum ada deadline."}

        </div>

    `;
}


// =====================
// PROGRESS
// =====================

async function showProgress() {

    const data = await api("/api/dashboard");

    document.getElementById("pageTitle").textContent =
        "Progress Tracker";

    content.innerHTML = `

        <div class="panel">

            <h2>Learning Statistics</h2>

            <h1>${data.progress}%</h1>

            <div class="progress">
                <div class="progress-bar"
                     style="width:${data.progress}%">
                </div>
            </div>

            <p>Total tugas: ${data.total}</p>
            <p>Selesai: ${data.completed}</p>
            <p>Belum selesai: ${data.pending}</p>
            <p>Terlambat: ${data.overdue}</p>

        </div>

    `;
}


// =====================
// NAVIGATION
// =====================

const pages = {
    dashboard,
    tasks: showTasks,
    calendar: showCalendar,
    schedule: showSchedule,
    notes: showNotes,
    subjects: showSubjects,
    progress: showProgress
};

document.querySelectorAll(".nav").forEach(button => {

    button.addEventListener("click", () => {

        document.querySelectorAll(".nav").forEach(item =>
            item.classList.remove("active")
        );

        button.classList.add("active");

        const page = button.dataset.page;

        pages[page]();
    });

});


// =====================
// BUTTONS
// =====================

document.getElementById("addTask").onclick = addTask;

document.getElementById("themeToggle").onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
        "theme",
        document.body.classList.contains("dark") ? "dark" : "light"
    );
};

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}


// =====================
// INITIALIZE
// =====================

dashboard().catch(error => {
    content.innerHTML = "Gagal memuat aplikasi: " + escapeHTML(error.message);
});
