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


// ✅ Crear un indicador
app.post('/api/guardar', async (req, res) => {

    try {
        const data = req.body;
        const [result] = await pool.query(
            `INSERT INTO indicadores (
                codigo_id,
                nombre,
                descripcion,
                tipo_id,
                dimension_id,
                categoria_id,
                criticidad_id,
                responsable,
                destino,
                objetivo,
                meta_tipo,
                unico_valor,
                unico_eval,
                unico_acepta,
                unico_riesgo,
                unico_critico,
                rango_desde,
                rango_hasta,
                rango_acepta,
                rango_riesgo,
                rango_critico,
                tenden_tipo,
                tenden_refe,
                tenden_acepta,
                tenden_riesgo,
                tenden_critico,
                fuente_datos,
                formula_calculo,
                unidad_medida,
                freq_medicion,
                tolerancia_plazo,
                freq_reporte,
                fecha_inicio,
                formato,
                comentarios,
                estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                data.codigo_id,
                data.nombre,
                data.descripcion,
                data.tipo_id,
                data.dimension_id,
                data.categoria_id,
                data.criticidad_id,
                data.responsable,
                data.destino,
                data.objetivo,
                data.meta_tipo,
                data.unico_valor,
                data.unico_eval,
                data.unico_acepta,
                data.unico_riesgo,
                data.unico_critico,
                data.rango_desde,
                data.rango_hasta,
                data.rango_acepta,
                data.rango_riesgo,
                data.rango_critico,
                data.tenden_tipo,
                data.tenden_refe,
                data.tenden_acepta,
                data.tenden_riesgo,
                data.tenden_critico,
                data.fuente_datos,
                data.formula_calculo,
                data.unidad_medida,
                data.freq_medicion,
                data.tolerancia_plazo,
                data.freq_reporte,
                data.fecha_inicio,
                data.formato,
                data.comentarios,
                data.estado
            ]
        );
        res.json({ success: true, mensaje: 'Indicador guardado', id: result.insertId });
    } catch (err) {
        console.error('Error al guardar indicador:', err);
        res.status(500).json({ success: false, error: 'Error al guardar el indicador' });

    }
});


// ✅  DELETE elimina un indicador
app.delete('/api/indicadores/delete/:codigo', async (req, res) => {
    const codigo = req.params.codigo;

    try {
        const [result] = await pool.query(
            'DELETE FROM indicadores WHERE codigo_id = ?',
            [codigo]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Indicador eliminado correctamente.' });
        } else {
            res.status(404).json({ success: false, message: 'Indicador no encontrado.' });
        }
    } catch (error) {
        console.error('Error eliminando indicador:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar indicador.' });
    }
});



// ✅ Actualizar un indicador
app.put('/api/actualizar/:id', async (req, res) => {

    try {
        const { id } = req.params;
        const data = req.body;
        await pool.query(
            `UPDATE indicadores SET
                codigo_id = ?,
                nombre = ?,
                descripcion = ?,
                tipo_id = ?,
                dimension_id = ?,
                categoria_id = ?,
                criticidad_id = ?,
                responsable = ?,
                destino = ?,
                objetivo = ?,
                meta_tipo = ?,
                unico_valor = ?,
                unico_eval = ?,
                unico_acepta = ?,
                unico_riesgo = ?,
                unico_critico = ?,
                rango_desde = ?,
                rango_hasta = ?,
                rango_acepta = ?,
                rango_riesgo = ?,
                rango_critico = ?,
                tenden_tipo = ?,
                tenden_refe = ?,
                tenden_acepta = ?,
                tenden_riesgo = ?,
                tenden_critico = ?,
                fuente_datos = ?,
                formula_calculo = ?,
                unidad_medida = ?,
                freq_medicion = ?,
                tolerancia_plazo = ?,
                freq_reporte = ?,
                fecha_inicio = ?,
                formato = ?,
                comentarios = ?,
                peso_porcentual = ?,
                estado = ?,
                dimension_porcentual = ?
            WHERE id = ?`,
            [
                data.codigo_id,
                data.nombre,
                data.descripcion,
                data.tipo_id,
                data.dimension_id,
                data.categoria_id,
                data.criticidad_id,
                data.responsable,
                data.destino,
                data.objetivo,
                data.meta_tipo,
                data.unico_valor,
                data.unico_eval,
                data.unico_acepta,
                data.unico_riesgo,
                data.unico_critico,
                data.rango_desde,
                data.rango_hasta,
                data.rango_acepta,
                data.rango_riesgo,
                data.rango_critico,
                data.tenden_tipo,
                data.tenden_refe,
                data.tenden_acepta,
                data.tenden_riesgo,
                data.tenden_critico,
                data.fuente_datos,
                data.formula_calculo,
                data.unidad_medida,
                data.freq_medicion,
                data.tolerancia_plazo,
                data.freq_reporte,
                data.fecha_inicio,
                data.formato,
                data.comentarios,
                data.peso_porcentual,
                data.estado,
                data.dimension_porcentual,
                id
            ]
        );
        res.json({ success: true, mensaje: 'Indicador actualizado' });
    } catch (err) {
        console.error('Error al actualizar indicador:', err);
        res.status(500).json({ success: false, error: 'Error al actualizar el indicador' });
    }
});


// Obtener todos los indicadores con última medición y descripciones asociadas
app.get('/api/indicadores', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      WITH ultimas AS (
        SELECT 
          m.*,
          ROW_NUMBER() OVER (
            PARTITION BY m.med_indicador_id
            ORDER BY m.med_valor_periodo DESC, m.med_fecha_registro DESC
          ) AS rn
        FROM mediciones m
      )
      SELECT 
        i.id,
        i.codigo_id,
        i.nombre,
        i.descripcion,
        i.tipo_id,
        i.dimension_id,
        d.nombre AS dimension_nombre,          -- 🔹 Descripción de la dimensión
        i.categoria_id,
        c.nombre AS categoria_descripcion,     -- 🔹 Descripción de la categoría
        i.criticidad_id,
        cr.nombre AS criticidad_descripcion,   -- 🔹 Descripción de la criticidad
        i.responsable,
        i.destino,
        i.objetivo,
        i.meta_tipo,
        i.unico_valor,
        i.unico_eval,
        i.unico_acepta,
        i.unico_riesgo,
        i.unico_critico,
        i.rango_desde,
        i.rango_hasta,
        i.rango_acepta,
        i.rango_riesgo,
        i.rango_critico,
        i.tenden_tipo,
        i.tenden_refe,
        i.tenden_acepta,
        i.tenden_riesgo,
        i.tenden_critico,
        i.fuente_datos,
        i.formula_calculo,
        i.unidad_medida,
        i.freq_medicion,
        i.tolerancia_plazo,
        i.freq_reporte,
        i.fecha_inicio,
        i.formato,
        i.comentarios,
        i.peso_porcentual,
        i.estado,
        i.dimension_porcentual,
        i.peso_porcentual_global,
        u.med_valor AS ultimo_valor,
        u.med_fecha_registro AS fecha_ultima_medicion,
        u.med_cumplimiento AS ultimo_cumplimiento
      FROM indicadores i
      LEFT JOIN ultimas u 
        ON u.med_indicador_id = i.id AND u.rn = 1
      LEFT JOIN dimension_indicador d 
        ON i.dimension_id = d.id
      LEFT JOIN categoria_indicador c 
        ON i.categoria_id = c.id
      LEFT JOIN criticidad_indicador cr 
        ON i.criticidad_id = cr.id
      ORDER BY i.id DESC;
    `);

        res.json(rows);

    } catch (err) {
        console.error("Error al obtener indicadores con última medición:", err);
        res.status(500).json({ mensaje: "Error interno" });
    }
});

