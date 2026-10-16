const pool = require('../config/db');
const cajaModel = require('../models/cajaModel');
const pedidoModel = require('../models/pedidoModel');

async function obtenerEstadoActual(req, res) {
    try {
        const cajaAbierta = await cajaModel.obtenerCajaAbierta();

        if (!cajaAbierta) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ 
                abierta: false, 
                mensaje: 'La caja se encuentra cerrada' 
            }));
        }

        const ventas = await cajaModel.obtenerVentasPorCaja(cajaAbierta.id_caja);
        const egresos = await cajaModel.obtenerEgresosPorCaja(cajaAbierta.id_caja);

        const montoApertura = parseFloat(cajaAbierta.monto_apertura || 0);
        const ventasEfectivo = parseFloat(ventas.ventas_efectivo || 0);
        const ventasDigitales = parseFloat(ventas.ventas_digitales || 0);
        const totalVentas = parseFloat(ventas.total_ventas || 0);
        const totalEgresos = parseFloat(egresos.total_egresos || 0);
        const efectivoEnCaja = parseFloat((montoApertura + ventasEfectivo - totalEgresos).toFixed(2));

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            abierta: true,
            id_caja: cajaAbierta.id_caja,
            id_usuario: cajaAbierta.id_usuario,
            nombre_usuario: cajaAbierta.nombre_usuario + ' ' + (cajaAbierta.apellido_usuario || ''),
            fecha_hora_apertura: cajaAbierta.fecha_hora_apertura,
            monto_apertura: montoApertura,
            ventas_efectivo: ventasEfectivo,
            ventas_digitales: ventasDigitales,
            total_ventas: totalVentas,
            total_egresos: totalEgresos,
            efectivo_en_caja: efectivoEnCaja
        }));

    } catch (error) {
        console.error('Error en obtenerEstadoActual:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ mensaje: 'Error al consultar el estado de la caja' }));
    }
}

async function aperturaCaja(req, res) {
    let body = '';
    req.on('data', function (chunk) { body += chunk.toString(); });

    req.on('end', async function () {
        try {
            const datos = JSON.parse(body);

            const cajaExistente = await cajaModel.obtenerCajaAbierta();
            if (cajaExistente) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'Ya existe una caja abierta en este momento' }));
            }

            const montoApertura = parseFloat(datos.monto_apertura || 0);
            const idUsuario = req.usuarioAutenticado ? req.usuarioAutenticado.id_usuario : 1;

            const nuevaCaja = await cajaModel.abrirCaja(idUsuario, montoApertura);

            await cajaModel.registrarMovimiento(
                nuevaCaja.id_caja, 
                'ingreso', 
                montoApertura, 
                'Apertura de turno de caja (Fondo inicial)'
            );

            res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                mensaje: 'Turno de caja abierto correctamente',
                caja: nuevaCaja
            }));

        } catch (error) {
            console.error('Error al abrir la caja:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Error interno al intentar abrir la caja' }));
        }
    });
}

async function cierreCaja(req, res) {
    let body = '';
    req.on('data', function (chunk) { body += chunk.toString(); });

    req.on('end', async function () {
        try {
            const datos = JSON.parse(body);

            const cajaAbierta = await cajaModel.obtenerCajaAbierta();
            if (!cajaAbierta) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'No hay ninguna caja abierta para cerrar' }));
            }

            const ventas = await cajaModel.obtenerVentasPorCaja(cajaAbierta.id_caja);
            const egresos = await cajaModel.obtenerEgresosPorCaja(cajaAbierta.id_caja);
            const montoApertura = parseFloat(cajaAbierta.monto_apertura || 0);
            const ventasEfectivo = parseFloat(ventas.ventas_efectivo || 0);
            const totalEgresos = parseFloat(egresos.total_egresos || 0);
            const montoEsperado = parseFloat((montoApertura + ventasEfectivo - totalEgresos).toFixed(2));
            const montoReal = parseFloat(datos.monto_cierre || 0);

            const cajaCerrada = await cajaModel.cerrarCaja(cajaAbierta.id_caja, montoEsperado, montoReal);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                mensaje: 'Turno de caja cerrado exitosamente',
                caja: cajaCerrada
            }));

        } catch (error) {
            console.error('Error al cerrar la caja:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Error interno al cerrar la caja' }));
        }
    });
}

