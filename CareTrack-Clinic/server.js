var express = require("express");
var path = require("path");
var cors = require("cors");

// Route fayllarni chaqirish
var authRoutes = require("./backend/routes/authRoutes");
var userRoutes = require("./backend/routes/userRoutes");
var patientRoutes = require("./backend/routes/patientRoutes");
var diagnosisRoutes = require("./backend/routes/diagnosisRoutes");

var app = express();
var port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Frontend statik fayllarni serve qilish
app.use(express.static(path.join(__dirname, "frontend")));

// API Route'lar
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/diagnoses", diagnosisRoutes);

// Health check
app.get("/api/health", function (req, res) {
  res.json({ message: "CareTrack Clinic tizimi ishlamoqda." });
});

// 404 handler
app.use(function (req, res) {
  res.status(404).json({ message: "So'ralgan manzil topilmadi." });
});

// Global error handler
app.use(function (err, req, res, next) {
  console.error("Server xatolik:", err.message);
  res.status(500).json({ message: "Serverda ichki xatolik yuz berdi." });
});

// Serverni ishga tushirish
if (require.main === module) {
  var server = app.listen(port, function () {
    console.log("CareTrack Clinic server ishlamoqda: http://localhost:" + port);
  });

  server.on("error", function (e) {
    if (e.code === "EADDRINUSE") {
      console.error("Xatolik: " + port + "-port band. Boshqa portdan foydalaning.");
      process.exit(1);
    }
  });
}

module.exports = app;
