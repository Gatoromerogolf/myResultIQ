async function cargarNavbar(usuario) {
    // usuario = { nombre: "Juan García", avatar: "/dist/images/avatar-user.svg" }
    const res = await fetch('navbar.html');
    let html = await res.text();

    document.getElementById('navbarContainer').innerHTML = html;

    // 🔹 AJUSTE AUTOMÁTICO DEL CONTENIDO PRINCIPAL
    ajustarContenidoPrincipal();

    // Reinyectar comportamiento AdminLTE (colapsos, dropdowns, etc.)
    if (typeof window.AdminLTE !== "undefined" && window.AdminLTE.Layout) {
        window.AdminLTE.Layout._init();
        window.AdminLTE.PushMenu._init();
    }

    // 🔹 Insertar nombre e imagen del usuario en los elementos por ID
    const nombreElem = document.getElementById('nombreUsuario');
    const avatarElem = document.getElementById('avatarUsuario');

    if (nombreElem) nombreElem.textContent = usuario.nombre;
    if (avatarElem) avatarElem.src = usuario.avatar;

    // --- Inicializamos eventos de audio ---
    const btnStopAudio = document.getElementById('btnStopAudio');
    const avatarAudio = document.getElementById('avatarAudio');
    let vozSeleccionada = null;
    let utteranceActual = null;

    const audiosExplicativos = {
        destinos: "Los destinos representan las distintas unidades funcionales o áreas donde se asignan los indicadores de gestión. " +
            "¡Hola! En esta sección vas a encontrar los destinos a los que se asignan los indicadores. Llamamos destino a cada unidad funcional, proceso o área de la organización, cuyo desempeño se evalúa observando el comportamiento de ciertas variables." + " En otras secciones se informará la importancia relativa de cada destino y su incidencia en el destino al que pertenece." + "Ésta es una prueba de reproducción de textos largos y los destinos representan las distintas unidades funcionales o áreas donde se asignan los indicadores de gestión. ¡Comencemos! Aguante Juanpi!!!!!",
        usuarios: "Aquí podrás gestionar los usuarios del sistema...",
        indicadores: "En esta sección se administran los indicadores que permiten medir el desempeño..."
    };

    function obtenerVozEspañol(callback) {
        let voces = speechSynthesis.getVoces();

        // ⚠️ Si las voces no están cargadas todavía, esperamos el evento
        if (!voces.length) {
            window.speechSynthesis.onvoiceschanged = () => {
                voces = speechSynthesis.getVoces();
                seleccionarVoz(voces, callback);
            };
        } else {
            seleccionarVoz(voces, callback);
        }
    }

    function seleccionarVoz(voces, callback) {
        const vozGoogle = voces.find(v => v.name.toLowerCase().includes("google") && v.lang.startsWith("es"));
        const vozEspañol = voces.find(v => v.lang.startsWith("es"));
        vozSeleccionada = vozGoogle || vozEspañol || voces[0];
        if (callback) callback(vozSeleccionada);
    }

    function hablarTexto(texto, item) {
        detenerAudio();
        if (!('speechSynthesis' in window)) return;

        obtenerVozEspañol((voz) => {
            const icono = item.querySelector('.icon-speaking');
            if (icono) icono.style.display = 'inline';
            avatarAudio.classList.add('speaking');
            btnStopAudio.style.display = 'block';

            // 🔹 Dividimos el texto en frases de hasta 180 caracteres
            const partes = texto.match(/.{1,180}(?=\s|$)/g) || [texto];
            let indice = 0;

            const reproducirParte = () => {
                if (indice >= partes.length) {
                    if (icono) icono.style.display = 'none';
                    detenerAudio();
                    return;
                }

                const parte = partes[indice++];
                utteranceActual = new SpeechSynthesisUtterance(parte);
                utteranceActual.voice = voz;
                utteranceActual.lang = voz.lang || 'es-ES';
                utteranceActual.rate = 1;
                utteranceActual.pitch = 1.05;

                utteranceActual.onend = () => {
                    // Reproducimos la siguiente parte con un pequeño delay
                    setTimeout(reproducirParte, 150);
                };

                utteranceActual.onerror = (e) => {
                    console.error("Error en TTS:", e.error);
                    detenerAudio();
                };

                speechSynthesis.speak(utteranceActual);
            };

            // 🔸 Cancelar cualquier cola pendiente antes de iniciar
            speechSynthesis.cancel();
            // 🕐 Pequeño delay evita el bug del "corte prematuro"
            setTimeout(reproducirParte, 250);
        });
    }

    function detenerAudio() {
        speechSynthesis.cancel();
        utteranceActual = null;
        document.querySelectorAll('.icon-speaking').forEach(i => i.style.display = 'none');
        avatarAudio.classList.remove('speaking');
        btnStopAudio.style.display = 'none';
    }

    // 🖥️ Inicializar fullscreen toggle
    initFullscreenToggle();

    // 📂 Inicializar sidebar toggle (botón hamburguesa)
    initSidebarToggle();

    // 🖥️ Función para alternar fullscreen (basado en data-lte-toggle="fullscreen")
    function initFullscreenToggle() {
        document.querySelectorAll('[data-lte-toggle="fullscreen"]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                    btn.querySelector('[data-lte-icon="maximize"]').style.display = 'none';
                    btn.querySelector('[data-lte-icon="minimize"]').style.display = 'inline';
                } else {
                    document.exitFullscreen();
                    btn.querySelector('[data-lte-icon="maximize"]').style.display = 'inline';
                    btn.querySelector('[data-lte-icon="minimize"]').style.display = 'none';
                }
            });
        });
    }

    // 📂 Función para alternar el sidebar (basado en data-lte-toggle="sidebar")
    function initSidebarToggle() {
        const toggle = document.querySelector('[data-lte-toggle="sidebar"]');
        if (toggle) {
            toggle.addEventListener('click', e => {
                e.preventDefault();
                // 🧩 Lógica de AdminLTE: alterna automáticamente la clase sidebar-open
                document.body.classList.toggle('sidebar-open');
                document.body.classList.toggle('sidebar-collapse');
            });
        } else {
            console.warn("⚠️ No se encontró el botón con data-lte-toggle='sidebar'.");
        }
    }

    document.querySelectorAll('.dropdown-menu .audio-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const clave = item.dataset.audio;
            const texto = audiosExplicativos[clave];
            if (texto) hablarTexto(texto, item);
        });
    });

    btnStopAudio.addEventListener('click', detenerAudio);
    window.speechSynthesis.onvoiceschanged = obtenerVozEspañol;

    // 🔹 Reajustar al cambiar tamaño de ventana
    window.addEventListener('resize', ajustarContenidoPrincipal);
}

// 🔧 Función para ajustar el contenido principal según la altura del navbar
function ajustarContenidoPrincipal() {
    const navbar = document.querySelector('.app-header');
    const contenidoPrincipal = document.querySelector('.content-wrapper') || 
                               document.querySelector('main') || 
                               document.querySelector('.app-main');
    
    if (navbar && contenidoPrincipal) {
        const alturaNavbar = navbar.offsetHeight;
        contenidoPrincipal.style.marginTop = `${alturaNavbar}px`;
    }
}

// Ejemplo de uso
cargarNavbar({ nombre: "Juan García", avatar: "/dist/images/user1-128x128.jpg" });