function iniciarBarraSuperior() {
    var contenedor = document.getElementById('barraSuperior');
 
    if (!contenedor) {
        return;
    }
 
    var usuario = obtenerUsuarioSesion();
    var nombre = usuario ? usuario.nombre : '';
    var rol = usuario ? usuario.rol : '';
 
    contenedor.innerHTML =
        '<header class="barra-superior">' +
            '<div class="barra-superior__marca">' +
                '<span class="barra-superior__punto"></span>' +
                '<span>Panel de Personal</span>' +
            '</div>' +
            '<div class="barra-superior__usuario">' +
                '<span class="barra-superior__nombre">' + nombre + '</span>' +
                '<span class="etiqueta-rol etiqueta-rol--' + rol + '">' + formatearRol(rol) + '</span>' +
                '<button type="button" id="botonCerrarSesion" class="boton boton--fantasma boton--pequeno">Cerrar sesión</button>' +
            '</div>' +
        '</header>';
 
    document.getElementById('botonCerrarSesion').addEventListener('click', cerrarSesion);
}