// ✅ GET para tomar un indicador por codigo_id
app.get('/api/XXXindicadores/:codigo', async (req, res) => {
    const { codigo } = req.params;

    try {
        const [rows] = await pool.query(`
            SELECT 
                i.id,
                i.codigo_id,
                i.nombre,
                i.descripcion,
                i.tipo_id,
                i.dimension_id,
                d.nombre AS dimension_nombre,
                i.categoria_id,
                c.nombre AS categoria_nombre,       -- <--- aquí estaba el error
                i.criticidad_id,
                cr.nombre AS criticidad_nombre,     -- si la tabla criticidad_indicador también usa "nombre"
                i.responsable,
                CONCAT(u.nombres, ' ', u.apellido) AS responsable_nombre,
                i.destino,
                s.nombre AS destino_nombre,
                i.objetivo,
                i.meta_tipo,
                i.unico_valor,
                i.unico_eval,
                i.unico_acepta,
                i.unico_riesgo,
                i.unico_critico,
                i.rango_desde,
                i.rango_hasta,
                i.rango_acepta,
                i.rango_riesgo,
                i.rango_critico,
                i.tenden_tipo,
                i.tenden_refe,
                i.tenden_acepta,
                i.tenden_riesgo,
                i.tenden_critico,
                i.fuente_datos,
                i.formula_calculo,
                i.unidad_medida,
                i.freq_medicion,
                i.tolerancia_plazo,
                i.freq_reporte,
                i.fecha_inicio,
                i.formato,
                i.comentarios,
                i.peso_porcentual,
                i.estado,
                i.dimension_porcentual
            FROM indicadores i
            LEFT JOIN sectores s ON i.destino = s.id
            LEFT JOIN usuarios u ON i.responsable = u.legajo
            LEFT JOIN dimension_indicador d ON i.dimension_id = d.id
            LEFT JOIN categoria_indicador c ON i.categoria_id = c.id
            LEFT JOIN criticidad_indicador cr ON i.criticidad_id = cr.id
            WHERE i.codigo_id = ?
            LIMIT 1
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


// ✅ GET para tomar un indicador por codigo_id (con foto y responsable)
app.get('/api/indicadores/:codigo', async (req, res) => {
    const { codigo } = req.params;

    try {
        const [rows] = await pool.query(`
            SELECT 
                i.id,
                i.codigo_id,
                i.nombre,
                i.descripcion,
                i.tipo_id,
                i.dimension_id,
                d.nombre AS dimension_nombre,
                i.categoria_id,
                c.nombre AS categoria_nombre,
                i.criticidad_id,
                cr.nombre AS criticidad_nombre,
                i.responsable,
                CONCAT(u.nombres, ' ', u.apellido) AS responsable_nombre,
                u.foto AS responsable_foto,             -- 👈 se agrega la foto del usuario
                i.destino,
                s.nombre AS destino_nombre,
                i.objetivo,
                i.meta_tipo,
                i.unico_valor,
                i.unico_eval,
                i.unico_acepta,
                i.unico_riesgo,
                i.unico_critico,
                i.rango_desde,
                i.rango_hasta,
                i.rango_acepta,
                i.rango_riesgo,
                i.rango_critico,
                i.tenden_tipo,
                i.tenden_refe,
                i.tenden_acepta,
                i.tenden_riesgo,
                i.tenden_critico,
                i.fuente_datos,
                i.formula_calculo,
                i.unidad_medida,
                i.freq_medicion,
                i.tolerancia_plazo,
                i.freq_reporte,
                i.fecha_inicio,
                i.formato,
                i.comentarios,
                i.peso_porcentual,
                i.estado,
                i.dimension_porcentual,
                i.peso_porcentual_global
            FROM indicadores i
            LEFT JOIN sectores s ON i.destino = s.id
            LEFT JOIN usuarios u ON i.responsable = u.legajo
            LEFT JOIN dimension_indicador d ON i.dimension_id = d.id
            LEFT JOIN categoria_indicador c ON i.categoria_id = c.id
            LEFT JOIN criticidad_indicador cr ON i.criticidad_id = cr.id
            WHERE i.codigo_id = ?
            LIMIT 1
        `, [codigo]);

        // 🔹 Si no se encontró el indicador
        if (rows.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Indicador no encontrado',
            });
        }

        const indicador = rows[0];

        // 🧠 Si tiene foto BLOB, convertirla a base64 para enviar al frontend
        if (indicador.responsable_foto) {
            indicador.responsable_foto = `data:image/jpeg;base64,${indicador.responsable_foto.toString('base64')}`;
        }

        // 🔹 Enviar respuesta consistente
        res.status(200).json({
            ok: true,
            data: indicador,
        });

    } catch (err) {
        console.error('❌ Error al obtener indicador:', err);
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al obtener indicador.',
            error: err.message,
        });
    }
});


// ✅ GET: todos los indicadores de un destino (por ID)
app.get('/api/indicadores/destino/:idDestino', async (req, res) => {
    const { idDestino } = req.params;

    try {
        const [rows] = await pool.query(`
      SELECT 
        i.id,
        i.codigo_id,
        i.nombre,
        i.objetivo,
        i.unico_valor,
        i.peso_porcentual
      FROM indicadores i
      WHERE i.destino = ?
      ORDER BY i.peso_porcentual DESC
    `, [idDestino]);

        if (rows.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'No hay indicadores para este destino' });
        }

        res.status(200).json({ ok: true, data: rows });
    } catch (err) {
        console.error('Error al obtener indicadores por destino:', err);
        res.status(500).json({ ok: false, mensaje: 'Error interno al obtener indicadores' });
    }
});


// Actualizar los porcentajes de los indicadores
app.put('/api/indicadores/actualizar-pesos', async (req, res) => {
    const cambios = req.body; // Array de { id, dimension_porcentual }

    if (!Array.isArray(cambios)) {
        return res.status(400).json({ mensaje: 'Formato inválido' });
    }

    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        for (const ind of cambios) {
            await conn.query(
                `UPDATE indicadores 
             SET dimension_porcentual = ? 
             WHERE id = ?`,
                [ind.dimension_porcentual, ind.id]
            );
        }

        await conn.commit();
        res.json({ mensaje: 'Ponderaciones actualizadas correctamente' });
    } catch (err) {
        console.error('Error al actualizar ponderaciones:', err);
        res.status(500).json({ mensaje: 'Error interno al guardar ponderaciones' });
    } finally {
        if (conn) conn.release();
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
        codigo_id, nombre, descripcion,
        tipo_id, dimension_id, categoria_id, criticidad_id,
        responsable, destino, objetivo,
        meta_tipo, unico_valor, unico_eval, unico_acepta, unico_riesgo, unico_critico,
        rango_desde, rango_hasta, rango_acepta, rango_riesgo, rango_critico,
        tenden_tipo, tenden_refe, tenden_acepta, tenden_riesgo, tenden_critico,
        fuente_datos, formula_calculo,
        unidad_medida, frecuencia_medicion, tolerancia_plazo,
        frecuencia_reporte, fecha_inicio,
        formato_presentacion, comentarios, porcentual, estado, dimension_porcentual
    } = req.body;

    try {
        const sql = `
            INSERT INTO indicadores (
                codigo_id, nombre, descripcion,
                tipo_id, dimension_id, categoria_id, criticidad_id,
                responsable, destino, objetivo,
                meta_tipo, unico_valor, unico_eval, unico_acepta, unico_riesgo, unico_critico,
                rango_desde, rango_hasta, rango_acepta, rango_riesgo, rango_critico,
                tenden_tipo, tenden_refe, tenden_acepta, tenden_riesgo, tenden_critico,
                fuente_datos, formula_calculo,
                unidad_medida, freq_medicion, tolerancia_plazo, 
                freq_reporte, fecha_inicio,
                formato, comentarios, peso_porcentual, estado, dimension_porcentual
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await pool.execute(sql, [
            codigo_id, nombre, descripcion,
            tipo_id, dimension_id, categoria_id, criticidad_id,
            responsable, destino, objetivo,
            meta_tipo, unico_valor, unico_eval, unico_acepta, unico_riesgo, unico_critico,
            rango_desde, rango_hasta, rango_acepta, rango_riesgo, rango_critico,
            tenden_tipo, tenden_refe, tenden_acepta, tenden_riesgo, tenden_critico,
            fuente_datos, formula_calculo,
            unidad_medida, frecuencia_medicion, tolerancia_plazo,
            frecuencia_reporte, fecha_inicio,
            formato_presentacion, comentarios, porcentual, estado, dimension_porcentual
        ]);

        res.status(201).json({ message: 'Indicador creado correctamente' });
    } catch (err) {
        console.error('Error en backend:', err);
        res.status(500).json({ error: 'Error al guardar el indicador' });
    }
});


// // 🚫🚫🚫 Calcula cumplimiento del indicador
// ✅ Calcula cumplimiento del indicador + devuelve datos complementarios
app.get('/api/indicadores/:codigo/cumplimiento', async (req, res) => {
    const { codigo } = req.params;

    try {
        // 1️⃣ Buscar el indicador por su código_id
        const [indicadores] = await pool.query(`
            SELECT id, objetivo, meta_tipo, unico_valor, rango_desde, rango_hasta
            FROM indicadores
            WHERE codigo_id = ?
            LIMIT 1
        `, [codigo]);

        if (!indicadores.length) {
            return res.status(404).json({ error: 'Indicador no encontrado', porcentaje: 0 });
        }

        const indicador = indicadores[0];

        // 2️⃣ Obtener la última medición usando el id del indicador
        const [mediciones] = await pool.query(`
            SELECT med_valor
            FROM mediciones
            WHERE med_indicador_id = ?
            ORDER BY med_valor_periodo DESC, med_fecha_registro DESC
            LIMIT 1
        `, [indicador.id]);

        if (!mediciones.length) {
            // Sin medición → cumplimiento 0
            return res.json({
                porcentaje: 0,
                objetivo: indicador.objetivo,
                meta_tipo: indicador.meta_tipo,
                rango_desde: indicador.rango_desde,
                rango_hasta: indicador.rango_hasta,
                id: indicador.id
            });
        }

        const medicion = mediciones[0];

        // 3️⃣ Calcular cumplimiento (acercamiento a la meta)
        let cumplimiento = 0;
        if (indicador.unico_valor && medicion.med_valor) {
            cumplimiento = (medicion.med_valor / indicador.unico_valor) * 100;
            if (cumplimiento > 100) cumplimiento = 100;
        }

        // 4️⃣ Devolver respuesta completa
        res.json({
            porcentaje: cumplimiento,
            objetivo: indicador.objetivo,
            meta_tipo: indicador.meta_tipo,
            unico_valor: indicador.unico_valor,
            rango_desde: indicador.rango_desde,
            rango_hasta: indicador.rango_hasta,
            id: indicador.id
        });

    } catch (error) {
        console.error('Error calculando cumplimiento del indicador:', error);
        res.status(500).json({ error: 'Error al calcular el cumplimiento', porcentaje: 0 });
    }
});


app.get('/api/cumplimiento-por-destino', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            WITH ultimas AS (
                SELECT 
                    m.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY m.med_indicador_id
                        ORDER BY m.med_valor_periodo DESC
                    ) AS rn
                FROM mediciones m
            )
            SELECT 
                s.id AS id_destino,              -- ✅ Agregado: código del destino                
                s.nombre AS destino,
                COUNT(i.id) AS total_indicadores,
                
                -- ✅ Cumplimiento ponderado por el peso del indicador
                ROUND(SUM((m.med_valor / NULLIF(m.med_meta, 0)) * 100 * (i.peso_porcentual / 100)), 2) AS promedio_cumplimiento,
                
                -- ✅ Indicadores en meta (>= 90%)
                SUM(CASE
                        WHEN (m.med_valor / NULLIF(m.med_meta, 0)) * 100 >= 90
                        THEN 1 ELSE 0
                    END) AS en_meta,

                -- ✅ Indicadores críticos (< 70%)
                SUM(CASE
                        WHEN (m.med_valor / NULLIF(m.med_meta, 0)) * 100 < 70
                        THEN 1 ELSE 0
                    END) AS criticos,

                MAX(m.med_valor_periodo) AS ultima_medicion
            FROM indicadores i
            LEFT JOIN sectores s ON s.id = i.destino
            LEFT JOIN ultimas m ON m.med_indicador_id = i.id AND m.rn = 1
            GROUP BY s.id, s.nombre
            ORDER BY promedio_cumplimiento DESC;
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo cumplimiento por destino:', error);
        res.status(500).json({ error: 'Error al obtener el cumplimiento por destino' });
    }
});



