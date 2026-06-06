// CareTrack Clinic — Dashboard
// Rolga qarab render qilinadi (admin, clinician, receptionist)

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

var dashboard = null;

function Dashboard(api) {
  this.api = api;
  this.requiredRole = document.body.dataset.pageRole;
  try {
    this.user = JSON.parse(localStorage.getItem("caretrackUser") || "null");
  } catch (e) {
    this.user = null;
  }
  this.users = [];
  this.patients = [];
  this.diagnoses = [];
  // complaint options per specialty (mapped to specialty values in users.json)
  this.complaintBySpecialty = {
    "kardiolog": ["Ko'krak qafasida og'riq", "Yurak tez urishi", "Qon bosimining ko'tarilishi"],
    "nevrolog": ["Bosh og'rig'i", "Bosh aylanishi", "Qo'l-oyoqlarda uvishish"],
    "dermatolog": ["Teri toshmasi", "Qichishish", "Teri qizarishi"],
    "ortoped": ["Tizza og'rig'i", "Bel og'rig'i", "Bo'g'imlarda og'riq"],
    "general": ["Bosh og'rig'i", "Yo'tal", "Isitma"]
  };
  this.selectedPatientId = null;

  // Default bo'lim
  var defaultSections = {
    admin: "#adminsSection",
    clinician: "#patientsSection",
    receptionist: "#patientsSection"
  };
  this.activeSection = window.location.hash || defaultSections[this.requiredRole] || "#patientsSection";

  this.bindEvents();
  this.start();
}

// ===== EVENT BINDING =====
Dashboard.prototype.bindEvents = function () {
  var self = this;

  // Hamburger toggle
  var sidebarToggle = document.getElementById("sidebarToggle");
  var sidebar = document.getElementById("sidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.toggle("active");
    });

    // Close sidebar when clicking on nav links
    document.querySelectorAll(".side-menu .nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        sidebar.classList.remove("active");
      });
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".sidebar") && !e.target.closest(".sidebar-toggle")) {
        sidebar.classList.remove("active");
      }
    });
  }

  document.getElementById("logoutButton").addEventListener("click", function () {
    self.logout();
  });

  var refreshBtn = document.getElementById("refreshButton");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      self.loadData(true);
    });
  }

  window.addEventListener("hashchange", function () {
    self.setActiveSidebarLink(window.location.hash);
  });

  document.body.addEventListener("click", function (e) {
    var link = e.target.closest(".side-menu .nav-link");
    if (link) {
      self.activeSection = link.getAttribute("href");
    }
  });
};

// ===== START =====
Dashboard.prototype.start = async function () {
  if (!this.user || this.user.role !== this.requiredRole) {
    this.logout();
    return;
  }

  // Foydalanuvchi nomini ko'rsatish
  var userLabel = document.getElementById("userLabel");
  if (userLabel) userLabel.textContent = this.user.fullName;

  var userAvatar = document.getElementById("userAvatar");
  if (userAvatar) userAvatar.textContent = this.user.fullName.charAt(0).toUpperCase();

  await this.loadData();
};

// ===== DATA LOADING =====
Dashboard.prototype.loadData = async function (manual) {
  try {
    var canReadDiagnoses = ["admin", "clinician"].indexOf(this.requiredRole) !== -1;
    var canReadUsers = ["admin", "receptionist"].indexOf(this.requiredRole) !== -1;

    this.patients = await this.api.getPatients();
    if (canReadDiagnoses) this.diagnoses = await this.api.getDiagnoses();
    if (canReadUsers) this.users = await this.api.getUsers();

    this.render();
    this.setActiveSidebarLink(this.activeSection);

    if (manual) {
      this.showMessage("Ma'lumotlar yangilandi.", "success");
    }
  } catch (error) {
    this.showMessage(error.message, "danger");
  }
};

