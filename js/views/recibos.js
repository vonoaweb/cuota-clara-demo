/* views/recibos.js — los egresos que llevan recibo firmado.
 *
 * El caso que lo motiva: llega el jardinero por su pago. Se registra el egreso
 * con "Hacer el recibo firmado": firma con el dedo, foto si hace falta, y queda
 * el recibo con folio. Ya no son dos capturas: el recibo ES el egreso.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

/* Las imágenes se leen de IndexedDB después de pintar. */
function pintarImagenes(raiz) {
  raiz.querySelectorAll('[data-img]').forEach(function (hueco) {
    var id = hueco.getAttribute('data-img');
    if (!id) return;
    CC.Archivos.leer(id).then(function (dataURL) {
      if (!dataURL || !hueco.isConnected) return;
      var img = new Image();
      img.src = dataURL;
      img.alt = hueco.getAttribute('data-alt') || '';
      img.style.cssText = 'max-width:100%;border-radius:6px;display:block';
      hueco.innerHTML = '';
      hueco.appendChild(img);
    });
  });
}

function recibosDe(periodo) {
  return CC.Store.gastos().filter(function (g) { return g.recibo && (!periodo || g.periodo === periodo); })
    .sort(function (a, b) { return (b.folioE || 0) - (a.folioE || 0); });
}

CC.vistas.recibos = {
  titulo: 'Recibos firmados',
  sub: function (ctx) {
    var n = recibosDe(ctx.periodo).length;
    return n + (n === 1 ? ' recibo' : ' recibos') + ' en ' + CC.fmt.periodo(ctx.periodo);
  },
  acciones: function () {
    return [{ texto: 'Nuevo recibo', icono: 'mas', clase: 'btn', accion: 'nuevo' }];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var lista = recibosDe(ctx.periodo);
    var vigentes = lista.filter(function (g) { return g.estado !== 'cancelado'; });
    var total = vigentes.reduce(function (a, g) { return a + (Number(g.monto) || 0); }, 0);
    var out = [];

    out.push(CC.ui.stats([
      { lab: 'Recibos del mes', val: String(vigentes.length), nota: '<span>' + esc(CC.fmt.periodo(ctx.periodo)) + '</span>' },
      { lab: 'Pagado en mano', val: CC.fmt.money(total), nota: '<span>con firma de quien recibió</span>' },
      { lab: 'De caja chica', val: CC.fmt.money(vigentes.filter(function (g) { return g.cuenta === 'caja'; })
          .reduce(function (a, g) { return a + (Number(g.monto) || 0); }, 0)), nota: '<span>en efectivo</span>' }
    ]));

    if (!lista.length) {
      out.push('<div class="panelbox"><div class="empty"><strong>Sin recibos este mes</strong>' +
        '<p>Cuando alguien cobre en mano —el jardinero, el plomero, los de la basura— registra el egreso con su recibo: ' +
        'firma con el dedo y queda con folio.</p>' +
        '<button class="btn" data-accion="nuevo" style="margin-top:8px">Hacer el primero</button></div></div>');
      return out.join('');
    }

    out.push('<div class="reclista">' + lista.map(function (g) {
      var firma = g.firmaInline
        ? '<img src="' + esc(g.firmaInline) + '" alt="Firma de ' + esc(g.proveedor) + '" class="firma__img">'
        : (g.firmaId ? '<span data-img="' + esc(g.firmaId) + '" data-alt="Firma"></span>' : '<span class="muted">Sin firma</span>');
      var cancel = g.estado === 'cancelado';
      return '<article class="recibo recibo--comp' + (cancel ? ' recibo--cancelado' : '') + '" id="recibo-' + esc(g.id) + '">' +
        '<div class="recibo__head"><div><p class="eyebrow">Recibo de egreso' + (cancel ? ' · CANCELADO' : '') + '</p>' +
        '<h3>' + esc(g.proveedor || '—') + '</h3>' +
        '<p class="muted" style="font-size:12.5px;margin-top:4px">' + esc(g.concepto) + '</p></div>' +
        '<div class="recibo__folio">Folio E-' + String(g.folioE || 0).padStart(4, '0') + '<br>' +
        esc(CC.fmt.fechaCorta(g.fecha)) + '<br>' + esc([g.metodo, g.cuenta === 'caja' ? 'Caja chica' : 'Banco'].join(' · ')) + '</div></div>' +
        '<div class="recibo__cuerpo"><dl class="datos">' +
        '<div><dt>Categoría</dt><dd>' + esc(g.categoria) + '</dd></div>' +
        (g.identificacion ? '<div><dt>Identificación</dt><dd class="mono">' + esc(g.identificacion) + '</dd></div>' : '') +
        (g.nota ? '<div><dt>Nota</dt><dd>' + esc(g.nota) + '</dd></div>' : '') +
        '</dl><div class="recibo__pruebas">' +
        '<div class="firma"><span class="firma__linea">' + firma + '</span>' +
        '<span class="firma__pie">Firma de quien recibe<br><strong>' + esc(g.proveedor) + '</strong></span></div>' +
        (g.fotoId ? '<div class="foto"><span class="eyebrow">Evidencia</span><span data-img="' + esc(g.fotoId) +
          '" data-alt="Evidencia" class="foto__hueco"><span class="muted" style="font-size:11.5px">cargando…</span></span></div>' : '') +
        '</div></div>' +
        '<div class="recibo__tot"><span>Cantidad entregada</span><strong>' + esc(CC.fmt.money2(g.monto)) + '</strong></div>' +
        '<div class="recibo__acciones noprint">' +
        (cancel ? '' : '<button class="btn btn--sm btn--soft" data-pdf="' + esc(g.id) + '">' + CC.ui.icono('imprimir', 'i--sm') + ' Descargar PDF</button>') +
        '<button class="btn btn--sm btn--ghost" data-corregir="' + esc(g.id) + '">' + (cancel ? 'Ver' : 'Corregir') + '</button>' +
        '</div></article>';
    }).join('') + '</div>');

    return out.join('');
  },

  montar: function (raiz) {
    pintarImagenes(raiz);
    raiz.querySelectorAll('[data-pdf]').forEach(function (b) {
      b.onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.reciboEgreso(b.getAttribute('data-pdf'))); };
    });
    raiz.querySelectorAll('[data-corregir]').forEach(function (b) {
      b.onclick = function () { CC.vistas.gastos.editar(b.getAttribute('data-corregir')); };
    });
  },

  nuevo: function () { CC.vistas.gastos.gastoConRecibo(); }
};