/* 
            WITH ultimas AS (
                SELECT 
                    m.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY m.med_indicador_id
                        ORDER BY m.med_valor_periodo DESC
                    ) AS rn
                FROM mediciones m
            )

Esto crea una CTE (Common Table Expression), una especie de tabla temporal llamada ultimas.
Qué hace:
Toma todas las mediciones (mediciones m).
Usa la función de ventana ROW_NUMBER() para numerar las mediciones de cada indicador (PARTITION BY m.med_indicador_id).
El orden es descendente por período (ORDER BY m.med_valor_periodo DESC), o sea, la última medición de cada indicador recibe rn = 1.
👉 En resumen:
ultimas contiene todas las mediciones, pero ahora sabemos cuál es la más reciente (rn = 1) para cada indicador.
*/

/*
            SELECT 
                s.nombre AS destino,       -- nombre legible del sector
                COUNT(i.id) AS total_indicadores,
                ROUND(AVG(m.med_valor), 2) AS promedio_cumplimiento,
                SUM(CASE WHEN m.med_valor >= i.objetivo THEN 1 ELSE 0 END) AS en_meta,
                SUM(CASE WHEN m.med_valor < i.objetivo * 0.8 THEN 1 ELSE 0 END) AS criticos,
                MAX(m.med_valor_periodo) AS ultima_medicion
            FROM indicadores i
            LEFT JOIN sectores s ON s.id = i.destino
            LEFT JOIN ultimas m ON m.med_indicador_id = i.id AND m.rn = 1
            GROUP BY s.nombre
            ORDER BY promedio_cumplimiento DESC;


            🔗 Relaciones

🎈indicadores i: tabla principal (cada indicador pertenece a un destino y tiene un objetivo).

🎈sectores s: se une para obtener el nombre del destino (s.nombre).

🎈ultimas m: se une para traer la última medición del indicador (m.rn = 1).

El LEFT JOIN garantiza que, aunque un indicador no tenga mediciones aún, igual se muestre (con valores nulos).

📊 Cálculos de las columnas
Campo	Descripción
s.nombre AS destino:  	Nombre del sector/destino.
COUNT(i.id) AS total_indicadores: 	Cuántos indicadores tiene el destino.
ROUND(AVG(m.med_valor), 2) AS promedio_cumplimiento: 	Promedio de los valores medidos (cumplimiento promedio).
SUM(CASE WHEN m.med_valor >= i.objetivo THEN 1 ELSE 0 END): 	Cantidad de indicadores en meta (cumplen o superan el objetivo).
SUM(CASE WHEN m.med_valor < i.objetivo * 0.8 THEN 1 ELSE 0 END): 	Cantidad de indicadores críticos (menos del 80% del objetivo).
MAX(m.med_valor_periodo): 	Último período medido, solo como referencia.
🧠 Agrupamiento y orden
GROUP BY s.nombre
ORDER BY promedio_cumplimiento DESC

Agrupa por sector (destino).
Ordena los resultados de mayor a menor promedio de cumplimiento, para ver qué sector está mejor posicionado.

*/

// ✅ Evolución del cumplimiento promedio por área (últimos 6 períodos)
app.get('/api/evolucion-area/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // 1️⃣ Últimos 6 períodos con al menos una medición
        const [periodosRows] = await pool.query(`
            SELECT DISTINCT m.med_valor_periodo
            FROM mediciones m
            JOIN indicadores i ON m.med_indicador_id = i.id
            WHERE i.destino = ?
            ORDER BY m.med_valor_periodo DESC
            LIMIT 6
        `, [id]);

        const periodos = periodosRows.map(r => r.med_valor_periodo).reverse(); // más antiguo → más reciente

        if (periodos.length === 0) return res.json([]);

        // 2️⃣ Cumplimiento ponderado por período
        const data = [];

        for (const periodo of periodos) {
            const [rows] = await pool.query(`
                SELECT 
                    ROUND(SUM((m.med_valor / NULLIF(m.med_meta, 0)) * 100 * (i.peso_porcentual / 100)), 2) AS cumplimiento
                FROM indicadores i
                LEFT JOIN mediciones m 
                    ON m.med_indicador_id = i.id AND m.med_valor_periodo = ?
                WHERE i.destino = ?
            `, [periodo, id]);

            data.push({
                periodo_real: periodo,
                cumplimiento: rows[0].cumplimiento || 0
            });
        }

        res.json(data);

    } catch (error) {
        console.error('Error obteniendo evolución del área:', error);
        res.status(500).json({ error: 'Error al obtener evolución del área' });
    }
});

/*
🔹 Notas importantes
periodo ahora siempre existe para los últimos 6 med_valor_periodo que tienen al menos una medición.
Si para un período no hay medición, el cumplimiento será 0.
Eje X del gráfico sigue siendo 1..6 (más antiguo → más reciente).
*/





