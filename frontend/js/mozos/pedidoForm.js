var canasta = [];
var catalogoProductos = [];
var categorias = [];
var categoriaSeleccionada = 'todas';
var idMesaUrl = null;
var idPedidoExistente = null;

document.addEventListener('DOMContentLoaded', iniciar);

function iniciar() {
    protegerPaginaMozo();
    iniciarBarraSuperior();

    var parametros = new URLSearchParams(window.location.search);
    idMesaUrl = parametros.get('mesa');
    idPedidoExistente = parametros.get('pedido');
    var tipoUrl = parametros.get('tipo');

    if (tipoUrl === 'llevar') {
        document.getElementById('campoTipoPedido').value = 'Para llevar';
    }

    document.getElementById('campoMesa').addEventListener('change', actualizarDestinoTicket);
    document.getElementById('campoTipoPedido').addEventListener('change', actualizarDestinoTicket);
    document.getElementById('botonEnviarComanda').addEventListener('click', manejarEnvioComanda);

    cargarMesas();
    cargarCarta();
}

async function cargarMesas() {
    var selectorMesa = document.getElementById('campoMesa');

    try {
        var mesas = await apiFetch('/mesas');
        selectorMesa.innerHTML = '<option value="" disabled selected>Selecciona una mesa</option>';

        for (var i = 0; i < mesas.length; i++) {
            var mesa = mesas[i];
            var option = document.createElement('option');
            option.value = mesa.id_mesa;
            option.textContent = 'Mesa ' + mesa.numero + ' (' + mesa.capacidad + ' pers.) - ' + mesa.estado;
            
            if (idMesaUrl && String(mesa.id_mesa) === String(idMesaUrl)) {
                option.selected = true;
            }

            selectorMesa.appendChild(option);
        }

        actualizarDestinoTicket();

    } catch (error) {
        mostrarMensaje('No se pudieron cargar las mesas: ' + error.message, 'error');
    }
}

async function cargarCarta() {
    var contenedorCat = document.getElementById('contenedorCategorias');
    var contenedorProd = document.getElementById('contenedorProductos');

    try {
        var datos = await apiFetch('/productos/catalogo');
        categorias = datos.categorias || [];
        catalogoProductos = datos.productos || [];

        // Renderizar píldoras de categorías
        contenedorCat.innerHTML = '<button type="button" class="pildora pildora--activa" data-cat="todas">Todos</button>';
        for (var i = 0; i < categorias.length; i++) {
            var cat = categorias[i];
            var boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'pildora';
            boton.setAttribute('data-cat', cat.id_categoria);
            boton.textContent = cat.nombre;
            boton.addEventListener('click', function(e) {
                var botones = contenedorCat.querySelectorAll('.pildora');
                for (var j = 0; j < botones.length; j++) botones[j].classList.remove('pildora--activa');
                e.currentTarget.classList.add('pildora--activa');
                categoriaSeleccionada = e.currentTarget.getAttribute('data-cat');
                renderizarProductos();
            });
            contenedorCat.appendChild(boton);
        }

        // Listener para "Todos"
        contenedorCat.querySelector('[data-cat="todas"]').addEventListener('click', function(e) {
            var botones = contenedorCat.querySelectorAll('.pildora');
            for (var j = 0; j < botones.length; j++) botones[j].classList.remove('pildora--activa');
            e.currentTarget.classList.add('pildora--activa');
            categoriaSeleccionada = 'todas';
            renderizarProductos();
        });

        renderizarProductos();

        // Si venimos a agregar a un pedido existente, cargamos sus detalles
        if (idPedidoExistente) {
            cargarPedidoExistente(idPedidoExistente);
        }

    } catch (error) {
        contenedorProd.innerHTML = '<div class="mensaje-vacio" style="grid-column:1/-1;">Error al cargar la carta: ' + error.message + '</div>';
    }
}

