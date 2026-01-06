let salesChart = null; // Variable global para el gráfico

// Función para renderizar el gráfico de un indicador
// 🚫🚫🚫  renderIndicadorChart
async function renderIndicadorChart(idIndicador, nombre, meta, descripcion, metodo) {

    try {
        const response = await fetch(`/api/mediciones/${idIndicador}`);
        const result = await response.json();

        const chartContainer = document.querySelector('#sales-chart');

        if (!chartContainer) {
            console.error('Contenedor #sales-chart no encontrado');
            return;
        }

        if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
            if (window.salesChart) {
                try { await window.salesChart.destroy(); } catch (e) { }
                window.salesChart = null;
            }
            chartContainer.innerHTML = '<p class="text-center">Sin datos</p>';
            return;
        }

        const valores = result.data.map(d => parseFloat(d.med_valor) || 0);
        const periodos = result.data.map(d => {
            const str = String(d.med_valor_periodo);
            const year = str.slice(0, 4);
            const sufijo = str.slice(4);
            return `${year}-${sufijo}`;
        });
        const cumplimientos = result.data.map(d => parseFloat(d.med_cumplimiento) || 0);

        const options = {
            chart: {
                type: 'area',
                height: 350,
                toolbar: {
                    show: true,
                    tools: {
                        pan: false, // 🔒 desactiva Panning
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        reset: true,
                        download: true,
                        selection: true
                    }
                }
            },
            series: [{ name: 'Valor', data: valores }],
            xaxis: { categories: periodos },
            stroke: { curve: 'smooth' },
            tooltip: { enabled: true },
            colors: ['#0d6efd'],
            // title: { text: 'Evolución histórica', align: 'left' },
            dataLabels: { enabled: false },

            // 👇 NUEVO BLOQUE: línea de meta / objetivo
            annotations: {
                yaxis: [
                    {
                        y: meta, // ← tu variable con el valor objetivo
                        borderColor: '#FF0000',
                        strokeDashArray: 4,
                        label: {
                            borderColor: '#FF0000',
                            style: {
                                color: '#fff',
                                background: '#FF0000'
                            },
                            text: `Meta: ${meta}`
                        }
                    }
                ]
            }
        };

        if (window.salesChart) {
            try { await window.salesChart.destroy(); } catch (err) { console.warn('Error al destruir gráfico previo:', err); }
            window.salesChart = null;
        }

        document.getElementById('indNombre').textContent = nombre;
        document.getElementById('descripcionGraf').textContent = descripcion;
        document.getElementById('metaGraf').textContent = meta;
        document.getElementById('evaluaGraf').textContent = CodigosService.getNombreCodigo(metodo) || metodo;
        chartContainer.innerHTML = "";

        await new Promise(resolve => setTimeout(resolve, 50));

        window.salesChart = new ApexCharts(chartContainer, options);

        await window.salesChart.render();

        const el = document.querySelector("#sales-chart");

        // 🔄 Botones para cambiar tipo de gráfico
        document.getElementById('btnLine').onclick = () => {
            window.salesChart.updateOptions({ chart: { type: 'line' } });
        };
        document.getElementById('btnArea').onclick = () => {
            window.salesChart.updateOptions({ chart: { type: 'area' } });
        };
        document.getElementById('btnBar').onclick = () => {
            window.salesChart.updateOptions({ chart: { type: 'bar' } });
        };

        // ☎️ calcula Tendencia
        const resultado = evaluarTendenciaIndicador(valores);

        // ✅ generar tarjetas KPI dinámicas

        const valorActual = valores[valores.length - 1];
        const valorAnterior = valores[valores.length - 2];
        const promedio = Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
        let mejorMes = 0;

        if (metodo == "0401") {
            mejorMes = Math.max(...valores);
        }
        else {
            mejorMes = Math.min(...valores);
        }
        const cambio = Math.round(((valorActual - valorAnterior) / valorAnterior) * 100);
        const cumplimiento = cumplimientos[cumplimientos.length - 1];
        const cumplimientoAnterior = cumplimientos.length >= 2 ? cumplimientos[cumplimientos.length - 2] : 0;

        crearKPICards({
            valorActual: valorActual,
            cambio: valores.length > 1 && valorAnterior !== 0
                ? ((valorActual - valorAnterior) / valorAnterior * 100).toFixed(1)
                : 0,
            cumplimiento: cumplimiento,
            meta: meta,
            promedio6: (valores.slice(-6).reduce((a, b) => a + b, 0) / Math.min(6, valores.length)).toFixed(1),
            rangoMeses: "Últimas 6 mediciones",
            mejorMesValor: mejorMes,
            mejorMesNombre: periodos[valores.indexOf(mejorMes)],
            tendencia: resultado.tendencia,
            variacion: ` Variación: ${resultado.variacion} | Pendiente: ${resultado.pendiente}`,
            iconoTendencia: resultado.icono,
            colorTendencia: resultado.color
        });

        const primerValor = valores[0];
        const ultimoValor = valorActual;
        const crecimientoTotal = Math.round(((ultimoValor - primerValor) / primerValor) * 100);
        const brechaPromedio = Math.round(promedio - meta);
        const mejorIndice = valores.indexOf(mejorMes);
        const peorValor = Math.min(...valores);
        const peorIndice = valores.indexOf(peorValor);

        // const varianza = valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length;
        // const desviacion = Math.sqrt(varianza);
        // if (desviacion > promedio * 0.2) {
        //     recomendaciones.push('Alta variabilidad en resultados - considerar estabilizar procesos');
        // }

        console.log('Datos para análisis:', {
            valores,
            periodos,
            meta,
            metodo,
            primerValor,
            ultimoValor,
            valorAnterior,
            crecimientoTotal,
            brechaPromedio,
            mejorIndice,
            mejorMes,
            peorValor,
            peorIndice,
            promedio,
            cumplimiento
        });

        const { observaciones, recomendaciones } = generarAnalisisAutomatico(
            valores,
            periodos,
            meta,
            metodo,
            primerValor,
            ultimoValor,
            valorAnterior,
            crecimientoTotal,
            brechaPromedio,
            mejorIndice,
            mejorMes,
            peorValor,
            peorIndice,
            promedio,
            cumplimiento
        );
        const container = document.getElementById('analisisContainer');
        document.getElementById('analisis-automatico').style.display = 'block';

        container.innerHTML = `
                        <div class="col-md-6">
                            <h5 class="fw-semibold mb-3">🔍 Observaciones:</h5>
                            <ul class="text-muted">
                                ${observaciones.map(obs => `<li>${obs}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <h5 class="fw-semibold mb-3">💡 Recomendaciones:</h5>
                            <ul class="text-muted">
                                ${recomendaciones.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        </div>
                    `;

    } catch (error) {
        console.error('Error renderizando gráfico del indicador:', error);
    }
}

// 🚫🚫🚫  generarAnalisisAutomatico
function generarAnalisisAutomatico(
    valores,
    periodos,
    meta,
    metodo,
    primerValor,
    ultimoValor,
    valorAnterior,
    crecimientoTotal,
    brechaPromedio,
    mejorIndice,
    mejorMes,
    peorValor,
    peorIndice,
    promedio,
    cumplimiento
) {

    const observaciones = [];
    const recomendaciones = [];

    // -----------------------------
    // AYUDANTES
    // -----------------------------
    const direccion = (metodo == "0402" || metodo == "0404") ? 'menor' : 'mayor';

    const esMejor = (valorActual, valorComparado) => {
        return direccion === 'mayor'
            ? valorActual > valorComparado
            : valorActual < valorComparado;
    };

    const diferenciaVsMeta = ultimoValor - meta;
    const porEncimaMeta = ultimoValor > meta;

    // Variabilidad
    const varianza = valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length;
    const desviacion = Math.sqrt(varianza);


    if (desviacion > promedio * 0.2) {
        recomendaciones.push('Alta variabilidad en resultados - considerar estabilizar procesos');
    }

    // -----------------------------
    // OBSERVACIONES SEGÚN MÉTODO
    // -----------------------------

    // ---- Método 0401: MÁS ES MEJOR ----
    if (metodo == "0401") {

        if (crecimientoTotal > 0) {
            observaciones.push(`Crecimiento positivo del ${crecimientoTotal}% en el período analizado`);
        } else if (crecimientoTotal < 0) {
            observaciones.push(`Caída del ${Math.abs(crecimientoTotal)}% en el período analizado`);
        }

        // Tendencia sostenida de crecimiento
        let mesesCrecimiento = 0;
        for (let i = 1; i < valores.length; i++) {
            if (valores[i] > valores[i - 1]) {
                mesesCrecimiento++;
            } else break;
        }
        if (mesesCrecimiento >= 2) {
            observaciones.push(`Crecimiento sostenido durante ${mesesCrecimiento + 1} períodos consecutivos`);
        }

        observaciones.push(`Mejor resultado en ${periodos[mejorIndice]}: ${mejorMes}`);
        observaciones.push(`Valor más bajo en ${periodos[peorIndice]}: ${peorValor}`);

        if (ultimoValor > meta) {
            observaciones.push(`Superó la meta actual`);
        } else {
            observaciones.push(`A ${Math.abs(diferenciaVsMeta)} unidades de alcanzar la meta`);
        }

        if (brechaPromedio < 0) {
            observaciones.push(`Brecha promedio vs meta: ${Math.abs(brechaPromedio)} por debajo del objetivo`);
        } else {
            observaciones.push(`Superó la meta en promedio por ${brechaPromedio} unidades`);
        }

        // Variabilidad

        if (desviacion > promedio * 0.2) {
            observaciones.push('El indicador presenta alta variabilidad en el período analizado');
        } else if (desviacion < promedio * 0.05) {
            observaciones.push('El indicador se mantuvo estable durante el período');
        }

    }

    // ---- Método 0402: NO SUPERAR META ----
    if (metodo == "0402") {

        if (porEncimaMeta) {
            observaciones.push(`El indicador superó el límite máximo permitido`);
        } else {
            observaciones.push(`Valor dentro de los límites (${ultimoValor} ≤ ${meta})`);
        }

        if (ultimoValor < valorAnterior) {
            observaciones.push(`Mejora: el indicador disminuyó respecto al mes anterior`);
        } else {
            observaciones.push(`Empeoramiento: el valor aumentó y se acerca al límite máximo`);
        }

        observaciones.push(
            `Mejor valor en ${periodos[peorIndice]}: ${peorValor} (al ser menor es mejor)`
        );

        if (brechaPromedio < 0) {
            observaciones.push(`Brecha promedio vs meta: ${Math.abs(brechaPromedio)} por debajo, cumpliendo el objetivo`);
        } else {
            observaciones.push(`Superó el valor admitido en ${brechaPromedio} unidades en promedio`);
        }

        // Tendencia sostenida de crecimiento
        let mesesCrecimiento = 0;
        for (let i = 1; i < valores.length; i++) {
            if (valores[i] < valores[i - 1]) {
                mesesCrecimiento++;
            } else break;
        }
        if (mesesCrecimiento >= 2) {
            observaciones.push(`Disminución sostenida durante ${mesesCrecimiento + 1} períodos consecutivos`);
        }

        // Variabilidad
        if (desviacion > promedio * 0.2) {
            observaciones.push('El indicador presenta alta variabilidad en el período analizado');
        } else if (desviacion < promedio * 0.05) {
            observaciones.push('El indicador se mantuvo estable durante el período');
        }
    }

    // ---- Método 0404: PARTIDA ALTA, DEBE BAJAR HASTA META ----
    if (metodo == "0404") {

        if (ultimoValor < primerValor) {
            observaciones.push(`Tendencia correcta: el indicador viene disminuyendo`);
        }

        if (ultimoValor <= meta) {
            observaciones.push(`Alcanzó o superó la meta de reducción`);
        } else {
            observaciones.push(`Aún falta reducir ${ultimoValor - meta} unidades para llegar al objetivo`);
        }

        if (ultimoValor < valorAnterior) {
            observaciones.push(`Nueva disminución mensual, lo cual es positivo`);
        }

        if (brechaPromedio < 0) {
            observaciones.push(`Brecha promedio vs meta: ${Math.abs(brechaPromedio)} por debajo, cumpliendo el objetivo`);
        } else {
            observaciones.push(`Superó el valor admitido en ${brechaPromedio} unidades en promedio`);
        }

        // Variabilidad

        if (desviacion > promedio * 0.2) {
            observaciones.push('El indicador presenta alta variabilidad en el período analizado');
        } else if (desviacion < promedio * 0.05) {
            observaciones.push('El indicador se mantuvo estable durante el período');
        }

    }

    // -----------------------------
    // RECOMENDACIONES GENERALES
    // -----------------------------

    if (valores.length < 3) {
        recomendaciones.push('Baja representatividad de la serie.  Se requiere mayor número de mediciones para elaborar un análisis estadístico confiable.');
        return { observaciones, recomendaciones };
    }

    if (metodo == "0401") {
        if (ultimoValor < meta) {
            recomendaciones.push(`Reforzar acciones para impulsar crecimiento hacia la meta`);
        }
        if (ultimoValor > meta) {
            recomendaciones.push(`Mantener estrategias actuales que permiten superar la meta`);
        }

        // 1️⃣ Replicar buenas prácticas del mejor mes
        if (mejorIndice < valores.length - 1) {
            recomendaciones.push(`Analizar factores de éxito de ${periodos[mejorIndice]} para replicarlos`);
        }

        // 3️⃣ Comportamiento reciente
        if (ultimoValor > valorAnterior) {
            recomendaciones.push('Mantener las estrategias recientes que impulsaron la mejora');
        } else if (ultimoValor < valorAnterior) {
            recomendaciones.push('Investigar causas de la caída reciente y tomar acciones correctivas');
        }

        // 5️⃣ Tendencia reciente positiva
        const tendenciaReciente = valores.slice(-3);
        const crecimientoReciente = tendenciaReciente.every((val, i) => i === 0 || val >= tendenciaReciente[i - 1]);
        if (crecimientoReciente) {
            recomendaciones.push('Tendencia positiva en los últimos meses - continuar con la estrategia actual');
        }

        // 6️⃣ Meta difícil de alcanzar
        const periodosBajos = valores.filter(v => v < meta * 0.7).length;
        if (cumplimiento < 70 && periodosBajos >= 3) {
            recomendaciones.push('El cumplimiento ha sido bajo durante varios períodos - revisar si la meta es alcanzable en condiciones normales');
        }

        // 7️⃣ Meta demasiado baja
        const periodosAltos = valores.filter(v => v > meta * 1.1).length;
        if (periodosAltos >= 3) {
            recomendaciones.push('El indicador supera la meta en varios períodos consecutivos - evaluar si la meta está subestimada');
        }

        // 8️⃣ Estancamiento o falta de progreso
        const sinCambio = valores.every(v => Math.abs(v - promedio) < promedio * 0.02);
        if (sinCambio) {
            recomendaciones.push('El indicador muestra estancamiento - revisar estrategias o reasignar recursos');
        }


        // 9️⃣ Buen desempeño sostenido
        if (cumplimiento >= 90 && desviacion < promedio * 0.1) {
            recomendaciones.push('Buen desempeño y estabilidad - mantener consistencia en las acciones implementadas');
        }

        // 🔟 Datos escasos o irregulares
        if (valores.length < 3) {
            recomendaciones.push('Baja representatividad de la serie.  Se requiere mayor número de mediciones para elaborar un análisis estadístico confiable.');
        }
    }

    if (metodo == "0402") {  // no superar meta
        if (porEncimaMeta) {
            recomendaciones.push(`Acciones urgentes para reducir valores debajo del límite máximo`);
        } else {
            recomendaciones.push(`Mantener controles para evitar superar la meta`);
        }

        // 1️⃣ Replicar buenas prácticas del mejor mes
        if (mejorIndice < valores.length - 1) {
            recomendaciones.push(`Analizar factores de éxito de ${periodos[mejorIndice]} para replicarlos`);
        }

        // 3️⃣ Comportamiento reciente
        if (ultimoValor > valorAnterior) {
            recomendaciones.push('Observar el crecimiento reciente, ya que puede atentar contra el cumplimiento del objetivo');
        } else if (ultimoValor < valorAnterior) {
            recomendaciones.push('La medición reciente favorece el cumplimiento de la meta.  Tendencia deseable');
        }

        // 5️⃣ Tendencia reciente positiva
        const tendenciaReciente = valores.slice(-3);
        const crecimientoReciente = tendenciaReciente.every((val, i) => i === 0 || val >= tendenciaReciente[i - 1]);
        if (crecimientoReciente) {
            recomendaciones.push('Tendencia positiva en los últimos meses - continuar con la estrategia actual');
        }

        // 6️⃣ Meta difícil de alcanzar
        const periodosBajos = valores.filter(v => v < meta * 0.7).length;
        if (cumplimiento < 70 && periodosBajos >= 3) {
            recomendaciones.push('El cumplimiento ha sido bajo durante varios períodos - revisar si la meta es alcanzable en condiciones normales');
        }

        // 7️⃣ Meta demasiado baja
        const periodosAltos = valores.filter(v => v > meta * 1.1).length;
        if (periodosAltos >= 3) {
            recomendaciones.push('El indicador supera la meta en varios períodos consecutivos - evaluar si la meta está subestimada');
        }

        // 8️⃣ Estancamiento o falta de progreso
        const sinCambio = valores.every(v => Math.abs(v - promedio) < promedio * 0.02);
        if (sinCambio) {
            recomendaciones.push('El indicador muestra estancamiento - revisar estrategias o reasignar recursos');
        }


        // 9️⃣ Buen desempeño sostenido
        if (cumplimiento >= 90 && desviacion < promedio * 0.1) {
            recomendaciones.push('Buen desempeño y estabilidad - mantener consistencia en las acciones implementadas');
        }

        // 🔟 Datos escasos o irregulares
        if (valores.length < 3) {
            recomendaciones.push('Baja representatividad de la serie.  Se requiere mayor número de mediciones para elaborar un análisis estadístico confiable.');
        }
    }

    if (metodo == "0404") {  // PARTIDA ALTA, DEBE BAJAR HASTA META ----
        if (ultimoValor < meta) {
            recomendaciones.push(`Consolidar medidas para sostener la reducción del indicador`);
        } else {
            recomendaciones.push(`El nivel está por encima de la meta: realizar monitoreo preventivo`);
        }

        // 1️⃣ Replicar buenas prácticas del mejor mes
        if (mejorIndice < valores.length - 1) {
            recomendaciones.push(`Analizar factores de éxito de ${periodos[mejorIndice]} para replicarlos`);
        }

        // 3️⃣ Comportamiento reciente
        if (ultimoValor < valorAnterior) {
            recomendaciones.push('Mantener las estrategias recientes que impulsaron la mejora');
        } else if (ultimoValor < valorAnterior) {
            recomendaciones.push('Investigar causas de la medición reciente y tomar acciones correctivas');
        }

        // 5️⃣ Tendencia reciente positiva
        const tendenciaReciente = valores.slice(-3);
        const crecimientoReciente = tendenciaReciente.every((val, i) => i === 0 || val >= tendenciaReciente[i - 1]);
        if (crecimientoReciente) {
            recomendaciones.push('Tendencia negativa en los últimos meses - analizar la estrategia actual');
        }

        // 6️⃣ Meta difícil de alcanzar
        const periodosBajos = valores.filter(v => v < meta * 0.7).length;
        if (cumplimiento < 70 && periodosBajos >= 3) {
            recomendaciones.push('El cumplimiento ha sido efectivo durante varios períodos - analizar la conveniencia de establecer una meta más ambiciosa y no subestimada.');
        }

        // 7️⃣ Meta demasiado baja
        const periodosAltos = valores.filter(v => v > meta * 1.1).length;
        if (periodosAltos >= 3) {
            recomendaciones.push('El indicador no logra alcanzar la meta en varios períodos consecutivos - evaluar si la meta está adecuadamente establecida o existen condiciones que merecenrevisión.');
        }

        // 8️⃣ Estancamiento o falta de progreso
        const sinCambio = valores.every(v => Math.abs(v - promedio) < promedio * 0.02);
        if (sinCambio) {
            recomendaciones.push('El indicador muestra estancamiento - revisar estrategias o reasignar recursos');
        }


        // 9️⃣ Buen desempeño sostenido
        if (cumplimiento >= 90 && desviacion < promedio * 0.1) {
            recomendaciones.push('Buen desempeño y estabilidad - mantener consistencia en las acciones implementadas');
        }

        // 🔟 Datos escasos o irregulares
        if (valores.length < 3) {
            recomendaciones.push('Baja representatividad de la serie.  Se requiere mayor número de mediciones para elaborar un análisis estadístico confiable.');
        }
    }

    // -----------------------------
    // ANALISIS ESTADÍSTICO (IGUAL)
    // -----------------------------
    if (desviacion > promedio * 0.2) {
        recomendaciones.push("Alta variabilidad en resultados - considerar estabilizar procesos");
    }
    return { observaciones, recomendaciones };
}