const pool = require('../config/db');

async function obtenerTodos() {
    try {
        const resultado = await pool.query('SELECT * FROM usuario');
        return resultado.rows;
    } catch (error) {
        console.error('Error al obtener los usuarios:', error.message);
        throw error;
    }
}

async function insertar(usuario) {
    try{
        const consulta = 'insert into usuario (nombre, apellido, nombre_usuario, contrasena, rol) values ($1, $2, $3, $4, $5) returning id_usuario, nombre, apellido, nombre_usuario, rol, estado';

        const valores = [usuario.nombre, usuario.apellido, usuario.nombre_usuario, usuario.contrasena, usuario.rol];

        const resultado = await pool.query(consulta, valores);

        return resultado.rows[0];
    }catch(error){
        console.error('Error al insertar datos:', error.mesage);
        throw error;
    }
}

async function obtenerPorId(id) {
    try {
        const consulta = 'SELECT id_usuario, nombre, apellido, nombre_usuario, rol, estado FROM usuario WHERE id_usuario = $1';
        const resultado = await pool.query(consulta, [id]);
        
        return resultado.rows[0]; 
    } catch (error) {
        console.error('Error al obtener el usuario por ID:', error.message);
        throw error;
    }
}

async function actualizar(id, datos) {
    try {
        const consulta = `
            UPDATE usuario 
            SET nombre = $1, apellido = $2, rol = $3, nombre_usuario = $4
            WHERE id_usuario = $5 
            RETURNING id_usuario, nombre, apellido, nombre_usuario, rol, estado
        `;
        const valores = [datos.nombre, datos.apellido, datos.rol, datos.nombre_usuario, id];
        const resultado = await pool.query(consulta, valores);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al actualizar:', error.message);
        throw error;
    }
}

async function cambiarEstado(id, nuevoEstado) {
    try {
        const consulta = 'UPDATE usuario SET estado = $1 WHERE id_usuario = $2 RETURNING id_usuario, nombre, estado';
        const resultado = await pool.query(consulta, [nuevoEstado, id]);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al cambiar estado del usuario:', error.message);
        throw error;
    }
}

async function cambiarContrasena(id, nuevoHash) {
    try {
        const consulta = 'UPDATE usuario SET contrasena = $1 WHERE id_usuario = $2 RETURNING id_usuario';
        const resultado = await pool.query(consulta, [nuevoHash, id]);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al cambiar contraseña:', error.message);
        throw error;
    }
}

async function obtenerPorNombreUsuario(nombre_usuario) {
    try {
        const consulta = 'SELECT id_usuario, nombre, apellido, nombre_usuario, contrasena, rol, estado FROM usuario WHERE nombre_usuario = $1';
        const resultado = await pool.query(consulta, [nombre_usuario]);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al buscar usuario por nombre:', error.message);
        throw error;
    }
}

module.exports = {
    obtenerTodos,
    insertar,
    obtenerPorId,
    actualizar,
    cambiarEstado,
    cambiarContrasena,
    obtenerPorNombreUsuario
};