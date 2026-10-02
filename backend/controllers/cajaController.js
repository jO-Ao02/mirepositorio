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

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            abierta: true,
            id_caja: cajaAbierta.id_caja,
            id_usuario: cajaAbierta.id_usuario,
            nombre_usuario: cajaAbierta.nombre_usuario + ' ' + (cajaAbierta.apellido_usuario || ''),
            fecha_hora_apertura: cajaAbierta.fecha_hora_apertura,
            monto_apertura: parseFloat(cajaAbierta.monto_apertura || 0),
            ventas_efectivo: parseFloat(ventas.ventas_efectivo || 0),
            ventas_digitales: parseFloat(ventas.ventas_digitales || 0),
            total_ventas: parseFloat(ventas.total_ventas || 0)
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
            const montoApertura = parseFloat(cajaAbierta.monto_apertura || 0);
            const ventasEfectivo = parseFloat(ventas.ventas_efectivo || 0);
            const montoEsperado = montoApertura + ventasEfectivo;
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

            // 1. Registrar o recuperar cliente
            const cliente = await cajaModel.buscarOCrearCliente({
                id_tipo_documento: datos.id_tipo_documento || 1,
                numero_documento: datos.numero_documento,
                nombre_razon_social: datos.nombre_razon_social,
                direccion: datos.direccion,
                correo: datos.correo
            });

            // 2. Determinar tipo de comprobante
            const tipoComp = await cajaModel.obtenerTipoComprobante(datos.tipo_comprobante);
            const idTipoComp = tipoComp ? tipoComp.id_tipo_comprobante : 1;

            let serie = 'B001';
            if (datos.tipo_comprobante === 'factura') {
                serie = 'F001';
            } else if (datos.tipo_comprobante === 'ticket') {
                serie = 'NV01';
            }

            const correlativo = await cajaModel.obtenerSiguienteCorrelativo(idTipoComp);

            // 3. Calcular montos
            const total = parseFloat(datos.total || pedido.total || 0);
            const subtotal = parseFloat((total / 1.18).toFixed(2));
            const igv = parseFloat((total - subtotal).toFixed(2));

            // 4. Insertar comprobante
            const nuevoComprobante = await cajaModel.insertarComprobante({
                id_pedido: pedido.id_pedido,
                id_cliente: cliente.id_cliente,
                id_tipo_comprobante: idTipoComp,
                serie: serie,
                correlativo: correlativo,
                subtotal: subtotal,
                igv: igv,
                total: total
            });

            // 5. Registrar movimiento de caja
            const idMovimiento = await cajaModel.registrarMovimiento(
                cajaAbierta.id_caja,
                'ingreso',
                total,
                'Cobro de pedido #' + pedido.id_pedido + ' (' + serie + '-' + correlativo + ')'
            );

            // 6. Registrar pago
            const nuevoPago = await cajaModel.registrarPago(
                pedido.id_pedido,
                cajaAbierta.id_caja,
                idMovimiento,
                datos.metodo_pago || 'efectivo',
                total
            );

            // 7. Liberar mesa asociada
            if (pedido.id_mesa) {
                await pedidoModel.liberarMesa(pedido.id_mesa);
            }

            res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                mensaje: 'Cobro procesado y comprobante emitido exitosamente',
                comprobante: nuevoComprobante,
                pago: nuevoPago
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

module.exports = {
    obtenerEstadoActual,
    aperturaCaja,
    cierreCaja,
    procesarCobro,
    obtenerComprobantesTurno
};
