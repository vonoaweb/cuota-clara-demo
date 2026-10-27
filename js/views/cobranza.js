/* views/cobranza.js — lo que se cobra en el periodo: cuotas generadas,
   pagos recibidos y quien sigue debiendo. */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

CC.vistas.cobranza = {
  titulo: 'Cobranza',
  sub: function (ctx) {
    var r = CC.Model.resumen(ctx.periodo);
    return CC.fmt.periodo(ctx.periodo) + ' · ' + CC.fmt.pct(r.cobranzaPct) + ' cobrado';
  },
  acciones: function (ctx) {
    var faltan = CC.Model.faltanCuota(ctx.periodo).length;
    var lista = [{ texto: 'Registrar pago', icono: 'mas', clase: 'btn', accion: 'pago' }];
    if (faltan > 0) {
      lista.push({
        texto: 'Generar cuotas (' + faltan + ')',
        icono: 'cobranza', clase: 'btn btn--ghost', accion: 'generar'
      });
    }
    return lista;
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var p = ctx.periodo;
    var r = CC.Model.resumen(p);
    var faltan = CC.Model.faltanCuota(p);
    var out = [];

    out.push(CC.ui.stats([
      { lab: 'Esperado del mes', val: CC.fmt.money(r.esperado), nota: '<span>' + r.unidades + ' casas</span>' },
      {
        lab: 'Cobrado', val: CC.fmt.money(r.cobrado),
        tono: r.cobranzaPct >= 0.9 ? 'good' : r.cobranzaPct >= 0.6 ? 'warn' : 'crit',
        nota: '<span>' + esc(CC.fmt.pct(r.cobranzaPct)) + ' de lo esperado</span>'
      },
      {
        lab: 'Por cobrar del mes', val: CC.fmt.money(r.porCobrar),
        tono: r.porCobrar > 0 ? 'warn' : 'good',
        nota: '<span>de este periodo</span>'
      },
      {
        lab: 'Cartera vencida', val: CC.fmt.money(r.carteraVencida),
        tono: r.carteraVencida > 0 ? 'crit' : 'good',
        nota: '<span>acumulada de meses anteriores y este</span>'
      }
    ]));

    if (faltan.length) {
      out.push('<div class="note">' +
        '<div><strong>Faltan ' + faltan.length + ' cuotas por generar</strong> en ' + esc(CC.fmt.periodo(p)) + '. ' +
        'Al generarlas se crea el cargo de cada casa con su vencimiento el día ' +
        esc(CC.Store.condominio().diaVencimiento) + '. ' +
        '<button class="btn btn--sm btn--soft" data-accion="generar" style="margin-left:6px">Generar ahora</button></div>' +
        '</div>');
    }

    /* --- Tabla de cobranza del periodo --- */
    var pagosPeriodo = CC.Store.pagos().filter(function (x) { return x.periodo === p; });
    var pagadoPorUnidad = {};
    pagosPeriodo.forEach(function (x) {
      pagadoPorUnidad[x.unidadId] = (pagadoPorUnidad[x.unidadId] || 0) + (Number(x.monto) || 0);
    });

    var cargosPorUnidad = {};
    CC.Store.cargos().filter(function (c) { return c.periodo === p; }).forEach(function (c) {
      cargosPorUnidad[c.unidadId] = (cargosPorUnidad[c.unidadId] || 0) + (Number(c.monto) || 0);
    });

    var pad = CC.Model.padron(p);
    var filas = pad.map(function (x) {
      var u = x.unidad, s = x.situacion;
      var delMes = cargosPorUnidad[u.id] || 0;
      var pagado = pagadoPorUnidad[u.id] || 0;
      var clase = s.estado === 'moroso' ? 'row--crit' : s.estado === 'vencido' ? 'row--warn' : '';
      // el mes cuenta como pagado si sus cargos quedaron cubiertos, aunque el
      // dinero haya entrado otro mes (anualidad, pago adelantado)
      var pendMes = s.lineas.filter(function (l) { return l.cargo.periodo === p; })
        .reduce(function (a, l) { return a + l.pendiente; }, 0);
      var cubierto = delMes > 0 && pendMes <= 0.005;
      var adelantado = cubierto && pagado < 0.005;

      return '<tr class="' + clase + ' fila-clic" data-casa="' + esc(u.id) + '" title="Ver la casa">' +
        '<td><a href="#/unidad/' + esc(u.id) + '" class="strong">' + esc(u.clave) + '</a>' +
        '<div class="muted" style="font-size:11px">' + esc(u.inquilino || u.propietario || '') + '</div></td>' +
        '<td class="r">' + (delMes ? esc(CC.fmt.money2(delMes)) : '<span class="muted">sin cargo</span>') + '</td>' +
        '<td class="r" style="color:' + (pagado > 0 ? 'var(--good)' : 'var(--muted)') + '">' +
        (pagado ? esc(CC.fmt.money2(pagado)) : '—') + '</td>' +
        '<td class="c">' + (cubierto
          ? '<span class="pill pill--good">' + (adelantado ? 'Adelantado' : 'Pagado') + '</span>'
          : pendMes < delMes - 0.005 ? '<span class="pill pill--warn">Parcial</span>'
            : '<span class="pill pill--mute">Pendiente</span>') + '</td>' +
        '<td class="r ' + (s.saldo > 0.005 ? 'strong' : 'muted') + '">' + esc(CC.fmt.money2(Math.max(0, s.saldo))) + '</td>' +
        '<td class="c">' + CC.ui.pill(s.estado) + '</td>' +
        '<td class="r noprint" style="white-space:nowrap">' +
        '<button class="btn btn--sm btn--soft" data-pago="' + esc(u.id) + '">Pago</button> ' +
        (s.saldo > 0.005
          ? '<button class="btn btn--sm btn--ghost" data-rec="' + esc(u.id) + '" title="Recordatorio de pago">' +
            CC.ui.icono('wa', 'i--sm') + '</button>'
          : '') +
        '</td></tr>';
    }).join('');

    out.push('<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Cobranza de ' + esc(CC.fmt.periodo(p)) + '</h3></div>' +
      '<div class="tablewrap"><table class="ledger">' +
      '<thead><tr><th>Casa</th><th class="r">Cargo del mes</th><th class="r">Pagado</th>' +
      '<th class="c">Mes</th><th class="r">Saldo total</th><th class="c">Estado</th><th></th></tr></thead>' +
      '<tbody>' + filas + '</tbody>' +
      '<tfoot><tr><td>Totales</td>' +
      '<td class="r">' + esc(CC.fmt.money2(r.esperado)) + '</td>' +
      '<td class="r">' + esc(CC.fmt.money2(r.cobrado)) + '</td>' +
      '<td></td>' +
      '<td class="r">' + esc(CC.fmt.money2(pad.reduce(function (a, x) { return a + Math.max(0, x.situacion.saldo); }, 0))) + '</td>' +
      '<td colspan="2"></td></tr></tfoot>' +
      '</table></div></div>');

    /* --- Pagos recibidos --- */
    var recibidos = pagosPeriodo.slice().sort(function (a, b) { return (a.fecha < b.fecha) ? 1 : -1; });
    out.push('<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Pagos recibidos en el periodo</h3>' +
      '<span class="eyebrow">' + recibidos.length + ' movimientos</span></div>' +
      (recibidos.length
        ? '<div class="tablewrap"><table class="ledger">' +
          '<thead><tr><th>Folio</th><th>Fecha</th><th>Casa</th><th>Forma</th><th>Referencia</th>' +
          '<th class="r">Monto</th><th class="noprint"></th></tr></thead><tbody>' +
          recibidos.map(function (x) {
            var u = CC.Store.unidad(x.unidadId);
            return '<tr>' +
              '<td class="mono" style="font-size:12px">' + esc(CC.Comprobantes.folio('P-', x.folio)) + '</td>' +
              '<td class="mono" style="font-size:12px">' + esc(CC.fmt.fechaCorta(x.fecha)) + '</td>' +
              '<td class="strong">' + esc(u ? u.clave : '—') +
              (x.convenioId ? ' <span class="pill pill--flat pill--mute">convenio</span>' : '') + '</td>' +
              '<td><div class="cellstack"><span>' + esc(x.metodo || '—') + '</span><small>' +
              esc(x.cuenta === 'caja' ? 'Caja chica' : 'Banco') + '</small></div></td>' +
              '<td class="mono" style="font-size:12px;color:var(--muted)">' + esc(x.referencia || '—') + '</td>' +
              '<td class="r strong">' + esc(CC.fmt.money2(x.monto)) + '</td>' +
              '<td class="r noprint" style="white-space:nowrap">' +
              '<button class="btn btn--sm btn--soft" data-recpago="' + esc(x.id) + '" title="Descargar recibo en PDF">' +
              CC.ui.icono('imprimir', 'i--sm') + ' Recibo</button> ' +
              '<button class="iconbtn" data-delpago="' + esc(x.id) + '" title="Eliminar pago">' +
              CC.ui.icono('cerrar', 'i--sm') + '</button></td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="empty"><strong>Aún no hay pagos en este periodo</strong>' +
          '<p>Conforme los registres aparecerán aquí, con su metodo y referencia.</p></div>') +
      '</div>');

    return out.join('');
  },

  montar: function (raiz, ctx) {
    var self = this;
    raiz.querySelectorAll('[data-pago]').forEach(function (b) {
      b.onclick = function () { self.formularioPago(b.getAttribute('data-pago'), ctx.periodo); };
    });
    raiz.querySelectorAll('[data-rec]').forEach(function (b) {
      b.onclick = function () { CC.vistas.adeudos.avisarUna(b.getAttribute('data-rec'), ctx.periodo); };
    });
    raiz.querySelectorAll('[data-recpago]').forEach(function (b) {
      b.onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.reciboPago(b.getAttribute('data-recpago'))); };
    });
    raiz.querySelectorAll('[data-delpago]').forEach(function (b) {
      b.onclick = function () {
        CC.ui.confirmar('Eliminar pago',
          'El pago se borra del historial y el saldo de la unidad se recalcula.',
          'Eliminar', function () {
            CC.Store.borrarPago(b.getAttribute('data-delpago'));
            CC.ui.toast('Pago eliminado');
          }, true);
      };
    });
  },

  /* ---------- Acciones ---------- */
  generar: function (ctx) {
    var nuevos = CC.Model.proyectarCuotas(ctx.periodo);
    if (!nuevos.length) { CC.ui.toast('Todas las cuotas del periodo ya estaban generadas'); return; }
    var total = nuevos.reduce(function (a, c) { return a + c.monto; }, 0);
    CC.ui.confirmar('Generar cuotas de ' + CC.fmt.periodo(ctx.periodo),
      'Se crearán ' + nuevos.length + ' cargos por ' + CC.fmt.money2(total) +
      ' en total, con vencimiento el día ' + CC.Store.condominio().diaVencimiento + '.',
      'Generar', function () {
        CC.Store.agregarCargos(nuevos);
        CC.ui.toast(nuevos.length + ' cuotas generadas', 'good');
      });
  },

  pago: function (ctx) { this.formularioPago(null, ctx.periodo); },

  /** Después de registrar un pago: su recibo, para bajarlo o mandarlo al vecino. */
  pagoListo: function (pagoId) {
    var esc = CC.ui.esc;
    var d = CC.Model.datosRecibo(pagoId);
    if (!d) { CC.ui.cerrarModal(); return; }
    var u = d.unidad || {};
    var sd = d.saldoDespues;
    CC.ui.modal('Pago registrado',
      '<div class="listo">' +
      '<span class="listo__monto num">' + esc(CC.fmt.money2(d.pago.monto)) + '</span>' +
      '<span>Casa ' + esc(u.clave) + ' · folio ' + esc(CC.Comprobantes.folio('P-', d.pago.folio)) + '</span>' +
      '<span class="muted">' + (sd > 0.005 ? 'Le quedan ' + esc(CC.fmt.money2(sd)) + ' por pagar'
        : sd < -0.005 ? 'Queda ' + esc(CC.fmt.money2(-sd)) + ' a favor' : 'Queda al corriente') +
      (d.convenio ? ' · convenio ' + d.convenio.pagadas + ' de ' + d.convenio.plan.length : '') + '</span>' +
      '</div>' +
      '<div class="formactions" style="justify-content:center">' +
      '<button type="button" class="btn btn--ghost" id="lPdf">' + CC.ui.icono('imprimir', 'i--sm') + ' Descargar recibo</button>' +
      (u.telefono ? '<button type="button" class="btn btn--ghost" id="lWa">' + CC.ui.icono('wa', 'i--sm') + ' Mandar por WhatsApp</button>' : '') +
      '<button type="button" class="btn" id="lOk">Listo</button>' +
      '</div>',
      function (cuerpo) {
        cuerpo.querySelector('#lOk').onclick = CC.ui.cerrarModal;
        cuerpo.querySelector('#lPdf').onclick = function () {
          CC.Comprobantes.descargar(CC.Comprobantes.reciboPago(pagoId));
        };
        var wa = cuerpo.querySelector('#lWa');
        if (wa) wa.onclick = function () {
          CC.Comprobantes.compartir(CC.Comprobantes.reciboPago(pagoId), CC.Comprobantes.textoReciboPago(pagoId), u.telefono);
        };
      });
  },

  formularioPago: function (unidadId, periodo) {
    var esc = CC.ui.esc;
    var unidades = CC.Store.unidades().slice().sort(CC.Model.ordenCasas);
    if (!unidades.length) { CC.ui.toast('Primero captura al menos una casa', 'crit'); return; }

    var elegida = unidadId || unidades[0].id;
    var sugerido = function (id) {
      var s = CC.Model.situacion(id, periodo);
      return s.saldo > 0.005 ? s.saldo.toFixed(2) : String(CC.Model.cuota(CC.Store.unidad(id)));
    };

    var periodos = CC.Model.periodos().slice(0, 18);
    if (periodos.indexOf(periodo) < 0) periodos.unshift(periodo);

    CC.ui.modal('Registrar pago',
      '<div class="formgrid">' +
      '<label class="field"><span class="field__lab">Casa</span>' +
      '<select class="input" id="pUnidad">' + unidades.map(function (u) {
        return '<option value="' + esc(u.id) + '"' + (u.id === elegida ? ' selected' : '') + '>' +
          esc(u.clave) + ' — ' + esc(u.inquilino || u.propietario || '') + '</option>';
      }).join('') + '</select></label>' +

      '<label class="field"><span class="field__lab">Monto recibido</span>' +
      '<input class="input num" id="pMonto" type="number" min="0" step="0.01" value="' + esc(sugerido(elegida)) + '">' +
      '<span class="field__hint" id="pHint"></span></label>' +

      '<label class="field"><span class="field__lab">Qué paga</span>' +
      '<select class="input" id="pQue"><option value="0">Lo que debe o la cuota del mes</option>' +
      '<option value="3">Adelantar 3 meses</option><option value="6">Adelantar 6 meses</option>' +
      '<option value="12">Anualidad: 12 meses' + (Number(CC.Store.condominio().mesesGratisAnualidad)
        ? ' (' + CC.Store.condominio().mesesGratisAnualidad + ' gratis)' : '') + '</option></select></label>' +

      '<label class="field"><span class="field__lab">Fecha del pago</span>' +
      '<input class="input" id="pFecha" type="date" value="' + esc(CC.per.hoyISO()) + '"></label>' +

      '<label class="field"><span class="field__lab">Periodo que cubre</span>' +
      '<select class="input" id="pPeriodo">' + periodos.map(function (x) {
        return '<option value="' + esc(x) + '"' + (x === periodo ? ' selected' : '') + '>' + esc(CC.fmt.periodo(x)) + '</option>';
      }).join('') + '</select></label>' +

      '<label class="field"><span class="field__lab">Forma de pago</span>' +
      '<select class="input" id="pMetodo">' +
      ['Transferencia', 'Depósito', 'Efectivo', 'Cheque', 'Domiciliación', 'Otra (terminal, CoDi)'].map(function (m) {
        return '<option>' + m + '</option>';
      }).join('') + '</select></label>' +

      '<label class="field"><span class="field__lab">Entra a</span>' +
      '<select class="input" id="pCuenta">' + CC.Store.cuentas().map(function (c) {
        return '<option value="' + esc(c.id) + '">' + esc(c.nombre) + '</option>';
      }).join('') + '</select><span class="field__hint">El efectivo va a la caja chica</span></label>' +

      '<label class="field"><span class="field__lab">Referencia</span>' +
      '<input class="input mono" id="pRef" placeholder="Folio o últimos dígitos"></label>' +
      '</div>' +

      '<div class="mesespago" id="pMeses"></div>' +

      '<label class="check" id="pCvWrap" hidden><input type="checkbox" id="pCv" checked> ' +
      '<span id="pCvTxt"></span></label>' +

      '<label class="field" style="margin-top:14px"><span class="field__lab">Nota (opcional)</span>' +
      '<input class="input" id="pNota" placeholder="Pago parcial acordado con el comité, etc."></label>' +

      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="pCancel">Cancelar</button>' +
      '<button type="button" class="btn" id="pOk">Registrar pago</button>' +
      '</div>',

      function (cuerpo) {
        var selU = cuerpo.querySelector('#pUnidad');
        var inMonto = cuerpo.querySelector('#pMonto');
        var hint = cuerpo.querySelector('#pHint');

        var cvWrap = cuerpo.querySelector('#pCvWrap'), cvTxt = cuerpo.querySelector('#pCvTxt');
        var cvCheck = cuerpo.querySelector('#pCv');
        var cvActual = null;

        function pista() {
          var s = CC.Model.situacion(selU.value, periodo);
          hint.textContent = s.saldo > 0.005
            ? 'Saldo actual de la casa: ' + CC.fmt.money2(s.saldo)
            : 'Esta casa está al corriente';
          // Si la casa tiene convenio, el pago se propone como su siguiente parcialidad
          cvActual = CC.Model.convenioDe(selU.value);
          cvWrap.hidden = !cvActual;
          if (cvActual && cvActual.siguiente) {
            cvTxt.textContent = 'Es abono al convenio: parcialidad ' + cvActual.siguiente.n + ' de ' +
              cvActual.plan.length + ' (' + CC.fmt.money2(cvActual.siguiente.monto) + ')';
          }
        }
        pista();
        if (cvActual && cvActual.siguiente) inMonto.value = cvActual.siguiente.monto.toFixed(2);

        /* Pagos por adelantado: las cuotas de los meses que vienen se crean al registrar */
        var selQue = cuerpo.querySelector('#pQue');
        var adelanto = [];
        function calcularAdelanto() {
          var n = Number(selQue.value) || 0;
          if (!n) { adelanto = []; pista(); return; }
          var gratis = n === 12 ? (Number(CC.Store.condominio().mesesGratisAnualidad) || 0) : 0;
          adelanto = CC.Model.proyectarAdelanto(selU.value, n, gratis);
          var s = CC.Model.situacion(selU.value, periodo);
          var total = adelanto.reduce(function (a, c) { return a + c.monto; }, 0) + Math.max(0, s.saldo);
          inMonto.value = total.toFixed(2);
          hint.textContent = 'Cubre de ' + CC.fmt.periodoCorto(adelanto[0].periodo) + ' a ' +
            CC.fmt.periodoCorto(adelanto[adelanto.length - 1].periodo) +
            (gratis ? ' · ' + gratis + (gratis === 1 ? ' mes gratis' : ' meses gratis') : '') +
            (s.saldo > 0.005 ? ' · incluye lo que debe (' + CC.fmt.money2(s.saldo) + ')' : '');
        }
        selQue.onchange = function () { calcularAdelanto(); pintarMeses(); };

        /* Los meses que debe, para marcar cuáles paga: la suma va al monto */
        var cajaMeses = cuerpo.querySelector('#pMeses');
        function pintarMeses() {
          var meses = Number(selQue.value) ? [] : CC.Model.pendientesPorMes(selU.value, '9999-12');
          if (!meses.length) { cajaMeses.innerHTML = ''; return; }
          cajaMeses.innerHTML = '<span class="field__lab">Meses que paga</span>' +
            '<div class="mesespago__lista">' + meses.map(function (m, i) {
              return '<label class="mesespago__mes"><input type="checkbox" data-mes="' + i + '" data-monto="' + m.total.toFixed(2) + '" checked>' +
                '<span>' + esc(CC.fmt.periodo(m.periodo)) + '</span><b class="num">' + esc(CC.fmt.money2(m.total)) + '</b>' +
                (m.partes.length > 1 ? '<small>' + esc(m.partes.map(function (x) { return x.etiqueta; }).join(' + ')) + '</small>' : '') +
                '</label>';
            }).join('') + '</div><span class="field__hint" id="pMesesHint"></span>';
          cajaMeses.querySelectorAll('[data-mes]').forEach(function (cb) { cb.onchange = sumarMeses; });
        }
        function sumarMeses() {
          var cbs = Array.prototype.slice.call(cajaMeses.querySelectorAll('[data-mes]'));
          var total = cbs.reduce(function (a, cb) { return a + (cb.checked ? Number(cb.getAttribute('data-monto')) : 0); }, 0);
          inMonto.value = total.toFixed(2);
          // El pago se aplica a lo más viejo: si dejan un mes viejo sin marcar, se avisa
          var saltado = false, visto = false;
          cbs.forEach(function (cb) { if (cb.checked) visto = true; else if (!visto) saltado = true; });
          var conAlgo = cbs.some(function (cb) { return cb.checked; });
          cajaMeses.querySelector('#pMesesHint').textContent = saltado && conAlgo
            ? 'Ojo: el pago se aplica primero al mes más viejo que debe, aunque no lo marques.' : '';
        }
        pintarMeses();

        /* El efectivo entra a la caja chica; lo demás, al banco */
        var selMetodo = cuerpo.querySelector('#pMetodo'), selCuenta = cuerpo.querySelector('#pCuenta');
        selMetodo.onchange = function () { selCuenta.value = selMetodo.value === 'Efectivo' ? 'caja' : 'banco'; };

        selU.onchange = function () {
          inMonto.value = sugerido(selU.value);
          pista();
          if (cvActual && cvActual.siguiente) inMonto.value = cvActual.siguiente.monto.toFixed(2);
          if (Number(selQue.value)) calcularAdelanto();
          pintarMeses();
        };
        cuerpo.querySelector('#pCancel').onclick = CC.ui.cerrarModal;

        cuerpo.querySelector('#pOk').onclick = function () {
          var monto = Number(inMonto.value);
          if (!(monto > 0)) { CC.ui.toast('Captura un monto mayor a cero', 'crit'); return; }
          if (adelanto.length) CC.Store.agregarCargos(adelanto.map(function (c) { return Object.assign({}, c); }));
          var nAd = Number(selQue.value) || 0;
          var notaAd = nAd && adelanto.length
            ? (nAd === 12 ? 'Anualidad ' : 'Pago adelantado ') + CC.fmt.periodoCorto(adelanto[0].periodo) + ' – ' +
              CC.fmt.periodoCorto(adelanto[adelanto.length - 1].periodo)
            : '';
          var pago = CC.Store.agregarPago({
            unidadId: selU.value,
            monto: monto,
            fecha: cuerpo.querySelector('#pFecha').value || CC.per.hoyISO(),
            periodo: cuerpo.querySelector('#pPeriodo').value,
            metodo: cuerpo.querySelector('#pMetodo').value,
            cuenta: selCuenta.value,
            referencia: cuerpo.querySelector('#pRef').value.trim(),
            convenioId: cvActual && cvCheck.checked ? cvActual.convenio.id : null,
            nota: cuerpo.querySelector('#pNota').value.trim() || notaAd
          });
          CC.vistas.cobranza.pagoListo(pago.id);
        };
      });
  }
};
