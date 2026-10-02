var listaMesas = [];
var filtroActual = 'todas';

document.addEventListener('DOMContentLoaded', iniciar);

function iniciar() {
    protegerPaginaMozo();
    iniciarBarraSuperior();

    document.getElementById('botonActualizarMesas').addEventListener('click', function() {
        cargarMesas();
        cargarComandasActivas();
    });

    configurarFiltros();
    cargarMesas();
    cargarComandasActivas();
}

function configurarFiltros() {
    var botonesFiltro = document.querySelectorAll('#filtrosMesas .pildora');
    for (var i = 0; i < botonesFiltro.length; i++) {
        botonesFiltro[i].addEventListener('click', function(evento) {
            for (var j = 0; j < botonesFiltro.length; j++) {
                botonesFiltro[j].classList.remove('pildora--activa');
            }
            evento.currentTarget.classList.add('pildora--activa');
            filtroActual = evento.currentTarget.getAttribute('data-filtro');
            renderizarMesas();
        });
    }
}

async function cargarMesas() {
    var contenedor = document.getElementById('contenedorMesas');
    contenedor.innerHTML = '<div class="mensaje-vacio" style="grid-column: 1 / -1;">Cargando mesas...</div>';

    try {
        listaMesas = await apiFetch('/mesas');
        renderizarMesas();
    } catch (error) {
        contenedor.innerHTML = '<div class="mensaje-vacio" style="grid-column: 1 / -1;">Error al cargar las mesas: ' + error.message + '</div>';
    }
}

function renderizarMesas() {
    var contenedor = document.getElementById('contenedorMesas');
    contenedor.innerHTML = '';

    var mesasFiltradas = listaMesas.filter(function(mesa) {
        if (filtroActual === 'todas') return true;
        return mesa.estado === filtroActual;
    });

    if (mesasFiltradas.length === 0) {
        contenedor.innerHTML = '<div class="mensaje-vacio" style="grid-column: 1 / -1;">No hay mesas con el estado seleccionado.</div>';
        return;
    }

    for (var i = 0; i < mesasFiltradas.length; i++) {
        var mesa = mesasFiltradas[i];
        var tarjeta = crearTarjetaMesa(mesa);
        contenedor.appendChild(tarjeta);
    }
}

function crearTarjetaMesa(mesa) {
    var div = document.createElement('div');
    var esLibre = mesa.estado === 'Libre';
    var claseEstado = esLibre ? 'tarjeta-mesa--libre' : 'tarjeta-mesa--ocupada';
    var claseBadge = esLibre ? 'etiqueta-estado--activo' : 'etiqueta-rol--cocina';

    div.className = 'tarjeta-mesa ' + claseEstado;
    div.innerHTML =
        '<div class="tarjeta-mesa__icono">' + (esLibre ? '🟢' : '🔴') + '</div>' +
        '<div class="tarjeta-mesa__numero">Mesa ' + mesa.numero + '</div>' +
        '<div class="tarjeta-mesa__capacidad">Capacidad: ' + mesa.capacidad + ' personas</div>' +
        '<span class="etiqueta-estado ' + claseBadge + '">' + mesa.estado + '</span>';

    div.addEventListener('click', function() {
        if (esLibre) {
            window.location.href = 'pedidoForm.html?mesa=' + mesa.id_mesa;
        } else {
            // Mesa ocupada: abrir comanda para verla o añadir más platos
            window.location.href = 'pedidoForm.html?mesa=' + mesa.id_mesa + '&modo=agregar';
        }
    });

    return div;
}

async function cargarComandasActivas() {
    var cuerpoTabla = document.getElementById('cuerpoTablaComandas');
    var mensajeVacio = document.getElementById('mensajeSinComandas');

    cuerpoTabla.innerHTML = '';
    mensajeVacio.hidden = false;
    mensajeVacio.textContent = 'Cargando comandas del salón...';

    try {
        var pedidos = await apiFetch('/pedidos/activos');

        if (!pedidos || pedidos.length === 0) {
            mensajeVacio.textContent = 'No hay comandas activas en este momento.';
            return;
        }

        mensajeVacio.hidden = true;

        for (var i = 0; i < pedidos.length; i++) {
            var fila = crearFilaComanda(pedidos[i]);
            cuerpoTabla.appendChild(fila);
        }

    } catch (error) {
        mensajeVacio.hidden = false;
        mensajeVacio.textContent = 'No se pudieron cargar las comandas activas: ' + error.message;
    }
}

function crearFilaComanda(pedido) {
    var fila = document.createElement('tr');
    var nombreMesa = pedido.numero_mesa ? 'Mesa ' + pedido.numero_mesa : 'Para llevar';
    var hora = pedido.fecha_hora ? new Date(pedido.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

    fila.innerHTML =
        '<td>' +
            '<div class="celda-nombre">' + nombreMesa + '</div>' +
            '<div class="celda-subtexto mono">#' + pedido.id_pedido + '</div>' +
        '</td>' +
        '<td><span class="etiqueta-rol etiqueta-rol--mesero">' + (pedido.tipo_pedido || 'Mesa') + '</span></td>' +
        '<td class="mono">' + hora + '</td>' +
        '<td><span class="etiqueta-estado etiqueta-rol--cocina">' + (pedido.estado_cocina || 'Pendiente') + '</span></td>' +
        '<td class="mono" style="font-weight:700;">S/ ' + parseFloat(pedido.total || 0).toFixed(2) + '</td>' +
        '<td class="celda-acciones">' +
            '<a href="pedidoForm.html?mesa=' + (pedido.id_mesa || '') + '&pedido=' + pedido.id_pedido + '" class="boton boton--fantasma boton--pequeno">+ Agregar platos</a>' +
        '</td>';

    return fila;
}