// ===== SIDEBAR NAVIGATION =====
Dashboard.prototype.setActiveSidebarLink = function (hash) {
  if (!hash) return;
  this.activeSection = hash;

  document.querySelectorAll(".side-menu .nav-link").forEach(function (link) {
    var isActive = link.getAttribute("href") === hash;
    if (isActive) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  document.querySelectorAll(".panel").forEach(function (section) {
    section.classList.add("d-none");
  });

  var target = document.querySelector(hash);
  if (target) target.classList.remove("d-none");
};

// ===== STATS =====
Dashboard.prototype.updateStats = function () {
  var el;
  el = document.getElementById("usersCount");
  if (el) el.textContent = this.users.length;

  el = document.getElementById("patientsCount");
  if (el) el.textContent = this.patients.length;

  el = document.getElementById("diagnosesCount");
  if (el) el.textContent = this.diagnoses.length;
};

// ===== RENDER =====
Dashboard.prototype.render = function () {
  this.updateStats();

  this.ensureModals();

  if (document.getElementById("clinicianProfile")) {
    this.renderClinicianProfile();
  }
  if (document.getElementById("usersSection")) {
    this.renderUsers();
  }
  if (document.getElementById("adminsSection")) {
    this.renderRoleUsers("adminsSection", "admin", "Adminlar boshqaruvi", "Barcha adminlar");
  }
  if (document.getElementById("doctorsSection")) {
    this.renderRoleUsers("doctorsSection", "clinician", "Shifokorlar boshqaruvi", "Barcha shifokorlar");
  }
  if (document.getElementById("receptionistsSection")) {
    this.renderRoleUsers("receptionistsSection", "receptionist", "Qabulxona xodimlari boshqaruvi", "Barcha qabulxona xodimlari");
  }
  if (document.getElementById("patientsSection")) {
    this.renderPatients();
  }
  if (document.getElementById("diagnosesSection")) {
    this.renderDiagnoses();
  }
};

Dashboard.prototype.ensureModals = function () {
  if (this.requiredRole === "admin") {
    if (!document.getElementById("userModal")) {
      var wrapper = document.createElement("div");
      wrapper.innerHTML = this.userModal();
      document.body.appendChild(wrapper.firstChild);
    }
  }
  if (!document.getElementById("patientModal")) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = this.patientModal();
    document.body.appendChild(wrapper.firstChild);
  }
  if (!document.getElementById("diagnosisModal")) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = this.diagnosisModal();
    document.body.appendChild(wrapper.firstChild);
  }
};

Dashboard.prototype.renderRoleUsers = function (sectionId, role, eyebrowText, titleText) {
  var section = document.getElementById(sectionId);
  if (!section) return;

  var self = this;
  var displayUsers = this.users.filter(function (u) {
    return u.role === role;
  });

  var html =
    '<div class="panel-title">' +
    '<div><p class="eyebrow">' + eyebrowText + '</p>' +
    '<h2>' + titleText + '</h2></div>' +
    '<button class="btn btn-success btn-sm" onclick="dashboard.openUserModal(\'Yangi xodim\', \'' + role + '\')"><i class="bi bi-plus-lg me-1"></i>Yangi</button>' +
    '</div>';

  var headers = ["Ism", "Username", "Mutaxassislik", "Telefon", "Pochta", "Amallar"];
  var rows = "";

  displayUsers.forEach(function (user) {
    rows += "<tr>";
    rows += "<td><strong>" + escapeHtml(user.fullName) + "</strong></td>";
    rows += "<td>" + escapeHtml(user.username || "-") + "</td>";
    rows += "<td>" + escapeHtml(user.specialty || "-") + "</td>";
    rows += "<td>" + escapeHtml(user.phone) + "</td>";
    rows += "<td>" + escapeHtml(user.email) + "</td>";
    rows += "<td><div class='actions'>";
    if (self.user && self.user.id !== user.id) {
      rows += '<button class="btn btn-sm btn-outline-primary" onclick="dashboard.editUser(' + user.id + ')"><i class="bi bi-pencil"></i></button>';
      rows += '<button class="btn btn-sm btn-outline-danger" onclick="dashboard.deleteUser(' + user.id + ')"><i class="bi bi-trash"></i></button>';
    } else if (self.user && self.user.id === user.id) {
      rows += '<span class="text-muted small">O\'z profilingiz</span>';
    }
    rows += "</div></td></tr>";
  });

  html += this.table(headers, rows);
  section.innerHTML = html;
};

// ===== CLINICIAN PROFILE =====
Dashboard.prototype.renderClinicianProfile = function () {
  var section = document.getElementById("clinicianProfile");
  if (!section || !this.user) return;

  section.innerHTML =
    '<div class="profile-card">' +
    '<h3>' + escapeHtml(this.user.fullName) + '</h3>' +
    '<p>' + escapeHtml(this.user.specialty || "") + '</p>' +
    '<div class="profile-details">' +
    '<span><i class="bi bi-envelope"></i> ' + escapeHtml(this.user.email) + '</span>' +
    '<span><i class="bi bi-telephone"></i> ' + escapeHtml(this.user.phone) + '</span>' +
    '<span><i class="bi bi-hash"></i> ID: ' + escapeHtml(this.user.id) + '</span>' +
    '</div>' +
    '</div>';
};

