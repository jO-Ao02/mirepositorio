document.addEventListener('DOMContentLoaded', iniciar);
 
function iniciar() {
    protegerPaginaAdmin();
    iniciarBarraSuperior();
    cargarUsuarios();
}
 
async function cargarUsuarios() {
    var cuerpoTabla = document.getElementById('cuerpoTablaUsuarios');
    var mensajeVacio = document.getElementById('mensajeSinUsuarios');
 
    cuerpoTabla.innerHTML = '';
    mensajeVacio.hidden = false;
    mensajeVacio.textContent = 'Cargando usuarios...';
 
    try {
        var usuarios = await apiFetch('/usuarios');
 
        if (usuarios.length === 0) {
            mensajeVacio.textContent = 'Todavía no hay usuarios registrados.';
            return;
        }
 
        mensajeVacio.hidden = true;
 
        for (var i = 0; i < usuarios.length; i++) {
            var fila = crearFilaUsuario(usuarios[i]);
            cuerpoTabla.appendChild(fila);
        }
 
        var botonesEstado = document.querySelectorAll('[data-accion="cambiar-estado"]');
        for (var j = 0; j < botonesEstado.length; j++) {
            botonesEstado[j].addEventListener('click', manejarClicCambiarEstado);
        }
 
    } catch (error) {
        mensajeVacio.hidden = false;
        mensajeVacio.textContent = 'No se pudieron cargar los usuarios: ' + error.message;
    }
}
 
function crearFilaUsuario(usuario) {
    var fila = document.createElement('tr');
 
    var textoEstado = usuario.estado ? 'Activo' : 'Inactivo';
    var claseEstado = usuario.estado ? 'etiqueta-estado--activo' : 'etiqueta-estado--inactivo';
    var textoBotonEstado = usuario.estado ? 'Desactivar' : 'Activar';
    var claseBotonEstado = usuario.estado ? 'boton--advertencia' : 'boton--exito';
 
    fila.innerHTML =
        '<td>' +
            '<div class="celda-nombre">' + usuario.nombre + ' ' + usuario.apellido + '</div>' +
            '<div class="celda-subtexto mono">@' + usuario.nombre_usuario + '</div>' +
        '</td>' +
        '<td><span class="etiqueta-rol etiqueta-rol--' + usuario.rol + '">' + formatearRol(usuario.rol) + '</span></td>' +
        '<td><span class="etiqueta-estado ' + claseEstado + '">' + textoEstado + '</span></td>' +
        '<td class="celda-acciones">' +
            '<a href="usuario-form.html?id=' + usuario.id_usuario + '" class="boton boton--fantasma boton--pequeno">Editar</a>' +
            '<button type="button" class="boton ' + claseBotonEstado + ' boton--pequeno" ' +
                'data-accion="cambiar-estado" data-id="' + usuario.id_usuario + '" data-estado="' + usuario.estado + '">' +
                textoBotonEstado +
            '</button>' +
        '</td>';
 
    return fila;
}
 
async function manejarClicCambiarEstado(evento) {
    var boton = evento.currentTarget;
    var id = boton.getAttribute('data-id');
    var estadoActual = boton.getAttribute('data-estado') === 'true';
    var nuevoEstado = !estadoActual;
 
    var textoConfirmacion = nuevoEstado
        ? '¿Quieres activar a este usuario?'
        : '¿Quieres desactivar a este usuario? No podrá iniciar sesión mientras esté inactivo.';
 
    var confirmado = window.confirm(textoConfirmacion);
    if (!confirmado) {
        return;
    }
 
    boton.disabled = true;
 
    try {
        await apiFetch('/usuarios/' + id, {
            method: 'PATCH',
            body: JSON.stringify({ estado: nuevoEstado })
        });
 
        cargarUsuarios();
 
    } catch (error) {
        alert('No se pudo cambiar el estado: ' + error.message);
        boton.disabled = false;
    }
}