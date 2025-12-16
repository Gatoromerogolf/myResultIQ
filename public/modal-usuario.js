/**
 * Función para abrir el modal con los detalles del usuario
 * @param {number} legajo - Legajo del usuario a mostrar
 */
async function verDetalleUsuario(legajo) {
    try {
        // Obtener datos del usuario

        const response = await fetch(`/usuarios/${legajo}`);
        const usuario = await response.json();

        // Obtener nombre del sector
        let nombreSector = 'Sin sector';
        if (usuario.sector) {
            const sectorResponse = await fetch(`/sectores/${usuario.sector}`);
            const sector = await sectorResponse.json();
            nombreSector = sector.nombre;
        }

        // Obtener nombre del jefe
        let nombreJefe = 'Sin jefe asignado';
        if (usuario.legajo_jefe) {
            const jefeResponse = await fetch(`/usuarios/${usuario.legajo_jefe}`);
            const jefe = await jefeResponse.json();
            nombreJefe = `${jefe.apellido}, ${jefe.nombres} (Leg. ${jefe.legajo})`;
        }

        // ✅ Construir URL de la foto usando el endpoint del backend
        const timestamp = Date.now();
        
        // Debug: ver qué valor tiene tiene_foto
        console.log('tiene_foto:', usuario.tiene_foto);
        console.log('tipo de tiene_foto:', typeof usuario.tiene_foto);
        
        // Siempre intentar cargar desde el endpoint primero
        const fotoURL = `/usuarios/foto/${legajo}?t=${timestamp}`;
        
        console.log('Intentando cargar foto desde:', fotoURL);
        
        // Llenar la tarjeta de perfil con la foto
        const imgFoto = document.getElementById('fotoUsuario');
        imgFoto.src = fotoURL;
        
        // Manejar error de carga de imagen (si el endpoint falla o no hay foto)
        imgFoto.onerror = function() {
            console.error('Error al cargar la foto desde:', fotoURL);
            console.error('Usando imagen por defecto');
            this.src = '/dist/images/default_user.jpg';
        };
        
        imgFoto.onload = function() {
            console.log('Foto cargada exitosamente desde:', fotoURL);
        };

        document.getElementById('nombreCompletoUsuario').textContent =
            `${usuario.apellido}, ${usuario.nombres}`;
        document.getElementById('cargoUsuario').textContent = usuario.cargo || 'Sin cargo';

        // Badge de estado
        const badgeEstado = document.getElementById('estadoUsuario');
        if (usuario.estado === 'activo' || usuario.estado === 1) {
            badgeEstado.className = 'badge bg-success';
            badgeEstado.textContent = 'Activo';
            badgeEstado.style.fontSize = '16px';
        } else {
            badgeEstado.className = 'badge bg-secondary';
            badgeEstado.textContent = 'Inactivo';
        }

        // Llenar las tarjetas informativas
        document.getElementById('legajoUsuario').textContent = usuario.legajo;
        document.getElementById('sectorUsuario').textContent = nombreSector;
        document.getElementById('rolUsuario').textContent = usuario.rol || 'Sin rol';

        // Llenar la tabla de detalles
        document.getElementById('emailUsuario').textContent = usuario.email || 'No registrado';
        document.getElementById('telefonoUsuario').textContent = usuario.telefono || 'No registrado';
        document.getElementById('legajoJefeUsuario').textContent = nombreJefe;

        console.log('paso 6')
        // Formatear última sesión
        if (usuario.ultima_sesion) {
            const fecha = new Date(usuario.ultima_sesion);
            document.getElementById('ultimaSesionUsuario').textContent =
                fecha.toLocaleString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
        } else {
            document.getElementById('ultimaSesionUsuario').textContent = 'Nunca';
        }

        // Abrir el modal
        const modal = new bootstrap.Modal(document.getElementById('modalDetalleUsuario'));
        modal.show();

    } catch (error) {
        console.error('Error al cargar detalles del usuario:', error);
        alert('Error al cargar los datos del usuario');
    }
}

/**
 * Ejemplo de uso desde una tabla de usuarios
 * Agregar onclick a cada fila o botón
 */
function inicializarTablaUsuarios() {
    // Si tienes botones en cada fila:
    document.querySelectorAll('.btn-ver-usuario').forEach(btn => {
        btn.addEventListener('click', function () {
            const legajo = this.getAttribute('data-legajo');
            mostrarDetalleUsuario(legajo);
        });
    });

    // O si clickeas toda la fila:
    document.querySelectorAll('.fila-usuario').forEach(fila => {
        fila.style.cursor = 'pointer';
        fila.addEventListener('click', function () {
            const legajo = this.getAttribute('data-legajo');
            mostrarDetalleUsuario(legajo);
        });
    });
}

// Inicializar cuando cargue el DOM
document.addEventListener('DOMContentLoaded', inicializarTablaUsuarios);