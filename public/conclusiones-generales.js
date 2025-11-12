// 📄 conclusiones-generales.js
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // === 1️⃣ Obtener datos de cumplimiento por destino ===
        const res = await fetch('/api/cumplimiento-por-destino');
        const data = await res.json();

        // Validar formato de datos
        const destinos = Array.isArray(data) ? data : [];

        // Normalizar valores numéricos
        const procesados = destinos.map(d => ({
            ...d,
            promedio_cumplimiento: Number(d.promedio_cumplimiento) || 0,
            en_meta: Number(d.en_meta) || 0,
            criticos: Number(d.criticos) || 0,
            total_indicadores: Number(d.total_indicadores) || 0,
        }));

        // === 2️⃣ Obtener los datos globales desde el dashboard principal ===
        const dataGlobal = obtenerDatosGlobalesDesdeDashboard();

        // === 3️⃣ Mostrar narrativa y conclusiones ===
        mostrarNarrativaGlobal(dataGlobal);
        mostrarConclusiones(procesados);

    } catch (error) {
        console.error('Error cargando conclusiones:', error);
        const contenedor = document.getElementById('narrativaGeneral');
        if (contenedor)
            contenedor.innerHTML = `<div class="alert alert-danger">Error al generar las conclusiones.</div>`;
    }
});

/**
 * 🧩 Extrae los valores globales del dashboard principal
 */
function obtenerDatosGlobalesDesdeDashboard() {
    const data = JSON.parse(localStorage.getItem('resumenGlobal') || '{}');

    return {
        variacionMensual: parseFloat(data.variacion) || 0,
        promedioHistorico: parseFloat(data.promHistorico) || 0,
        promedioAnual: parseFloat(data.promAnual) || 0,
        tendencia: parseFloat(
            (data.tendencia || '').replace('%', '').replace('+', '').replace('–', '-')
        ) || 0,
        cumplimientoGlobal: parseFloat(data.cumplimiento) || 0,
        cobertura: 100 // 🔸 Se puede reemplazar por cálculo real si lo tenés
    };
}


/**
 * 🧠 Genera narrativa textual del rendimiento global
 */
function mostrarNarrativaGlobal(data) {
    // --- Análisis automático de desempeño ---
    let interpretacion = '';
    const varMes = data.variacionMensual;
    const tendencia = data.tendencia;
    const promedio = data.cumplimientoGlobal;

    if (varMes > 3 && tendencia > 0) {
        interpretacion = 'La organización muestra una mejora sostenida, con resultados en ascenso y una tendencia positiva en la mayoría de los destinos.';
    } else if (varMes > 0 && tendencia >= 0) {
        interpretacion = 'Se observa un leve crecimiento respecto al mes anterior, consolidando un rendimiento estable y controlado.';
    } else if (varMes < 0 && tendencia < 0) {
        interpretacion = 'Los valores reflejan una tendencia descendente, lo que sugiere la necesidad de acciones correctivas y mayor seguimiento.';
    } else if (promedio >= 80) {
        interpretacion = 'El nivel de cumplimiento global se mantiene alto, con un desempeño general satisfactorio y áreas puntuales de mejora.';
    } else if (promedio < 60) {
        interpretacion = 'El cumplimiento global se encuentra por debajo de los niveles esperados, siendo recomendable revisar la planificación de los objetivos y la carga de mediciones.';
    } else {
        interpretacion = 'El desempeño general es estable, sin variaciones significativas, pero con oportunidades de mejora en los destinos con menor cumplimiento.';
    }

    // --- Narrativa base ---
    const narrativa = `
      <p>
        El cumplimiento global de la organización se mantiene
        <strong>${data.variacionMensual > 0 ? 'en alza' :
        data.variacionMensual < 0 ? 'ligeramente descendente' : 'estable'}</strong>,
        con una variación de <strong>${data.variacionMensual}%</strong> respecto al mes anterior.
        El promedio histórico se ubica en <strong>${data.promedioHistorico}%</strong>,
        el promedio anual en <strong>${data.promedioAnual}%</strong> y el cumplimiento actual alcanza
        <strong>${data.cumplimientoGlobal}%</strong>.
        La cobertura de mediciones alcanza el <strong>${data.cobertura}%</strong> de los destinos,
        reflejando un seguimiento 
        ${data.cobertura > 95 ? 'óptimo' : data.cobertura > 80 ? 'satisfactorio' : 'insuficiente'}.
      </p>
      <p class="mt-3"><em>${interpretacion}</em></p>
    `;

    const contenedor = document.getElementById('narrativaGeneral');
    if (contenedor) contenedor.innerHTML = narrativa;
}

