const pool = require('../config/db');

async function obtenerCajaAbierta() {
    try {
        const consulta = `
            SELECT c.*, u.nombre AS nombre_usuario, u.apellido AS apellido_usuario 
            FROM caja c 
            JOIN usuario u ON c.id_usuario = u.id_usuario 
            WHERE LOWER(c.estado) = 'abierta' 
            ORDER BY c.id_caja DESC 
            LIMIT 1
        `;
        const resultado = await pool.query(consulta);
        return resultado.rows[0] || null;
    } catch (error) {
        console.error('Error al obtener la caja abierta:', error.message);
        throw error;
    }
}

async function obtenerUltimaCaja() {
    try {
        const consulta = 'SELECT * FROM caja ORDER BY id_caja DESC LIMIT 1';
        const resultado = await pool.query(consulta);
        return resultado.rows[0] || null;
    } catch (error) {
        console.error('Error al obtener la última caja:', error.message);
        throw error;
    }
}

async function obtenerVentasPorCaja(id_caja) {
    try {
        const consulta = `
            SELECT 
                COALESCE(SUM(monto_pagado), 0) AS total_ventas,
                COALESCE(SUM(CASE WHEN LOWER(metodo_pago) = 'efectivo' THEN monto_pagado ELSE 0 END), 0) AS ventas_efectivo,
                COALESCE(SUM(CASE WHEN LOWER(metodo_pago) != 'efectivo' THEN monto_pagado ELSE 0 END), 0) AS ventas_digitales
            FROM pago
            WHERE id_caja = $1
        `;
        const resultado = await pool.query(consulta, [id_caja]);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al obtener las ventas de la caja:', error.message);
        throw error;
    }
}

async function abrirCaja(id_usuario, monto_apertura) {
    try {
        const consulta = `
            INSERT INTO caja (id_usuario, fecha_hora_apertura, monto_apertura, estado) 
            VALUES ($1, NOW(), $2, 'abierta') 
            RETURNING *
        `;
        const valores = [id_usuario, monto_apertura];
        const resultado = await pool.query(consulta, valores);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al abrir la caja:', error.message);
        throw error;
    }
}

async function cerrarCaja(id_caja, monto_esperado, monto_real) {
    try {
        const consulta = `
            UPDATE caja 
            SET fecha_hora_cierre = NOW(), 
                monto_cierre_esperado = $1, 
                monto_cierre_real = $2, 
                estado = 'cerrada' 
            WHERE id_caja = $3 
            RETURNING *
        `;
        const valores = [monto_esperado, monto_real, id_caja];
        const resultado = await pool.query(consulta, valores);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al cerrar la caja:', error.message);
        throw error;
    }
}

async function registrarMovimiento(id_caja, tipo_movimiento, monto, descripcion) {
    try {
        const consulta = `
            INSERT INTO movimiento_caja (id_caja, tipo_movimiento, monto, descripcion, fecha_movimiento)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id_movimiento
        `;
        const valores = [id_caja, tipo_movimiento, monto, descripcion];
        const resultado = await pool.query(consulta, valores);
        return resultado.rows[0] ? resultado.rows[0].id_movimiento : null;
    } catch (error) {
        console.error('Error al registrar movimiento de caja:', error.message);
        return null;
    }
}

async function registrarPago(id_pedido, id_caja, id_movimiento, metodo_pago, monto_pagado) {
    try {
        const consulta = `
            INSERT INTO pago (id_pedido, id_caja, id_movimiento, metodo_pago, monto_pagado, estado_pago, fecha_pago)
            VALUES ($1, $2, $3, $4, $5, 'pagado', NOW())
            RETURNING *
        `;
        const valores = [id_pedido, id_caja, id_movimiento, metodo_pago, monto_pagado];
        const resultado = await pool.query(consulta, valores);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al registrar pago:', error.message);
        throw error;
    }
}

