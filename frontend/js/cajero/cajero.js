document.addEventListener('DOMContentLoaded', iniciar);

function iniciar() {
    protegerPaginaCajero();
    iniciarBarraSuperior();
    
    document.getElementById('botonActualizarPedidos').addEventListener('click', function() {
        cargarPedidosPendientes();
        cargarEstadoCaja();
    });

    cargarEstadoCaja();
    cargarPedidosPendientes();
    cargarComprobantesTurno();
}

async function cargarEstadoCaja() {
    var etiquetaEstado = document.getElementById('etiquetaEstadoCaja');
    var textoEstado = document.getElementById('textoEstadoCaja');
    var valorMontoApertura = document.getElementById('valorMontoApertura');
    var valorTotalVendido = document.getElementById('valorTotalVendido');
    var avisoCajaCerrada = document.getElementById('avisoCajaCerrada');
    var tarjetaCaja = document.getElementById('tarjetaEstadoCaja');

    try {
        var estado = await apiFetch('/caja/estado-actual');
        
        if (estado && estado.abierta) {
            textoEstado.textContent = 'Turno abierto por ' + (estado.nombre_usuario || 'Cajero');
            etiquetaEstado.textContent = 'Abierta';
            etiquetaEstado.className = 'etiqueta-estado etiqueta-estado--activo';
            tarjetaCaja.className = 'tarjeta tarjeta--verde';
            avisoCajaCerrada.hidden = true;
            valorMontoApertura.textContent = 'S/ ' + parseFloat(estado.monto_apertura || 0).toFixed(2);
            valorTotalVendido.textContent = 'S/ ' + parseFloat(estado.total_ventas || 0).toFixed(2);
        } else {
            textoEstado.textContent = 'Caja cerrada';
            etiquetaEstado.textContent = 'Cerrada';
            etiquetaEstado.className = 'etiqueta-estado etiqueta-estado--inactivo';
            tarjetaCaja.className = 'tarjeta tarjeta--roja';
            avisoCajaCerrada.hidden = false;
            valorMontoApertura.textContent = 'S/ 0.00';
            valorTotalVendido.textContent = 'S/ 0.00';
        }
    } catch (error) {
        // En caso de que el endpoint aún no esté desplegado en backend
        textoEstado.textContent = 'Turno disponible';
        valorMontoApertura.textContent = 'S/ 0.00';
        valorTotalVendido.textContent = 'S/ 0.00';
    }
}

async function cargarPedidosPendientes() {
    var cuerpoTabla = document.getElementById('cuerpoTablaPedidos');
    var mensajeSinPedidos = document.getElementById('mensajeSinPedidos');
    var valorCuentasPendientes = document.getElementById('valorCuentasPendientes');

    cuerpoTabla.innerHTML = '';
    mensajeSinPedidos.hidden = false;
    mensajeSinPedidos.textContent = 'Cargando pedidos pendientes...';

    try {
        var pedidos = await apiFetch('/pedidos/pendientes-cobro');

        if (!pedidos || pedidos.length === 0) {
            mensajeSinPedidos.textContent = 'No hay pedidos pendientes de cobro.';
            valorCuentasPendientes.textContent = '0';
            return;
        }

        mensajeSinPedidos.hidden = true;
        valorCuentasPendientes.textContent = pedidos.length;

        for (var i = 0; i < pedidos.length; i++) {
            var fila = crearFilaPedido(pedidos[i]);
            cuerpoTabla.appendChild(fila);
        }

    } catch (error) {
        mensajeSinPedidos.hidden = false;
        mensajeSinPedidos.textContent = 'No se pudieron cargar los pedidos: ' + error.message;
        valorCuentasPendientes.textContent = '0';
    }
}

function crearFilaPedido(pedido) {
    var fila = document.createElement('tr');

    var numeroMesa = pedido.numero_mesa ? 'Mesa ' + pedido.numero_mesa : 'Pedido #' + pedido.id_pedido;
    var horaFormateada = pedido.fecha_hora ? new Date(pedido.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

    fila.innerHTML =
        '<td>' +
            '<div class="celda-nombre">' + numeroMesa + '</div>' +
            '<div class="celda-subtexto mono">#' + pedido.id_pedido + '</div>' +
        '</td>' +
        '<td><span class="etiqueta-rol etiqueta-rol--cocina">' + (pedido.tipo_pedido || 'Mesa') + '</span></td>' +
        '<td>' + (pedido.nombre_mozo || 'Personal') + '</td>' +
        '<td class="mono">' + horaFormateada + '</td>' +
        '<td><span class="etiqueta-estado etiqueta-estado--activo">' + (pedido.estado_entrega || 'Entregado') + '</span></td>' +
        '<td class="mono" style="font-weight:700;">S/ ' + parseFloat(pedido.total || 0).toFixed(2) + '</td>' +
        '<td class="celda-acciones">' +
            '<a href="cobroForm.html?pedido=' + pedido.id_pedido + '" class="boton boton--principal boton--pequeno">Cobrar</a>' +
        '</td>';

    return fila;
}

async function cargarComprobantesTurno() {
    var cuerpoTabla = document.getElementById('cuerpoTablaComprobantes');
    var mensajeSinComprobantes = document.getElementById('mensajeSinComprobantes');

    cuerpoTabla.innerHTML = '';
    mensajeSinComprobantes.hidden = false;
    mensajeSinComprobantes.textContent = 'Cargando comprobantes...';

    try {
        var comprobantes = await apiFetch('/comprobantes/turno-actual');

        if (!comprobantes || comprobantes.length === 0) {
            mensajeSinComprobantes.textContent = 'Aún no se han emitido comprobantes en este turno.';
            return;
        }

        mensajeSinComprobantes.hidden = true;

        for (var i = 0; i < comprobantes.length; i++) {
            var fila = crearFilaComprobante(comprobantes[i]);
            cuerpoTabla.appendChild(fila);
        }

    } catch (error) {
        mensajeSinComprobantes.hidden = false;
        mensajeSinComprobantes.textContent = 'Aún no se han emitido comprobantes en este turno.';
    }
}

function crearFilaComprobante(comp) {
    var fila = document.createElement('tr');

    var numeroDoc = (comp.serie || 'B001') + '-' + (comp.correlativo || String(comp.id_comprobante).padStart(6, '0'));
    var metodo = (comp.metodo_pago || 'efectivo').toLowerCase();
    var claseMetodo = 'etiqueta-metodo--' + metodo;
    var hora = comp.fecha_emision ? new Date(comp.fecha_emision).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

    fila.innerHTML =
        '<td>' +
            '<span class="etiqueta-comprobante">' + (comp.tipo_comprobante || 'Boleta') + '</span>' +
            '<div class="celda-subtexto mono">' + numeroDoc + '</div>' +
        '</td>' +
        '<td>' +
            '<div class="celda-nombre">' + (comp.nombre_cliente || 'Clientes Varios') + '</div>' +
            '<div class="celda-subtexto mono">' + (comp.numero_documento || '-') + '</div>' +
        '</td>' +
        '<td>' + (comp.numero_mesa ? 'Mesa ' + comp.numero_mesa : 'Pedido #' + comp.id_pedido) + '</td>' +
        '<td><span class="etiqueta-metodo ' + claseMetodo + '">' + (comp.metodo_pago || 'Efectivo') + '</span></td>' +
        '<td class="mono">' + hora + '</td>' +
        '<td class="mono" style="text-align:right; font-weight:700;">S/ ' + parseFloat(comp.total || 0).toFixed(2) + '</td>';

    return fila;
}
