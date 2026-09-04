const http = require('http');
const manejarRutas = require('./routes/usuarioRoute');

async function rutaObtenida(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite que cualquier frontend se conecte
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS'); // Métodos permitidos
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Encabezados permitidos (Authorization es clave para tu JWT)

    // 2. Interceptar la petición de seguridad 'OPTIONS' (Preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end(); // Respondemos "Todo bien" y cortamos aquí
    }
    await manejarRutas(req, res);
}

const servidor = http.createServer(rutaObtenida);

const PUERTO = process.env.APP_PUERTO || 3000;

servidor.listen(PUERTO, function () {
    console.log('Servidor corriendo en http://localhost:' + PUERTO);
});