// ===== USERS SECTION =====
Dashboard.prototype.renderUsers = function () {
  var section = document.getElementById("usersSection");
  var isAdmin = this.requiredRole === "admin";
  var self = this;

  var displayUsers = isAdmin ? this.users : this.users.filter(function (u) {
    return u.role === "clinician";
  });

  var html =
    '<div class="panel-title">' +
    '<div><p class="eyebrow">' + (isAdmin ? "Xodimlar boshqaruvi" : "Shifokorlar") + '</p>' +
    '<h2>' + (isAdmin ? "Barcha xodimlar" : "Shifokorlar jadvali") + '</h2></div>' +
    (isAdmin ? '<button class="btn btn-success btn-sm" onclick="dashboard.openUserModal()"><i class="bi bi-plus-lg me-1"></i>Yangi xodim</button>' : "") +
    '</div>';

  // Jadval
  var headers = isAdmin ? ["Ism", "Username", "Rol", "Mutaxassislik", "Telefon", "Pochta", "Amallar"] : ["Ism", "Mutaxassislik", "Telefon", "Amallar"];
  var rows = "";

  displayUsers.forEach(function (user) {
    rows += "<tr>";
    rows += "<td><strong>" + escapeHtml(user.fullName) + "</strong></td>";
    if (isAdmin) {
      rows += "<td>" + escapeHtml(user.username || "-") + "</td>";
      rows += "<td><span class='badge bg-" + self.roleBadge(user.role) + "'>" + self.roleName(user.role) + "</span></td>";
    }
    rows += "<td>" + escapeHtml(user.specialty || "-") + "</td>";
    rows += "<td>" + escapeHtml(user.phone) + "</td>";
    if (isAdmin) rows += "<td>" + escapeHtml(user.email) + "</td>";
    rows += "<td><div class='actions'>";
    if (isAdmin) {
      // Hide edit/delete buttons if user is editing themselves
      if (self.user && self.user.id !== user.id) {
        rows += '<button class="btn btn-sm btn-outline-primary" onclick="dashboard.editUser(' + user.id + ')"><i class="bi bi-pencil"></i></button>';
        rows += '<button class="btn btn-sm btn-outline-danger" onclick="dashboard.deleteUser(' + user.id + ')"><i class="bi bi-trash"></i></button>';
      } else if (self.user && self.user.id === user.id) {
        rows += '<span class="text-muted small">O\'z profilingiz</span>';
      }
    } else {
      rows += '<span class="text-muted small">Faqat ko\'rish</span>';
    }
    rows += "</div></td></tr>";
  });

  html += this.table(headers, rows);
  section.innerHTML = html;
};

// ===== PATIENTS SECTION =====
Dashboard.prototype.renderPatients = function () {
  var section = document.getElementById("patientsSection");
  var self = this;

  if (this.selectedPatientId) {
    this.renderPatientProfile(section);
    return;
  }

  var canCreate = ["admin", "receptionist"].indexOf(this.requiredRole) !== -1;
  var canUpdate = ["admin", "clinician"].indexOf(this.requiredRole) !== -1;

  var html =
    '<div class="panel-title">' +
    '<div><p class="eyebrow">Bemorlar</p><h2>Bemorlar ro\'yxati</h2></div>' +
    (canCreate ? '<button class="btn btn-success btn-sm" onclick="dashboard.openPatientModal()"><i class="bi bi-plus-lg me-1"></i>Yangi bemor</button>' : "") +
    '</div>';

  var headers = ["Ism", "Telefon", "Shifokor", "Tug'ilgan sana"];
  // Show Amallar column only for admin and clinician, not for receptionist
  if (this.requiredRole !== "receptionist") {
    headers.push("Amallar");
  }
  var rows = "";

  this.patients.forEach(function (patient) {
    rows += "<tr>";
    rows += "<td><strong>" + escapeHtml(patient.fullName) + "</strong></td>";
    rows += "<td>" + escapeHtml(patient.phone || "-") + "</td>";
    rows += "<td>" + escapeHtml(self.getUserName(patient.primaryDoctorId)) + "</td>";
    rows += "<td>" + escapeHtml(patient.birthDate) + "</td>";

    // Add actions cell only for non-receptionist roles
    if (self.requiredRole !== "receptionist") {
      rows += "<td><div class='actions'>";
      rows += '<button class="btn btn-sm btn-outline-info" onclick="dashboard.viewPatientProfile(' + patient.id + ')"><i class="bi bi-eye"></i></button>';
      if (canUpdate) {
        rows += '<button class="btn btn-sm btn-outline-primary" onclick="dashboard.editPatient(' + patient.id + ')"><i class="bi bi-pencil"></i></button>';
      }
      if (self.requiredRole === "admin") {
        rows += '<button class="btn btn-sm btn-outline-danger" onclick="dashboard.deletePatient(' + patient.id + ')"><i class="bi bi-trash"></i></button>';
      }
      rows += "</div></td>";
    }
    rows += "</tr>";
  }); html += this.table(headers, rows);
  section.innerHTML = html;
};

