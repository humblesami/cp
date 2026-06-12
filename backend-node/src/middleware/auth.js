const jwt = require("jsonwebtoken");

/**
 * Socket.IO middleware: verifies JWT from handshake auth and attaches user to socket.
 */
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("AUTH_REQUIRED"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-jwt-secret-change-in-production");
    socket.user = {
      id: decoded.user_id,           // Django JWT uses user_id
      username: decoded.username,
      role: decoded.role || "user",
    };
    next();
  } catch (err) {
    next(new Error("INVALID_TOKEN"));
  }
}

module.exports = { socketAuthMiddleware };
