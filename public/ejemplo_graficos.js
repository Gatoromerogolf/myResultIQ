import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine, AreaChart, Area } from 'recharts';

const ROIDashboard = () => {
  const [vistaActiva, setVistaActiva] = useState('tendencia');
  
  // Datos del ROI
  const datos = [
    { mes: 'Ene 2025', valor: 98, meta: 300, brecha: -202 },
    { mes: 'Feb 2025', valor: 135, meta: 300, brecha: -165 },
    { mes: 'Mar 2025', valor: 180, meta: 300, brecha: -120 },
    { mes: 'Apr 2025', valor: 210, meta: 300, brecha: -90 },
    { mes: 'May 2025', valor: 180, meta: 300, brecha: -120 },
    { mes: 'Jun 2025', valor: 195, meta: 300, brecha: -105 }
  ];
  
  // Cálculos para KPIs
  const valorActual = datos[datos.length - 1].valor;
  const valorAnterior = datos[datos.length - 2].valor;
  const promedio = Math.round(datos.reduce((sum, item) => sum + item.valor, 0) / datos.length);
  const mejorMes = Math.max(...datos.map(d => d.valor));
  const tendencia = valorActual > valorAnterior ? 'up' : 'down';
  const cambio = Math.round(((valorActual - valorAnterior) / valorAnterior) * 100);
  const cumplimientoMeta = Math.round((valorActual / 300) * 100);

  const KPICard = ({ titulo, valor, subtitulo, color, icono }) => (
    <div className="bg-white rounded-lg shadow-lg p-4 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{titulo}</p>
          <p className="text-2xl font-bold" style={{ color }}>{valor}</p>
          {subtitulo && <p className="text-sm text-gray-500">{subtitulo}</p>}
        </div>
        <div className="text-3xl" style={{ color }}>{icono}</div>
      </div>
    </div>
  );

  const GraficoTendencia = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={datos} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mes" />
        <YAxis />
        <Tooltip 
          formatter={(value, name) => [
            name === 'valor' ? `$${value}` : `$${value}`,
            name === 'valor' ? 'ROI Actual' : 'Meta'
          ]}
        />
        <Legend />
        <ReferenceLine y={300} stroke="#dc3545" strokeDasharray="5 5" label="Meta: $300" />
        <Line 
          type="monotone" 
          dataKey="valor" 
          stroke="#0d6efd" 
          strokeWidth={3}
          dot={{ fill: '#0d6efd', strokeWidth: 2, r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="meta" 
          stroke="#dc3545" 
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const GraficoBarras = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={datos} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mes" />
        <YAxis />
        <Tooltip formatter={(value) => [`$${value}`, 'ROI']} />
        <Legend />
        <ReferenceLine y={300} stroke="#dc3545" strokeDasharray="5 5" />
        <Bar 
          dataKey="valor" 
          fill="#0d6efd"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const GraficoArea = () => (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={datos} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mes" />
        <YAxis />
        <Tooltip formatter={(value) => [`$${value}`, 'ROI']} />
        <Legend />
        <ReferenceLine y={300} stroke="#dc3545" strokeDasharray="5 5" label="Meta" />
        <Area 
          type="monotone" 
          dataKey="valor" 
          stroke="#0d6efd" 
          fill="#0d6efd" 
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const GraficoBrecha = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={datos} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mes" />
        <YAxis />
        <Tooltip 
          formatter={(value) => [
            `$${Math.abs(value)}`, 
            value < 0 ? 'Brecha vs Meta' : 'Superó Meta'
          ]}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#000" />
        <Bar 
          dataKey="brecha" 
          fill="#dc3545"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard ROI Marketing
          </h1>
          <p className="text-gray-600">
            Retorno de inversión generado por campañas y actividades de marketing
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard 
            titulo="ROI Actual (Jun 2025)"
            valor={`$${valorActual}`}
            subtitulo={`${tendencia === 'up' ? '↗️' : '↘️'} ${cambio > 0 ? '+' : ''}${cambio}% vs mes anterior`}
            color={tendencia === 'up' ? '#198754' : '#dc3545'}
            icono="💰"
          />
          
          <KPICard 
            titulo="Cumplimiento Meta"
            valor={`${cumplimientoMeta}%`}
            subtitulo={`Meta: $300`}
            color={cumplimientoMeta >= 100 ? '#198754' : '#ffc107'}
            icono="🎯"
          />
          
          <KPICard 
            titulo="Promedio 6 meses"
            valor={`$${promedio}`}
            subtitulo="Ene - Jun 2025"
            color="#6c757d"
            icono="📊"
          />
          
          <KPICard 
            titulo="Mejor Resultado"
            valor={`$${mejorMes}`}
            subtitulo="Abril 2025"
            color="#0dcaf0"
            icono="🏆"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            {[
              { key: 'tendencia', label: 'Tendencia', icon: '📈' },
              { key: 'barras', label: 'Comparativo', icon: '📊' },
              { key: 'area', label: 'Evolución', icon: '📉' },
              { key: 'brecha', label: 'Brecha vs Meta', icon: '🎯' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setVistaActiva(tab.key)}
                className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                  vistaActiva === tab.key 
                    ? 'border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chart Container */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {vistaActiva === 'tendencia' && 'Evolución del ROI - Enero a Junio 2025'}
              {vistaActiva === 'barras' && 'Comparativo Mensual del ROI'}
              {vistaActiva === 'area' && 'Evolución Acumulativa del ROI'}
              {vistaActiva === 'brecha' && 'Brecha vs Meta por Mes'}
            </h2>
          </div>
          
          {vistaActiva === 'tendencia' && <GraficoTendencia />}
          {vistaActiva === 'barras' && <GraficoBarras />}
          {vistaActiva === 'area' && <GraficoArea />}
          {vistaActiva === 'brecha' && <GraficoBrecha />}
        </div>

        {/* Insights */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Análisis y Recomendaciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">🔍 Observaciones Clave:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Crecimiento sostenido enero-abril (+114%)</li>
                <li>• Mejor resultado en abril: $210</li>
                <li>• Caída en mayo (-14%), recuperación en junio</li>
                <li>• Brecha promedio vs meta: -$133</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">💡 Recomendaciones:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Analizar factores del éxito de abril</li>
                <li>• Investigar causas de la caída de mayo</li>
                <li>• Mantener tendencia positiva de junio</li>
                <li>• Requiere +54% para alcanzar meta</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROIDashboard;

// //
// ¡Perfecto! He creado un dashboard completo con tus datos de ROI de marketing. El dashboard incluye:
// 📊 Características principales:
// 1. KPI Cards en la parte superior:

// ROI actual con tendencia
// % de cumplimiento vs meta
// Promedio de 6 meses
// Mejor resultado del período

// 2. Cuatro tipos de visualizaciones:

// Tendencia: Línea con meta como referencia
// Comparativo: Barras mensuales
// Evolución: Gráfico de área
// Brecha vs Meta: Muestra qué tan lejos estás de la meta

// 3. Análisis automático:

// Observaciones clave sobre tu performance
// Recomendaciones basadas en los datos

// 🎯 Insights de tus datos:

// Tendencia positiva: Creciste de $98 a $195 (+99% en 6 meses)
// Mejor mes: Abril con $210
// Desafío: Aún estás 35% por debajo de la meta ($300)
// Oportunidad: La caída de mayo se recuperó en junio

// 📈 Para presentaciones ejecutivas:

// Usa las KPI Cards para el resumen ejecutivo
// El gráfico de Tendencia es perfecto para mostrar progreso
// El de Brecha vs Meta es ideal para mostrar el gap a cerrar

// 📋 Para análisis operativo:

// El Comparativo te ayuda a identificar meses exitosos
// Las recomendaciones te dan próximos pasos claros

// ¿Te gusta cómo quedó? ¿Quieres que ajuste algún aspecto específico o que agregue algún otro tipo de visualización?ReintentarClaude puede cometer errores. Verifique las respuestas.