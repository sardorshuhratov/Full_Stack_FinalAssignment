var fs = require("fs").promises;
var path = require("path");

var DATA_FILE = path.join(__dirname, "..", "data", "patients.json");

// JSON fayldan barcha bemorlarni o'qish
async function readAll() {
  try {
    var data = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (e) {
    return [];
  }
}

// JSON faylga barcha bemorlarni yozish
async function writeAll(items) {
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

// ID bo'yicha topish
async function findById(id) {
  var items = await readAll();
  return items.find(function (item) {
    return item.id === Number(id);
  });
}

// Yangi bemor yaratish
async function create(data) {
  var items = await readAll();
  var id = items.length > 0 ? Math.max.apply(null, items.map(function (i) { return i.id; })) + 1 : 1;

  var newItem = {
    id: id,
    fullName: data.fullName,
    phone: data.phone || "",
    email: data.email || "",
    complaint: data.complaint || "",
    birthDate: data.birthDate,
    address: data.address || "",
    registeredBy: Number(data.registeredBy),
    primaryDoctorId: Number(data.primaryDoctorId),
    createdAt: new Date().toISOString().slice(0, 10)
  };

  items.push(newItem);
  await writeAll(items);
  return newItem;
}

// Bemorni yangilash
async function update(id, data) {
  var items = await readAll();
  var index = items.findIndex(function (i) {
    return i.id === Number(id);
  });
  if (index === -1) return null;

  // Faqat ruxsat etilgan maydonlarni qabul qilish
  var allowedFields = ["fullName", "phone", "email", "complaint", "birthDate", "address", "primaryDoctorId"];
  var filtered = {};
  allowedFields.forEach(function (field) {
    if (data[field] !== undefined) {
      filtered[field] = data[field];
    }
  });

  // Raqamli maydonlarni to'g'rilash
  if (filtered.primaryDoctorId) filtered.primaryDoctorId = Number(filtered.primaryDoctorId);

  // Normalize complaint
  if (filtered.complaint !== undefined) filtered.complaint = filtered.complaint || "";

  items[index] = Object.assign({}, items[index], filtered, { id: Number(id) });
  await writeAll(items);
  return items[index];
}

// Bemorni o'chirish
async function remove(id) {
  var items = await readAll();
  var filtered = items.filter(function (i) {
    return i.id !== Number(id);
  });
  if (filtered.length === items.length) return false;
  await writeAll(filtered);
  return true;
}

module.exports = {
  readAll: readAll,
  findById: findById,
  create: create,
  update: update,
  remove: remove
};
