var idUsuarioActual = null;
 
document.addEventListener('DOMContentLoaded', iniciar);
 
function iniciar() {
    protegerPaginaAdmin();
    iniciarBarraSuperior();
 
    var parametros = new URLSearchParams(window.location.search);
    idUsuarioActual = parametros.get('id');
 
    document.getElementById('formularioUsuario').addEventListener('submit', manejarEnvioFormulario);
    document.getElementById('botonCambiarEstado').addEventListener('click', manejarClicCambiarEstado);
    document.getElementById('formularioContrasena').addEventListener('submit', manejarCambioContrasena);
 
    if (idUsuarioActual) {
        prepararModoEdicion();
    } else {
        prepararModoCreacion();
    }
}
 
function prepararModoCreacion() {
    document.getElementById('tituloFormulario').textContent = 'Nuevo usuario';
    document.getElementById('grupoContrasena').hidden = false;
    document.getElementById('campoContrasena').required = true;
    document.getElementById('seccionEstado').hidden = true;
    document.getElementById('seccionCambiarContrasena').hidden = true;
}
 
async function prepararModoEdicion() {
    document.getElementById('tituloFormulario').textContent = 'Editar usuario';
    document.getElementById('grupoContrasena').hidden = true;
    document.getElementById('campoContrasena').required = false;
    document.getElementById('seccionEstado').hidden = false;
    document.getElementById('seccionCambiarContrasena').hidden = false;
 
    try {
        var usuario = await apiFetch('/usuarios/' + idUsuarioActual);
 
        document.getElementById('campoNombre').value = usuario.nombre;
        document.getElementById('campoApellido').value = usuario.apellido;
        document.getElementById('campoNombreUsuario').value = usuario.nombre_usuario;
        document.getElementById('campoRol').value = usuario.rol;
 
        actualizarBotonEstado(usuario.estado);
 
    } catch (error) {
        alert('No se pudo cargar el usuario: ' + error.message);
        window.location.href = 'usuarios.html';
    }
}
 
function actualizarBotonEstado(estadoActual) {
    var boton = document.getElementById('botonCambiarEstado');
 
    boton.setAttribute('data-estado', estadoActual);
    boton.textContent = estadoActual ? 'Desactivar usuario' : 'Activar usuario';
    boton.className = estadoActual ? 'boton boton--advertencia' : 'boton boton--exito';
}
 
async function manejarEnvioFormulario(evento) {
    evento.preventDefault();
 
    var datos = {
        nombre: document.getElementById('campoNombre').value.trim(),
        apellido: document.getElementById('campoApellido').value.trim(),
        nombre_usuario: document.getElementById('campoNombreUsuario').value.trim(),
        rol: document.getElementById('campoRol').value
    };
 
    if (datos.nombre === '' || datos.apellido === '' || datos.nombre_usuario === '' || datos.rol === '') {
        mostrarMensajeFormulario('Completa todos los campos.', 'error');
        return;
    }
 
    try {
        if (idUsuarioActual) {
            await apiFetch('/usuarios/' + idUsuarioActual, {
                method: 'PUT',
                body: JSON.stringify(datos)
            });
 
            mostrarMensajeFormulario('Usuario actualizado correctamente.', 'exito');
 
        } else {
            var contrasena = document.getElementById('campoContrasena').value;
 
            if (contrasena.length < 6) {
                mostrarMensajeFormulario('La contraseña debe tener al menos 6 caracteres.', 'error');
                return;
            }
 
            datos.contrasena = contrasena;
 
            await apiFetch('/usuarios', {
                method: 'POST',
                body: JSON.stringify(datos)
            });
 
            mostrarMensajeFormulario('Usuario creado correctamente. Redirigiendo...', 'exito');
 
            setTimeout(function () {
                window.location.href = 'usuarios.html';
            }, 900);
        }
 
    } catch (error) {
        mostrarMensajeFormulario(error.message, 'error');
    }
}
 
function mostrarMensajeFormulario(texto, tipo) {
    var mensaje = document.getElementById('mensajeFormulario');
    mensaje.textContent = texto;
    mensaje.className = 'mensaje mensaje--' + tipo;
    mensaje.hidden = false;
}
 
async function manejarClicCambiarEstado() {
    var boton = document.getElementById('botonCambiarEstado');
    var estadoActual = boton.getAttribute('data-estado') === 'true';
    var nuevoEstado = !estadoActual;
 
    var textoConfirmacion = nuevoEstado
        ? '¿Quieres activar a este usuario?'
        : '¿Quieres desactivar a este usuario? No podrá iniciar sesión mientras esté inactivo.';
 
    var confirmado = window.confirm(textoConfirmacion);
    if (!confirmado) {
        return;
    }
 
    try {
        await apiFetch('/usuarios/' + idUsuarioActual, {
            method: 'PATCH',
            body: JSON.stringify({ estado: nuevoEstado })
        });
 
        actualizarBotonEstado(nuevoEstado);
        mostrarMensajeFormulario('Estado actualizado correctamente.', 'exito');
 
    } catch (error) {
        mostrarMensajeFormulario('No se pudo cambiar el estado: ' + error.message, 'error');
    }
}
 
async function manejarCambioContrasena(evento) {
    evento.preventDefault();
 
    var nueva = document.getElementById('campoNuevaContrasena').value;
    var confirmacion = document.getElementById('campoConfirmarContrasena').value;
 
    if (nueva.length < 6) {
        mostrarMensajeContrasena('La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }
 
    if (nueva !== confirmacion) {
        mostrarMensajeContrasena('Las contraseñas no coinciden.', 'error');
        return;
    }
 
    try {
        await apiFetch('/usuarios/' + idUsuarioActual + '/password', {
            method: 'PATCH',
            body: JSON.stringify({ nueva_contrasena: nueva })
        });
 
        mostrarMensajeContrasena('Contraseña actualizada correctamente.', 'exito');
        document.getElementById('formularioContrasena').reset();
 
    } catch (error) {
        mostrarMensajeContrasena(error.message, 'error');
    }
}
 
function mostrarMensajeContrasena(texto, tipo) {
    var mensaje = document.getElementById('mensajeContrasena');
    mensaje.textContent = texto;
    mensaje.className = 'mensaje mensaje--' + tipo;
    mensaje.hidden = false;
}