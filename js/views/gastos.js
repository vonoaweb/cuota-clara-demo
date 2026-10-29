/* views/gastos.js — los egresos: todo lo que sale, del banco o de la caja chica.
 *
 * Lo que pidió la administración de Mallorca (26-oct-2026): folio automático,
 * forma de pago, de qué cuenta sale, quién recibe el dinero, la categoría y, en
 * la misma captura, el recibo firmado ("a la hora que hago el recibo lo estoy
 * capturando"). Se puede corregir —queda lo que decía antes— y se cancela en vez
 * de borrarse, para que no falte ningún folio.
 *
 * 27-oct (sus notas sobre la póliza de CondoVive): cada egreso lleva quién lo
 * autorizó, su comprobante (la nota, el ticket o la factura) y una revisión del
 * comité, y los tres salen en su recibo en PDF.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var filtroEgresos = { cuenta: 'todas' };
var GRUPOS_CAT = { fijo: 'Gastos fijos', variable: 'Gastos variables', otro: 'Otros gastos' };
var FORMAS_PAGO = ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta', 'Domiciliación', 'Otra (terminal, CoDi)'];

function folioEgreso(g) { return 'E-' + String(g.folioE || 0).padStart(4, '0'); }
function nombreCuenta(id) { var c = CC.Store.cuenta(id || 'banco'); return c ? c.nombre : 'Banco'; }

/** Quienes han autorizado egresos, el más reciente primero (para sugerirlo). */
function autorizan() {
  var vistos = {};
  return CC.Store.gastos().slice().sort(function (a, b) { return (b.registrado || b.fecha || '') < (a.registrado || a.fecha || '') ? -1 : 1; })
    .map(function (g) { return g.autorizo; })
    .filter(function (x) { if (!x || vistos[x]) return false; vistos[x] = 1; return true; });
}

/** Opciones de categoría agrupadas en fijos, variables y otros. */
function opcionesCategoria(elegida) {
  var esc = CC.ui.esc;
  var cats = CC.Store.categorias();
  return Object.keys(GRUPOS_CAT).map(function (g) {
    var del = cats.filter(function (c) { return (c.grupo || 'variable') === g; });
    if (!del.length) return '';
    return '<optgroup label="' + esc(GRUPOS_CAT[g]) + '">' + del.map(function (c) {
      return '<option value="' + esc(c.nombre) + '"' + (c.nombre === elegida ? ' selected' : '') + '>' + esc(c.nombre) + '</option>';
    }).join('') + '</optgroup>';
  }).join('') + '<option value="__nueva">+ Nueva categoría…</option>';
}

/**
 * Captura o corrección de un egreso. Con "recibo", pide la firma de quien recibe
 * y descarga el recibo en PDF al guardar.
 */
