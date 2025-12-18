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
    const userAvatarDrop = document.getElementById('userAvatarDropdown');
    const userNameDrop = document.getElementById('userNameDropdown');
    const userRolDrop = document.getElementById('userRole');


    if (userNameEl) {
        userNameEl.innerHTML = `
            <strong>${usuario.nombres} ${usuario.apellido}</strong>
            <span class="text-muted">(${usuario.rol.toUpperCase()})</span>
        `;

        userNameDrop.innerHTML = userNameEl.innerHTML;
        userRolDrop.innerHTML = `${usuario.rol}`;
    }

    userAvatarEl.src = `/usuarios/foto/${usuario.legajo}?t=${Date.now()}`;
    userAvatarDrop.src = `/usuarios/foto/${usuario.legajo}?t=${Date.now()}`;

    userAvatarEl.onerror = () => {
        userAvatarEl.src = '/dist/images/default_user.jpg';
        userAvatarDrop.src = '/dist/images/default_user.jpg';
    };

});



