// auth-guard.js
(function () {
    const token = localStorage.getItem('token');
    const usuarioRaw = localStorage.getItem('usuario');

    // 🔐 No logueado
    if (!token || !usuarioRaw) {
        localStorage.clear();
        window.location.href = '/login.html';
        return;
    }

    let usuario;
    try {
        usuario = JSON.parse(usuarioRaw);
    } catch (e) {
        localStorage.clear();
        window.location.href = '/login.html';
        return;
    }

    // 🔐 Si debe cambiar password
    if (usuario.debe_cambiar_password) {
        window.location.href = '/cambiar-password.html';
        return;
    }

    // 🔐 Control por rol
    const rolesPermitidos = ['administrador', 'directivo', 'operador'];

    if (!rolesPermitidos.includes(usuario.rol)) {
        alert('No tiene permisos para acceder a esta página');
        // window.location.href = '/inicio.html';
        return;
    }

})();

