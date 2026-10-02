const pool = require('../config/db');

async function obtenerTodas() {
    try {
        const consulta = 'SELECT id_mesa, numero, capacidad, estado FROM mesa ORDER BY numero ASC';
        const resultado = await pool.query(consulta);
        return resultado.rows;
    } catch (error) {
        console.error('Error al obtener mesas:', error.message);
        throw error;
    }
}

async function cambiarEstado(id_mesa, estado) {
    try {
        const consulta = 'UPDATE mesa SET estado = $1 WHERE id_mesa = $2 RETURNING *';
        const resultado = await pool.query(consulta, [estado, id_mesa]);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al cambiar estado de mesa:', error.message);
        throw error;
    }
}

module.exports = {
    obtenerTodas,
    cambiarEstado
};