function renderizarProductos() {
    var contenedor = document.getElementById('contenedorProductos');
    contenedor.innerHTML = '';

    var filtrados = catalogoProductos.filter(function(prod) {
        if (categoriaSeleccionada === 'todas') return true;
        return String(prod.id_categoria) === String(categoriaSeleccionada);
    });

    if (filtrados.length === 0) {
        contenedor.innerHTML = '<div class="mensaje-vacio" style="grid-column:1/-1;">No hay productos en esta categoría.</div>';
        return;
    }

    for (var i = 0; i < filtrados.length; i++) {
        var prod = filtrados[i];
        var tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-producto';
        tarjeta.innerHTML =
            '<div>' +
                '<div class="tarjeta-producto__nombre">' + prod.nombre + '</div>' +
                '<div class="tarjeta-producto__precio">S/ ' + parseFloat(prod.precio).toFixed(2) + '</div>' +
            '</div>' +
            '<button type="button" class="boton boton--fantasma boton--pequeno" style="width:100%; border-color:var(--accent); color:var(--accent-dark);">' +
                '+ Agregar' +
            '</button>';

        (function(producto) {
            tarjeta.querySelector('button').addEventListener('click', function() {
                agregarProducto(producto);
            });
        })(prod);

        contenedor.appendChild(tarjeta);
    }
}

function agregarProducto(producto) {
    var indice = canasta.findIndex(function(item) {
        return item.id_producto === producto.id_producto;
    });

    if (indice !== -1) {
        canasta[indice].cantidad += 1;
        canasta[indice].subtotal = canasta[indice].cantidad * parseFloat(producto.precio);
    } else {
        canasta.push({
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            precio_unitario: parseFloat(producto.precio),
            cantidad: 1,
            subtotal: parseFloat(producto.precio)
        });
    }

    actualizarTicketCanasta();
}

function cambiarCantidad(id_producto, cambio) {
    var indice = canasta.findIndex(function(item) {
        return item.id_producto === id_producto;
    });

    if (indice === -1) return;

    canasta[indice].cantidad += cambio;

    if (canasta[indice].cantidad <= 0) {
        canasta.splice(indice, 1);
    } else {
        canasta[indice].subtotal = canasta[indice].cantidad * canasta[indice].precio_unitario;
    }

    actualizarTicketCanasta();
}

function actualizarTicketCanasta() {
    var contenedor = document.getElementById('listaItemsCanasta');
    var textoTotal = document.getElementById('textoTotalComanda');
    var textoItems = document.getElementById('textoCantidadItems');

    contenedor.innerHTML = '';

    if (canasta.length === 0) {
        contenedor.innerHTML = '<div class="mensaje-vacio" style="padding: 24px 0;">No has agregado platos a la comanda aún.</div>';
        textoTotal.textContent = 'S/ 0.00';
        textoItems.textContent = '0';
        return;
    }

    var total = 0;
    var cantidadTotal = 0;

    for (var i = 0; i < canasta.length; i++) {
        var item = canasta[i];
        total += item.subtotal;
        cantidadTotal += item.cantidad;

        var div = document.createElement('div');
        div.className = 'item-canasta';
        div.innerHTML =
            '<div style="flex:1; padding-right:8px;">' +
                '<strong>' + item.nombre + '</strong>' +
                '<div class="mono" style="font-size:11.5px; color:var(--muted);">' +
                    'S/ ' + item.precio_unitario.toFixed(2) + ' c/u' +
                '</div>' +
            '</div>' +
            '<div class="control-cantidad">' +
                '<button type="button" class="boton-cantidad" data-accion="restar" data-id="' + item.id_producto + '">-</button>' +
                '<span class="mono" style="font-weight:700; min-width:18px; text-align:center;">' + item.cantidad + '</span>' +
                '<button type="button" class="boton-cantidad" data-accion="sumar" data-id="' + item.id_producto + '">+</button>' +
            '</div>' +
            '<div class="mono" style="font-weight:700; width:70px; text-align:right;">' +
                'S/ ' + item.subtotal.toFixed(2) +
            '</div>';

        contenedor.appendChild(div);
    }

    textoTotal.textContent = 'S/ ' + total.toFixed(2);
    textoItems.textContent = cantidadTotal;

    // Configurar botones de suma y resta
    var botonesRestar = contenedor.querySelectorAll('[data-accion="restar"]');
    for (var j = 0; j < botonesRestar.length; j++) {
        botonesRestar[j].addEventListener('click', function(e) {
            cambiarCantidad(parseInt(e.currentTarget.getAttribute('data-id')), -1);
        });
    }

    var botonesSumar = contenedor.querySelectorAll('[data-accion="sumar"]');
    for (var k = 0; k < botonesSumar.length; k++) {
        botonesSumar[k].addEventListener('click', function(e) {
            cambiarCantidad(parseInt(e.currentTarget.getAttribute('data-id')), 1);
        });
    }
}

