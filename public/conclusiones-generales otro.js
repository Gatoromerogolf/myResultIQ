document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 🔹 Obtenemos datos globales desde localStorage (guardados previamente)
    const resumenGlobal = JSON.parse(localStorage.getItem('resumenGlobal')) || {};

    // 🔹 Obtenemos cumplimiento por destino desde tu API existente
    const res = await fetch('/api/cumplimiento-por-destino');
    const destinos = await res.json();

    // =========================
    // 🧠 CONCLUSIONES GENERALES
    // =========================
    const variacion = parseFloat(resumenGlobal.variacion || 0);
    const promedioHistorico = parseFloat(resumenGlobal.promHistorico || 0);
    const promedioAnual = parseFloat(resumenGlobal.promAnual || 0);
    const tendencia = resumenGlobal.tendencia || 'Estable';
    const cumplimientoGlobal = parseFloat(resumenGlobal.cumplimiento || 0);
    const cobertura = 777;

    const narrativa = `
            El cumplimiento global de la organización se mantiene
                <strong>${variacion > 0 ? 'en alza' : variacion < 0 ? 'ligeramente descendente' : 'estable'}</strong>,
                con una variación de <strong>${variacion}%</strong> respecto al mes anterior.
                El promedio histórico alcanza <strong>${promedioHistorico}%</strong> y el promedio anual se ubica en
                <strong>${promedioAnual}%</strong>, mostrando una tendencia general <strong>${tendencia}</strong>.

                <br><br>El nivel de cumplimiento actual es de <strong>${cumplimientoGlobal}%</strong>,
                lo que refleja un desempeño
                ${cumplimientoGlobal >= 85 ? 'altamente satisfactorio' :
                    cumplimientoGlobal >= 70 ? 'consistente, con margen de mejora' :
                    cumplimientoGlobal >= 50 ? 'moderado, requiriendo atención en varias áreas' :
                    'crítico, con necesidad de intervención inmediata'}.

                <br><br>La cobertura de mediciones alcanza el <strong>${cobertura}%</strong> de los destinos,
                lo que indica un seguimiento
                ${cobertura >= 95 ? 'óptimo' :
                    cobertura >= 80 ? 'satisfactorio' :
                    'insuficiente, con oportunidades de mejora en la carga de datos'}.

                <br><br>Entre los destinos con <strong>mejor desempeño</strong> se destacan:
                <strong>${top3.join(', ') || 'sin datos suficientes'}</strong>.
                En contraste, los destinos con <strong>menor nivel de cumplimiento</strong> fueron:
                <strong>${bottom3.join(', ') || 'sin datos suficientes'}</strong>.

                ${destinosSinMediciones.length
                    ? `<br><br>Se detectaron <strong>${destinosSinMediciones.length}</strong> destino(s) sin mediciones registradas, lo que sugiere revisar la cobertura de seguimiento en dichas áreas.`
                    : ''
                }
                `;

    document.getElementById('narrativaGeneral').innerHTML = narrativa;

    // =========================
    // 📋 TABLA DE DESTINOS
    // =========================
    const tbody = document.querySelector('#tablaDestinos tbody');
    tbody.innerHTML = destinos
      .sort((a, b) => b.promedio_cumplimiento - a.promedio_cumplimiento)
      .map(d => {
        const color =
          d.promedio_cumplimiento >= 80 ? 'text-success' :
          d.promedio_cumplimiento >= 50 ? 'text-warning' : 'text-danger';
        return `
          <tr>
            <td>${d.destino}</td>
            <td class="${color} fw-semibold">${d.promedio_cumplimiento?.toFixed(2) ?? '-'}</td>
            <td class="text-center">${d.total_indicadores}</td>
          </tr>
        `;
      })
      .join('');

  } catch (err) {
    console.error('Error cargando conclusiones:', err);
    document.getElementById('narrativaGeneral').textContent = 'Error al obtener las conclusiones.';
  }
});
