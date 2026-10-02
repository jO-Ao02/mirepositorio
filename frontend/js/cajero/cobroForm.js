var idPedidoActual = null;
var totalPagarActual = 0;

document.addEventListener('DOMContentLoaded', iniciar);

function iniciar() {
    protegerPaginaCajero();
    iniciarBarraSuperior();

    var parametros = new URLSearchParams(window.location.search);
    idPedidoActual = parametros.get('pedido');

    if (!idPedidoActual) {
        alert('No se especificó un número de pedido para cobrar.');
        window.location.href = 'cajero.html';
        return;
    }

    document.getElementById('campoTipoComprobante').addEventListener('change', manejarCambioTipoComprobante);
    document.getElementById('campoMetodoPago').addEventListener('change', manejarCambioMetodoPago);
    document.getElementById('campoMontoRecibido').addEventListener('input', calcularVuelto);
    document.getElementById('formularioCobro').addEventListener('submit', manejarEnvioCobro);

    cargarDetallePedido();
}

async function cargarDetallePedido() {
    var cuerpoDetalle = document.getElementById('cuerpoDetallePedido');
    var tituloCobro = document.getElementById('tituloCobro');

    try {
        var pedido = await apiFetch('/pedidos/' + idPedidoActual);

        tituloCobro.textContent = 'Cobrar Pedido #' + pedido.id_pedido;
        document.getElementById('infoMesa').textContent = pedido.numero_mesa ? 'Mesa ' + pedido.numero_mesa : 'Para llevar';
        document.getElementById('infoTipoPedido').textContent = pedido.tipo_pedido || 'En salón';
        document.getElementById('infoMozo').textContent = pedido.nombre_mozo || 'Mozo';
        document.getElementById('infoHora').textContent = pedido.fecha_hora ? new Date(pedido.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

        totalPagarActual = parseFloat(pedido.total || 0);

        // Calcular IGV (18%) y Subtotal base
        var subtotal = totalPagarActual / 1.18;
        var igv = totalPagarActual - subtotal;

        document.getElementById('textoSubtotal').textContent = 'S/ ' + subtotal.toFixed(2);
        document.getElementById('textoIgv').textContent = 'S/ ' + igv.toFixed(2);
        document.getElementById('textoTotal').textContent = 'S/ ' + totalPagarActual.toFixed(2);
        document.getElementById('campoMontoTotalPagar').value = 'S/ ' + totalPagarActual.toFixed(2);

        // Llenar tabla de detalles
        cuerpoDetalle.innerHTML = '';
        var items = pedido.detalles || [];

        if (items.length === 0) {
            cuerpoDetalle.innerHTML = '<tr><td colspan="4" class="mensaje-vacio">No hay productos en esta comanda.</td></tr>';
            return;
        }

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var fila = document.createElement('tr');
            fila.innerHTML =
                '<td class="mono" style="font-weight:700;">' + item.cantidad + '</td>' +
                '<td>' + item.nombre_producto + '</td>' +
                '<td class="mono" style="text-align:right;">S/ ' + parseFloat(item.precio_unitario).toFixed(2) + '</td>' +
                '<td class="mono" style="text-align:right; font-weight:700;">S/ ' + parseFloat(item.subtotal).toFixed(2) + '</td>';
            cuerpoDetalle.appendChild(fila);
        }

    } catch (error) {
        mostrarMensaje('No se pudo cargar la información del pedido: ' + error.message, 'error');
    }
}

function manejarCambioTipoComprobante() {
    var tipoComprobante = document.getElementById('campoTipoComprobante').value;
    var selectorTipoDoc = document.getElementById('campoTipoDocumento');
    var campoDireccion = document.getElementById('campoDireccion');

    if (tipoComprobante === 'factura') {
        selectorTipoDoc.value = '6'; // RUC
        campoDireccion.required = true;
        document.getElementById('campoNumeroDocumento').placeholder = 'Ej. 20123456789 (11 dígitos)';
    } else {
        if (selectorTipoDoc.value === '6') {
            selectorTipoDoc.value = '1'; // DNI por defecto
        }
        campoDireccion.required = false;
        document.getElementById('campoNumeroDocumento').placeholder = 'Ej. 74859632 (8 dígitos)';
    }
}

function manejarCambioMetodoPago() {
    var metodo = document.getElementById('campoMetodoPago').value;
    var seccionEfectivo = document.getElementById('seccionEfectivo');

    if (metodo === 'efectivo') {
        seccionEfectivo.hidden = false;
        calcularVuelto();
    } else {
        seccionEfectivo.hidden = true;
    }
}

function calcularVuelto() {
    var montoRecibido = parseFloat(document.getElementById('campoMontoRecibido').value) || 0;
    var campoVuelto = document.getElementById('campoVuelto');

    if (montoRecibido < totalPagarActual) {
        campoVuelto.value = 'Faltan S/ ' + (totalPagarActual - montoRecibido).toFixed(2);
        campoVuelto.style.color = 'var(--red)';
    } else {
        var vuelto = montoRecibido - totalPagarActual;
        campoVuelto.value = 'S/ ' + vuelto.toFixed(2);
        campoVuelto.style.color = 'var(--green)';
    }
}

async function manejarEnvioCobro(evento) {
    evento.preventDefault();

    var botonCobro = document.getElementById('botonConfirmarCobro');
    var metodoPago = document.getElementById('campoMetodoPago').value;
    var montoRecibido = parseFloat(document.getElementById('campoMontoRecibido').value) || 0;

    if (metodoPago === 'efectivo' && montoRecibido < totalPagarActual) {
        mostrarMensaje('El monto recibido en efectivo no puede ser menor al total a pagar.', 'error');
        return;
    }

    var datosCobro = {
        id_pedido: parseInt(idPedidoActual),
        tipo_comprobante: document.getElementById('campoTipoComprobante').value,
        id_tipo_documento: parseInt(document.getElementById('campoTipoDocumento').value),
        numero_documento: document.getElementById('campoNumeroDocumento').value.trim(),
        nombre_razon_social: document.getElementById('campoNombreCliente').value.trim(),
        direccion: document.getElementById('campoDireccion').value.trim(),
        correo: document.getElementById('campoCorreo').value.trim(),
        metodo_pago: metodoPago,
        total: totalPagarActual
    };

    if (!datosCobro.nombre_razon_social || !datosCobro.numero_documento) {
        mostrarMensaje('Ingresa el documento y nombre del cliente.', 'error');
        return;
    }

    botonCobro.disabled = true;
    botonCobro.textContent = 'Procesando cobro...';

    try {
        await apiFetch('/pagos/procesar', {
            method: 'POST',
            body: JSON.stringify(datosCobro)
        });

        mostrarMensaje('¡Cobro registrado y comprobante emitido exitosamente!', 'exito');

        setTimeout(function() {
            window.location.href = 'cajero.html';
        }, 1500);

    } catch (error) {
        mostrarMensaje('Error al procesar el cobro: ' + error.message, 'error');
        botonCobro.disabled = false;
        botonCobro.textContent = 'Confirmar Cobro y Emitir Comprobante';
    }
}

function mostrarMensaje(texto, tipo) {
    var contenedor = document.getElementById('mensajeCobro');
    contenedor.hidden = false;
    contenedor.textContent = texto;
    contenedor.className = 'mensaje ' + (tipo === 'exito' ? 'mensaje--exito' : 'mensaje--error');
    contenedor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
