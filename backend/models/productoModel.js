const pool = require('../config/db');

async function obtenerCategorias() {
    try {
        const consulta = 'SELECT id_categoria, nombre FROM categoria WHERE estado = true ORDER BY id_categoria ASC';
        const resultado = await pool.query(consulta);
        return resultado.rows;
    } catch (error) {
        console.error('Error al obtener categorias:', error.message);
        throw error;
    }
}

async function obtenerCatalogo() {
    try {
        const consulta = `
            SELECT p.id_producto, p.id_categoria, c.nombre AS categoria_nombre, p.nombre, p.precio 
            FROM producto p 
            JOIN categoria c ON p.id_categoria = c.id_categoria 
            WHERE p.estado = true 
            ORDER BY c.id_categoria ASC, p.nombre ASC
        `;
        const resultado = await pool.query(consulta);
        return resultado.rows;
    } catch (error) {
        console.error('Error al obtener catalogo de productos:', error.message);
        throw error;
    }
}

module.exports = {
    obtenerCategorias,
    obtenerCatalogo
};
