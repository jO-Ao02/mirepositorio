const pedidoModel = require('../models/pedidoModel');
const mesaModel = require('../models/mesaModel');

async function obtenerPendientes(req, res) {
    try {
        const pedidos = await pedidoModel.obtenerPendientesDeCobro();

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(pedidos));

    } catch (error) {
        console.error('Error al obtener pedidos pendientes:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ mensaje: 'Error al obtener pedidos pendientes de cobro' }));
    }
}

async function obtenerUnPedido(req, res) {
    try {
        const partesUrl = req.url.split('/');
        const id = partesUrl[2];

        const pedido = await pedidoModel.obtenerPorId(id);

        if (!pedido) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ mensaje: 'Pedido no encontrado' }));
        }

        const detalles = await pedidoModel.obtenerDetallesPorPedido(id);
        pedido.detalles = detalles;

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(pedido));

    } catch (error) {
        console.error('Error al obtener pedido por ID:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ mensaje: 'Error al obtener la comanda' }));
    }
}

async function obtenerPedidosActivos(req, res) {
    try {
        const pedidos = await pedidoModel.obtenerPedidosActivos();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(pedidos));
    } catch (error) {
        console.error('Error al obtener pedidos activos:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ mensaje: 'Error al obtener comandas activas' }));
    }
}

async function crearOActualizarPedido(req, res) {
    let body = '';
    req.on('data', function (chunk) { body += chunk.toString(); });

    req.on('end', async function () {
        try {
            const datos = JSON.parse(body);
            const items = datos.items || [];

            if (items.length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ mensaje: 'La comanda debe contener al menos un producto' }));
            }

            let totalCalculado = 0;
            for (let i = 0; i < items.length; i++) {
                totalCalculado += parseFloat(items[i].subtotal || (items[i].cantidad * items[i].precio_unitario));
            }
            totalCalculado = parseFloat(totalCalculado.toFixed(2));

            const idUsuario = req.usuarioAutenticado ? req.usuarioAutenticado.id_usuario : 1;
            let idPedidoFinal = null;

            if (datos.id_pedido_existente) {
                // Actualizar pedido existente
                idPedidoFinal = datos.id_pedido_existente;
                await pedidoModel.limpiarDetallesPedido(idPedidoFinal);
                await pedidoModel.actualizarTotalPedido(idPedidoFinal, totalCalculado);
            } else {
                // Crear nuevo pedido
                const nuevoPedido = await pedidoModel.crearPedido({
                    id_usuario: idUsuario,
                    id_mesa: datos.id_mesa || null,
                    tipo_pedido: datos.tipo_pedido || 'Mesa',
                    total: totalCalculado
                });
                idPedidoFinal = nuevoPedido.id_pedido;
            }

            // Insertar los ítems en detalle_pedido
            for (let j = 0; j < items.length; j++) {
                const item = items[j];
                await pedidoModel.insertarDetalle({
                    id_pedido: idPedidoFinal,
                    id_producto: item.id_producto,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    subtotal: parseFloat((item.cantidad * item.precio_unitario).toFixed(2))
                });
            }

            // Si es comanda para una mesa, marcarla como Ocupada
            if (datos.id_mesa) {
                await mesaModel.cambiarEstado(datos.id_mesa, 'Ocupada');
            }

            res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                mensaje: 'Comanda registrada exitosamente',
                id_pedido: idPedidoFinal,
                total: totalCalculado
            }));

        } catch (error) {
            console.error('Error al guardar comanda:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ mensaje: 'Error al procesar la comanda: ' + error.message }));
        }
    });
}

module.exports = {
    obtenerPendientes,
    obtenerUnPedido,
    obtenerPedidosActivos,
    crearOActualizarPedido
};
