document.addEventListener('click', async (e) => {
  if (e.target.id !== 'confirmLogout') return;

  // cerrar modal
  const modalEl = document.getElementById('logoutModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();

  const token = localStorage.getItem('token');

  // 📋 auditoría backend (UNA sola llamada)
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token
        }
      });
    } catch {
      console.warn('No se pudo registrar logout');
    }
  }

  // 🧹 limpiar sesión
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  localStorage.removeItem('roles');
  localStorage.removeItem('debeCambiarPassword');
  sessionStorage.clear();

  // 🚀 redirigir
  window.location.href = '/';
});
