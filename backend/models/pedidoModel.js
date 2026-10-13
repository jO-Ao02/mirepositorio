const pool = require('../config/db');

async function obtenerPendientesDeCobro() {
    try {
        const consulta = `
            SELECT 
                p.id_pedido,
                p.id_mesa,
                m.numero AS numero_mesa,
                p.id_usuario,
                CONCAT(u.nombre, ' ', u.apellido) AS nombre_mozo,
                p.tipo_pedido,
                COALESCE(p.estado_pedido, 'Pendiente') AS estado_entrega,
                p.total,
                p.fecha_hora
            FROM pedido p
            LEFT JOIN mesa m ON p.id_mesa = m.id_mesa
            LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
            LEFT JOIN pago pg ON p.id_pedido = pg.id_pedido   
            WHERE pg.id_pedido IS NULL                         
            AND COALESCE(p.estado_pedido, 'Pendiente') != 'Cancelado'
            ORDER BY p.fecha_hora DESC;
        `;
        const resultado = await pool.query(consulta);
        return resultado.rows;
    } catch (error) {
        console.error('Error al obtener pedidos pendientes de cobro:', error.message);
        throw error;
    }
}

async function obtenerPorId(id_pedido) {
    try {
        const consulta = `
            SELECT 
                p.id_pedido,
                p.id_mesa,
                m.numero AS numero_mesa,
                p.id_usuario,
                CONCAT(u.nombre, ' ', u.apellido) AS nombre_mozo,
                p.tipo_pedido,
                COALESCE(p.estado_pedido, 'Pendiente') AS estado_entrega,
                p.total,
                p.fecha_hora
            FROM pedido p
            LEFT JOIN mesa m ON p.id_mesa = m.id_mesa
            LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
            WHERE p.id_pedido = $1
        `;
        const resultado = await pool.query(consulta, [id_pedido]);
        return resultado.rows[0] || null;
    } catch (error) {
        console.error('Error al obtener pedido por ID:', error.message);
        throw error;
    }
}

async function obtenerDetallesPorPedido(id_pedido) {
    try {
        const consulta = `
            SELECT 
                dp.id_detalle,
                dp.id_producto,
                pr.nombre AS nombre_producto,
                dp.cantidad,
                dp.precio_unitario,
                dp.subtotal
            FROM detalle_pedido dp
            JOIN producto pr ON dp.id_producto = pr.id_producto
            WHERE dp.id_pedido = $1
            ORDER BY dp.id_detalle ASC
        `;
        const resultado = await pool.query(consulta, [id_pedido]);
        return resultado.rows;
    } catch (error) {
        console.error('Error al obtener detalles del pedido:', error.message);
        throw error;
    }
}

async function crearPedido(datos) {
    try {
        const consulta = `
            INSERT INTO pedido (id_usuario, id_mesa, tipo_pedido, estado_pedido, total, fecha_hora)
            VALUES ($1, $2, $3, 'Pendiente', $4, NOW())
            RETURNING *
        `;
        const valores = [datos.id_usuario, datos.id_mesa || null, datos.tipo_pedido || 'Mesa', datos.total || 0];
        const resultado = await pool.query(consulta, valores);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al crear pedido:', error.message);
        throw error;
    }
}

async function insertarDetalle(datos) {
    try {
        const consulta = `
            INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const valores = [
            datos.id_pedido,
            datos.id_producto,
            datos.cantidad,
            datos.precio_unitario,
            datos.subtotal
        ];
        const resultado = await pool.query(consulta, valores);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al insertar detalle de pedido:', error.message);
        throw error;
    }
}

async function actualizarTotalPedido(id_pedido, total) {
    try {
        const consulta = 'UPDATE pedido SET total = $1 WHERE id_pedido = $2 RETURNING *';
        const resultado = await pool.query(consulta, [total, id_pedido]);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al actualizar total de pedido:', error.message);
        throw error;
    }
}

async function limpiarDetallesPedido(id_pedido) {
    try {
        await pool.query('DELETE FROM detalle_pedido WHERE id_pedido = $1', [id_pedido]);
    } catch (error) {
        console.error('Error al limpiar detalles de pedido:', error.message);
        throw error;
    }
}

async function obtenerPedidosActivos() {
    try {
        const consulta = `
            SELECT 
                p.id_pedido,
                p.id_mesa,
                m.numero AS numero_mesa,
                p.id_usuario,
                CONCAT(u.nombre, ' ', u.apellido) AS nombre_mozo,
                p.tipo_pedido,
                COALESCE(p.estado_pedido, 'Pendiente') AS estado_pedido,
                p.total,
                p.fecha_hora
            FROM pedido p
            LEFT JOIN mesa m ON p.id_mesa = m.id_mesa
            LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
            LEFT JOIN pago pg ON p.id_pedido = pg.id_pedido   
            WHERE pg.id_pedido IS NULL                         
            AND COALESCE(p.estado_pedido, 'Pendiente') != 'Cancelado'
            ORDER BY p.fecha_hora DESC;
        `;
        const resultado = await pool.query(consulta);
        return resultado.rows;
    } catch (error) {
        console.error('Error al obtener pedidos activos:', error.message);
        throw error;
    }
}

async function cambiarEstadoPedido(id_pedido, nuevo_estado) {
    try {
        const consulta = 'UPDATE pedido SET estado_pedido = $1 WHERE id_pedido = $2 RETURNING *';
        const resultado = await pool.query(consulta, [nuevo_estado, id_pedido]);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al cambiar estado del pedido:', error.message);
        throw error;
    }
}

async function liberarMesa(id_mesa) {
    try {
        if (!id_mesa) return null;
        const consulta = "UPDATE mesa SET estado = 'Libre' WHERE id_mesa = $1 RETURNING *";
        const resultado = await pool.query(consulta, [id_mesa]);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al liberar mesa:', error.message);
        return null;
    }
}

module.exports = {
    obtenerPendientesDeCobro,
    obtenerPorId,
    obtenerDetallesPorPedido,
    liberarMesa,
    crearPedido,
    insertarDetalle,
    actualizarTotalPedido,
    limpiarDetallesPedido,
    obtenerPedidosActivos,
    cambiarEstadoPedido
};
