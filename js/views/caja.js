/* views/caja.js — banco y caja chica: dónde está el dinero del condominio.
 *
 * Como lo lleva la administración de Mallorca: lo que se cobra en efectivo
 * entra a la caja chica y de ahí salen los gastos menores; lo que sobra se
 * deposita al banco con un traspaso. Cada cuenta tiene su saldo en el momento,
 * que es lo que se compara contra el banco y contra el efectivo contado.
 *
 * La conciliación lee el estado de cuenta que baja el banco (Excel o CSV) y lo
 * empareja con lo capturado: dice qué cuadra, qué está en el banco y falta
 * capturar, y qué está capturado y no aparece en el banco.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var cuentaVista = 'banco';
var ultimaConciliacion = null;

function folioT(t) { return 'T-' + String(t.folio || 0).padStart(4, '0'); }
function folioI(i) { return 'I-' + String(i.folio || 0).padStart(4, '0'); }

/** Traspaso entre cuentas: el depósito del efectivo al banco, o sacar efectivo para la caja. */
function formularioTraspaso(traspaso) {
  var esc = CC.ui.esc;
  var t = traspaso || {};
  var nuevo = !traspaso;
  var saldoCaja = CC.Model.saldoCuenta('caja');
  CC.ui.modal(nuevo ? 'Traspaso entre cuentas' : 'Corregir traspaso ' + folioT(t),
    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">De</span><select class="input" id="tDe">' +
    CC.Store.cuentas().map(function (c) {
      return '<option value="' + esc(c.id) + '"' + ((t.de || 'caja') === c.id ? ' selected' : '') + '>' + esc(c.nombre) + '</option>';
    }).join('') + '</select></label>' +
    '<label class="field"><span class="field__lab">A</span><select class="input" id="tA">' +
    CC.Store.cuentas().map(function (c) {
      return '<option value="' + esc(c.id) + '"' + ((t.a || 'banco') === c.id ? ' selected' : '') + '>' + esc(c.nombre) + '</option>';
    }).join('') + '</select></label>' +
    '<label class="field"><span class="field__lab">Monto</span>' +
    '<input class="input num" id="tMonto" type="number" min="0" step="0.01" value="' + esc(nuevo ? saldoCaja.toFixed(2) : t.monto) + '">' +
    '<span class="field__hint">' + (nuevo ? 'En caja chica hay ' + esc(CC.fmt.money2(saldoCaja)) : '') + '</span></label>' +
    '<label class="field"><span class="field__lab">Fecha</span>' +
    '<input class="input" id="tFecha" type="date" value="' + esc(t.fecha || CC.per.hoyISO()) + '"></label>' +
    '<label class="field"><span class="field__lab">Ficha de depósito o referencia</span>' +
    '<input class="input mono" id="tRef" value="' + esc(t.referencia || '') + '" placeholder="Folio de la ficha"></label>' +
    '</div>' +
    '<label class="field" style="margin-top:14px"><span class="field__lab">Nota</span>' +
    '<input class="input" id="tNota" value="' + esc(t.nota || '') + '" placeholder="Depósito del efectivo de la semana"></label>' +
    '<div class="formactions">' +
    (!nuevo && !t.cancelado ? '<button type="button" class="btn btn--ghost" id="tCancelar" style="margin-right:auto">Cancelar traspaso</button>' : '') +
    (!nuevo ? '<button type="button" class="btn btn--ghost" id="tPdf">' + CC.ui.icono('imprimir', 'i--sm') + ' Póliza</button>' : '') +
    '<button type="button" class="btn btn--ghost" id="tCerrar">Cerrar</button>' +
    '<button type="button" class="btn" id="tOk">' + (nuevo ? 'Hacer traspaso' : 'Guardar cambios') + '</button></div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      q('tCerrar').onclick = CC.ui.cerrarModal;
      if (q('tPdf')) q('tPdf').onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.polizaTraspaso(t.id)); };
      if (q('tCancelar')) q('tCancelar').onclick = function () {
        CC.ui.confirmar('Cancelar traspaso ' + folioT(t), 'El dinero vuelve a contar en la cuenta de origen. El folio queda a la vista.',
          'Cancelar traspaso', function () { CC.Store.cancelarTraspaso(t.id); CC.ui.toast('Traspaso cancelado'); }, true);
      };
      q('tOk').onclick = function () {
        var de = q('tDe').value, a = q('tA').value, monto = Number(q('tMonto').value);
        if (de === a) { CC.ui.toast('Elige dos cuentas distintas', 'crit'); return; }
        if (!(monto > 0)) { CC.ui.toast('Captura un monto mayor a cero', 'crit'); return; }
        var datos = { de: de, a: a, monto: monto, fecha: q('tFecha').value || CC.per.hoyISO(), referencia: q('tRef').value.trim(), nota: q('tNota').value.trim() };
        var res = nuevo ? CC.Store.agregarTraspaso(datos) : CC.Store.editarTraspaso(t.id, datos);
        CC.ui.cerrarModal();
        CC.ui.toast((nuevo ? 'Traspaso ' : 'Cambios guardados en ') + folioT(res), 'good');
      };
    });
}

