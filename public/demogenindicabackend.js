// server.js - Backend Node.js para Generador de Indicadores
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Para servir archivos estáticos

// Configuración de Claude API
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Validar que la API key esté configurada
if (!CLAUDE_API_KEY) {
    console.error('❌ CLAUDE_API_KEY no está configurada en las variables de entorno');
    process.exit(1);
}

// Simulación de base de datos (reemplazar por tu BD real)
let indicadoresDB = [];
let nextId = 1;

// Función para crear el prompt estructurado
function crearPrompt(data) {
    return `Como experto en indicadores de gestión y KPIs, necesito que me ayudes a definir indicadores para la siguiente situación:

INFORMACIÓN PROPORCIONADA:
- Área/Proceso: ${data.area}
- Descripción de actividad: ${data.descripcion}
- Objetivo principal: ${data.objetivo || 'No especificado'}
- Tipo de organización: ${data.industria || 'No especificado'}

INSTRUCCIONES:
Genera exactamente 4 indicadores relevantes y específicos para esta situación. Para cada indicador, proporciona la información en el siguiente formato JSON:

{
  "indicadores": [
    {
      "nombre": "Nombre descriptivo del indicador",
      "formula": "Fórmula matemática clara",
      "unidad": "Unidad de medida",
      "frecuencia": "Frecuencia de medición",
      "fuente": "Fuente de datos",
      "meta_sugerida": "Meta o rango objetivo",
      "descripcion": "Breve descripción del por qué es importante"
    }
  ]
}

IMPORTANTE: Responde ÚNICAMENTE con el JSON válido, sin texto adicional antes o después.`;
}

// Función para llamar a la API de Claude
async function llamarClaudeAPI(prompt) {
    try {
        const response = await axios.post(CLAUDE_API_URL, {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            temperature: 0.3,
            messages: [{
                role: 'user',
                content: prompt
            }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            }
        });

        const content = response.data.content[0].text;
        
        try {
            return JSON.parse(content);
        } catch (parseError) {
            // Intentar extraer JSON del contenido
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Respuesta no válida de Claude');
        }
    } catch (error) {
        console.error('Error llamando a Claude API:', error.response?.data || error.message);
        throw error;
    }
}

// RUTAS DE LA API

