/* views/folios.js — el control de folios: que no falte ninguno.
 *
 * Fernando, 27-oct-2026, con las notas de la administración de Mallorca sobre la
 * póliza de CondoVive ("ver folios"): "que sean foliados para que no haya ninguna
 * trampa". Cada documento lleva un folio consecutivo que pone el sistema y nada se
 * borra: lo que se cancela conserva su folio con el motivo y las correcciones
 * guardan lo que decía antes. Aquí se ve, serie por serie, que van completos, y se
 * busca un folio para comparar un recibo en papel contra lo que dice el sistema.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var folioBuscado = '';

/** Todas las series con sus documentos, en la misma forma. */
function seriesFolios() {
  var meta = CC.Store.estado().meta;
  var casa = function (id) {
    var u = CC.Store.unidad(id);
    return u ? 'Casa ' + u.clave + (u.propietario ? ' · ' + u.propietario : '') : '';
  };
  var cuenta = function (id) { var c = CC.Store.cuenta(id); return c ? c.nombre : id; };
  return [
    {
      pre: 'P-', nombre: 'Recibos de pago', uno: 'Recibo de pago', contador: meta.folioPago,
      docs: CC.Store.todosLosPagos().map(function (p) {
        return { tipo: 'pago', id: p.id, n: p.folio, fecha: p.fecha, quien: casa(p.unidadId), monto: p.monto,
          concepto: 'Pago ' + (p.metodo ? 'en ' + p.metodo.toLowerCase() : '') + ' aplicado a ' + CC.fmt.periodo(p.periodo),
          cancelado: !!p.cancelado, motivo: p.motivoCancelacion, corr: 0, unidadId: p.unidadId };
      })
    },
    {
      pre: 'E-', nombre: 'Recibos de egreso', uno: 'Recibo de egreso', contador: meta.folioEgreso,
      docs: CC.Store.gastos().map(function (g) {
        return { tipo: 'egreso', id: g.id, n: g.folioE, fecha: g.fecha, quien: g.proveedor || '', monto: g.monto,
          concepto: g.concepto + (g.autorizo ? ' · autorizó ' + g.autorizo : ''),
          cancelado: g.estado === 'cancelado', motivo: g.motivoCancelacion, corr: (g.historial || []).length };
      })
    },
    {
      pre: 'I-', nombre: 'Recibos de ingreso', uno: 'Recibo de ingreso', contador: meta.folioIngreso,
      docs: CC.Store.ingresos().map(function (i) {
        return { tipo: 'ingreso', id: i.id, n: i.folio, fecha: i.fecha, quien: i.nombre || casa(i.unidadId), monto: i.monto,
          concepto: i.concepto, cancelado: !!i.cancelado, motivo: '', corr: (i.historial || []).length };
      })
    },
    {
      pre: 'T-', nombre: 'Traspasos entre cuentas', uno: 'Traspaso', contador: meta.folioTraspaso,
      docs: CC.Store.traspasos().map(function (t) {
        return { tipo: 'traspaso', id: t.id, n: t.folio, fecha: t.fecha, quien: cuenta(t.de) + ' → ' + cuenta(t.a), monto: t.monto,
          concepto: t.nota || 'Traspaso', cancelado: !!t.cancelado, motivo: '', corr: (t.historial || []).length };
      })
    },
    {
      pre: 'CV-', nombre: 'Convenios de pago', uno: 'Convenio de pago', contador: meta.folioConvenio,
      docs: CC.Store.convenios().map(function (c) {
        return { tipo: 'convenio', id: c.id, n: c.folio, fecha: c.fecha, quien: casa(c.unidadId), monto: c.adeudo,
          concepto: 'Convenio en ' + c.parcialidades + ' parcialidades', cancelado: c.estado === 'cancelado', motivo: '', corr: 0 };
      })
    }
  ].map(function (s) {
    // Del 1 al último folio dado: cuáles faltan y cuáles se repiten
    var veces = {}, max = Number(s.contador) || 0;
    s.docs.forEach(function (d) {
      var n = Number(d.n) || 0;
      if (n > 0) { veces[n] = (veces[n] || 0) + 1; if (n > max) max = n; }
    });
    s.ultimo = max;
    s.faltan = [];
    for (var n = 1; n <= max; n++) if (!veces[n]) s.faltan.push(n);
    s.repetidos = Object.keys(veces).filter(function (k) { return veces[k] > 1; }).map(Number);
    s.sinFolio = s.docs.filter(function (d) { return !(Number(d.n) > 0); }).length;
    s.cancelados = s.docs.filter(function (d) { return d.cancelado; });
    s.corregidos = s.docs.filter(function (d) { return d.corr > 0; }).length;
    return s;
  });
}

