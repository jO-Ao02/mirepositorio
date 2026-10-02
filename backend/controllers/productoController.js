const productoModel = require('../models/productoModel');

async function obtenerCatalogo(req, res) {
    try {
        const categorias = await productoModel.obtenerCategorias();
        const productos = await productoModel.obtenerCatalogo();

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            categorias: categorias,
            productos: productos
        }));
    } catch (error) {
        console.error('Error al obtener catalogo de productos:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ mensaje: 'Error al consultar la carta del restaurante' }));
    }
}

module.exports = {
    obtenerCatalogo
};
