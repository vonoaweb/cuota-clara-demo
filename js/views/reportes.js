/* views/reportes.js — el cierre del mes: lo que se presenta en asamblea.
   Pensado para imprimirse tal cual. */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

CC.vistas.reportes = {
  titulo: 'Reportes',
  sub: function (ctx) { return 'Cierre de ' + CC.fmt.periodo(ctx.periodo); },
  acciones: function () {
    return [
      { texto: 'Imprimir cierre', icono: 'imprimir', clase: 'btn', accion: 'imprimir' },
      { texto: 'Copiar resumen', icono: 'avisos', clase: 'btn btn--ghost', accion: 'copiarResumen' }
    ];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var p = ctx.periodo;
    var r = CC.Model.resumen(p);
    var cond = CC.Store.condominio();
    var caja = CC.Model.caja(p);
    var cajaPrevia = CC.Model.caja(CC.per.suma(p, -1));
    var fondo = CC.Model.fondoReserva(p);
    var out = [];

    /* --- Encabezado del documento --- */
    out.push(
      '<div class="recibo">' +
      '<div class="recibo__head">' +
      '<div><p class="eyebrow">Cierre financiero del mes</p>' +
      '<h3>' + esc(cond.nombre || 'Condominio') + '</h3>' +
      '<p class="muted" style="font-size:12px;margin-top:4px">' +
      esc(cond.direccion || '') + (cond.ciudad ? ' · ' + esc(cond.ciudad) : '') + '</p></div>' +
      '<div class="recibo__folio">' +
      'Periodo: ' + esc(CC.fmt.periodo(p)) + '<br>' +
      'Emitido: ' + esc(CC.fmt.fechaCorta(CC.per.hoyISO())) + '<br>' +
      'Unidades: ' + r.unidades + '</div>' +
      '</div>' +

      '<div class="tablewrap"><table class="ledger">' +
      '<thead><tr><th>Concepto</th><th class="r">Presupuestado</th><th class="r">Real</th><th class="r">Diferencia</th></tr></thead>' +
      '<tbody>' +
      '<tr><td class="strong">Ingresos por cuotas</td>' +
      '<td class="r muted">' + esc(CC.fmt.money2(r.esperado)) + '</td>' +
      '<td class="r strong" style="color:var(--good)">' + esc(CC.fmt.money2(r.cobrado)) + '</td>' +
      '<td class="r" style="color:' + (r.cobrado >= r.esperado ? 'var(--good)' : 'var(--crit)') + '">' +
      esc(CC.fmt.moneySigno(r.cobrado - r.esperado)) + '</td></tr>' +
      CC.Model.porCategoria(p).map(function (c) {
        var dif = c.presupuesto - c.monto;
        return '<tr><td style="padding-left:26px">' + esc(c.categoria) + '</td>' +
          '<td class="r muted">' + (c.presupuesto ? esc(CC.fmt.money2(c.presupuesto)) : '—') + '</td>' +
          '<td class="r">' + esc(CC.fmt.money2(c.monto)) + '</td>' +
          '<td class="r" style="color:' + (c.presupuesto ? (dif >= 0 ? 'var(--good)' : 'var(--crit)') : 'var(--muted)') + '">' +
          (c.presupuesto ? esc(CC.fmt.moneySigno(dif)) : '—') + '</td></tr>';
      }).join('') +
      '<tr><td class="strong">Total de egresos</td>' +
      '<td class="r muted">' + esc(CC.fmt.money2(r.presupuestoEgresos)) + '</td>' +
      '<td class="r strong">' + esc(CC.fmt.money2(r.egresos)) + '</td>' +
      '<td class="r" style="color:' + (r.presupuestoEgresos - r.egresos >= 0 ? 'var(--good)' : 'var(--crit)') + '">' +
      esc(CC.fmt.moneySigno(r.presupuestoEgresos - r.egresos)) + '</td></tr>' +
      '</tbody>' +
      '<tfoot><tr><td>Resultado del periodo (devengado)</td><td class="r">' +
      esc(CC.fmt.money2(r.esperado - r.presupuestoEgresos)) + '</td>' +
      '<td class="r" style="color:' + (r.resultadoDevengado >= 0 ? 'var(--good)' : 'var(--crit)') + '">' +
      esc(CC.fmt.moneySigno(r.resultadoDevengado)) + '</td><td></td></tr></tfoot>' +
      '</table></div></div>');

    /* --- Movimiento de caja --- */
    out.push(
      '<div class="split">' +
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Movimiento de caja</h3></div>' +
      '<div class="tablewrap"><table class="ledger"><tbody>' +
      '<tr><td>Saldo al cierre del mes anterior</td><td class="r">' + esc(CC.fmt.money2(cajaPrevia)) + '</td></tr>' +
      '<tr><td>Más: cobranza del periodo</td><td class="r" style="color:var(--good)">' + esc(CC.fmt.money2(r.cobrado)) + '</td></tr>' +
      '<tr><td>Menos: egresos pagados</td><td class="r" style="color:var(--crit)">' + esc(CC.fmt.money2(r.egresosPagados)) + '</td></tr>' +
      '</tbody><tfoot>' +
      '<tr><td>Saldo en caja al cierre</td><td class="r">' + esc(CC.fmt.money2(caja)) + '</td></tr>' +
      '</tfoot></table></div>' +
      '<div class="panelbox__body" style="border-top:1px solid var(--rule)">' +
      '<div class="note"><div>De ese saldo, <strong>' + esc(CC.fmt.money2(fondo)) + '</strong> corresponde al fondo de reserva ' +
      '(' + esc(cond.fondoReservaPct) + '% de lo cobrado). Disponible para operación: <strong>' +
      esc(CC.fmt.money2(caja - fondo)) + '</strong>.</div></div>' +
      (r.egresosPendientes > 0
        ? '<p class="muted" style="font-size:12px;margin-top:10px">Quedan ' +
          esc(CC.fmt.money2(r.egresosPendientes)) + ' en gastos comprometidos que aún no salen de la caja.</p>'
        : '') +
      '</div></div>' +

      /* --- Antigüedad de saldos --- */
      (function () {
        var pad = CC.Model.padron(p);
        var cubos = [
          { lab: 'Al corriente', test: function (s) { return s.saldo <= 0.005; }, tono: 'good' },
          { lab: '1 mes vencido', test: function (s) { return s.mesesVencidos === 1; }, tono: 'warn' },
          { lab: '2 meses', test: function (s) { return s.mesesVencidos === 2; }, tono: 'crit' },
          { lab: '3 meses o más', test: function (s) { return s.mesesVencidos >= 3; }, tono: 'crit' }
        ].map(function (c) {
          var hits = pad.filter(function (x) { return c.test(x.situacion); });
          return {
            lab: c.lab,
            n: hits.length,
            monto: hits.reduce(function (a, x) { return a + Math.max(0, x.situacion.saldo); }, 0),
            tono: c.tono
          };
        });
        var totalCartera = cubos.reduce(function (a, c) { return a + c.monto; }, 0);

        return '<div class="panelbox">' +
          '<div class="panelbox__head"><h3>Antigüedad de saldos</h3>' +
          '<span class="eyebrow">' + r.unidades + ' unidades</span></div>' +
          '<div class="tablewrap"><table class="ledger">' +
          '<thead><tr><th>Antigüedad</th><th class="c">Unidades</th><th class="r">Importe</th></tr></thead>' +
          '<tbody>' + cubos.map(function (c) {
            return '<tr><td>' + CC.ui.pillLibre(c.lab, 'pill--' + c.tono) + '</td>' +
              '<td class="c strong">' + c.n + '</td>' +
              '<td class="r">' + (c.monto > 0 ? esc(CC.fmt.money2(c.monto)) : '—') + '</td></tr>';
          }).join('') + '</tbody>' +
          '<tfoot><tr><td>Cartera total por cobrar</td><td class="c">' +
          pad.filter(function (x) { return x.situacion.saldo > 0.005; }).length + '</td>' +
          '<td class="r">' + esc(CC.fmt.money2(totalCartera)) + '</td></tr></tfoot>' +
          '</table></div></div>';
      })() +
      '</div>');

    /* --- Serie de 12 meses --- */
    var serie = CC.Model.serie(p, 12);
    out.push(
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Comportamiento de 12 meses</h3>' + CC.ui.leyendaSerie() + '</div>' +
      '<div class="panelbox__body">' + CC.ui.graficaSerie(serie) +
      '<div class="tablewrap" style="margin-top:16px"><table class="ledger">' +
      '<thead><tr><th>Mes</th><th class="r">Esperado</th><th class="r">Cobrado</th>' +
      '<th class="r">Egresos</th><th class="r">Resultado</th></tr></thead><tbody>' +
      serie.slice().reverse().filter(function (d) { return d.esperado > 0 || d.egresos > 0; }).map(function (d) {
        var res = d.ingresos - d.egresos;
        return '<tr' + (d.periodo === p ? ' style="background:var(--accent-soft)"' : '') + '>' +
          '<td class="strong">' + esc(CC.fmt.periodoCorto(d.periodo)) + '</td>' +
          '<td class="r muted">' + esc(CC.fmt.money2(d.esperado)) + '</td>' +
          '<td class="r">' + esc(CC.fmt.money2(d.ingresos)) + '</td>' +
          '<td class="r">' + esc(CC.fmt.money2(d.egresos)) + '</td>' +
          '<td class="r strong" style="color:' + (res >= 0 ? 'var(--good)' : 'var(--crit)') + '">' +
          esc(CC.fmt.moneySigno(res)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '</div></div>');

    out.push('<p class="muted" style="font-size:11.5px">Documento generado por Cuota Clara el ' +
      esc(CC.fmt.fecha(CC.per.hoyISO())) + '. Los importes de recargo son estimados y no se han cargado a las unidades.</p>');

    return out.join('');
  },

  imprimir: function () { window.print(); },

  /** Resumen en texto plano: lo que el administrador pega en el grupo del condominio. */
  copiarResumen: function (ctx) {
    var p = ctx.periodo;
    var r = CC.Model.resumen(p);
    var cond = CC.Store.condominio();
    var caja = CC.Model.caja(p);
    var fondo = CC.Model.fondoReserva(p);

    var l = [];
    l.push('INFORME DE ' + CC.fmt.periodo(p).toUpperCase() + ' — ' + (cond.nombre || 'Condominio'));
    l.push('');
    l.push('Ingresos');
    l.push('  Esperado por cuotas: ' + CC.fmt.money2(r.esperado));
    l.push('  Cobrado: ' + CC.fmt.money2(r.cobrado) + ' (' + CC.fmt.pct(r.cobranzaPct) + ')');
    l.push('  Por cobrar del mes: ' + CC.fmt.money2(r.porCobrar));
    l.push('');
    l.push('Egresos');
    CC.Model.porCategoria(p).forEach(function (c) {
      l.push('  ' + c.categoria + ': ' + CC.fmt.money2(c.monto));
    });
    l.push('  Total: ' + CC.fmt.money2(r.egresos));
    if (r.egresosPendientes > 0) l.push('  (pendientes de pago: ' + CC.fmt.money2(r.egresosPendientes) + ')');
    l.push('');
    l.push('Resultado del mes: ' + CC.fmt.moneySigno(r.resultado));
    l.push('Saldo en caja: ' + CC.fmt.money2(caja));
    l.push('  del cual fondo de reserva: ' + CC.fmt.money2(fondo));
    l.push('');
    l.push('Cartera vencida: ' + CC.fmt.money2(r.carteraVencida) +
      ' en ' + r.morosos + ' de ' + r.unidades + ' unidades.');
    l.push('');
    l.push('El detalle por unidad está disponible con la administración.');

    CC.ui.copiar(l.join('\n'), 'Resumen del mes copiado');
  }
};
