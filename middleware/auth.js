const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("role roles status isActive name email");

    if (!user) {
      return res.status(401).json({ message: "Usuario no autorizado" });
    }

    const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || "user"];
    const isInactive = user.status === "inactive" || user.status === "suspended" || user.isActive === false;
    if (isInactive) {
      return res.status(401).json({ message: "Usuario no autorizado" });
    }

    req.user = {
      id: user._id.toString(),
      userId: user._id.toString(),
      role: user.role || "user",
      roles: userRoles,
      status: user.status || "active",
      name: user.name,
      email: user.email
    };

    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Token invalido o expirado" });
  }
};

module.exports = authMiddleware;
