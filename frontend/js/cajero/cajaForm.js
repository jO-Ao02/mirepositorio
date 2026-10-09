var cajaActual = null;
var efectivoEsperado = 0;

document.addEventListener('DOMContentLoaded', iniciar);

function iniciar() {
    protegerPaginaCajero();
    iniciarBarraSuperior();

    document.getElementById('formularioApertura').addEventListener('submit', manejarApertura);
    document.getElementById('formularioCierre').addEventListener('submit', manejarCierre);
    document.getElementById('campoMontoCierre').addEventListener('input', calcularDiferenciaArqueo);

    prepararFormulario();
}

async function prepararFormulario() {
    var usuario = obtenerUsuarioSesion();
    var campoCajeroApertura = document.getElementById('campoCajeroApertura');
    var campoFechaApertura = document.getElementById('campoFechaApertura');

    if (campoCajeroApertura && usuario) {
        campoCajeroApertura.value = (usuario.nombre || '') + ' ' + (usuario.apellido || '');
    }
    if (campoFechaApertura) {
        campoFechaApertura.value = new Date().toLocaleString();
    }

    try {
        var estado = await apiFetch('/caja/estado-actual');
        cajaActual = estado;

        if (estado && estado.abierta) {
            mostrarModoCierre(estado);
        } else {
            mostrarModoApertura();
        }
    } catch (error) {
        mostrarModoApertura();
    }
}

function mostrarModoApertura() {
    document.getElementById('seccionApertura').hidden = false;
    document.getElementById('seccionCierre').hidden = true;
    document.getElementById('tituloCajaForm').textContent = 'Apertura de Turno de Caja';
    document.getElementById('subtituloCajaForm').textContent = 'Ingresa el monto de fondo inicial para comenzar las operaciones.';
}

function mostrarModoCierre(estado) {
    document.getElementById('seccionApertura').hidden = true;
    document.getElementById('seccionCierre').hidden = false;
    document.getElementById('tituloCajaForm').textContent = 'Cierre de Turno y Arqueo';
    document.getElementById('subtituloCajaForm').textContent = 'Cuadra el efectivo físico y finaliza el turno actual.';

    var apertura = parseFloat(estado.monto_apertura || 0);
    var ventasEfectivo = parseFloat(estado.ventas_efectivo || 0);
    var totalEgresos = parseFloat(estado.total_egresos || 0);
    var ventasDigitales = parseFloat(estado.ventas_digitales || 0);
    var totalVentas = ventasEfectivo + ventasDigitales;
    efectivoEsperado = parseFloat((apertura + ventasEfectivo - totalEgresos).toFixed(2));

    document.getElementById('cierreMontoApertura').textContent = 'S/ ' + apertura.toFixed(2);
    document.getElementById('cierreVentasEfectivo').textContent = 'S/ ' + ventasEfectivo.toFixed(2);
    var elemEgresos = document.getElementById('cierreTotalEgresos');
    if (elemEgresos) {
        elemEgresos.textContent = '- S/ ' + totalEgresos.toFixed(2);
    }
    document.getElementById('cierreVentasDigitales').textContent = 'S/ ' + ventasDigitales.toFixed(2);
    document.getElementById('cierreTotalVentas').textContent = 'S/ ' + totalVentas.toFixed(2);
    document.getElementById('cierreEfectivoEsperado').textContent = 'S/ ' + efectivoEsperado.toFixed(2);

    calcularDiferenciaArqueo();
}

function calcularDiferenciaArqueo() {
    var montoContado = parseFloat(document.getElementById('campoMontoCierre').value) || 0;
    var textoDiferencia = document.getElementById('textoDiferencia');
    var contenedor = document.getElementById('contenedorDiferencia');

    var diferencia = montoContado - efectivoEsperado;

    if (Math.abs(diferencia) < 0.01) {
        textoDiferencia.textContent = 'S/ 0.00 (Caja cuadrada exacta)';
        contenedor.style.background = 'var(--green-tint)';
        contenedor.style.borderColor = 'var(--green)';
        textoDiferencia.style.color = 'var(--green)';
    } else if (diferencia > 0) {
        textoDiferencia.textContent = '+ S/ ' + diferencia.toFixed(2) + ' (Sobrante de dinero)';
        contenedor.style.background = 'var(--surface-sunk)';
        contenedor.style.borderColor = 'var(--line)';
        textoDiferencia.style.color = 'var(--accent-dark)';
    } else {
        textoDiferencia.textContent = '- S/ ' + Math.abs(diferencia).toFixed(2) + ' (Faltante de dinero)';
        contenedor.style.background = 'var(--red-tint)';
        contenedor.style.borderColor = 'var(--red)';
        textoDiferencia.style.color = 'var(--red)';
    }
}

async function manejarApertura(evento) {
    evento.preventDefault();

    var montoApertura = parseFloat(document.getElementById('campoMontoApertura').value);

    if (isNaN(montoApertura) || montoApertura < 0) {
        mostrarMensaje('Ingresa un monto de apertura válido.', 'error');
        return;
    }

    try {
        await apiFetch('/caja/apertura', {
            method: 'POST',
            body: JSON.stringify({ monto_apertura: montoApertura })
        });

        mostrarMensaje('Turno de caja abierto correctamente.', 'exito');
        setTimeout(function() {
            window.location.href = 'cajero.html';
        }, 1200);

    } catch (error) {
        mostrarMensaje('No se pudo abrir la caja: ' + error.message, 'error');
    }
}

async function manejarCierre(evento) {
    evento.preventDefault();

    var montoCierre = parseFloat(document.getElementById('campoMontoCierre').value);

    if (isNaN(montoCierre) || montoCierre < 0) {
        mostrarMensaje('Ingresa el monto de efectivo contado en caja.', 'error');
        return;
    }

    var confirmado = window.confirm('¿Estás seguro de que deseas cerrar el turno de caja actual? Esta acción no se puede deshacer.');
    if (!confirmado) {
        return;
    }

    try {
        await apiFetch('/caja/cierre', {
            method: 'POST',
            body: JSON.stringify({ monto_cierre: montoCierre })
        });

        mostrarMensaje('Turno de caja cerrado exitosamente.', 'exito');
        setTimeout(function() {
            window.location.href = 'cajero.html';
        }, 1200);

    } catch (error) {
        mostrarMensaje('No se pudo cerrar la caja: ' + error.message, 'error');
    }
}

function mostrarMensaje(texto, tipo) {
    var contenedor = document.getElementById('mensajeCajaForm');
    contenedor.hidden = false;
    contenedor.textContent = texto;
    contenedor.className = 'mensaje ' + (tipo === 'exito' ? 'mensaje--exito' : 'mensaje--error');
    contenedor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