// // 🚫🚫🚫 Crear usuario con imagen
app.post('/usuarios', upload.single('foto'), async (req, res) => {
    try {
        const {
            legajo, apellido, nombres, email, telefono,
            cargo, sector, legajo_jefe,
            estado, perfil
        } = req.body;

        const fotoBuffer = req.file ? req.file.buffer : null;

        const sql = `
            INSERT INTO usuarios (
                legajo, apellido, nombres, email, telefono, foto,
                cargo, sector, legajo_jefe,
                estado, perfil
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            legajo, apellido, nombres, email, telefono, fotoBuffer,
            cargo, sector, legajo_jefe,
            estado, perfil
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
        const [rows] = await pool.execute('SELECT legajo, apellido, nombres, cargo, sector,  legajo_jefe, email, estado, perfil, foto IS NOT NULL AS tiene_foto FROM usuarios ORDER BY apellido ASC, nombres ASC');
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
        const [rows] = await pool.query('SELECT legajo, apellido, nombres, email, telefono, cargo, sector, legajo_jefe, estado, perfil FROM usuarios WHERE legajo = ?',
            [legajo]);
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
            legajo_jefe, estado, perfil
        } = req.body;

        const campos = [
            'apellido = ?', 'nombres = ?', 'email = ?', 'telefono = ?',
            'cargo = ?', 'sector = ?',
            'legajo_jefe = ?', 'estado = ?', 'perfil = ?'
        ];
        const valores = [apellido, nombres, email, telefono, cargo, sector,
            legajo_jefe, estado, perfil];

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


app.post("/api/usuarios/responsables", async (req, res) => {
    try {
        const { legajos } = req.body;

        if (!Array.isArray(legajos) || legajos.length === 0) {
            return res.status(400).json({ ok: false, msg: "Lista de legajos vacía" });
        }

        const [usuarios] = await pool.query(
            `SELECT * FROM usuarios WHERE legajo IN (?)`,
            [legajos]
        );

        res.json({ ok: true, data: usuarios });

    } catch (error) {
        console.error("Error en /usuarios/responsables:", error);
        res.status(500).json({ ok: false, msg: "Error interno" });
    }
});





// // 🚫🚫🚫 Obtener todos los sectores
app.get('/sectores', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM sectores');
        res.json(rows); // devuelve array de sectores {id, nombre, sector_padre_id}
    } catch (err) {
        console.error('Error al obtener sectores:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// // 🚫🚫🚫 Obtener un sector por unidad)
app.get('/sectores/:unidad', async (req, res) => {
    const unidad = req.params.unidad;
    try {
        const [rows] = await pool.query('SELECT * FROM sectores WHERE id = ?', [unidad]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Sector no encontrado' });
        }
    } catch (err) {
        console.error('Error al obtener sector:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// 🚀 Nueva ruta para devolver el árbol de sectores + indicadores
app.get('/api/arbol-indicadores', async (req, res) => {
    try {
        // 1. Obtener todos los sectores
        const [sectores] = await pool.query(`
            SELECT id, nombre, descripcion, sector_padre_id
            FROM sectores
        `);

        // 2. Obtener todos los indicadores
        const [indicadores] = await pool.query(`
            SELECT 
                id,
                codigo_identificatorio,
                nombre,
                unidad_funcional_id
            FROM indicadores
        `);

        // 3. Crear un mapa de sectores por ID
        const mapaSectores = {};
        sectores.forEach(sec => {
            mapaSectores[sec.id] = {
                id: `sector-${sec.id}`,
                nombre: sec.nombre,
                descripcion: sec.descripcion,
                tipo: 'sector',
                hijos: []
            };
        });

        // 4. Insertar indicadores en el sector correspondiente
        indicadores.forEach(ind => {
            const sector = mapaSectores[ind.unidad_funcional_id];
            if (sector) {
                sector.hijos.push({
                    id: `indicador-${ind.id}`,
                    nombre: ind.nombre,
                    codigo: ind.codigo_identificatorio,
                    tipo: 'indicador'
                });
            }
        });

        // 5. Construir la jerarquía
        const arbol = [];
        sectores.forEach(sec => {
            if (sec.sector_padre_id) {
                // Si tiene padre, lo metemos como hijo de ese padre
                if (mapaSectores[sec.sector_padre_id]) {
                    mapaSectores[sec.sector_padre_id].hijos.push(mapaSectores[sec.id]);
                }
            } else {
                // Si no tiene padre, es raíz
                arbol.push(mapaSectores[sec.id]);
            }
        });

        res.json(arbol);

    } catch (err) {
        console.error('Error al armar árbol:', err);
        res.status(500).json({ error: 'Error al generar el árbol' });
    }
});


// 🚀 Nueva ruta para jsTree
app.get('/api/arbol-jstree', async (req, res) => {
    try {
        // 1. Traer sectores
        const [sectores] = await pool.query(`
            SELECT id, nombre, sector_padre_id, sector_porcentual
            FROM sectores
        `);

        // 2. Traer indicadores
        const [indicadores] = await pool.query(`
            SELECT id, codigo_id, nombre, destino, peso_porcentual
            FROM indicadores
        `);

        const nodos = [];

        // 3. Convertir sectores a nodos jsTree
        sectores.forEach(sec => {
            nodos.push({
                id: `sector-${sec.id}`,
                parent: sec.sector_padre_id ? `sector-${sec.sector_padre_id}` : "#",
                text: sec.nombre,
                weight: sec.sector_porcentual ?? 0, // usar valor guardado
                icon: "fas fa-sitemap", // ícono de sector
                type: "sector"
            });
        });

        // 4. Convertir indicadores a nodos jsTree
        indicadores.forEach(ind => {
            nodos.push({
                id: `indicador-${ind.id}`,
                parent: `sector-${ind.destino}`,
                text: `${ind.nombre} (${ind.codigo_id})`,
                weight: ind.peso_porcentual ?? 0, // usar valor guardado
                icon: "fas fa-chart-line", // ícono de indicador
                type: "indicador",
                codigo_id: ind.codigo_id   // 👈 agregado
            });
        });

        res.json(nodos);
    } catch (err) {
        console.error('Error al armar jsTree:', err);
        res.status(500).json({ error: 'Error al generar árbol' });
    }
});



// 🚀 Ruta jsTree con conteo acumulado
app.get('/api/arbol-jstree-lazy-Nofunciona', async (req, res) => {
    try {
        const parent = req.query.parent;

        // Siempre cargamos toda la estructura en memoria para contar
        const [sectores] = await pool.query(`SELECT id, nombre, sector_padre_id, sector_porcentual  FROM sectores`);
        const [indicadores] = await pool.query(`SELECT id, codigo_id, nombre, destino, peso_porcentual FROM indicadores`);

        // Contar indicadores directos
        const conteoDirecto = {};
        sectores.forEach(s => conteoDirecto[s.id] = 0);
        indicadores.forEach(ind => {
            if (!conteoDirecto[ind.destino]) conteoDirecto[ind.destino] = 0;
            conteoDirecto[ind.destino]++;
        });

        // Función para contar acumulado
        function contarTotal(sectorId) {
            let total = conteoDirecto[sectorId] || 0;
            const hijos = sectores.filter(s => s.sector_padre_id === sectorId);
            hijos.forEach(hijo => {
                total += contarTotal(hijo.id);
            });
            return total;
        }

        if (parent === "#") {
            const sectoresRaiz = sectores.filter(s => !s.sector_padre_id);

            let nodos = [];

            sectoresRaiz.forEach((s, idx) => {
                // Nodo del sector raíz
                nodos.push({
                    id: `sector-${s.id}`,
                    parent: "#",
                    text: `(${s.sector_porcentual ?? ''}%) ${s.nombre} (${contarTotal(s.id)})`,
                    icon: "fas fa-sitemap",
                    type: "sector",
                    children: true,
                    sector_porcentual: s.sector_porcentual
                });

                // Insertar separador si no es el último
                if (idx < sectoresRaiz.length - 1) {
                    nodos.push({
                        id: `separator-${idx}`,
                        parent: "#",
                        text: " ", // Espacio para que jsTree lo renderice
                        icon: false,
                        type: "separator",
                        state: { disabled: true, opened: true }
                    });
                }
            });

            return res.json(nodos);
        }


        if (parent.startsWith("sector-")) {
            const sectorId = parseInt(parent.replace("sector-", ""), 10);

            // Sectores hijos
            const hijos = sectores
                .filter(s => s.sector_padre_id === sectorId)
                .map(s => ({
                    id: `sector-${s.id}`,
                    parent: `sector-${sectorId}`,
                    text: `(${s.sector_porcentual ?? ''}%) ${s.nombre} (${contarTotal(s.id)}) `,
                    icon: "fas fa-sitemap",
                    type: "sector",
                    children: true,
                    sector_porcentual: s.sector_porcentual
                }));

            // Indicadores de este sector
            const inds = indicadores
                .filter(ind => ind.destino === sectorId)
                .map(ind => ({
                    id: `indicador-${ind.id}`,
                    parent: `sector-${sectorId}`,
                    text: ` (${ind.peso_porcentual ?? ''}%) ${ind.nombre} (${ind.codigo_id})`,
                    icon: "fas fa-chart-line",
                    type: "indicador",
                    children: false,
                    peso_porcentual: ind.peso_porcentual,
                    nombre: ind.nombre,
                    codigo_id: ind.codigo_id,
                    descripcion: ind.descripcion,
                    objetivo: ind.objetivo,
                    dimension_id: ind.dimension_id,
                    categoria_id: ind.categoria_id,
                    responsable: ind.responsable,
                    freq_medicion: ind.freq_medicion,
                    unidad_medida: ind.unidad_medida,
                    meta_tipo: ind.meta_tipo,
                    comentarios: ind.comentarios,
                    estado: ind.estado
                }));

            return res.json([...hijos, ...inds]);
        }

        return res.json([]);

    } catch (err) {
        console.error('Error al armar árbol lazy con conteo:', err);
        res.status(500).json({ error: 'Error al generar árbol' });
    }
});

app.get('/api/arbol-jstree-lazy', async (req, res) => {
    try {
        const parent = req.query.parent;

        // Traer toda la estructura
        const [sectores] = await pool.query(`SELECT id, nombre, sector_padre_id, sector_porcentual FROM sectores`);
        const [indicadores] = await pool.query(`
            SELECT id, codigo_id, nombre, destino, peso_porcentual, descripcion,
                   objetivo, dimension_id, categoria_id, responsable,
                   freq_medicion, unidad_medida, meta_tipo, comentarios, estado
            FROM indicadores
        `);

        // Función para contar indicadores acumulados
        const conteoDirecto = {};
        sectores.forEach(s => conteoDirecto[s.id] = 0);
        indicadores.forEach(ind => {
            if (!conteoDirecto[ind.destino]) conteoDirecto[ind.destino] = 0;
            conteoDirecto[ind.destino]++;
        });

        function contarTotal(sectorId) {
            let total = conteoDirecto[sectorId] || 0;
            const hijos = sectores.filter(s => s.sector_padre_id === sectorId);
            hijos.forEach(hijo => total += contarTotal(hijo.id));
            return total;
        }

        // Nodo raíz
        if (parent === "#") {
            const sectoresRaiz = sectores.filter(s => !s.sector_padre_id);
            const nodos = sectoresRaiz.map(s => ({
                id: `sector-${s.id}`,
                parent: "#",
                text: `(${s.sector_porcentual ?? ''}%) ${s.nombre} (${contarTotal(s.id)})`,
                icon: "fas fa-sitemap",
                type: "sector",
                children: true,
                sector_porcentual: s.sector_porcentual
            }));
            return res.json(nodos);
        }

        // Nodo hijo
        if (parent.startsWith("sector-")) {
            const sectorId = parseInt(parent.replace("sector-", ""), 10);

            // Sectores hijos
            const hijos = sectores
                .filter(s => s.sector_padre_id === sectorId)
                .map(s => ({
                    id: `sector-${s.id}`,
                    parent: `sector-${sectorId}`,
                    text: `(${s.sector_porcentual ?? ''}%) ${s.nombre} (${contarTotal(s.id)})`,
                    icon: "fas fa-sitemap",
                    type: "sector",
                    children: true,
                    sector_porcentual: s.sector_porcentual
                }));

            // Indicadores
            const inds = indicadores
                .filter(ind => ind.destino === sectorId)
                .map(ind => ({
                    id: `indicador-${ind.id}`,
                    parent: `sector-${sectorId}`,
                    text: `(${ind.peso_porcentual ?? ''}%) ${ind.nombre} (${ind.codigo_id})`,
                    icon: "fas fa-chart-line",
                    type: "indicador",
                    children: false,
                    peso_porcentual: ind.peso_porcentual,
                    // TODOS los campos necesarios
                    nombre: ind.nombre,
                    codigo_id: ind.codigo_id,
                    descripcion: ind.descripcion,
                    objetivo: ind.objetivo,
                    dimension_id: ind.dimension_id,
                    categoria_id: ind.categoria_id,
                    responsable: ind.responsable,
                    freq_medicion: ind.freq_medicion,
                    unidad_medida: ind.unidad_medida,
                    meta_tipo: ind.meta_tipo,
                    comentarios: ind.comentarios,
                    estado: ind.estado
                }));

            return res.json([...hijos, ...inds]);
        }

        res.json([]);
    } catch (err) {
        console.error('Error al armar árbol lazy:', err);
        res.status(500).json({ error: 'Error al generar árbol' });
    }
});


// 🚀 Actualiza porcentajes de sector e indicador
app.post('/XXX/api/update-weight', async (req, res) => {
    const { id, weight } = req.body;

    if (!id || typeof weight !== 'number') {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    // id viene como "sector-29" o "indicador-15"
    const [type, rawId] = id.split('-');
    const numericId = parseInt(rawId, 10);

    if (!numericId) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    try {
        if (type === 'sector') {
            await pool.query(
                'UPDATE sectores SET sector_porcentual = ? WHERE id = ?',
                [weight, numericId]
            );
        } else if (type === 'indicador') {
            await pool.query(
                'UPDATE indicadores SET peso_porcentual = ? WHERE id = ?',
                [weight, numericId]
            );
        } else {
            return res.status(400).json({ error: 'Tipo inválido' });
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('Error actualizando peso:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 🚀 Actualiza porcentajes de sector e indicador (incluye peso global)
app.post('/api/update-weight', async (req, res) => {
    const { id, weight, globalWeight } = req.body;

    if (!id || typeof weight !== 'number') {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    // id viene como "sector-29" o "indicador-15"
    const [type, rawId] = id.split('-');
    const numericId = parseInt(rawId, 10);

    if (!numericId) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    try {
        if (type === 'sector') {

            // 👉 Actualiza solo porcentaje del sector
            await pool.query(
                'UPDATE sectores SET sector_porcentual = ? WHERE id = ?',
                [weight, numericId]
            );

        } else if (type === 'indicador') {

            // 👉 Actualiza porcentaje + porcentaje global (nuevo)
            await pool.query(
                `UPDATE indicadores 
                 SET peso_porcentual = ?, 
                     peso_porcentual_global = ?
                 WHERE id = ?`,
                [
                    weight,
                    typeof globalWeight === 'number' ? globalWeight : null,
                    numericId
                ]
            );

        } else {
            return res.status(400).json({ error: 'Tipo inválido' });
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('Error actualizando peso:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


//  🚀 AObtener solo el VALOR de una alerta específica
app.get('/api/alertas/:codigo/valor', async (req, res) => {
    try {
        const { codigo } = req.params;

        const [rows] = await pool.execute(
            'SELECT valor FROM alertas WHERE codigo = ?',
            [codigo]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Alerta no encontrada'
            });
        }

        res.json({
            success: true,
            valor: rows[0].valor
        });

    } catch (error) {
        console.error('Error al obtener valor de alerta:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});


// 🚀 Actualizar el VALOR de una alerta (0 o 1)
app.post('/api/alertas/:codigo/valor', async (req, res) => {

    try {
        const { codigo } = req.params;
        const { valor } = req.body; // se espera 0 o 1

        // console.log(`entro en actualizar ${valor}`)

        if (![0, 1].includes(valor)) {
            return res.status(400).json({ success: false, error: 'Valor inválido, debe ser 0 o 1' });
        }

        const [result] = await pool.execute(
            'UPDATE alertas SET valor = ? WHERE codigo = ?',
            [valor, codigo]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Alerta no encontrada' });
        }

        res.json({ success: true, codigo, valor });
    } catch (error) {
        console.error('Error al actualizar valor de alerta:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// // 🚫🚫🚫 Leer tabla de codigos
app.get('/api/codigos', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM codigos');
        res.json(rows); // devuelve array de codigos {id, nombre, descripcion}
    } catch (err) {
        console.error('Error al obtener codigos:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



// // 🚫🚫🚫 Obtener todos las mediciones
app.get('/api/mediciones', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM mediciones');
        res.json({
            success: true,
            total: rows.length,
            data: rows
        });
    } catch (err) {
        console.error('Error al obtener mediciones:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ✅ Obtener todas las mediciones de un indicador en particular
app.get('/api/XXXmediciones/:idIndicador', async (req, res) => {
    const { idIndicador } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT med_valor, med_valor_periodo, med_fecha_registro, med_meta, med_comentarios, med_plan_accion
             FROM mediciones 
             WHERE med_indicador_id = ? 
             ORDER BY med_valor_periodo ASC`,
            [idIndicador]
        );

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });
    } catch (err) {
        console.error('Error al obtener mediciones por indicador:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});


app.get("/api/mediciones/ultimas", async (req, res) => {
    try {

        const [ultimas] = await pool.query(`
      SELECT m.*
      FROM mediciones m
      INNER JOIN (
          SELECT med_indicador_id, MAX(med_valor_periodo) AS ultima_fecha
          FROM mediciones
          GROUP BY med_indicador_id
      ) AS u
      ON m.med_indicador_id = u.med_indicador_id
      AND m.med_valor_periodo = u.ultima_fecha
      ORDER BY m.med_indicador_id;
    `);

        res.json({ ok: true, data: ultimas });

    } catch (error) {
        console.error("Error en /mediciones/ultimas:", error);
        res.status(500).json({ ok: false, msg: "Error interno" });
    }
});


app.get('/api/mediciones/:idIndicador', async (req, res) => {
    const { idIndicador } = req.params;

    console.log("ID Indicador recibido en backend:", idIndicador);

    try {
        const [rows] = await pool.query(
            `SELECT 
                m.med_valor,
                m.med_valor_periodo,
                m.med_fecha_registro,
                m.med_cumplimiento,
                m.med_meta,
                m.med_comentarios,
                m.med_plan_accion,
                m.med_legajo_resp_medicion,
                m.med_legajo_resp_registro,

                -- 👇 Join para obtener nombres de responsables
                CONCAT(u1.nombres, ' ', u1.apellido) AS responsable_medicion,
                CONCAT(u2.nombres, ' ', u2.apellido) AS responsable_registro

             FROM mediciones m
             LEFT JOIN usuarios u1 ON m.med_legajo_resp_medicion = u1.legajo
             LEFT JOIN usuarios u2 ON m.med_legajo_resp_registro = u2.legajo

             WHERE m.med_indicador_id = ?
             ORDER BY m.med_valor_periodo ASC`,
            [idIndicador]
        );

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });
    } catch (err) {
        console.error('Error al obtener mediciones por indicador:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});


// // 🚫🚫🚫 Grabar una medicion
app.post('/api/mediciones', async (req, res) => {
    try {
        const {
            med_indicador_id,
            med_tipo_periodo,
            med_valor_periodo,
            med_anio,
            med_valor,
            med_meta,
            med_comentarios,
            med_unidad_medida,
            med_legajo_resp_medicion,
            med_legajo_resp_registro,
            med_fecha_registro,
            med_plan_accion,
            med_cumplimiento,
            med_porcen_destino,
            med_porcen_global,
            med_porcen_dimension
        } = req.body;

        // Validar datos
        const errores = [];
        if (!med_indicador_id) errores.push("Debe seleccionar un indicador.");
        if (isNaN(med_valor)) errores.push("El valor debe ser numérico.");
        if (!med_tipo_periodo) errores.push("Debe seleccionar un tipo de período.");
        if (!isNaN(med_anio) && (med_anio < 1900 || med_anio > 2100)) errores.push("Año inválido.");

        if (errores.length > 0) {
            return res.status(400).json({ success: false, errores });
        }

        // --- Validación de duplicados ---
        if (!med_tipo_periodo == "0210") {  // si no es eventual controla duplicados
            const [rows] = await pool.query(
                `SELECT id FROM mediciones 
             WHERE med_indicador_id = ? AND med_valor_periodo = ?`,
                [med_indicador_id, med_valor_periodo]
            );
            console.log(med_indicador_id, med_valor_periodo);

            if (rows.length > 0) {
                return res.status(409).json({
                    ok: false,
                    error: "Ya existe una medición para este indicador en esa fecha."
                });
            }
        };

        // Grabar medición
        const [result] = await pool.query(
            `
        INSERT INTO mediciones (
            med_indicador_id,
            med_tipo_periodo,
            med_valor_periodo,
            med_anio,
            med_valor,
            med_meta,
            med_comentarios,
            med_unidad_medida,
            med_legajo_resp_medicion,
            med_legajo_resp_registro,
            med_fecha_registro,
            med_plan_accion,
            med_cumplimiento,
            med_porcen_destino,
            med_porcen_global,
            med_porcen_dimension
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [
                med_indicador_id,
                med_tipo_periodo,
                med_valor_periodo,
                med_anio,
                med_valor,
                med_meta,
                med_comentarios,
                med_unidad_medida,
                med_legajo_resp_medicion,
                med_legajo_resp_registro,
                med_fecha_registro,
                med_plan_accion,
                med_cumplimiento,   
                med_porcen_destino,
                med_porcen_global,
                med_porcen_dimension    
            ]
        );


        res.status(201).json({ ok: true, id: result.insertId });
    } catch (err) {
        console.error('Error al grabar medición:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});



/* 🔍 Qué hace este código

1.Lee todas las mediciones con su indicador asociado.
2.Interpreta med_valor_periodo correctamente según el tipo, de diaria a anual.
3.Expande cada medición a todos los meses que cubre (ej. bimestral → 2 meses).
4.Construye el eje temporal mensual completo.
5.Aplica carry-forward (si un indicador no tiene medición nueva, mantiene la última).
6.Calcula el cumplimiento ponderado por peso_porcentual.
7.Devuelve la serie completa, con el detalle por indicador en cada mes. */


app.get('/api/evolucion-global', async (req, res) => {
    try {

        // 1) Traemos las mediciones + info del indicador
        const [rows] = await pool.query(`
            SELECT 
                m.med_indicador_id,
                m.med_tipo_periodo,
                m.med_valor_periodo,
                m.med_fecha_registro,
                m.med_cumplimiento,
                m.med_porcen_global,

                i.id AS indicador_id,
                i.nombre,
                i.destino
            FROM mediciones m
            JOIN indicadores i ON i.id = m.med_indicador_id
        `);

        if (!rows.length) return res.json([]);

        // --------------------------------------------------------
        // 2) Funciones auxiliares
        // --------------------------------------------------------

        // 🔹 Determinar fecha base según tipo de período
        function getMeasurementDate(med) {
            const tipo = med.med_tipo_periodo.slice(2);
            const val = med.med_valor_periodo?.toString() || "";

            const year = parseInt(val.substring(0, 4));
            if (!year || isNaN(year)) return null;

            try {
                switch (tipo) {
                    case '01': return new Date(val); // diaria
                    case '02': { const week = parseInt(val.substring(4)) || 1; return new Date(year, 0, 1 + (week - 1) * 7); }
                    case '03': { const q = parseInt(val.substring(4)) || 1; const m = Math.floor((q - 1) / 2); const d = q % 2 === 1 ? 1 : 16; return new Date(year, m, d); }
                    case '04': { const m = parseInt(val.substring(4, 6)) - 1; return new Date(year, m, 1); }
                    case '05': return new Date(year, (parseInt(val.substring(4)) - 1) * 2, 1);
                    case '06': return new Date(year, (parseInt(val.substring(4)) - 1) * 3, 1);
                    case '07': return new Date(year, (parseInt(val.substring(4)) - 1) * 4, 1);
                    case '08': return new Date(year, (parseInt(val.substring(4)) - 1) * 6, 1);
                    case '09': return new Date(year, 0, 1); // anual
                    case '10': return new Date(year, parseInt(val.substring(4, 6)) - 1, 1);
                    default:
                        return med.med_fecha_registro ? new Date(med.med_fecha_registro) : null;
                }
            } catch {
                return null;
            }
        }

        // 🔹 Meses cubiertos según tipo de período
        function monthsCovered(tipo) {
            const map = {
                '01': 1, '02': 1, '03': 1, '04': 1,
                '05': 2, '06': 3, '07': 4,
                '08': 6, '09': 12, '10': 1
            };
            return map[tipo.slice(2)] || 1;
        }

        // 🔹 Expandir medición a todos los meses que cubre
        function expandMeasurementToMonths(med) {
            const start = getMeasurementDate(med);
            const dur = monthsCovered(med.med_tipo_periodo);
            if (!start) return [];

            const months = [];
            for (let i = 0; i < dur; i++) {
                const d = new Date(start);
                d.setMonth(start.getMonth() + i);
                months.push(d.toISOString().slice(0, 7));
            }
            return months;
        }

        // --------------------------------------------------------
        // 3) Construcción del eje de meses (min → max)
        // --------------------------------------------------------

        const fechas = rows.map(getMeasurementDate).filter(Boolean);

        const min = new Date(Math.min(...fechas));
        const max = new Date(Math.max(...fechas));

        const allMonths = [];
        const cur = new Date(min);

        while (cur <= max) {
            allMonths.push(cur.toISOString().slice(0, 7));
            cur.setMonth(cur.getMonth() + 1);
        }

        // --------------------------------------------------------
        // 4) Lista de indicadores únicos
        // --------------------------------------------------------

        const indicadores = Array.from(
            new Map(
                rows.map(r => [
                    r.indicador_id,
                    {
                        id: r.indicador_id,
                        nombre: r.nombre,
                        destino: r.destino
                    }
                ])
            ).values()
        );

        const ultimoValor = {};
        const serie = [];

        // --------------------------------------------------------
        // 5) Calcular cumplimiento global mensual (⚠️ AHORA PONDERADO CORRECTAMENTE)
        // --------------------------------------------------------

        for (const month of allMonths) {
            let cumplimientoGlobalMes = 0; // <- suma ponderada (NO promedio)
            const detalle = [];

            for (const ind of indicadores) {

                // Mediciones del indicador
                const meds = rows
                    .filter(m => m.med_indicador_id === ind.id)
                    .filter(m => expandMeasurementToMonths(m).includes(month))
                    .sort((a, b) => new Date(b.med_fecha_registro) - new Date(a.med_fecha_registro));

                const medicion = meds[0] || ultimoValor[ind.id];
                if (!medicion) continue;

                const cumplimiento = parseFloat(medicion.med_cumplimiento) || 0;
                const peso = parseFloat(medicion.med_porcen_global) || 0;

                // ✔️ NUEVO: suma ponderada
                cumplimientoGlobalMes += cumplimiento * (peso / 100);

                ultimoValor[ind.id] = medicion;

                detalle.push({
                    indicador: ind.nombre,
                    cumplimiento: parseFloat(cumplimiento.toFixed(2)),
                    peso,
                    destino: ind.destino
                });
            }

            serie.push({
                month,
                cumplimiento: parseFloat(cumplimientoGlobalMes.toFixed(2)), // ✔️ ya no se divide
                detalle
            });
        }

        res.json(serie);

    } catch (err) {
        console.error("❌ Error calculando evolución global:", err);
        res.status(500).json({ error: "Error al calcular evolución global" });
    }
});



app.get('/api/MMMMMevolucion-global', async (req, res) => {
    try {

        // 1) Traemos las mediciones + info del indicador
        const [rows] = await pool.query(`
            SELECT 
                m.med_indicador_id,
                m.med_tipo_periodo,
                m.med_valor_periodo,
                m.med_fecha_registro,
                m.med_cumplimiento,
                m.med_porcen_global,

                i.id AS indicador_id,
                i.nombre,
                i.destino
            FROM mediciones m
            JOIN indicadores i ON i.id = m.med_indicador_id
        `);

        if (!rows.length) return res.json([]);

        // --------------------------------------------------------
        // 2) Funciones auxiliares
        // --------------------------------------------------------

        // 🔹 Determinar fecha base según tipo de período
        function getMeasurementDate(med) {
            const tipo = med.med_tipo_periodo.slice(2);
            const val = med.med_valor_periodo?.toString() || "";

            const year = parseInt(val.substring(0, 4));
            if (!year || isNaN(year)) return null;

            try {
                switch (tipo) {
                    case '01': // diaria
                        return new Date(val);

                    case '02': { // semanal
                        const week = parseInt(val.substring(4)) || 1;
                        return new Date(year, 0, 1 + (week - 1) * 7);
                    }

                    case '03': { // quincenal
                        const quin = parseInt(val.substring(4)) || 1;
                        const month = Math.floor((quin - 1) / 2);
                        const day = quin % 2 === 1 ? 1 : 16;
                        return new Date(year, month, day);
                    }

                    case '04': { // mensual
                        const month = parseInt(val.substring(4, 6)) - 1;
                        return new Date(year, month, 1);
                    }

                    case '05': { // bimestral
                        const bim = parseInt(val.substring(4)) || 1;
                        return new Date(year, (bim - 1) * 2, 1);
                    }

                    case '06': { // trimestral
                        const tri = parseInt(val.substring(4)) || 1;
                        return new Date(year, (tri - 1) * 3, 1);
                    }

                    case '07': { // cuatrimestral
                        const cua = parseInt(val.substring(4)) || 1;
                        return new Date(year, (cua - 1) * 4, 1);
                    }

                    case '08': { // semestral
                        const sem = parseInt(val.substring(4)) || 1;
                        return new Date(year, (sem - 1) * 6, 1);
                    }

                    case '09': // anual
                        return new Date(year, 0, 1);

                    case '10': { // eventual (mes exacto)
                        const month = parseInt(val.substring(4, 6)) - 1;
                        return new Date(year, month, 1);
                    }

                    default:
                        return med.med_fecha_registro ? new Date(med.med_fecha_registro) : null;
                }
            } catch {
                return null;
            }
        }

        // 🔹 Meses cubiertos por cada tipo de período
        function monthsCovered(tipo) {
            const map = {
                '01': 1, '02': 1, '03': 1, '04': 1,
                '05': 2, '06': 3, '07': 4, '08': 6,
                '09': 12, '10': 1
            };
            return map[tipo.slice(2)] || 1;
        }

        // 🔹 Expande medición a todos los meses que cubre
        function expandMeasurementToMonths(med) {
            const start = getMeasurementDate(med);
            const dur = monthsCovered(med.med_tipo_periodo);
            if (!start) return [];

            const months = [];
            for (let i = 0; i < dur; i++) {
                const d = new Date(start);
                d.setMonth(start.getMonth() + i);
                months.push(d.toISOString().slice(0, 7));
            }
            return months;
        }

        // --------------------------------------------------------
        // 3) Construcción del eje de meses (min → max)
        // --------------------------------------------------------

        const fechas = rows.map(getMeasurementDate).filter(Boolean);

        const min = new Date(Math.min(...fechas));
        const max = new Date(Math.max(...fechas));

        const allMonths = [];
        const cur = new Date(min);

        while (cur <= max) {
            allMonths.push(cur.toISOString().slice(0, 7));
            cur.setMonth(cur.getMonth() + 1);
        }

        // --------------------------------------------------------
        // 4) Lista de indicadores únicos
        // --------------------------------------------------------

        const indicadores = Array.from(
            new Map(
                rows.map(r => [
                    r.indicador_id,
                    {
                        id: r.indicador_id,
                        nombre: r.nombre,
                        destino: r.destino
                    }
                ])
            ).values()
        );

        // Último valor conocido para carry-forward
        const ultimoValor = {};

        const serie = [];

        // --------------------------------------------------------
        // 5) Cálculo mensual usando med_cumplimiento y med_porcen_global
        // --------------------------------------------------------

        for (const month of allMonths) {
            let suma = 0;
            let pesoTotal = 0;
            const detalle = [];

            for (const ind of indicadores) {

                // Todas las mediciones del indicador
                const meds = rows
                    .filter(m => m.med_indicador_id === ind.id)
                    .filter(m => expandMeasurementToMonths(m).includes(month))
                    .sort((a, b) => new Date(b.med_fecha_registro) - new Date(a.med_fecha_registro));

                const medicion = meds[0] || ultimoValor[ind.id];
                if (!medicion) continue;

                const cumplimiento = parseFloat(medicion.med_cumplimiento) || 0;
                const peso = parseFloat(medicion.med_porcen_global) || 0;

                if (peso > 0) {
                    suma += cumplimiento * peso;
                    pesoTotal += peso;
                }

                ultimoValor[ind.id] = medicion;

                detalle.push({
                    indicador: ind.nombre,
                    cumplimiento: parseFloat(cumplimiento.toFixed(2)),
                    peso,
                    destino: ind.destino
                });
            }

            serie.push({
                month,
                cumplimiento: pesoTotal > 0 ? parseFloat((suma / pesoTotal).toFixed(2)) : 0,
                detalle
            });
        }

        res.json(serie);

    } catch (err) {
        console.error("❌ Error calculando evolución global:", err);
        res.status(500).json({ error: "Error al calcular evolución global" });
    }
});


app.get('/api/XXXXXevolucion-global', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT 
        m.med_indicador_id,
        m.med_tipo_periodo,
        m.med_valor_periodo,
        m.med_valor,
        m.med_fecha_registro,
        i.id AS indicador_id,
        i.nombre,
        i.objetivo,
        i.meta_tipo,
        i.unico_valor,
        i.peso_porcentual,
        i.destino
      FROM mediciones m
      JOIN indicadores i ON i.id = m.med_indicador_id
    `);

        // 🔹 Función segura de cálculo de cumplimiento
        function calcularCumplimiento(indicador, valor) {
            const val = parseFloat(valor);
            const obj = parseFloat(indicador.objetivo);

            if (!isFinite(val) || !isFinite(obj) || obj === 0) return 0;
            return (val / obj) * 100;
        }

        // 🔹 Parseo seguro de fechas según tipo de período
        function getMeasurementDate(med) {
            const tipo = med.med_tipo_periodo.slice(2);
            const val = med.med_valor_periodo?.toString() || '';
            const year = parseInt(val.substring(0, 4));
            if (!year || isNaN(year)) return null;

            try {
                switch (tipo) {
                    case '01': return new Date(val); // diaria (AAAA-MM-DD)
                    case '02': { // semanal
                        const week = parseInt(val.substring(4)) || 1;
                        const d = new Date(year, 0, 1 + (week - 1) * 7);
                        return d;
                    }
                    case '03': { // quincenal
                        const quin = parseInt(val.substring(4)) || 1;
                        const month = Math.floor((quin - 1) / 2);
                        const half = quin % 2 === 1 ? 1 : 16;
                        return new Date(year, month, half);
                    }
                    case '04': { // mensual
                        const month = parseInt(val.substring(4, 6)) - 1;
                        return new Date(year, month, 1);
                    }
                    case '05': { // bimestral
                        const bim = parseInt(val.substring(4)) || 1;
                        const month = (bim - 1) * 2;
                        return new Date(year, month, 1);
                    }
                    case '06': { // trimestral
                        const tri = parseInt(val.substring(4)) || 1;
                        const month = (tri - 1) * 3;
                        return new Date(year, month, 1);
                    }
                    case '07': { // cuatrimestral
                        const cua = parseInt(val.substring(4)) || 1;
                        const month = (cua - 1) * 4;
                        return new Date(year, month, 1);
                    }
                    case '08': { // semestral
                        const sem = parseInt(val.substring(4)) || 1;
                        const month = (sem - 1) * 6;
                        return new Date(year, month, 1);
                    }
                    case '09': // anual
                        return new Date(year, 0, 1);
                    case '10': { // eventual (mes)
                        const month = parseInt(val.substring(4, 6)) - 1;
                        return new Date(year, month, 1);
                    }
                    default:
                        return med.med_fecha_registro ? new Date(med.med_fecha_registro) : null;
                }
            } catch {
                return null;
            }
        }

        // 🔹 Meses cubiertos por cada tipo de período
        function monthsCovered(tipo) {
            const map = {
                '01': 1, '02': 1, '03': 1, '04': 1,
                '05': 2, '06': 3, '07': 4, '08': 6,
                '09': 12, '10': 1
            };
            return map[tipo.slice(2)] || 1;
        }

        // 🔹 Expandir medición a todos los meses que cubre
        function expandMeasurementToMonths(med) {
            const start = getMeasurementDate(med);
            const dur = monthsCovered(med.med_tipo_periodo);
            if (!start) return [];
            const months = [];
            for (let i = 0; i < dur; i++) {
                const m = new Date(start);
                m.setMonth(start.getMonth() + i);
                months.push(m.toISOString().slice(0, 7)); // YYYY-MM
            }
            return months;
        }

        // 🔹 Generar rango completo de meses (eje X)
        const fechas = rows.map(getMeasurementDate).filter(Boolean);
        if (!fechas.length) {
            return res.json([]); // no hay datos válidos
        }

        const min = new Date(Math.min(...fechas));
        const max = new Date(Math.max(...fechas));
        const allMonths = [];
        const current = new Date(min);
        while (current <= max) {
            allMonths.push(current.toISOString().slice(0, 7));
            current.setMonth(current.getMonth() + 1);
        }
        console.log('🗓️ Rango de meses:', allMonths);

        // 🔹 Agrupar indicadores únicos
        const indicadores = Array.from(
            new Map(rows.map(r => [r.indicador_id, {
                id: r.indicador_id,
                nombre: r.nombre,
                objetivo: parseFloat(r.unico_valor) || 0, // <-- usar unico_valor
                meta_tipo: r.meta_tipo,
                unico_valor: r.unico_valor,
                peso_porcentual: Number(r.peso_porcentual) || 0,
                destino: r.destino
            }])).values()
        );

        const ultimoValor = {};
        const serie = [];

        for (const month of allMonths) {
            let suma = 0;
            let pesoTotal = 0;
            const detalle = [];

            for (const ind of indicadores) {
                const meds = rows
                    .filter(m => m.med_indicador_id === ind.id && isFinite(parseFloat(m.med_valor)))
                    .filter(m => expandMeasurementToMonths(m).includes(month))
                    .sort((a, b) => new Date(b.med_fecha_registro) - new Date(a.med_fecha_registro));

                const medicion = meds[0] || ultimoValor[ind.id];
                if (!medicion) continue;

                const cumplimiento = calcularCumplimiento(ind, medicion.med_valor);
                if (!isFinite(cumplimiento)) continue;

                suma += cumplimiento * ind.peso_porcentual;
                pesoTotal += ind.peso_porcentual;

                ultimoValor[ind.id] = medicion;
                detalle.push({
                    indicador: ind.nombre,
                    cumplimiento: parseFloat(cumplimiento.toFixed(2)),
                    peso: ind.peso_porcentual,
                    destino: ind.destino
                });
            }

            serie.push({
                month,
                cumplimiento: pesoTotal > 0 ? parseFloat((suma / pesoTotal).toFixed(2)) : 0,
                detalle
            });
        }

        // console.log('📊 Serie mensual generada:', serie);
        res.json(serie);
    } catch (err) {
        console.error('❌ Error calculando evolución global:', err);
        res.status(500).json({ error: 'Error al calcular evolución global' });
    }
});


/* 🔢 Ejemplo de salida JSON
[
  {
    "month": "2024-01",
    "cumplimiento": 78.45,
    "detalle": [
      { "indicador": "Productividad", "cumplimiento": 82.1, "peso": 20 },
      { "indicador": "Satisfacción", "cumplimiento": 75.3, "peso": 30 }
    ]
  },
  {
    "month": "2024-02",
    "cumplimiento": 80.12,
    "detalle": [
      { "indicador": "Productividad", "cumplimiento": 85.0, "peso": 20 },
      { "indicador": "Satisfacción", "cumplimiento": 78.2, "peso": 30 }
    ]
  }
] */


app.get('ZZZ/api/evolucion-global', async (req, res) => {
    try {
        const destinoFiltrado = req.query.destino ? Number(req.query.destino) : null;

        const [rows] = await pool.query(`
            SELECT 
                m.med_indicador_id,
                m.med_tipo_periodo,
                m.med_valor_periodo,
                m.med_valor,
                m.med_fecha_registro,
                i.id AS indicador_id,
                i.nombre,
                i.objetivo,
                i.meta_tipo,
                i.unico_valor,
                i.peso_porcentual,
                i.destino
            FROM mediciones m
            JOIN indicadores i ON i.id = m.med_indicador_id
            ${destinoFiltrado ? 'WHERE i.destino = ?' : ''}
        `, destinoFiltrado ? [destinoFiltrado] : []);

        if (!rows.length) return res.json([]);

        // --- Funciones auxiliares ---
        function calcularCumplimiento(indicador, valor) {
            const val = parseFloat(valor);
            const obj = parseFloat(indicador.objetivo);
            if (!isFinite(val) || !isFinite(obj) || obj === 0) return 0;
            return (val / obj) * 100;
        }

        function getMeasurementDate(med) {
            const tipo = med.med_tipo_periodo.slice(2);
            const val = med.med_valor_periodo?.toString() || '';
            const year = parseInt(val.substring(0, 4));
            if (!year || isNaN(year)) return null;
            try {
                switch (tipo) {
                    case '01': return new Date(val);
                    case '02': { const week = parseInt(val.substring(4)) || 1; return new Date(year, 0, 1 + (week - 1) * 7); }
                    case '03': { const quin = parseInt(val.substring(4)) || 1; const month = Math.floor((quin - 1) / 2); const half = quin % 2 === 1 ? 1 : 16; return new Date(year, month, half); }
                    case '04': { const month = parseInt(val.substring(4, 6)) - 1; return new Date(year, month, 1); }
                    case '05': { const bim = parseInt(val.substring(4)) || 1; const month = (bim - 1) * 2; return new Date(year, month, 1); }
                    case '06': { const tri = parseInt(val.substring(4)) || 1; const month = (tri - 1) * 3; return new Date(year, month, 1); }
                    case '07': { const cua = parseInt(val.substring(4)) || 1; const month = (cua - 1) * 4; return new Date(year, month, 1); }
                    case '08': { const sem = parseInt(val.substring(4)) || 1; const month = (sem - 1) * 6; return new Date(year, month, 1); }
                    case '09': return new Date(year, 0, 1);
                    case '10': { const month = parseInt(val.substring(4, 6)) - 1; return new Date(year, month, 1); }
                    default: return med.med_fecha_registro ? new Date(med.med_fecha_registro) : null;
                }
            } catch {
                return null;
            }
        }

        function monthsCovered(tipo) {
            const map = { '01': 1, '02': 1, '03': 1, '04': 1, '05': 2, '06': 3, '07': 4, '08': 6, '09': 12, '10': 1 };
            return map[tipo.slice(2)] || 1;
        }

        function expandMeasurementToMonths(med) {
            const start = getMeasurementDate(med);
            const dur = monthsCovered(med.med_tipo_periodo);
            if (!start) return [];
            const months = [];
            for (let i = 0; i < dur; i++) {
                const m = new Date(start);
                m.setMonth(start.getMonth() + i);
                months.push(m.toISOString().slice(0, 7)); // YYYY-MM
            }
            return months;
        }

        // --- Función principal para calcular evolución mensual ---
        function calcularSerieMensual(rows) {
            const fechas = rows.map(getMeasurementDate).filter(Boolean);
            if (!fechas.length) return [];

            const min = new Date(Math.min(...fechas));
            const max = new Date(Math.max(...fechas));
            const allMonths = [];
            const current = new Date(min);
            while (current <= max) {
                allMonths.push(current.toISOString().slice(0, 7));
                current.setMonth(current.getMonth() + 1);
            }

            const indicadores = Array.from(
                new Map(rows.map(r => [r.indicador_id, {
                    id: r.indicador_id,
                    nombre: r.nombre,
                    objetivo: parseFloat(r.unico_valor) || 0,
                    meta_tipo: r.meta_tipo,
                    unico_valor: r.unico_valor,
                    peso_porcentual: Number(r.peso_porcentual) || 0
                }])).values()
            );

            const ultimoValor = {};
            const serie = [];

            for (const month of allMonths) {
                let suma = 0;
                let pesoTotal = 0;
                const detalle = [];

                for (const ind of indicadores) {
                    const meds = rows
                        .filter(m => m.med_indicador_id === ind.id && isFinite(parseFloat(m.med_valor)))
                        .filter(m => expandMeasurementToMonths(m).includes(month))
                        .sort((a, b) => new Date(b.med_fecha_registro) - new Date(a.med_fecha_registro));

                    const medicion = meds[0] || ultimoValor[ind.id];
                    if (!medicion) continue;

                    const cumplimiento = calcularCumplimiento(ind, medicion.med_valor);
                    if (!isFinite(cumplimiento)) continue;

                    suma += cumplimiento * ind.peso_porcentual;
                    pesoTotal += ind.peso_porcentual;

                    ultimoValor[ind.id] = medicion;
                    detalle.push({
                        indicador: ind.nombre,
                        cumplimiento: parseFloat(cumplimiento.toFixed(2)),
                        peso: ind.peso_porcentual
                    });
                }

                serie.push({
                    month,
                    cumplimiento: pesoTotal > 0 ? parseFloat((suma / pesoTotal).toFixed(2)) : 0,
                    detalle
                });
            }

            return serie;
        }

        // --- Procesamiento por destino ---
        const destinos = Array.from(new Set(rows.map(r => r.destino)));
        const resultados = [];

        for (const dest of destinos) {
            const rowsDestino = rows.filter(r => r.destino === dest);
            const serie = calcularSerieMensual(rowsDestino);
            resultados.push({ destino: dest, serie });
        }

        // Si se solicitó un destino específico, devolvemos solo ese
        if (destinoFiltrado) {
            return res.json(resultados.find(r => r.destino === destinoFiltrado) || { destino: destinoFiltrado, serie: [] });
        }

        res.json(resultados);

    } catch (err) {
        console.error('❌ Error calculando evolución global:', err);
        res.status(500).json({ error: 'Error al calcular evolución global' });
    }
});








const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
console.log("Puerto usado:", PORT);