// ===== PATIENT PROFILE =====
Dashboard.prototype.renderPatientProfile = function (section) {
  var self = this;
  var patient = this.patients.find(function (p) { return p.id === self.selectedPatientId; });
  if (!patient) return;

  var patientDiagnoses = this.diagnoses.filter(function (d) {
    return Number(d.patientId) === patient.id;
  });
  var canViewDiagnoses = ["admin", "clinician"].indexOf(this.requiredRole) !== -1;
  var self = this;

  var html =
    '<div class="panel-title">' +
    '<div><p class="eyebrow">Bemor profili</p><h2>' + escapeHtml(patient.fullName) + '</h2></div>' +
    '<button class="btn btn-outline-secondary btn-sm" onclick="dashboard.closePatientProfile()"><i class="bi bi-arrow-left me-1"></i>Ro\'yxatga qaytish</button>' +
    '</div>' +
    '<div class="detail-card">' +
    '<div class="row g-3">' +
    '<div class="col-md-4"><div class="detail-item"><div class="detail-label">Telefon</div><div class="detail-value">' + escapeHtml(patient.phone || "-") + '</div></div></div>' +
    '<div class="col-md-4"><div class="detail-item"><div class="detail-label">Tug\'ilgan sana</div><div class="detail-value">' + escapeHtml(patient.birthDate) + '</div></div></div>' +
    '<div class="col-md-4"><div class="detail-item"><div class="detail-label">Manzil</div><div class="detail-value">' + escapeHtml(patient.address || "-") + '</div></div></div>' +
    '<div class="col-md-4"><div class="detail-item"><div class="detail-label">Mas\'ul shifokor</div><div class="detail-value">' + escapeHtml(this.getUserName(patient.primaryDoctorId)) + '</div></div></div>' +
    '<div class="col-md-4"><div class="detail-item"><div class="detail-label">Ro\'yxatga olingan</div><div class="detail-value">' + escapeHtml(patient.createdAt || "-") + '</div></div></div>' +
    '</div>' +
    '</div>';

  if (canViewDiagnoses) {
    html += '<h5 class="mb-3"><i class="bi bi-clipboard2-pulse me-2"></i>Tashxislar tarixi</h5>';
    var dHeaders = ["Shifokor", "Sarlavha", "Tavsif", "Sana", "Amallar"];
    var dRows = "";
    if (patientDiagnoses.length > 0) {
      patientDiagnoses.forEach(function (d) {
        dRows += "<tr>";
        dRows += "<td>" + escapeHtml(self.getUserName(d.doctorId)) + "</td>";
        dRows += "<td><strong>" + escapeHtml(d.title) + "</strong></td>";
        dRows += "<td>" + escapeHtml(d.description) + "</td>";
        dRows += "<td>" + escapeHtml(d.createdAt || "-") + "</td>";
        dRows += "<td><div class='actions'>";
        if (["admin", "clinician"].indexOf(self.requiredRole) !== -1) {
          dRows += '<button class="btn btn-sm btn-outline-primary" onclick="dashboard.editDiagnosis(' + d.id + ')"><i class="bi bi-pencil"></i></button>';
        }
        if (self.requiredRole === "admin") {
          dRows += '<button class="btn btn-sm btn-outline-danger" onclick="dashboard.deleteDiagnosis(' + d.id + ')"><i class="bi bi-trash"></i></button>';
        }
        dRows += "</div></td>";
        dRows += "</tr>";
      });
    }
    html += this.table(dHeaders, dRows);
  }

  section.innerHTML = html;
};

// ===== DIAGNOSES SECTION =====
Dashboard.prototype.renderDiagnoses = function () {
  var section = document.getElementById("diagnosesSection");
  var canWrite = ["admin", "clinician"].indexOf(this.requiredRole) !== -1;
  var self = this;

  var html =
    '<div class="panel-title">' +
    '<div><p class="eyebrow">Tashxislar</p><h2>Bemor tashxislari</h2></div>' +
    (canWrite ? '<button class="btn btn-success btn-sm" onclick="dashboard.openDiagnosisModal()"><i class="bi bi-plus-lg me-1"></i>Yangi tashxis</button>' : "") +
    '</div>';

  var headers = ["Bemor", "Shifokor", "Sarlavha", "Tavsif", "Amallar"];
  var rows = "";

  this.diagnoses.forEach(function (diagnosis) {
    rows += "<tr>";
    rows += "<td>" + escapeHtml(self.getPatientName(diagnosis.patientId)) + "</td>";
    rows += "<td>" + escapeHtml(self.getUserName(diagnosis.doctorId)) + "</td>";
    rows += "<td><strong>" + escapeHtml(diagnosis.title) + "</strong></td>";
    rows += "<td>" + escapeHtml(diagnosis.description) + "</td>";
    rows += "<td><div class='actions'>";
    if (canWrite) {
      rows += '<button class="btn btn-sm btn-outline-primary" onclick="dashboard.editDiagnosis(' + diagnosis.id + ')"><i class="bi bi-pencil"></i></button>';
    }
    if (self.requiredRole === "admin") {
      rows += '<button class="btn btn-sm btn-outline-danger" onclick="dashboard.deleteDiagnosis(' + diagnosis.id + ')"><i class="bi bi-trash"></i></button>';
    }
    rows += "</div></td></tr>";
  });

  html += this.table(headers, rows);
  section.innerHTML = html;
};

