const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const pool = require("./db");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const cron = require("node-cron");

require("dotenv").config(); //

const multer = require('multer');
const upload = multer(); // Esta es la línea que falta

const cors = require('cors');
const sectoresRoutes = require('./routes/sectores');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/sectores', sectoresRoutes);
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


// // 🚫🚫🚫GET para tomar los indicadores
// app.get('/api/indicadores', async (req, res) => {
//     const [rows] = await pool.query('SELECT nombre, resultado_actual, unidad_medida FROM indicadores');
//     res.json(rows);
// });

app.get('/api/indicadores', async (req, res) => {
    const [rows] = await pool.query(`
        SELECT 
            codigo_identificatorio,
            nombre,
            descripcion,
            objetivo,  
            dimension,
            unidad_funcional_id
            responsable,
            categoria,
            criticidad,
            frecuencia_medicion,
            tendencia_deseada
        FROM indicadores
    `);
    res.json(rows);
});


// // 🚫🚫🚫GET para tomar un indicador
app.get('/api/indicadores/:codigo', async (req, res) => {
    const { codigo } = req.params;

    try {
        const [rows] = await pool.query(`
            SELECT 
                codigo_identificatorio,
                nombre,
                descripcion,
                objetivo, 
                dimension,
                unidad_funcional_id,
                responsable,
                dimension,
                categoria,
                criticidad,
                frecuencia_medicion,
                unidad_medida,
                tendencia_deseada,
                meta_objetivo,
                periodo_inicial,
                grupos_integracion, 
                comentarios
            FROM indicadores
            WHERE codigo_identificatorio = ?
        `, [codigo]);

        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Indicador no encontrado' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('Error al obtener indicador:', err);
        res.status(500).json({ mensaje: 'Error interno' });
    }
});




// // 🚫🚫🚫POST para subir o reemplazar imagen
app.post('/api/organigrama', upload.single('imagen'), async (req, res) => {
    const imagen = req.file?.buffer;
    if (!imagen) return res.status(400).send('No se recibió la imagen');

    try {
        // Borra la imagen anterior si solo querés una activa
        await pool.execute('DELETE FROM organigrama');
        await pool.execute('INSERT INTO organigrama (imagen) VALUES (?)', [imagen]);
        res.status(200).send('Imagen subida correctamente');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al guardar imagen');

    }
});


// // 🚫🚫🚫GET para obtener imagen
app.get('/api/organigrama/imagen', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT imagen FROM organigrama ORDER BY id DESC LIMIT 1');
        if (rows.length === 0) return res.status(404).send('No hay imagen');
        res.set('Content-Type', 'image/jpeg'); // o image/png
        res.send(rows[0].imagen);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener imagen');
    }
});

// // 🚫🚫🚫 Delete para eliminar imagen del organigrama
app.delete('/api/organigrama', async (req, res) => {
    try {
        await pool.execute('DELETE FROM organigrama');
        res.status(200).send('Imagen eliminada correctamente');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar imagen');
    }
});


