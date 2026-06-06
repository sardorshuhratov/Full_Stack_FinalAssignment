const fs = require("fs").promises;
const path = require("path");
const bcrypt = require("bcrypt");

const DATA_FILE = path.join(__dirname, "..", "data", "users.json");
const SALT_ROUNDS = 10;

// JSON fayldan barcha foydalanuvchilarni o'qish
async function readAll() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (e) {
    return [];
  }
}

// JSON faylga barcha foydalanuvchilarni yozish
async function writeAll(items) {
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

// ID bo'yicha topish
async function findById(id) {
  const items = await readAll();
  return items.find(function (item) {
    return item.id === Number(id);
  });
}

// Email bo'yicha topish
async function findByEmail(email) {
  const items = await readAll();
  return items.find(function (item) {
    return item.email && item.email.toLowerCase() === String(email).toLowerCase();
  });
}

// Username bo'yicha topish
async function findByUsername(username) {
  if (!username) return undefined;
  const items = await readAll();
  return items.find(function (item) {
    return item.username && String(item.username).toLowerCase() === String(username).toLowerCase();
  });
}

// Parolni olib tashlash (xavfsiz qaytarish uchun)
function sanitize(user) {
  if (!user) return null;
  var safeUser = Object.assign({}, user);
  delete safeUser.password;
  return safeUser;
}

// Yangi foydalanuvchi yaratish
async function create(data) {
  var items = await readAll();
  var id = items.length > 0 ? Math.max.apply(null, items.map(function (i) { return i.id; })) + 1 : 1;

  // Parolni bcrypt bilan hashlash
  var hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  var newItem = {
    id: id,
    username: data.username,
    fullName: data.fullName,
    phone: data.phone,
    specialty: data.specialty || "",
    email: data.email,
    password: hashedPassword,
    role: data.role
  };

  items.push(newItem);
  await writeAll(items);
  return sanitize(newItem);
}

// Foydalanuvchini yangilash
async function update(id, data) {
  var items = await readAll();
  var index = items.findIndex(function (i) {
    return i.id === Number(id);
  });
  if (index === -1) return null;

  // Faqat ruxsat etilgan maydonlarni qabul qilish
  var allowedFields = ["fullName", "phone", "specialty", "email", "role", "password", "username"];
  var filtered = {};
  allowedFields.forEach(function (field) {
    if (data[field] !== undefined) {
      filtered[field] = data[field];
    }
  });

  // Parol yangilanayotgan bo'lsa, hashlash
  if (filtered.password && filtered.password.trim() !== "") {
    filtered.password = await bcrypt.hash(filtered.password, SALT_ROUNDS);
  } else {
    // Parol o'zgartirilmayotgan bo'lsa, eskisini saqlash
    filtered.password = items[index].password;
  }

  items[index] = Object.assign({}, items[index], filtered, { id: Number(id) });
  await writeAll(items);
  return sanitize(items[index]);
}

// Foydalanuvchini o'chirish
async function remove(id) {
  var items = await readAll();
  var filtered = items.filter(function (i) {
    return i.id !== Number(id);
  });
  if (filtered.length === items.length) return false;
  await writeAll(filtered);
  return true;
}

// Parolni tekshirish (login uchun)
async function comparePassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  readAll: readAll,
  findById: findById,
  findByEmail: findByEmail,
  findByUsername: findByUsername,
  sanitize: sanitize,
  create: create,
  update: update,
  remove: remove,
  comparePassword: comparePassword
};
