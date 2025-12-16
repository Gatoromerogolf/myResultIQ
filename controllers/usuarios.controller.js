// controllers/usuarios.controller.js
const bcrypt = require('bcrypt');
const pool = require('../db');

async function crearUsuario(req, res) {
    try {
        const {
            legajo, apellido, nombres, email, telefono,
            cargo, sector, legajo_jefe,
            estado, rol
        } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        const username = email.toLowerCase();
        const fotoBuffer = req.file ? req.file.buffer : null;

        // 🔐 password temporal
        const tempPassword = Math.random().toString(36).slice(-8);
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // 🔎 verificar duplicado
        const [existe] = await pool.query(
            'SELECT id FROM usuarios WHERE username = ?',
            [username]
        );

        if (existe.length > 0) {
            return res.status(409).json({
                error: 'Ya existe un usuario con ese email'
            });
        }

        await pool.query(`
            INSERT INTO usuarios (
                legajo, username, email, password_hash,
                debe_cambiar_password,
                apellido, nombres, telefono, foto,
                cargo, sector, legajo_jefe,
                estado, rol
            ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            legajo, username, email, passwordHash,
            apellido, nombres, telefono, fotoBuffer,
            cargo, sector, legajo_jefe,
            estado, rol
        ]);

        res.status(201).json({
            success: true,
            message: 'Usuario creado',
            password_temporal: tempPassword
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
}

module.exports = { crearUsuario };
