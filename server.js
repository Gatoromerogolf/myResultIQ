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
app.post('/guardar', async (req, res) => {
    const data = req.body;
    try {
        await pool.query(
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
                tolerancia_q,
                freq_reporte,
                fecha_inicio,
                formato,
                grupos
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
                data.tolerancia_q,
                data.freq_reporte,
                data.fecha_inicio,
                data.formato,
                data.grupos
            ]
        );

        res.json({ mensaje: 'Indicador guardado' });
    } catch (err) {
        console.error('Error al guardar indicador:', err);
        res.status(500).json({ mensaje: 'Error al guardar el indicador' });
    }
});




// 🚫🚫🚫GET para tomar los indicadores

// ✅ Obtener todos los indicadores
app.get('/api/indicadores', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                id,
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
                tolerancia_q,
                freq_reporte,
                fecha_inicio,
                formato,
                grupos
            FROM indicadores
            ORDER BY id DESC
        `);

        res.json(rows);
    } catch (err) {
        console.error("Error al obtener indicadores:", err);
        res.status(500).json({ mensaje: "Error interno" });
    }
});




// // 🚫🚫🚫GET para tomar un indicador
// ✅ GET para tomar un indicador por codigo_id
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
                i.categoria_id,
                i.criticidad_id,
                i.responsable,
                u.nombres AS responsable_nombres,
                u.apellido AS responsable_apellido,
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
                i.tolerancia_q,
                i.freq_reporte,
                i.fecha_inicio,
                i.formato,
                i.grupos
            FROM indicadores i
            LEFT JOIN sectores s ON i.destino = s.id
            LEFT JOIN usuarios u ON i.responsable = u.legajo
            WHERE i.codigo_id = ?
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
        const [rows] = await pool.execute('SELECT legajo, apellido, nombres, cargo, sector,  legajo_jefe, email, estado, perfil, foto IS NOT NULL AS tiene_foto FROM usuarios');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// // 🚫🚫🚫 Obtener un usuario por legajo (para edición)
app.get('/usuarios/:legajo', async (req, res) => {
    const legajo = req.params.legajo;
    console.log(`legajo en back: ${legajo}`)
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
            SELECT id, codigo_identificatorio, nombre, unidad_funcional_id, peso_porcentual
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
                parent: `sector-${ind.unidad_funcional_id}`,
                text: `${ind.nombre} (${ind.codigo_identificatorio})`,
                weight: ind.peso_porcentual ?? 0, // usar valor guardado
                icon: "fas fa-chart-line", // ícono de indicador
                type: "indicador"
            });
        });

        res.json(nodos);
    } catch (err) {
        console.error('Error al armar jsTree:', err);
        res.status(500).json({ error: 'Error al generar árbol' });
    }
});

// 🚀 Ruta para lazy loading de jsTree
app.get('/api/arbol-jstree-lazy-anulada', async (req, res) => {
    try {
        const parent = req.query.parent; // "#" o "sector-X"

        if (parent === "#") {
            // NODOS RAÍZ: sectores sin padre
            const [sectoresRaiz] = await pool.query(`
                SELECT id, nombre 
                FROM sectores 
                WHERE sector_padre_id IS NULL
            `);

            const nodos = sectoresRaiz.map(sec => ({
                id: `sector-${sec.id}`,
                parent: "#",
                text: sec.nombre,
                icon: "fas fa-sitemap",
                type: "sector",
                children: true // indica que puede tener hijos
            }));

            return res.json(nodos);
        }

        // Si el parent es un sector: traer hijos e indicadores
        if (parent.startsWith("sector-")) {
            const sectorId = parent.replace("sector-", "");

            // Sectores hijos
            const [sectoresHijos] = await pool.query(`
                SELECT id, nombre
                FROM sectores
                WHERE sector_padre_id = ?
            `, [sectorId]);

            // Indicadores del sector
            const [indicadores] = await pool.query(`
                SELECT id, codigo_identificatorio, nombre
                FROM indicadores
                WHERE unidad_funcional_id = ?
            `, [sectorId]);

            const nodos = [
                ...sectoresHijos.map(sec => ({
                    id: `sector-${sec.id}`,
                    parent: `sector-${sectorId}`,
                    text: sec.nombre,
                    icon: "fas fa-sitemap",
                    type: "sector",
                    children: true
                })),
                ...indicadores.map(ind => ({
                    id: `indicador-${ind.id}`,
                    parent: `sector-${sectorId}`,
                    text: `${ind.nombre} (${ind.codigo_identificatorio})`,
                    icon: "fas fa-chart-line",
                    type: "indicador",
                    children: false
                }))
            ];

            return res.json(nodos);
        }

        // Si es un indicador, no tiene hijos
        return res.json([]);

    } catch (err) {
        console.error('Error al armar árbol lazy:', err);
        res.status(500).json({ error: 'Error al generar árbol' });
    }
});


// 🚀 Ruta jsTree con conteo acumulado
app.get('/api/arbol-jstree-lazy', async (req, res) => {
    try {
        const parent = req.query.parent;

        // Siempre cargamos toda la estructura en memoria para contar
        const [sectores] = await pool.query(`SELECT id, nombre, sector_padre_id, sector_porcentual  FROM sectores`);
        const [indicadores] = await pool.query(`SELECT id, codigo_identificatorio, nombre, unidad_funcional_id, peso_porcentual FROM indicadores`);

        // Contar indicadores directos
        const conteoDirecto = {};
        sectores.forEach(s => conteoDirecto[s.id] = 0);
        indicadores.forEach(ind => {
            if (!conteoDirecto[ind.unidad_funcional_id]) conteoDirecto[ind.unidad_funcional_id] = 0;
            conteoDirecto[ind.unidad_funcional_id]++;
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
                .filter(ind => ind.unidad_funcional_id === sectorId)
                .map(ind => ({
                    id: `indicador-${ind.id}`,
                    parent: `sector-${sectorId}`,
                    text: ` (${ind.peso_porcentual ?? ''}%) ${ind.nombre} (${ind.codigo_identificatorio})`,
                    icon: "fas fa-chart-line",
                    type: "indicador",
                    children: false,
                    peso_porcentual: ind.peso_porcentual
                }));

            return res.json([...hijos, ...inds]);
        }

        return res.json([]);

    } catch (err) {
        console.error('Error al armar árbol lazy con conteo:', err);
        res.status(500).json({ error: 'Error al generar árbol' });
    }
});


// 🚀 Actualiza porcentajes de sector e indicador
app.post('/api/update-weight', async (req, res) => {
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

        console.log(`entro en actualizar ${valor}`)

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


const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
console.log("Puerto usado:", PORT);