// ===== MODALS =====
Dashboard.prototype.userModal = function () {
  return '<div class="modal fade" id="userModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
    '<div class="modal-header"><h5 class="modal-title" id="userModalTitle">Yangi xodim</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>' +
    '<div class="modal-body"><form id="userForm">' +
    '<input type="hidden" id="userId">' +
    '<div class="mb-3"><label class="form-label">Username</label><input id="userUsername" class="form-control" required></div>' +
    '<div class="mb-3"><label class="form-label">To\'liq ism</label><input id="userFullName" class="form-control" required></div>' +
    '<div class="mb-3"><label class="form-label">Telefon</label><input id="userPhone" class="form-control" required></div>' +
    '<div class="mb-3"><label class="form-label">Mutaxassislik</label><input id="userSpecialty" class="form-control" required></div>' +
    '<div class="mb-3"><label class="form-label">Email</label><input id="userEmail" class="form-control" type="email" required></div>' +
    '<div class="mb-3"><label class="form-label">Rol</label><select id="userRole" class="form-select" required><option value="">Tanlang</option><option value="admin">Admin</option><option value="clinician">Klinitsist</option><option value="receptionist">Qabulxona</option></select></div>' +
    '<div class="mb-3"><label class="form-label">Parol</label><input id="userPassword" class="form-control" type="password" placeholder="Yangi parol"></div>' +
    '</form></div>' +
    '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Bekor qilish</button><button type="button" class="btn btn-primary" onclick="dashboard.saveUser()"><i class="bi bi-check-lg me-1"></i>Saqlash</button></div>' +
    '</div></div></div>';
};

Dashboard.prototype.patientModal = function () {
  var doctorOptions = '<option value="">Tanlang</option>';
  var allDoctors = this.users.filter(function (u) { return u.role === "clinician"; });

  // Receptionist users ro'yxatidan foydalanadi, clinician o'zini qo'shadi
  if (this.requiredRole === "clinician") {
    allDoctors = [this.user];
  }

  allDoctors.forEach(function (u) {
    doctorOptions += '<option value="' + u.id + '">' + escapeHtml(u.fullName) + ' (' + escapeHtml(u.specialty || "") + ')</option>';
  });

  return '<div class="modal fade" id="patientModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
    '<div class="modal-header"><h5 class="modal-title" id="patientModalTitle">Yangi bemor</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>' +
    '<div class="modal-body"><form id="patientForm">' +
    '<input type="hidden" id="patientId">' +
    '<div class="mb-3"><label class="form-label">To\'liq ism</label><input id="patientFullName" class="form-control" required></div>' +
    '<div class="mb-3"><label class="form-label">Telefon</label><input id="patientPhone" class="form-control" required></div>' +
    '<div class="mb-3"><label class="form-label">Tug\'ilgan sana</label><input id="patientBirthDate" class="form-control" type="date" required></div>' +
    '<div class="mb-3"><label class="form-label">Manzil</label><input id="patientAddress" class="form-control" required></div>' +
    '<div class="mb-3"><label class="form-label">Asosiy shifokor</label><select id="patientDoctorId" class="form-select" required>' + doctorOptions + '</select></div>' +
    '<div class="mb-3"><label class="form-label">Shikoyat</label><select id="patientComplaint" class="form-select" required><option value="">Tanlang</option></select></div>' +
    '</form></div>' +
    '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Bekor qilish</button><button type="button" class="btn btn-primary" onclick="dashboard.savePatient()"><i class="bi bi-check-lg me-1"></i>Saqlash</button></div>' +
    '</div></div></div>';
};

