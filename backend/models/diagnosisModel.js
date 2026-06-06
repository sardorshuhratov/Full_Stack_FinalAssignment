var fs = require("fs").promises;
var path = require("path");

var DATA_FILE = path.join(__dirname, "..", "data", "diagnoses.json");

// JSON fayldan barcha tashxislarni o'qish
async function readAll() {
  try {
    var data = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (e) {
    return [];
  }
}

// JSON faylga barcha tashxislarni yozish
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

// Yangi tashxis yaratish
async function create(data) {
  var items = await readAll();
  var id = items.length > 0 ? Math.max.apply(null, items.map(function (i) { return i.id; })) + 1 : 1;

  var newItem = {
    id: id,
    title: data.title,
    description: data.description,
    doctorId: Number(data.doctorId),
    patientId: Number(data.patientId),
    createdAt: new Date().toISOString().slice(0, 10)
  };

  items.push(newItem);
  await writeAll(items);
  return newItem;
}

// Tashxisni yangilash
async function update(id, data) {
  var items = await readAll();
  var index = items.findIndex(function (i) {
    return i.id === Number(id);
  });
  if (index === -1) return null;

  // Faqat ruxsat etilgan maydonlarni qabul qilish
  var allowedFields = ["title", "description", "doctorId", "patientId"];
  var filtered = {};
  allowedFields.forEach(function (field) {
    if (data[field] !== undefined) {
      filtered[field] = data[field];
    }
  });

  if (filtered.doctorId) filtered.doctorId = Number(filtered.doctorId);
  if (filtered.patientId) filtered.patientId = Number(filtered.patientId);

  items[index] = Object.assign({}, items[index], filtered, { id: Number(id) });
  await writeAll(items);
  return items[index];
}

// Tashxisni o'chirish
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