// Ruta para generar indicadores
app.post('/api/generar-indicadores', async (req, res) => {
    try {
        const { area, descripcion, objetivo, industria } = req.body;
        
        // Validaciones básicas
        if (!area || !descripcion) {
            return res.status(400).json({
                error: 'Los campos área y descripción son obligatorios'
            });
        }
        
        // Crear prompt y llamar a Claude
        const prompt = crearPrompt({ area, descripcion, objetivo, industria });
        const indicadores = await llamarClaudeAPI(prompt);
        
        // Agregar timestamp y contexto original
        const resultado = {
            ...indicadores,
            contexto: { area, descripcion, objetivo, industria },
            timestamp: new Date().toISOString()
        };
        
        res.json(resultado);
        
    } catch (error) {
        console.error('Error en /api/generar-indicadores:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// Ruta para guardar indicador seleccionado
app.post('/api/indicadores', (req, res) => {
    try {
        const indicadorData = req.body;
        
        // Validaciones
        if (!indicadorData.nombre || !indicadorData.formula) {
            return res.status(400).json({
                error: 'Nombre y fórmula son campos obligatorios'
            });
        }
        
        // Simular guardado en base de datos
        const nuevoIndicador = {
            id: nextId++,
            ...indicadorData,
            fechaCreacion: new Date().toISOString(),
            activo: true
        };
        
        indicadoresDB.push(nuevoIndicador);
        
        console.log('✅ Indicador guardado:', nuevoIndicador.nombre);
        
        res.status(201).json({
            message: 'Indicador guardado exitosamente',
            indicador: nuevoIndicador
        });
        
        // Aquí integrarías con tu base de datos real:
        // await guardarEnBaseDatos(nuevoIndicador);
        
    } catch (error) {
        console.error('Error en /api/indicadores:', error);
        res.status(500).json({
            error: 'Error al guardar indicador',
            message: error.message
        });
    }
});

// Ruta para obtener todos los indicadores
app.get('/api/indicadores', (req, res) => {
    try {
        res.json({
            indicadores: indicadoresDB,
            total: indicadoresDB.length
        });
    } catch (error) {
        console.error('Error en GET /api/indicadores:', error);
        res.status(500).json({
            error: 'Error al obtener indicadores'
        });
    }
});

// Ruta para refinar indicador con Claude
app.post('/api/refinar-indicador', async (req, res) => {
    try {
        const { indicador, pregunta, contexto } = req.body;
        
        if (!indicador || !pregunta) {
            return res.status(400).json({
                error: 'Indicador y pregunta son obligatorios'
            });
        }
        
        const promptRefinamiento = `
Como experto en indicadores de gestión, tengo el siguiente indicador que necesita refinamiento:

INDICADOR ACTUAL:
- Nombre: ${indicador.nombre}
- Fórmula: ${indicador.formula}
- Unidad: ${indicador.unidad}
- Frecuencia: ${indicador.frecuencia}

CONTEXTO ORIGINAL:
- Área: ${contexto?.area || 'No especificado'}
- Descripción: ${contexto?.descripcion || 'No especificado'}

PREGUNTA/REFINAMIENTO SOLICITADO:
${pregunta}

Por favor, proporciona una versión mejorada del indicador basada en la pregunta. Responde en formato JSON:

{
  "indicador_refinado": {
    "nombre": "Nombre mejorado",
    "formula": "Fórmula refinada",
    "unidad": "Unidad de medida",
    "frecuencia": "Frecuencia de medición",
    "fuente": "Fuente de datos",
    "meta_sugerida": "Meta sugerida",
    "descripcion": "Explicación de los cambios realizados",
    "mejoras": "Qué se mejoró específicamente"
  }
}`;
        
        const resultado = await llamarClaudeAPI(promptRefinamiento);
        res.json(resultado);
        
    } catch (error) {
        console.error('Error en /api/refinar-indicador:', error);
        res.status(500).json({
            error: 'Error al refinar indicador',
            message: error.message
        });
    }
});

// Ruta de estado/health check
app.get('/api/status', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        claude_api: CLAUDE_API_KEY ? 'Configurada' : 'No configurada'
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        error: 'Error interno del servidor'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📊 API disponible en: http://localhost:${PORT}/api/status`);
    console.log(`🌐 Frontend disponible en: http://localhost:${PORT}`);
    
    if (!CLAUDE_API_KEY) {
        console.log('⚠️  Recuerda configurar CLAUDE_API_KEY en tu archivo .env');
    } else {
        console.log('✅ Claude API configurada correctamente');
    }
});

// Funciones auxiliares para integración con base de datos real

/**
 * Ejemplo de integración con MongoDB
 */
async function guardarEnMongoDB(indicador) {
    // const { MongoClient } = require('mongodb');
    // const client = new MongoClient(process.env.MONGODB_URI);
    // 
    // try {
    //     await client.connect();
    //     const db = client.db('indicadores');
    //     const collection = db.collection('indicadores');
    //     
    //     const resultado = await collection.insertOne({
    //         ...indicador,
    //         fechaCreacion: new Date(),
    //         activo: true
    //     });
    //     
    //     return resultado.insertedId;
    // } finally {
    //     await client.close();
    // }
}

/**
 * Ejemplo de integración con PostgreSQL
 */
async function guardarEnPostgreSQL(indicador) {
    // const { Pool } = require('pg');
    // const pool = new Pool({
    //     connectionString: process.env.DATABASE_URL
    // });
    //     
    // const query = `
    //     INSERT INTO indicadores (nombre, formula, unidad, frecuencia, fuente, meta_sugerida, descripcion)
    //     VALUES ($1, $2, $3, $4, $5, $6, $7)
    //     RETURNING id;
    // `;
    // 
    // const values = [
    //     indicador.nombre,
    //     indicador.formula,
    //     indicador.unidad,
    //     indicador.frecuencia,
    //     indicador.fuente,
    //     indicador.meta_sugerida,
    //     indicador.descripcion
    // ];
    // 
    // const result = await pool.query(query, values);
    // return result.rows[0].id;
}

module.exports = app;