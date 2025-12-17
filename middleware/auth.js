// middleware/roles.js
//  verifica existencia de token
const jwt = require("jsonwebtoken");
require("dotenv").config();

function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader)
        return res.status(401).json({ error: "No se envió token" });

    const token = authHeader.split(" ")[1]; // formato: Bearer <token>

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();

    } catch (err) {
        return res.status(401).json({ error: "Token inválido o expirado" });
    }
}

module.exports = verificarToken;