/** Un ingreso que no es cuota: una tarjeta de acceso, una multa en efectivo. Sale su recibo. */
function formularioIngreso() {
  var esc = CC.ui.esc;
  var casas = CC.Store.unidades().slice().sort(CC.Model.ordenCasas);
  var conceptos = ['Venta de tarjeta de acceso', 'Renta de área común', 'Multa', 'Reposición de llave o control', 'Intereses del banco', 'Otro'];
  CC.ui.modal('Otro ingreso — folio I-' + String((CC.Store.estado().meta.folioIngreso || 0) + 1).padStart(4, '0') + ' (automático)',
    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">Concepto</span><input class="input" id="iConcepto" list="listaIng" placeholder="Venta de tarjeta de acceso">' +
    '<datalist id="listaIng">' + conceptos.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></label>' +
    '<label class="field"><span class="field__lab">Quién entrega</span><input class="input" id="iNombre" placeholder="Nombre"></label>' +
    '<label class="field"><span class="field__lab">Casa (opcional)</span><select class="input" id="iCasa"><option value="">No es de una casa</option>' +
    casas.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.clave) + ' — ' + esc(u.propietario) + '</option>'; }).join('') + '</select></label>' +
    '<label class="field"><span class="field__lab">Monto</span><input class="input num" id="iMonto" type="number" min="0" step="0.01"></label>' +
    '<label class="field"><span class="field__lab">Fecha</span><input class="input" id="iFecha" type="date" value="' + esc(CC.per.hoyISO()) + '"></label>' +
    '<label class="field"><span class="field__lab">Forma</span><select class="input" id="iForma">' +
    FORMAS_PAGO.map(function (f) { return '<option>' + f + '</option>'; }).join('') + '</select></label>' +
    '<label class="field"><span class="field__lab">Entra a</span><select class="input" id="iCuenta">' +
    CC.Store.cuentas().map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === 'caja' ? ' selected' : '') + '>' + esc(c.nombre) + '</option>'; }).join('') +
    '</select></label>' +
    '<label class="field"><span class="field__lab">Referencia</span><input class="input mono" id="iRef"></label>' +
    '</div>' +
    '<div class="formactions"><button type="button" class="btn btn--ghost" id="iCerrar">Cerrar</button>' +
    '<button type="button" class="btn" id="iOk">Guardar y descargar recibo</button></div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      q('iForma').onchange = function () { q('iCuenta').value = q('iForma').value === 'Efectivo' ? 'caja' : 'banco'; };
      q('iCasa').onchange = function () {
        var u = CC.Store.unidad(q('iCasa').value);
        if (u && !q('iNombre').value) q('iNombre').value = u.propietario || '';
      };
      q('iCerrar').onclick = CC.ui.cerrarModal;
      q('iOk').onclick = function () {
        var concepto = q('iConcepto').value.trim(), monto = Number(q('iMonto').value);
        if (!concepto) { CC.ui.toast('Falta el concepto', 'crit'); return; }
        if (!(monto > 0)) { CC.ui.toast('Captura un monto mayor a cero', 'crit'); return; }
        var i = CC.Store.agregarIngreso({
          fecha: q('iFecha').value || CC.per.hoyISO(), concepto: concepto, nombre: q('iNombre').value.trim(),
          unidadId: q('iCasa').value || null, monto: monto, metodo: q('iForma').value, cuenta: q('iCuenta').value,
          referencia: q('iRef').value.trim(), categoria: concepto
        });
        CC.ui.cerrarModal();
        CC.Comprobantes.descargar(CC.Comprobantes.reciboIngreso(i.id), true);
        CC.ui.toast('Ingreso ' + folioI(i) + ' registrado; recibo descargado', 'good');
      };
    });
}

