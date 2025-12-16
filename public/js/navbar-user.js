// /js/navbar-user.js
document.addEventListener('DOMContentLoaded', () => {
    const usuarioRaw = localStorage.getItem('usuario');
    if (!usuarioRaw) return;

    let usuario;
    try {
        usuario = JSON.parse(usuarioRaw);
    } catch {
        console.error('Usuario inválido en localStorage');
        return;
    }

    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');

    if (userNameEl) {
        userNameEl.innerHTML = `
            Bienvenido 
            <strong>${usuario.nombres} ${usuario.apellido}</strong>
            <span class="text-muted">(${usuario.rol.toUpperCase()})</span>
        `;
    }

    if (userAvatarEl) {
        userAvatarEl.src = usuario.tiene_foto
            ? `/usuarios/foto/${usuario.id}?t=${Date.now()}`
            : '/dist/images/default_user.jpg';
    }
});



