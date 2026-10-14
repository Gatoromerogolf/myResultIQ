const mysql = require("mysql2/promise");
// Config dotnev
require("dotenv").config();

// Crear un pool de conexiones usando la URL completa
const pool = mysql.createPool({
  uri: process.env.MYSQL_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,                 // 0 = sin límite de cola
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000          // 10 segundos
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