const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todos los sectores (estructura jerárquica opcional)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM sectores');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener sectores', details: err });
  }
});

// Crear un nuevo sector
router.post('/', async (req, res) => {
  const { nombre, descripcion, sector_padre_id } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre es obligatorio' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO sectores (nombre, descripcion, sector_padre_id) VALUES (?, ?, ?)',
      [nombre, descripcion, sector_padre_id || null]
    );
    res.status(201).json({ id: result.insertId, nombre, descripcion, sector_padre_id });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear sector', details: err });
  }
});

// Modificar un sector
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, sector_padre_id } = req.body;
  try {
    await db.query(
      'UPDATE sectores SET nombre = ?, descripcion = ?, sector_padre_id = ? WHERE id = ?',
      [nombre, descripcion, sector_padre_id || null, id]
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar sector', details: err });
  }
});

// Eliminar un sector
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM sectores WHERE id = ?', [id]);
    res.json({ mensaje: 'Sector eliminado' });
  } catch (error) {
    console.error('Error al eliminar sector:', error);
    res.status(500).json({ mensaje: 'Error al eliminar sector' });
  }
});

module.exports = router;