function actualizarDestinoTicket() {
    var tipo = document.getElementById('campoTipoPedido').value;
    var selectorMesa = document.getElementById('campoMesa');
    var textoDestino = document.getElementById('textoDestinoMesa');

    if (tipo === 'Para llevar') {
        textoDestino.textContent = 'Pedido Para Llevar';
        selectorMesa.disabled = true;
    } else {
        selectorMesa.disabled = false;
        var textoSeleccionado = selectorMesa.options[selectorMesa.selectedIndex] ? selectorMesa.options[selectorMesa.selectedIndex].textContent : 'Mesa -';
        textoDestino.textContent = textoSeleccionado;
    }
}

async function cargarPedidoExistente(id_pedido) {
    try {
        var pedido = await apiFetch('/pedidos/' + id_pedido);
        document.getElementById('tituloPedidoForm').textContent = 'Comanda #' + pedido.id_pedido;
        document.getElementById('subtituloPedidoForm').textContent = 'Agregando más productos al pedido en atención.';

        if (pedido.id_mesa) {
            document.getElementById('campoMesa').value = pedido.id_mesa;
        }
        document.getElementById('campoTipoPedido').value = pedido.tipo_pedido || 'Mesa';
        actualizarDestinoTicket();

        // Cargar ítems previos en la canasta
        var detalles = pedido.detalles || [];
        for (var i = 0; i < detalles.length; i++) {
            var d = detalles[i];
            canasta.push({
                id_producto: d.id_producto,
                nombre: d.nombre_producto,
                precio_unitario: parseFloat(d.precio_unitario),
                cantidad: d.cantidad,
                subtotal: parseFloat(d.subtotal)
            });
        }
        actualizarTicketCanasta();

    } catch (error) {
        mostrarMensaje('No se pudo cargar el pedido previo: ' + error.message, 'error');
    }
}

async function manejarEnvioComanda() {
    var boton = document.getElementById('botonEnviarComanda');
    var tipoPedido = document.getElementById('campoTipoPedido').value;
    var idMesa = document.getElementById('campoMesa').value;

    if (tipoPedido === 'Mesa' && !idMesa) {
        mostrarMensaje('Por favor selecciona una mesa para asignar la comanda.', 'error');
        return;
    }

    if (canasta.length === 0) {
        mostrarMensaje('Agrega al menos un plato o bebida a la comanda antes de enviarla.', 'error');
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Enviando comanda...';

    var datosEnvio = {
        id_pedido_existente: idPedidoExistente ? parseInt(idPedidoExistente) : null,
        id_mesa: tipoPedido === 'Mesa' ? parseInt(idMesa) : null,
        tipo_pedido: tipoPedido,
        items: canasta
    };

    try {
        await apiFetch('/pedidos', {
            method: 'POST',
            body: JSON.stringify(datosEnvio)
        });

        mostrarMensaje('¡Comanda registrada y enviada a cocina y caja con éxito!', 'exito');

        setTimeout(function() {
            window.location.href = 'mozos.html';
        }, 1200);

    } catch (error) {
        mostrarMensaje('Error al enviar comanda: ' + error.message, 'error');
        boton.disabled = false;
        boton.textContent = 'Enviar Comanda a Cocina y Caja';
    }
}

function mostrarMensaje(texto, tipo) {
    var contenedor = document.getElementById('mensajePedido');
    contenedor.hidden = false;
    contenedor.textContent = texto;
    contenedor.className = 'mensaje ' + (tipo === 'exito' ? 'mensaje--exito' : 'mensaje--error');
    contenedor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
