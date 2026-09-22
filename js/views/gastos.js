/* views/gastos.js — los servicios del condominio: cuanto cuesta cada uno,
   quién lo presta, que ya se pagó y que sigue pendiente. */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

CC.vistas.gastos = {
  titulo: 'Gastos y servicios',
  sub: function (ctx) {
    var r = CC.Model.resumen(ctx.periodo);
    return CC.fmt.periodo(ctx.periodo) + ' · ' + CC.fmt.money(r.egresos) + ' en egresos';
  },
  acciones: function () {
    return [{ texto: 'Registrar gasto', icono: 'más', clase: 'btn', accion: 'gasto' }];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var p = ctx.periodo;
    var r = CC.Model.resumen(p);
    var out = [];

    var sobre = r.presupuestoEgresos > 0 ? r.egresos - r.presupuestoEgresos : 0;

    out.push(CC.ui.stats([
      { lab: 'Egresos del mes', val: CC.fmt.money(r.egresos), nota: '<span>' + CC.Store.gastos().filter(function (g) { return g.periodo === p; }).length + ' movimientos</span>' },
      { lab: 'Ya pagados', val: CC.fmt.money(r.egresosPagados), tono: 'good', nota: '<span>salieron de la caja</span>' },
      {
        lab: 'Pendientes de pago', val: CC.fmt.money(r.egresosPendientes),
        tono: r.egresosPendientes > 0 ? 'warn' : 'good',
        nota: '<span>comprometidos, sin salir</span>'
      },
      {
        lab: 'Contra presupuesto',
        val: r.presupuestoEgresos > 0 ? CC.fmt.moneySigno(-sobre) : '—',
        tono: sobre > 0 ? 'crit' : 'good',
        nota: r.presupuestoEgresos > 0
          ? '<span>' + (sobre > 0 ? 'por encima' : 'por debajo') + ' de ' + esc(CC.fmt.money(r.presupuestoEgresos)) + '</span>'
          : '<span>define el presupuesto en Ajustes</span>'
      }
    ]));

    /* --- Presupuesto contra real por categoria --- */
    var cats = CC.Model.porCategoria(p);
    if (cats.length) {
      var filasCat = cats.map(function (c) {
        var dif = c.monto - c.presupuesto;
        var pct = c.presupuesto > 0 ? c.monto / c.presupuesto : 0;
        var tono = c.presupuesto > 0 && pct > 1.05 ? 'crit' : c.presupuesto > 0 && pct > 0.98 ? 'warn' : 'good';
        var color = tono === 'crit' ? 'var(--crit)' : tono === 'warn' ? 'var(--warn)' : 'var(--accent)';
        return '<tr>' +
          '<td class="strong">' + esc(c.categoria) + '</td>' +
          '<td class="r muted">' + (c.presupuesto ? esc(CC.fmt.money2(c.presupuesto)) : '—') + '</td>' +
          '<td class="r strong">' + esc(CC.fmt.money2(c.monto)) + '</td>' +
          '<td style="min-width:110px"><span class="bar__track" style="display:block">' +
          '<span class="bar__fill" style="width:' + Math.min(100, (c.presupuesto ? pct : 1) * 100).toFixed(1) +
          '%;background:' + color + '"></span></span></td>' +
          '<td class="r" style="color:' + (c.presupuesto ? (dif > 0 ? 'var(--crit)' : 'var(--good)') : 'var(--muted)') + '">' +
          (c.presupuesto ? esc(CC.fmt.moneySigno(dif)) : '—') + '</td>' +
          '<td class="r">' + (c.pendiente > 0
            ? '<span class="pill pill--warn">' + esc(CC.fmt.money(c.pendiente)) + ' sin pagar</span>'
            : '<span class="pill pill--good">Cubierto</span>') + '</td>' +
          '</tr>';
      }).join('');

      out.push('<div class="panelbox">' +
        '<div class="panelbox__head"><h3>Presupuesto contra gasto real</h3>' +
        '<span class="eyebrow">' + esc(CC.fmt.periodo(p)) + '</span></div>' +
        '<div class="tablewrap"><table class="ledger">' +
        '<thead><tr><th>Servicio</th><th class="r">Presupuesto</th><th class="r">Real</th>' +
        '<th></th><th class="r">Diferencia</th><th class="r">Estado</th></tr></thead>' +
        '<tbody>' + filasCat + '</tbody>' +
        '<tfoot><tr><td>Totales</td>' +
        '<td class="r">' + esc(CC.fmt.money2(r.presupuestoEgresos)) + '</td>' +
        '<td class="r">' + esc(CC.fmt.money2(r.egresos)) + '</td>' +
        '<td></td><td class="r">' + esc(CC.fmt.moneySigno(r.egresos - r.presupuestoEgresos)) + '</td>' +
        '<td></td></tr></tfoot>' +
        '</table></div></div>');
    }

    /* --- Movimientos del periodo --- */
    var lista = CC.Store.gastos()
      .filter(function (g) { return g.periodo === p; })
      .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });

    out.push('<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Movimientos del periodo</h3></div>' +
      (lista.length
        ? '<div class="tablewrap"><table class="ledger">' +
          '<thead><tr><th>Fecha</th><th>Concepto</th><th>Proveedor</th><th>Folio</th>' +
          '<th class="r">Monto</th><th class="c">Estado</th><th class="noprint"></th></tr></thead><tbody>' +
          lista.map(function (g) {
            var pendiente = g.estado !== 'pagado';
            return '<tr class="' + (pendiente ? 'row--warn' : '') + '">' +
              '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(CC.fmt.fechaCorta(g.fecha)) + '</td>' +
              '<td><div class="cellstack"><span>' + esc(g.concepto) + '</span>' +
              '<small>' + esc(g.categoria) + '</small></div></td>' +
              '<td>' + esc(g.proveedor || '—') + '</td>' +
              '<td class="mono" style="font-size:11.5px;color:var(--muted)">' + esc(g.folio || '—') + '</td>' +
              '<td class="r strong">' + esc(CC.fmt.money2(g.monto)) + '</td>' +
              '<td class="c">' + (pendiente
                ? '<span class="pill pill--warn">Por pagar</span>'
                : '<span class="pill pill--good">Pagado</span>') + '</td>' +
              '<td class="r noprint" style="white-space:nowrap">' +
              (pendiente
                ? '<button class="btn btn--sm btn--soft" data-pagar="' + esc(g.id) + '">Marcar pagado</button> '
                : '') +
              '<button class="iconbtn" data-delgasto="' + esc(g.id) + '" title="Eliminar gasto">' +
              CC.ui.icono('cerrar', 'i--sm') + '</button>' +
              '</td></tr>';
          }).join('') + '</tbody>' +
          '<tfoot><tr><td colspan="4">' + lista.length + ' movimientos</td>' +
          '<td class="r">' + esc(CC.fmt.money2(r.egresos)) + '</td><td colspan="2"></td></tr></tfoot>' +
          '</table></div>'
        : '<div class="empty"><strong>Sin gastos en este periodo</strong>' +
          '<p>Registra los servicios del condominio: vigilancia, limpieza, agua, luz de áreas comunes, elevador.</p>' +
          '<button class="btn" data-accion="gasto" style="margin-top:8px">Registrar el primero</button></div>') +
      '</div>');

    return out.join('');
  },

  montar: function (raiz) {
    raiz.querySelectorAll('[data-pagar]').forEach(function (b) {
      b.onclick = function () {
        CC.Store.actualizarGasto(b.getAttribute('data-pagar'), { estado: 'pagado', metodo: 'Transferencia' });
        CC.ui.toast('Gasto marcado como pagado', 'good');
      };
    });
    raiz.querySelectorAll('[data-delgasto]').forEach(function (b) {
      b.onclick = function () {
        CC.ui.confirmar('Eliminar gasto',
          'El movimiento se borra y el saldo en caja se recalcula.',
          'Eliminar', function () {
            CC.Store.borrarGasto(b.getAttribute('data-delgasto'));
            CC.ui.toast('Gasto eliminado');
          }, true);
      };
    });
  },

  /* ---------- Alta de gasto ---------- */
  gasto: function (ctx) {
    var esc = CC.ui.esc;
    var periodo = ctx.periodo;
    var cats = CC.Store.categorias();

    CC.ui.modal('Registrar gasto',
      '<div class="formgrid">' +
      '<label class="field"><span class="field__lab">Servicio o categoría</span>' +
      '<select class="input" id="gCat">' +
      cats.map(function (c) { return '<option value="' + esc(c.nombre) + '">' + esc(c.nombre) + '</option>'; }).join('') +
      '<option value="__otro">Otro (capturar)</option>' +
      '</select></label>' +

      '<label class="field" id="gOtroWrap" hidden><span class="field__lab">Nombre del servicio</span>' +
      '<input class="input" id="gOtro" placeholder="Fumigación, alberca..."></label>' +

      '<label class="field"><span class="field__lab">Proveedor</span>' +
      '<input class="input" id="gProv" placeholder="Quién presta el servicio"></label>' +

      '<label class="field"><span class="field__lab">Monto</span>' +
      '<input class="input num" id="gMonto" type="number" min="0" step="0.01" placeholder="0.00"></label>' +

      '<label class="field"><span class="field__lab">Fecha</span>' +
      '<input class="input" id="gFecha" type="date" value="' + esc(CC.per.hoyISO()) + '"></label>' +

      '<label class="field"><span class="field__lab">Folio o comprobante</span>' +
      '<input class="input mono" id="gFolio" placeholder="F-0001"></label>' +

      '<label class="field"><span class="field__lab">Estado</span>' +
      '<select class="input" id="gEstado">' +
      '<option value="pagado">Ya se pagó</option>' +
      '<option value="pendiente">Pendiente de pago</option>' +
      '</select></label>' +

      '<label class="field"><span class="field__lab">Método</span>' +
      '<select class="input" id="gMetodo">' +
      ['Transferencia', 'Efectivo', 'Cheque', 'Domiciliación', 'Tarjeta'].map(function (m) {
        return '<option>' + m + '</option>';
      }).join('') + '</select></label>' +
      '</div>' +

      '<label class="field" style="margin-top:14px"><span class="field__lab">Concepto</span>' +
      '<input class="input" id="gConcepto" placeholder="Se completa solo con el servicio y el mes"></label>' +

      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="gCancel">Cancelar</button>' +
      '<button type="button" class="btn" id="gOk">Registrar gasto</button>' +
      '</div>',

      function (cuerpo) {
        var selCat = cuerpo.querySelector('#gCat');
        var otroWrap = cuerpo.querySelector('#gOtroWrap');
        var inProv = cuerpo.querySelector('#gProv');
        var inMonto = cuerpo.querySelector('#gMonto');

        function sincronizar() {
          var esOtro = selCat.value === '__otro';
          otroWrap.hidden = !esOtro;
          if (esOtro) return;
          var c = cats.filter(function (x) { return x.nombre === selCat.value; })[0];
          if (c) {
            if (!inProv.value) inProv.value = c.proveedor || '';
            if (!inMonto.value && c.presupuesto) inMonto.value = c.presupuesto;
          }
        }
        sincronizar();
        selCat.onchange = function () { inProv.value = ''; inMonto.value = ''; sincronizar(); };

        cuerpo.querySelector('#gCancel').onclick = CC.ui.cerrarModal;

        cuerpo.querySelector('#gOk').onclick = function () {
          var categoria = selCat.value === '__otro'
            ? cuerpo.querySelector('#gOtro').value.trim()
            : selCat.value;
          if (!categoria) { CC.ui.toast('Captura el nombre del servicio', 'crit'); return; }

          var monto = Number(inMonto.value);
          if (!(monto > 0)) { CC.ui.toast('Captura un monto mayor a cero', 'crit'); return; }

          var fecha = cuerpo.querySelector('#gFecha').value || CC.per.hoyISO();
          var estado = cuerpo.querySelector('#gEstado').value;
          var concepto = cuerpo.querySelector('#gConcepto').value.trim() ||
            (categoria + ' — ' + CC.fmt.periodo(CC.per.de(fecha)));

          CC.Store.agregarGasto({
            periodo: CC.per.de(fecha),
            fecha: fecha,
            categoria: categoria,
            proveedor: inProv.value.trim(),
            concepto: concepto,
            monto: monto,
            estado: estado,
            metodo: estado === 'pagado' ? cuerpo.querySelector('#gMetodo').value : '',
            folio: cuerpo.querySelector('#gFolio').value.trim()
          });
          CC.ui.cerrarModal();
          CC.ui.toast('Gasto registrado', 'good');
          if (CC.per.de(fecha) !== periodo) {
            CC.ui.toast('Quedó en ' + CC.fmt.periodo(CC.per.de(fecha)) + ', según su fecha');
          }
        };
      });
  }
};
