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

    // Nuevo middleware
    function esAutorOAdmin(getPropietarioId) {
        return async (req, res, next) => {
            try {
                const propietarioId = await getPropietarioId(req);
                if (propietarioId === null) {
                    return res.status(404).json({ error: 'Recurso no encontrado.' });
                }
                const esAdmin = req.dvUser?.id === 1;
                const esAutor = req.dvUser?.id === propietarioId;
                if (!esAdmin && !esAutor) {
                    return res.status(403).json({ error: 'No tenés permiso para modificar este recurso.' });
                }
                next();
            } catch (e) {
                console.error('ERROR en esAutorOAdmin:', e);
                res.status(500).json({ error: 'Error verificando permisos.' });
            }
        };
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

            // await pool.query(
            //     'INSERT INTO db_log_ingresos (usuario_id, tipo) VALUES (?, ?)',
            //     [u.id, 'login']
            // );

            const id_admin = 1
            const esAdmin = u.id === id_admin;

            if (!esAdmin) {

                const { visitor_uuid } = req.body; // 👈 nuevo, viene del frontend

                await pool.query(
                    `INSERT INTO db_log_ingresos (usuario_id, tipo, visitor_uuid, fecha) 
                     VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL -3 HOUR))`,
                    [u.id, u.nombre, visitor_uuid || null]
                );

                notificarIngresoAdmin({
                    tipo: 'usuario',
                    nombre: u.nombre,
                    email: u.email,
                    ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip,
                    userAgent: req.headers['user-agent'],
                    visitorUuid: visitor_uuid, // 👈 si querés que también salga en el mail
                });
            }

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

            const { visitor_uuid } = req.body; // 👈 viene del frontend

            const token = jwt.sign(
                { id: 9999, nombre: 'Visitante', barrio: 'altos', email: 'visitante@no-existe.local', rol: 'visitante' },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            await pool.query(
                `INSERT INTO db_log_ingresos (usuario_id, tipo, visitor_uuid, fecha) 
                VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL -3 HOUR))`,
                [9999, 'visitante', visitor_uuid || null]
            );

            notificarIngresoAdmin({
                tipo: 'visitante',
                ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip,
                userAgent: req.headers['user-agent'],
                visitorUuid: visitor_uuid, // 👈 se lo pasás al helper
            });

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
            p.sitio_web, p.instagram,
            p.autenticado,
            COALESCE(u.nombre, p.invitado_nombre, 'Usuario no autenticado') AS presentado_por,
            COALESCE(u.barrio, p.invitado_barrio_lote) AS presentado_por_barrio,
            u.lote   AS presentado_por_lote,
            r.id     AS rubro_id,
            r.nombre AS rubro,
            r.icono  AS rubro_icono,
            u.id     AS presentado_por_id,
            primera_img.img_id AS primera_imagen_id,
            COALESCE(stats.calificacion_promedio, 0) AS calificacion_promedio,
            COALESCE(stats.total_resenas, 0)         AS total_resenas,
            COALESCE(recom.total_recomendaciones, 0) AS total_recomendaciones
            FROM db_proveedores p
            JOIN  db_rubros r               ON r.id = p.rubro_id
            LEFT JOIN db_usuarios u         ON u.id = p.creado_por
            LEFT JOIN (
                SELECT proveedor_id,
                       ROUND(AVG(calificacion), 1) AS calificacion_promedio,
                       COUNT(*) AS total_resenas
                FROM db_resenas
                WHERE activo = 1
                GROUP BY proveedor_id
            ) stats ON stats.proveedor_id = p.id
            LEFT JOIN (
                SELECT proveedor_id, COUNT(*) AS total_recomendaciones
                FROM db_recomendaciones
                GROUP BY proveedor_id
            ) recom ON recom.proveedor_id = p.id
            LEFT JOIN (
                SELECT pi1.proveedor_id, pi1.id AS img_id
                FROM db_proveedor_imagenes pi1
                INNER JOIN (
                    SELECT proveedor_id, MIN(orden) AS min_orden
                    FROM db_proveedor_imagenes
                    GROUP BY proveedor_id
                ) pi2 ON pi1.proveedor_id = pi2.proveedor_id AND pi1.orden = pi2.min_orden
            ) primera_img ON primera_img.proveedor_id = p.id
            WHERE p.activo = 1
        `;
            const params = [];
            if (rubro_id) { sql += ' AND p.rubro_id = ?'; params.push(rubro_id); }
            if (q) {
                sql += ' AND (p.nombre LIKE ? OR p.zona LIKE ? OR p.descripcion LIKE ?)';
                const like = `%${q}%`;
                params.push(like, like, like);
            }
            sql += ' ORDER BY calificacion_promedio DESC, total_resenas DESC';

            const [rows] = await pool.query(sql, params);

            const items = rows.map(r => ({
                ...r,
                primera_imagen: r.primera_imagen_id
                    ? `${req.protocol}://${req.get('host')}/api/dv/imagen/${r.primera_imagen_id}`
                    : null
            }));

            dvOk(res, items);
        } catch (error) {
            console.error("ERROR EN /proveedores:", error);
            res.status(500).json({
                message: "Error interno",
                error: error.message
            });
        }
    });


    // POST /api/dv/proveedores  (requiere dvAuth)
    app.post('/api/dv/proveedores-anterior-no-sirve', dvAuth, bloquearVisitante, async (req, res) => {
        const { nombre, rubro_id, tipo = 'externo', zona = null,
            telefono = null, descripcion = null, images = [] } = req.body;

        if (!nombre?.trim()) return dvErr(res, 'El nombre es obligatorio.', 400);
        if (!rubro_id) return dvErr(res, 'El rubro es obligatorio.', 400);
        if (!['vecino', 'externo'].includes(tipo))
            return dvErr(res, 'El tipo debe ser "vecino" o "externo".', 400);

        const sitio_web = limpiarSitioWeb(req.body.sitio_web);
        const instagram = limpiarInstagram(req.body.instagram);

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [result] = await conn.query(
                `INSERT INTO db_proveedores (nombre, rubro_id, creado_por, tipo, zona, telefono, descripcion, sitio_web, instagram)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [nombre.trim(), rubro_id, req.dvUser.id, tipo, zona, telefono, descripcion, sitio_web, instagram]
            );
            const proveedorId = result.insertId;

            if (images.length) {
                const imagesComprimidas = await Promise.all(images.map(comprimirImagen));

                const imgRows = imagesComprimidas.map((dataURL, i) => [
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

    app.post('/api/dv/proveedores', async (req, res) => {
        const { nombre, rubro_id, tipo = 'externo', zona = null,
            telefono = null, descripcion = null, images = [],
            invitado_nombre, invitado_barrio_lote } = req.body;

        if (!nombre?.trim()) return dvErr(res, 'El nombre es obligatorio.', 400);
        if (!rubro_id) return dvErr(res, 'El rubro es obligatorio.', 400);
        if (!['vecino', 'externo'].includes(tipo))
            return dvErr(res, 'El tipo debe ser "vecino" o "externo".', 400);

        const sitio_web = limpiarSitioWeb(req.body.sitio_web);
        const instagram = limpiarInstagram(req.body.instagram);

        // Resolver usuario desde el JWT si vino, sin exigirlo
        let usuarioId = null;
        let autenticado = 0;
        let nombreInvitado = (invitado_nombre || '').trim() || null;
        let barrioLoteInvitado = (invitado_barrio_lote || '').trim() || null;

        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const payload = jwt.verify(token, process.env.JWT_SECRET);
                if (payload.id && payload.id !== 9999) {
                    usuarioId = payload.id;
                    autenticado = 1;
                    nombreInvitado = null;
                    barrioLoteInvitado = null;
                }
            } catch (e) {
                // Sesión vencida o token corrupto: cortamos, igual que en reseñas
                return dvErr(res, 'SESION_VENCIDA', 401);
            }
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // const [result] = await conn.query(
            //     `INSERT INTO db_proveedores
            //    (nombre, rubro_id, creado_por, autenticado, invitado_nombre, invitado_barrio_lote,
            //     tipo, zona, telefono, descripcion, sitio_web, instagram)
            //  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            //     [nombre.trim(), rubro_id, usuarioId, autenticado, nombreInvitado, barrioLoteInvitado,
            //         tipo, zona, telefono, descripcion, sitio_web, instagram]
            // );

            const [result] = await conn.query(
                `INSERT INTO db_proveedores
                (nombre, rubro_id, creado_por, autenticado, invitado_nombre, invitado_barrio_lote,
                    tipo, zona, telefono, descripcion, sitio_web, instagram, creado_en)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL -3 HOUR))`,
                [nombre.trim(), rubro_id, usuarioId, autenticado, nombreInvitado, barrioLoteInvitado,
                    tipo, zona, telefono, descripcion, sitio_web, instagram]
            );

            const proveedorId = result.insertId;

            if (images.length) {
                const imagesComprimidas = await Promise.all(images.map(comprimirImagen));

                const imgRows = imagesComprimidas.map((dataURL, i) => [
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



    function limpiarInstagram(valor) {
        if (!valor) return null;
        return valor
            .trim()
            .replace(/^@/, '')                          // saca @ si lo pusieron
            .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '') // saca URL si pegaron el link completo
            .replace(/\/$/, '')                          // saca barra final
            .split('/')[0];                              // por si quedó algo después del usuario
    }

    function limpiarSitioWeb(valor) {
        if (!valor) return null;
        let url = valor.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = `https://${url}`;
        }
        return url;
    }

    // Traer el propietario de un proveedor
    async function getPropietarioProveedor(req) {
        const [[row]] = await pool.query(
            'SELECT creado_por FROM db_proveedores WHERE id = ? AND activo = 1',
            [req.params.id]
        );
        return row ? row.creado_por : null;
    }

    app.put('/api/dv/proveedores/:id', dvAuth, bloquearVisitante, esAutorOAdmin(getPropietarioProveedor), async (req, res) => {
        const { nombre, rubro_id, tipo, zona = null, telefono = null, descripcion = null } = req.body;

        if (!nombre?.trim()) return dvErr(res, 'El nombre es obligatorio.', 400);
        if (!rubro_id) return dvErr(res, 'El rubro es obligatorio.', 400);
        if (tipo && !['vecino', 'externo'].includes(tipo))
            return dvErr(res, 'El tipo debe ser "vecino" o "externo".', 400);

        const sitio_web = limpiarSitioWeb(req.body.sitio_web);
        const instagram = limpiarInstagram(req.body.instagram);

        try {
            await pool.query(
                `UPDATE db_proveedores
             SET nombre = ?, rubro_id = ?, tipo = ?, zona = ?, telefono = ?, descripcion = ?, sitio_web = ?, instagram = ?
             WHERE id = ?`,
                [nombre.trim(), rubro_id, tipo || 'externo', zona, telefono, descripcion, sitio_web, instagram, req.params.id]
            );
            dvOk(res, { mensaje: 'Proveedor actualizado.' });
        } catch (e) {
            dvErr(res, e.message);
        }
    });

    app.delete('/api/dv/proveedores/:id', dvAuth, bloquearVisitante, esAutorOAdmin(getPropietarioProveedor), async (req, res) => {
        try {
            await pool.query(
                'UPDATE db_proveedores SET activo = 0, fecha_baja = NOW() WHERE id = ?',
                [req.params.id]
            );
            dvOk(res, { mensaje: 'Proveedor dado de baja.' });
        } catch (e) {
            dvErr(res, e.message);
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


    const sharp = require('sharp');

    async function comprimirImagen(dataURL) {
        const matches = dataURL.match(/^data:(image\/\w+);base64,(.+)$/);
        const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(dataURL, 'base64');

        const comprimido = await sharp(buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toBuffer();

        return `data:image/jpeg;base64,${comprimido.toString('base64')}`;
    }


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
            if (proveedor.creado_por !== req.dvUser.id && req.dvUser.id !== 1)
                return dvErr(res, 'Solo el creador del proveedor puede agregar imágenes.', 403);


            const [[{ maxOrden }]] = await pool.query(
                'SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM db_proveedor_imagenes WHERE proveedor_id = ?',
                [req.params.id]
            );
            const imagesComprimidas = await Promise.all(images.map(comprimirImagen));

            const imgRows = imagesComprimidas.map((dataURL, i) => [
                req.params.id, dataURL, mimeFromDataURL(dataURL), maxOrden + 1 + i
            ]);
            await pool.query(
                'INSERT INTO db_proveedor_imagenes (proveedor_id, imagen_b64, mime_type, orden) VALUES ?',
                [imgRows]
            );
            dvOk(res, { agregadas: images.length });
        } catch (e) { dvErr(res, e.message); }
    });

    async function getPropietarioImagen(req) {
        const [[row]] = await pool.query(
            `SELECT p.creado_por
     FROM db_proveedor_imagenes i
     JOIN db_proveedores p ON p.id = i.proveedor_id
     WHERE i.id = ?`,
            [req.params.id]
        );
        return row ? row.creado_por : null;
    }

    app.delete('/api/dv/imagenes/:id', dvAuth, esAutorOAdmin(getPropietarioImagen), async (req, res) => {
        try {
            const [result] = await pool.query(
                'DELETE FROM db_proveedor_imagenes WHERE id = ?', [req.params.id]
            );
            if (result.affectedRows === 0) return dvErr(res, 'Imagen no encontrada.', 404);
            dvOk(res, { eliminada: true });
        } catch (e) { dvErr(res, e.message); }
    });


    // GET binario de una imagen puntual, cacheable por el navegador/CDN
    app.get('/api/dv/imagen/:id', async (req, res) => {
        try {
            const [[row]] = await pool.query(
                'SELECT imagen_b64 FROM db_proveedor_imagenes WHERE id = ?',
                [req.params.id]
            );
            if (!row) return res.status(404).end();

            const matches = row.imagen_b64.match(/^data:([\w\/\-\.]+);base64,(.+)$/);
            let mime = matches ? matches[1] : 'image/jpeg';
            const b64 = matches ? matches[2] : row.imagen_b64;

            // Si el mime guardado es genérico, forzamos a jpeg (los bytes son una imagen real)
            if (mime === 'application/octet-stream') mime = 'image/jpeg';

            res.set('Content-Type', mime);
            res.set('Cache-Control', 'public, max-age=604800, immutable');
            res.send(Buffer.from(b64, 'base64'));
        } catch (err) {
            dvErr(res, err);
        }
    });
    // ----------------------------------------------------------
    //  RESEÑAS
    // ----------------------------------------------------------

    app.get('/api/dv/proveedores/:id/resenas', async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT r.id, r.usuario_id, r.calificacion, r.comentario, r.fecha_trabajo, r.fecha_publicacion,
        r.autenticado,
        COALESCE(u.nombre, r.invitado_nombre, 'Usuario no autenticado') AS autor,
        COALESCE(u.barrio, r.invitado_barrio_lote) AS autor_barrio,
        u.lote AS autor_lote
        FROM db_resenas r
        LEFT JOIN db_usuarios u ON u.id = r.usuario_id
        WHERE r.proveedor_id = ? AND r.activo = 1
        ORDER BY r.fecha_publicacion DESC`,
                [req.params.id]
            );
            dvOk(res, rows);
        } catch (e) { dvErr(res, e.message); }
    });



    app.post('/api/dv/proveedores/:id/resenas', async (req, res) => {
        const { calificacion, comentario, fecha_trabajo = null, invitado_nombre, invitado_barrio_lote } = req.body;
        if (!comentario?.trim()) return dvErr(res, 'El comentario es obligatorio.', 400);
        if (!calificacion || calificacion < 1 || calificacion > 5)
            return dvErr(res, 'La calificación debe ser entre 1 y 5.', 400);

        let usuarioId = null;
        let autenticado = 0;
        let nombreInvitado = (invitado_nombre || '').trim() || null;
        let barrioLoteInvitado = (invitado_barrio_lote || '').trim() || null;

        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const payload = jwt.verify(token, process.env.JWT_SECRET);
                if (payload.id && payload.id !== 9999) {
                    usuarioId = payload.id;
                    autenticado = 1;
                    nombreInvitado = null;
                    barrioLoteInvitado = null;
                }
            } catch (e) {
                // Sesión vencida o token corrupto: NO lo degradamos en silencio a invitado.
                // Cortamos acá para que el frontend limpie la sesión y le avise al usuario.
                return dvErr(res, 'SESION_VENCIDA', 401);
            }
        }

        try {
            const [result] = await pool.query(
                `INSERT INTO db_resenas
               (proveedor_id, usuario_id, autenticado, invitado_nombre, invitado_barrio_lote,
                calificacion, comentario, fecha_trabajo, fecha_publicacion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE)`,
                [req.params.id, usuarioId, autenticado, nombreInvitado, barrioLoteInvitado,
                    calificacion, comentario.trim(), fecha_trabajo || null]
            );
            dvOk(res, { id: result.insertId });
        } catch (e) { dvErr(res, e.message); }
    });

    async function getPropietarioResena(req) {
        const [[row]] = await pool.query(
            'SELECT usuario_id FROM db_resenas WHERE id = ? AND activo = 1',
            [req.params.id]
        );
        return row ? row.usuario_id : null;
    }

    app.put('/api/dv/resenas/:id', dvAuth, bloquearVisitante, esAutorOAdmin(getPropietarioResena), async (req, res) => {
        try {
            const { calificacion, comentario, fecha_trabajo } = req.body;
            await pool.query(
                `UPDATE db_resenas
       SET calificacion = ?, comentario = ?, fecha_trabajo = ?
       WHERE id = ?`,
                [calificacion, comentario, fecha_trabajo, req.params.id]
            );
            dvOk(res, { mensaje: 'Reseña actualizada.' });
        } catch (error) {
            console.error('ERROR EN PUT /resenas/:id:', error);
            res.status(500).json({ message: 'Error interno', error: error.message });
        }
    });

    app.delete('/api/dv/resenas/:id', dvAuth, bloquearVisitante, esAutorOAdmin(getPropietarioResena), async (req, res) => {
        try {
            await pool.query(
                'UPDATE db_resenas SET activo = 0, fecha_baja = NOW() WHERE id = ?',
                [req.params.id]
            );
            dvOk(res, { mensaje: 'Reseña dada de baja.' });
        } catch (error) {
            console.error('ERROR EN DELETE /resenas/:id:', error);
            res.status(500).json({ message: 'Error interno', error: error.message });
        }
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
             WHERE tipo != 'visitante' AND fecha BETWEEN ? AND ? AND usuario_id != 1`,
                [desde, hastaFin]
            );

            const [[visitantes]] = await pool.query(
                `SELECT COUNT(*) AS total FROM db_log_ingresos
             WHERE tipo = 'visitante' AND fecha BETWEEN ? AND ? AND usuario_id != 1`,
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
    //  Solicitud de nuevo rubro (envía mail a admin) - solo usuarios registrados
    // ----------------------------------------------------------

    app.post('/api/dv/rubros/solicitar', dvAuth, bloquearVisitante, async (req, res) => {
        const { rubro_sugerido, descripcion } = req.body;

        if (!rubro_sugerido || !descripcion) {
            return dvErr(res, 'Faltan datos: rubro sugerido y descripción son obligatorios.');
        }

        try {
            const subject = `EntreVecinos — Solicitud de nuevo rubro: ${rubro_sugerido}`;
            const text = `Nueva solicitud de rubro\n\nUsuario: ${req.dvUser.nombre} (${req.dvUser.email || 'sin email'})\nRubro sugerido: ${rubro_sugerido}\nDescripción: ${descripcion}`;
            const html = `
            <h3>Nueva solicitud de rubro</h3>
            <p><strong>Usuario:</strong> ${req.dvUser.nombre} (${req.dvUser.email || 'sin email'})</p>
            <p><strong>Rubro sugerido:</strong> ${rubro_sugerido}</p>
            <p><strong>Descripción:</strong> ${descripcion}</p>
        `;

            await sendMail('ruben.e.garcia@gmail.com', subject, text, html);

            return dvOk(res, { mensaje: 'Solicitud enviada correctamente' });
        } catch (err) {
            console.error('Error enviando solicitud de rubro:', err);
            return dvErr(res, 'No se pudo enviar la solicitud, intentá más tarde.');
        }
    });

    // ----------------------------------------------------------
    //  Notificación de ingreso de usuario o visitante (envía mail a admin) - solo usuarios registrados
    // ----------------------------------------------------------

    function notificarIngresoAdmin({ tipo, nombre, email, ip, userAgent, visitorUuid }) {
        const fechaHora = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

        const asunto = tipo === 'visitante'
            ? `Ingreso de visitante - ${fechaHora}`
            : `Ingreso de usuario - ${nombre}`;

        const cuerpo = tipo === 'visitante'
            ? `
          <p><b>Tipo:</b> Visitante (sin registro)</p>
          <p><b>Fecha y hora:</b> ${fechaHora}</p>
          <p><b>IP:</b> ${ip || 'desconocida'}</p>
          <p><b>User-Agent:</b> ${userAgent || 'desconocido'}</p>
          <p><b>ID de visitante (uuid):</b> ${visitorUuid || 'no disponible'}</p>
        `
            : `
          <p><b>Tipo:</b> Usuario registrado</p>
          <p><b>Nombre:</b> ${nombre}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Fecha y hora:</b> ${fechaHora}</p>
          <p><b>IP:</b> ${ip || 'desconocida'}</p>
        `;

        // 👇 ahora en el orden que tu sendMail real espera: to, subject, text, html
        sendMail('ruben.e.garcia@gmail.com', asunto, '', cuerpo)
            .catch(err => console.error('Error enviando notificación de ingreso:', err));
    }


    // ----------------------------------------------------------
    //  //    1. Endpoint para el landing (público, solo fotos)
    // ---------------------------------------------------

    // GET /api/dv/landing/fotos-recientes  (sin dvAuth, es público)
    // GET /api/dv/landing/fotos-recientes  (sin dvAuth, es público)

    app.get('/api/dv/landing/fotos-recientes', async (req, res) => {
        try {
            const LIMIT = 15;
            const HORAS_RECIENTE = 48;

            const [rows] = await pool.query(`
            SELECT * FROM (
                SELECT 
                    pi.id,
                    p.id AS proveedor_id,
                    p.nombre AS proveedor_nombre,
                    p.descripcion,
                    p.zona,
                    p.tipo,
                    rb.nombre AS categoria,
                    pi.subida_en,
                    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY pi.subida_en DESC) AS rn
                FROM db_proveedor_imagenes pi
                JOIN db_proveedores p ON p.id = pi.proveedor_id
                JOIN db_rubros rb ON rb.id = p.rubro_id
                where p.creado_por != 1
            ) AS sub
            WHERE sub.rn = 1
        `);

            const corteMs = HORAS_RECIENTE * 60 * 60 * 1000;
            const ahora = Date.now();

            const recientes = [];
            const vecinos = [];

            for (const r of rows) {
                const edadMs = ahora - new Date(r.subida_en).getTime();
                if (edadMs <= corteMs) {
                    recientes.push(r);
                } else if (r.tipo === 'vecino') {
                    vecinos.push(r);
                }
            }

            recientes.sort((a, b) => new Date(b.subida_en) - new Date(a.subida_en));

            const shuffle = (arr) => {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                return arr;
            };
            shuffle(vecinos);

            const seleccion = [...recientes, ...vecinos].slice(0, LIMIT);

            const items = seleccion.map(r => ({
                id: r.id,
                imagenUrl: `${req.protocol}://${req.get('host')}/api/dv/imagen/${r.id}`,
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
    






    app.get('/api/dv/landing/fotos-recientes-CAMBIADO', async (req, res) => {
        try {
            const [rows] = await pool.query(`
            SELECT * FROM (
                SELECT 
                    pi.id,
                    p.id AS proveedor_id,
                    p.nombre AS proveedor_nombre,
                    p.descripcion,
                    p.zona,
                    rb.nombre AS categoria,
                    pi.subida_en,
                    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY pi.subida_en DESC) AS rn
                FROM db_proveedor_imagenes pi
                JOIN db_proveedores p ON p.id = pi.proveedor_id
                JOIN db_rubros rb ON rb.id = p.rubro_id
            ) AS sub
            WHERE sub.rn <= 2
            ORDER BY subida_en DESC
            LIMIT 10
        `);

            const items = rows.map(r => ({
                id: r.id,
                imagenUrl: `${req.protocol}://${req.get('host')}/api/dv/imagen/${r.id}`,
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


    app.get('/api/dv/landing/fotos-recientes-antes', async (req, res) => {
        try {
            const [rows] = await pool.query(`
            SELECT 
                pi.id,
                p.id AS proveedor_id,
                p.nombre AS proveedor_nombre,
                p.descripcion,
                p.zona,
                rb.nombre AS categoria
            FROM db_proveedor_imagenes pi
            JOIN db_proveedores p ON p.id = pi.proveedor_id
            JOIN db_rubros rb ON rb.id = p.rubro_id
            ORDER BY pi.subida_en DESC
            LIMIT 10
        `);

            const items = rows.map(r => ({
                id: r.id,
                imagenUrl: `${req.protocol}://${req.get('host')}/api/dv/imagen/${r.id}`,
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
            SELECT * FROM (
                SELECT 
                    sub.*,
                    ROW_NUMBER() OVER (PARTITION BY sub.proveedor_id ORDER BY sub.fecha DESC) AS rn
                FROM (
                    (SELECT 
                        'foto' AS tipo,
                        pi.id AS item_id,
                        NULL AS texto,
                        pi.mime_type,
                        p.id AS proveedor_id,
                        p.nombre AS proveedor_nombre,
                        rb.nombre AS categoria,
                        pi.subida_en AS fecha
                    FROM db_proveedor_imagenes pi
                    JOIN db_proveedores p ON p.id = pi.proveedor_id
                    JOIN db_rubros rb ON rb.id = p.rubro_id
                    ORDER BY pi.subida_en DESC
                    LIMIT 20)

                    UNION ALL

                    (SELECT 
                        'comentario' AS tipo,
                        res.id AS item_id,
                        res.comentario AS texto,
                        NULL AS mime_type,
                        p.id AS proveedor_id,
                        p.nombre AS proveedor_nombre,
                        rb.nombre AS categoria,
                        res.fecha_publicacion AS fecha
                    FROM db_resenas res
                    JOIN db_proveedores p ON p.id = res.proveedor_id
                    JOIN db_rubros rb ON rb.id = p.rubro_id
                    ORDER BY res.fecha_publicacion DESC
                    LIMIT 20)
                ) AS sub
            ) AS ranked
            WHERE ranked.rn = 1
            ORDER BY ranked.fecha DESC
            LIMIT 20
        `);

            const items = rows.map(r => ({
                tipo: r.tipo,
                texto: r.texto,
                imagenUrl: r.tipo === 'foto'
                    ? `${req.protocol}://${req.get('host')}/api/dv/imagen/${r.item_id}`
                    : null,
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


    app.get('/api/dv/actividad-reciente-antes', dvAuth, async (req, res) => {
        try {
            const [rows] = await pool.query(`
      (SELECT 
        'foto' AS tipo,
        pi.id AS item_id,
        NULL AS texto,
        pi.mime_type,
        p.id AS proveedor_id,
        p.nombre AS proveedor_nombre,
        rb.nombre AS categoria,
        pi.subida_en AS fecha
      FROM db_proveedor_imagenes pi
      JOIN db_proveedores p ON p.id = pi.proveedor_id
      JOIN db_rubros rb ON rb.id = p.rubro_id
      ORDER BY pi.subida_en DESC
      LIMIT 6)

      UNION ALL

      (SELECT 
        'comentario' AS tipo,
        res.id AS item_id,
        res.comentario AS texto,
        NULL AS mime_type,
        p.id AS proveedor_id,
        p.nombre AS proveedor_nombre,
        rb.nombre AS categoria,
        res.fecha_publicacion AS fecha
      FROM db_resenas res
      JOIN db_proveedores p ON p.id = res.proveedor_id
      JOIN db_rubros rb ON rb.id = p.rubro_id
      ORDER BY res.fecha_publicacion DESC
      LIMIT 6)

      ORDER BY fecha DESC
      LIMIT 6
    `);

            const items = rows.map(r => ({
                tipo: r.tipo,
                texto: r.texto,
                imagenUrl: r.tipo === 'foto'
                    ? `${req.protocol}://${req.get('host')}/api/dv/imagen/${r.item_id}`
                    : null,
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

    // ----------------------------------------------------------
    //  Mostrar provedores y comentarios  de cadad usuario// 
    // ----------------------------------------------------------

    // GET /api/dv/mis-proveedores
    app.get('/api/dv/mis-proveedores', dvAuth, async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT p.*, r.nombre AS rubro
                FROM db_proveedores p
                LEFT JOIN db_rubros r ON r.id = p.rubro_id
                WHERE p.creado_por = ? AND p.activo = 1
                ORDER BY p.id DESC`,
                [req.dvUser.id]
            );
            return dvOk(res, rows);
        } catch (err) {
            console.error('>>> ERROR mis-proveedores:', err);
            return dvErr(res, err.message);
        }
    });

    // GET /api/dv/mis-comentarios
    app.get('/api/dv/mis-comentarios', dvAuth, async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT r.id, r.calificacion, r.comentario, r.fecha_trabajo, r.fecha_publicacion,
                    p.id AS proveedor_id, p.nombre AS proveedor_nombre,
                    ru.nombre AS rubro_nombre
            FROM db_resenas r
            JOIN db_proveedores p ON p.id = r.proveedor_id
            LEFT JOIN db_rubros ru ON ru.id = p.rubro_id
            WHERE r.usuario_id = ? AND r.activo = 1
            ORDER BY r.fecha_publicacion DESC`,
                [req.dvUser.id]
            );
            return dvOk(res, rows);
        } catch (err) {
            console.error('>>> ERROR mis-comentarios:', err);
            return dvErr(res, err.message);
        }
    });

    // Sugerencias, comentarios, quejas....()

    app.post('/api/dv/feedback', async (req, res) => {
        try {
            const { tipo, mensaje, nombre } = req.body;

            if (!['consulta', 'sugerencia', 'propuesta', 'queja'].includes(tipo)) {
                return dvErr(res, 'Tipo inválido');
            }
            if (!mensaje || !mensaje.trim()) {
                return dvErr(res, 'El mensaje no puede estar vacío');
            }

            let usuarioId = null;
            let nombreFinal = (nombre || '').trim();

            const authHeader = req.headers.authorization;
            if (authHeader) {
                try {
                    const token = authHeader.split(' ')[1];
                    const payload = jwt.verify(token, process.env.JWT_SECRET);
                    if (payload.id && payload.id !== 9999) {
                        usuarioId = payload.id;
                        nombreFinal = payload.nombre;
                    }
                } catch (_) { }
            }

            if (!nombreFinal) {
                return dvErr(res, 'Falta el nombre');
            }

            await pool.query(
                `INSERT INTO db_feedback (usuario_id, nombre, tipo, mensaje, fecha_creacion, activo)
       VALUES (?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL -3 HOUR), 1)`,
                [usuarioId, nombreFinal, tipo, mensaje.trim()]
            );

            // Notificación por mail — fire-and-forget, no bloquea la respuesta
            const TIPO_LABEL = {
                consulta: 'Consulta',
                sugerencia: 'Sugerencia',
                propuesta: 'Propuesta',
                queja: 'Queja'
            };
            const etiqueta = TIPO_LABEL[tipo] || tipo;

            sendMail(
                'ruben.e.garcia@gmail.com',
                `EntreVecinos — Nueva ${etiqueta.toLowerCase()} de ${nombreFinal}`,
                `${etiqueta} de ${nombreFinal}:\n\n${mensaje.trim()}`,
                `<p><strong>${etiqueta}</strong> de <strong>${nombreFinal}</strong></p><p>${mensaje.trim().replace(/\n/g, '<br>')}</p>`
            ).catch(e => console.error('Error enviando notificación de feedback:', e));

            return dvOk(res, { mensaje: 'Gracias, lo recibimos.' });
        } catch (e) {
            console.error(e);
            return dvErr(res, 'Error al enviar el mensaje');
        }
    });



    app.post('/api/dv/feedback-anterior', async (req, res) => {
        try {
            const { tipo, mensaje, nombre } = req.body;

            if (!['consulta', 'sugerencia', 'propuesta', 'queja'].includes(tipo)) {
                return dvErr(res, 'Tipo inválido');
            }
            if (!mensaje || !mensaje.trim()) {
                return dvErr(res, 'El mensaje no puede estar vacío');
            }

            // Intento resolver usuario desde el JWT si vino, sin exigirlo
            let usuarioId = null;
            let nombreFinal = (nombre || '').trim();

            const authHeader = req.headers.authorization;
            if (authHeader) {
                try {
                    const token = authHeader.split(' ')[1];
                    const payload = jwt.verify(token, process.env.JWT_SECRET);
                    if (payload.id && payload.id !== 9999) {
                        usuarioId = payload.id;
                        nombreFinal = payload.nombre; // ignoro lo que mande el body si está logueado
                    }
                } catch (_) {
                    // token inválido o vencido: lo trato como invitado
                }
            }

            if (!nombreFinal) {
                return dvErr(res, 'Falta el nombre');
            }

            await pool.query(
                `INSERT INTO db_feedback (usuario_id, nombre, tipo, mensaje, fecha_creacion, activo)
                VALUES (?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL -3 HOUR), 1)`,
                [usuarioId, nombreFinal, tipo, mensaje.trim()]
            );

            return dvOk(res, { mensaje: 'Gracias, lo recibimos.' });
        } catch (e) {
            console.error(e);
            return dvErr(res, 'Error al enviar el mensaje');
        }
    });

    app.get('/api/dv/admin/feedback', dvAuth, soloAdmin, async (req, res) => {
        try {
            const { tipo } = req.query; // opcional: filtrar por tipo

            let query = `
      SELECT id, usuario_id, nombre, tipo, mensaje, fecha_creacion
      FROM db_feedback
      WHERE activo = 1
    `;
            const params = [];

            if (tipo && ['consulta', 'sugerencia', 'propuesta', 'queja'].includes(tipo)) {
                query += ' AND tipo = ?';
                params.push(tipo);
            }

            query += ' ORDER BY fecha_creacion DESC';

            const [rows] = await pool.query(query, params);

            return dvOk(res, { feedback: rows });
        } catch (e) {
            console.error(e);
            return dvErr(res, 'Error al obtener el feedback');
        }
    });

    // Listado de descripciones únicas de vecinos (activos)
    app.get('/api/dv/proveedores/vecinos-descripciones', dvAuth, soloAdmin, async (req, res) => {

        try {
            const [rows] = await pool.query(
                `SELECT DISTINCT SUBSTRING_INDEX(descripcion, '\n', 1) AS descripcion
            FROM db_proveedores
            WHERE tipo = 'vecino' AND activo = 1
            ORDER BY descripcion ASC`
            );
            const descripciones = rows.map(r => r.descripcion);
            return dvOk(res, { descripciones });
        } catch (err) {
            console.error('Error vecinos-descripciones:', err);
            return dvErr(res, 500, 'Error al obtener el listado');
        }
    });

    // GET /api/dv/proveedores/vecinos-resenas
    // Lista comentarios de reseñas (mín 60 caracteres), ordenados alfabéticamente
    app.get('/api/dv/proveedores/vecinos-resenas', dvAuth, soloAdmin, async (req, res) => {
        try {
            const [rows] = await pool.query(`
            SELECT DISTINCT comentario
            FROM db_resenas
            WHERE activo = 1
                AND LENGTH(comentario) >= 130
            ORDER BY comentario ASC
            `);

            const comentarios = rows.map(r => r.comentario);
            console.log(`>>> GET /api/dv/proveedores/vecinos-resenas: ${comentarios.length} comentarios encontrados`);
            return dvOk(res, { comentarios, total: comentarios.length });
        } catch (err) {
            console.error('Error vecinos-resenas:', err);
            return dvErr(res, 'Error al obtener reseñas', 500);
        }
    });

    // Resumen de vecinos participantes por Rubro y nombre, para exportar a CSV o Excel
    app.get('/api/dv/admin/vecinos-resumen', dvAuth, soloAdmin, async (req, res) => {
        try {
            const [rows] = await pool.query(`
            SELECT r.nombre AS rubro, p.nombre, p.descripcion
            FROM db_proveedores p
            JOIN db_rubros r ON p.rubro_id = r.id
            WHERE p.tipo = 'vecino' AND p.activo = 1
            ORDER BY r.nombre ASC, p.nombre ASC
            `);
            return dvOk(res, { proveedores: rows });
        } catch (err) {
            console.error(err);
            return dvErr(res, 'Error al obtener el listado de vecinos', 500);
        }
    });


    app.get('/api/dv/admin/informe-altas', dvAuth, soloAdmin, async (req, res) => {
        const { desde, hasta } = req.query;

        if (!desde || !hasta) {
            return dvErr(res, 400, 'Faltan parámetros: desde y hasta son requeridos');
        }

        try {
            const [rows] = await pool.query(`
            SELECT p.tipo, r.nombre AS rubro, p.nombre, p.descripcion
            FROM db_proveedores p
            JOIN db_rubros r ON r.id = p.rubro_id
            WHERE p.activo = 1
                AND p.creado_en BETWEEN ? AND ?
            ORDER BY
                FIELD(p.tipo, 'vecino', 'externo'),
                r.nombre, p.nombre
            `, [`${desde} 00:00:00`, `${hasta} 23:59:59`]);

            const vecinos = rows.filter(r => r.tipo === 'vecino');
            const externos = rows.filter(r => r.tipo === 'externo');

            return dvOk(res, {
                titulo: '\n📣📣 *ULTIMAS INCORPORACIONES A NUESTRO DIRECTORIO: entrevecinos-cc.com.ar 📣📣*',
                desde, hasta,
                vecinos,
                externos,
                pie: '\n➖➖➖➖\n\n*¿Tenés una profesión, emprendimiento u oficio? ¡Sumate vos también y dejá que tus vecinos te conozcan!\n\n¿Conocés un buen proveedor externo? Recomendalo para que todos puedan aprovecharlo.\n\nMás opciones, mejor para todos.*\n\n👉 entrevecinos-cc.com.ar'
            });
        } catch (err) {
            return dvErr(res, 500, 'Error generando el informe');
        }
    });
};