// CareTrack Clinic — API Client
// Barcha backend so'rovlarni boshqaradi

function ApiClient(baseUrl) {
  this.baseUrl = baseUrl;
}

ApiClient.prototype.getToken = function () {
  return localStorage.getItem("caretrackToken");
};

ApiClient.prototype.request = async function (path, options) {
  options = options || {};
  var headers = {
    "Content-Type": "application/json"
  };

  if (options.headers) {
    Object.keys(options.headers).forEach(function (key) {
      headers[key] = options.headers[key];
    });
  }

  var token = this.getToken();
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  var response = await fetch(this.baseUrl + path, {
    method: options.method || "GET",
    headers: headers,
    body: options.body || undefined
  });

  var data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error("Server javobini o'qib bo'lmadi.");
  }

  if (response.status === 401) {
    localStorage.removeItem("caretrackToken");
    localStorage.removeItem("caretrackUser");
    window.location.href = "index.html?message=" + encodeURIComponent("Sessiya tugadi. Qayta kiring.");
    return;
  }

  if (!response.ok) {
    throw new Error(data.message || "So'rov bajarilmadi.");
  }

  return data;
};

// === Auth ===
ApiClient.prototype.login = function (identifier, password) {
  return this.request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: identifier, password: password })
  });
};

ApiClient.prototype.me = function () {
  return this.request("/auth/me");
};

ApiClient.prototype.summary = function () {
  return this.request("/auth/summary");
};

// === Users ===
ApiClient.prototype.getUsers = function () {
  return this.request("/users");
};

ApiClient.prototype.createUser = function (payload) {
  return this.request("/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

ApiClient.prototype.updateUser = function (id, payload) {
  return this.request("/users/" + id, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
};

ApiClient.prototype.deleteUser = function (id) {
  return this.request("/users/" + id, {
    method: "DELETE"
  });
};

// === Patients ===
ApiClient.prototype.getPatients = function () {
  return this.request("/patients");
};

ApiClient.prototype.createPatient = function (payload) {
  return this.request("/patients", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

ApiClient.prototype.updatePatient = function (id, payload) {
  return this.request("/patients/" + id, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
};

ApiClient.prototype.deletePatient = function (id) {
  return this.request("/patients/" + id, {
    method: "DELETE"
  });
};

// === Diagnoses ===
ApiClient.prototype.getDiagnoses = function () {
  return this.request("/diagnoses");
};

ApiClient.prototype.createDiagnosis = function (payload) {
  return this.request("/diagnoses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

ApiClient.prototype.updateDiagnosis = function (id, payload) {
  return this.request("/diagnoses/" + id, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
};

ApiClient.prototype.deleteDiagnosis = function (id) {
  return this.request("/diagnoses/" + id, {
    method: "DELETE"
  });
};

window.api = new ApiClient("/api");
