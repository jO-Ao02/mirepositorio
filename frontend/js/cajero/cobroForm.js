var idPedidoActual = null;
var pedidoActual = null;
var totalCobroActual = 0;
var modoCobro = 'todo'; // 'todo' o 'dividir'

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

    // Configurar listeners de la vista
    document.getElementById('campoTipoComprobante').addEventListener('change', manejarCambioTipoComprobante);
    document.getElementById('campoMetodoPago').addEventListener('change', manejarCambioMetodoPago);
    document.getElementById('campoMontoRecibido').addEventListener('input', calcularVuelto);
    document.getElementById('botonClientesVarios').addEventListener('click', autocompletarClientesVarios);

    document.getElementById('btnModoTodo').addEventListener('click', function() {
        cambiarModoCobro('todo');
    });

    document.getElementById('btnModoDividir').addEventListener('click', function() {
        cambiarModoCobro('dividir');
    });

    document.getElementById('botonSeleccionarTodos').addEventListener('click', seleccionarTodosLosPendientes);
    document.getElementById('botonDeseleccionarTodos').addEventListener('click', deseleccionarTodos);

    var checkCabecera = document.getElementById('checkTodoCabecera');
    if (checkCabecera) {
        checkCabecera.addEventListener('change', function(e) {
            var checkboxes = document.querySelectorAll('.check-item-pendiente');
            for (var i = 0; i < checkboxes.length; i++) {
                checkboxes[i].checked = e.target.checked;
            }
            recalcularTotalesComprobante();
        });
    }

    document.getElementById('botonCobrarSiguiente').addEventListener('click', function() {
        document.getElementById('panelExitoCobro').hidden = true;
        document.getElementById('formularioCobro').hidden = false;
        limpiarCamposCliente();
        cargarDetallePedido();
    });

    document.getElementById('formularioCobro').addEventListener('submit', manejarEnvioCobro);

    cargarDetallePedido();
}

