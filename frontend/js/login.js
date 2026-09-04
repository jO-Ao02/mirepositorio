document.addEventListener('DOMContentLoaded', iniciar);
 
function iniciar() {
    var formulario = document.getElementById('formularioLogin');
    formulario.addEventListener('submit', manejarEnvioLogin);
}
 
async function manejarEnvioLogin(evento) {
    evento.preventDefault();
 
    var nombreUsuario = document.getElementById('campoNombreUsuario').value.trim();
    var contrasena = document.getElementById('campoContrasena').value;
    var mensajeError = document.getElementById('mensajeError');
    var botonEntrar = document.getElementById('botonEntrar');
 
    ocultarMensajeError();
 
    if (nombreUsuario === '' || contrasena === '') {
        mostrarMensajeError('Completa tu usuario y tu contraseña.');
        return;
    }
 
    botonEntrar.disabled = true;
    botonEntrar.textContent = 'Entrando...';
 
    try {
        var datos = await apiFetch('/login', {
            method: 'POST',
            body: JSON.stringify({
                nombre_usuario: nombreUsuario,
                contrasena: contrasena
            })
        });
 
        if (datos.usuario.rol !== 'admin') {
            mostrarMensajeError('Este panel es solo para administradores.');
            botonEntrar.disabled = false;
            botonEntrar.textContent = 'Entrar';
            return;
        }
 
        guardarSesion(datos.token, datos.usuario);
        window.location.href = 'pages/usuarios.html';
 
    } catch (error) {
        mostrarMensajeError(error.message);
        botonEntrar.disabled = false;
        botonEntrar.textContent = 'Entrar';
    }
}
 
function mostrarMensajeError(texto) {
    var mensajeError = document.getElementById('mensajeError');
    mensajeError.textContent = texto;
    mensajeError.hidden = false;
}
 
function ocultarMensajeError() {
    var mensajeError = document.getElementById('mensajeError');
    mensajeError.textContent = '';
    mensajeError.hidden = true;
}