/** Contar el efectivo y compararlo con lo que el sistema dice que debe haber. */
function formularioArqueo() {
  var esc = CC.ui.esc;
  var debe = CC.Model.saldoCuenta('caja');
  CC.ui.modal('Arqueo de caja chica',
    '<div class="listo"><span class="muted">Según lo capturado, en la caja debe haber</span>' +
    '<span class="listo__monto num" style="color:var(--ink)">' + esc(CC.fmt.money2(debe)) + '</span></div>' +
    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">Lo que se contó</span><input class="input num" id="aContado" type="number" min="0" step="0.01"></label>' +
    '<label class="field"><span class="field__lab">Quién contó</span><input class="input" id="aQuien" value="' +
    esc(CC.Sesion.usuario() ? CC.Sesion.usuario().nombre : '') + '" placeholder="Tesorero, administración…"></label>' +
    '</div>' +
    '<p class="arqueo__dif" id="aDif"></p>' +
    '<label class="field"><span class="field__lab">Nota</span><input class="input" id="aNota" placeholder="Faltan por capturar los recibos del 22"></label>' +
    '<div class="formactions"><button type="button" class="btn btn--ghost" id="aCerrar">Cerrar</button>' +
    '<button type="button" class="btn" id="aOk">Guardar arqueo</button></div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      q('aContado').oninput = function () {
        var dif = (Number(q('aContado').value) || 0) - debe;
        q('aDif').innerHTML = Math.abs(dif) < 0.005 ? '<span style="color:var(--good)">Cuadra al centavo.</span>'
          : dif < 0 ? '<span style="color:var(--crit)">Faltan ' + esc(CC.fmt.money2(-dif)) + '.</span> Revisa si hay recibos sin capturar.'
            : '<span style="color:var(--warn)">Sobran ' + esc(CC.fmt.money2(dif)) + '.</span> Puede faltar capturar un cobro en efectivo.';
      };
      q('aCerrar').onclick = CC.ui.cerrarModal;
      q('aOk').onclick = function () {
        if (q('aContado').value === '') { CC.ui.toast('Captura lo que se contó', 'crit'); return; }
        var contado = Number(q('aContado').value) || 0;
        CC.Store.agregarArqueo({
          fecha: CC.per.hoyISO(), esperado: debe, contado: contado,
          diferencia: Math.round((contado - debe) * 100) / 100, quien: q('aQuien').value.trim(), nota: q('aNota').value.trim()
        });
        CC.ui.cerrarModal();
        CC.ui.toast('Arqueo guardado', 'good');
      };
    });
}

function formularioSaldos() {
  var esc = CC.ui.esc;
  CC.ui.modal('Saldos iniciales',
    '<p class="field__hint" style="margin-bottom:12px">Lo que había en cada cuenta el día que empezaron a usar el sistema ' +
    '(el saldo del banco y el efectivo de la caja que traían de CondoVive). A partir de ahí, el sistema suma y resta solo.</p>' +
    '<div class="formgrid">' + CC.Store.cuentas().map(function (c) {
      return '<label class="field"><span class="field__lab">' + esc(c.nombre) + '</span>' +
        '<input class="input num" type="number" step="0.01" data-cuenta="' + esc(c.id) + '" value="' + esc(c.saldoInicial || 0) + '"></label>';
    }).join('') + '</div>' +
    '<div class="formactions"><button type="button" class="btn btn--ghost" id="sCerrar">Cerrar</button>' +
    '<button type="button" class="btn" id="sOk">Guardar</button></div>',
    function (cuerpo) {
      cuerpo.querySelector('#sCerrar').onclick = CC.ui.cerrarModal;
      cuerpo.querySelector('#sOk').onclick = function () {
        cuerpo.querySelectorAll('[data-cuenta]').forEach(function (inp) {
          CC.Store.actualizarCuenta(inp.getAttribute('data-cuenta'), { saldoInicial: Number(inp.value) || 0 });
        });
        CC.ui.cerrarModal();
        CC.ui.toast('Saldos iniciales guardados', 'good');
      };
    });
}

