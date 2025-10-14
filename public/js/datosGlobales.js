// js/datosGlobales.js
let indicadoresCache = null;
let medicionesCache = null;
let sectoresCache = null;
let usuarioActual = null;

export async function inicializarDatosGlobales() {
    // Si ya están cacheados, no hacer nada
    if (indicadoresCache) {
        console.log("🔁 Usando indicadores en caché");
        return;
    }

    console.log("📡 Cargando datos iniciales...");
    try {
        const [indicadoresResp, sectoresResp, medicionesResp] = await Promise.all([
            fetch('/api/indicadores'),
            fetch('/api/sectores'),
            fetch('/api/mediciones'),
        ]);

        indicadoresCache = await indicadoresResp.json();
        sectoresCache = await sectoresResp.json();
        medicionesCache = await medicionesResp.json();

        console.log("✅ Datos globales inicializados");
    } catch (err) {
        console.error("Error al cargar datos globales:", err);
    }
}

export function getIndicadores() {
    return indicadoresCache;
}

export function getMediciones() {
    return medicionesCache;
}

export function getSectores() {
    return sectoresCache;
}

export function setUsuarioActual(usuario) {
    usuarioActual = usuario;
}

export function getUsuarioActual() {
    return usuarioActual;
}
