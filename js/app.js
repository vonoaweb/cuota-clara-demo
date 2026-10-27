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

    // Reservas solo aparece si el condominio tiene áreas que se apartan
    var hayAreas = CC.Store.amenidades().length > 0;
    document.querySelectorAll('[data-route="reservas"]').forEach(function (a) { a.hidden = !hayAreas; });
    var hayVisitas = !!CC.Store.condominio().registroVisitas;
    document.querySelectorAll('[data-route="visitas"]').forEach(function (a) { a.hidden = !hayVisitas; });

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

  /* El número junto a Adeudos: casas a las que hoy les toca aviso. */
  function actualizarBadge() {
    var badge = document.getElementById('badgeMorosos');
    var n = CC.Model.porAvisar(periodoActivo).length;
    badge.hidden = n === 0;
    badge.textContent = String(n);
    badge.title = n + (n === 1 ? ' casa por avisar' : ' casas por avisar');
  }

  /* En el celular la barra de abajo tiene cinco lugares; el resto va en "Más". */
  function menuMas() {
    var html = '<nav class="mas">' + Array.prototype.map.call(
      document.querySelectorAll('.nav__list .nav__item:not([hidden]), .nav__portal'),
      function (a) {
        var ruta = a.getAttribute('data-route');
        var icono = a.querySelector('use').getAttribute('href').replace('#i-', '');
        var nombre = a.querySelector('strong') ? a.querySelector('strong').textContent : a.querySelector('span').textContent;
        return '<a class="mas__item' + (a.classList.contains('is-on') ? ' is-on' : '') + '" href="#/' + ruta + '">' +
          CC.ui.icono(icono) + '<span>' + CC.ui.esc(nombre) + '</span></a>';
      }).join('') + '</nav>';
    CC.ui.modal('Secciones', html, function (cuerpo) {
      cuerpo.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', CC.ui.cerrarModal); });
    });
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

    // En las listas de casas, tocar cualquier parte de la fila (el nombre, el saldo) abre la casa
    document.addEventListener('click', function (e) {
      var fila = e.target.closest ? e.target.closest('tr[data-casa]') : null;
      if (!fila || e.target.closest('a, button, input, select, textarea, label')) return;
      location.hash = '#/unidad/' + fila.getAttribute('data-casa');
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

    // Menú completo en el celular
    var mas = document.getElementById('btnMas');
    if (mas) mas.addEventListener('click', menuMas);

    // Navegacion
    window.addEventListener('hashchange', alCambiarHash);

    // Cuando cambian los datos, se redibuja la vista actual
    // Los recargos se ponen al día solos con cada cambio (un pago registrado tarde, por ejemplo)
    CC.Store.alCambiar(function () { CC.Model.aplicarRecargos(); });
    CC.Store.alCambiar(function () { dibujar(); });
  }

  /* ---------- Arranque ---------- */
  function iniciar() {
    CC.ui.aplicarTema(CC.ui.leerTema());
    CC.Store.iniciar();
    CC.Model.aplicarRecargos();
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
