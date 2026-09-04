function guardarSesion(token, usuario) {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
}
 
function obtenerUsuarioSesion() {
    var datosGuardados = localStorage.getItem('usuario');
 
    if (!datosGuardados) {
        return null;
    }
 
    return JSON.parse(datosGuardados);
}
 
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = obtenerRutaRaiz() + 'index.html';
}


//---

function protegerPaginaAdmin() {
    var token = localStorage.getItem('token');
    var usuario = obtenerUsuarioSesion();
 
    if (!token || !usuario || usuario.rol !== 'admin') {
        window.location.href = obtenerRutaRaiz() + 'index.html';
    }
}
 
function formatearRol(rol) {
    if (rol === 'admin') {
        return 'Administrador';
    }
    if (rol === 'mesero') {
        return 'Mesero';
    }
    if (rol === 'cocina') {
        return 'Cocina';
    }
    if (rol === 'cajero') {
        return 'Cajero';
    }
    return rol;
}