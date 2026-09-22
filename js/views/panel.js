/* views/panel.js — la primera pantalla: como va el mes en un vistazo. */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

CC.vistas.panel = {
  titulo: 'Panel',
  sub: function (ctx) {
    return CC.Store.condominio().nombre + ' · ' + CC.fmt.periodo(ctx.periodo);
  },

  acciones: function () {
    return [
      { texto: 'Registrar pago', icono: 'mas', clase: 'btn', accion: 'pago' },
      { texto: 'Registrar gasto', icono: 'gastos', clase: 'btn btn--ghost', accion: 'gasto' }
    ];
  },

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
        '<div><strong>Estos son datos de ejemplo.</strong> Un condominio ficticio de 18 unidades, ' +
        'para que veas la aplicación trabajando. En cuanto captures tu primer dato real desaparece este aviso, ' +
        'o puedes vaciarlo todo desde <a href="#/ajustes">Ajustes</a>.</div>' +
        '</div>');
    }

    /* --- Cifras del mes --- */
    out.push(CC.ui.stats([
      {
        lab: 'Saldo en caja',
        val: CC.fmt.money(caja),
        tono: caja < 0 ? 'crit' : null,
        nota: '<span>De ese saldo, ' + esc(CC.fmt.money(fondo)) + ' es fondo de reserva</span>'
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
        nota: '<span>' + r.morosos + ' de ' + r.unidades + ' unidades con saldo</span>'
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
      return '<tr class="' + clase + '">' +
        '<td><a href="#/unidad/' + esc(x.unidad.id) + '" class="strong">' + esc(x.unidad.clave) + '</a>' +
        '<div class="muted" style="font-size:11px">' + esc(x.unidad.inquilino || x.unidad.propietario) + '</div></td>' +
        '<td class="c">' + CC.ui.pill(s.estado) + '</td>' +
        '<td class="r strong">' + esc(CC.fmt.money2(s.saldo)) + '</td>' +
        '</tr>';
    }).join('');

    var cobranza =
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Quién falta de pagar</h3>' +
      '<a class="btn btn--sm btn--soft" href="#/cobranza">Ver cobranza</a></div>' +
      (pendientes.length
        ? '<div class="tablewrap"><table class="ledger">' +
          '<thead><tr><th>Unidad</th><th class="c">Estado</th><th class="r">Saldo</th></tr></thead>' +
          '<tbody>' + filasPend + '</tbody>' +
          (pendientes.length > 6
            ? '<tfoot><tr><td colspan="2">y ' + (pendientes.length - 6) + ' unidades más</td>' +
              '<td class="r">' + esc(CC.fmt.money(pendientes.slice(6).reduce(function (a, x) { return a + x.situacion.saldo; }, 0))) + '</td></tr></tfoot>'
            : '') +
          '</table></div>'
        : '<div class="empty"><strong>Nadie debe nada</strong><p>Todas las unidades están al corriente en este periodo.</p></div>') +
      '</div>';

    var cats = CC.Model.porCategoria(p);
    var egresos =
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>En qué se fue el dinero</h3>' +
      '<a class="btn btn--sm btn--soft" href="#/gastos">Ver gastos</a></div>' +
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
  }
};
