var express = require("express");
var jwt = require("jsonwebtoken");
var userModel = require("../models/userModel");
var patientModel = require("../models/patientModel");
var diagnosisModel = require("../models/diagnosisModel");
var auth = require("../middleware/auth");

var router = express.Router();

// POST /api/auth/login — Tizimga kirish
router.post("/login", async function (req, res) {
  try {
    var identifier = req.body.identifier;
    var password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Foydalanuvchi nomi va parol kiritilishi kerak." });
    }

    // Avval username bo'yicha, keyin email bo'yicha qidirish
    var user = await userModel.findByUsername(identifier);
    if (!user) {
      user = await userModel.findByEmail(identifier);
    }

    if (!user) {
      return res.status(401).json({ message: "Foydalanuvchi yoki parol noto'g'ri." });
    }

    // bcrypt bilan parolni tekshirish
    var passwordIsValid = await userModel.comparePassword(password, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({ message: "Foydalanuvchi yoki parol noto'g'ri." });
    }

    var safeUser = userModel.sanitize(user);
    var token = jwt.sign(safeUser, auth.jwtSecret, { expiresIn: "8h" });

    res.json({
      message: "Tizimga muvaffaqiyatli kirildi.",
      token: token,
      user: safeUser
    });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

// GET /api/auth/me — Joriy foydalanuvchi ma'lumotlari
router.get("/me", auth.authenticate, function (req, res) {
  res.json({ user: req.user });
});

// GET /api/auth/summary — Statistik ma'lumotlar
router.get("/summary", auth.authenticate, async function (req, res) {
  try {
    var users = await userModel.readAll();
    var patients = await patientModel.readAll();
    var diagnoses = await diagnosisModel.readAll();

    if (req.user.role === "clinician") {
      var myPatients = patients.filter(function (p) {
        return Number(p.primaryDoctorId) === req.user.id;
      });
      var myDiagnoses = diagnoses.filter(function (d) {
        return Number(d.doctorId) === req.user.id;
      });
      return res.json({
        patients: myPatients.length,
        diagnoses: myDiagnoses.length
      });
    }

    if (req.user.role === "receptionist") {
      return res.json({
        patients: patients.length
      });
    }

    // Admin — barchasi
    res.json({
      users: users.length,
      patients: patients.length,
      diagnoses: diagnoses.length
    });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

module.exports = router;
