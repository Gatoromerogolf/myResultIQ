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
            <strong>${usuario.nombres} ${usuario.apellido}</strong>
            <span class="text-muted">(${usuario.rol.toUpperCase()})</span>
        `;
    }

    userAvatarEl.src = `/usuarios/foto/${usuario.legajo}?t=${Date.now()}`;

    userAvatarEl.onerror = () => {
        userAvatarEl.src = '/dist/images/default_user.jpg';
    };

});