async function cargarDetallePedido() {
    var cuerpoDetalle = document.getElementById('cuerpoDetallePedido');
    var tituloCobro = document.getElementById('tituloCobro');

    try {
        var pedido = await apiFetch('/pedidos/' + idPedidoActual);
        pedidoActual = pedido;

        var numMesa = pedido.numero_mesa ? 'Mesa ' + pedido.numero_mesa : 'Pedido #' + pedido.id_pedido;
        tituloCobro.textContent = 'Cobrar Cuenta — ' + numMesa;
        document.getElementById('infoMesa').textContent = pedido.numero_mesa ? 'Mesa ' + pedido.numero_mesa : 'Para llevar';
        document.getElementById('infoTipoPedido').textContent = pedido.tipo_pedido || 'En salón';
        document.getElementById('infoMozo').textContent = pedido.nombre_mozo || 'Mozo';
        document.getElementById('infoHora').textContent = pedido.fecha_hora 
            ? new Date(pedido.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : '-';

        // Actualizar resumen de la cuenta
        var totalGlobal = parseFloat(pedido.total || 0);
        var totalPagado = parseFloat(pedido.total_pagado || 0);
        var saldoPendiente = Math.max(0, parseFloat((totalGlobal - totalPagado).toFixed(2)));

        document.getElementById('valorTotalComanda').textContent = 'S/ ' + totalGlobal.toFixed(2);
        document.getElementById('valorTotalFacturado').textContent = 'S/ ' + totalPagado.toFixed(2);
        document.getElementById('valorSaldoPendiente').textContent = 'S/ ' + saldoPendiente.toFixed(2);

        // Renderizar historial de comprobantes previos de esta mesa
        renderizarComprobantesPrevios(pedido.comprobantes || []);

        // Renderizar tabla de ítems
        cuerpoDetalle.innerHTML = '';
        var items = pedido.detalles || [];

        if (items.length === 0) {
            cuerpoDetalle.innerHTML = '<tr><td colspan="6" class="mensaje-vacio">No hay productos en esta comanda.</td></tr>';
            return;
        }

        var hayPendientes = false;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var fila = document.createElement('tr');
            var yaPagado = Boolean(item.id_comprobante);

            if (yaPagado) {
                fila.className = 'fila-item-pagado';
                var serieDoc = (item.serie_comprobante || 'Comp') + '-' + (item.correlativo_comprobante || String(item.id_comprobante).padStart(6, '0'));
                var clienteDoc = item.cliente_comprobante ? ' (' + item.cliente_comprobante + ')' : '';

                fila.innerHTML =
                    '<td style="text-align:center;"><input type="checkbox" disabled checked></td>' +
                    '<td class="mono" style="text-align:center; font-weight:700;">' + item.cantidad + '</td>' +
                    '<td><strong>' + item.nombre_producto + '</strong></td>' +
                    '<td class="mono" style="text-align:right;">S/ ' + parseFloat(item.precio_unitario).toFixed(2) + '</td>' +
                    '<td class="mono" style="text-align:right; font-weight:700;">S/ ' + parseFloat(item.subtotal).toFixed(2) + '</td>' +
                    '<td style="text-align:center;"><span class="badge-item-pagado">✓ ' + serieDoc + clienteDoc + '</span></td>';
            } else {
                hayPendientes = true;
                var inputCantidadHtml = '';
                if (item.cantidad > 1) {
                    inputCantidadHtml = '<input type="number" class="input-cantidad-item" min="1" max="' + item.cantidad + '" value="' + item.cantidad + '" data-precio="' + item.precio_unitario + '" data-detalle="' + item.id_detalle + '">';
                } else {
                    inputCantidadHtml = '<span class="mono" style="font-weight:700;">1</span>';
                }

                fila.innerHTML =
                    '<td style="text-align:center;">' +
                        '<input type="checkbox" class="input-checkbox-item check-item-pendiente" checked data-detalle="' + item.id_detalle + '" data-precio="' + item.precio_unitario + '" data-max="' + item.cantidad + '">' +
                    '</td>' +
                    '<td style="text-align:center;">' + inputCantidadHtml + '</td>' +
                    '<td><strong>' + item.nombre_producto + '</strong></td>' +
                    '<td class="mono" style="text-align:right;">S/ ' + parseFloat(item.precio_unitario).toFixed(2) + '</td>' +
                    '<td class="mono celda-subtotal-item" style="text-align:right; font-weight:700;">S/ ' + parseFloat(item.subtotal).toFixed(2) + '</td>' +
                    '<td style="text-align:center;"><span class="badge-item-pendiente">Pendiente</span></td>';
            }

            cuerpoDetalle.appendChild(fila);
        }

        // Agregar listeners a los checkboxes y spinners de ítems pendientes
        var checks = cuerpoDetalle.querySelectorAll('.check-item-pendiente');
        checks.forEach(function(chk) {
            chk.addEventListener('change', recalcularTotalesComprobante);
        });

        var inputsCant = cuerpoDetalle.querySelectorAll('.input-cantidad-item');
        inputsCant.forEach(function(inp) {
            inp.addEventListener('input', function() {
                var max = parseInt(inp.getAttribute('max')) || 1;
                var val = parseInt(inp.value) || 1;
                if (val > max) inp.value = max;
                if (val < 1) inp.value = 1;

                var precio = parseFloat(inp.getAttribute('data-precio')) || 0;
                var filaPadre = inp.closest('tr');
                var celdaSub = filaPadre.querySelector('.celda-subtotal-item');
                if (celdaSub) {
                    celdaSub.textContent = 'S/ ' + (parseInt(inp.value) * precio).toFixed(2);
                }
                recalcularTotalesComprobante();
            });
        });

        if (!hayPendientes) {
            mostrarMensaje('¡Todos los platos de esta comanda ya fueron cobrados en comprobantes anteriores!', 'exito');
            document.getElementById('botonConfirmarCobro').disabled = true;
            document.getElementById('botonConfirmarCobro').textContent = 'Cuenta completamente cobrada';
        } else {
            document.getElementById('botonConfirmarCobro').disabled = false;
        }

        recalcularTotalesComprobante();

    } catch (error) {
        mostrarMensaje('No se pudo cargar la información del pedido: ' + error.message, 'error');
    }
}

