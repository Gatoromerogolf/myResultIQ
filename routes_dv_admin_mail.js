// routes_dv_admin_mail.js
//
// Rutas admin para el envío del mail de agradecimiento a usuarios registrados.
// Versión simple: sin UI, se disparan a mano contra el endpoint (Postman, curl, etc.)
//
// Se registra en server.js así, pasando las dependencias compartidas:
//
//   const registrarRutasAdminMail = require('./routes_dv_admin_mail');
//   registrarRutasAdminMail(app, pool, sendMail, soloAdmin);
//
// Requiere que 'soloAdmin' sea el mismo middleware que ya usás en admin-stats
// (el que valida id: 1), y que 'sendMail' sea la función que ya usás para Resend.

const fs = require('fs');
const path = require('path');

module.exports = function registrarRutasAdminMail(app, pool, sendMail, dvAuth, soloAdmin) {

  const TEMPLATE_PATH = path.join(__dirname, 'templates', 'mail-agradecimiento.html');

  function armarHtml(nombre) {
    const primerNombre = (nombre || '').trim().split(' ')[0] || 'vecino/a';
    let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    html = html.replace(/{{NOMBRE}}/g, primerNombre);
    return html;
  }

  // ------------------------------------------------------------------
  // POST /api/dv/admin/comunicaciones/prueba
  // Manda el mail solo al administrador (id: 1), para revisar texto y diseño.
  // ------------------------------------------------------------------
  app.post('/api/dv/admin/comunicaciones/prueba', dvAuth, soloAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT nombre, email FROM db_usuarios WHERE id = 1'
      );

      if (!rows.length) {
        return res.status(404).json({ error: 'No se encontró el usuario administrador (id: 1)' });
      }

      const admin = rows[0];
      const html = armarHtml(admin.nombre);

      await sendMail(admin.email, '[PRUEBA] ¡Gracias por sumarte a EntreVecinos!', '', html);

      res.json({ ok: true, enviado_a: admin.email });
    } catch (err) {
      console.error('Error enviando mail de prueba:', err);
      res.status(500).json({ error: 'Error al enviar el mail de prueba' });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/dv/admin/comunicaciones/enviar
  // Envío real a todos los usuarios con email_verificado = 1.
  // Pensado para tandas chicas (hasta ~40 destinatarios).
  // ------------------------------------------------------------------
  app.post('/api/dv/admin/comunicaciones/enviar', dvAuth, soloAdmin, async (req, res) => {
    try {
      const [usuarios] = await pool.query(
        'SELECT nombre, email FROM db_usuarios WHERE email_verificado = 1'
      );

      if (!usuarios.length) {
        return res.json({ ok: true, total: 0, enviados: 0, mensaje: 'No hay usuarios verificados para enviar.' });
      }

      const resultado = { exitosos: 0, fallidos: [] };

      for (const usuario of usuarios) {
        try {
          const html = armarHtml(usuario.nombre);
          await sendMail(usuario.email, '¡Gracias por sumarte a EntreVecinos!', '', html);
          resultado.exitosos++;
        } catch (errEnvio) {
          console.error(`Error enviando a ${usuario.email}:`, errEnvio);
          resultado.fallidos.push(usuario.email);
        }

        // Pausa chica entre envíos para no saturar la API de Resend.
        await new Promise((r) => setTimeout(r, 600));
      }

      res.json({
        ok: true,
        total: usuarios.length,
        enviados: resultado.exitosos,
        fallidos: resultado.fallidos
      });
    } catch (err) {
      console.error('Error en envío masivo:', err);
      res.status(500).json({ error: 'Error al enviar los mails' });
    }
  });
};