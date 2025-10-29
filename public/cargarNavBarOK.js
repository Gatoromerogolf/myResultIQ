// 📘 cargarNavbar.js
async function cargarNavbar(usuario = { nombre: "Invitado", avatar: "/dist/images/avatar-neutral.svg" }) {
    try {
        const res = await fetch('navbar.html');
        const html = await res.text();
        const contenedor = document.getElementById('navbarContainer');
        contenedor.innerHTML = html;


        // ============================================================
        // 🔹 Asistente de voz (dropdown con audios)
        // ============================================================
        const synth = window.speechSynthesis;
        const btnStop = document.getElementById("btnStopAudio");
        const audioItems = document.querySelectorAll(".audio-item");
        let currentUtterance = null;

        // Función para detener el audio
        function detenerAudio() {
            synth.cancel();
            currentUtterance = null;
            btnStop.style.display = "none";
            document.querySelectorAll(".icon-speaking").forEach((icon) => (icon.style.display = "none"));
        }

        // Click en un ítem con audio
        audioItems.forEach((item) => {
            item.addEventListener("click", (e) => {
                e.preventDefault();

                const tipo = item.dataset.audio;
                let texto = "";

                switch (tipo) {
                    case "destinos":
                        texto =
                            "Los destinos representan las distintas unidades funcionales o áreas donde se asignan los indicadores de gestión. " +
                            "¡Hola! En esta sección se definen los destinos a los que se le asignarán indicadores. Como destino entenderemos unidades funcionales, procesos, áreas, etcétera, que purdan ser evaluados en función del comportamiento de indicadores adecuados." + " En otras secciones se informará la importancia relativa de cada destino y su incidencia en el destino al que pertenece." + "Esta es una prueba de reproducción de textos muy largos y Los destinos representan las distintas unidades funcionales o áreas donde se asignan los indicadores de gestión. ¡Comencemos! Aguante Juanpi!!!!!";
                        break;
                    case "usuarios":
                        texto =
                            "Desde acá se crean los usuarios.  Se requiere informar a quien reporta cada usuario, de manera que se permita enviar notificaciones ante situaciones determinadas.  Cada usuario a su vez, tendrá una opcion personalizada para modificar sus datos de correo electrónico, teléfono y contraseña.      ¡Comencemos!  Aguante Juanpi!!!!!";
                        break;
                    case "indicadores":
                        texto =
                            "Estamos en la sección de Indicadores.   Por acá podrás crear indicadores, modificar sus datos o eliminarlos.  Tenes una opción de visualización que te permite consultar todos los detalles. ¡Comencemos!  Aguante Juanpi!!!!!";
                        break;
                }

                if (!texto) return;

                // Cierra el dropdown antes de reproducir
                const dropdown = bootstrap.Dropdown.getInstance(item.closest(".dropdown-menu"))?.hide();
                if (dropdown) dropdown.hide();

                // Detener audio anterior
                detenerAudio();

                // Crear y reproducir nuevo
                const utterance = new SpeechSynthesisUtterance(texto);
                utterance.lang = "es-ES";
                utterance.rate = 1;
                utterance.pitch = 1;
                utterance.volume = 1;

                utterance.onstart = () => {
                    btnStop.style.display = "block";
                    const icon = item.querySelector(".icon-speaking");
                    if (icon) icon.style.display = "inline";
                };

                utterance.onend = detenerAudio;
                utterance.onerror = detenerAudio;

                currentUtterance = utterance;
                synth.speak(utterance);
            });
        });

        // Botón flotante para detener
        if (btnStop) btnStop.addEventListener("click", detenerAudio);

        // 🧩 Insertar nombre e imagen del usuario
        const userNameElem = document.getElementById('nombreUsuario');
        const userAvatarElem = document.getElementById('avatarUsuario');

        if (userNameElem) userNameElem.textContent = usuario.nombre;
        if (userAvatarElem) userAvatarElem.src = usuario.avatar;

        // 🖥️ Inicializar fullscreen toggle
        initFullscreenToggle();

        // 📂 Inicializar sidebar toggle (botón hamburguesa)
        initSidebarToggle();

        console.log("✅ Navbar cargado correctamente");

    } catch (err) {
        console.error("❌ Error al cargar el navbar:", err);
    }
}

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
            document.body.classList.toggle('sidebar-collapse');
        });
    } else {
        console.warn("⚠️ No se encontró el botón con data-lte-toggle='sidebar'.");
    }
}

// 🔹 Llamar a la función automáticamente al cargar la página
// (Podés reemplazar los valores de usuario con los reales desde backend o sessionStorage)
document.addEventListener('DOMContentLoaded', () => {
    const usuarioActual = {
        nombre: "Ruben Garcia",
        avatar: "/dist/images/user1-128x128.jpg"
    };
    cargarNavbar(usuarioActual);
});

// Evita que el dropdown se cierre al hacer clic en los items de audio
document.querySelectorAll('.dropdown-menu .audio-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation(); // 🔹 Evita el cierre del menú
    const clave = item.dataset.audio;
    const texto = audiosExplicativos[clave];
    if (texto) hablarTexto(texto, item);
  });
});
