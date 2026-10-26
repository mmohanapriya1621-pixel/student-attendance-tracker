/* AttendEase - Student Attendance Tracker */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const STORAGE_KEY = "attendease_students";
const HISTORY_KEY = "attendease_history";

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

let students = load(STORAGE_KEY, [
  { id: "STU001", name: "Arun Kumar", dept: "BCA", email: "arun@example.com" },
  { id: "STU002", name: "Priya Devi", dept: "BCA", email: "priya@example.com" },
  { id: "STU003", name: "Rahul Raj", dept: "B.Sc", email: "rahul@example.com" },
  { id: "STU004", name: "Divya S", dept: "BCA", email: "divya@example.com" }
]);
let historyRecords = load(HISTORY_KEY, []);

const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
let selectedDate = today();
const STATUSES = ["Present", "Absent", "Late", "Excused"];

const saveStudents = () => save(STORAGE_KEY, students);
const saveHistory = () => save(HISTORY_KEY, historyRecords);

function escapeHTML(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}
function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }

function showToast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => t.classList.remove("show"), 2500);
}
const openModal = (id) => document.getElementById(id)?.classList.add("show");
const closeModal = (id) => document.getElementById(id)?.classList.remove("show");

const getRecord = (id, date = selectedDate) => historyRecords.find((r) => r.studentId === id && r.date === date);
const getStatus = (id, date = selectedDate) => getRecord(id, date)?.status || "Unmarked";
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
const statusBadge = (s) => `<span class="status ${escapeHTML(s)}">${escapeHTML(s)}</span>`;

function updateAttendance(studentId, status, date = selectedDate) {
  const student = students.find((s) => s.id === studentId);
  if (!student) return;
  const rec = getRecord(studentId, date);
  if (rec) {
    rec.status = status; rec.name = student.name; rec.dept = student.dept;
  } else {
    historyRecords.push({ studentId, name: student.name, dept: student.dept, date, status });
  }
  saveHistory();
}

function renderDashboard() {
  const count = (s) => students.filter((st) => getStatus(st.id) === s).length;
  const present = count("Present"), absent = count("Absent");
  const unmarked = students.length - present - absent;
  const rate = students.length ? Math.round((present / students.length) * 100) : 0;

  setText("#totalCount", students.length);
  setText("#presentCount", present);
  setText("#absentCount", absent);
  setText("#rateCount", rate + "%");
  setText("#donutRate", rate + "%");
  setText("#legendPresent", present);
  setText("#legendAbsent", absent);
  setText("#legendUnmarked", unmarked);

  const donut = $("#donut");
  if (donut) donut.style.background = `conic-gradient(#278b73 0% ${rate}%, #e5e7eb ${rate}% 100%)`;

  setText("#todayLabel", new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }));
  setText("#attendanceDateTitle", "Register for " + selectedDate);
  if ($("#threshold")) setText("#thresholdValue", $("#threshold").value + "%");

  renderStudentTables();
  renderAttendanceList();
  renderHistory();
}

function matchesFilters(student, suffix) {
  const search = ($(`#search${suffix}`)?.value || "").trim().toLowerCase();
  const dept = $(`#dept${suffix}`)?.value || "all";
  const status = $(`#status${suffix}`)?.value || "all";
  return (
    (student.name.toLowerCase().includes(search) ||
      student.id.toLowerCase().includes(search) ||
      (student.email || "").toLowerCase().includes(search)) &&
    (dept === "all" || student.dept === dept) &&
    (status === "all" || getStatus(student.id) === status)
  );
}

function studentRow(s) {
  return `
    <tr>
      <td><div class="student-cell"><div class="avatar">${escapeHTML(initials(s.name))}</div>
        <div><strong>${escapeHTML(s.name)}</strong><small>${escapeHTML(s.email || "")}</small></div></div></td>
      <td>${escapeHTML(s.id)}</td>
      <td>${escapeHTML(s.dept)}</td>
      <td>${statusBadge(getStatus(s.id))}</td>
      <td>
        <button class="action-btn" data-edit="${escapeHTML(s.id)}">Edit</button>
        <button class="action-btn danger" data-delete="${escapeHTML(s.id)}">Delete</button>
      </td>
    </tr>`;
}

