const jwt = require('jsonwebtoken');
async function verificarToken(req, res, siguientePaso) {
    const encabezado = req.headers['authorization'];

    if (!encabezado) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ mensaje: 'Acceso denegado: No se proporcionó un token' }));
    }

    const token = encabezado.split(' ')[1];

    try {
        const datosDecodificados = jwt.verify(token, process.env.SECRET_KEY);
        
        req.usuarioAutenticado = datosDecodificados; 
        
        await siguientePaso(req, res);
    } catch (error) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ mensaje: 'Token inválido o expirado' }));
    }
}

module.exports = verificarToken;