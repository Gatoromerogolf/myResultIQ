// routes/auditoria.js
const express = require('express');
const router = express.Router();
const pool = require("../db");
const verificarToken = require('../middleware/auth');
const soloRoles = require('../middleware/roles.js')

router.get(
    '/',
    verificarToken,
    soloRoles('administrador', 'directivo'),
    async (req, res) => {
        try {
            const [rows] = await pool.query(`
        SELECT 
          fecha,
          username,
          evento,
          resultado,
          ip,
          detalle
        FROM auditoria_sesiones
        ORDER BY fecha DESC
        LIMIT 500
      `);

            res.json(rows);
        } catch (err) {
            console.error('Error auditoría:', err);
            res.status(500).json({ error: 'Error al obtener auditoría' });
        }
    }
);

module.exports = router;