function renderStudentTables() {
  [["Overview", "#studentRows", "#showingCount"], ["Students", "#studentRows2", "#showingCount2"]].forEach(([suffix, body, countEl]) => {
    const rows = students.filter((s) => matchesFilters(s, suffix));
    const el = $(body);
    if (el) el.innerHTML = rows.length ? rows.map(studentRow).join("") : `<tr><td colspan="5" class="empty">No students found.</td></tr>`;
    setText(countEl, rows.length);
  });
}

function renderAttendanceList() {
  const list = $("#attendanceList");
  if (!list) return;
  if ($("#attendanceDate")) $("#attendanceDate").value = selectedDate;
  const empty = $("#attendanceEmpty");
  if (empty) empty.style.display = students.length ? "none" : "block";

  list.innerHTML = students.map((s) => {
    const status = getStatus(s.id);
    return `
      <div class="attendance-row">
        <div class="student-cell"><div class="avatar">${escapeHTML(initials(s.name))}</div>
          <div><strong>${escapeHTML(s.name)}</strong><small>${escapeHTML(s.id)} · ${escapeHTML(s.dept)}</small></div></div>
        <div class="attendance-actions">
          ${STATUSES.map((item) => `<button class="attendance-btn ${status === item ? "selected" : ""}"
            data-attendance="${escapeHTML(s.id)}" data-status="${item}">${item}</button>`).join("")}
        </div>
      </div>`;
  }).join("");
}

function renderModalAttendance() {
  const list = $("#modalAttendanceList");
  if (!list) return;
  list.innerHTML = students.map((s) => {
    const status = getStatus(s.id);
    return `
      <div class="attendance-row">
        <div><strong>${escapeHTML(s.name)}</strong><small>${escapeHTML(s.id)}</small></div>
        <select data-modal-status="${escapeHTML(s.id)}">
          ${["Unmarked", ...STATUSES].map((i) => `<option value="${i}" ${status === i ? "selected" : ""}>${i}</option>`).join("")}
        </select>
      </div>`;
  }).join("");
}

