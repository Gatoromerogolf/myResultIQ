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

    localStorage.clear();
    sessionStorage.clear();

    window.location.href = '/index.html';
  });
});
