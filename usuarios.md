Definición:

Rol	Descripción	Accesos típicos
administrador:	Control total del sistema	Usuarios, indicadores, sectores, dashboards, mediciones, configuración
directivo (o manager):	Visualización completa	Dashboards, indicadores de todas las áreas, reportes
responsable:	Responsable de uno o más indicadores	Ver y editar SOLO sus indicadores; ver reportes asignados
operador:	Carga de mediciones	Crear mediciones, editar las propias, NO ve dashboards globales

Perfecto — la tabla quedó bien. Vamos por partes como pedís: empiezo por los endpoints de autenticación (login / logout) y el middleware de autenticación/roles. Después seguimos con la vista de administración y los endpoints CRUD de usuarios cuando quieras.

Te dejo un paquete listo para copiar/pegar (Node.js + Express) con:

/api/login (POST) — valida usuario + password, devuelve JWT en cookie httpOnly

/api/logout (POST) — borra cookie

authMiddleware — valida JWT y deja req.user

requireRole(...) — middleware para chequear roles (administrador, directivo, responsable, operador)

ejemplos de uso (rutas protegidas)

Uso bcrypt para passwords y jsonwebtoken para tokens. Está preparado para integrarse con tu base MySQL (uso pseudocódigo para las consultas; adaptalo a tu DAO/ORM).



Tu archivo .env debería incluir al menos estas variables:

JWT_SECRET=una_clave_muy_secreta_que_debes_cambiar
JWT_EXPIRES_IN=8h
COOKIE_NAME=jwt

¿Por qué son necesarias?
Variable	Para qué sirve
JWT_SECRET	La clave con la que se firman los tokens JWT. Es obligatoria. Sin esto, tu app no puede generar ni validar tokens. Cambiala por algo largo y seguro.
JWT_EXPIRES_IN	Tiempo de expiración del token. Podés usar “8h”, “2d”, “30m”, etc.



4️⃣ Flujo final correcto (checklist)

✔ Alta de usuario
✔ Password temporal
✔ debe_cambiar_password = 1
✔ Login devuelve debeCambiarPassword
✔ Redirección a cambiar-password.html
✔ Validación fuerte en frontend (UX)
✔ Validación fuerte en backend (seguridad)
✔ Se borra el flag
✔ Login normal habilitado

👉 Este flujo es enterprise-grade.

5️⃣ Próximo paso lógico (mañana 😉)

Cuando quieras seguimos con:

🚫 impedir reutilizar la última contraseña

🕒 vencimiento de password

📜 auditoría (password cambiado, login, logout)

🔐 política por rol

🔁 recuperación de contraseña (sin email por ahora)

Cuando digas, seguimos.


/js
 ├── auth-guard.js        // controla login + rol
 ├── navbar-user.js      // pinta nombre, rol y foto
 ├── logout.js           // maneja logout
 ├── layout.js           // carga navbar + modal