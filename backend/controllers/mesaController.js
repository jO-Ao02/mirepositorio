const mesaModel = require('../models/mesaModel');

async function obtenerMesas(req, res) {
    try {
        const mesas = await mesaModel.obtenerTodas();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(mesas));
    } catch (error) {
        console.error('Error al obtener mesas:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ mensaje: 'Error al consultar las mesas' }));
    }
}

module.exports = {
    obtenerMesas
};