function formularioEgreso(gasto, opciones) {
  opciones = opciones || {};
  var esc = CC.ui.esc;
  var g = gasto || {};
  var nuevo = !gasto;
  var siguiente = 'E-' + String((CC.Store.estado().meta.folioEgreso || 0) + 1).padStart(4, '0');
  var conRecibo = nuevo ? !!opciones.recibo : !!g.recibo;
  var proveedores = CC.Store.proveedores().concat(CC.Store.categorias().map(function (c) { return c.proveedor; }))
    .filter(function (x, i, a) { return x && a.indexOf(x) === i; }).sort();
  var quienes = autorizan();

  CC.ui.modal(nuevo ? 'Registrar egreso — folio ' + siguiente + ' (automático)' : 'Corregir egreso ' + folioEgreso(g),
    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">Concepto</span>' +
    '<input class="input" id="eConcepto" value="' + esc(g.concepto || '') + '" placeholder="Pago de vigilancia de octubre"></label>' +
    '<label class="field"><span class="field__lab">Categoría</span>' +
    '<select class="input" id="eCat">' + opcionesCategoria(g.categoria || (CC.Store.categorias()[0] || {}).nombre) + '</select></label>' +
    '<div class="field" id="eNuevaCat" hidden><span class="field__lab">Nueva categoría</span>' +
    '<div class="fila2"><input class="input" id="eCatNombre" placeholder="Nombre">' +
    '<select class="input" id="eCatGrupo"><option value="fijo">Fijo</option><option value="variable" selected>Variable</option><option value="otro">Otro</option></select></div></div>' +
    '<label class="field"><span class="field__lab">Quién recibe el dinero</span>' +
    '<input class="input" id="eProv" list="listaProv" value="' + esc(g.proveedor || '') + '" placeholder="Proveedor o persona" autocomplete="off">' +
    '<datalist id="listaProv">' + proveedores.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' +
    '<span class="field__hint">Si es nuevo, se da de alta solo</span></label>' +
    '<label class="field"><span class="field__lab">Autorizó</span>' +
    '<input class="input" id="eAut" list="listaAut" value="' + esc(g.autorizo || (nuevo ? quienes[0] || '' : '')) + '" placeholder="Quién dio el visto bueno" autocomplete="off">' +
    '<datalist id="listaAut">' + quienes.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' +
    '<span class="field__hint">Sale en el recibo del egreso</span></label>' +
    '<label class="field"><span class="field__lab">Monto</span>' +
    '<input class="input num" id="eMonto" type="number" min="0" step="0.01" value="' + esc(g.monto || '') + '" placeholder="0.00"></label>' +
    '<label class="field"><span class="field__lab">Fecha</span>' +
    '<input class="input" id="eFecha" type="date" value="' + esc(g.fecha || CC.per.hoyISO()) + '"></label>' +
    '<label class="field"><span class="field__lab">Forma de pago</span>' +
    '<select class="input" id="eForma">' + FORMAS_PAGO.map(function (f) {
      return '<option' + ((g.metodo || (conRecibo ? 'Efectivo' : 'Transferencia')) === f ? ' selected' : '') + '>' + f + '</option>';
    }).join('') + '</select></label>' +
    '<label class="field"><span class="field__lab">Sale de</span>' +
    '<select class="input" id="eCuenta">' + CC.Store.cuentas().map(function (c) {
      var actual = g.cuenta || (conRecibo ? 'caja' : 'banco');
      return '<option value="' + esc(c.id) + '"' + (c.id === actual ? ' selected' : '') + '>' + esc(c.nombre) + '</option>';
    }).join('') + '</select></label>' +
    '<label class="field"><span class="field__lab">Referencia</span>' +
    '<input class="input mono" id="eRef" value="' + esc(g.referencia || g.folio || '') + '" placeholder="Cheque, transferencia o factura"></label>' +
    '<label class="field"><span class="field__lab">Estado</span>' +
    '<select class="input" id="eEstado"><option value="pagado">Ya se pagó</option>' +
    '<option value="pendiente"' + (g.estado === 'pendiente' ? ' selected' : '') + '>Pendiente de pago</option></select></label>' +
    '</div>' +
    '<label class="field" style="margin-top:14px"><span class="field__lab">Nota (opcional)</span>' +
    '<input class="input" id="eNota" value="' + esc(g.nota || '') + '" placeholder="Fuera de contrato, se pagó en dos partes…"></label>' +

    /* El comprobante (la nota, el ticket o la factura) va con cualquier egreso */
    '<div class="capturas"><div class="captura">' +
    '<div class="captura__head"><span class="field__lab">Comprobante: la nota, el ticket o la factura' +
    (g.fotoId ? ' (ya tiene; sube otro solo si hace falta cambiarlo)' : '') + '</span></div>' +
    (g.fotoId ? '<span data-img="' + esc(g.fotoId) + '" data-alt="Comprobante" id="eFotoActual"></span>' : '') +
    '<label class="dropfoto" for="eFoto" id="eFotoEtiqueta">' + CC.ui.icono('imprimir') +
    '<span>Tomar foto o elegir del carrete</span><small>Sale en el recibo del egreso</small></label>' +
    '<input type="file" id="eFoto" accept="image/*" capture="environment" hidden><div id="eFotoPrev"></div></div></div>' +

    '<label class="check check--suave"><input type="checkbox" id="eRecibo"' + (conRecibo ? ' checked' : '') + '> ' +
    'Que firme de recibido quien recibe el dinero</label>' +
    '<div id="eReciboCaja"' + (conRecibo ? '' : ' hidden') + '>' +
    '<div class="capturas">' +
    '<div class="captura"><div class="captura__head"><span class="field__lab">Firma de quien recibe' +
    (g.firmaId || g.firmaInline ? ' (ya firmó; firma de nuevo solo si hace falta)' : '') + '</span>' +
    '<button type="button" class="btn btn--sm btn--ghost" id="eLimpiar">Borrar</button></div>' +
    '<canvas id="eFirma" class="lienzo"></canvas>' +
    '<span class="field__hint">Con el dedo en el celular o con el mouse</span></div>' +
    '</div>' +
    '<label class="field" style="margin-top:12px"><span class="field__lab">Identificación (opcional)</span>' +
    '<input class="input mono" id="eIne" value="' + esc(g.identificacion || '') + '" placeholder="INE, gafete o teléfono"></label>' +
    '</div>' +

    (!nuevo && (g.historial || []).length
      ? '<details class="historial"><summary>' + g.historial.length + (g.historial.length === 1 ? ' corrección' : ' correcciones') + '</summary><ul>' +
        g.historial.map(function (h) {
          return '<li><span class="mono">' + esc(CC.fmt.fecha(h.fecha)) + '</span> antes decía: ' +
            esc(Object.keys(h.antes).map(function (k) {
              var v = h.antes[k];
              if (k === 'revision') return v ? 'revisado por ' + v.nombre + ' (la corrección lo deja otra vez por revisar)' : 'sin revisar';
              return k + ' = ' + (v === undefined || v === null || v === '' ? '—' : v);
            }).join(' · ')) + '</li>';
        }).join('') + '</ul></details>'
      : '') +

    '<div class="formactions">' +
    (!nuevo && g.estado !== 'cancelado' ? '<button type="button" class="btn btn--ghost" id="eCancelarEgreso" style="margin-right:auto">Cancelar este egreso</button>' : '') +
    '<button type="button" class="btn btn--ghost" id="eCerrar">Cerrar</button>' +
    '<button type="button" class="btn" id="eOk">' + (nuevo ? 'Guardar' : 'Guardar cambios') + '</button>' +
    '</div>',

    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      var firma = CC.Firma(q('eFirma'));
      q('eLimpiar').onclick = function () { firma.limpiar(); };

      var selCat = q('eCat');
      selCat.onchange = function () { q('eNuevaCat').hidden = selCat.value !== '__nueva'; if (selCat.value === '__nueva') q('eCatNombre').focus(); };
      q('eForma').onchange = function () { q('eCuenta').value = q('eForma').value === 'Efectivo' ? 'caja' : 'banco'; };
      q('eRecibo').onchange = function () {
        q('eReciboCaja').hidden = !q('eRecibo').checked;
        if (q('eRecibo').checked) { q('eForma').value = 'Efectivo'; q('eCuenta').value = 'caja'; }
        q('eOk').textContent = (nuevo ? 'Guardar' : 'Guardar cambios') + (q('eRecibo').checked ? ' y descargar recibo' : '');
      };
      q('eRecibo').onchange();
      pintarImagenes(cuerpo);   // el comprobante que ya tenía

      var fotoDataURL = null;
      q('eFoto').onchange = function () {
        var f = q('eFoto').files && q('eFoto').files[0];
        if (!f) return;
        // con más resolución que una evidencia: en una factura se tiene que leer el RFC y el importe
        CC.Archivos.comprimir(f, 1400, 0.72).then(function (d) {
          fotoDataURL = d;
          q('eFotoPrev').innerHTML = '<img src="' + d + '" alt="Vista previa" style="max-width:100%;border-radius:6px;display:block">';
          q('eFotoEtiqueta').hidden = true;
          if (q('eFotoActual')) q('eFotoActual').hidden = true;
        }, function (err) { CC.ui.toast(err.message || 'No se pudo leer la imagen', 'crit'); });
      };

      q('eCerrar').onclick = CC.ui.cerrarModal;
      var bCanc = q('eCancelarEgreso');
      if (bCanc) bCanc.onclick = function () {
        CC.ui.pedirTexto('Cancelar egreso ' + folioEgreso(g),
          'El egreso deja de contar, pero su folio sigue a la vista con el motivo. ¿Por qué se cancela?',
          'Cancelar egreso', function (motivo) {
            CC.Store.cancelarGasto(g.id, motivo);
            CC.ui.toast('Egreso ' + folioEgreso(g) + ' cancelado; su folio sigue a la vista');
          });
      };

      q('eOk').onclick = function () {
        var categoria = selCat.value;
        if (categoria === '__nueva') {
          var nc = CC.Store.agregarCategoria(q('eCatNombre').value, q('eCatGrupo').value);
          if (!nc) { CC.ui.toast('Ponle nombre a la categoría nueva', 'crit'); return; }
          categoria = nc.nombre;
        }
        var concepto = q('eConcepto').value.trim();
        var monto = Number(q('eMonto').value);
        var fecha = q('eFecha').value || CC.per.hoyISO();
        var cuenta = q('eCuenta').value, estadoE = q('eEstado').value;
        var recibo = q('eRecibo').checked;
        var autorizo = q('eAut').value.trim();
        if (!concepto) { CC.ui.toast('Falta el concepto', 'crit'); return; }
        if (!(monto > 0)) { CC.ui.toast('Captura un monto mayor a cero', 'crit'); return; }
        if (nuevo && !autorizo) { CC.ui.toast('Falta quién autorizó el egreso', 'crit'); q('eAut').focus(); return; }
        if (recibo && !q('eProv').value.trim()) { CC.ui.toast('Para el recibo hace falta el nombre de quien recibe', 'crit'); return; }
        if (cuenta === 'caja' && estadoE === 'pagado') {
          var disponible = CC.Model.saldoCuenta('caja') + (!nuevo && g.cuenta === 'caja' && g.estado === 'pagado' ? Number(g.monto) : 0);
          if (monto > disponible + 0.005) {
            CC.ui.toast('En la caja chica solo hay ' + CC.fmt.money2(disponible) + '. Haz un traspaso del banco o cámbialo a Banco.', 'crit');
            return;
          }
        }
        var boton = q('eOk');
        boton.disabled = true;
        var firmaPNG = recibo ? firma.aPNG() : null;
        Promise.all([
          firmaPNG ? CC.Archivos.guardar(firmaPNG, 'firma') : Promise.resolve(null),
          fotoDataURL ? CC.Archivos.guardar(fotoDataURL, 'foto') : Promise.resolve(null)
        ]).then(function (ids) {
          var datos = {
            periodo: CC.per.de(fecha), fecha: fecha, categoria: categoria, concepto: concepto,
            proveedor: q('eProv').value.trim(), autorizo: autorizo, monto: monto, metodo: q('eForma').value, cuenta: cuenta,
            referencia: q('eRef').value.trim(), estado: estadoE, nota: q('eNota').value.trim(),
            recibo: recibo, identificacion: recibo ? q('eIne').value.trim() : (g.identificacion || '')
          };
          if (estadoE === 'pagado' && g.estado !== 'pagado') datos.fechaPago = nuevo ? fecha : CC.per.hoyISO();
          if (ids[0]) { datos.firmaId = ids[0]; datos.firmaInline = null; }
          else if (firmaPNG) datos.firmaInline = firmaPNG;    // el navegador no deja guardar imágenes aparte
          if (ids[1]) datos.fotoId = ids[1];
          var res = nuevo ? CC.Store.agregarGasto(datos) : CC.Store.editarGasto(g.id, datos);
          CC.ui.cerrarModal();
          CC.ui.toast((nuevo ? 'Egreso ' : 'Cambios guardados en ') + folioEgreso(res) + (nuevo ? ' registrado' : ''), 'good');
          // el recibo se baja al crearlo o al volver a firmarlo, no en cada corrección
          if (recibo && (nuevo || firmaPNG)) CC.Comprobantes.descargar(CC.Comprobantes.reciboEgreso(res.id), true);
        });
      };
    });
}