Dashboard.prototype.diagnosisModal = function () {
  var patientOptions = "";
  this.patients.forEach(function (p) {
    patientOptions += '<option value="' + p.id + '">' + escapeHtml(p.fullName) + '</option>';
  });

  var doctorOptions = "";
  if (this.requiredRole === "admin") {
    this.users.filter(function (u) { return u.role === "clinician"; }).forEach(function (u) {
      doctorOptions += '<option value="' + u.id + '">' + escapeHtml(u.fullName) + ' (' + escapeHtml(u.specialty || "") + ')</option>';
    });
  } else {
    doctorOptions = '<option value="' + this.user.id + '">' + escapeHtml(this.user.fullName) + '</option>';
  }

  // Tez-tez uchraydigan tashxislar
  var commonDiagnoses = [
    "Umumiy amaliyot konsultatsiyasi", "Kardiologiya ko'rigi", "Nevrologiya ko'rigi",
    "Dermatologiya ko'rigi", "Ortopediya ko'rigi", "EKG xulosasi",
    "Arterial gipertenziya", "Qandli diabet, 2-tur", "Surunkali gastrit",
    "Osteoxondroz", "Migren", "Anemiya (kamqonlik)", "Boshqa bo'limga yo'llanma"
  ];
  var suggestHtml = "";
  commonDiagnoses.forEach(function (d) { suggestHtml += '<option value="' + escapeHtml(d) + '">'; });

  return '<div class="modal fade" id="diagnosisModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
    '<div class="modal-header"><h5 class="modal-title" id="diagnosisModalTitle">Yangi tashxis</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>' +
    '<div class="modal-body"><form id="diagnosisForm">' +
    '<input type="hidden" id="diagnosisId">' +
    '<div class="mb-3"><label class="form-label">Bemor</label><select id="diagnosisPatientId" class="form-select" required>' + patientOptions + '</select></div>' +
    '<div class="mb-3"><label class="form-label">Shifokor</label><select id="diagnosisDoctorId" class="form-select" required>' + doctorOptions + '</select></div>' +
    '<div class="mb-3"><label class="form-label">Sarlavha</label><input id="diagnosisTitle" class="form-control" list="diagnosisSuggestions" required><datalist id="diagnosisSuggestions">' + suggestHtml + '</datalist></div>' +
    '<div class="mb-3"><label class="form-label">Tavsif</label><textarea id="diagnosisDescription" class="form-control" rows="3" required></textarea></div>' +
    '</form></div>' +
    '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Bekor qilish</button><button type="button" class="btn btn-primary" onclick="dashboard.saveDiagnosis()"><i class="bi bi-check-lg me-1"></i>Saqlash</button></div>' +
    '</div></div></div>';
};

// ===== MODAL ACTIONS =====
Dashboard.prototype.openUserModal = function (title, defaultRole) {
  this.clearForm("userForm", "userId");
  document.getElementById("userModalTitle").textContent = title || "Yangi xodim";
  if (defaultRole) {
    var roleEl = document.getElementById("userRole");
    if (roleEl) roleEl.value = defaultRole;
  }
  var modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("userModal"));
  modal.show();
};

Dashboard.prototype.openPatientModal = function (title) {
  this.clearForm("patientForm", "patientId");
  document.getElementById("patientModalTitle").textContent = title || "Yangi bemor";
  var modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("patientModal"));
  modal.show();

  // When modal opens, ensure complaint options reflect selected doctor
  var docSel = document.getElementById("patientDoctorId");
  if (docSel) {
    var self = this;
    // populate immediately and on change
    this.populateComplaintsForDoctor();
    docSel.addEventListener('change', function () { self.populateComplaintsForDoctor(); });
    var complaintEl = document.getElementById("patientComplaint");
    if (complaintEl) {
      complaintEl.addEventListener('change', function () { complaintEl.setCustomValidity(''); });
    }
  }
};

Dashboard.prototype.openDiagnosisModal = function (title) {
  this.clearForm("diagnosisForm", "diagnosisId");
  document.getElementById("diagnosisModalTitle").textContent = title || "Yangi tashxis";
  var modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("diagnosisModal"));
  modal.show();
};

// ===== SAVE ACTIONS =====
Dashboard.prototype.saveUser = async function () {
  var id = document.getElementById("userId").value;
  var payload = {
    username: document.getElementById("userUsername").value,
    fullName: document.getElementById("userFullName").value,
    phone: document.getElementById("userPhone").value,
    specialty: document.getElementById("userSpecialty").value,
    email: document.getElementById("userEmail").value,
    role: document.getElementById("userRole").value,
    password: document.getElementById("userPassword").value
  };

  // Prevent user from changing their own role
  if (id && this.user && this.user.id === Number(id) && payload.role !== this.user.role) {
    this.showMessage("O'z rolingizni o'chira olmaysiz.", "danger");
    return;
  }

  // Validate form using native browser validation
  var form = document.getElementById('userForm');
  if (form && !form.reportValidity()) {
    return;
  }

  try {
    if (id) {
      await this.api.updateUser(id, payload);
    } else {
      await this.api.createUser(payload);
    }
    bootstrap.Modal.getInstance(document.getElementById("userModal")).hide();
    await this.loadData();
    this.showMessage("Xodim saqlandi.", "success");
  } catch (error) {
    this.showMessage(error.message, "danger");
  }
};

