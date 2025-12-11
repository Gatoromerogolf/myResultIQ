
async function mostrarModalMediciones(ind, codigo, nombre, frecuencia, evaluacion) {
    // Completa datos del indicador
    document.getElementById('med-codigo').textContent = codigo || '-';
    document.getElementById('med-nombre').textContent = nombre || '-';
    const freq_medicion = CodigosService.getNombreCodigo(frecuencia);
    document.getElementById('med-freq').textContent = freq_medicion || '-';

    let cuentito = CodigosService.getNombreCodigo(evaluacion) || '-'
    console.log(`valor de evaluacion  ${evaluacion}`)
    const unidad = CodigosService.getNombreCodigo(evaluacion);
    document.getElementById('med-evaluacion').textContent = CodigosService.getNombreCodigo(evaluacion) || '-';
    const tbody = document.getElementById('tablaMediciones');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Cargando datos...</td></tr>`;

    try {
        // Llamada a la API (ajustá la ruta según tu backend)
        console.log(`id para mandar  ${ind}`)
        const res = await fetch(`/api/mediciones/${ind}`);
        if (!res.ok) throw new Error('Error al obtener mediciones');
        const result = await res.json();
        const mediciones = result.data || [];

        // Limpia tabla
        tbody.innerHTML = '';

        if (mediciones.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No hay mediciones registradas</td></tr>`;
        } else {
            // 👇 ORDENAR POR PERÍODO DESCENDENTE
            mediciones.sort((a, b) => Number(b.med_valor_periodo) - Number(a.med_valor_periodo));

            mediciones.forEach(m => {
                const fila = `
                    <tr>
                        <td class="text-center">${m.med_valor_periodo || '-'}</td>
                        <td class="text-center">${m.med_valor ?? '-'}</td>
                        <td class="text-center">${m.med_meta ?? '-'}</td>
                        <td class="text-center">${m.med_cumplimiento ?? '-'}</td>
                        <td>${m.med_comentarios || ''}</td>
                        <td>${m.med_plan_accion || ''}</td>
                        <!-- 👇 Muestra nombres en lugar de legajos -->
                        <td class="text-center">
                            ${m.responsable_medicion
                        ? `${m.responsable_medicion} (${m.med_legajo_resp_medicion})`
                        : (m.med_legajo_resp_medicion || '-')}
                        </td>
                        <td class="text-center">
                            ${m.responsable_registro
                        ? `${m.responsable_registro} (${m.med_legajo_resp_registro})`
                        : (m.med_legajo_resp_registro || '-')}
                        </td>
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

    // === Mostrar modal ===
    const modal = new bootstrap.Modal(document.getElementById('modalMediciones'));
    modal.show();
}