/** Los egresos de una categoría en un mes: para contestar "¿por qué tanto aquí?". */
function detalleCategoria(categoria, periodo) {
  var esc = CC.ui.esc;
  var lista = CC.Model.gastosVigentes().filter(function (g) { return g.categoria === categoria && g.periodo === periodo; })
    .sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
  var total = lista.reduce(function (a, g) { return a + (Number(g.monto) || 0); }, 0);
  CC.ui.modal(categoria + ' — ' + CC.fmt.periodo(periodo),
    '<div class="tablewrap"><table class="ledger"><thead><tr><th>Folio</th><th>Fecha</th><th>Concepto</th><th>Sale de</th><th class="r">Monto</th><th></th></tr></thead><tbody>' +
    lista.map(function (g) {
      return '<tr><td class="mono" style="font-size:12px">' + esc(folioEgreso(g)) + '</td>' +
        '<td class="mono" style="font-size:12px">' + esc(CC.fmt.fechaCorta(g.fecha)) + '</td>' +
        '<td><div class="cellstack"><span>' + esc(g.concepto) + '</span><small>' + esc(g.proveedor || '') + '</small></div></td>' +
        '<td>' + esc(nombreCuenta(g.cuenta)) + '</td>' +
        '<td class="r strong">' + esc(CC.fmt.money2(g.monto)) + '</td>' +
        '<td class="r"><button class="btn btn--sm btn--ghost" data-corregir="' + esc(g.id) + '">Corregir</button></td></tr>';
    }).join('') + '</tbody><tfoot><tr><td colspan="4">' + lista.length + ' movimientos</td><td class="r">' +
    esc(CC.fmt.money2(total)) + '</td><td></td></tr></tfoot></table></div>' +
    '<p class="field__hint" style="margin-top:10px">Si algo está en la categoría equivocada, ábrelo con "Corregir" y cámbiale la categoría.</p>',
    function (cuerpo) {
      cuerpo.querySelectorAll('[data-corregir]').forEach(function (b) {
        b.onclick = function () { formularioEgreso(CC.Store.gasto(b.getAttribute('data-corregir'))); };
      });
    });
}

