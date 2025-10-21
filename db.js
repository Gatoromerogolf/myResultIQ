const mysql = require("mysql2/promise");
// Config dotnev
require("dotenv").config();

// Crear un pool de conexiones usando la URL completa
const pool = mysql.createPool({
  uri: process.env.MYSQL_URL,        // Usar la URL completa desde la variable de entorno
  waitForConnections: true,          // Esperar conexiones si todas están en uso
  connectionLimit: 10,               // Número máximo de conexiones en el pool
  queueLimit: 0,                      // Límite de la cola de solicitudes (0 = sin límite)
  connectTimeout: 10000 // 10 segundos
});

// Verificar la conexión inicial
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Conectado a la BD a través del pool");
    connection.release();
  } catch (err) {
    console.error("Falló la conexión a la BD", err.code);
  }
})();


// Exportar el pool para que pueda ser utilizado en otras partes de la aplicación
module.exports = pool;