Dashboard.prototype.savePatient = async function () {
  var id = document.getElementById("patientId").value;
  var emailEl = document.getElementById("patientEmail");
  var complaintEl = document.getElementById("patientComplaint");

  // Use form-level validation for all required fields
  var form = document.getElementById('patientForm');
  // If complaint is required but empty, set custom message so reportValidity shows it
  if (complaintEl && complaintEl.required && !complaintEl.value) {
    complaintEl.setCustomValidity("Zapolnite polya");
  } else if (complaintEl) {
    complaintEl.setCustomValidity("");
  }

  if (form && !form.reportValidity()) {
    return;
  }
  var payload = {
    fullName: document.getElementById("patientFullName").value,
    phone: document.getElementById("patientPhone").value,
    email: "",
    birthDate: document.getElementById("patientBirthDate").value,
    address: document.getElementById("patientAddress").value || "",
    primaryDoctorId: document.getElementById("patientDoctorId").value,
    complaint: (document.getElementById("patientComplaint") ? document.getElementById("patientComplaint").value : "")
  };

  try {
    if (id) {
      await this.api.updatePatient(id, payload);
    } else {
      await this.api.createPatient(payload);
    }
    bootstrap.Modal.getInstance(document.getElementById("patientModal")).hide();
    await this.loadData();
    this.showMessage("Bemor saqlandi.", "success");
  } catch (error) {
    this.showMessage(error.message, "danger");
  }
};

Dashboard.prototype.saveDiagnosis = async function () {
  var form = document.getElementById('diagnosisForm');
  if (form && !form.reportValidity()) {
    return;
  }
  var id = document.getElementById("diagnosisId").value;
  var payload = {
    patientId: document.getElementById("diagnosisPatientId").value,
    doctorId: document.getElementById("diagnosisDoctorId").value,
    title: document.getElementById("diagnosisTitle").value,
    description: document.getElementById("diagnosisDescription").value
  };

  try {
    if (id) {
      await this.api.updateDiagnosis(id, payload);
    } else {
      await this.api.createDiagnosis(payload);
    }
    bootstrap.Modal.getInstance(document.getElementById("diagnosisModal")).hide();
    await this.loadData();
    this.showMessage("Tashxis saqlandi.", "success");
  } catch (error) {
    this.showMessage(error.message, "danger");
  }
};

// ===== EDIT ACTIONS =====
Dashboard.prototype.editUser = function (id) {
  var user = this.users.find(function (u) { return u.id === id; });
  if (!user) return;

  this.setVal("userId", user.id);
  this.setVal("userUsername", user.username);
  this.setVal("userFullName", user.fullName);
  this.setVal("userPhone", user.phone);
  this.setVal("userSpecialty", user.specialty);
  this.setVal("userEmail", user.email);
  this.setVal("userRole", user.role);
  this.setVal("userPassword", "");

  document.getElementById("userModalTitle").textContent = "Xodimni tahrirlash";
  var modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("userModal"));
  modal.show();
};

Dashboard.prototype.editPatient = function (id) {
  // Prevent receptionists from editing patients
  if (this.requiredRole === "receptionist") return;
  var patient = this.patients.find(function (p) { return p.id === id; });
  if (!patient) return;

  this.setVal("patientId", patient.id);
  this.setVal("patientFullName", patient.fullName);
  this.setVal("patientPhone", patient.phone);
  this.setVal("patientEmail", patient.email);
  this.setVal("patientBirthDate", patient.birthDate);
  this.setVal("patientAddress", patient.address);
  this.setVal("patientDoctorId", patient.primaryDoctorId);

  // Set up complaints options and set selected value
  var docSel = document.getElementById("patientDoctorId");
  if (docSel) {
    var self = this;
    this.populateComplaintsForDoctor();
    docSel.addEventListener('change', function () { self.populateComplaintsForDoctor(); });
    var complaintEl = document.getElementById("patientComplaint");
    if (complaintEl) {
      complaintEl.addEventListener('change', function () { complaintEl.setCustomValidity(''); });
    }
  }

  // Set complaint if available
  if (document.getElementById("patientComplaint")) {
    this.setVal("patientComplaint", patient.complaint || "");
  }

  document.getElementById("patientModalTitle").textContent = "Bemorni tahrirlash";
  var modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("patientModal"));
  modal.show();
};

// Populate complaint options based on selected doctor's specialty
Dashboard.prototype.populateComplaintsForDoctor = function () {
  var doctorId = document.getElementById("patientDoctorId").value;
  var sel = document.getElementById("patientComplaint");
  if (!sel) return;

  // find doctor
  var doc = this.users.find(function (u) { return String(u.id) === String(doctorId); });
  if (!doc && this.user && String(this.user.id) === String(doctorId)) {
    doc = this.user;
  }
  var specialty = (doc && doc.specialty) ? doc.specialty.toLowerCase() : "general";

  var options = this.complaintBySpecialty[specialty] || this.complaintBySpecialty["general"];
  sel.innerHTML = '<option value="">Tanlang</option>' + options.map(function (o) { return '<option value="' + escapeHtml(o) + '">' + escapeHtml(o) + '</option>'; }).join('');
};