/**
 * 📊 Muestra las conclusiones generales y por destino
 */
function mostrarConclusiones(destinos) {
    if (!Array.isArray(destinos) || destinos.length === 0) {
        document.getElementById('bloqueConclusiones').innerHTML =
            '<div class="alert alert-warning">No hay datos suficientes para generar conclusiones.</div>';
        return;
    }

    // Calcular métricas generales
    const promedioGlobal = (
        destinos.reduce((acc, d) => acc + d.promedio_cumplimiento, 0) / destinos.length
    ).toFixed(2);

    const enMetaTotal = destinos.reduce((acc, d) => acc + d.en_meta, 0);
    const criticosTotal = destinos.reduce((acc, d) => acc + d.criticos, 0);
    const totalIndicadores = destinos.reduce((acc, d) => acc + d.total_indicadores, 0);

    const mejor = destinos[0];
    const peor = destinos[destinos.length - 1];

    // --- Texto resumen ---
    const resumen = `
      <h5>📈 Resumen general</h5>
      <ul>
        <li>Promedio global de cumplimiento: <strong>${promedioGlobal}%</strong></li>
        <li>Total de indicadores analizados: <strong>${totalIndicadores}</strong></li>
        <li>Indicadores en meta: <strong>${enMetaTotal}</strong></li>
        <li>Indicadores críticos: <strong>${criticosTotal}</strong></li>
        <li>Mejor desempeño: <strong>${mejor.destino}</strong> (${mejor.promedio_cumplimiento}%)</li>
        <li>Peor desempeño: <strong>${peor.destino}</strong> (${peor.promedio_cumplimiento}%)</li>
      </ul>
      <p>
        En términos comparativos, <strong>${mejor.destino}</strong> destaca por su alto cumplimiento,
        mientras que <strong>${peor.destino}</strong> requiere especial atención para revertir su
        tendencia actual. Este contraste evidencia las diferencias de gestión entre áreas y la necesidad
        de compartir buenas prácticas.
      </p>
    `;

    // --- Tabla por destino ---
    const listaDestinos = destinos
        .map((d) => `
          <tr>
            <td>${d.destino}</td>
            <td class="text-center">${d.total_indicadores}</td>
            <td class="text-center fw-semibold">${d.promedio_cumplimiento.toFixed(2)}%</td>
            <td class="text-center text-success">${d.en_meta}</td>
            <td class="text-center text-danger">${d.criticos}</td>
          </tr>
        `)
        .join('');

    const tabla = `
      <h5 class="mt-4">🏢 Cumplimiento por Destino</h5>
      <div class="table-responsive">
        <table class="table table-striped align-middle">
          <thead class="table-light">
            <tr>
              <th>Destino</th>
              <th class="text-center">Indicadores</th>
              <th class="text-center">Cumplimiento Promedio</th>
              <th class="text-center">En Meta</th>
              <th class="text-center">Críticos</th>
            </tr>
          </thead>
          <tbody>${listaDestinos}</tbody>
        </table>
      </div>
    `;

    const contenedor = document.getElementById('bloqueConclusiones');
    if (contenedor) contenedor.innerHTML = resumen + tabla;
}
