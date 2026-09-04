var API_URL = 'http://localhost:3000';
 
async function apiFetch(ruta, opciones) {
    if (!opciones) {
        opciones = {};
    }
 
    if (!opciones.headers) {
        opciones.headers = {};
    }
 
    opciones.headers['Content-Type'] = 'application/json';
 
    var token = localStorage.getItem('token');
    if (token) {
        opciones.headers['Authorization'] = 'Bearer ' + token;
    }
 
    var respuesta = await fetch(API_URL + ruta, opciones);
 
    var datos = {};
    try {
        datos = await respuesta.json();
    } catch (errorAlLeerJson) {
        datos = {};
    }
 
    if (!respuesta.ok) {
        var mensajeError = datos.mensaje || 'Ocurrió un error al conectar con el servidor.';
        var error = new Error(mensajeError);
        error.status = respuesta.status;
        throw error;
    }
 
    return datos;
}