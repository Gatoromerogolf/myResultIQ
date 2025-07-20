const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
// const mysql = require('mysql2/promise');
const { pool } = require("./db");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const cron = require("node-cron");

// require("dotenv").config(); //


const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/dist', express.static('public'));

app.post('/guardar', async (req, res) => {
  const data = req.body;
  await pool.query(
    'INSERT INTO indicadores (nombre, descripcion, unidad_medida, tipo_indicador, frecuencia_medicion, area_responsable, meta) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.nombre, data.descripcion, data.unidad_medida, data.tipo_indicador, data.frecuencia_medicion, data.area_responsable, data.meta]
  );
  res.json({ mensaje: 'Indicador guardado' });
});

app.get('/api/indicadores', async (req, res) => {
  const [rows] = await pool.query('SELECT nombre, resultado_actual, unidad_medida FROM indicadores');
  res.json(rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