/* ---------- Conciliación con el estado de cuenta del banco ---------- */

function conciliacion() {
  var esc = CC.ui.esc;
  CC.ui.modal('Conciliar con el banco',
    '<p class="field__hint" style="margin-bottom:12px">Descarga de la banca en línea los movimientos del mes en ' +
    '<strong>Excel o CSV</strong> y súbelos aquí. El sistema los compara con lo capturado.</p>' +
    '<label class="dropfoto" for="cArchivo">' + CC.ui.icono('reportes') + '<span>Elegir el archivo del banco</span>' +
    '<small>.xlsx o .csv</small></label><input type="file" id="cArchivo" accept=".xlsx,.csv,.txt" hidden>' +
    '<div id="cPaso2"></div>',
    function (cuerpo) {
      var entrada = cuerpo.querySelector('#cArchivo');
      entrada.onchange = function () {
        var f = entrada.files && entrada.files[0];
        if (!f) return;
        CC.Importar.leer(f).then(function (filas) { columnas(cuerpo, filas, f.name); },
          function (err) { CC.ui.toast(err.message || 'No se pudo leer el archivo', 'crit'); });
      };
    });

  function columnas(cuerpo, filas, nombre) {
    var det = CC.Importar.detectarColumnas(filas);
    var enc = det.encabezados.length ? det.encabezados : (filas[0] || []).map(function (x, i) { return 'Columna ' + (i + 1); });
    var campos = [['fecha', 'Fecha'], ['concepto', 'Concepto'], ['cargo', 'Cargos (salidas)'], ['abono', 'Abonos (entradas)'],
      ['monto', 'Importe con signo'], ['saldo', 'Saldo'], ['referencia', 'Referencia']];
    var sel = function (k) {
      return '<select class="input input--sm" data-col="' + k + '"><option value="">—</option>' + enc.map(function (h, i) {
        return '<option value="' + i + '"' + (det.cols[k] === i ? ' selected' : '') + '>' + esc(h || 'Columna ' + (i + 1)) + '</option>';
      }).join('') + '</select>';
    };
    cuerpo.querySelector('#cPaso2').innerHTML =
      '<p style="margin:14px 0 8px;font-size:13px"><strong>' + esc(nombre) + '</strong> · ' + filas.length + ' renglones. ' +
      'Revisa qué columna es cada cosa:</p>' +
      '<div class="formgrid">' + campos.map(function (c) {
        return '<label class="field"><span class="field__lab">' + esc(c[1]) + '</span>' + sel(c[0]) + '</label>';
      }).join('') + '</div>' +
      '<label class="field" style="margin-top:12px"><span class="field__lab">Empieza en el renglón</span>' +
      '<input class="input input--sm num" id="cInicio" type="number" min="1" value="' + (det.inicio + 1) + '" style="max-width:110px"></label>' +
      '<div class="formactions"><button type="button" class="btn" id="cComparar">Comparar con lo capturado</button></div>';
    cuerpo.querySelector('#cComparar').onclick = function () {
      var cols = {};
      cuerpo.querySelectorAll('[data-col]').forEach(function (s) { if (s.value !== '') cols[s.getAttribute('data-col')] = Number(s.value); });
      if (cols.fecha === undefined || (cols.cargo === undefined && cols.abono === undefined && cols.monto === undefined)) {
        CC.ui.toast('Indica al menos la fecha y los cargos/abonos o el importe', 'crit');
        return;
      }
      var banco = CC.Importar.movimientos(filas, cols, Math.max(0, Number(cuerpo.querySelector('#cInicio').value) - 1));
      if (!banco.length) { CC.ui.toast('No encontré movimientos con fecha y monto en ese archivo', 'crit'); return; }
      var desde = banco.reduce(function (a, b) { return b.fecha < a ? b.fecha : a; }, banco[0].fecha);
      var hasta = banco.reduce(function (a, b) { return b.fecha > a ? b.fecha : a; }, banco[0].fecha);
      var sistema = CC.Model.movimientosCuenta('banco').filter(function (m) {
        return m.fecha >= CC.per.masDias(desde, -3) && m.fecha <= CC.per.masDias(hasta, 3);
      });
      var r = CC.Importar.conciliar(banco, sistema, 3);
      // se buscó con unos días de margen, pero solo se reporta lo que cae dentro del archivo
      r.soloSistema = r.soloSistema.filter(function (m) { return m.fecha >= desde && m.fecha <= hasta; });
      var saldoBanco = null;
      banco.slice().sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.fila - b.fila; })
        .forEach(function (b) { if (b.saldo !== null) saldoBanco = b.saldo; });
      ultimaConciliacion = { r: r, desde: desde, hasta: hasta, saldoBanco: saldoBanco, saldoSistema: CC.Model.saldoCuenta('banco', hasta), archivo: nombre };
      resultado();
    };
  }
}

