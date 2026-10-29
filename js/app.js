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
    // Mientras no terminen de dar de alta el condominio, se abre en Primeros pasos
    var inicial = CC.vistas.inicio && CC.Store.unidades().length === 0 && CC.vistas.inicio.pendientes() > 0 ? '#/inicio' : '#/panel';
    var h = (location.hash || inicial).replace(/^#\/?/, '');
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

    // Primeros pasos: a la vista mientras falte algo, con cuántos pasos faltan
    var faltan = CC.vistas.inicio ? CC.vistas.inicio.pendientes() : 0;
    document.querySelectorAll('[data-route="inicio"]').forEach(function (a) { a.hidden = !faltan && ruta.nombre !== 'inicio'; });
    var bi = document.getElementById('badgeInicio');
    if (bi) { bi.textContent = faltan ? String(faltan) : '✓'; bi.title = faltan ? 'Faltan ' + faltan + ' pasos' : 'Listo'; }

    // El mes que se está viendo, si ya lo cerró el comité
    var cierre = CC.Store.cierre(periodoActivo);
    var candado = document.getElementById('topCandado');
    candado.hidden = !cierre;
    if (cierre) candado.querySelector('span').textContent = CC.fmt.periodo(periodoActivo) + ' está cerrado' +
      (cierre.por ? ' (lo cerró ' + cierre.por.nombre + ')' : '') + ': se puede ver, pero ya no se cambia';

    // Ayuda de esta pantalla
    document.getElementById('topAyuda').href = '#/ayuda/' + (NAV_DE_RUTA[ruta.nombre] || ruta.nombre);
    document.getElementById('topAyuda').hidden = ruta.nombre === 'ayuda';

    marcarNavegacion();
    actualizarBadge();
    llenarPeriodos();
    CC.Sesion.pintarUsuario();
  }
  CC.redibujar = function () { dibujar(); };

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
      }).join('') + '</nav>' +
      '<div class="tema tema--mas" role="group" aria-label="Colores de la pantalla">' +
      '<button type="button" data-tema="claro">Claro</button><button type="button" data-tema="oscuro">Oscuro</button>' +
      '<button type="button" data-tema="sistema">Auto</button></div>';
    CC.ui.modal('Secciones', html, function (cuerpo) {
      CC.ui.aplicarTema(CC.ui.leerTema());   // marca el tema elegido
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
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-tema]') : null;
      if (b) CC.ui.aplicarTema(b.getAttribute('data-tema'));
    });

    // Menú completo en el celular
    var mas = document.getElementById('btnMas');
    if (mas) mas.addEventListener('click', menuMas);

    // Navegacion
    window.addEventListener('hashchange', alCambiarHash);

    // Cuando cambian los datos, se redibuja la vista actual
    // Los recargos se ponen al día solos con cada cambio (un pago registrado tarde, por ejemplo)
    CC.Store.alCambiar(function () { CC.Model.aplicarRecargos(); });
    CC.Store.alCambiar(function () { dibujar(); });
    // Si se dio de alta el primer usuario (o se dio de baja el que estaba dentro), se pide entrar
    CC.Store.alCambiar(function () { CC.Sesion.pintarPuerta(); });

    // Lo que el sistema no deja hacer (un mes cerrado, algo que solo hace el comité)
    // se dice en un aviso, no en un error escondido
    function avisarBloqueo(err) {
      if (!err || !err.bloqueo) return false;
      CC.ui.toast(err.message, 'crit');
      return true;
    }
    window.addEventListener('error', function (e) { if (avisarBloqueo(e.error)) e.preventDefault(); });
    window.addEventListener('unhandledrejection', function (e) { if (avisarBloqueo(e.reason)) e.preventDefault(); });
  }

  /* ---------- Arranque ---------- */
  function iniciar() {
    CC.ui.aplicarTema(CC.ui.leerTema());
    CC.ui.aplicarLetra(CC.ui.leerLetra());
    CC.Store.iniciar();
    CC.Model.aplicarRecargos();
    ruta = leerHash();
    conectar();
    dibujar();
    CC.Sesion.pintarPuerta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
