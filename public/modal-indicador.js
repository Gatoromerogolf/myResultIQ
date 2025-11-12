// === Servicio de códigos ===
const CodigosService = {
    codigosMap: {},

    async init() {
        try {
            const response = await fetch('/api/codigos');
            if (!response.ok) throw new Error('No se pudo obtener los códigos.');
            const codigos = await response.json();

            // Mapeamos por el campo cod_tabla (o ajusta si tu tabla usa otro campo)
            codigos.forEach(c => {
                this.codigosMap[c.cod_tabla] = c.cod_nombre;
            });

            console.log(`✅ Códigos cargados (${codigos.length})`);
        } catch (err) {
            console.error('Error al inicializar los códigos:', err);
        }
    },

    getNombreCodigo(codigo) {
        return this.codigosMap[codigo] || '-';
    }
};

// === Inicialización automática ===
document.addEventListener('DOMContentLoaded', async () => {
    await CodigosService.init();
});

// === Función principal del modal ===
async function verDetalleIndicador(codigo) {
    try {
        const response = await fetch(`/api/indicadores/${codigo}`);
        if (!response.ok) throw new Error('No se pudo obtener el indicador.');

        const indicador = await response.json();
        const tabla = document.getElementById('tablaDetalleIndicador');
        tabla.innerHTML = '';

        // === 👤 Sección: Responsable (foto + nombre + legajo)
        const contenedorResponsable = document.getElementById('detalleResponsable');
        if (contenedorResponsable) {
            contenedorResponsable.innerHTML = `
                <div class="d-flex align-items-center gap-3 border-bottom pb-2 mb-3">
                    ${indicador.responsable_foto
                    ? `<img src="${indicador.responsable_foto}" class="rounded-circle border" width="70" height="70" alt="Foto del responsable">`
                    : `<i class="fa fa-user-circle fa-4x text-secondary"></i>`
                }
                    <div>
                        <small class="text-muted">Responsable</small>
                        <h6 class="mb-0">${indicador.responsable_nombre || 'Sin asignar'}</h6>
                        <small class="text-muted">Legajo: ${indicador.responsable || '-'}</small>
                    </div>
                </div>
            `;
        }

        // === Diccionarios para valores numéricos ===
        const tipos = { 1: 'Estratégico', 2: 'Táctico', 3: 'Operativo' };
        const dimensiones = { 1: 'Financiera', 2: 'Clientes', 3: 'Procesos', 4: 'Capital Humano' };
        // const categorias = { 1: 'Eficiencia', 2: 'Eficacia', 3: 'Calidad', 4: 'Productividad' };
        const criticidades = { 1: 'Alta', 2: 'Media', 3: 'Baja' };
        const tiposMeta = { 1: 'Valor único', 2: 'Rango de valores', 3: 'Tendencia' };
        const tendencias = { 1: 'Creciente', 2: 'Decreciente', 3: 'Estable' };
        const evaluaciones = {
            1: 'Superable positiva - Más es mejor',
            2: 'Límite máximo - No debe superarse',
            3: 'Tolerancia simétrica - Penaliza desviaciones',
            4: 'Menor es mejor - Más es negativo',
            5: 'Valor exacto - Cero tolerancia'
        };
        const estados = { 1: 'Vigente', 2: 'Suspendido', 3: 'Cancelado' };

        // === Campos principales ===
        const campos = {
            "Código": indicador.codigo_id,
            "Nombre": indicador.nombre,
            "Descripción": indicador.descripcion || '-',
            "Objetivo": indicador.objetivo || '-',
            "Destino": `${indicador.destino_nombre || '-'} (${indicador.destino || '-'})`,
            "__sep1__": null,
            "Tipo": `${indicador.tipo_id} - ${tipos[indicador.tipo_id] || '-'}`,
            "Perspectiva (BSC)": `${indicador.dimension_id} - ${dimensiones[indicador.dimension_id] || '-'}`,
            // "Categoría": `${indicador.categoria_id} - ${categorias[indicador.categoria_id] || '-'}`,
            "Criticidad": `${indicador.criticidad_id} - ${criticidades[indicador.criticidad_id] || '-'}`,
            "__sep2__": null,
            "Tipo de Meta": `${indicador.meta_tipo} - ${tiposMeta[indicador.meta_tipo] || '-'}`,
        };

        // === Campos específicos según tipo de meta ===
        if (indicador.meta_tipo === 1) {
            Object.assign(campos, {
                "Valor Meta": `${indicador.unico_valor || '-'} - ${CodigosService.getNombreCodigo(indicador.unidad_medida)}`,
                "Método de evaluación": `${indicador.unico_eval} - ${evaluaciones[indicador.unico_eval] || '-'}`,
                "__sep3__": null,
            });
        } else if (indicador.meta_tipo === 2) {
            Object.assign(campos, {
                "Rango Desde": indicador.rango_desde || '-',
                "Rango Hasta": indicador.rango_hasta || '-',
                "__sep4__": null,
            });
        } else if (indicador.meta_tipo === 3) {
            Object.assign(campos, {
                "Tendencia Tipo": tendencias[indicador.tenden_tipo] || '-',
                "Tendencia Referencia": indicador.tenden_refe || '-',
                "__sep5__": null,
            });
        }

        // === Campos adicionales ===
        Object.assign(campos, {
            "Fuente de Datos": indicador.fuente_datos || '-',
            "Fórmula de Cálculo": indicador.formula_calculo || '-',
            // "Unidad de Medida": CodigosService.getNombreCodigo(indicador.unidad_medida),
            "Frecuencia de Medición": CodigosService.getNombreCodigo(indicador.freq_medicion),
            "Fecha de Inicio": `${indicador.fecha_inicio
                ? new Date(indicador.fecha_inicio).toLocaleDateString('es-AR')
                : '-'
                } - ${estados[indicador.estado] || '-'}`,

            "__sep6__": null,
            "Comentarios": indicador.comentarios || '-'
        });

        // === Render de tabla ===
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
            const th = document.createElement('th');
            th.textContent = campo;
            th.style.width = '200px';
            const td = document.createElement('td');
            td.textContent = valor;
            fila.appendChild(th);
            fila.appendChild(td);
            tabla.appendChild(fila);
        }

        // === Mostrar modal ===
        const modal = new bootstrap.Modal(document.getElementById('modalDetalleIndicador'));
        modal.show();

    } catch (error) {
        console.error('Error al obtener el detalle:', error);
        alert('No se pudo obtener el detalle del indicador.');
    }
}