CC.vistas.gastos = {
  titulo: 'Egresos',
  sub: function (ctx) {
    var r = CC.Model.resumen(ctx.periodo);
    return CC.fmt.periodo(ctx.periodo) + ' · ' + CC.fmt.money(r.egresos) + ' en egresos';
  },
  acciones: function () {
    return [
      { texto: 'Registrar egreso', icono: 'mas', clase: 'btn', accion: 'gasto' },
      { texto: 'Con recibo firmado', icono: 'recibos', clase: 'btn btn--ghost', accion: 'gastoConRecibo' },
      { texto: 'Revisar egresos', icono: 'folios', clase: 'btn btn--ghost', accion: 'revisar' },
      { texto: 'Exportar a Excel', icono: 'reportes', clase: 'btn btn--ghost', accion: 'exportar' }
    ];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var p = ctx.periodo;
    var r = CC.Model.resumen(p);
    var f = filtroEgresos;
    var delMes = CC.Store.gastos().filter(function (g) { return g.periodo === p; });
    var vigentes = delMes.filter(function (g) { return g.estado !== 'cancelado'; });
    var porCuenta = function (id) {
      return vigentes.filter(function (g) { return (g.cuenta || 'banco') === id; })
        .reduce(function (a, g) { return a + (Number(g.monto) || 0); }, 0);
    };
    var sobre = r.presupuestoEgresos > 0 ? r.egresos - r.presupuestoEgresos : 0;
    var out = [];

    out.push(CC.ui.stats([
      { lab: 'Egresos del mes', val: CC.fmt.money(r.egresos), nota: '<span>' + vigentes.length + ' movimientos</span>' },
      { lab: 'Salió del banco', val: CC.fmt.money(porCuenta('banco')), nota: '<span>transferencias y cheques</span>' },
      { lab: 'Salió de caja chica', val: CC.fmt.money(porCuenta('caja')), nota: '<span>en efectivo</span>' },
      {
        lab: 'Contra presupuesto', val: r.presupuestoEgresos > 0 ? CC.fmt.moneySigno(-sobre) : '—',
        tono: sobre > 0 ? 'crit' : 'good',
        nota: r.egresosPendientes > 0
          ? '<span style="color:var(--warn)">' + esc(CC.fmt.money(r.egresosPendientes)) + ' sin pagar</span>'
          : '<span>' + (sobre > 0 ? 'por encima' : 'por debajo') + ' de lo presupuestado</span>'
      }
    ]));

    /* --- Por categoría, agrupado en fijos, variables y otros --- */
    var cats = CC.Model.porCategoria(p);
    var grupoDe = {};
    CC.Store.categorias().forEach(function (c) { grupoDe[c.nombre] = c.grupo || 'variable'; });
    var bloques = Object.keys(GRUPOS_CAT).map(function (gk) {
      var del = cats.filter(function (c) { return (grupoDe[c.categoria] || 'otro') === gk && c.monto > 0; });
      if (!del.length) return '';
      var sub = del.reduce(function (a, c) { return a + c.monto; }, 0);
      var subP = del.reduce(function (a, c) { return a + c.presupuesto; }, 0);
      return '<tr class="ledger__grupo"><td colspan="5">' + esc(GRUPOS_CAT[gk]) + '</td></tr>' +
        del.map(function (c) {
          var dif = c.monto - c.presupuesto;
          return '<tr class="fila-clic" data-detalle="' + esc(c.categoria) + '" title="Ver el detalle">' +
            '<td class="strong">' + esc(c.categoria) + ' <span class="muted" style="font-size:11px">· ver</span></td>' +
            '<td class="r muted">' + (c.presupuesto ? esc(CC.fmt.money2(c.presupuesto)) : '—') + '</td>' +
            '<td class="r strong">' + esc(CC.fmt.money2(c.monto)) + '</td>' +
            '<td class="r" style="color:' + (c.presupuesto ? (dif > 0 ? 'var(--crit)' : 'var(--good)') : 'var(--muted)') + '">' +
            (c.presupuesto ? esc(CC.fmt.moneySigno(dif)) : '—') + '</td>' +
            '<td class="r">' + (c.pendiente > 0 ? '<span class="pill pill--warn">' + esc(CC.fmt.money(c.pendiente)) + ' sin pagar</span>' : '') + '</td></tr>';
        }).join('') +
        '<tr class="subtotal"><td>Subtotal ' + esc(GRUPOS_CAT[gk].toLowerCase()) + '</td><td class="r">' + esc(CC.fmt.money2(subP)) +
        '</td><td class="r">' + esc(CC.fmt.money2(sub)) + '</td><td colspan="2"></td></tr>';
    }).join('');

    if (bloques) {
      out.push('<div class="panelbox"><div class="panelbox__head"><h3>En qué se gastó</h3>' +
        '<span class="eyebrow">' + esc(CC.fmt.periodo(p)) + ' · toca una categoría para ver su detalle</span></div>' +
        '<div class="tablewrap"><table class="ledger"><thead><tr><th>Categoría</th><th class="r">Presupuesto</th><th class="r">Real</th>' +
        '<th class="r">Diferencia</th><th></th></tr></thead><tbody>' + bloques + '</tbody>' +
        '<tfoot><tr><td>Total</td><td class="r">' + esc(CC.fmt.money2(r.presupuestoEgresos)) + '</td><td class="r">' +
        esc(CC.fmt.money2(r.egresos)) + '</td><td class="r">' + esc(CC.fmt.moneySigno(r.egresos - r.presupuestoEgresos)) +
        '</td><td></td></tr></tfoot></table></div></div>');
    }

    /* --- Movimientos con su folio --- */
    var chips = [['todas', 'Todos'], ['banco', 'Banco'], ['caja', 'Caja chica']].map(function (c) {
      return '<button class="chip' + (f.cuenta === c[0] ? ' is-on' : '') + '" data-fcuenta="' + c[0] + '">' + esc(c[1]) + '</button>';
    }).join('');
    var lista = delMes.filter(function (g) { return f.cuenta === 'todas' || (g.cuenta || 'banco') === f.cuenta; })
      .sort(function (a, b) { return (b.folioE || 0) - (a.folioE || 0); });

    var sinRevisar = vigentes.filter(function (g) { return !g.revision; }).length;
    var sinComprobante = vigentes.filter(function (g) { return !g.fotoId; }).length;
    out.push('<div class="section">' +
      '<div class="section__head"><h2>Movimientos del mes</h2><div class="chips noprint">' + chips + '</div></div>' +
      (vigentes.length ? '<p class="muted noprint" style="font-size:12.5px;margin:-4px 0 10px">' +
        (sinRevisar ? '<strong style="color:var(--warn)">' + sinRevisar + (sinRevisar === 1 ? ' egreso sin revisar' : ' egresos sin revisar') + '</strong>'
          : '<strong style="color:var(--good)">Todos revisados</strong>') +
        ' · ' + (sinComprobante ? sinComprobante + ' sin comprobante' : 'todos con comprobante') +
        (sinRevisar ? ' · <button class="linkbtn" data-accion="revisar">Revisar ahora</button>' : '') + '</p>' : '') +
      '<div class="panelbox">' + (lista.length
        ? '<div class="tablewrap"><table class="ledger"><thead><tr><th>Folio</th><th>Fecha</th><th>Concepto</th>' +
          '<th>Sale de</th><th class="r">Monto</th><th class="c">Estado</th><th class="c">Revisión</th><th class="noprint"></th></tr></thead><tbody>' +
          lista.map(function (g) {
            var cancel = g.estado === 'cancelado', pend = g.estado === 'pendiente';
            return '<tr class="' + (cancel ? 'row--cancelado' : pend ? 'row--warn' : '') + '">' +
              '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(folioEgreso(g)) + '</td>' +
              '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(CC.fmt.fechaCorta(g.fecha)) + '</td>' +
              '<td><div class="cellstack"><span>' + esc(g.concepto) + '</span><small>' +
              esc([g.categoria, g.proveedor, g.autorizo ? 'autorizó ' + g.autorizo : ''].filter(Boolean).join(' · ')) +
              ((g.historial || []).length ? ' · corregido' : '') + (g.fotoId ? '' : ' · sin comprobante') + '</small></div></td>' +
              '<td><div class="cellstack"><span>' + esc(nombreCuenta(g.cuenta)) + '</span><small>' +
              esc([g.metodo, g.referencia || g.folio].filter(Boolean).join(' · ')) + '</small></div></td>' +
              '<td class="r strong">' + esc(CC.fmt.money2(g.monto)) + '</td>' +
              '<td class="c">' + (cancel ? '<span class="pill pill--mute" title="' + esc(g.motivoCancelacion || '') + '">Cancelado</span>'
                : pend ? '<span class="pill pill--warn">Por pagar</span>' : '<span class="pill pill--good">Pagado</span>') + '</td>' +
              '<td class="c">' + (g.revision
                ? '<span class="pill pill--good" title="' + esc(g.revision.nombre + ' · ' + CC.fmt.fechaCorta(String(g.revision.fecha).slice(0, 10))) + '">Revisado</span>'
                : cancel ? '' : '<span class="pill pill--mute">Sin revisar</span>') + '</td>' +
              '<td class="r noprint" style="white-space:nowrap">' +
              (pend ? '<button class="btn btn--sm btn--soft" data-pagar="' + esc(g.id) + '">Marcar pagado</button> ' : '') +
              '<button class="btn btn--sm btn--soft" data-recibo="' + esc(g.id) + '" title="Recibo en PDF, con el comprobante">' +
                CC.ui.icono('imprimir', 'i--sm') + ' Recibo</button> ' +
              '<button class="btn btn--sm btn--ghost" data-editar="' + esc(g.id) + '">' + (cancel ? 'Ver' : 'Corregir') + '</button>' +
              '</td></tr>';
          }).join('') + '</tbody><tfoot><tr><td colspan="4">' + lista.length + ' movimientos</td><td class="r">' +
          esc(CC.fmt.money2(lista.filter(function (g) { return g.estado !== 'cancelado'; })
            .reduce(function (a, g) { return a + (Number(g.monto) || 0); }, 0))) + '</td><td colspan="3"></td></tr></tfoot></table></div>'
        : '<div class="empty"><strong>Sin egresos en este periodo</strong><p>Registra cada pago: luz, vigilancia, ' +
          'el jardinero. El folio se pone solo.</p><button class="btn" data-accion="gasto" style="margin-top:8px">Registrar el primero</button></div>') +
      '</div></div>');

    return out.join('');
  },

  montar: function (raiz, ctx, redibujar) {
    raiz.querySelectorAll('[data-fcuenta]').forEach(function (b) {
      b.onclick = function () { filtroEgresos.cuenta = b.getAttribute('data-fcuenta'); redibujar(); };
    });
    raiz.querySelectorAll('[data-detalle]').forEach(function (tr) {
      tr.onclick = function () { detalleCategoria(tr.getAttribute('data-detalle'), ctx.periodo); };
    });
    raiz.querySelectorAll('[data-editar]').forEach(function (b) {
      b.onclick = function () { formularioEgreso(CC.Store.gasto(b.getAttribute('data-editar'))); };
    });
    raiz.querySelectorAll('[data-recibo]').forEach(function (b) {
      b.onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.reciboEgreso(b.getAttribute('data-recibo'))); };
    });
    raiz.querySelectorAll('[data-pagar]').forEach(function (b) {
      b.onclick = function () {
        var g = CC.Store.gasto(b.getAttribute('data-pagar'));
        CC.Store.editarGasto(g.id, { estado: 'pagado', fechaPago: CC.per.hoyISO(), metodo: g.metodo || 'Transferencia' });
        CC.ui.toast('Egreso ' + folioEgreso(g) + ' marcado como pagado', 'good');
      };
    });
  },

  gasto: function () { formularioEgreso(null); },
  gastoConRecibo: function () { formularioEgreso(null, { recibo: true }); },
  editar: function (id) { formularioEgreso(CC.Store.gasto(id)); },

  /**
   * La revisión (lo que pidió la administración de Mallorca: "quién lo autorizó,
   * revisión"): el comité o el tesorero repasa los egresos del mes con su
   * comprobante y los da por buenos. Lo que se corrija después vuelve a quedar
   * por revisar.
   */
  revisar: function (ctx) {
    var esc = CC.ui.esc;
    var lista = CC.Model.gastosVigentes().filter(function (g) { return g.periodo === ctx.periodo && !g.revision; })
      .sort(function (a, b) { return (a.folioE || 0) - (b.folioE || 0); });
    if (!lista.length) { CC.ui.toast('Los egresos de ' + CC.fmt.periodo(ctx.periodo) + ' ya están revisados', 'good'); return; }
    var antes = CC.Store.gastos().filter(function (g) { return g.revision; })
      .sort(function (a, b) { return a.revision.fecha < b.revision.fecha ? 1 : -1; })[0];
    // Con usuarios: revisa quien está dentro (del comité) y nunca lo que capturó él mismo
    var yo = CC.Sesion.usuario();
    if (CC.Sesion.hayUsuarios() && !CC.Sesion.puede('comite')) { CC.ui.toast('Los egresos los revisa alguien del comité', 'crit'); return; }
    var propio = function (g) { return yo && g.registradoPor && g.registradoPor.id === yo.id; };
    CC.ui.modal('Revisar egresos de ' + CC.fmt.periodo(ctx.periodo),
      '<p style="font-size:13.5px;color:var(--ink-2);margin-bottom:12px">Revisa cada egreso con su comprobante y palomea los que estén bien. ' +
      'Queda tu nombre y la fecha en el recibo del egreso; si después alguien corrige uno, vuelve a quedar por revisar.</p>' +
      '<div class="tablewrap"><table class="ledger"><thead><tr><th class="c"><input type="checkbox" id="rvTodos" checked aria-label="Todos"></th>' +
      '<th>Folio</th><th>Concepto</th><th>Autorizó</th><th class="c">Comprobante</th><th class="r">Monto</th></tr></thead><tbody>' +
      lista.map(function (g) {
        if (propio(g)) {
          return '<tr class="row--cancelado" title="Lo capturaste tú: lo revisa otra persona"><td class="c">—</td>' +
            '<td class="mono" style="font-size:12px">' + esc(folioEgreso(g)) + '</td><td colspan="3">' + esc(g.concepto) +
            ' · <span class="muted">lo capturaste tú; lo revisa otra persona</span></td><td class="r">' + esc(CC.fmt.money2(g.monto)) + '</td></tr>';
        }
        return '<tr><td class="c"><input type="checkbox" data-rv="' + esc(g.id) + '" checked></td>' +
          '<td class="mono" style="font-size:12px">' + esc(folioEgreso(g)) + '</td>' +
          '<td><div class="cellstack"><span>' + esc(g.concepto) + '</span><small>' + esc(g.proveedor || '') + '</small></div></td>' +
          '<td>' + (g.autorizo ? esc(g.autorizo) : '<span class="pill pill--warn">Falta</span>') + '</td>' +
          '<td class="c">' + (g.fotoId ? '<button class="linkbtn" data-verfoto="' + esc(g.fotoId) + '">Ver</button>' : '<span class="pill pill--warn">No tiene</span>') + '</td>' +
          '<td class="r strong">' + esc(CC.fmt.money2(g.monto)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div id="rvFoto" style="margin-top:12px"></div>' +
      '<label class="field" style="margin-top:14px"><span class="field__lab">Revisó</span>' +
      '<input class="input" id="rvNombre" value="' + esc(yo ? yo.nombre : antes ? antes.revision.nombre : '') + '"' + (yo ? ' readonly' : '') +
      ' placeholder="Nombre de quien revisa (tesorero, comité)"></label>' +
      '<div class="formactions"><button type="button" class="btn btn--ghost" id="rvCerrar">Cerrar</button>' +
      '<button type="button" class="btn" id="rvOk">Marcar como revisados</button></div>',
      function (cuerpo) {
        var q = function (id) { return cuerpo.querySelector('#' + id); };
        q('rvCerrar').onclick = CC.ui.cerrarModal;
        q('rvTodos').onchange = function () {
          cuerpo.querySelectorAll('[data-rv]').forEach(function (c) { c.checked = q('rvTodos').checked; });
        };
        cuerpo.querySelectorAll('[data-verfoto]').forEach(function (b) {
          b.onclick = function () {
            q('rvFoto').innerHTML = '<span data-img="' + esc(b.getAttribute('data-verfoto')) + '" data-alt="Comprobante"></span>';
            pintarImagenes(q('rvFoto'));
          };
        });
        q('rvOk').onclick = function () {
          var nombre = q('rvNombre').value.trim();
          var ids = Array.prototype.map.call(cuerpo.querySelectorAll('[data-rv]:checked'), function (c) { return c.getAttribute('data-rv'); });
          if (!nombre) { CC.ui.toast('Escribe quién revisó', 'crit'); q('rvNombre').focus(); return; }
          if (!ids.length) { CC.ui.toast('Palomea al menos un egreso', 'crit'); return; }
          CC.Store.revisarGastos(ids, nombre);
          CC.ui.cerrarModal();
          CC.ui.toast(ids.length + (ids.length === 1 ? ' egreso revisado' : ' egresos revisados') + ' por ' + nombre, 'good');
        };
      });
  },

  /** Todos los egresos del mes en una hoja de Excel (CSV). */
  exportar: function (ctx) {
    var filas = CC.Store.gastos().filter(function (g) { return g.periodo === ctx.periodo; })
      .sort(function (a, b) { return (a.folioE || 0) - (b.folioE || 0); })
      .map(function (g) {
        return [folioEgreso(g), g.fecha, g.concepto, g.categoria, g.proveedor || '', nombreCuenta(g.cuenta),
          g.metodo || '', g.referencia || g.folio || '', Number(g.monto) || 0,
          g.estado === 'cancelado' ? 'Cancelado' : g.estado === 'pendiente' ? 'Por pagar' : 'Pagado',
          g.autorizo || '', g.revision ? g.revision.nombre + ' (' + String(g.revision.fecha).slice(0, 10) + ')' : '',
          g.fotoId ? 'Sí' : 'No', g.nota || ''];
      });
    CC.ui.descargarCSV('Egresos ' + CC.fmt.periodo(ctx.periodo),
      ['Folio', 'Fecha', 'Concepto', 'Categoría', 'Quién recibe', 'Sale de', 'Forma de pago', 'Referencia', 'Monto', 'Estado',
        'Autorizó', 'Revisó', 'Comprobante', 'Nota'], filas);
  }
};