async function procesarCobro(req, res) {
    let body = '';
    req.on('data', function (chunk) { body += chunk.toString(); });

    req.on('end', async function () {
        try {
            const datos = JSON.parse(body);

            const cajaAbierta = await cajaModel.obtenerCajaAbierta();
            if (!cajaAbierta) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'No hay ninguna caja abierta. Debe abrir turno de caja para cobrar.' }));
            }

            const pedido = await pedidoModel.obtenerPorId(datos.id_pedido);
            if (!pedido) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'Pedido no encontrado' }));
            }

            // 1. Determinar ítems que se van a cobrar en este comprobante
            let totalCalculado = 0;
            const itemsAProcesar = [];

            if (Array.isArray(datos.items) && datos.items.length > 0) {
                for (const item of datos.items) {
                    const resItem = await pool.query(
                        'SELECT id_detalle, id_producto, cantidad, precio_unitario FROM detalle_pedido WHERE id_detalle = $1 AND id_pedido = $2 AND id_comprobante IS NULL',
                        [item.id_detalle, pedido.id_pedido]
                    );
                    if (resItem.rows.length > 0) {
                        const row = resItem.rows[0];
                        const cant = Math.min(Math.max(1, parseInt(item.cantidad) || row.cantidad), row.cantidad);
                        const pUnit = parseFloat(row.precio_unitario);
                        totalCalculado += cant * pUnit;
                        itemsAProcesar.push({ id_detalle: row.id_detalle, cantidad: cant });
                    }
                }
            }

            // Si no se pasaron ítems específicos, tomar todos los ítems pendientes de comprobante
            if (itemsAProcesar.length === 0) {
                const resTodosPendientes = await pool.query(
                    'SELECT id_detalle, cantidad, precio_unitario FROM detalle_pedido WHERE id_pedido = $1 AND id_comprobante IS NULL',
                    [pedido.id_pedido]
                );
                if (resTodosPendientes.rows.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ mensaje: 'Esta cuenta ya no tiene ítems pendientes por cobrar.' }));
                }
                for (const row of resTodosPendientes.rows) {
                    totalCalculado += row.cantidad * parseFloat(row.precio_unitario);
                    itemsAProcesar.push({ id_detalle: row.id_detalle, cantidad: row.cantidad });
                }
            }

            totalCalculado = parseFloat(totalCalculado.toFixed(2));

            // 2. Registrar o recuperar cliente del comprobante
            const cliente = await cajaModel.buscarOCrearCliente({
                id_tipo_documento: datos.id_tipo_documento || 1,
                numero_documento: datos.numero_documento || '00000000',
                nombre_razon_social: datos.nombre_razon_social || 'Clientes Varios',
                direccion: datos.direccion || null,
                correo: datos.correo || null
            });

            // 3. Determinar tipo de comprobante y numeración correlativa
            const tipoComp = await cajaModel.obtenerTipoComprobante(datos.tipo_comprobante);
            const idTipoComp = tipoComp ? tipoComp.id_tipo_comprobante : 1;

            let serie = 'B001';
            if (datos.tipo_comprobante === 'factura') {
                serie = 'F001';
            } else if (datos.tipo_comprobante === 'ticket') {
                serie = 'NV01';
            }

            const correlativo = await cajaModel.obtenerSiguienteCorrelativo(idTipoComp);

            // 4. Calcular impuestos SUNAT (18% IGV)
            const subtotal = parseFloat((totalCalculado / 1.18).toFixed(2));
            const igv = parseFloat((totalCalculado - subtotal).toFixed(2));

            // 5. Insertar comprobante fiscal individual
            const nuevoComprobante = await cajaModel.insertarComprobante({
                id_pedido: pedido.id_pedido,
                id_cliente: cliente.id_cliente,
                id_tipo_comprobante: idTipoComp,
                serie: serie,
                correlativo: correlativo,
                subtotal: subtotal,
                igv: igv,
                total: totalCalculado
            });

            // 6. Asociar los ítems cobrados al comprobante recién emitido
            await cajaModel.asociarDetallesAComprobante(pedido.id_pedido, nuevoComprobante.id_comprobante, itemsAProcesar);

            // 7. Registrar movimiento en la caja del turno
            const idMovimiento = await cajaModel.registrarMovimiento(
                cajaAbierta.id_caja,
                'ingreso',
                totalCalculado,
                'Cobro pedido #' + pedido.id_pedido + ' (' + serie + '-' + correlativo + ' - ' + (datos.metodo_pago || 'efectivo') + ')'
            );

            // 8. Registrar el pago conectado directamente al comprobante
            const nuevoPago = await cajaModel.registrarPago(
                pedido.id_pedido,
                cajaAbierta.id_caja,
                idMovimiento,
                datos.metodo_pago || 'efectivo',
                totalCalculado,
                nuevoComprobante.id_comprobante
            );

            // 9. Verificar si quedan ítems pendientes en este pedido
            const resRestantes = await pool.query(
                'SELECT COUNT(*) AS restantes FROM detalle_pedido WHERE id_pedido = $1 AND id_comprobante IS NULL',
                [pedido.id_pedido]
            );
            const cantRestantes = parseInt(resRestantes.rows[0].restantes);
            const cuentaCompleta = (cantRestantes === 0);

            if (cuentaCompleta) {
                // Si ya no quedan ítems por cobrar, el pedido se marca como Pagado y se libera la mesa
                await pedidoModel.cambiarEstadoPedido(pedido.id_pedido, 'Pagado');
                if (pedido.id_mesa) {
                    await pedidoModel.liberarMesa(pedido.id_mesa);
                }
            } else {
                // Aún quedan platos pendientes de otros comensales de la mesa
                await pedidoModel.cambiarEstadoPedido(pedido.id_pedido, 'Parcial');
            }

            res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                mensaje: cuentaCompleta 
                    ? '¡Cuenta pagada en su totalidad y mesa liberada exitosamente!' 
                    : '¡Comprobante ' + serie + '-' + correlativo + ' emitido exitosamente! Quedan ' + cantRestantes + ' ítem(s) pendientes en esta mesa.',
                comprobante: nuevoComprobante,
                pago: nuevoPago,
                cuenta_completa: cuentaCompleta,
                items_restantes: cantRestantes,
                total_cobrado: totalCalculado
            }));

        } catch (error) {
            console.error('Error al procesar cobro:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Error al procesar el cobro: ' + error.message }));
        }
    });
}

