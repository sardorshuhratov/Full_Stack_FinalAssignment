var express = require("express");
var diagnosisModel = require("../models/diagnosisModel");
var auth = require("../middleware/auth");

var router = express.Router();

// Barcha so'rovlar uchun autentifikatsiya
router.use(auth.authenticate);

// GET /api/diagnoses — Tashxislar ro'yxati
// Admin: barchasi | Clinician: faqat o'ziniki
router.get("/", auth.authorize("admin", "clinician"), async function (req, res) {
  try {
    var items = await diagnosisModel.readAll();

    // Klinitsist faqat o'z tashxislarini ko'radi
    if (req.user.role === "clinician") {
      items = items.filter(function (item) {
        return Number(item.doctorId) === req.user.id;
      });
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

// POST /api/diagnoses — Yangi tashxis yaratish (Admin + Clinician)
router.post("/", auth.authorize("admin", "clinician"), async function (req, res) {
  try {
    var data = req.body;

    if (!data.title || !data.description || !data.doctorId || !data.patientId) {
      return res.status(400).json({ message: "Sarlavha, tavsif, shifokor va bemor kiritilishi kerak." });
    }

    // Klinitsist faqat o'z nomidan tashxis qo'yishi mumkin
    if (req.user.role === "clinician") {
      data.doctorId = req.user.id;
    }

    var created = await diagnosisModel.create(data);
    res.status(201).json({ message: "Tashxis qo'shildi.", item: created });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

// PUT /api/diagnoses/:id — Tashxisni yangilash (Admin + Clinician)
router.put("/:id", auth.authorize("admin", "clinician"), async function (req, res) {
  try {
    // Klinitsist faqat o'z tashxisini yangilashi mumkin
    if (req.user.role === "clinician") {
      var diagnosis = await diagnosisModel.findById(req.params.id);
      if (!diagnosis || Number(diagnosis.doctorId) !== req.user.id) {
        return res.status(403).json({ message: "Bu tashxisni yangilash uchun ruxsat yo'q." });
      }
    }

    var updated = await diagnosisModel.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Tashxis topilmadi." });
    }
    res.json({ message: "Tashxis yangilandi.", item: updated });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

// DELETE /api/diagnoses/:id — Tashxisni o'chirish (faqat Admin)
router.delete("/:id", auth.authorize("admin"), async function (req, res) {
  try {
    var deleted = await diagnosisModel.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Tashxis topilmadi." });
    }
    res.json({ message: "Tashxis o'chirildi." });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

module.exports = router;
