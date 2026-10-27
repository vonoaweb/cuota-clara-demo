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
      'Casas: ' + r.unidades + '</div>' +
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
      '<div class="panelbox__head"><h3>Banco y caja chica</h3><a class="btn btn--sm btn--soft" href="#/caja">Ver movimientos</a></div>' +
      '<div class="tablewrap"><table class="ledger"><thead><tr><th>Cuenta</th><th class="r">Al empezar</th><th class="r">Entró</th>' +
      '<th class="r">Salió</th><th class="r">Al cerrar</th></tr></thead><tbody>' +
      CC.Store.cuentas().map(function (cu) {
        var e = CC.Model.estadoCuentaBanco(cu.id, p);
        return '<tr><td class="strong">' + esc(cu.nombre) + '</td><td class="r">' + esc(CC.fmt.money2(e.inicial)) + '</td>' +
          '<td class="r" style="color:var(--good)">' + esc(CC.fmt.money2(e.entradas)) + '</td>' +
          '<td class="r" style="color:var(--crit)">' + esc(CC.fmt.money2(e.salidas)) + '</td>' +
          '<td class="r strong">' + esc(CC.fmt.money2(e.final)) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="4">Total al cierre</td><td class="r">' + esc(CC.fmt.money2(caja)) + '</td></tr></tfoot>' +
      '</table></div>' +
      (Number(cond.fondoReservaPct) ? '<div class="panelbox__body" style="border-top:1px solid var(--rule)">' +
        '<div class="note"><div>De ese saldo, <strong>' + esc(CC.fmt.money2(fondo)) + '</strong> corresponde al fondo de reserva ' +
        '(' + esc(cond.fondoReservaPct) + '% de lo cobrado).</div></div></div>' : '') +
      (r.egresosPendientes > 0
        ? '<p class="muted" style="font-size:12px;margin:10px 16px">Quedan ' +
          esc(CC.fmt.money2(r.egresosPendientes)) + ' en gastos comprometidos que aún no salen.</p>'
        : '') +
      '</div>' +

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
          '<span class="eyebrow">' + r.unidades + ' casas</span></div>' +
          '<div class="tablewrap"><table class="ledger">' +
          '<thead><tr><th>Antigüedad</th><th class="c">Casas</th><th class="r">Importe</th></tr></thead>' +
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

    /* --- Lo que entró en el mes, por concepto --- */
    var ing = CC.Model.ingresosDelMes(p);
    var recup = Object.keys(ing.recuperado).sort();
    out.push('<div class="panelbox"><div class="panelbox__head"><h3>Lo que entró en ' + esc(CC.fmt.periodo(p)) + '</h3>' +
      '<span class="eyebrow">' + ing.pagos + ' pagos</span></div>' +
      '<div class="tablewrap"><table class="ledger"><tbody>' +
      '<tr><td>Cuotas del mes</td><td class="r">' + esc(CC.fmt.money2(ing.cuotasDelMes)) + '</td></tr>' +
      '<tr><td class="strong">Recuperado de meses atrasados</td><td class="r strong">' + esc(CC.fmt.money2(ing.recuperadoTotal)) + '</td></tr>' +
      recup.map(function (per) {
        return '<tr><td style="padding-left:26px">de ' + esc(CC.fmt.periodo(per).toLowerCase()) + '</td><td class="r">' + esc(CC.fmt.money2(ing.recuperado[per])) + '</td></tr>';
      }).join('') +
      '<tr><td>Recargos cobrados</td><td class="r">' + esc(CC.fmt.money2(ing.recargos)) + '</td></tr>' +
      (ing.adelantado ? '<tr><td>Pagos adelantados</td><td class="r">' + esc(CC.fmt.money2(ing.adelantado)) + '</td></tr>' : '') +
      (ing.otrosCargos ? '<tr><td>Casa club, multas y otros cargos</td><td class="r">' + esc(CC.fmt.money2(ing.otrosCargos)) + '</td></tr>' : '') +
      (ing.aFavor ? '<tr><td>Quedó a favor de las casas</td><td class="r">' + esc(CC.fmt.money2(ing.aFavor)) + '</td></tr>' : '') +
      (ing.otrosIngresos ? '<tr><td>Otros ingresos (tarjetas, multas en efectivo)</td><td class="r">' + esc(CC.fmt.money2(ing.otrosIngresos)) + '</td></tr>' : '') +
      '</tbody><tfoot><tr><td>Total</td><td class="r">' + esc(CC.fmt.money2(ing.total)) + '</td></tr></tfoot></table></div></div>');

    /* --- Egresos del año por categoría: se va acumulando mes con mes --- */
    var anio = p.slice(0, 4);
    var ea = CC.Model.egresosDelAnio(anio);
    var mesesConGasto = ea.meses.filter(function (per) { return ea.porMes[per] > 0; });
    var GR = { fijo: 'Gastos fijos', variable: 'Gastos variables', otro: 'Otros gastos' };
    var grupoActual = null;
    out.push('<div class="panelbox"><div class="panelbox__head"><h3>Egresos de ' + esc(anio) + ' por categoría</h3>' +
      '<div class="chips noprint"><button class="chip" data-accion="exportarAnual">Exportar a Excel</button></div></div>' +
      '<div class="tablewrap"><table class="ledger ledger--matriz"><thead><tr><th>Categoría</th>' +
      mesesConGasto.map(function (per) { return '<th class="r">' + esc(CC.fmt.mesCorto(per)) + '</th>'; }).join('') +
      '<th class="r">Acumulado</th></tr></thead><tbody>' +
      ea.filas.map(function (f) {
        var cab = '';
        if (f.grupo !== grupoActual) {
          grupoActual = f.grupo;
          cab = '<tr class="ledger__grupo"><td colspan="' + (mesesConGasto.length + 2) + '">' + esc(GR[f.grupo] || 'Otros gastos') + '</td></tr>';
        }
        return cab + '<tr><td class="strong">' + esc(f.categoria) + '</td>' +
          mesesConGasto.map(function (per) {
            var v = f.porMes[per] || 0;
            return '<td class="r' + (v ? ' celda-clic' : ' muted') + '"' + (v ? ' data-cat="' + esc(f.categoria) + '" data-per="' + per + '"' : '') + '>' +
              (v ? esc(CC.fmt.money(v)) : '—') + '</td>';
          }).join('') + '<td class="r strong">' + esc(CC.fmt.money(f.total)) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td>Total</td>' +
      mesesConGasto.map(function (per) { return '<td class="r">' + esc(CC.fmt.money(ea.porMes[per])) + '</td>'; }).join('') +
      '<td class="r">' + esc(CC.fmt.money(ea.total)) + '</td></tr></tfoot></table></div>' +
      '<div class="panelbox__body" style="border-top:1px solid var(--rule)"><p class="field__hint">Toca una cifra para ver de qué se compone.</p></div></div>');

    /* --- Histórico de adeudos: casa por casa, mes por mes --- */
    var hist = CC.Model.historicoAdeudos(p, 6);
    var conDeuda = hist.filas.filter(function (x) { return x.saldo > 0.005; });
    out.push('<div class="panelbox"><div class="panelbox__head"><h3>Histórico de adeudos</h3>' +
      '<div class="chips noprint"><span class="eyebrow" style="align-self:center">' + conDeuda.length + ' casas deben</span>' +
      '<button class="chip" data-accion="exportarHistorico">Exportar a Excel</button></div></div>' +
      (conDeuda.length ? '<div class="tablewrap"><table class="ledger ledger--matriz"><thead><tr><th>Casa</th><th class="r">Antes</th>' +
        hist.meses.map(function (per) { return '<th class="r">' + esc(CC.fmt.mesCorto(per)) + '</th>'; }).join('') +
        '<th class="r">Debe</th></tr></thead><tbody>' + conDeuda.map(function (x) {
          return '<tr><td><a class="strong" href="#/unidad/' + esc(x.unidad.id) + '">' + esc(x.unidad.clave) + '</a>' +
            '<div class="muted" style="font-size:11px">' + esc(x.unidad.propietario) + '</div></td>' +
            '<td class="r' + (x.anterior ? '' : ' muted') + '">' + (x.anterior ? esc(CC.fmt.money(x.anterior)) : '—') + '</td>' +
            hist.meses.map(function (per) {
              var v = x.porMes[per] || 0;
              return '<td class="r' + (v ? ' celda-debe' : ' muted') + '">' + (v ? esc(CC.fmt.money(v)) : '·') + '</td>';
            }).join('') + '<td class="r strong">' + esc(CC.fmt.money2(x.saldo)) + '</td></tr>';
        }).join('') + '</tbody><tfoot><tr><td>Total</td><td class="r">' +
        esc(CC.fmt.money(conDeuda.reduce(function (a, x) { return a + x.anterior; }, 0))) + '</td>' +
        hist.meses.map(function (per) {
          return '<td class="r">' + esc(CC.fmt.money(conDeuda.reduce(function (a, x) { return a + (x.porMes[per] || 0); }, 0))) + '</td>';
        }).join('') + '<td class="r">' + esc(CC.fmt.money2(conDeuda.reduce(function (a, x) { return a + x.saldo; }, 0))) + '</td></tr></tfoot></table></div>'
        : '<div class="empty"><strong>Nadie debe</strong></div>') + '</div>');

    out.push('<p class="muted" style="font-size:11.5px">Documento generado por Cuota Clara el ' +
      esc(CC.fmt.fecha(CC.per.hoyISO())) + '.' + (cond.recargoModo === 'tramos' ? ' Los recargos se cargan solos según el día de pago.'
        : ' Los importes de recargo son estimados y no se han cargado a las casas.') + '</p>');

    return out.join('');
  },

  montar: function (raiz, ctx) {
    raiz.querySelectorAll('[data-cat][data-per]').forEach(function (td) {
      td.onclick = function () { detalleCategoria(td.getAttribute('data-cat'), td.getAttribute('data-per')); };
    });
  },

  imprimir: function () { window.print(); },

  exportarAnual: function (ctx) {
    var ea = CC.Model.egresosDelAnio(ctx.periodo.slice(0, 4));
    CC.ui.descargarCSV('Egresos ' + ea.anio + ' por categoria', ['Categoría', 'Tipo'].concat(ea.meses.map(CC.fmt.periodo), ['Acumulado']),
      ea.filas.map(function (f) {
        return [f.categoria, f.grupo].concat(ea.meses.map(function (per) { return f.porMes[per] || 0; }), [f.total]);
      }).concat([['Total', ''].concat(ea.meses.map(function (per) { return ea.porMes[per]; }), [ea.total])]));
  },

  exportarHistorico: function (ctx) {
    var h = CC.Model.historicoAdeudos(ctx.periodo, 12);
    CC.ui.descargarCSV('Historico de adeudos ' + CC.fmt.periodo(ctx.periodo), ['Casa', 'Propietario', 'Teléfono', 'Antes'].concat(h.meses.map(CC.fmt.periodo), ['Debe']),
      h.filas.filter(function (x) { return x.saldo > 0.005; }).map(function (x) {
        return [x.unidad.clave, x.unidad.propietario, x.unidad.telefono || '', x.anterior].concat(h.meses.map(function (per) { return x.porMes[per] || 0; }), [x.saldo]);
      }));
  },

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
      ' en ' + r.morosos + ' de ' + r.unidades + ' casas.');
    l.push('');
    l.push('El detalle por casa está disponible con la administración.');

    CC.ui.copiar(l.join('\n'), 'Resumen del mes copiado');
  }
};
