// ============================================================
//  Directorio Vecinal — Rutas
//  Usar en server.js así:
//    const dvRoutes = require('./routes_dv');
//    dvRoutes(app, pool, bcrypt, crypto, sendMail);
// ============================================================

module.exports = function registerDVRoutes(app, pool, bcrypt, crypto, sendMail) {

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || process.env.TOKEN_SECRET || 'cambiar-por-secreto-seguro';
    const APP_URL = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const SALT = 10; // mismo valor que usás en el resto de tu app

    // ----------------------------------------------------------
    //  Helpers locales (no pisan los del server principal)
    // ----------------------------------------------------------
    function dvOk(res, data) { res.json({ ok: true, data }); }
    function dvErr(res, msg, code = 500) { res.status(code).json({ ok: false, error: msg }); }

    function mimeFromDataURL(dataURL) {
        const match = dataURL?.match(/^data:([^;]+);base64,/);
        return match ? match[1] : 'image/jpeg';
    }

    // ----------------------------------------------------------
    //  Middleware JWT para rutas del directorio
    // ----------------------------------------------------------
    function dvAuth(req, res, next) {
        const header = req.headers.authorization;

        if (!header?.startsWith('Bearer '))
            return dvErr(res, 'Acceso no autorizado.', 401);
        try {
            req.dvUser = jwt.verify(header.slice(7), JWT_SECRET);
            next();
        } catch (err) {
            const decoded = jwt.decode(header.slice(7));
            console.error(
                'dvAuth falló:', err.message
            );
            dvErr(res, 'Sesión expirada o token inválido.', 401);
        }
    }

    function bloquearVisitante(req, res, next) {
        if (req.dvUser?.rol === 'visitante') {
            return dvErr(res, 'Necesitás una cuenta registrada para hacer esto.', 403);
        }
        next();
    }

    const ADMIN_IDS = [1]; // ruben.e.garcia@gmail.com

    function soloAdmin(req, res, next) {
        if (!ADMIN_IDS.includes(req.dvUser?.id)) {
            return dvErr(res, 'No tenés permiso para ver esto.', 403);
        }
        next();
    }

    const registrarRutasAdminMail = require('./routes_dv_admin_mail');
    registrarRutasAdminMail(app, pool, sendMail, dvAuth, soloAdmin);

    // ----------------------------------------------------------
    //  AUTENTICACIÓN DIRECTORIO VECINAL
    // ----------------------------------------------------------

    // POST /api/dv/auth/registro
    app.post('/api/dv/auth/registro', async (req, res) => {
        const { nombre, barrio, lote, whatsapp, email, password, foto = null } = req.body;

        if (!nombre?.trim()) return dvErr(res, 'El nombre es obligatorio.', 400);
        if (!barrio) return dvErr(res, 'El barrio es obligatorio.', 400);
        if (!lote?.trim()) return dvErr(res, 'El número de lote es obligatorio.', 400);
        if (!whatsapp?.trim()) return dvErr(res, 'El WhatsApp es obligatorio.', 400);
        if (!email?.trim()) return dvErr(res, 'El correo es obligatorio.', 400);
        if (!password || password.length < 8)
            return dvErr(res, 'La clave debe tener al menos 8 caracteres.', 400);

        try {
            const claveHash = await bcrypt.hash(password, SALT);
            const token = crypto.randomBytes(32).toString('hex');
            // const expira = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hs

            //     await pool.query(
            //         `INSERT INTO db_usuarios
            //    (nombre, barrio, lote, whatsapp, email, clave_hash, foto_b64,
            //     token_verificacion, token_expira_en, debe_cambiar_clave)
            //  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            //         [nombre.trim(), barrio, lote.trim(), whatsapp.trim(),
            //         email.trim().toLowerCase(), claveHash, foto, token, expira]
            //     );

            await pool.query(
                `INSERT INTO db_usuarios
                    (nombre, barrio, lote, whatsapp, email, clave_hash, foto_b64,
                        token_verificacion, token_expira_en, debe_cambiar_clave)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), 1)`,
                [nombre.trim(), barrio, lote.trim(), whatsapp.trim(),
                email.trim().toLowerCase(), claveHash, foto, token]
            );

            const link = `${APP_URL}/api/dv/auth/verificar?token=${token}`;
            await sendMail(
                email,
                'Verificá tu cuenta — Directorio Vecinal',
                '',
                `<p>Hola <strong>${nombre}</strong>,</p>
         <p>Hacé clic en el siguiente enlace para activar tu cuenta:</p>
         <p><a href="${link}" style="color:#5e7d63;font-weight:bold;">Activar mi cuenta</a></p>
         <p>El enlace expira en 24 horas.</p>
         <p style="color:#9a948a;font-size:12px;">Si no creaste esta cuenta, ignorá este correo.</p>`,
                true  // false = SMTP Ferozo, true = Gmail — igual que en tu app
            );

            dvOk(res, { mensaje: 'Cuenta creada. Revisá tu correo para activarla.' });
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY')
                return dvErr(res, 'Ya existe una cuenta con ese correo electrónico.', 409);
            dvErr(res, e.message);
        }
    });

    // PUT /api/dv/usuarios/perfil  (requiere dvAuth)
    app.put('/api/dv/usuarios/perfil', dvAuth, async (req, res) => {
        const { nombre, barrio, lote, whatsapp, foto_b64 } = req.body;
        // console.log('=== PERFIL UPDATE === foto_b64:', foto_b64 ? foto_b64.substring(0, 50) : 'NULL');

        if (!nombre?.trim()) return dvErr(res, 'El nombre es obligatorio.', 400);
        if (!['altos', 'campo'].includes(barrio)) return dvErr(res, 'Barrio inválido.', 400);
        if (!lote?.trim()) return dvErr(res, 'El lote es obligatorio.', 400);

        try {
            await pool.query(
                `UPDATE db_usuarios
             SET nombre = ?, barrio = ?, lote = ?, whatsapp = ?, foto_b64 = ?
             WHERE id = ?`,
                [nombre.trim(), barrio, lote.trim(), whatsapp || null, foto_b64 || null, req.dvUser.id]
            );


            // console.log('=== UPDATE ejecutado para id:', req.dvUser.id);

            // Devolver el usuario actualizado para refrescar sessionStorage
            const [[u]] = await pool.query(
                `SELECT id, nombre, barrio, lote, whatsapp, email
             FROM db_usuarios WHERE id = ?`,
                [req.dvUser.id]
            );

            // console.log('=== foto_b64 en BD después del UPDATE:', u.foto_b64 ? u.foto_b64.substring(0, 50) : 'NULL');

            dvOk(res, { user: u });
        } catch (e) { dvErr(res, e.message); }
    });


    // GET /api/dv/auth/verificar?token=xxx
    app.get('/api/dv/auth/verificar', async (req, res) => {
        const { token } = req.query;
        if (!token) return res.send('<p>Token inválido.</p>');

        try {
            const [rows] = await pool.query(
                `SELECT id FROM db_usuarios
         WHERE token_verificacion = ? AND token_expira_en > NOW() AND email_verificado = 0`,
                [token]
            );
            if (!rows.length)
                return res.send('<p>El enlace expiró o ya fue utilizado.</p>');

            await pool.query(
                `UPDATE db_usuarios
         SET email_verificado = 1, token_verificacion = NULL, token_expira_en = NULL
         WHERE id = ?`,
                [rows[0].id]
            );
            res.redirect('/login_dv.html?verificado=1');
        } catch (e) {
            res.send('<p>Error al verificar: ' + e.message + '</p>');
        }
    });

    // POST /api/dv/auth/login
    app.post('/api/dv/auth/login', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) return dvErr(res, 'Correo y clave son obligatorios.', 400);

        try {
            const [rows] = await pool.query(
                `SELECT id, nombre, barrio, lote, whatsapp, email, clave_hash,
                foto_b64, email_verificado, debe_cambiar_clave, activo
         FROM db_usuarios WHERE email = ? LIMIT 1`,
                [email.trim().toLowerCase()]
            );

            if (!rows.length) return dvErr(res, 'Correo o clave incorrectos.', 401);
            const u = rows[0];
            if (!u.activo) return dvErr(res, 'Tu cuenta está desactivada.', 403);
            if (!u.email_verificado) return dvErr(res, 'Primero debés verificar tu correo.', 403);

            const ok_pass = await bcrypt.compare(password, u.clave_hash);
            if (!ok_pass) return dvErr(res, 'Correo o clave incorrectos.', 401);

            await pool.query(
                'UPDATE db_usuarios SET ultimo_ingreso = NOW() WHERE id = ?', [u.id]
            );

            const token = jwt.sign(
                { id: u.id, nombre: u.nombre, barrio: u.barrio, email: u.email },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            await pool.query(
                'INSERT INTO db_log_ingresos (usuario_id, tipo) VALUES (?, ?)',
                [u.id, 'login']
            );

            dvOk(res, {
                token,
                user: {
                    id: u.id,
                    nombre: u.nombre,
                    barrio: u.barrio,
                    lote: u.lote,
                    whatsapp: u.whatsapp,
                    email: u.email,
                    foto_b64: u.foto_b64,
                    debe_cambiar_clave: u.debe_cambiar_clave === 1
                }
            });
        } catch (e) { dvErr(res, e.message); }
    });

    // POST /api/dv/auth/cambiar-clave  (requiere dvAuth)
    app.post('/api/dv/auth/cambiar-clave', dvAuth, async (req, res) => {
        const { clave_actual, clave_nueva } = req.body;
        if (!clave_actual || !clave_nueva)
            return dvErr(res, 'Ambas claves son obligatorias.', 400);
        if (clave_nueva.length < 8)
            return dvErr(res, 'La nueva clave debe tener al menos 8 caracteres.', 400);

        try {
            const [rows] = await pool.query(
                'SELECT clave_hash FROM db_usuarios WHERE id = ?', [req.dvUser.id]
            );
            if (!rows.length) return dvErr(res, 'Usuario no encontrado.', 404);

            const ok_pass = await bcrypt.compare(clave_actual, rows[0].clave_hash);
            if (!ok_pass) return dvErr(res, 'La clave actual es incorrecta.', 401);

            const nuevo_hash = await bcrypt.hash(clave_nueva, SALT);
            await pool.query(
                'UPDATE db_usuarios SET clave_hash = ?, debe_cambiar_clave = 0 WHERE id = ?',
                [nuevo_hash, req.dvUser.id]
            );
            dvOk(res, { mensaje: 'Clave actualizada.' });
        } catch (e) { dvErr(res, e.message); }
    });

    // POST /api/dv/auth/recuperar
    app.post('/api/dv/auth/recuperar', async (req, res) => {
        const { email } = req.body;
        if (!email) return dvErr(res, 'El correo es obligatorio.', 400);

        try {
            const [rows] = await pool.query(
                'SELECT id, nombre FROM db_usuarios WHERE email = ? AND activo = 1 LIMIT 1',
                [email.trim().toLowerCase()]
            );
            if (rows.length) {
                const token = crypto.randomBytes(32).toString('hex');
                await pool.query(
                    'INSERT INTO db_tokens_recuperacion (usuario_id, token, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 2 HOUR))',
                    [rows[0].id, token]
                );
                const link = `${APP_URL}/cambiar-clave.html?token=${token}`;
                await sendMail(
                    email,
                    'Recuperación de clave — Directorio Vecinal',
                    '',
                    `<p>Hola <strong>${rows[0].nombre}</strong>,</p>
           <p>Hacé clic aquí para restablecer tu clave (válido por 2 horas):</p>
           <p><a href="${link}" style="color:#5e7d63;font-weight:bold;">Restablecer clave</a></p>
           <p style="color:#9a948a;font-size:12px;">Si no solicitaste esto, ignorá este correo.</p>`,
                    true  // false = SMTP Ferozo, true = Gmail — igual que en tu app
                );
            }
            dvOk(res, { mensaje: 'Si el correo existe, recibirás un enlace.' });
        } catch (e) { dvErr(res, e.message); }
    });

    // POST /api/dv/auth/reenviar-verificacion
    app.post('/api/dv/auth/reenviar-verificacion', async (req, res) => {
        const { email } = req.body;
        if (!email) return dvErr(res, 'El correo es obligatorio.', 400);

        try {
            const [rows] = await pool.query(
                `SELECT id, nombre FROM db_usuarios
             WHERE email = ? AND activo = 1 AND email_verificado = 0 LIMIT 1`,
                [email.trim().toLowerCase()]
            );

            if (rows.length) {
                const token = crypto.randomBytes(32).toString('hex');
                await pool.query(
                    `UPDATE db_usuarios
                    SET token_verificacion = ?, token_expira_en = DATE_ADD(NOW(), INTERVAL 24 HOUR)
                    WHERE id = ?`,
                    [token, rows[0].id]
                );

                const link = `${APP_URL}/api/dv/auth/verificar?token=${token}`;
                await sendMail(
                    email,
                    'Verificá tu cuenta — Directorio Vecinal',
                    '',
                    `<p>Hola <strong>${rows[0].nombre}</strong>,</p>
                    <p>Hacé clic en el siguiente enlace para activar tu cuenta:</p>
                    <p><a href="${link}" style="color:#5e7d63;font-weight:bold;">Activar mi cuenta</a></p>
                    <p>El enlace expira en 24 horas.</p>
                    <p style="color:#9a948a;font-size:12px;">Si no creaste esta cuenta, ignorá este correo.</p>`,
                    true
                );
            }

            // Mismo mensaje exista o no la cuenta, para no filtrar qué mails están registrados
            dvOk(res, { mensaje: 'Si el correo existe y está pendiente de verificación, te reenviamos el enlace.' });
        } catch (e) { dvErr(res, e.message); }
    });

    // POST /api/dv/auth/resetear-clave
    app.post('/api/dv/auth/resetear-clave', async (req, res) => {
        const { token, clave_nueva } = req.body;
        if (!token || !clave_nueva) return dvErr(res, 'Token y clave nueva son obligatorios.', 400);
        if (clave_nueva.length < 8) return dvErr(res, 'La clave debe tener al menos 8 caracteres.', 400);

        try {
            const [rows] = await pool.query(
                `SELECT usuario_id FROM db_tokens_recuperacion
         WHERE token = ? AND expira_en > NOW() AND usado = 0`,
                [token]
            );
            if (!rows.length) return dvErr(res, 'El enlace expiró o ya fue utilizado.', 400);

            const nuevo_hash = await bcrypt.hash(clave_nueva, SALT);
            await pool.query(
                'UPDATE db_usuarios SET clave_hash = ?, debe_cambiar_clave = 0 WHERE id = ?',
                [nuevo_hash, rows[0].usuario_id]
            );
            await pool.query(
                'UPDATE db_tokens_recuperacion SET usado = 1 WHERE token = ?', [token]
            );
            dvOk(res, { mensaje: 'Clave restablecida. Ya podés ingresar.' });
        } catch (e) { dvErr(res, e.message); }
    });

    // GET /api/dv/auth/me
    app.get('/api/dv/auth/me', dvAuth, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT id, nombre, barrio, lote, whatsapp, email, foto_b64, creado_en FROM db_usuarios WHERE id = ?',
                [req.dvUser.id]
            );
            if (!rows.length) return dvErr(res, 'Usuario no encontrado.', 404);
            dvOk(res, rows[0]);
        } catch (e) { dvErr(res, e.message); }
    });


    // POST /api/dv/auth/visitante
    app.post('/api/dv/auth/visitante', async (req, res) => {
        try {
            const token = jwt.sign(
                { id: 9999, nombre: 'Visitante', barrio: 'altos', email: 'visitante@no-existe.local', rol: 'visitante' },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            await pool.query(
                'INSERT INTO db_log_ingresos (usuario_id, tipo) VALUES (?, ?)',
                [9999, 'visitante']
            );

            dvOk(res, {
                token,
                user: {
                    id: 9999,
                    nombre: 'Visitante',
                    barrio: 'altos',
                    lote: '0',
                    whatsapp: '',
                    email: 'visitante@no-existe.local',
                    foto_b64: null,
                    debe_cambiar_clave: false,
                    rol: 'visitante'
                }
            });
        } catch (e) { dvErr(res, e.message); }
    });

    // ----------------------------------------------------------
    //  RUBROS
    // ----------------------------------------------------------

    app.get('/api/dv/rubros', async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT id, nombre, icono FROM db_rubros ORDER BY nombre');
            dvOk(res, rows);
        } catch (e) { dvErr(res, e.message); }
    });

    app.post('/api/dv/rubros', async (req, res) => {
        const { nombre, icono = null } = req.body;
        if (!nombre?.trim()) return dvErr(res, 'El nombre es obligatorio.', 400);
        try {
            const [result] = await pool.query(
                'INSERT INTO db_rubros (nombre, icono) VALUES (?, ?)', [nombre.trim(), icono]
            );
            dvOk(res, { id: result.insertId, nombre: nombre.trim(), icono });
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY')
                return dvErr(res, `Ya existe un rubro llamado "${nombre}".`, 409);
            dvErr(res, e.message);
        }
    });

    // ----------------------------------------------------------
    //  PROVEEDORES
    // ----------------------------------------------------------

    app.get('/api/dv/proveedores', async (req, res) => {
        try {
            const { rubro_id, q } = req.query;
            let sql = `
                SELECT
                p.id, p.nombre, p.zona, p.telefono, p.descripcion, p.tipo, p.creado_por,
                r.id     AS rubro_id,
                r.nombre AS rubro,
                r.icono  AS rubro_icono,
                u.id     AS presentado_por_id,
                u.nombre AS presentado_por,
                u.barrio AS presentado_por_barrio,
                u.lote   AS presentado_por_lote,
                ROUND(AVG(re.calificacion), 1)  AS calificacion_promedio,
                COUNT(DISTINCT re.id)           AS total_resenas,
                COUNT(DISTINCT rc.id)           AS total_recomendaciones
                FROM db_proveedores p
                JOIN  db_rubros r               ON r.id = p.rubro_id
                LEFT JOIN db_usuarios u         ON u.id = p.creado_por
                LEFT JOIN db_resenas re         ON re.proveedor_id = p.id
                LEFT JOIN db_recomendaciones rc ON rc.proveedor_id = p.id
                WHERE 1=1
            `;
            const params = [];
            if (rubro_id) { sql += ' AND p.rubro_id = ?'; params.push(rubro_id); }
            if (q) {
                sql += ' AND (p.nombre LIKE ? OR p.zona LIKE ? OR p.descripcion LIKE ?)';
                const like = `%${q}%`;
                params.push(like, like, like);
            }
            sql += ' GROUP BY p.id, p.nombre, p.zona, p.telefono, p.descripcion, p.tipo, p.creado_por, r.id, r.nombre, r.icono, u.id, u.nombre, u.barrio, u.lote';
            sql += ' ORDER BY calificacion_promedio DESC, total_resenas DESC';

            const [rows] = await pool.query(sql, params);
            dvOk(res, rows);
        } catch (error) {
            console.error("ERROR EN /proveedores:", error);
            res.status(500).json({
                message: "Error interno",
                error: error.message
            });
        }

    });

    // POST /api/dv/proveedores  (requiere dvAuth)
    app.post('/api/dv/proveedores', dvAuth, bloquearVisitante, async (req, res) => {
        const { nombre, rubro_id, tipo = 'externo', zona = null,
            telefono = null, descripcion = null, images = [] } = req.body;

        if (!nombre?.trim()) return dvErr(res, 'El nombre es obligatorio.', 400);
        if (!rubro_id) return dvErr(res, 'El rubro es obligatorio.', 400);
        if (!['vecino', 'externo'].includes(tipo))
            return dvErr(res, 'El tipo debe ser "vecino" o "externo".', 400);

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [result] = await conn.query(
                `INSERT INTO db_proveedores (nombre, rubro_id, creado_por, tipo, zona, telefono, descripcion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [nombre.trim(), rubro_id, req.dvUser.id, tipo, zona, telefono, descripcion]
            );
            const proveedorId = result.insertId;

            if (images.length) {
                const imgRows = images.map((dataURL, i) => [
                    proveedorId, dataURL, mimeFromDataURL(dataURL), i
                ]);
                await conn.query(
                    'INSERT INTO db_proveedor_imagenes (proveedor_id, imagen_b64, mime_type, orden) VALUES ?',
                    [imgRows]
                );
            }

            await conn.commit();
            dvOk(res, { id: proveedorId });
        } catch (e) {
            await conn.rollback();
            dvErr(res, e.message);
        } finally {
            conn.release();
        }
    });

    // ----------------------------------------------------------
    //  IMÁGENES
    // ----------------------------------------------------------

    app.get('/api/dv/proveedores/:id/imagenes', async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT id, imagen_b64, mime_type, orden FROM db_proveedor_imagenes WHERE proveedor_id = ? ORDER BY orden ASC, id ASC',
                [req.params.id]
            );
            dvOk(res, rows);
        } catch (e) { dvErr(res, e.message); }
    });

    app.post('/api/dv/proveedores/:id/imagenes', dvAuth, bloquearVisitante, async (req, res) => {
        const { images = [] } = req.body;
        if (!images.length) return dvErr(res, 'No se recibieron imágenes.', 400);
        try {
            // Verificar que el proveedor existe y que el usuario es quien lo creó
            const [[proveedor]] = await pool.query(
                'SELECT creado_por FROM db_proveedores WHERE id = ?',
                [req.params.id]
            );
            if (!proveedor) return dvErr(res, 'Proveedor no encontrado.', 404);
            if (proveedor.creado_por !== req.dvUser.id)
                return dvErr(res, 'Solo el creador del proveedor puede agregar imágenes.', 403);


            const [[{ maxOrden }]] = await pool.query(
                'SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM db_proveedor_imagenes WHERE proveedor_id = ?',
                [req.params.id]
            );
            const imgRows = images.map((dataURL, i) => [
                req.params.id, dataURL, mimeFromDataURL(dataURL), maxOrden + 1 + i
            ]);
            await pool.query(
                'INSERT INTO db_proveedor_imagenes (proveedor_id, imagen_b64, mime_type, orden) VALUES ?',
                [imgRows]
            );
            dvOk(res, { agregadas: images.length });
        } catch (e) { dvErr(res, e.message); }
    });

    app.delete('/api/dv/imagenes/:id', dvAuth, async (req, res) => {
        try {
            const [result] = await pool.query(
                'DELETE FROM db_proveedor_imagenes WHERE id = ?', [req.params.id]
            );
            if (result.affectedRows === 0) return dvErr(res, 'Imagen no encontrada.', 404);
            dvOk(res, { eliminada: true });
        } catch (e) { dvErr(res, e.message); }
    });

    // ----------------------------------------------------------
    //  RESEÑAS
    // ----------------------------------------------------------

    app.get('/api/dv/proveedores/:id/resenas', async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT r.id, r.calificacion, r.comentario, r.fecha_trabajo, r.fecha_publicacion,
                u.nombre AS autor,  
                u.barrio AS autor_barrio,
                u.lote   AS autor_lote
                FROM db_resenas r
                LEFT JOIN db_usuarios u ON u.id = r.usuario_id
                WHERE r.proveedor_id = ?
                ORDER BY r.fecha_publicacion DESC`,
                [req.params.id]
            );
            dvOk(res, rows);
        } catch (e) { dvErr(res, e.message); }
    });

    app.post('/api/dv/proveedores/:id/resenas', dvAuth, bloquearVisitante, async (req, res) => {
        const { calificacion, comentario, fecha_trabajo = null } = req.body;
        if (!comentario?.trim()) return dvErr(res, 'El comentario es obligatorio.', 400);
        if (!calificacion || calificacion < 1 || calificacion > 5)
            return dvErr(res, 'La calificación debe ser entre 1 y 5.', 400);

        try {
            const [result] = await pool.query(
                `INSERT INTO db_resenas
           (proveedor_id, usuario_id, calificacion, comentario, fecha_trabajo, fecha_publicacion)
         VALUES (?, ?, ?, ?, ?, CURRENT_DATE)`,
                [req.params.id, req.dvUser.id, calificacion, comentario.trim(), fecha_trabajo || null]
            );
            dvOk(res, { id: result.insertId });
        } catch (e) { dvErr(res, e.message); }
    });

    // ----------------------------------------------------------
    //  RECOMENDACIONES
    // ----------------------------------------------------------

    app.post('/api/dv/proveedores/:id/recomendar', dvAuth, bloquearVisitante, async (req, res) => {
        try {
            await pool.query(
                'INSERT INTO db_recomendaciones (proveedor_id, usuario_id) VALUES (?, ?)',
                [req.params.id, req.dvUser.id]
            );
            dvOk(res, { recomendado: true });
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY')
                return dvErr(res, 'Ya recomendaste este proveedor.', 409);
            dvErr(res, e.message);
        }
    });

    // ----------------------------------------------------------
    //  RESTADISTICAS
    // ---------------------------------------------------

    // GET /api/dv/admin/stats?desde=2026-06-01&hasta=2026-06-30
    app.get('/api/dv/admin/stats', dvAuth, soloAdmin, async (req, res) => {
        try {
            const { desde, hasta } = req.query;
            if (!desde || !hasta) return dvErr(res, 'Especificá un rango de fechas.', 400);

            const hastaFin = hasta + ' 23:59:59';

            const [[logins]] = await pool.query(
                `SELECT COUNT(*) AS total FROM db_log_ingresos
             WHERE tipo = 'login' AND fecha BETWEEN ? AND ?`,
                [desde, hastaFin]
            );

            const [[visitantes]] = await pool.query(
                `SELECT COUNT(*) AS total FROM db_log_ingresos
             WHERE tipo = 'visitante' AND fecha BETWEEN ? AND ?`,
                [desde, hastaFin]
            );

            const [[proveedores]] = await pool.query(
                `SELECT COUNT(*) AS total FROM db_proveedores
             WHERE creado_en  BETWEEN ? AND ?`,
                [desde, hastaFin]
            );

            const [[resenas]] = await pool.query(
                `SELECT COUNT(*) AS total FROM db_resenas
             WHERE fecha_publicacion BETWEEN ? AND ?`,
                [desde, hastaFin]
            );

            const [[registros]] = await pool.query(
                `SELECT COUNT(*) AS total FROM db_usuarios
             WHERE creado_en BETWEEN ? AND ?`,
                [desde, hastaFin]
            );

            dvOk(res, {
                logins: logins.total,
                visitantes: visitantes.total,
                proveedores_nuevos: proveedores.total,
                resenas_nuevas: resenas.total,
                usuarios_registrados: registros.total
            });
        } catch (e) { dvErr(res, e.message); }
    });


    // ----------------------------------------------------------
    //  //    1. Endpoint para el landing (público, solo fotos)
    // ---------------------------------------------------

    // GET /api/dv/landing/fotos-recientes  (sin dvAuth, es público)
    // GET /api/dv/landing/fotos-recientes  (sin dvAuth, es público)
    app.get('/api/dv/landing/fotos-recientes', async (req, res) => {
        try {
            const [rows] = await pool.query(`
            SELECT 
                pi.id,
                pi.imagen_b64,
                p.id AS proveedor_id,
                p.nombre AS proveedor_nombre,
                p.descripcion,
                p.zona,
                rb.nombre AS categoria
            FROM db_proveedor_imagenes pi
            JOIN db_proveedores p ON p.id = pi.proveedor_id
            JOIN db_rubros rb ON rb.id = p.rubro_id
            ORDER BY pi.subida_en DESC
            LIMIT 12
        `);

            const items = rows.map(r => ({
                id: r.id,
                imagenUrl: r.imagen_b64,
                proveedor: r.proveedor_nombre,
                categoria: r.categoria,
                zona: r.zona,
                descripcion: r.descripcion
            }));

            dvOk(res, items);
        } catch (err) {
            dvErr(res, err);
        }
    });
    // ----------------------------------------------------------
    //  //        2. Endpoint para post-login (fotos + comentarios mezclados)
    // ---------------------------------------------------
    // GET /api/dv/actividad-reciente  (protegido con dvAuth)
    app.get('/api/dv/actividad-reciente', dvAuth, async (req, res) => {
        try {
            const [rows] = await pool.query(`
      (SELECT 
        'foto' AS tipo,
        pi.id AS item_id,
        NULL AS texto,
        pi.imagen_b64,
        pi.mime_type,
        p.id AS proveedor_id,
        p.nombre AS proveedor_nombre,
        rb.nombre AS categoria,
        pi.subida_en AS fecha
      FROM db_proveedor_imagenes pi
      JOIN db_proveedores p ON p.id = pi.proveedor_id
      JOIN db_rubros rb ON rb.id = p.rubro_id
      ORDER BY pi.subida_en DESC
      LIMIT 10)

      UNION ALL

      (SELECT 
        'comentario' AS tipo,
        res.id AS item_id,
        res.comentario AS texto,
        NULL AS imagen_b64,
        NULL AS mime_type,
        p.id AS proveedor_id,
        p.nombre AS proveedor_nombre,
        rb.nombre AS categoria,
        res.fecha_publicacion AS fecha
      FROM db_resenas res
      JOIN db_proveedores p ON p.id = res.proveedor_id
      JOIN db_rubros rb ON rb.id = p.rubro_id
      ORDER BY res.fecha_publicacion DESC
      LIMIT 10)

      ORDER BY fecha DESC
      LIMIT 15
    `);

            const items = rows.map(r => ({
                tipo: r.tipo,
                texto: r.texto,
                imagenUrl: r.imagen_b64 || null,  // <-- ya viene completo, sin agregar prefij
                proveedor: r.proveedor_nombre,
                proveedorId: r.proveedor_id,
                categoria: r.categoria,
                fecha: r.fecha
            }));

            dvOk(res, items);
        } catch (err) {
            dvErr(res, err);
        }
    });

}; 