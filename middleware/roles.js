// middleware/roles.js
//  recibe roles en el backend
function soloRoles(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        if (!req.user || !req.user.rol) {
            return res.status(403).json({ error: 'Rol no definido' });
        }

        if (!rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({
                error: 'No tiene permisos para esta acción'
            });
        }

        next();
    };
}

module.exports = soloRoles;
