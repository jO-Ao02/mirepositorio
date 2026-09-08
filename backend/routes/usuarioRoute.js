const usuarioController = require('../controllers/usuarioController');
const verificarToken = require('../middlewares/auth');

const rutas = {
    'GET /': async function(req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Servidor funcionando correctamente');
    },
    'GET /usuarios': async function(req, res) {
        await verificarToken(req, res, usuarioController.obtenerUsuarios);
    },
    'POST /usuarios': async function(req, res) {
        await verificarToken(req, res, usuarioController.crearUsuario);
    },
    'POST /login': usuarioController.login,
    
};

async function manejarRutas(req, res) {
    const rutaSolicitada = req.method + ' ' + req.url;

    if (rutas[rutaSolicitada]) {
        await rutas[rutaSolicitada](req, res);
    }else if (req.method === 'GET' && req.url.startsWith('/usuarios/')) {
        await verificarToken(req, res, usuarioController.obtenerUnUsuario);
    }else if (req.method === 'PUT' && req.url.startsWith('/usuarios/')) {
        await verificarToken(req, res, usuarioController.actualizarUsuario);
    }else if (req.method === 'PATCH' && req.url.startsWith('/usuarios/')) {
        const partesUrl = req.url.split('/');
        if (partesUrl[3] === 'password') {
            await verificarToken(req, res, usuarioController.cambiarContrasenaUsuario);
        } else {
            await verificarToken(req, res, usuarioController.cambiarEstadoUsuario);
        }
    }else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Ruta no encontrada');
    }
}

module.exports = manejarRutas;