async function obtenerComprobantesTurno(req, res) {
    try {
        const cajaAbierta = await cajaModel.obtenerCajaAbierta();

        if (!cajaAbierta) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify([]));
        }

        const comprobantes = await cajaModel.obtenerComprobantesPorCaja(cajaAbierta.id_caja);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(comprobantes));

    } catch (error) {
        console.error('Error al obtener comprobantes:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ mensaje: 'Error al obtener los comprobantes del turno' }));
    }
}

async function registrarEgreso(req, res) {
    let body = '';
    req.on('data', function (chunk) { body += chunk.toString(); });

    req.on('end', async function () {
        try {
            const datos = JSON.parse(body);

            const cajaAbierta = await cajaModel.obtenerCajaAbierta();
            if (!cajaAbierta) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'No hay ninguna caja abierta. Debe abrir turno de caja para registrar egresos.' }));
            }

            const monto = parseFloat(datos.monto || 0);
            const descripcion = (datos.descripcion || '').trim();

            if (isNaN(monto) || monto <= 0) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'El monto del egreso debe ser mayor a 0' }));
            }

            if (!descripcion) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'Debes ingresar el motivo o descripción del egreso (ej. Taxi, Imprevisto, Insumos)' }));
            }

            const nuevoEgreso = await cajaModel.registrarEgreso(cajaAbierta.id_caja, monto, descripcion);

            res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                mensaje: 'Egreso registrado exitosamente',
                egreso: nuevoEgreso
            }));

        } catch (error) {
            console.error('Error al registrar egreso:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Error al registrar el egreso: ' + error.message }));
        }
    });
}

async function obtenerMovimientos(req, res) {
    try {
        const cajaAbierta = await cajaModel.obtenerCajaAbierta();

        if (!cajaAbierta) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify([]));
        }

        const movimientos = await cajaModel.obtenerMovimientosPorCaja(cajaAbierta.id_caja);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(movimientos));

    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ mensaje: 'Error al obtener los movimientos de caja' }));
    }
}

module.exports = {
    obtenerEstadoActual,
    aperturaCaja,
    cierreCaja,
    procesarCobro,
    obtenerComprobantesTurno,
    registrarEgreso,
    obtenerMovimientos
};
