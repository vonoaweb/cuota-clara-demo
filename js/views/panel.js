/* views/panel.js — la primera pantalla: como va el mes en un vistazo. */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

/** La casa de "Pruébalo en vivo": la de prueba del perfil o, en el demo para
    enseñar, la que más debe (su aviso le llega a quien prueba, ver js/demo.js). */
function casaDeMuestra(periodo) {
  var prueba = CC.Store.unidades().filter(function (u) { return u.prueba; })[0];
  if (prueba) return CC.Store.estado().meta.semilla ? prueba : null;
  if (!(CC.Demo && CC.Demo.activo()) || !CC.Store.estado().meta.semilla) return null;
  var mayor = CC.Model.padron(periodo)
    .filter(function (x) { return x.situacion.saldo > 0.005; })
    .sort(function (a, b) { return b.situacion.saldo - a.situacion.saldo; })[0];
  return mayor ? mayor.unidad : null;
}

CC.vistas.panel = {
  titulo: 'Panel',
  sub: function (ctx) {
    return CC.Store.condominio().nombre + ' · ' + CC.fmt.periodo(ctx.periodo);
  },

  acciones: function () {
    return [
      { texto: 'Registrar pago', icono: 'mas', clase: 'btn', accion: 'pago' },
      { texto: 'Registrar egreso', icono: 'gastos', clase: 'btn btn--ghost', accion: 'gasto' }
    ];
  },

  avisar: function (ctx) { CC.vistas.adeudos.avisarTodos(ctx); },

  render: function (ctx) {
    var p = ctx.periodo;
    var r = CC.Model.resumen(p);
    var caja = CC.Model.caja(p);
    var fondo = CC.Model.fondoReserva(p);
    var esc = CC.ui.esc;
    var out = [];

    /* --- Aviso de datos de ejemplo --- */
    if (CC.Store.esDemo()) {
      out.push(
        '<div class="note note--demo">' +
        '<div><strong>Estos son datos de ejemplo.</strong> ' + CC.Store.unidades().length +
        ' casas con vecinos e importes inventados, para que veas la aplicación trabajando. En cuanto captures tu primer dato real desaparece este aviso, ' +
        'o puedes vaciarlo todo desde <a href="#/ajustes">Ajustes</a>.</div>' +
        '</div>');
    }

    /* --- Casa de prueba: el aviso llega a un WhatsApp de verdad --- */
    var prueba = casaDeMuestra(p);
    if (prueba) {
      var sp = CC.Model.situacion(prueba.id, p);
      var demo = CC.Demo && CC.Demo.activo(), miNum = demo && CC.Demo.numero();
      var tel = demo ? (miNum || '0') : CC.Comprobantes.telWa(prueba.telefono);
      var texto = CC.Model.avisoAdeudo(prueba.id, p);
      out.push('<div class="prueba">' +
        '<div class="prueba__txt"><span class="prueba__eyebrow">Pruébalo en vivo</span>' +
        '<strong>Casa ' + esc(prueba.clave) + ' · ' + esc(prueba.inquilino || prueba.propietario) + '</strong>' +
        '<span>Debe ' + esc(CC.fmt.money2(sp.saldo)) +
        (sp.desde ? ' desde ' + esc(CC.fmt.periodo(sp.desde).toLowerCase()) : '') +
        (demo
          ? '. Manda el aviso y te llega a tu WhatsApp<span data-demotiene' + (miNum ? '' : ' hidden') + '> (<b class="num" data-demonum>' +
            esc(miNum ? CC.Demo.formato(miNum) : '') + '</b> · <button type="button" class="linkbtn" data-demonumero="1">cambiar</button>)</span>.'
          : '. Manda el aviso y llega al WhatsApp <b class="num">' + esc(prueba.telefono) + '</b>.') +
        '</span></div>' +
        '<div class="prueba__acc">' +
        (tel ? '<a class="btn" target="_blank" rel="noopener" data-avisoprueba="1" href="https://wa.me/' + esc(tel) +
          '?text=' + encodeURIComponent(texto) + '">' + CC.ui.icono('wa', 'i--sm') +
          (demo ? ' Enviar el aviso a mi WhatsApp' : ' Enviar aviso por WhatsApp') + '</a>' : '') +
        '<a class="btn btn--ghost" href="#/unidad/' + esc(prueba.id) + '">Ver la casa</a>' +
        '</div></div>');
    }

    /* --- Lo que toca hacer hoy --- */
    var porAvisar = CC.Model.porAvisar(p);
    if (porAvisar.length) {
      out.push('<div class="cta">' +
        '<div class="cta__txt"><strong>Toca avisar a ' + porAvisar.length + (porAvisar.length === 1 ? ' casa' : ' casas') +
        ' que no han pagado.</strong> Los mensajes ya están escritos con el saldo de cada una.</div>' +
        '<button class="btn" data-accion="avisar">' + CC.ui.icono('wa', 'i--sm') + ' Enviar avisos</button>' +
        '</div>');
    }

    /* --- Cifras del mes --- */
    out.push(CC.ui.stats([
      {
        lab: 'Banco y caja chica',
        val: CC.fmt.money(caja),
        tono: caja < 0 ? 'crit' : null,
        nota: '<span>Banco ' + esc(CC.fmt.money(CC.Model.saldoCuenta('banco'))) + ' · caja chica ' +
          esc(CC.fmt.money(CC.Model.saldoCuenta('caja'))) + '</span>'
      },
      {
        lab: 'Cobrado del mes',
        val: CC.fmt.money(r.cobrado),
        tono: r.cobranzaPct >= 0.9 ? 'good' : r.cobranzaPct >= 0.6 ? 'warn' : 'crit',
        nota: '<span>' + esc(CC.fmt.pct(r.cobranzaPct)) + ' de ' + esc(CC.fmt.money(r.esperado)) + ' esperados</span>'
      },
      {
        lab: 'Por cobrar',
        val: CC.fmt.money(r.porCobrar),
        tono: r.porCobrar > 0 ? 'warn' : 'good',
        nota: '<span>' + r.morosos + ' de ' + r.unidades + ' casas con saldo</span>'
      },
      {
        lab: 'Resultado del mes',
        val: CC.fmt.moneySigno(r.resultado),
        tono: r.resultado >= 0 ? 'good' : 'crit',
        nota: '<span>Cobrado menos egresos pagados</span>'
      }
    ]));

    /* --- Cobranza pendiente y egresos del mes --- */
    var pendientes = CC.Model.padron(p)
      .filter(function (x) { return x.situacion.saldo > 0.005; })
      .sort(function (a, b) { return b.situacion.saldo - a.situacion.saldo; });

    var filasPend = pendientes.slice(0, 6).map(function (x) {
      var s = x.situacion;
      var clase = s.estado === 'moroso' ? 'row--crit' : s.estado === 'vencido' ? 'row--warn' : '';
      return '<tr class="' + clase + ' fila-clic" data-casa="' + esc(x.unidad.id) + '" title="Ver la casa">' +
        '<td><a href="#/unidad/' + esc(x.unidad.id) + '" class="strong">' + esc(x.unidad.clave) + '</a>' +
        '<div class="muted" style="font-size:11px">' + esc(x.unidad.inquilino || x.unidad.propietario) + '</div></td>' +
        '<td class="c">' + CC.ui.pill(s.estado) + '</td>' +
        '<td class="r strong">' + esc(CC.fmt.money2(s.saldo)) + '</td>' +
        '<td class="r noprint">' + (CC.Comprobantes.telWa(x.unidad.telefono)
          ? '<button class="btn btn--sm btn--soft" data-avisar="' + esc(x.unidad.id) + '" title="Avisar por WhatsApp">' +
            CC.ui.icono('wa', 'i--sm') + '</button>'
          : '') + '</td>' +
        '</tr>';
    }).join('');

    var cobranza =
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Quién falta de pagar</h3>' +
      '<a class="btn btn--sm btn--soft" href="#/cobranza">Ver cobranza</a></div>' +
      (pendientes.length
        ? '<div class="tablewrap"><table class="ledger">' +
          '<thead><tr><th>Casa</th><th class="c">Estado</th><th class="r">Saldo</th><th class="noprint"></th></tr></thead>' +
          '<tbody>' + filasPend + '</tbody>' +
          (pendientes.length > 6
            ? '<tfoot><tr><td colspan="2">y ' + (pendientes.length - 6) + ' casas más</td>' +
              '<td class="r">' + esc(CC.fmt.money(pendientes.slice(6).reduce(function (a, x) { return a + x.situacion.saldo; }, 0))) + '</td><td></td></tr></tfoot>'
            : '') +
          '</table></div>'
        : '<div class="empty"><strong>Nadie debe nada</strong><p>Todas las casas están al corriente en este periodo.</p></div>') +
      '</div>';

    var cats = CC.Model.porCategoria(p);
    var egresos =
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>En qué se fue el dinero</h3>' +
      '<a class="btn btn--sm btn--soft" href="#/gastos">Ver egresos</a></div>' +
      '<div class="panelbox__body">' +
      (cats.length
        ? CC.ui.barras(cats.slice(0, 7).map(function (c) {
            return {
              lab: c.categoria,
              val: CC.fmt.money(c.monto),
              frac: c.monto,
              tono: c.presupuesto > 0 && c.monto > c.presupuesto * 1.05 ? 'crit' : null
            };
          })) +
          '<p class="muted" style="font-size:11.5px;margin-top:12px">' +
          'Total de egresos del mes: <span class="num">' + esc(CC.fmt.money(r.egresos)) + '</span>' +
          (r.egresosPendientes > 0
            ? ' · <span style="color:var(--warn)">' + esc(CC.fmt.money(r.egresosPendientes)) + ' sin pagar todavía</span>'
            : '') +
          '</p>'
        : '<div class="empty"><strong>Sin gastos registrados</strong><p>Todavía no hay egresos capturados en este periodo.</p></div>') +
      '</div></div>';

    out.push('<div class="split">' + cobranza + egresos + '</div>');

    /* --- Caseta: quién entró hoy y quién viene --- */
    if (CC.Store.condominio().registroVisitas) {
      var hoyV = CC.per.hoyISO();
      var entraron = CC.Model.visitasDel(hoyV).filter(function (v) { return v.estado !== 'esperada'; }).length;
      var dentroV = CC.Model.visitasDentro();
      var esperadasV = CC.Model.visitasEsperadas().filter(function (v) { return v.fecha === hoyV; });
      out.push('<div class="panelbox">' +
        '<div class="panelbox__head"><h3>En la caseta hoy</h3>' +
        '<a class="btn btn--sm btn--soft" href="#/visitas">Ver visitas</a></div>' +
        '<div class="panelbox__body" style="display:flex;flex-wrap:wrap;gap:8px 22px;font-size:13px">' +
        '<span><b class="num">' + entraron + '</b> entradas</span>' +
        '<span><b class="num">' + dentroV.length + '</b> dentro ahora</span>' +
        '<span><b class="num">' + esperadasV.length + '</b> avisadas por los vecinos</span>' +
        '</div></div>');
    }

    /* --- Canchas: lo apartado hoy --- */
    var areas = CC.Store.amenidades();
    if (areas.length) {
      var hoyISO = CC.per.hoyISO();
      var deHoy = CC.Model.reservasDel(hoyISO);
      var totalHoras = areas.reduce(function (t, a) { return t + CC.Model.horasDe(a).length; }, 0);
      out.push('<div class="panelbox">' +
        '<div class="panelbox__head"><h3>Hoy en ' + esc(areas.length > 1 ? 'las áreas comunes' : areas[0].nombre.toLowerCase()) + '</h3>' +
        '<a class="btn btn--sm btn--soft" href="#/reservas">Apartar</a></div>' +
        (deHoy.length
          ? '<ul class="reslista">' + deHoy.slice(0, 6).map(function (r) {
              var u = CC.Store.unidad(r.unidadId) || {}, a = CC.Store.amenidad(r.amenidadId) || {};
              return '<li><span><b class="mono">' + esc(r.hora) + '</b> · ' + esc(a.nombre) + '</span>' +
                '<span>Casa ' + esc(u.clave) + '</span></li>';
            }).join('') + '</ul>' +
            '<p class="muted" style="font-size:11.5px;padding:8px 16px 12px">' + deHoy.length + ' de ' + totalHoras +
            ' horas apartadas' + (deHoy.length > 6 ? ' · y ' + (deHoy.length - 6) + ' más' : '') + '</p>'
          : '<div class="empty"><strong>Las canchas están libres hoy</strong><p>Apártalas desde Reservas.</p></div>') +
        '</div>');
    }

    /* --- Historial de 6 meses --- */
    var serie = CC.Model.serie(p, 6);
    out.push(
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Ingresos contra egresos</h3>' + CC.ui.leyendaSerie() + '</div>' +
      '<div class="panelbox__body">' + CC.ui.graficaSerie(serie) + '</div>' +
      '</div>');

    /* --- Ultimos avisos --- */
    var avisos = CC.Store.avisos().slice(0, 2);
    if (avisos.length) {
      out.push(
        '<div class="section">' +
        '<div class="section__head"><h2>Avisos recientes</h2>' +
        '<a class="btn btn--sm btn--ghost" href="#/avisos">Todos los avisos</a></div>' +
        '<div class="avisos">' + avisos.map(function (a) {
          return '<article class="aviso aviso--' + esc(a.prioridad) + '">' +
            '<div class="aviso__body">' +
            '<h4>' + esc(a.titulo) + '</h4>' +
            '<p>' + esc(a.cuerpo) + '</p>' +
            '<div class="aviso__meta"><span>' + esc(CC.fmt.fecha(a.fecha)) + '</span></div>' +
            '</div></article>';
        }).join('') + '</div></div>');
    }

    return out.join('');
  },

  montar: function (raiz, ctx) {
    raiz.querySelectorAll('[data-avisar]').forEach(function (b) {
      b.onclick = function () { CC.vistas.adeudos.avisarUna(b.getAttribute('data-avisar'), ctx.periodo); };
    });
    var a = raiz.querySelector('[data-avisoprueba]');
    var prueba = casaDeMuestra(ctx.periodo);
    if (a && prueba) a.addEventListener('click', function () {
      var s = CC.Model.situacion(prueba.id, ctx.periodo);
      // después del clic, para que el enlace alcance a abrir WhatsApp
      setTimeout(function () {
        CC.Store.registrarAvisoAdeudo({
          unidadId: prueba.id, canal: 'whatsapp',
          saldo: Math.round(s.saldo * 100) / 100, meses: s.mesesVencidos
        });
        CC.ui.toast('Aviso anotado en el historial de la casa ' + prueba.clave, 'good');
      }, 0);
    });
  }
};