async function buscarOCrearCliente(datos) {
    try {
        const consultaBuscar = 'SELECT * FROM cliente WHERE numero_documento = $1 LIMIT 1';
        const resBuscar = await pool.query(consultaBuscar, [datos.numero_documento]);

        if (resBuscar.rows.length > 0) {
            return resBuscar.rows[0];
        }

        const consultaInsertar = `
            INSERT INTO cliente (id_tipo_documento, numero_documento, nombre_razon_social, direccion, correo)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const valores = [
            datos.id_tipo_documento || 1,
            datos.numero_documento,
            datos.nombre_razon_social,
            datos.direccion || null,
            datos.correo || null
        ];
        const resInsertar = await pool.query(consultaInsertar, valores);
        return resInsertar.rows[0];
    } catch (error) {
        console.error('Error en buscarOCrearCliente:', error.message);
        throw error;
    }
}

async function obtenerTipoComprobante(tipo) {
    try {
        let codigo = '03'; // Boleta por defecto
        if (tipo === 'factura') {
            codigo = '01';
        } else if (tipo === 'ticket') {
            codigo = '00';
        }

        const consulta = 'SELECT * FROM tipo_comprobante WHERE codigo_sunat = $1 LIMIT 1';
        const resultado = await pool.query(consulta, [codigo]);
        return resultado.rows[0] || null;
    } catch (error) {
        console.error('Error al obtener tipo de comprobante:', error.message);
        throw error;
    }
}

async function obtenerSiguienteCorrelativo(id_tipo_comprobante) {
    try {
        const consulta = 'SELECT COUNT(*) + 1 AS siguiente FROM comprobante WHERE id_tipo_comprobante = $1';
        const resultado = await pool.query(consulta, [id_tipo_comprobante]);
        const num = resultado.rows[0].siguiente;
        return String(num).padStart(6, '0');
    } catch (error) {
        return '000001';
    }
}

async function insertarComprobante(datos) {
    try {
        const consulta = `
            INSERT INTO comprobante (
                id_pedido, id_cliente, id_tipo_comprobante, serie, correlativo, 
                fecha_emision, subtotal, igv, total
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
            RETURNING *
        `;
        const valores = [
            datos.id_pedido,
            datos.id_cliente,
            datos.id_tipo_comprobante,
            datos.serie,
            datos.correlativo,
            datos.subtotal,
            datos.igv,
            datos.total
        ];
        const resultado = await pool.query(consulta, valores);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al insertar comprobante:', error.message);
        throw error;
    }
}

async function obtenerComprobantesPorCaja(id_caja) {
    try {
        const consulta = `
            SELECT 
                c.id_comprobante,
                c.id_pedido,
                tc.descripcion AS tipo_comprobante,
                c.serie,
                c.correlativo,
                c.fecha_emision,
                c.total,
                cl.nombre_razon_social AS nombre_cliente,
                cl.numero_documento,
                pg.metodo_pago,
                m.numero AS numero_mesa
            FROM comprobante c
            JOIN cliente cl ON c.id_cliente = cl.id_cliente
            JOIN tipo_comprobante tc ON c.id_tipo_comprobante = tc.id_tipo_comprobante
            JOIN pago pg ON c.id_pedido = pg.id_pedido
            LEFT JOIN pedido p ON c.id_pedido = p.id_pedido
            LEFT JOIN mesa m ON p.id_mesa = m.id_mesa
            WHERE pg.id_caja = $1
            ORDER BY c.fecha_emision DESC
        `;
        const resultado = await pool.query(consulta, [id_caja]);
        return resultado.rows;
    } catch (error) {
        console.error('Error al obtener comprobantes por caja:', error.message);
        throw error;
    }
}

async function registrarEgreso(id_caja, monto, descripcion) {
    try {
        const consulta = `
            INSERT INTO movimiento_caja (id_caja, tipo_movimiento, monto, descripcion, fecha_movimiento)
            VALUES ($1, 'egreso', $2, $3, NOW())
            RETURNING *
        `;
        const valores = [id_caja, monto, descripcion];
        const resultado = await pool.query(consulta, valores);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al registrar egreso de caja:', error.message);
        throw error;
    }
}

async function obtenerEgresosPorCaja(id_caja) {
    try {
        const consulta = `
            SELECT COALESCE(SUM(monto), 0) AS total_egresos
            FROM movimiento_caja
            WHERE id_caja = $1 AND LOWER(tipo_movimiento) = 'egreso'
        `;
        const resultado = await pool.query(consulta, [id_caja]);
        return resultado.rows[0];
    } catch (error) {
        console.error('Error al obtener egresos de caja:', error.message);
        throw error;
    }
}

async function obtenerMovimientosPorCaja(id_caja) {
    try {
        const consulta = `
            SELECT 
                id_movimiento,
                id_caja,
                tipo_movimiento,
                monto,
                descripcion,
                fecha_movimiento
            FROM movimiento_caja
            WHERE id_caja = $1
            ORDER BY fecha_movimiento DESC
        `;
        const resultado = await pool.query(consulta, [id_caja]);
        return resultado.rows;
    } catch (error) {
        console.error('Error al obtener movimientos de caja:', error.message);
        throw error;
    }
}

module.exports = {
    obtenerCajaAbierta,
    obtenerUltimaCaja,
    obtenerVentasPorCaja,
    abrirCaja,
    cerrarCaja,
    registrarMovimiento,
    registrarPago,
    buscarOCrearCliente,
    obtenerTipoComprobante,
    obtenerSiguienteCorrelativo,
    insertarComprobante,
    obtenerComprobantesPorCaja,
    registrarEgreso,
    obtenerEgresosPorCaja,
    obtenerMovimientosPorCaja
};
