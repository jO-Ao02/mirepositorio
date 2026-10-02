const http = require('http');
const manejarRutasUsuario = require('./routes/usuarioRoute');
const manejarRutasCaja = require('./routes/cajaRoute');
const manejarRutasMozo = require('./routes/mozoRoute');

async function rutaObtenida(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end(); 
    }

    if (req.url.startsWith('/mesas') || req.url.startsWith('/productos')) {
        await manejarRutasMozo(req, res);
    } else if (req.url.startsWith('/caja') || req.url.startsWith('/pagos') || req.url.startsWith('/comprobantes')) {
        await manejarRutasCaja(req, res);
    } else if (req.url.startsWith('/pedidos')) {
        if (req.method === 'POST' || req.url === '/pedidos/activos') {
            await manejarRutasMozo(req, res);
        } else {
            await manejarRutasCaja(req, res);
        }
    } else {
        await manejarRutasUsuario(req, res);
    }
}

const servidor = http.createServer(rutaObtenida);

const PUERTO = process.env.APP_PUERTO || 3000;

servidor.listen(PUERTO, function () {
    console.log('Servidor corriendo en http://localhost:' + PUERTO);
});
