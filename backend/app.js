const http = require('http');
const manejarRutas = require('./routes/usuarioRoute');

async function rutaObtenida(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end(); 
    }
    await manejarRutas(req, res);
}

const servidor = http.createServer(rutaObtenida);

const PUERTO = process.env.APP_PUERTO || 3000;

servidor.listen(PUERTO, function () {
    console.log('Servidor corriendo en http://localhost:' + PUERTO);
});