function textoFolio(s, n) { return s.pre + String(n).padStart(4, '0'); }

/** "E-12", "e 0012", "P-0345" o solo "345" (lo busca en todas las series). */
function buscarFolios(series, texto) {
  var m = String(texto || '').trim().match(/^(cv|p|e|i|t)?\s*-?\s*0*(\d+)$/i);
  if (!m) return null;
  var pre = m[1] ? m[1].toUpperCase() + '-' : null, n = Number(m[2]);
  var hallados = [];
  series.forEach(function (s) {
    if (pre && s.pre !== pre) return;
    s.docs.forEach(function (d) { if (Number(d.n) === n) hallados.push({ serie: s, doc: d }); });
  });
  return { pre: pre, n: n, hallados: hallados };
}

function pdfDeFolio(d) {
  var C = CC.Comprobantes;
  if (d.tipo === 'pago') return C.reciboPago(d.id);
  if (d.tipo === 'egreso') return C.reciboEgreso(d.id);
  if (d.tipo === 'ingreso') return C.reciboIngreso(d.id);
  if (d.tipo === 'traspaso') return C.polizaTraspaso(d.id);
  return C.convenio(d.id);
}

CC.vistas.folios = {
  titulo: 'Folios',
  sub: function () {
    var s = seriesFolios();
    var faltan = s.reduce(function (a, x) { return a + x.faltan.length + x.repetidos.length; }, 0);
    var total = s.reduce(function (a, x) { return a + x.docs.length; }, 0);
    return total + ' documentos con folio · ' + (faltan ? 'revisar: faltan o se repiten folios' : 'ninguno falta');
  },
  acciones: function () {
    return [{ texto: 'Exportar a Excel', icono: 'reportes', clase: 'btn btn--ghost', accion: 'exportar' }];
  },

  render: function () {
    var esc = CC.ui.esc;
    var series = seriesFolios();
    var out = [];
    var problemas = series.filter(function (s) { return s.faltan.length || s.repetidos.length || s.sinFolio; });

    out.push('<div class="note"><div>Cada recibo, traspaso y convenio lleva un <strong>folio consecutivo que pone el sistema</strong>; ' +
      'nadie lo escoge. <strong>Nada se borra:</strong> lo que se cancela conserva su folio con el motivo, y lo que se corrige guarda lo que decía antes. ' +
      'Si alguien trae un recibo en papel, busca aquí su folio: si el nombre o el monto no coinciden, el papel está alterado.</div></div>');

    /* --- Buscar un folio --- */
    out.push('<div class="panelbox"><div class="panelbox__head"><h3>Buscar un folio</h3>' +
      '<span class="eyebrow">Por ejemplo P-0012, E-0007 o solo el número</span></div>' +
      '<div class="panelbox__body"><div class="fila2" style="max-width:460px">' +
      '<label class="search"><svg class="i"><use href="#i-buscar"/></svg>' +
      '<input class="input mono" id="fBuscar" value="' + esc(folioBuscado) + '" placeholder="P-0012" autocomplete="off" aria-label="Folio"></label>' +
      '<button class="btn" id="fIr">Buscar</button></div>' +
      '<div id="fResultado" style="margin-top:14px"></div></div></div>');

    /* --- Serie por serie --- */
    out.push('<div class="panelbox"><div class="panelbox__head"><h3>Folios por serie</h3>' +
      '<span class="eyebrow">' + (problemas.length ? 'hay folios por aclarar' : 'todas las series van completas') + '</span></div>' +
      '<div class="tablewrap"><table class="ledger"><thead><tr><th>Serie</th><th>Documento</th><th class="r">Emitidos</th>' +
      '<th class="r">Vigentes</th><th class="r">Cancelados</th><th class="r">Corregidos</th><th>Faltan</th></tr></thead><tbody>' +
      series.map(function (s) {
        var mal = s.faltan.length || s.repetidos.length || s.sinFolio;
        var detalle = [];
        if (s.faltan.length) detalle.push('faltan ' + s.faltan.slice(0, 8).map(function (n) { return textoFolio(s, n); }).join(', ') +
          (s.faltan.length > 8 ? ' y ' + (s.faltan.length - 8) + ' más' : ''));
        if (s.repetidos.length) detalle.push('repetidos ' + s.repetidos.map(function (n) { return textoFolio(s, n); }).join(', '));
        if (s.sinFolio) detalle.push(s.sinFolio + ' sin folio');
        return '<tr><td class="mono strong">' + esc(s.pre.replace('-', '')) + '</td>' +
          '<td><div class="cellstack"><span>' + esc(s.nombre) + '</span><small>' +
          (s.ultimo ? 'del ' + esc(textoFolio(s, 1)) + ' al ' + esc(textoFolio(s, s.ultimo)) : 'todavía ninguno') + '</small></div></td>' +
          '<td class="r">' + s.ultimo + '</td>' +
          '<td class="r strong">' + (s.docs.length - s.cancelados.length) + '</td>' +
          '<td class="r">' + (s.cancelados.length || '—') + '</td>' +
          '<td class="r">' + (s.corregidos || '—') + '</td>' +
          '<td>' + (mal ? '<span class="pill pill--crit">' + esc(detalle.join(' · ')) + '</span>'
            : '<span class="pill pill--good">Ninguno</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>');

    /* --- Cancelados, con su motivo --- */
    var cancelados = [];
    series.forEach(function (s) { s.cancelados.forEach(function (d) { cancelados.push({ serie: s, doc: d }); }); });
    cancelados.sort(function (a, b) { return (b.doc.fecha || '') < (a.doc.fecha || '') ? -1 : 1; });
    out.push('<div class="panelbox"><div class="panelbox__head"><h3>Cancelados</h3>' +
      '<span class="eyebrow">' + cancelados.length + (cancelados.length === 1 ? ' documento' : ' documentos') + ' · siguen con su folio</span></div>' +
      (cancelados.length
        ? '<div class="tablewrap"><table class="ledger"><thead><tr><th>Folio</th><th>Fecha</th><th>Documento</th><th>De quién</th>' +
          '<th class="r">Monto</th><th>Motivo</th></tr></thead><tbody>' +
          cancelados.map(function (x) {
            return '<tr><td class="mono" style="font-size:12px">' + esc(textoFolio(x.serie, x.doc.n)) + '</td>' +
              '<td class="mono" style="font-size:12px">' + esc(CC.fmt.fechaCorta(x.doc.fecha)) + '</td>' +
              '<td>' + esc(x.serie.uno) + '</td>' +
              '<td>' + esc(x.doc.quien || '—') + '</td>' +
              '<td class="r">' + esc(CC.fmt.money2(x.doc.monto)) + '</td>' +
              '<td>' + esc(x.doc.motivo || '—') + '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="empty"><strong>Ninguno cancelado</strong><p>Si se cancela un pago o un egreso, aparece aquí con su motivo.</p></div>') +
      '</div>');

    return out.join('');
  },

  montar: function (raiz) {
    var esc = CC.ui.esc;
    var inp = raiz.querySelector('#fBuscar');
    var caja = raiz.querySelector('#fResultado');

    function buscar() {
      folioBuscado = inp.value.trim();
      if (!folioBuscado) { caja.innerHTML = ''; return; }
      var r = buscarFolios(seriesFolios(), folioBuscado);
      if (!r) { caja.innerHTML = '<p class="muted">Escribe el folio como viene en el papel: P-0012, E-0007…</p>'; return; }
      if (!r.hallados.length) {
        caja.innerHTML = '<div class="note note--crit"><div><strong>No existe ' + esc(r.pre ? r.pre + String(r.n).padStart(4, '0') : 'ningún folio ' + r.n) +
          '.</strong> Si alguien tiene un recibo con ese folio, no salió de este sistema.</div></div>';
        return;
      }
      caja.innerHTML = r.hallados.map(function (h, i) {
        var d = h.doc;
        return '<div class="recibo recibo--comp' + (d.cancelado ? ' recibo--cancelado' : '') + '" style="margin-bottom:10px">' +
          '<div class="recibo__head"><div><p class="eyebrow">' + esc(h.serie.uno) + '</p>' +
          '<h3>' + esc(d.quien || '—') + '</h3>' +
          '<p class="muted" style="font-size:12.5px;margin-top:4px">' + esc(d.concepto || '') + '</p></div>' +
          '<div class="recibo__folio">Folio ' + esc(textoFolio(h.serie, d.n)) + '<br>' + esc(CC.fmt.fechaCorta(d.fecha)) + '<br>' +
          (d.cancelado ? '<span class="pill pill--crit">Cancelado</span>' : '<span class="pill pill--good">Vigente</span>') + '</div></div>' +
          (d.cancelado && d.motivo ? '<p style="font-size:13px;margin:0 0 8px">Motivo: ' + esc(d.motivo) + '</p>' : '') +
          (d.corr ? '<p class="muted" style="font-size:12.5px;margin:0 0 8px">Se corrigió ' + d.corr + (d.corr === 1 ? ' vez' : ' veces') +
            '; lo que decía antes queda en su historial.</p>' : '') +
          '<div class="recibo__tot"><span>Monto en el sistema</span><strong>' + esc(CC.fmt.money2(d.monto)) + '</strong></div>' +
          '<div class="recibo__acciones noprint">' +
          (d.tipo === 'pago' && d.cancelado ? '' : '<button class="btn btn--sm btn--soft" data-fpdf="' + i + '">' +
            CC.ui.icono('imprimir', 'i--sm') + ' Descargar PDF</button>') +
          (d.tipo === 'egreso' ? '<button class="btn btn--sm btn--ghost" data-fabrir="' + i + '">' + (d.cancelado ? 'Ver' : 'Ver o corregir') + '</button>' : '') +
          (d.unidadId ? '<a class="btn btn--sm btn--ghost" href="#/unidad/' + esc(d.unidadId) + '">Ver la casa</a>' : '') +
          '</div></div>';
      }).join('');
      caja.querySelectorAll('[data-fpdf]').forEach(function (b) {
        b.onclick = function () { CC.Comprobantes.descargar(pdfDeFolio(r.hallados[Number(b.getAttribute('data-fpdf'))].doc)); };
      });
      caja.querySelectorAll('[data-fabrir]').forEach(function (b) {
        b.onclick = function () { CC.vistas.gastos.editar(r.hallados[Number(b.getAttribute('data-fabrir'))].doc.id); };
      });
    }

    raiz.querySelector('#fIr').onclick = buscar;
    inp.onkeydown = function (e) { if (e.key === 'Enter') buscar(); };
    if (folioBuscado) buscar();
  },

  /** Todos los folios en una hoja de Excel, para la auditoría. */
  exportar: function () {
    var filas = [];
    seriesFolios().forEach(function (s) {
      s.docs.slice().sort(function (a, b) { return (a.n || 0) - (b.n || 0); }).forEach(function (d) {
        filas.push([textoFolio(s, d.n || 0), s.nombre, d.fecha || '', d.quien || '', d.concepto || '', Number(d.monto) || 0,
          d.cancelado ? 'Cancelado' : 'Vigente', d.motivo || '', d.corr || 0]);
      });
      s.faltan.forEach(function (n) { filas.push([textoFolio(s, n), s.nombre, '', '', 'FALTA ESTE FOLIO', '', '', '', '']); });
    });
    CC.ui.descargarCSV('Control de folios ' + CC.per.hoyISO(),
      ['Folio', 'Serie', 'Fecha', 'De quién', 'Concepto', 'Monto', 'Estado', 'Motivo de cancelación', 'Correcciones'], filas);
  }
};
