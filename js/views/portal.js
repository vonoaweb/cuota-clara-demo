/* views/portal.js — lo que ve un residente.
 *
 * Es la razon de ser de la aplicación: el vecino entra, ve su saldo y ve
 * en que se gasto el dinero del condominio sin tener que pedirselo a nadie.
 * Desde la administración esta pantalla sirve como vista previa.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var unidadPortal = null;

function unidadActiva(ctx) {
  var us = CC.Store.unidades();
  if (!us.length) return null;
  var id = ctx.param || unidadPortal;
  var u = id ? CC.Store.unidad(id) : null;
  return u || us[0];
}

CC.vistas.portal = {
  titulo: 'Portal del residente',
  sub: function (ctx) {
    var u = unidadActiva(ctx);
    return u ? 'Vista previa como casa ' + u.clave : 'Sin unidades capturadas';
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var u = unidadActiva(ctx);
    var cond = CC.Store.condominio();
    var p = ctx.periodo;

    if (!u) {
      return '<div class="panelbox"><div class="empty">' +
        '<strong>Todavía no hay casas</strong>' +
        '<p>Captura las casas del condominio para poder ver su portal.</p>' +
        '<a class="btn" href="#/unidades" style="margin-top:8px">Ir a casas</a></div></div>';
    }

    unidadPortal = u.id;
    var s = CC.Model.situacion(u.id, p);
    var cuota = CC.Model.cuota(u);
    var quien = (u.inquilino || u.propietario || '').split(' ')[0];
    var out = [];

    /* --- Selector: esto es una vista previa del administrador --- */
    out.push(
      '<div class="note noprint">' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;width:100%">' +
      '<span>Así ve el portal el residente de la casa</span>' +
      '<select class="input input--sm" id="selPortal" style="width:auto;min-width:200px">' +
      CC.Store.unidades().slice().sort(function (a, b) { return a.clave < b.clave ? -1 : 1; })
        .map(function (x) {
          return '<option value="' + esc(x.id) + '"' + (x.id === u.id ? ' selected' : '') + '>' +
            esc(x.clave) + ' — ' + esc(x.inquilino || x.propietario || '') + '</option>';
        }).join('') +
      '</select>' +
      '</div></div>');

    /* --- Saldo: lo primero que quiere saber el vecino --- */
    var alCorriente = s.saldo <= 0.005;
    out.push(
      '<div class="recibo">' +
      '<div class="recibo__head">' +
      '<div><p class="eyebrow">' + esc(cond.nombre || 'Condominio') + '</p>' +
      '<h3>Hola ' + esc(quien || 'vecino') + ', casa ' + esc(u.clave) + '</h3>' +
      '<p class="muted" style="font-size:12.5px;margin-top:6px">' +
      (alCorriente
        ? 'Tu cuenta está al corriente. Gracias por pagar a tiempo.'
        : 'Tienes un saldo pendiente' + (s.mesesVencidos > 0
          ? ' de ' + s.mesesVencidos + (s.mesesVencidos === 1 ? ' mes' : ' meses') + ', desde ' + esc(CC.fmt.periodo(s.desde)) + '.'
          : '.')) +
      '</p></div>' +
      '<div class="recibo__folio">' +
      'Cuota mensual<br><span style="font-size:15px;color:var(--ink)">' + esc(CC.fmt.money2(cuota)) + '</span><br>' +
      'Indiviso ' + esc(CC.fmt.pct(CC.Model.indiviso(u))) + '</div>' +
      '</div>' +
      '<div class="recibo__tot">' +
      '<span>' + (s.saldo < -0.005 ? 'Saldo a favor' : alCorriente ? 'Saldo' : 'Total a pagar') + '</span>' +
      '<strong style="color:' + (alCorriente ? 'var(--good)' : 'var(--crit)') + '">' +
      esc(CC.fmt.money2(Math.abs(s.saldo) + (alCorriente ? 0 : s.recargo))) + '</strong>' +
      '</div>' +
      (s.recargo > 0
        ? '<div class="panelbox__body" style="border-top:1px solid var(--rule);padding:12px 20px">' +
          '<p class="muted" style="font-size:12px">Incluye ' + esc(CC.fmt.money2(s.recargo)) +
          ' de recargo por mora (' + esc(cond.tasaMoraMensual) + '% mensual sobre el saldo vencido).</p></div>'
        : '') +
      '</div>');

    /* --- Avisos del condominio --- */
    var avisos = CC.Store.avisos().slice(0, 3);
    if (avisos.length) {
      out.push('<div class="section">' +
        '<div class="section__head"><h2>Avisos del condominio</h2></div>' +
        '<div class="avisos">' + avisos.map(function (a) {
          return '<article class="aviso aviso--' + esc(a.prioridad) + '">' +
            '<div class="aviso__body"><h4>' + esc(a.titulo) + '</h4>' +
            '<p>' + esc(a.cuerpo) + '</p>' +
            '<div class="aviso__meta"><span>' + esc(CC.fmt.fecha(a.fecha)) + '</span></div>' +
            '</div></article>';
        }).join('') + '</div></div>');
    }

    /* --- A donde va la cuota: la parte que genera confianza --- */
    var cats = CC.Model.porCategoria(p);
    var totalEgresos = cats.reduce(function (a, c) { return a + c.monto; }, 0);
    if (totalEgresos > 0) {
      out.push(
        '<div class="panelbox">' +
        '<div class="panelbox__head"><h3>A dónde va tu cuota</h3>' +
        '<span class="eyebrow">' + esc(CC.fmt.periodo(p)) + '</span></div>' +
        '<div class="panelbox__body">' +
        '<p class="muted" style="font-size:12.5px;margin-bottom:14px;max-width:62ch">' +
        'Reparto de los ' + esc(CC.fmt.money2(totalEgresos)) + ' que gastó el condominio este mes, ' +
        'y la parte que corresponde a tu cuota de ' + esc(CC.fmt.money2(cuota)) + '.</p>' +
        '<div class="tablewrap"><table class="ledger">' +
        '<thead><tr><th>Servicio</th><th class="r">Gasto del condominio</th>' +
        '<th class="r">Proporción</th><th class="r">Tu parte</th></tr></thead><tbody>' +
        cats.map(function (c) {
          var frac = c.monto / totalEgresos;
          return '<tr><td class="strong">' + esc(c.categoria) + '</td>' +
            '<td class="r">' + esc(CC.fmt.money2(c.monto)) + '</td>' +
            '<td class="r muted">' + esc(CC.fmt.pct(frac)) + '</td>' +
            '<td class="r">' + esc(CC.fmt.money2(cuota * frac)) + '</td></tr>';
        }).join('') + '</tbody>' +
        '<tfoot><tr><td>Total</td>' +
        '<td class="r">' + esc(CC.fmt.money2(totalEgresos)) + '</td>' +
        '<td class="r">100.0%</td>' +
        '<td class="r">' + esc(CC.fmt.money2(cuota)) + '</td></tr></tfoot>' +
        '</table></div></div></div>');
    }

    /* --- Movimientos de la unidad --- */
    var movs = [];
    CC.Store.cargos().filter(function (c) { return c.unidadId === u.id && c.periodo <= p; })
      .forEach(function (c) { movs.push({ fecha: c.fechaVence || c.periodo + '-01', concepto: c.concepto, cargo: c.monto, abono: 0 }); });
    CC.Store.pagos().filter(function (x) { return x.unidadId === u.id && x.periodo <= p; })
      .forEach(function (x) { movs.push({ fecha: x.fecha, concepto: 'Tu pago — ' + (x.metodo || ''), cargo: 0, abono: x.monto }); });
    movs.sort(function (a, b) { return (a.fecha || '') < (b.fecha || '') ? 1 : -1; });

    out.push('<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Tus movimientos</h3>' +
      '<span class="eyebrow">' + movs.length + ' registros</span></div>' +
      (movs.length
        ? '<div class="tablewrap"><table class="ledger">' +
          '<thead><tr><th>Fecha</th><th>Concepto</th><th class="r">Cargo</th><th class="r">Pago</th></tr></thead><tbody>' +
          movs.slice(0, 14).map(function (m) {
            return '<tr><td class="mono" style="font-size:12px;white-space:nowrap">' + esc(CC.fmt.fechaCorta(m.fecha)) + '</td>' +
              '<td>' + esc(m.concepto) + '</td>' +
              '<td class="r">' + (m.cargo ? esc(CC.fmt.money2(m.cargo)) : '') + '</td>' +
              '<td class="r" style="color:var(--good)">' + (m.abono ? esc(CC.fmt.money2(m.abono)) : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="empty"><strong>Sin movimientos</strong><p>Todavía no hay cargos ni pagos registrados.</p></div>') +
      '</div>');

    /* --- Cómo pagar --- */
    if (cond.cuenta || cond.telefono || cond.email) {
      out.push('<div class="panelbox">' +
        '<div class="panelbox__head"><h3>Cómo pagar</h3></div>' +
        '<div class="panelbox__body stack">' +
        (cond.cuenta
          ? '<div><p class="eyebrow">Transferencia o depósito</p>' +
            '<p class="mono" style="font-size:13.5px;margin-top:5px">' + esc(cond.cuenta) + '</p>' +
            '<p class="muted" style="font-size:12px;margin-top:6px">Usa como referencia tu casa: <strong>' +
            esc(u.clave) + '</strong>. Envía el comprobante para que se aplique el mismo día.</p></div>'
          : '') +
        '<div><p class="eyebrow">Administración</p>' +
        '<p style="font-size:13px;margin-top:5px">' + esc(cond.administrador || '') +
        (cond.telefono ? ' · ' + esc(cond.telefono) : '') +
        (cond.email ? ' · ' + esc(cond.email) : '') + '</p></div>' +
        '<p class="muted" style="font-size:11.5px">La cuota vence el día ' + esc(cond.diaVencimiento) +
        ' de cada mes. Después de esa fecha se genera un recargo de ' + esc(cond.tasaMoraMensual) +
        '% mensual sobre el saldo vencido.</p>' +
        '</div></div>');
    }

    return out.join('');
  },

  montar: function (raiz, ctx, redibujar) {
    var sel = raiz.querySelector('#selPortal');
    if (sel) {
      sel.onchange = function () {
        unidadPortal = sel.value;
        location.hash = '#/portal/' + sel.value;
      };
    }
  }
};