function renderizarComprobantesPrevios(comprobantes) {
    var tarjetaPrevios = document.getElementById('tarjetaComprobantesPrevios');
    var listaPrevios = document.getElementById('listaComprobantesPrevios');

    if (!comprobantes || comprobantes.length === 0) {
        tarjetaPrevios.hidden = true;
        return;
    }

    tarjetaPrevios.hidden = false;
    listaPrevios.innerHTML = '';

    for (var i = 0; i < comprobantes.length; i++) {
        var comp = comprobantes[i];
        var serieDoc = (comp.serie || 'B001') + '-' + (comp.correlativo || String(comp.id_comprobante).padStart(6, '0'));
        var metodo = (comp.metodo_pago || 'Efectivo').toLowerCase();
        var claseMetodo = 'etiqueta-metodo--' + metodo;

        var div = document.createElement('div');
        div.className = 'card-comprobante-previo';
        div.innerHTML =
            '<div>' +
                '<strong>' + (comp.tipo_comprobante || 'Comprobante') + ' ' + serieDoc + '</strong>' +
                '<span style="color:var(--muted); margin-left:8px;">Cliente: ' + (comp.nombre_cliente || 'Clientes Varios') + ' (' + (comp.numero_documento || '-') + ')</span>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:10px;">' +
                '<span class="etiqueta-metodo ' + claseMetodo + '">' + (comp.metodo_pago || 'Efectivo') + '</span>' +
                '<strong class="mono" style="font-size:14px; color:var(--green);">S/ ' + parseFloat(comp.total || 0).toFixed(2) + '</strong>' +
            '</div>';

        listaPrevios.appendChild(div);
    }
}

function recalcularTotalesComprobante() {
    var checks = document.querySelectorAll('.check-item-pendiente');
    var sumaTotal = 0;
    var cantidadSeleccionada = 0;

    checks.forEach(function(chk) {
        if (chk.checked) {
            var fila = chk.closest('tr');
            var inputCant = fila.querySelector('.input-cantidad-item');
            var cantidad = inputCant ? parseInt(inputCant.value) || 1 : 1;
            var precio = parseFloat(chk.getAttribute('data-precio')) || 0;
            sumaTotal += cantidad * precio;
            cantidadSeleccionada++;
        }
    });

    totalCobroActual = parseFloat(sumaTotal.toFixed(2));

    var subtotal = totalCobroActual / 1.18;
    var igv = totalCobroActual - subtotal;

    document.getElementById('textoSubtotal').textContent = 'S/ ' + subtotal.toFixed(2);
    document.getElementById('textoIgv').textContent = 'S/ ' + igv.toFixed(2);
    document.getElementById('textoTotal').textContent = 'S/ ' + totalCobroActual.toFixed(2);
    document.getElementById('campoMontoTotalPagar').value = 'S/ ' + totalCobroActual.toFixed(2);

    var botonCobro = document.getElementById('botonConfirmarCobro');
    if (totalCobroActual > 0) {
        botonCobro.textContent = 'Emitir Comprobante y Registrar Pago (S/ ' + totalCobroActual.toFixed(2) + ')';
        botonCobro.disabled = false;
    } else {
        botonCobro.textContent = 'Selecciona al menos un ítem para cobrar';
        botonCobro.disabled = true;
    }

    calcularVuelto();
}

function cambiarModoCobro(modo) {
    modoCobro = modo;
    var btnTodo = document.getElementById('btnModoTodo');
    var btnDividir = document.getElementById('btnModoDividir');

    if (modo === 'todo') {
        btnTodo.classList.add('boton-modo--activo');
        btnDividir.classList.remove('boton-modo--activo');
        seleccionarTodosLosPendientes();
    } else {
        btnDividir.classList.add('boton-modo--activo');
        btnTodo.classList.remove('boton-modo--activo');
    }
}