// // 🚫🚫🚫 Carga de indicadores
app.post('/api/indicadores', async (req, res) => {
    const {
        codigo_identificatorio, nombre, dimension, descripcion, objetivo, formula_calculo,
        fuente_datos, responsable, unidad_funcional_id, unidad_medida, frecuencia_medicion,
        periodicidad_reporte, demora_maxima_valor, demora_maxima_unidad, periodo_inicial,
        meta_objetivo, umbral_positivo, umbral_critico, tendencia_deseada, categoria,
        criticidad, formato_presentacion, grupos_integracion, comentarios
    } = req.body;

    try {
        const sql = `
            INSERT INTO indicadores (
                codigo_identificatorio, nombre, dimension, descripcion, objetivo, formula_calculo,
                fuente_datos, responsable, unidad_funcional_id, unidad_medida, frecuencia_medicion,
                periodicidad_reporte, demora_maxima_valor, demora_maxima_unidad, periodo_inicial,
                meta_objetivo, umbral_positivo, umbral_critico, tendencia_deseada, categoria,
                criticidad, formato_presentacion, grupos_integracion, comentarios
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await pool.execute(sql, [
            codigo_identificatorio, nombre, dimension, descripcion, objetivo, formula_calculo,
            fuente_datos, responsable, unidad_funcional_id, unidad_medida, frecuencia_medicion,
            periodicidad_reporte, demora_maxima_valor, demora_maxima_unidad, periodo_inicial,
            meta_objetivo, umbral_positivo, umbral_critico, tendencia_deseada, categoria,
            criticidad, formato_presentacion, grupos_integracion, comentarios
        ]);

        res.status(201).json({ message: 'Indicador creado correctamente' });
    } catch (err) {
        console.error('Error en backend:', err);
        res.status(500).json({ error: 'Error al guardar el indicador' });
    }
});



// // 🚫🚫🚫 Eliminar indicador
app.delete('/api/indicadores/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    await pool.query('DELETE FROM indicadores WHERE codigo_identificatorio = ?', [codigo]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// // 🚫🚫🚫 Crear usuario con imagen
app.post('/usuarios', upload.single('foto'), async (req, res) => {
    try {
        const {
            legajo, apellido, nombres, email, telefono,
            cargo, sector, dependencia, jefe, legajo_jefe,
            ubicacion, estado, perfil, indicadores
        } = req.body;

        const fotoBuffer = req.file ? req.file.buffer : null;

        const sql = `
            INSERT INTO usuarios (
                legajo, apellido, nombres, email, telefono, foto,
                cargo, sector, dependencia, jefe_nombre, legajo_jefe,
                ubicacion, estado, perfil
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            legajo, apellido, nombres, email, telefono, fotoBuffer,
            cargo, sector, dependencia, jefe, legajo_jefe,
            ubicacion, estado, perfil
        ];

        const [result] = await pool.execute(sql, values);

        res.status(201).json({ message: 'Usuario creado', userId: result.insertId });
    } catch (err) {
        console.error('Error al crear usuario:', err);
        res.status(500).json({ error: 'Error interno al guardar el usuario' });
    }
});

// // 🚫🚫🚫 Leer usuarios con imagen
app.get('/usuarios', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT legajo, apellido, nombres, cargo, sector, email, estado, perfil, foto IS NOT NULL AS tiene_foto FROM usuarios');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// // 🚫🚫🚫 Obtener un usuario por legajo (para edición)
app.get('/usuarios/:legajo', async (req, res) => {
    const legajo = req.params.legajo;
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE legajo = ?', [legajo]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (err) {
        console.error('Error al obtener usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// // 🚫🚫🚫 Leer imagen del usuario
app.get('/usuarios/foto/:legajo', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT foto FROM usuarios WHERE legajo = ?', [req.params.legajo]);
        if (rows.length > 0 && rows[0].foto) {
            res.set('Content-Type', 'image/jpeg');
            res.send(rows[0].foto);
        } else {
            res.redirect('/images/default-user.jpg'); // o mandá 404
        }
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

// // 🚫🚫🚫 Eliminar usuario
app.delete('/usuarios/:legajo', async (req, res) => {
  try {
    const { legajo } = req.params;
    await pool.query('DELETE FROM usuarios WHERE legajo = ?', [legajo]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// // 🚫🚫🚫 Modificar usuario
app.put('/usuarios/:legajo', upload.single('foto'), async (req, res) => {
    try {
        const {
            apellido, nombres, email, telefono, cargo, sector,
            dependencia, jefe_nombre, legajo_jefe, ubicacion, estado, perfil, indicadores
        } = req.body;

        const campos = [
            'apellido = ?', 'nombres = ?', 'email = ?', 'telefono = ?',
            'cargo = ?', 'sector = ?', 'dependencia = ?', 'jefe_nombre = ?',
            'legajo_jefe = ?', 'ubicacion = ?', 'estado = ?', 'perfil = ?', 'indicadores = ?'
        ];
        const valores = [apellido, nombres, email, telefono, cargo, sector, dependencia, jefe_nombre,
            legajo_jefe, ubicacion, estado, perfil, indicadores];

        if (req.file) {
            campos.push('foto = ?');
            valores.push(req.file.buffer);
        }

        valores.push(req.params.legajo);

        const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE legajo = ?`;
        await pool.query(sql, valores);

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});


const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
console.log("Puerto usado:", PORT);