function resultado() {
  var esc = CC.ui.esc;
  var c = ultimaConciliacion;
  if (!c) return;
  var dif = c.saldoBanco === null ? null : Math.round((c.saldoBanco - c.saldoSistema) * 100) / 100;
  var fila = function (m, accion) {
    return '<tr><td class="mono" style="font-size:12px">' + esc(CC.fmt.fechaCorta(m.fecha)) + '</td>' +
      '<td>' + esc(m.concepto || '') + (m.referencia ? ' <span class="muted mono" style="font-size:11px">' + esc(m.referencia) + '</span>' : '') + '</td>' +
      '<td class="r strong" style="color:' + (m.monto > 0 || m.entra > 0 ? 'var(--good)' : 'var(--crit)') + '">' +
      esc(CC.fmt.money2(m.monto !== undefined ? m.monto : m.entra - m.sale)) + '</td><td class="r">' + (accion || '') + '</td></tr>';
  };
  CC.ui.modal('Conciliación del ' + CC.fmt.fecha(c.desde) + ' al ' + CC.fmt.fecha(c.hasta),
    CC.ui.stats([
      { lab: 'Cuadran', val: String(c.r.pares.length), tono: 'good', nota: '<span>movimientos iguales en los dos</span>' },
      { lab: 'Faltan en el sistema', val: String(c.r.soloBanco.length), tono: c.r.soloBanco.length ? 'warn' : 'good', nota: '<span>están en el banco</span>' },
      { lab: 'No están en el banco', val: String(c.r.soloSistema.length), tono: c.r.soloSistema.length ? 'warn' : 'good', nota: '<span>capturados, sin reflejarse</span>' },
      dif === null
        ? { lab: 'Saldo', val: CC.fmt.money2(c.saldoSistema), nota: '<span>el archivo no trae saldo</span>' }
        : { lab: 'Diferencia de saldo', val: CC.fmt.money2(dif), tono: Math.abs(dif) < 0.01 ? 'good' : 'crit',
            nota: '<span>banco ' + esc(CC.fmt.money2(c.saldoBanco)) + ' · sistema ' + esc(CC.fmt.money2(c.saldoSistema)) + '</span>' }
    ]) +
    (c.r.soloBanco.length
      ? '<h4 class="conc__tit">En el banco y no en el sistema</h4><p class="field__hint">Comisiones, depósitos sin identificar o pagos que faltó capturar.</p>' +
        '<div class="tablewrap"><table class="ledger"><tbody>' + c.r.soloBanco.map(function (m, i) {
          return fila(m, '<button class="btn btn--sm btn--soft" data-capturar="' + i + '">Capturar</button>');
        }).join('') + '</tbody></table></div>' : '') +
    (c.r.soloSistema.length
      ? '<h4 class="conc__tit">Capturado y no aparece en el banco</h4><p class="field__hint">Un cheque que no se ha cobrado, un depósito en tránsito o un error de captura.</p>' +
        '<div class="tablewrap"><table class="ledger"><tbody>' + c.r.soloSistema.map(function (m) {
          return fila({ fecha: m.fecha, concepto: m.folio + ' · ' + m.concepto, referencia: m.referencia, monto: m.entra - m.sale });
        }).join('') + '</tbody></table></div>' : '') +
    (!c.r.soloBanco.length && !c.r.soloSistema.length ? '<div class="note" style="margin-top:14px"><div><strong>Todo cuadra.</strong> Cada movimiento del banco está capturado.</div></div>' : '') +
    '<div class="formactions"><button type="button" class="btn btn--ghost" id="rExcel">Descargar para Excel</button>' +
    '<button type="button" class="btn" id="rOk">Listo</button></div>',
    function (cuerpo) {
      cuerpo.querySelector('#rOk').onclick = CC.ui.cerrarModal;
      cuerpo.querySelector('#rExcel').onclick = function () {
        var filas = [];
        c.r.pares.forEach(function (p) { filas.push(['Cuadra', p.banco.fecha, p.banco.concepto, p.banco.monto, p.sistema.folio, p.sistema.concepto]); });
        c.r.soloBanco.forEach(function (m) { filas.push(['Falta en el sistema', m.fecha, m.concepto, m.monto, '', '']); });
        c.r.soloSistema.forEach(function (m) { filas.push(['No está en el banco', m.fecha, '', m.entra - m.sale, m.folio, m.concepto]); });
        CC.ui.descargarCSV('Conciliacion ' + c.desde + ' a ' + c.hasta, ['Resultado', 'Fecha', 'Concepto del banco', 'Monto', 'Folio', 'Concepto del sistema'], filas);
      };
      cuerpo.querySelectorAll('[data-capturar]').forEach(function (b) {
        b.onclick = function () {
          var m = c.r.soloBanco[Number(b.getAttribute('data-capturar'))];
          if (m.monto < 0) {
            CC.vistas.gastos.gasto();
            var d = document.getElementById('modalBody');
            d.querySelector('#eConcepto').value = m.concepto || 'Movimiento del banco';
            d.querySelector('#eMonto').value = Math.abs(m.monto).toFixed(2);
            d.querySelector('#eFecha').value = m.fecha;
            d.querySelector('#eRef').value = m.referencia || '';
            if (/comisi/i.test(m.concepto)) {
              var op = Array.prototype.filter.call(d.querySelectorAll('#eCat option'), function (o) { return /comisi/i.test(o.value); })[0];
              if (op) d.querySelector('#eCat').value = op.value;
            }
          } else {
            CC.vistas.cobranza.formularioPago(null, CC.per.de(m.fecha));
            var d2 = document.getElementById('modalBody');
            d2.querySelector('#pMonto').value = m.monto.toFixed(2);
            d2.querySelector('#pFecha').value = m.fecha;
            d2.querySelector('#pRef').value = m.referencia || '';
          }
        };
      });
    });
}