Dashboard.prototype.editDiagnosis = function (id) {
  var diagnosis = this.diagnoses.find(function (d) { return d.id === id; });
  if (!diagnosis) return;

  this.setVal("diagnosisId", diagnosis.id);
  this.setVal("diagnosisPatientId", diagnosis.patientId);
  this.setVal("diagnosisDoctorId", diagnosis.doctorId);
  this.setVal("diagnosisTitle", diagnosis.title);
  this.setVal("diagnosisDescription", diagnosis.description);

  document.getElementById("diagnosisModalTitle").textContent = "Tashxisni tahrirlash";
  var modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("diagnosisModal"));
  modal.show();
};

// ===== DELETE ACTIONS =====
Dashboard.prototype.deleteUser = async function (id) {
  // Prevent admin from deleting themselves
  if (this.user && this.user.id === Number(id)) {
    this.showMessage("O'zingizni o'chira olmaysiz.", "danger");
    return;
  }
  if (!confirm("Bu xodimni o'chirishni xohlaysizmi?")) return;
  try {
    await this.api.deleteUser(id);
    await this.loadData();
    this.showMessage("Xodim o'chirildi.", "success");
  } catch (error) {
    this.showMessage(error.message, "danger");
  }
};

Dashboard.prototype.deletePatient = async function (id) {
  if (!confirm("Bu bemorni o'chirishni xohlaysizmi?")) return;
  try {
    await this.api.deletePatient(id);
    await this.loadData();
    this.showMessage("Bemor o'chirildi.", "success");
  } catch (error) {
    this.showMessage(error.message, "danger");
  }
};

Dashboard.prototype.deleteDiagnosis = async function (id) {
  if (!confirm("Bu tashxisni o'chirishni xohlaysizmi?")) return;
  try {
    await this.api.deleteDiagnosis(id);
    await this.loadData();
    this.showMessage("Tashxis o'chirildi.", "success");
  } catch (error) {
    this.showMessage(error.message, "danger");
  }
};

// ===== PATIENT PROFILE =====
Dashboard.prototype.viewPatientProfile = function (id) {
  this.selectedPatientId = Number(id);
  this.render();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

Dashboard.prototype.closePatientProfile = function () {
  this.selectedPatientId = null;
  this.render();
};

// ===== HELPERS =====
Dashboard.prototype.table = function (headers, rows) {
  var headerHtml = "";
  headers.forEach(function (h) { headerHtml += "<th>" + h + "</th>"; });

  return '<div class="table-wrap"><table class="table align-middle">' +
    '<thead><tr>' + headerHtml + '</tr></thead>' +
    '<tbody>' + (rows || '<tr><td colspan="' + headers.length + '" class="text-center text-muted py-4">Ma\'lumot yo\'q.</td></tr>') + '</tbody>' +
    '</table></div>';
};

Dashboard.prototype.getUserName = function (id) {
  var user = this.users.find(function (u) { return u.id === Number(id); });
  if (user) return user.fullName;
  if (this.user && this.user.id === Number(id)) return this.user.fullName;
  return "Noma'lum";
};

Dashboard.prototype.getPatientName = function (id) {
  var patient = this.patients.find(function (p) { return p.id === Number(id); });
  return patient ? patient.fullName : "Noma'lum";
};

Dashboard.prototype.roleName = function (role) {
  var names = { admin: "Admin", clinician: "Klinitsist", receptionist: "Qabulxona" };
  return names[role] || "Foydalanuvchi";
};

Dashboard.prototype.roleBadge = function (role) {
  var colors = { admin: "danger", clinician: "primary", receptionist: "warning" };
  return colors[role] || "secondary";
};

Dashboard.prototype.setVal = function (id, value) {
  var el = document.getElementById(id);
  if (el) el.value = value || "";
};

Dashboard.prototype.clearForm = function (formId, hiddenId) {
  var form = document.getElementById(formId);
  if (form) form.reset();
  if (hiddenId) this.setVal(hiddenId, "");
};

Dashboard.prototype.showMessage = function (text, type) {
  var box = document.getElementById("messageBox");
  if (!box) return;
  box.textContent = text;
  box.className = "alert alert-" + type;

  // 5 sekunddan keyin yashirish
  setTimeout(function () {
    box.className = "alert d-none";
  }, 5000);
};

Dashboard.prototype.logout = function (message) {
  localStorage.removeItem("caretrackToken");
  localStorage.removeItem("caretrackUser");
  var suffix = message ? "?message=" + encodeURIComponent(message) : "";
  window.location.href = "index.html" + suffix;
};

dashboard = new Dashboard(window.api);
