var cajaActual = null;

document.addEventListener('DOMContentLoaded', iniciar);

function iniciar() {
    protegerPaginaCajero();
    iniciarBarraSuperior();
    
    document.getElementById('botonActualizarPedidos').addEventListener('click', function() {
        cargarPedidosPendientes();
        cargarEstadoCaja();
        cargarMovimientosTurno();
        cargarComprobantesTurno();
    });

    // Configurar modal de registrar egreso
    var btnAbrirModal = document.getElementById('botonAbrirModalEgreso');
    if (btnAbrirModal) {
        btnAbrirModal.addEventListener('click', abrirModalEgreso);
    }

    var btnAbrirSec = document.getElementById('botonRegistrarEgresoSec');
    if (btnAbrirSec) {
        btnAbrirSec.addEventListener('click', abrirModalEgreso);
    }

    var btnCerrarModal = document.getElementById('botonCerrarModalEgreso');
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', cerrarModalEgreso);
    }

    var btnCancelarModal = document.getElementById('botonCancelarModalEgreso');
    if (btnCancelarModal) {
        btnCancelarModal.addEventListener('click', cerrarModalEgreso);
    }

    var formEgreso = document.getElementById('formularioEgreso');
    if (formEgreso) {
        formEgreso.addEventListener('submit', manejarGuardarEgreso);
    }

    cargarEstadoCaja();
    cargarPedidosPendientes();
    cargarMovimientosTurno();
    cargarComprobantesTurno();
}

