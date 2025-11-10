// Función para insertar el modal en el DOM si no existe
async function cargarModalIndicador() {
    // Evitar duplicados
    if (document.getElementById('modalDetalleIndicador')) return;

    const response = await fetch('/modal-indicador.html');
    const html = await response.text();

    // Insertar al final del body
    document.body.insertAdjacentHTML('beforeend', html);
}

// Función principal para abrir el modal con la información
async function verDetalleIndicador(codigo) {
    await cargarModalIndicador();

    try {
        const response = await fetch(`/api/indicadores/${codigo}`);
        if (!response.ok) throw new Error('No se pudo obtener el indicador.');

        const indicador = await response.json();
        const tabla = document.getElementById('tablaDetalleIndicador');
        tabla.innerHTML = '';

        const tipoMap = {
            1: 'Estratégico',
            2: 'Táctico',
            3: 'Operativo'
        };
        const dimensionMap = {
            1: 'Financiera',
            2: 'Clientes',
            3: 'Procesos',
            4: 'Capital Humano'
        };
        const categoriaMap = {
            1: 'Eficiencia',
            2: 'Eficacia',
            3: 'Calidad',
            4: 'Productividad'
        };
        const criticidadMap = {
            1: 'Alta',
            2: 'Media',
            3: 'Baja'
        };
        const metaMap = {
            1: 'Valor único',
            2: 'Rango de valores',
            3: 'Tendencia'
        };
        const tendenciaMap = {
            1: 'Creciente',
            2: 'Decreciente',
            3: 'Estable'
        };
        const estadoMap = {
            1: 'Vigente',
            2: 'Suspendido',
            3: 'Cancelado'
        };

        const usuario = obtenerNombreResponsable(indicador.responsable);
        const campos = {
            "Código": indicador.codigo_id,
            "Nombre": indicador.nombre,
            "Descripción": indicador.descripcion || '-',
            "Objetivo": indicador.objetivo || '-',
            "Destino": `${indicador.destino || '-'} - ${indicador.destino_nombre || ''}`,
            "Responsable": `${indicador.responsable} - ${usuario}`,
            "__sep1__": null,
            "Tipo": tipoMap[indicador.tipo_id] || '-',
            "Perspectiva (BSC)": dimensionMap[indicador.dimension_id] || '-',
            "Criticidad": criticidadMap[indicador.criticidad_id] || '-',
            "__sep2__": null,
            "Tipo de Meta": metaMap[indicador.meta_tipo] || '-'
        };

        if (indicador.meta_tipo === 1) {
            Object.assign(campos, {
                "Valor Meta": indicador.unico_valor || '-',
                "__sep3__": null
            });
        } else if (indicador.meta_tipo === 2) {
            Object.assign(campos, {
                "Rango Desde": indicador.rango_desde || '-',
                "Rango Hasta": indicador.rango_hasta || '-',
                "__sep4__": null
            });
        } else if (indicador.meta_tipo === 3) {
            Object.assign(campos, {
                "Tendencia Tipo": tendenciaMap[indicador.tenden_tipo] || '-',
                "Tendencia Referencia": indicador.tenden_refe || '-',
                "__sep5__": null
            });
        }

        Object.assign(campos, {
            "Fuente de Datos": indicador.fuente_datos || '-',
            "Fórmula de Cálculo": indicador.formula_calculo || '-',
            "Unidad de Medida": CodigosService.getNombreCodigo(indicador.unidad_medida),
            "Frecuencia de Medición": CodigosService.getNombreCodigo(indicador.freq_medicion),
            "Fecha de Inicio": indicador.fecha_inicio
                ? new Date(indicador.fecha_inicio).toLocaleDateString('es-AR')
                : '-',
            "Estado": estadoMap[indicador.estado] || '-',
            "__sep6__": null,
            "Comentarios": indicador.comentarios || '-'
        });

        for (const [campo, valor] of Object.entries(campos)) {
            if (campo.startsWith("__sep")) {
                const sepRow = document.createElement('tr');
                const sepCell = document.createElement('td');
                sepCell.colSpan = 2;
                sepCell.innerHTML = "&nbsp;";
                sepRow.appendChild(sepCell);
                tabla.appendChild(sepRow);
                continue;
            }
            const fila = document.createElement('tr');
            fila.innerHTML = `<th style="width:200px; text-align:left;">${campo}</th><td>${valor}</td>`;
            tabla.appendChild(fila);
        }

        const modal = new bootstrap.Modal(document.getElementById('modalDetalleIndicador'));
        modal.show();

    } catch (error) {
        console.error('Error al obtener el detalle:', error);
        alert('No se pudo obtener el detalle del indicador.');
    }
}

function obtenerNombreResponsable(legajo) {
    const usuario = window.activos?.find(u => String(u.legajo) === String(legajo));
    return usuario ? `${usuario.apellido}, ${usuario.nombres}` : 'Sin asignar';
}
