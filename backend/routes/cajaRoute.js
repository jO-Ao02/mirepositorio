const cajaController = require('../controllers/cajaController');
const pedidoController = require('../controllers/pedidoController');
const verificarToken = require('../middlewares/auth');

const rutas = {
    'GET /caja/estado-actual': async function(req, res) {
        await verificarToken(req, res, cajaController.obtenerEstadoActual);
    },
    'POST /caja/apertura': async function(req, res) {
        await verificarToken(req, res, cajaController.aperturaCaja);
    },
    'POST /caja/cierre': async function(req, res) {
        await verificarToken(req, res, cajaController.cierreCaja);
    },
    'GET /pedidos/pendientes-cobro': async function(req, res) {
        await verificarToken(req, res, pedidoController.obtenerPendientes);
    },
    'POST /pagos/procesar': async function(req, res) {
        await verificarToken(req, res, cajaController.procesarCobro);
    },
    'GET /comprobantes/turno-actual': async function(req, res) {
        await verificarToken(req, res, cajaController.obtenerComprobantesTurno);
    },
    'POST /caja/egreso': async function(req, res) {
        await verificarToken(req, res, cajaController.registrarEgreso);
    },
    'GET /caja/movimientos': async function(req, res) {
        await verificarToken(req, res, cajaController.obtenerMovimientos);
    }
};

async function manejarRutasCaja(req, res) {
    const rutaSolicitada = req.method + ' ' + req.url;

    if (rutas[rutaSolicitada]) {
        await rutas[rutaSolicitada](req, res);
    } else if (req.method === 'GET' && req.url.startsWith('/pedidos/')) {
        await verificarToken(req, res, pedidoController.obtenerUnPedido);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Ruta no encontrada en módulo de caja');
    }
}

module.exports = manejarRutasCaja;