function seleccionarTodosLosPendientes() {
    var checks = document.querySelectorAll('.check-item-pendiente');
    checks.forEach(function(chk) { chk.checked = true; });
    var checkCab = document.getElementById('checkTodoCabecera');
    if (checkCab) checkCab.checked = true;
    recalcularTotalesComprobante();
}

function deseleccionarTodos() {
    var checks = document.querySelectorAll('.check-item-pendiente');
    checks.forEach(function(chk) { chk.checked = false; });
    var checkCab = document.getElementById('checkTodoCabecera');
    if (checkCab) checkCab.checked = false;
    recalcularTotalesComprobante();
}

function autocompletarClientesVarios() {
    document.getElementById('campoTipoComprobante').value = 'boleta';
    document.getElementById('campoTipoDocumento').value = '0'; // Sin documento
    document.getElementById('campoNumeroDocumento').value = '00000000';
    document.getElementById('campoNombreCliente').value = 'Clientes Varios';
    document.getElementById('campoDireccion').value = '';
    document.getElementById('campoCorreo').value = '';
    manejarCambioTipoComprobante();
}

function manejarCambioTipoComprobante() {
    var tipoComprobante = document.getElementById('campoTipoComprobante').value;
    var selectorTipoDoc = document.getElementById('campoTipoDocumento');
    var campoDireccion = document.getElementById('campoDireccion');

    if (tipoComprobante === 'factura') {
        selectorTipoDoc.value = '6'; // RUC
        campoDireccion.required = true;
        document.getElementById('campoNumeroDocumento').placeholder = 'Ej. 20123456789 (11 dígitos RUC)';
        if (!document.getElementById('campoNumeroDocumento').value.startsWith('20') && !document.getElementById('campoNumeroDocumento').value.startsWith('10')) {
            document.getElementById('campoNumeroDocumento').value = '';
        }
    } else {
        if (selectorTipoDoc.value === '6') {
            selectorTipoDoc.value = '1'; // DNI
        }
        campoDireccion.required = false;
        document.getElementById('campoNumeroDocumento').placeholder = 'Ej. 74859632 (8 dígitos DNI)';
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
    var metodo = document.getElementById('campoMetodoPago').value;
    if (metodo !== 'efectivo') return;

    var montoRecibido = parseFloat(document.getElementById('campoMontoRecibido').value) || 0;
    var campoVuelto = document.getElementById('campoVuelto');

    if (montoRecibido < totalCobroActual) {
        campoVuelto.value = 'Faltan S/ ' + (totalCobroActual - montoRecibido).toFixed(2);
        campoVuelto.style.color = 'var(--red)';
    } else {
        var vuelto = montoRecibido - totalCobroActual;
        campoVuelto.value = 'S/ ' + vuelto.toFixed(2);
        campoVuelto.style.color = 'var(--green)';
    }
}

function limpiarCamposCliente() {
    document.getElementById('campoNumeroDocumento').value = '';
    document.getElementById('campoNombreCliente').value = '';
    document.getElementById('campoDireccion').value = '';
    document.getElementById('campoCorreo').value = '';
    document.getElementById('campoMontoRecibido').value = '';
    document.getElementById('campoVuelto').value = 'S/ 0.00';
}

async function manejarEnvioCobro(evento) {
    evento.preventDefault();

    var botonCobro = document.getElementById('botonConfirmarCobro');
    var metodoPago = document.getElementById('campoMetodoPago').value;
    var montoRecibido = parseFloat(document.getElementById('campoMontoRecibido').value) || 0;

    // Recoger ítems seleccionados para este comprobante
    var checks = document.querySelectorAll('.check-item-pendiente:checked');
    var itemsAEnviar = [];

    checks.forEach(function(chk) {
        var fila = chk.closest('tr');
        var inputCant = fila.querySelector('.input-cantidad-item');
        var cantidad = inputCant ? parseInt(inputCant.value) || 1 : 1;
        var idDetalle = parseInt(chk.getAttribute('data-detalle'));
        itemsAEnviar.push({
            id_detalle: idDetalle,
            cantidad: cantidad
        });
    });

    if (itemsAEnviar.length === 0) {
        mostrarMensaje('Debes seleccionar al menos un ítem o plato para cobrar en este comprobante.', 'error');
        return;
    }

    if (metodoPago === 'efectivo' && montoRecibido < totalCobroActual) {
        mostrarMensaje('El monto recibido en efectivo no puede ser menor al total de este comprobante (S/ ' + totalCobroActual.toFixed(2) + ').', 'error');
        return;
    }

    var numDoc = document.getElementById('campoNumeroDocumento').value.trim();
    var nomCliente = document.getElementById('campoNombreCliente').value.trim();

    if (!numDoc || !nomCliente) {
        mostrarMensaje('Ingresa el número de documento y nombre/razón social del cliente para este comprobante.', 'error');
        return;
    }

    var datosCobro = {
        id_pedido: parseInt(idPedidoActual),
        items: itemsAEnviar,
        tipo_comprobante: document.getElementById('campoTipoComprobante').value,
        id_tipo_documento: parseInt(document.getElementById('campoTipoDocumento').value),
        numero_documento: numDoc,
        nombre_razon_social: nomCliente,
        direccion: document.getElementById('campoDireccion').value.trim(),
        correo: document.getElementById('campoCorreo').value.trim(),
        metodo_pago: metodoPago,
        total: totalCobroActual
    };

    botonCobro.disabled = true;
    botonCobro.textContent = 'Procesando comprobante y pago...';

    try {
        var respuesta = await apiFetch('/pagos/procesar', {
            method: 'POST',
            body: JSON.stringify(datosCobro)
        });

        // Ocultar mensaje previo
        document.getElementById('mensajeCobro').hidden = true;

        // Mostrar panel de éxito interactivo
        var panelExito = document.getElementById('panelExitoCobro');
        var tituloExito = document.getElementById('tituloExitoCobro');
        var descExito = document.getElementById('descripcionExitoCobro');
        var btnCobrarSig = document.getElementById('botonCobrarSiguiente');

        panelExito.hidden = false;

        var serieDoc = respuesta.comprobante ? respuesta.comprobante.serie + '-' + respuesta.comprobante.correlativo : 'Registrado';

        if (respuesta.cuenta_completa) {
            tituloExito.textContent = '¡Cuenta 100% Pagada! Mesa liberada con éxito';
            descExito.textContent = 'Se emitió el comprobante ' + serieDoc + ' por S/ ' + parseFloat(respuesta.total_cobrado || totalCobroActual).toFixed(2) + '. Todos los consumos de la mesa quedaron cancelados.';
            btnCobrarSig.hidden = true;

            setTimeout(function() {
                window.location.href = 'cajero.html';
            }, 2500);
        } else {
            tituloExito.textContent = '¡Comprobante ' + serieDoc + ' emitido con éxito!';
            descExito.textContent = 'Cobro de S/ ' + parseFloat(respuesta.total_cobrado || totalCobroActual).toFixed(2) + ' registrado a nombre de ' + nomCliente + '. Aún quedan ' + respuesta.items_restantes + ' ítem(s) pendientes de cobro en esta mesa.';
            btnCobrarSig.hidden = false;
        }

        panelExito.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Actualizar datos del pedido en pantalla
        cargarDetallePedido();
        limpiarCamposCliente();

    } catch (error) {
        mostrarMensaje('Error al procesar el cobro: ' + error.message, 'error');
        botonCobro.disabled = false;
        botonCobro.textContent = 'Emitir Comprobante y Registrar Pago';
    }
}

function mostrarMensaje(texto, tipo) {
    var contenedor = document.getElementById('mensajeCobro');
    contenedor.hidden = false;
    contenedor.textContent = texto;
    contenedor.className = 'mensaje ' + (tipo === 'exito' ? 'mensaje--exito' : 'mensaje--error');
    contenedor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