function filteredHistory() {
  const date = $("#historyDate")?.value || "";
  const status = $("#historyStatus")?.value || "all";
  return historyRecords
    .filter((r) => (!date || r.date === date) && (status === "all" || r.status === status))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderHistory() {
  const list = $("#historyList");
  if (!list) return;
  const records = filteredHistory();
  const empty = $("#historyEmpty");
  if (empty) empty.style.display = records.length ? "none" : "block";
  list.innerHTML = records.map((r) => `
    <tr>
      <td>${escapeHTML(r.date)}</td><td>${escapeHTML(r.name)}</td>
      <td>${escapeHTML(r.studentId)}</td><td>${escapeHTML(r.dept)}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>`).join("");
}

function openStudentForm(student = null) {
  $("#studentForm")?.reset();
  $("#editId").value = student?.id || "";
  $("#studentName").value = student?.name || "";
  $("#studentId").value = student?.id || "";
  $("#studentDept").value = student?.dept || "BCA";
  $("#studentEmail").value = student?.email || "";
  $("#studentId").disabled = Boolean(student);
  setText("#studentModalTitle", student ? "Edit Student" : "Add Student");
  openModal("studentModal");
}

function deleteStudent(id) {
  const s = students.find((x) => x.id === id);
  if (!s || !confirm(`Delete ${s.name} from the student list?`)) return;
  students = students.filter((x) => x.id !== id);
  historyRecords = historyRecords.filter((r) => r.studentId !== id);
  saveStudents(); saveHistory();
  renderDashboard();
  showToast("Student deleted successfully.");
}

function saveStudent(e) {
  e.preventDefault();
  const editId = $("#editId").value.trim();
  const name = $("#studentName").value.trim();
  const id = editId || $("#studentId").value.trim();
  const dept = $("#studentDept").value;
  const email = $("#studentEmail").value.trim();

  if (!name || !id || !dept) return showToast("Please fill in name, ID and department.");
  if (students.some((s) => s.id.toLowerCase() === id.toLowerCase() && s.id !== editId))
    return showToast("That student ID already exists.");

  if (editId) {
    const s = students.find((x) => x.id === editId);
    if (s) {
      Object.assign(s, { name, dept, email });
      historyRecords.forEach((r) => { if (r.studentId === editId) { r.name = name; r.dept = dept; } });
      saveHistory();
    }
    showToast("Student details updated.");
  } else {
    students.push({ id, name, dept, email });
    showToast("Student added successfully.");
  }
  saveStudents();
  closeModal("studentModal");
  renderDashboard();
}

function saveModalAttendance() {
  $$("[data-modal-status]").forEach((sel) => {
    const id = sel.dataset.modalStatus;
    if (sel.value === "Unmarked") {
      historyRecords = historyRecords.filter((r) => !(r.studentId === id && r.date === selectedDate));
    } else {
      updateAttendance(id, sel.value);
    }
  });
  saveHistory();
  closeModal("attendanceModal");
  renderDashboard();
  showToast("Attendance saved successfully.");
}

function exportHistoryCSV() {
  const records = filteredHistory();
  if (!records.length) return showToast("There are no records to export.");
  const rows = [["Date", "Student ID", "Name", "Department", "Status"],
    ...records.map((r) => [r.date, r.studentId, r.name, r.dept, r.status])];
  const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = "attendease-attendance.csv"; a.click();
  URL.revokeObjectURL(url);
  showToast("CSV file exported.");
}

/* Navigation */
$$("[data-view]").forEach((btn) => btn.addEventListener("click", () => {
  const name = btn.dataset.view;
  $$(".view").forEach((v) => v.classList.remove("active"));
  $$(".nav-item").forEach((i) => i.classList.remove("active"));
  document.getElementById(name)?.classList.add("active");
  btn.classList.add("active");
  setText("#crumb", name.charAt(0).toUpperCase() + name.slice(1));
  renderDashboard();
}));

/* Student modal */
["#addTop", "#quickAdd", "#addStudentsPage"].forEach((s) => $(s)?.addEventListener("click", () => openStudentForm()));
$("#closeStudent")?.addEventListener("click", () => closeModal("studentModal"));
$("#cancelStudent")?.addEventListener("click", () => closeModal("studentModal"));
$("#studentForm")?.addEventListener("submit", saveStudent);

/* Attendance modal */
["#markTop", "#quickMark"].forEach((s) => $(s)?.addEventListener("click", () => {
  renderModalAttendance();
  openModal("attendanceModal");
}));
$("#closeAttendance")?.addEventListener("click", () => closeModal("attendanceModal"));
$("#cancelAttendance")?.addEventListener("click", () => closeModal("attendanceModal"));
$("#saveModalAttendance")?.addEventListener("click", saveModalAttendance);

/* Attendance page */
$("#attendanceList")?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-attendance]");
  if (!b) return;
  updateAttendance(b.dataset.attendance, b.dataset.status);
  renderDashboard();
});
$("#markAllPresent")?.addEventListener("click", () => {
  students.forEach((s) => updateAttendance(s.id, "Present"));
  renderDashboard();
  showToast("All students marked present.");
});
const saveCurrent = () => { saveHistory(); renderDashboard(); showToast("Attendance saved successfully."); };
$("#saveAttendance")?.addEventListener("click", saveCurrent);
$("#saveAttendance2")?.addEventListener("click", saveCurrent);
$("#attendanceDate")?.addEventListener("change", (e) => { selectedDate = e.target.value || today(); renderDashboard(); });

/* Edit / delete */
document.addEventListener("click", (e) => {
  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-delete]");
  if (edit) { const s = students.find((x) => x.id === edit.dataset.edit); if (s) openStudentForm(s); }
  if (del) deleteStudent(del.dataset.delete);
});

/* Filters */
["searchOverview", "deptOverview", "statusOverview", "searchStudents", "deptStudents", "statusStudents"].forEach((id) => {
  const el = document.getElementById(id);
  el?.addEventListener("input", renderStudentTables);
  el?.addEventListener("change", renderStudentTables);
});
$("#historyDate")?.addEventListener("change", renderHistory);
$("#historyStatus")?.addEventListener("change", renderHistory);
$("#exportCsv")?.addEventListener("click", exportHistoryCSV);
$("#clearHistoryFilters")?.addEventListener("click", () => {
  $("#historyDate").value = "";
  $("#historyStatus").value = "all";
  renderHistory();
});
$("#threshold")?.addEventListener("input", () => setText("#thresholdValue", $("#threshold").value + "%"));
$("#quickHistory")?.addEventListener("click", () => $('[data-view="history"]')?.click());

/* Close modals on backdrop click */
["studentModal", "attendanceModal"].forEach((id) => {
  const m = document.getElementById(id);
  m?.addEventListener("click", (e) => { if (e.target === m) closeModal(id); });
});

saveStudents();
renderDashboard();
