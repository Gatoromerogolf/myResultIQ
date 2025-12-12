// test-bcrypt.js
const bcrypt = require('bcrypt');

(async () => {
  // Cambiá la contraseña que creés que es la correcta:
  const password = 'operador123';

  // Pegá aquí el hash que tenés en la BD (ej: el que mostraste)
  const hash = '$2b$10$/lBjfA3Z3XM6F7rc843vVOmmj/CqLIJI67qagbOa6w/Wndk1GzAKK';

  try {
    const ok = await bcrypt.compare(password, hash);
    console.log('compare result:', ok);
    if (!ok) {
      // Generar hash para ver si el mismo password con la librería genera algo distinto
      const newHash = await bcrypt.hash(password, 10);
      console.log('hash nuevo (solo para comparar):', newHash);
    }
  } catch (err) {
    console.error('error bcrypt:', err);
  }
})();
