const http = require('http');
const manejarRutas = require('./routes/usuarioRoute');

async function rutaObtenida(req, res) {
    await manejarRutas(req, res);
}

const servidor = http.createServer(rutaObtenida);

const PUERTO = process.env.APP_PUERTO || 3000;

servidor.listen(PUERTO, function () {
    console.log('Servidor corriendo en http://localhost:' + PUERTO);
});