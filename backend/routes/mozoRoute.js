const mesaController = require('../controllers/mesaController');
const productoController = require('../controllers/productoController');
const pedidoController = require('../controllers/pedidoController');
const verificarToken = require('../middlewares/auth');

const rutas = {
    'GET /mesas': async function(req, res) {
        await verificarToken(req, res, mesaController.obtenerMesas);
    },
    'GET /productos/catalogo': async function(req, res) {
        await verificarToken(req, res, productoController.obtenerCatalogo);
    },
    'POST /pedidos': async function(req, res) {
        await verificarToken(req, res, pedidoController.crearOActualizarPedido);
    },
    'GET /pedidos/activos': async function(req, res) {
        await verificarToken(req, res, pedidoController.obtenerPedidosActivos);
    },
    'POST /pedidos/cambiar-estado': async function(req, res) {
        await verificarToken(req, res, pedidoController.cambiarEstadoPedido);
    }
};

async function manejarRutasMozo(req, res) {
    const rutaSolicitada = req.method + ' ' + req.url;

    if (rutas[rutaSolicitada]) {
        await rutas[rutaSolicitada](req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Ruta no encontrada en módulo de mozos');
    }
}

module.exports = manejarRutasMozo;
