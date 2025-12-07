// === Servicio de códigos ===
const CodigosService = {
    codigosMap: {},

    async init() {
        try {
            const response = await fetch('/api/codigos');
            if (!response.ok) throw new Error('No se pudo obtener los códigos.');
            const codigos = await response.json();

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


// =====================================================
// === FUNCIÓN PRINCIPAL: verDetalleIndicador(codigo)
// =====================================================
async function verDetalleIndicador(codigo) {

    try {
        const response = await fetch(`/api/indicadores/${codigo}`);
        if (!response.ok) throw new Error('No se pudo obtener el indicador.');

        const body = await response.json();
        const indicador = body.data;

        console.log("🟦 DEBUG indicador:", indicador);

        // ----------------------------------------------------
        // Bloque Responsable
        // ----------------------------------------------------
        const contenedorResponsable = document.getElementById('detalleResponsable');

        contenedorResponsable.innerHTML = `
            <div class="d-flex align-items-center gap-3 border-bottom pb-2 mb-3">
                ${indicador.responsable_foto
                ? `<img src="${indicador.responsable_foto}" class="rounded-circle border" width="70" height="70">`
                : `<i class="fa fa-user-circle fa-4x text-secondary"></i>`
            }
                <div>
                    <small class="text-muted">Responsable</small>
                    <h6 class="mb-0">${indicador.responsable_nombre || 'Sin asignar'}</h6>
                    <small class="text-muted">Legajo: ${indicador.responsable || '-'}</small>
                </div>
            </div>
        `;


        // ----------------------------------------------------
        // ⭐ NUEVO BLOQUE ELEGANTE: Tarjetas Peso / Global
        // ----------------------------------------------------
        const peso = indicador.peso_porcentual ?? '-';
        const pesoGlobal = indicador.peso_porcentual_global ?? '-';
        const pesoPerspectiva = indicador.dimension_porcentual ?? '-';

 

        const bloque = document.getElementById("bloqueInfoIndicador");
        bloque.innerHTML = `
        <div class="row text-center">

            <!-- Peso del Indicador -->
            <div class="col-md-4 mb-2">
                <div class="card shadow-sm border-left-primary">
                    <div class="card-body py-2">
                        <i class="fas fa-balance-scale text-primary fa-2x mb-1"></i>
                        <h6 class="mt-1 mb-0">Peso en Destino</h6>
                        <h5 class="fw-bold">${indicador.peso_porcentual || 0}%</h5>
                    </div>
                </div>
            </div>

            <!-- Peso Global -->
            <div class="col-md-4 mb-2">
                <div class="card shadow-sm border-left-success">
                    <div class="card-body py-2">
                        <i class="fas fa-chart-pie text-success fa-2x mb-1"></i>
                        <h6 class="mt-1 mb-0">Peso Global</h6>
                        <h5 class="fw-bold">${indicador.peso_porcentual_global || 0}%</h5>
                    </div>
                </div>
            </div>

            <!-- Peso en BSC (Dimension) -->
            <div class="col-md-4 mb-2">
                <div class="card shadow-sm border-left-warning">
                    <div class="card-body py-2">
                        <i class="fas fa-layer-group text-warning fa-2x mb-1"></i>
                        <h6 class="mt-1 mb-0">Peso en BSC</h6>
                        <h5 class="fw-bold">${indicador.dimension_porcentual || 0}%</h5>
                    </div>
                </div>
            </div>

        </div>
    `;

        // ----------------------------------------------------
        // Diccionarios (los tuyos)
        // ----------------------------------------------------
        const tipos = { 1: 'Estratégico', 2: 'Táctico', 3: 'Operativo' };
        const dimensiones = { 1: 'Financiera', 2: 'Clientes', 3: 'Procesos', 4: 'Capital Humano' };
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


        // ----------------------------------------------------
        // Campos principales
        // ----------------------------------------------------
        const campos = {
            "Código": indicador.codigo_id,
            "Nombre": indicador.nombre,
            "Descripción": indicador.descripcion || '-',
            "Objetivo": indicador.objetivo || '-',

            "Destino": `
                ${indicador.destino_nombre || '-'}
                <br><b>Peso:</b> ${peso}% 
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <b>Global:</b> ${pesoGlobal}%
            `,

            "__sep1__": null,
            "Tipo": `${indicador.tipo_id} - ${tipos[indicador.tipo_id]}`,
            "Perspectiva (BSC)": `
                ${indicador.dimension_id} -  ${dimensiones[indicador.dimension_id] || '-'}
                <br><b>Peso:</b> ${pesoPerspectiva}% 
            `,
            "Criticidad": `${indicador.criticidad_id} - ${criticidades[indicador.criticidad_id]}`,
            "__sep2__": null,
            "Tipo de Meta": `${indicador.meta_tipo} - ${tiposMeta[indicador.meta_tipo]}`
        };


        // Según meta
        if (indicador.meta_tipo === 1) {
            Object.assign(campos, {
                "Valor Meta": `${indicador.unico_valor || '-'} - ${CodigosService.getNombreCodigo(indicador.unidad_medida)}`,
                "Método de evaluación": evaluaciones[indicador.unico_eval] || '-',
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
                "Tendencia Tipo": tendencias[indicador.tenden_tipo] || '-',
                "Tendencia Referencia": indicador.tenden_refe || '-',
                "__sep5__": null
            });
        }

        // Campos extra
        Object.assign(campos, {
            "Fuente de Datos": indicador.fuente_datos || '-',
            "Fórmula de Cálculo": indicador.formula_calculo || '-',
            "Frecuencia de Medición": CodigosService.getNombreCodigo(indicador.freq_medicion),
            "Fecha de Inicio": indicador.fecha_inicio ? new Date(indicador.fecha_inicio).toLocaleDateString('es-AR') : '-',
            "__sep6__": null,
            "Comentarios": indicador.comentarios || '-'
        });


        // ----------------------------------------------------
        // Render de tabla
        // ----------------------------------------------------
        const tabla = document.getElementById("tablaDetalleIndicador");
        tabla.innerHTML = "";

        for (const [campo, valor] of Object.entries(campos)) {

            if (campo.startsWith("__sep")) {
                const sepRow = document.createElement("tr");
                sepRow.innerHTML = `<td colspan="2" class="py-2"></td>`;
                tabla.appendChild(sepRow);
                continue;
            }

            //             if (campo.startsWith("__sep")) {
            //     const trSep = document.createElement("tr");
            //     trSep.innerHTML = `<td colspan="2" class="bg-light"></td>`;
            //     tabla.appendChild(trSep);
            //     continue;
            // }

            const fila = document.createElement("tr");
            const th = document.createElement("th");

            th.style.width = "200px";
            th.innerHTML = campo;

            const td = document.createElement("td");
            td.innerHTML = valor;

            fila.appendChild(th);
            fila.appendChild(td);
            tabla.appendChild(fila);
        }


        // ----------------------------------------------------
        // Mostrar Modal
        // ----------------------------------------------------
        const modal = new bootstrap.Modal(document.getElementById('modalDetalleIndicador'));
        modal.show();


    } catch (error) {
        console.error("Error al obtener el detalle:", error);
        alert("No se pudo obtener el detalle del indicador.");
    }
}
