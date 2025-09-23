# Generador de Indicadores con Claude - Guía de Instalación

## 📋 Requisitos Previos

- Node.js 16+ instalado
- Cuenta en Anthropic con acceso a la API de Claude
- API Key de Claude (obtener en: https://console.anthropic.com/)

## 🚀 Instalación Rápida

### 1. Crear el proyecto

```bash
mkdir generador-indicadores
cd generador-indicadores
npm init -y
```

### 2. Instalar dependencias

```bash
npm install express cors axios dotenv
npm install -D nodemon
```

### 3. Crear estructura de archivos

```
generador-indicadores/
├── server.js              # Backend (código proporcionado)
├── public/
│   └── index.html         # Frontend (código proporcionado)
├── .env                   # Variables de entorno
├── package.json           # Configuración de Node.js
└── README.md             # Este archivo
```

### 4. Configurar variables de entorno

Crear archivo `.env`:

```env
CLAUDE_API_KEY=tu_api_key_de_claude_aqui
PORT=3000
NODE_ENV=development
```

### 5. Actualizar package.json

Agregar scripts al package.json:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node -e \"console.log('Server test OK')\""
  }
}
```

## 🔧 Configuración de la API de Claude

### Obtener tu API Key:

1. Ve a https://console.anthropic.com/
2. Crea una cuenta o inicia sesión
3. Ve a "API Keys" y genera una nueva key
4. Cópiala y pégala en tu archivo `.env`

### Límites iniciales para testing:
- **Budget sugerido**: $20-50 USD para pruebas
- **Modelo recomendado**: `claude-3-5-sonnet-20241022`
- **Costo aproximado**: $0.04-0.06 USD por consulta

## 🏃‍♂️ Ejecutar la Aplicación

### Modo desarrollo:
```bash
npm run dev
```

### Modo producción:
```bash
npm start
```

### Verificar que funciona:
1. Abre tu navegador en: http://localhost:3000
2. Verifica el estado de la API en: http://localhost:3000/api/status

## 📡 Endpoints de la API

### `POST /api/generar-indicadores`
Genera indicadores usando Claude AI.

**Request body:**
```json
{
  "area": "Ventas",
  "descripcion": "Proceso de venta directa al cliente",
  "objetivo": "eficiencia",
  "industria": "Retail"
}
```

**Response:**
```json
{
  "indicadores": [
    {
      "nombre": "Tasa de Conversión de Ventas",
      "formula": "(Ventas cerradas / Leads totales) × 100",
      "unidad": "Porcentaje (%)",
      "frecuencia": "Mensual",
      "fuente": "CRM de ventas",
      "meta_sugerida": "15-25%",
      "descripcion": "Mide la eficiencia del proceso de conversión"
    }
  ]
}
```

### `POST /api/indicadores`
Guarda un indicador seleccionado.

### `GET /api/indicadores`
Obtiene todos los indicadores guardados.

### `POST /api/refinar-indicador`
Refina un indicador existente con Claude.

## 🔗 Integración con tu Base de Datos

### Para MongoDB:
```javascript
// Instalar: npm install mongodb
const { MongoClient } = require('mongodb');

async function guardarIndicador(indicador) {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('indicadores');
    const collection = db.collection('indicadores');
    
    const resultado = await collection.insertOne({
        ...indicador,
        fechaCreacion: new Date(),
        activo: true
    });
    
    await client.close();
    return resultado.insertedId;
}
```

### Para PostgreSQL:
```javascript
// Instalar: npm install pg
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function guardarIndicador(indicador) {
    const query = `
        INSERT INTO indicadores (nombre, formula, unidad, frecuencia, fuente, meta_sugerida, descripcion)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
    `;
    
    const values = [
        indicador.nombre,
        indicador.formula,
        indicador.unidad,
        indicador.frecuencia,
        indicador.fuente,
        indicador.meta_sugerida,
        indicador.descripcion
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0].id;
}
```

### Para MySQL:
```javascript
// Instalar: npm install mysql2
const mysql = require('mysql2/promise');

async function guardarIndicador(indicador) {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    const [rows] = await connection.execute(
        'INSERT INTO indicadores (nombre, formula, unidad, frecuencia, fuente, meta_sugerida, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [indicador.nombre, indicador.formula, indicador.unidad, indicador.frecuencia, indicador.fuente, indicador.meta_sugerida, indicador.descripcion]
    );
    
    await connection.end();
    return rows.insertId;
}
```

## 🛡️ Consideraciones de Seguridad

### Para Producción:
1. **Nunca expongas tu API key en el frontend**
2. **Usa HTTPS en producción**
3. **Implementa rate limiting**
4. **Valida y sanitiza todas las entradas**
5. **Usa variables de entorno para configuración**

### Ejemplo de middleware de seguridad:
```javascript
// Instalar: npm install helmet express-rate-limit
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // límite de 100 requests por IP
});

app.use('/api/', limiter);
```

## 🧪 Testing

### Ejemplo de test básico:
```javascript
// test.js
const request = require('supertest');
const app = require('./server');

describe('API Endpoints', () => {
    test('GET /api/status', async () => {
        const response = await request(app).get('/api/status');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
    });
});
```

## 🚀 Deployment

### Para Heroku:
```bash
# Instalar Heroku CLI y configurar
heroku create tu-app-indicadores
heroku config:set CLAUDE_API_KEY=tu_api_key
git push heroku main
```

### Para Railway:
1. Conecta tu repositorio
2. Configura la variable CLAUDE_API_KEY
3. Deploy automático

### Para DigitalOcean App Platform:
1. Conecta tu repositorio
2. Configura las variables de entorno
3. Deploy

## 💡 Próximos Pasos

1. **Mejoras del UI**: Agregar más interactividad y mejor diseño
2. **Autenticación**: Implementar login de usuarios
3. **Dashboard**: Panel para ver todos los indicadores
4. **Exportación**: Generar reportes en PDF/Excel
5. **Notificaciones**: Alertas cuando indicadores salen de rango
6. **Integración**: Conectar con herramientas de BI existentes

## 🐛 Troubleshooting

### Error: "CLAUDE_API_KEY no está configurada"
- Verifica que el archivo `.env` existe y contiene la API key
- Asegúrate de que el archivo `.env` esté en la raíz del proyecto

### Error: "API Error: 401"
- Verifica que tu API key sea válida
- Confirma que tienes créditos disponibles en tu cuenta de Anthropic

### Error: "Cannot connect to database"
- Verifica la configuración de tu base de datos
- Asegúrate de que las variables de entorno estén correctas

### Los indicadores no se generan correctamente
- Verifica la respuesta de Claude en los logs del servidor
- Asegúrate de que el JSON response sea válido

## 📞 Soporte

Si necesitas ayuda con la implementación:
1. Revisa los logs del servidor con `npm run dev`
2. Verifica la configuración de la API key
3. Prueba con datos más específicos en el formulario

¡Tu aplicación ya está lista para generar indicadores inteligentes con Claude AI! 🎉