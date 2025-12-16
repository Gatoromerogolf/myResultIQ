document.addEventListener('DOMContentLoaded', () => {
  const usuarioRaw = localStorage.getItem('usuario');

  if (!usuarioRaw) return;

  const usuario = JSON.parse(usuarioRaw);

  // Nombre + rol
  // const userName = document.getElementById('userName');
  // if (userName) {
  //   userName.textContent =
  //     `${usuario.nombres} ${usuario.apellido} (${usuario.rol.toUpperCase()})`;
  // }

  // // Foto (opcional)
  // const avatar = document.getElementById('userAvatar');
  // if (avatar && usuario.fotoUrl) {
  //   avatar.src = usuario.fotoUrl;
  // }
});
