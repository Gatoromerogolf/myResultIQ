// routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../db");

const verificarToken = require('../middleware/auth');

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
        const [rows] = await pool.query(
            `SELECT 
                id,
                legajo,
                username,
                password_hash,
                rol,
                apellido,
                nombres,
                debe_cambiar_password
            FROM usuarios
            WHERE username = ? AND estado = 'activo'`,
            [username]
        );

        if (rows.length === 0) {
            await registrarAuditoria({
                usuario_id: null,
                username,
                evento: 'LOGIN',
                resultado: 'ERROR',
                req,
                detalle: 'Usuario inexistente'
            });
            return res.status(401).json({ error: "Usuario o password incorrectos - 1" });
        }

        const user = rows[0];

        // Comparar password
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            await registrarAuditoria({
                usuario_id: user.id,
                username,
                evento: 'LOGIN',
                resultado: 'ERROR',
                req,
                detalle: 'Password incorrecta'
            });
            return res.status(401).json({ error: "Usuario o password incorrectos - 2" });
        }

        // ✔ LOGIN OK
        await registrarAuditoria({
            usuario_id: user.id,
            username,
            evento: 'LOGIN',
            resultado: 'OK',
            req
        });

        // 👉 SI DEBE CAMBIAR PASSWORD
        if (user.debe_cambiar_password === 1) {
            return res.json({
                success: true,
                debeCambiarPassword: true,
                token: jwt.sign(
                    {
                        id: user.id,
                        legajo: user.legajo,
                        username: user.username,
                        rol: user.rol
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: '15m' } // token corto
                ),
                user: {
                    id: user.id,
                    legajo: user.legajo,
                    username: user.username,
                    rol: user.rol,
                    apellido: user.apellido,
                    nombres: user.nombres,
                    debe_cambiar_password: user.debe_cambiar_password
                }
            });
        }

        // 🔐 Generar JWT NORMAL
        const token = jwt.sign(
            {
                id: user.id,
                legajo: user.legajo,
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
                legajo: user.legajo,
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


function validarPasswordFuerte(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
}

async function registrarAuditoria({
    usuario_id,
    username,
    evento,
    resultado,
    req,
    detalle = null
}) {
    await pool.query(
        `INSERT INTO auditoria_sesiones
     (usuario_id, username, evento, resultado, ip, user_agent, detalle)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            usuario_id,
            username,
            evento,
            resultado,
            req.ip,
            req.headers['user-agent'],
            detalle
        ]
    );
}

// ========================================
// POST /Logout
// ========================================

router.post('/logout', verificarToken, async (req, res) => {
    try {
        await pool.query(
            `INSERT INTO auditoria_sesiones
       (usuario_id, username, evento, resultado, ip, user_agent, detalle)
       VALUES (?, ?, 'LOGOUT', 'OK', ?, ?, ?)`,
            [
                req.user.id,
                req.user.username || null,
                req.ip,
                req.headers['user-agent'],
                'Log out manual'
            ]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en logout' });
    }
});



// ========================================
// POST /cambiar-password
// ========================================
router.post('/cambiar-password', verificarToken, async (req, res) => {
    try {
        const userId = req.user.id; // viene del token
        const { passwordActual, passwordNueva } = req.body;

        if (!passwordActual || !passwordNueva) {
            return res.status(400).json({ error: 'Faltan datos' });
        }

        // 🔍 Obtener usuario
        const [rows] = await pool.query(
            'SELECT password_hash FROM usuarios WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = rows[0];

        // 🔐 Validar password actual
        const ok = await bcrypt.compare(passwordActual, user.password_hash);
        if (!ok) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
        }

        // 🛑 VALIDACIÓN DE FUERZA (BACKEND)
        if (!validarPasswordFuerte(passwordNueva)) {
            return res.status(400).json({
                error: 'La contraseña no cumple los requisitos de seguridad'
            });
        }

        // 🔐 Hashear nueva contraseña
        const newHash = await bcrypt.hash(passwordNueva, 10);

        // 💾 Guardar + quitar flag
        await pool.query(
            `UPDATE usuarios 
             SET password_hash = ?, debe_cambiar_password = 0 
             WHERE id = ?`,
            [newHash, userId]
        );


        await registrarAuditoria({
            usuario_id: req.user.id,
            username: req.user.username,
            evento: 'CHGPASS',
            resultado: 'OK',
            req
        });

        res.json({ success: true });

    } catch (err) {
        console.error('Error cambiar password:', err);
        res.status(500).json({ error: 'Error interno' });
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
