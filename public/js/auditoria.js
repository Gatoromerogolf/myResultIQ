document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const resp = await fetch('/api/auditoria', {
      headers: {
        Authorization: 'Bearer ' + token
      }
    });

    if (!resp.ok) {
      alert('No se pudo cargar la auditoría');
      return;
    }

    const data = await resp.json();

    $('#tablaAuditoria').DataTable({
      data,
      order: [[0, 'desc']],
      columns: [
        {
          data: 'fecha',
          render: {
            display: d => new Date(d).toLocaleString(),
            sort: d => new Date(d).getTime()
          }
        },
        { data: 'username' },
        { data: 'evento' },
        {
          data: 'resultado',
          render: r =>
            r === 'OK'
              ? `<span class="badge bg-success">OK</span>`
              : `<span class="badge bg-danger">${r}</span>`
        },
        { data: 'ip' },
        { data: 'detalle' }
      ]
    });

  } catch (err) {
    console.error(err);
    alert('Error cargando auditoría');
  }
});
