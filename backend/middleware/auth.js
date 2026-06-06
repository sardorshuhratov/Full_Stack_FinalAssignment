var jwt = require("jsonwebtoken");

var jwtSecret = process.env.JWT_SECRET || "caretrack-clinic-secret-key-2026";

// Token tekshirish middleware
function authenticate(req, res, next) {
  var header = req.headers.authorization || "";
  var token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Kirish tokeni yuborilmadi." });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token yaroqsiz yoki muddati tugagan." });
  }
}

// Rol tekshirish middleware
function authorize() {
  var roles = Array.prototype.slice.call(arguments);
  return function (req, res, next) {
    if (!req.user || roles.indexOf(req.user.role) === -1) {
      return res.status(403).json({ message: "Bu amal uchun ruxsat berilmagan." });
    }
    next();
  };
}

module.exports = {
  authenticate: authenticate,
  authorize: authorize,
  jwtSecret: jwtSecret
};
