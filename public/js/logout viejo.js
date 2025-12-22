
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('confirmLogout');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const token = localStorage.getItem('token');

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token
        }
      });
    } catch (e) {
      // no bloquea logout
    }

    // 🔹 borrar SOLO datos de sesión
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('roles');
    localStorage.removeItem('debeCambiarPassword');
    // ⚠️ NO borrar ocultarBienvenida

    const ocultarBienvenida = localStorage.getItem('ocultarBienvenida') === 'true';
    console.log('ocultarBienvenida:', localStorage.getItem('ocultarBienvenida'));

    sessionStorage.clear(); // sesión volátil, ok borrar todo

    window.location.href = '/index.html';
  });
});

