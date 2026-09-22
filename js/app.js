/* app.js — arranque, enrutador y cableado de la interfaz. */
(function () {
  'use strict';

  var periodoActivo = CC.per.hoy();
  var ruta = { nombre: 'panel', param: null };

  /* Que entrada del menu se marca para cada ruta */
  var NAV_DE_RUTA = { unidad: 'unidades' };

  /* Acciones que cualquier vista puede invocar por nombre */
  var ACCIONES_GLOBALES = {
    pago: function (ctx) { CC.vistas.cobranza.pago(ctx); },
    gasto: function (ctx) { CC.vistas.gastos.gasto(ctx); }
  };

  function ctx() {
    return { periodo: periodoActivo, param: ruta.param, ruta: ruta.nombre };
  }

  function vistaActual() {
    return CC.vistas[ruta.nombre] || CC.vistas.panel;
  }

  function texto(valor, c) {
    return typeof valor === 'function' ? valor(c) : (valor || '');
  }

  /* ---------- Enrutador ---------- */
  function leerHash() {
    var h = (location.hash || '#/panel').replace(/^#\/?/, '');
    var partes = h.split('/').filter(Boolean);
    var nombre = partes[0] || 'panel';
    if (!CC.vistas[nombre]) nombre = 'panel';
    return { nombre: nombre, param: partes[1] || null };
  }

  function alCambiarHash() {
    ruta = leerHash();
    document.getElementById('view').scrollIntoView({ block: 'start' });
    window.scrollTo(0, 0);
    dibujar();
  }

  /* ---------- Selector de periodo ---------- */
  function llenarPeriodos() {
    var sel = document.getElementById('selPeriodo');
    var lista = CC.Model.periodos();
    if (lista.indexOf(periodoActivo) < 0) { lista.push(periodoActivo); lista.sort().reverse(); }
    sel.innerHTML = lista.map(function (p) {
      return '<option value="' + p + '"' + (p === periodoActivo ? ' selected' : '') + '>' +
        CC.ui.esc(CC.fmt.periodo(p)) + '</option>';
    }).join('');
  }

  /* ---------- Dibujado ---------- */
  function dibujar(mantenerFoco) {
    var v = vistaActual();
    var c = ctx();

    // Identidad de la barra superior
    document.getElementById('topTitle').textContent = texto(v.titulo, c) || 'Cuota Clara';
    document.getElementById('topSub').textContent = texto(v.sub, c);
    document.getElementById('brandCondo').textContent =
      CC.Store.condominio().nombre || 'Sin nombre todavía';

    // Botones de accion de la vista
    var acciones = typeof v.acciones === 'function' ? (v.acciones(c) || []) : [];
    document.getElementById('topActions').innerHTML = acciones.map(function (a) {
      return '<button type="button" class="' + a.clase + '" data-accion="' + a.accion + '">' +
        (a.icono ? CC.ui.icono(a.icono, 'i--sm') : '') + '<span>' + CC.ui.esc(a.texto) + '</span></button>';
    }).join('');

    // Cuerpo
    var raiz = document.getElementById('view');
    var foco = mantenerFoco && document.activeElement ? document.activeElement.id : null;
    var caret = foco && document.activeElement.selectionStart;

    raiz.innerHTML = v.render(c);
    if (typeof v.montar === 'function') v.montar(raiz, c, dibujar);

    if (foco) {
      var el = raiz.querySelector('#' + foco);
      if (el) {
        el.focus();
        if (caret !== null && el.setSelectionRange) {
          try { el.setSelectionRange(caret, caret); } catch (e) { /* tipo sin seleccion */ }
        }
      }
    }

    marcarNavegacion();
    actualizarBadge();
    llenarPeriodos();
  }

  function marcarNavegacion() {
    var activa = NAV_DE_RUTA[ruta.nombre] || ruta.nombre;
    document.querySelectorAll('[data-route]').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('data-route') === activa);
    });
  }

  function actualizarBadge() {
    var badge = document.getElementById('badgeMorosos');
    var n = CC.Model.padron(periodoActivo).filter(function (x) {
      return x.situacion.estado !== 'corriente';
    }).length;
    badge.hidden = n === 0;
    badge.textContent = String(n);
  }

  /* ---------- Cableado ---------- */
  function conectar() {
    // Acciones: tanto los botones de la barra como los que las vistas ponen en su HTML
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-accion]') : null;
      if (!btn) return;
      var nombre = btn.getAttribute('data-accion');
      var v = vistaActual();
      var c = ctx();
      if (typeof v[nombre] === 'function') v[nombre](c);
      else if (ACCIONES_GLOBALES[nombre]) ACCIONES_GLOBALES[nombre](c);
    });

    // Cierre de la ventana modal
    document.getElementById('modal').addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) CC.ui.cerrarModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') CC.ui.cerrarModal();
    });

    // Periodo
    document.getElementById('selPeriodo').addEventListener('change', function (e) {
      periodoActivo = e.target.value;
      dibujar();
    });

    // Tema
    document.getElementById('btnTema').addEventListener('click', CC.ui.ciclarTema);

    // Navegacion
    window.addEventListener('hashchange', alCambiarHash);

    // Cuando cambian los datos, se redibuja la vista actual
    CC.Store.alCambiar(function () { dibujar(); });
  }

  /* ---------- Arranque ---------- */
  function iniciar() {
    CC.ui.aplicarTema(CC.ui.leerTema());
    CC.Store.iniciar();
    ruta = leerHash();
    conectar();
    dibujar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
