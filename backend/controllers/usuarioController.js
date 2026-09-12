const usuarioModel = require('../models/usuarioModel');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

async function obtenerUsuarios(req, res) {
    try {
        const usuarios = await usuarioModel.obtenerTodos();

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        
        res.end(JSON.stringify(usuarios));

    } catch (error) {
        console.error('Error en el controlador:', error);
        
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ mensaje: 'Error al obtener los usuarios' }));
    }
}

async function crearUsuario(req, res) {
    let body = '';

    req.on('data', function (chunk) {
        body += chunk.toString();
    });

    req.on('end', async function () {
        try {
            const datosUsuario = JSON.parse(body);

            const hash = crypto.createHash('sha256').update(datosUsuario.contrasena).digest('hex')

            datosUsuario.contrasena = hash;

            const nuevoUsuario = await usuarioModel.insertar(datosUsuario);

            res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(nuevoUsuario));

        } catch (error) {
            console.error('Error al crear el usuario:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Error interno al intentar crear el usuario' }));
        }
    });
}

async function obtenerUnUsuario(req, res) {
    try {
        const partesUrl = req.url.split('/');
        const id = partesUrl[2];

        const usuario = await usuarioModel.obtenerPorId(id);

        if (usuario) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(usuario));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Usuario no encontrado' }));
        }

    } catch (error) {
        console.error('Error en obtenerUnUsuario:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ mensaje: 'Error interno del servidor' }));
    }
}

async function actualizarUsuario(req, res) {
    const partesUrl = req.url.split('/');
    const id = partesUrl[2];
    let body = '';

    req.on('data', function (chunk) { body += chunk.toString(); });

    req.on('end', async function() {
        try {
            const datos = JSON.parse(body);
            const usuarioActualizado = await usuarioModel.actualizar(id, datos);

            if (usuarioActualizado) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(usuarioActualizado));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ mensaje: 'Usuario no encontrado' }));
            }
        } catch (error) {
            console.error('Error en actualizarUsuario:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Error interno al actualizar' }));
        }
    });
}

async function cambiarEstadoUsuario(req, res) {
    let body = '';
    const partesUrl = req.url.split('/');
    const id = partesUrl[2];

    req.on('data', function (chunk) { body += chunk.toString(); });

    req.on('end', async function() {
        try {
            const datos = JSON.parse(body);
            const usuarioActualizado = await usuarioModel.cambiarEstado(id, datos.estado);

            if (usuarioActualizado) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    mensaje: 'Estado del usuario actualizado', 
                    usuario: usuarioActualizado 
                }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ mensaje: 'Usuario no encontrado' }));
            }
        } catch (error) {
            console.error('Error en cambiarEstadoUsuario:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Error interno al cambiar el estado' }));
        }
    });
}

async function cambiarContrasenaUsuario(req, res) {
    const partesUrl = req.url.split('/');
    const id = partesUrl[2];
    let body = '';

    req.on('data', function (chunk) { body += chunk.toString(); });

    req.on('end', async function() {
        try {
            const datos = JSON.parse(body);

            const hash = crypto.createHash('sha256').update(datos.nueva_contrasena).digest('hex');

            const usuarioModificado = await usuarioModel.cambiarContrasena(id, hash);

            if (usuarioModificado) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ mensaje: 'Contraseña actualizada correctamente' }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ mensaje: 'Usuario no encontrado' }));
            }
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Error interno del servidor' }));
        }
    });
}

async function login(req, res) {
    let body = '';
    req.on('data', function (chunk) { body += chunk.toString(); });

    req.on('end', async function() {
        try {
            const credenciales = JSON.parse(body);

            const usuario = await usuarioModel.obtenerPorNombreUsuario(credenciales.nombre_usuario);

            if (!usuario) {
                res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'Usuario o contraseña incorrectos' }));
            }

            if (!usuario.estado) {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'Acceso denegado: Usuario inactivo' }));
            }

            const hashIntento = crypto.createHash('sha256').update(credenciales.contrasena).digest('hex');

            if (hashIntento !== usuario.contrasena) {
                res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'Usuario o contraseña incorrectos' }));
            }

            const payload = {
                id_usuario: usuario.id_usuario,
                rol: usuario.rol
            };
            
            const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: process.env.JWT_EXPIRES });

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                mensaje: 'Autenticación exitosa',
                token: token,
                usuario: {
                    nombre: usuario.nombre,
                    rol: usuario.rol
                }
            }));

        } catch (error) {
            console.error('Error en el login:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Error interno del servidor' }));
        }
    });
}

module.exports = {
    obtenerUsuarios,
    crearUsuario,
    obtenerUnUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
    cambiarContrasenaUsuario,
    login
};