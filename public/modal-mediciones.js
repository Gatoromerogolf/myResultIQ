
let modalMediciones = null;

document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('modalMediciones');
    if (modalEl) {
        modalMediciones = new bootstrap.Modal(modalEl);
    }
});

async function mostrarModalMediciones(ind) {
    // Completa datos del indicador
    document.getElementById('med-codigo').textContent = ind.id || '-';
    document.getElementById('med-nombre').textContent = ind.nombre || '-';

    const tbody = document.getElementById('tablaMediciones');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Cargando datos...</td></tr>`;

    try {
        // Llamada a la API (ajustá la ruta según tu backend)
        const res = await fetch(`/api/mediciones/${ind.id}`);
        if (!res.ok) throw new Error('Error al obtener mediciones');
        const result = await res.json();
        const mediciones = result.data || [];

        // Limpia tabla
        tbody.innerHTML = '';

        if (mediciones.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No hay mediciones registradas</td></tr>`;
        } else {
            mediciones.forEach(m => {
                const fila = `
                    <tr>
                        <td class="text-center">${m.med_periodo || '-'}</td>
                        <td class="text-center">${m.med_valor ?? '-'}</td>
                        <td class="text-center">${m.med_meta ?? '-'}</td>
                        <td>${m.med_comentarios || ''}</td>
                        <td>${m.med_plan_accion || ''}</td>
                        <td class="text-center">${m.med_legajo_resp_medicion || '-'}</td>
                        <td class="text-center">${m.med_legajo_resp_registro || '-'}</td>
                        <td class="text-center">${m.med_fecha_registro
                        ? new Date(m.med_fecha_registro).toLocaleDateString('es-AR')
                        : '-'}</td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', fila);
            });
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error al cargar mediciones</td></tr>`;
    }

    // Muestra el modal
    if (modalMediciones) modalMediciones.show();
}