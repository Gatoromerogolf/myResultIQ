
document.getElementById('confirmLogout').addEventListener('click', function () {
    // Limpiar lo necesario
    sessionStorage.clear();
    localStorage.clear(); // si usás localStorage

    // Redirigir al inicio
    window.location.href = 'index.html';
});
