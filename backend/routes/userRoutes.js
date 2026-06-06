var express = require("express");
var userModel = require("../models/userModel");
var auth = require("../middleware/auth");

var router = express.Router();

// Barcha so'rovlar uchun autentifikatsiya
router.use(auth.authenticate);

// GET /api/users — Foydalanuvchilar ro'yxati
// Admin: barcha xodimlar | Receptionist: faqat shifokorlar (clinician)
router.get("/", auth.authorize("admin", "receptionist"), async function (req, res) {
  try {
    var items = await userModel.readAll();

    // Receptionist faqat shifokorlarni ko'radi
    if (req.user.role === "receptionist") {
      items = items.filter(function (u) {
        return u.role === "clinician";
      });
    }

    // Parolni olib tashlash
    var safeItems = items.map(function (item) {
      return userModel.sanitize(item);
    });

    res.json(safeItems);
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

// POST /api/users — Yangi xodim yaratish (faqat Admin)
router.post("/", auth.authorize("admin"), async function (req, res) {
  try {
    var data = req.body;

    // Majburiy maydonlarni tekshirish
    if (!data.username || !data.fullName || !data.phone || !data.email || !data.role || !data.password) {
      return res.status(400).json({ message: "Barcha majburiy maydonlar to'ldirilishi kerak." });
    }

    // Rolni tekshirish
    var validRoles = ["admin", "clinician", "receptionist"];
    if (validRoles.indexOf(data.role) === -1) {
      return res.status(400).json({ message: "Yaroqsiz rol. Faqat admin, clinician yoki receptionist bo'lishi mumkin." });
    }

    // Klinitsist uchun mutaxassislik majburiy
    if (data.role === "clinician" && !data.specialty) {
      return res.status(400).json({ message: "Klinitsist uchun mutaxassislik kiritilishi kerak." });
    }

    // Username yoki email takrorlanishini tekshirish
    var existingUser = await userModel.findByUsername(data.username);
    if (existingUser) {
      return res.status(400).json({ message: "Bu username allaqachon mavjud." });
    }

    var existingEmail = await userModel.findByEmail(data.email);
    if (existingEmail) {
      return res.status(400).json({ message: "Bu email allaqachon mavjud." });
    }

    var created = await userModel.create(data);
    res.status(201).json({ message: "Xodim qo'shildi.", item: created });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

// PUT /api/users/:id — Xodimni yangilash (faqat Admin)
router.put("/:id", auth.authorize("admin"), async function (req, res) {
  try {
    var data = req.body;

    // Username takrorlanishini tekshirish (o'zi bundan mustasno)
    if (data.username) {
      var existingUser = await userModel.findByUsername(data.username);
      if (existingUser && existingUser.id !== Number(req.params.id)) {
        return res.status(400).json({ message: "Bu username allaqachon mavjud." });
      }
    }

    // Email takrorlanishini tekshirish (o'zi bundan mustasno)
    if (data.email) {
      var existingEmail = await userModel.findByEmail(data.email);
      if (existingEmail && existingEmail.id !== Number(req.params.id)) {
        return res.status(400).json({ message: "Bu email allaqachon mavjud." });
      }
    }

    var updated = await userModel.update(req.params.id, data);
    if (!updated) {
      return res.status(404).json({ message: "Xodim topilmadi." });
    }
    res.json({ message: "Xodim yangilandi.", item: updated });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

// DELETE /api/users/:id — Xodimni o'chirish (faqat Admin)
router.delete("/:id", auth.authorize("admin"), async function (req, res) {
  try {
    // O'zini o'chirish taqiqlangan
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: "O'zingizni o'chira olmaysiz." });
    }

    var deleted = await userModel.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Xodim topilmadi." });
    }
    res.json({ message: "Xodim o'chirildi." });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi." });
  }
});

module.exports = router;
