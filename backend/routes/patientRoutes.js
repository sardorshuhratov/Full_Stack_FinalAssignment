var express = require("express");
var patientModel = require("../models/patientModel");
var auth = require("../middleware/auth");

var router = express.Router();

// Barcha so'rovlar uchun autentifikatsiya
router.use(auth.authenticate);

// GET /api/patients — Bemorlar ro'yxati
// Admin: barchasi | Clinician: faqat o'ziniki | Receptionist: barchasi
router.get("/", auth.authorize("admin", "clinician", "receptionist"), async function (req, res) {
  try {
    var items = await patientModel.readAll();

    // Klinitsist faqat o'z bemorlarini ko'radi
    if (req.user.role === "clinician") {
      items = items.filter(function (item) {
        return Number(item.primaryDoctorId) === req.user.id;
      });
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

// POST /api/patients — Yangi bemor ro'yxatga olish (Admin + Receptionist)
router.post("/", auth.authorize("admin", "receptionist"), async function (req, res) {
  try {
    var data = req.body;

    if (!data.fullName || !data.birthDate || !data.primaryDoctorId) {
      return res.status(400).json({ message: "Ism, tug'ilgan sana va shifokor kiritilishi kerak." });
    }

    // Ro'yxatga olgan xodim ID sini qo'shish
    data.registeredBy = req.user.id;

    var created = await patientModel.create(data);
    res.status(201).json({ message: "Bemor ro'yxatga olindi.", item: created });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

// PUT /api/patients/:id — Bemorni yangilash (Admin + Clinician)
router.put("/:id", auth.authorize("admin", "clinician"), async function (req, res) {
  try {
    // Klinitsist faqat o'z bemorini yangilashi mumkin
    if (req.user.role === "clinician") {
      var patient = await patientModel.findById(req.params.id);
      if (!patient || Number(patient.primaryDoctorId) !== req.user.id) {
        return res.status(403).json({ message: "Bu bemorni yangilash uchun ruxsat yo'q." });
      }
    }

    var updated = await patientModel.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Bemor topilmadi." });
    }
    res.json({ message: "Bemor ma'lumotlari yangilandi.", item: updated });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

// DELETE /api/patients/:id — Bemorni o'chirish (faqat Admin)
router.delete("/:id", auth.authorize("admin"), async function (req, res) {
  try {
    var deleted = await patientModel.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Bemor topilmadi." });
    }
    res.json({ message: "Bemor o'chirildi." });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

module.exports = router;