async function cargarEstadoCaja() {
    var etiquetaEstado = document.getElementById('etiquetaEstadoCaja');
    var textoEstado = document.getElementById('textoEstadoCaja');
    var valorMontoApertura = document.getElementById('valorMontoApertura');
    var valorTotalVendido = document.getElementById('valorTotalVendido');
    var valorTotalEgresos = document.getElementById('valorTotalEgresos');
    var valorEfectivoEnCaja = document.getElementById('valorEfectivoEnCaja');
    var avisoCajaCerrada = document.getElementById('avisoCajaCerrada');
    var tarjetaCaja = document.getElementById('tarjetaEstadoCaja');

    try {
        var estado = await apiFetch('/caja/estado-actual');
        cajaActual = estado;
        
        if (estado && estado.abierta) {
            textoEstado.textContent = 'Turno abierto por ' + (estado.nombre_usuario || 'Cajero');
            etiquetaEstado.textContent = 'Abierta';
            etiquetaEstado.className = 'etiqueta-estado etiqueta-estado--activo';
            tarjetaCaja.className = 'tarjeta tarjeta--verde';
            avisoCajaCerrada.hidden = true;
            valorMontoApertura.textContent = 'S/ ' + parseFloat(estado.monto_apertura || 0).toFixed(2);
            valorTotalVendido.textContent = 'S/ ' + parseFloat(estado.total_ventas || 0).toFixed(2);
            if (valorTotalEgresos) {
                valorTotalEgresos.textContent = '- S/ ' + parseFloat(estado.total_egresos || 0).toFixed(2);
            }
            if (valorEfectivoEnCaja) {
                valorEfectivoEnCaja.textContent = 'S/ ' + parseFloat(estado.efectivo_en_caja || 0).toFixed(2);
            }
        } else {
            textoEstado.textContent = 'Caja cerrada';
            etiquetaEstado.textContent = 'Cerrada';
            etiquetaEstado.className = 'etiqueta-estado etiqueta-estado--inactivo';
            tarjetaCaja.className = 'tarjeta tarjeta--roja';
            avisoCajaCerrada.hidden = false;
            valorMontoApertura.textContent = 'S/ 0.00';
            valorTotalVendido.textContent = 'S/ 0.00';
            if (valorTotalEgresos) valorTotalEgresos.textContent = '- S/ 0.00';
            if (valorEfectivoEnCaja) valorEfectivoEnCaja.textContent = 'S/ 0.00';
        }
    } catch (error) {
        textoEstado.textContent = 'Turno no disponible';
        valorMontoApertura.textContent = 'S/ 0.00';
        valorTotalVendido.textContent = 'S/ 0.00';
        if (valorTotalEgresos) valorTotalEgresos.textContent = '- S/ 0.00';
        if (valorEfectivoEnCaja) valorEfectivoEnCaja.textContent = 'S/ 0.00';
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

    var totalPedido = parseFloat(pedido.total || 0);
    var totalPagado = parseFloat(pedido.total_pagado || 0);
    var saldoPendiente = parseFloat((pedido.saldo_pendiente != null ? pedido.saldo_pendiente : (totalPedido - totalPagado)).toFixed(2));
    var esParcial = totalPagado > 0.01;

    var etiquetaEstado = '';
    var botonCobro = '';

    if (esParcial) {
        etiquetaEstado = '<span class="etiqueta-estado" style="background:#FFF7ED; color:#C2410C; border-color:#FED7AA;">Cobro parcial</span>';
        botonCobro = '<a href="cobroForm.html?pedido=' + pedido.id_pedido + '" class="boton boton--principal boton--pequeno">Continuar cobro</a>';
    } else {
        var estadoEntrega = pedido.estado_entrega || 'Pendiente';
        var esTerminado = estadoEntrega === 'Terminado' || estadoEntrega === 'Listo';

        if (esTerminado) {
            etiquetaEstado = '<span class="etiqueta-estado etiqueta-estado--activo">Listo para cobrar</span>';
            botonCobro = '<a href="cobroForm.html?pedido=' + pedido.id_pedido + '" class="boton boton--principal boton--pequeno">Cobrar cuenta</a>';
        } else {
            etiquetaEstado = '<span class="etiqueta-estado etiqueta-rol--cocina">En salón</span>';
            botonCobro = '<a href="cobroForm.html?pedido=' + pedido.id_pedido + '" class="boton boton--fantasma boton--pequeno">Cobrar</a>';
        }
    }

    var celdaMontoHtml = '';
    if (esParcial) {
        celdaMontoHtml = 
            '<div class="mono" style="font-weight:700; color:var(--accent-dark);">S/ ' + saldoPendiente.toFixed(2) + '</div>' +
            '<div class="celda-subtexto mono">de S/ ' + totalPedido.toFixed(2) + '</div>';
    } else {
        celdaMontoHtml = '<div class="mono" style="font-weight:700;">S/ ' + totalPedido.toFixed(2) + '</div>';
    }

    fila.innerHTML =
        '<td>' +
            '<div class="celda-nombre">' + numeroMesa + '</div>' +
            '<div class="celda-subtexto mono">#' + pedido.id_pedido + (esParcial ? ' &bull; ' + (pedido.items_pendientes || '?') + ' platos pend.' : '') + '</div>' +
        '</td>' +
        '<td><span class="etiqueta-rol etiqueta-rol--cocina">' + (pedido.tipo_pedido || 'Mesa') + '</span></td>' +
        '<td>' + (pedido.nombre_mozo || 'Personal') + '</td>' +
        '<td class="mono">' + horaFormateada + '</td>' +
        '<td>' + etiquetaEstado + '</td>' +
        '<td>' + celdaMontoHtml + '</td>' +
        '<td class="celda-acciones">' +
            botonCobro +
        '</td>';

    return fila;
}

async function cargarMovimientosTurno() {
    var cuerpoTabla = document.getElementById('cuerpoTablaMovimientos');
    var mensajeSinMovimientos = document.getElementById('mensajeSinMovimientos');

    if (!cuerpoTabla) return;

    cuerpoTabla.innerHTML = '';
    mensajeSinMovimientos.hidden = false;
    mensajeSinMovimientos.textContent = 'Cargando movimientos de caja...';

    try {
        var movimientos = await apiFetch('/caja/movimientos');

        if (!movimientos || movimientos.length === 0) {
            mensajeSinMovimientos.textContent = 'Aún no hay movimientos o egresos registrados en este turno.';
            return;
        }

        mensajeSinMovimientos.hidden = true;

        for (var i = 0; i < movimientos.length; i++) {
            var fila = crearFilaMovimiento(movimientos[i]);
            cuerpoTabla.appendChild(fila);
        }

    } catch (error) {
        mensajeSinMovimientos.hidden = false;
        mensajeSinMovimientos.textContent = 'No se pudieron cargar los movimientos: ' + error.message;
    }
}

function crearFilaMovimiento(mov) {
    var fila = document.createElement('tr');
    var hora = mov.fecha_movimiento ? new Date(mov.fecha_movimiento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
    var tipo = (mov.tipo_movimiento || 'ingreso').toLowerCase();
    var esEgreso = tipo === 'egreso';

    var claseTipo = esEgreso ? 'etiqueta-movimiento--egreso' : 'etiqueta-movimiento--ingreso';
    var textoTipo = esEgreso ? 'Egreso' : 'Ingreso';
    var signo = esEgreso ? '- ' : '+ ';
    var colorMonto = esEgreso ? 'var(--red)' : 'var(--green)';

    fila.innerHTML =
        '<td class="mono">' + hora + '</td>' +
        '<td><span class="etiqueta-movimiento ' + claseTipo + '">' + textoTipo + '</span></td>' +
        '<td>' + (mov.descripcion || 'Sin descripción') + '</td>' +
        '<td class="mono" style="text-align:right; font-weight:700; color:' + colorMonto + ';">' +
            signo + 'S/ ' + parseFloat(mov.monto || 0).toFixed(2) +
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

function abrirModalEgreso() {
    if (!cajaActual || !cajaActual.abierta) {
        alert('Debe haber una caja abierta para poder registrar un egreso.');
        return;
    }

    var modal = document.getElementById('modalEgreso');
    var inputMonto = document.getElementById('campoMontoEgreso');
    var inputDesc = document.getElementById('campoDescripcionEgreso');
    var mensaje = document.getElementById('mensajeModalEgreso');

    if (inputMonto) inputMonto.value = '';
    if (inputDesc) inputDesc.value = '';
    if (mensaje) {
        mensaje.hidden = true;
        mensaje.textContent = '';
    }

    if (modal) {
        modal.hidden = false;
        if (inputMonto) inputMonto.focus();
    }
}

function cerrarModalEgreso() {
    var modal = document.getElementById('modalEgreso');
    if (modal) {
        modal.hidden = true;
    }
}

async function manejarGuardarEgreso(evento) {
    evento.preventDefault();

    var inputMonto = document.getElementById('campoMontoEgreso');
    var inputDesc = document.getElementById('campoDescripcionEgreso');
    var mensaje = document.getElementById('mensajeModalEgreso');
    var btnGuardar = document.getElementById('botonGuardarEgreso');

    var monto = parseFloat(inputMonto.value);
    var descripcion = inputDesc.value.trim();

    if (isNaN(monto) || monto <= 0) {
        mensaje.hidden = false;
        mensaje.className = 'mensaje mensaje--error';
        mensaje.textContent = 'Por favor ingresa un monto válido mayor a 0.';
        return;
    }

    if (!descripcion) {
        mensaje.hidden = false;
        mensaje.className = 'mensaje mensaje--error';
        mensaje.textContent = 'Por favor ingresa el motivo o descripción del gasto (ej. Taxi, Imprevisto).';
        return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Registrando...';

    try {
        await apiFetch('/caja/egreso', {
            method: 'POST',
            body: JSON.stringify({
                monto: monto,
                descripcion: descripcion
            })
        });

        cerrarModalEgreso();
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Confirmar Egreso';

        // Actualizar dashboard
        cargarEstadoCaja();
        cargarMovimientosTurno();

    } catch (error) {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Confirmar Egreso';
        mensaje.hidden = false;
        mensaje.className = 'mensaje mensaje--error';
        mensaje.textContent = 'Error al registrar egreso: ' + error.message;
    }
}