CC.vistas.caja = {
  titulo: 'Banco y caja chica',
  sub: function () {
    return 'Banco ' + CC.fmt.money2(CC.Model.saldoCuenta('banco')) + ' · caja chica ' + CC.fmt.money2(CC.Model.saldoCuenta('caja'));
  },
  acciones: function () {
    return [
      { texto: 'Traspaso', icono: 'gastos', clase: 'btn', accion: 'traspaso' },
      { texto: 'Conciliar con el banco', icono: 'reportes', clase: 'btn btn--ghost', accion: 'conciliar' },
      { texto: 'Arqueo de caja', icono: 'caja', clase: 'btn btn--ghost', accion: 'arqueo' },
      { texto: 'Otro ingreso', icono: 'mas', clase: 'btn btn--ghost', accion: 'ingreso' }
    ];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var p = ctx.periodo;
    var out = [];
    var cuentas = CC.Store.cuentas();

    out.push('<div class="cuentas">' + cuentas.map(function (c) {
      var e = CC.Model.estadoCuentaBanco(c.id, p);
      return '<button class="cuenta' + (cuentaVista === c.id ? ' is-on' : '') + '" data-vercuenta="' + esc(c.id) + '">' +
        '<span class="cuenta__nom">' + esc(c.nombre) + '</span>' +
        '<strong class="num">' + esc(CC.fmt.money2(CC.Model.saldoCuenta(c.id))) + '</strong>' +
        '<span class="cuenta__det">' + (c.id === 'caja' ? 'debe haber hoy en efectivo' : 'debe decir el banco hoy') + '</span>' +
        '<span class="cuenta__mes">' + esc(CC.fmt.periodo(p)) + ': entró <b style="color:var(--good)">' + esc(CC.fmt.money(e.entradas)) +
        '</b> · salió <b style="color:var(--crit)">' + esc(CC.fmt.money(e.salidas)) + '</b></span></button>';
    }).join('') + '</div>');

    var c = CC.Store.cuenta(cuentaVista) || cuentas[0];
    var e = CC.Model.estadoCuentaBanco(c.id, p);
    var filas = e.filas.map(function (m) {
      var accion = m.tipo === 'traspaso' ? '<button class="btn btn--sm btn--ghost" data-tras="' + esc(m.id) + '">Editar</button>'
        : m.tipo === 'egreso' ? '<button class="btn btn--sm btn--ghost" data-egreso="' + esc(m.id) + '">Corregir</button>'
          : m.tipo === 'ingreso' ? '<button class="btn btn--sm btn--ghost" data-ing="' + esc(m.id) + '">Recibo</button>'
            : '<button class="btn btn--sm btn--ghost" data-pago="' + esc(m.id) + '">Recibo</button>';
      return '<tr' + (m.tipo === 'traspaso' ? ' class="row--traspaso"' : '') + '>' +
        '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(CC.fmt.fechaCorta(m.fecha)) + '</td>' +
        '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(m.folio) + '</td>' +
        '<td><div class="cellstack"><span>' + esc(m.concepto) + '</span>' +
        (m.categoria || m.referencia ? '<small>' + esc([m.categoria, m.referencia].filter(Boolean).join(' · ')) + '</small>' : '') + '</div></td>' +
        '<td class="r" style="color:var(--good)">' + (m.entra ? esc(CC.fmt.money2(m.entra)) : '') + '</td>' +
        '<td class="r" style="color:var(--crit)">' + (m.sale ? esc(CC.fmt.money2(m.sale)) : '') + '</td>' +
        '<td class="r strong">' + esc(CC.fmt.money2(m.saldo)) + '</td>' +
        '<td class="r noprint">' + accion + '</td></tr>';
    }).join('');

    out.push('<div class="panelbox"><div class="panelbox__head"><h3>' + esc(c.nombre) + ' · ' + esc(CC.fmt.periodo(p)) + '</h3>' +
      '<div class="chips noprint"><button class="chip" data-accion="exportar">Exportar a Excel</button>' +
      '<button class="chip" data-accion="saldos">Saldos iniciales</button></div></div>' +
      '<div class="tablewrap"><table class="ledger"><thead><tr><th>Fecha</th><th>Folio</th><th>Concepto</th>' +
      '<th class="r">Entra</th><th class="r">Sale</th><th class="r">Saldo</th><th class="noprint"></th></tr></thead><tbody>' +
      '<tr class="ledger__grupo"><td colspan="5">Saldo al empezar el mes</td><td class="r">' + esc(CC.fmt.money2(e.inicial)) + '</td><td></td></tr>' +
      (filas || '<tr><td colspan="7"><div class="empty"><strong>Sin movimientos este mes</strong></div></td></tr>') +
      '</tbody><tfoot><tr><td colspan="3">Saldo al cerrar el mes</td><td class="r">' + esc(CC.fmt.money2(e.entradas)) +
      '</td><td class="r">' + esc(CC.fmt.money2(e.salidas)) + '</td><td class="r">' + esc(CC.fmt.money2(e.final)) + '</td><td></td></tr></tfoot>' +
      '</table></div></div>');

    if (c.id === 'caja') {
      var arq = CC.Store.arqueos().slice(0, 5);
      out.push('<div class="panelbox"><div class="panelbox__head"><h3>Arqueos de caja</h3>' +
        '<button class="btn btn--sm btn--soft" data-accion="arqueo">Hacer arqueo</button></div>' +
        (arq.length ? '<div class="tablewrap"><table class="ledger"><thead><tr><th>Fecha</th><th>Quién</th><th class="r">Debía haber</th>' +
          '<th class="r">Se contó</th><th class="r">Diferencia</th><th>Nota</th></tr></thead><tbody>' + arq.map(function (a) {
            return '<tr><td class="mono" style="font-size:12px">' + esc(CC.fmt.fechaCorta(a.fecha)) + '</td><td>' + esc(a.quien || '—') + '</td>' +
              '<td class="r">' + esc(CC.fmt.money2(a.esperado)) + '</td><td class="r">' + esc(CC.fmt.money2(a.contado)) + '</td>' +
              '<td class="r strong" style="color:' + (Math.abs(a.diferencia) < 0.01 ? 'var(--good)' : 'var(--crit)') + '">' +
              esc(Math.abs(a.diferencia) < 0.01 ? 'Cuadra' : CC.fmt.money2(a.diferencia)) + '</td><td class="muted">' + esc(a.nota || '') + '</td></tr>';
          }).join('') + '</tbody></table></div>'
          : '<div class="empty"><strong>Sin arqueos</strong><p>Cuando alguien cuente el efectivo, captúralo aquí: el sistema dice si cuadra.</p></div>') +
        '</div>');
    } else if (ultimaConciliacion) {
      out.push('<div class="note"><div>Última conciliación: ' + esc(ultimaConciliacion.archivo) + ' — ' +
        ultimaConciliacion.r.pares.length + ' cuadran, ' + ultimaConciliacion.r.soloBanco.length + ' faltan en el sistema. ' +
        '<button type="button" class="btn btn--sm btn--ghost" data-accion="verConciliacion">Ver el resultado</button></div></div>');
    }

    return out.join('');
  },

  montar: function (raiz, ctx, redibujar) {
    raiz.querySelectorAll('[data-vercuenta]').forEach(function (b) {
      b.onclick = function () { cuentaVista = b.getAttribute('data-vercuenta'); redibujar(); };
    });
    raiz.querySelectorAll('[data-tras]').forEach(function (b) {
      b.onclick = function () { formularioTraspaso(CC.Store.traspaso(b.getAttribute('data-tras'))); };
    });
    raiz.querySelectorAll('[data-egreso]').forEach(function (b) {
      b.onclick = function () { CC.vistas.gastos.editar(b.getAttribute('data-egreso')); };
    });
    raiz.querySelectorAll('[data-ing]').forEach(function (b) {
      b.onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.reciboIngreso(b.getAttribute('data-ing'))); };
    });
    raiz.querySelectorAll('[data-pago]').forEach(function (b) {
      b.onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.reciboPago(b.getAttribute('data-pago'))); };
    });
  },

  traspaso: function () { formularioTraspaso(null); },
  ingreso: function () { formularioIngreso(); },
  arqueo: function () { formularioArqueo(); },
  saldos: function () { formularioSaldos(); },
  conciliar: function () { conciliacion(); },
  verConciliacion: function () { resultado(); },
  exportar: function (ctx) {
    var c = CC.Store.cuenta(cuentaVista);
    var e = CC.Model.estadoCuentaBanco(cuentaVista, ctx.periodo);
    CC.ui.descargarCSV(c.nombre + ' ' + CC.fmt.periodo(ctx.periodo), ['Fecha', 'Folio', 'Concepto', 'Referencia', 'Entra', 'Sale', 'Saldo'],
      [['', '', 'Saldo al empezar el mes', '', '', '', e.inicial]].concat(e.filas.map(function (m) {
        return [m.fecha, m.folio, m.concepto, m.referencia || '', m.entra || '', m.sale || '', m.saldo];
      })));
  }
};
