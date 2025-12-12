const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../db");

require("dotenv").config();


// ========================================
// POST /api/login
// ========================================
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password)
            return res.status(400).json({ error: "Faltan datos" });

        // Buscar usuario por username
        // const [rows] = await pool.query(
        //     "SELECT * FROM usuarios WHERE username = ? AND estado = 'activo'",
        //     [username]
        // );
        const [rows] = await pool.query(
            "SELECT id, username, password_hash, rol, apellido, nombres FROM usuarios WHERE username = ? AND estado = 'activo'",
            [username]
        );

        if (rows.length === 0)
            return res.status(401).json({ error: "Usuario o password incorrectos - 1" });

        const user = rows[0];

        // Comparar password
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match)
            return res.status(401).json({ error: "Usuario o password incorrectos - 2" });

        // Generar JWT
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                rol: user.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
        );

        // Actualizar última sesión
        await pool.query(
            "UPDATE usuarios SET ultima_sesion = NOW() WHERE id = ?",
            [user.id]
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                rol: user.rol,
                apellido: user.apellido,
                nombres: user.nombres
            }
        });

    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ error: "Error interno" });
    }
});


// ========================================
// GET /api/logout
// (solo borra token en el frontend)
// ========================================
router.get("/logout", (req, res) => {
    return res.json({ success: true, message: "Sesión finalizada" });
});

module.exports = router;
