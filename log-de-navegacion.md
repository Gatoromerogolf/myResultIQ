# Log de navegación – EntreVecinos

Eventos: `home`, `busqueda_texto`, `busqueda_voz`, `rubro`, `ficha`, `whatsapp`.
Se guarda: fecha/hora (hora Argentina), usuario (nombre si está registrado, IP si es visitante) y evento. Sumé una columna `detalle` (qué se buscó / qué rubro / qué ficha), que es lo que hace útil el log; si no la querés, borrala.

---

## 1. SQL (correr una vez en Railway)

```sql
CREATE TABLE IF NOT EXISTS db_log_navegacion (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  fecha_hora    DATETIME NOT NULL,
  usuario_id    INT NULL,
  usuario       VARCHAR(100) NOT NULL,          -- nombre si registrado, IP si visitante
  es_visitante  TINYINT(1) NOT NULL DEFAULT 1,
  evento        ENUM('home','busqueda_texto','busqueda_voz','rubro','ficha','whatsapp') NOT NULL,
  detalle       VARCHAR(255) NULL,
  INDEX idx_fecha (fecha_hora),
  INDEX idx_evento (evento, fecha_hora),
  INDEX idx_usuario (usuario)
);
```

---

## 2. Backend (dentro de `registerDVRoutes()` en `routes_dv.js`)

```js
const EVENTOS_NAV = ['home','busqueda_texto','busqueda_voz','rubro','ficha','whatsapp'];

// IP real (Cloudflare -> Railway)
function dvIp(req) {
  return (req.headers['cf-connecting-ip'] ||
          (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
          req.ip || '').slice(0, 45);
}

// Auth OPCIONAL: si hay token válido setea usuario, si no, es visitante.
// Ajustá JWT_SECRET / jwt al nombre que ya usás en dvAuth.
function dvAuthOpcional(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (token) req.dvUserOpt = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) { /* token inválido o vencido -> visitante */ }
  next();
}

app.post('/api/dv/log-nav', dvAuthOpcional, async (req, res) => {
  try {
    const { evento, detalle } = req.body || {};
    if (!EVENTOS_NAV.includes(evento)) return res.status(400).json({ ok: false });

    const u = req.dvUserOpt;
    const esVisitante = u ? 0 : 1;
    const usuarioId   = u ? (u.id || null) : null;
    const usuario     = u ? (u.nombre || u.email || ('user#' + u.id)) : dvIp(req);

    await pool.query(
      `INSERT INTO db_log_navegacion
         (fecha_hora, usuario_id, usuario, es_visitante, evento, detalle)
       VALUES (DATE_ADD(UTC_TIMESTAMP(), INTERVAL -3 HOUR), ?, ?, ?, ?, ?)`,
      [usuarioId, String(usuario).slice(0, 100), esVisitante, evento,
       detalle ? String(detalle).slice(0, 255) : null]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('log-nav', e.message);
    res.json({ ok: false });   // el log nunca debe romper la app
  }
});

// Consulta para admin (soloAdmin después de dvAuth)
app.get('/api/dv/admin/log-nav', dvAuth, soloAdmin, async (req, res) => {
  try {
    const { desde, hasta, evento } = req.query;
    const w = [], p = [];
    if (desde)  { w.push('fecha_hora >= ?'); p.push(desde + ' 00:00:00'); }
    if (hasta)  { w.push('fecha_hora <= ?'); p.push(hasta + ' 23:59:59'); }
    if (evento) { w.push('evento = ?');      p.push(evento); }
    const [rows] = await pool.query(
      `SELECT DATE(fecha_hora) AS fecha, TIME(fecha_hora) AS hora,
              usuario, es_visitante, evento, detalle
         FROM db_log_navegacion
         ${w.length ? 'WHERE ' + w.join(' AND ') : ''}
        ORDER BY fecha_hora DESC LIMIT 1000`, p);
    dvOk(res, rows);
  } catch (e) { dvErr(res, e); }
});
```

> Si `pool` / `jwt` / `dvOk(res, …)` / `dvErr(…)` se llaman distinto en tu código, adaptalo (copié la forma que describen tus convenciones).

---

## 3. Frontend (helper compartido, pegarlo una vez en el JS de `directorio-vecinal.html`)

```js
// Log de navegación: fire-and-forget, nunca bloquea ni tira errores
function dvLog(evento, detalle) {
  try {
    const token = localStorage.getItem('dv_token');   // <- usá la clave real de tu JWT
    fetch('/api/dv/log-nav', {
      method: 'POST',
      keepalive: true,
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        token ? { Authorization: 'Bearer ' + token } : {}
      ),
      body: JSON.stringify({ evento, detalle: detalle || null })
    }).catch(() => {});
  } catch (e) {}
}
```

### Puntos de enganche

| Evento | Dónde llamar |
|---|---|
| `home` | Al cargar la página: `dvLog('home');` en el init (una sola vez; con tu fix de bfcache usá también `pageshow` con `e.persisted` si querés contar el regreso) |
| `busqueda_texto` | Con debounce, **no por tecla**: ver abajo |
| `busqueda_voz` | En `recognition.onresult`: `dvLog('busqueda_voz', transcript);` |
| `rubro` | Al hacer click en un pill/rubro: `dvLog('rubro', nombreRubro);` |
| `ficha` | Al inicio de `openDetail(p)`: `dvLog('ficha', p.id + ' - ' + p.nombre);` |
| `whatsapp` | Click en el botón de WhatsApp de la ficha: `dvLog('whatsapp', p.id + ' - ' + p.nombre);` (sin frenar el `href`) |

Búsqueda por texto con debounce (solo loguea cuando el usuario deja de tipear):

```js
let _logBuscarTimer;
inputBuscador.addEventListener('input', () => {
  clearTimeout(_logBuscarTimer);
  const q = inputBuscador.value.trim();
  if (q.length < 2) return;
  _logBuscarTimer = setTimeout(() => dvLog('busqueda_texto', q), 1200);
});
```

Para que una búsqueda por voz **no** se loguee además como texto (porque el resultado se vuelca al input), seteá una bandera antes de escribir el input desde voz:

```js
let _viaVoz = false;
// en onresult:
_viaVoz = true; inputBuscador.value = transcript; dvLog('busqueda_voz', transcript);
// en el listener 'input':  if (_viaVoz) { _viaVoz = false; return; }
```

---

## 4. Notas

- **Visitantes**: se guarda la IP. Ojo, es dato personal (Ley 25.326): conviene mencionarlo en la política de privacidad, o purgar el log viejo con un job (`DELETE … WHERE fecha_hora < NOW() - INTERVAL 90 DAY`).
- **Tu tabla `db_log_ingresos`** ya registra ingresos con UUID de visitante; este log es aparte y más granular. Si querés, después se puede sumar el UUID como columna para distinguir visitantes que comparten IP (muy común en un barrio con una sola salida a internet).
- **Volumen**: es una fila por acción; con índices está bien, pero la consulta de admin tiene `LIMIT 1000`.