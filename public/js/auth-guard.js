// auth-guard.js
//  front end - navegador
function authGuard(opciones = {}) {
    const {
        rolesPermitidos = [],
        redirigirSinRol = '/login.html'
    } = opciones;

    // 🔐 1. Token (no logeado)
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // 👤 2. Usuario
    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) {
        window.location.href = '/login.html';
        return;
    }

    let usuario;
    try {
        usuario = JSON.parse(usuarioStr);
    } catch {
        window.location.href = '/login.html';
        return;
    }

    // 🔁 3. Cambio de password obligatorio
    if (usuario.debe_cambiar_password) {
        window.location.href = '/cambiar-password.html';
        return;
    }

    // 🔐 Control de roles
    if (
        rolesPermitidos.length > 0 &&
        !rolesPermitidos.includes(usuario.rol)
    ) {
        alert('No tiene permisos para acceder a esta página');
        window.location.href = redirigirSinRol;
        return;
    }

    // ✔️ Acceso permitido
    return usuario;
}

