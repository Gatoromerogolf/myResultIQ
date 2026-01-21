//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//   ⚽⚽⚽      Definir la tarea cron
// cron.schedule('0 */4 * * *', () => { cada cuatro horas
//  * * * * *  # minuto, hora, día del mes, mes, día de la semana

const cron = require("node-cron");
const pool = require("../db");
// const sendMail = require("../services/mailService"); // ajustá la ruta si cambia

// cron.schedule("0 0,12 * * *", async () => {
//   try {
//     const ahora = new Date().toLocaleString();
//     console.log(`[CRON] Ejecutando tarea programada a las ${ahora}`);
//     console.log("Ejecutando tarea programada: registrando en la base de datos");

//     const textoCron = `
//       <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f4;">
//         <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1);">
//           <h2 style="color: #333;">Mensaje enviado por Cron</h2>
//           <p>Mensaje automático</p>
//           <div style="display: inline-block; padding: 10px 20px; background: #007BFF; color: white; border-radius: 5px; font-weight: bold;">
//             ${ahora}
//           </div>
//           <p style="margin-top: 20px;">Texto genérico</p>
//           <hr style="border: none; height: 1px; background: #ddd;">
//           <small style="color: #888;">&copy; 2025 BDTA. Todos los derechos reservados.</small>
//         </div>
//       </div>
//     `;

//     const query = "INSERT INTO tablalogs (logs) VALUES (NOW())";

//     const [result] = await pool.query(query);
//     console.log("Registro insertado correctamente:", result.insertId);

//     // En cron: usar SMTP
//     await sendMail(
//       "ruben.e.garcia@gmail.com",
//       "Informe automático",
//       "texto mensaje cron",
//       textoCron,
//       true
//     );

//   } catch (error) {
//     console.error("❌ Error en tarea CRON:", error);
//   }
// });
