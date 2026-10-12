/* views/caja.js — caja chica: el efectivo que maneja la administración.
 *
 * El caso que lo motiva: cada semana se les paga en efectivo a los de la
 * basura. Se captura el egreso, firma quien recibe y el recibo con su folio y
 * su concepto se descarga solo, en PDF. Lo mismo con los ingresos en efectivo
 * (una tarjeta de acceso, la renta del salón): el vecino se lleva su recibo.
 *
 * La caja tiene un fondo fijo. Cuando se gasta, se repone desde la cuenta del
 * condominio y esa reposición aparece en Gastos como "Caja chica".
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var ATAJOS_CAJA = {
  egreso: [
    ['Basura', 'Pago semanal a recolectores de basura'],
    ['Agua', 'Garrafones de agua para caseta'],
    ['Limpieza', 'Material de limpieza'],
    ['Papelería', 'Papelería y copias'],
    ['Ferretería', 'Material de ferretería'],
    ['Otro', '']
  ],
  ingreso: [
    ['Tarjeta de acceso', 'Venta de tarjeta de acceso'],
    ['Salón', 'Renta del salón de eventos'],
    ['Multa', 'Pago de multa por reglamento'],
    ['Otro', '']
  ]
};

/** Captura de un egreso o un ingreso, con firma y foto opcionales. */
function formularioCaja(tipo) {
  var esc = CC.ui.esc;
  var egreso = tipo === 'egreso';
  var folio = CC.Comprobantes.folio('C-', (CC.Store.estado().meta.folioCaja || 0) + 1);
  var casas = CC.Store.unidades().slice().sort(CC.Model.ordenCasas);

  CC.ui.modal((egreso ? 'Egreso de caja chica' : 'Ingreso a caja chica') + ' — folio ' + folio,
    '<div class="chips" id="kAtajos" style="margin-bottom:14px">' + ATAJOS_CAJA[tipo].map(function (a, i) {
      return '<button type="button" class="chip' + (i === 0 ? ' is-on' : '') + '" data-atajo="' + i + '">' + esc(a[0]) + '</button>';
    }).join('') + '</div>' +

    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">' + (egreso ? 'Quién recibe el dinero' : 'Quién entrega el dinero') + '</span>' +
    '<input class="input" id="kNombre" placeholder="Nombre completo" autocomplete="off"></label>' +
    (egreso ? '' :
      '<label class="field"><span class="field__lab">Casa (opcional)</span>' +
      '<select class="input" id="kCasa"><option value="">No es de una casa</option>' +
      casas.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.clave) + ' — ' + esc(u.propietario) + '</option>'; }).join('') +
      '</select></label>') +
    '<label class="field"><span class="field__lab">Cantidad</span>' +
    '<input class="input num" id="kMonto" type="number" min="0" step="0.01" placeholder="0.00"></label>' +
    '<label class="field"><span class="field__lab">Fecha</span>' +
    '<input class="input" id="kFecha" type="date" value="' + esc(CC.per.hoyISO()) + '"></label>' +
    (egreso ?
      '<label class="field"><span class="field__lab">Identificación (opcional)</span>' +
      '<input class="input mono" id="kIne" placeholder="INE, gafete o teléfono"></label>' : '') +
    '</div>' +

    '<label class="field" style="margin-top:14px"><span class="field__lab">Por concepto de</span>' +
    '<input class="input" id="kConcepto"><span class="field__hint">Es lo que dirá el recibo</span></label>' +

    '<label class="field" style="margin-top:14px"><span class="field__lab">Nota (opcional)</span>' +
    '<input class="input" id="kNota" placeholder="' + (egreso ? 'Ruta 14, camión municipal' : 'Pagó en efectivo en la caseta') + '"></label>' +

    '<div class="capturas">' +
    '<div class="captura">' +
    '<div class="captura__head"><span class="field__lab">' + (egreso ? 'Firma de quien recibe' : 'Firma de quien entrega (opcional)') + '</span>' +
    '<button type="button" class="btn btn--sm btn--ghost" id="kLimpiar">Borrar</button></div>' +
    '<canvas id="kFirma" class="lienzo"></canvas>' +
    '<span class="field__hint">Con el dedo en el celular o con el mouse</span></div>' +
    '<div class="captura" id="kFotoCaja">' +
    '<div class="captura__head"><span class="field__lab">Foto (opcional)</span>' +
    '<button type="button" class="btn btn--sm btn--ghost" id="kQuitarFoto" hidden>Quitar</button></div>' +
    '<label class="dropfoto" for="kFoto" id="kFotoEtiqueta">' + CC.ui.icono('imprimir') +
    '<span>Tomar foto o elegir del carrete</span><small>' + (egreso ? 'El ticket o la nota' : 'El comprobante') + '</small></label>' +
    '<input type="file" id="kFoto" accept="image/*" capture="environment" hidden>' +
    '<div id="kFotoPrev"></div></div>' +
    '</div>' +

    '<div class="formactions">' +
    '<button type="button" class="btn btn--ghost" id="kCancel">Cancelar</button>' +
    '<button type="button" class="btn" id="kOk">Guardar y descargar recibo</button>' +
    '</div>',

    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      var atajo = 0;
      var concepto = q('kConcepto');

      function ponerAtajo(i) {
        atajo = i;
        cuerpo.querySelectorAll('[data-atajo]').forEach(function (b) {
          b.classList.toggle('is-on', Number(b.getAttribute('data-atajo')) === i);
        });
        concepto.value = ATAJOS_CAJA[tipo][i][1];
        if (!concepto.value) concepto.focus();
      }
      cuerpo.querySelectorAll('[data-atajo]').forEach(function (b) {
        b.onclick = function () { ponerAtajo(Number(b.getAttribute('data-atajo'))); };
      });
      ponerAtajo(0);

      var casa = q('kCasa');
      if (casa) casa.onchange = function () {
        var u = CC.Store.unidad(casa.value);
        if (u && !q('kNombre').value) q('kNombre').value = u.inquilino || u.propietario || '';
      };

      var firma = CC.Firma(q('kFirma'));
      q('kLimpiar').onclick = function () { firma.limpiar(); };

      var fotoDataURL = null;
      var entrada = q('kFoto'), prev = q('kFotoPrev'), etiqueta = q('kFotoEtiqueta'), quitar = q('kQuitarFoto');
      CC.Archivos.disponible().then(function (ok) {
        if (!ok) q('kFotoCaja').innerHTML = '<div class="note note--demo"><div>Este navegador no deja guardar fotos. ' +
          'El recibo se guarda igual, sin imagen.</div></div>';
      });
      entrada.onchange = function () {
        var f = entrada.files && entrada.files[0];
        if (!f) return;
        CC.Archivos.comprimir(f, 1000, 0.65).then(function (dataURL) {
          fotoDataURL = dataURL;
          prev.innerHTML = '<img src="' + dataURL + '" alt="Vista previa" style="max-width:100%;border-radius:6px;display:block">';
          etiqueta.hidden = true;
          quitar.hidden = false;
        }, function (err) { CC.ui.toast(err.message || 'No se pudo leer la imagen', 'crit'); });
      };
      quitar.onclick = function () {
        fotoDataURL = null; prev.innerHTML = ''; etiqueta.hidden = false; quitar.hidden = true; entrada.value = '';
      };

      q('kCancel').onclick = CC.ui.cerrarModal;
      q('kOk').onclick = function () {
        var nombre = q('kNombre').value.trim();
        var monto = Number(q('kMonto').value);
        var texto = concepto.value.trim();
        if (!nombre) { CC.ui.toast(egreso ? 'Falta quién recibe el dinero' : 'Falta quién entrega el dinero', 'crit'); return; }
        if (!(monto > 0)) { CC.ui.toast('Captura una cantidad mayor a cero', 'crit'); return; }
        if (!texto) { CC.ui.toast('Falta el concepto: es lo que dirá el recibo', 'crit'); return; }
        if (egreso && monto > CC.Model.cajaChica().saldo + 0.005) {
          CC.ui.toast('En la caja solo hay ' + CC.fmt.money2(CC.Model.cajaChica().saldo) + '. Primero repón el fondo.', 'crit');
          return;
        }

        var boton = q('kOk');
        boton.disabled = true;
        boton.textContent = 'Guardando…';
        var firmaPNG = firma.aPNG();
        Promise.all([
          firmaPNG ? CC.Archivos.guardar(firmaPNG, 'firma') : Promise.resolve(null),
          fotoDataURL ? CC.Archivos.guardar(fotoDataURL, 'foto') : Promise.resolve(null)
        ]).then(function (ids) {
          var fecha = q('kFecha').value || CC.per.hoyISO();
          var m = CC.Store.agregarMovCaja({
            tipo: tipo, fecha: fecha, periodo: CC.per.de(fecha),
            concepto: texto, categoria: ATAJOS_CAJA[tipo][atajo][0] === 'Otro' ? '' : ATAJOS_CAJA[tipo][atajo][0],
            nombre: nombre, unidadId: casa ? casa.value || null : null,
            identificacion: q('kIne') ? q('kIne').value.trim() : '',
            monto: monto, metodo: 'Efectivo',
            firmaId: ids[0], fotoId: ids[1],
            // si el navegador no deja guardar imágenes aparte, la firma va dentro del registro
            firmaInline: firmaPNG && !ids[0] ? firmaPNG : null,
            nota: q('kNota').value.trim()
          });
          CC.ui.cerrarModal();
          CC.Comprobantes.descargar(CC.Comprobantes.reciboCaja(m.id), true).then(function (r) {
            if (r) CC.ui.toast('Guardado. Recibo ' + CC.Comprobantes.folio('C-', m.folio) + ' descargado', 'good');
          });
        });
      };
    });
}

CC.vistas.caja = {
  titulo: 'Caja chica',
  sub: function () {
    var k = CC.Model.cajaChica();
    return CC.fmt.money2(k.saldo) + ' en caja · fondo de ' + CC.fmt.money(k.fondo);
  },
  acciones: function () {
    return [
      { texto: 'Egreso', icono: 'mas', clase: 'btn', accion: 'egreso' },
      { texto: 'Ingreso', icono: 'mas', clase: 'btn btn--ghost', accion: 'ingreso' },
      { texto: 'Reponer', icono: 'gastos', clase: 'btn btn--ghost', accion: 'reponer' }
    ];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var p = ctx.periodo;
    var k = CC.Model.cajaChica();
    var delMes = k.filas.filter(function (f) { return f.mov.periodo === p; });
    var sumaTipo = function (t) {
      return delMes.filter(function (f) { return f.mov.tipo === t; })
        .reduce(function (a, f) { return a + (Number(f.mov.monto) || 0); }, 0);
    };
    var egresos = sumaTipo('egreso'), ingresos = sumaTipo('ingreso');
    var basura = delMes.filter(function (f) { return f.mov.tipo === 'egreso' && f.mov.categoria === 'Basura'; })
      .reduce(function (a, f) { return a + (Number(f.mov.monto) || 0); }, 0);
    var porReponer = Math.max(0, k.fondo - k.saldo);
    var out = [];

    out.push(CC.ui.stats([
      {
        lab: 'En caja ahora', val: CC.fmt.money2(k.saldo),
        tono: k.fondo && k.saldo < k.fondo * 0.25 ? 'crit' : 'good',
        nota: '<span>de un fondo de ' + esc(CC.fmt.money(k.fondo)) + '</span>'
      },
      {
        lab: 'Salió este mes', val: CC.fmt.money2(egresos),
        nota: '<span>' + (basura ? esc(CC.fmt.money(basura)) + ' a la basura' : esc(CC.fmt.periodo(p))) + '</span>'
      },
      { lab: 'Entró este mes', val: CC.fmt.money2(ingresos), nota: '<span>en efectivo</span>' },
      {
        lab: 'Por reponer', val: CC.fmt.money2(porReponer), tono: porReponer > 0 ? 'warn' : 'good',
        nota: '<span>para volver al fondo</span>'
      }
    ]));

    if (k.fondo && k.saldo < k.fondo * 0.25) {
      out.push('<div class="cta"><div class="cta__txt"><strong>Queda poco efectivo.</strong> ' +
        'Al reponer ' + esc(CC.fmt.money2(porReponer)) + ' la caja vuelve a ' + esc(CC.fmt.money(k.fondo)) +
        ' y la reposición queda en Gastos.</div>' +
        '<button class="btn" data-accion="reponer">Reponer caja</button></div>');
    }

    var filas = delMes.slice().reverse().map(function (f) {
      var m = f.mov;
      var casa = m.unidadId ? CC.Store.unidad(m.unidadId) : null;
      var etiqueta = m.tipo === 'egreso' ? ['Egreso', 'pill--warn'] : m.tipo === 'ingreso' ? ['Ingreso', 'pill--good'] : ['Reposición', 'pill--mute'];
      return '<tr>' +
        '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(CC.Comprobantes.folio('C-', m.folio)) +
        '<div class="muted">' + esc(CC.fmt.fechaCorta(m.fecha)) + '</div></td>' +
        '<td><div class="cellstack"><span>' + esc(m.concepto) + '</span>' +
        '<small>' + esc([m.nombre, casa ? 'casa ' + casa.clave : '', m.categoria].filter(Boolean).join(' · ')) + '</small></div></td>' +
        '<td class="c"><span class="pill pill--flat ' + etiqueta[1] + '">' + etiqueta[0] + '</span></td>' +
        '<td class="r" style="color:var(--good)">' + (m.tipo !== 'egreso' ? esc(CC.fmt.money2(m.monto)) : '') + '</td>' +
        '<td class="r" style="color:var(--crit)">' + (m.tipo === 'egreso' ? esc(CC.fmt.money2(m.monto)) : '') + '</td>' +
        '<td class="r strong">' + esc(CC.fmt.money2(f.saldo)) + '</td>' +
        '<td class="r noprint" style="white-space:nowrap">' +
        '<button class="btn btn--sm btn--soft" data-pdfcaja="' + esc(m.id) + '" title="Descargar recibo en PDF">' +
        CC.ui.icono('imprimir', 'i--sm') + ' Recibo</button> ' +
        '<button class="iconbtn" data-delcaja="' + esc(m.id) + '" title="Eliminar">' + CC.ui.icono('cerrar', 'i--sm') + '</button>' +
        '</td></tr>';
    }).join('');

    out.push('<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Movimientos de ' + esc(CC.fmt.periodo(p)) + '</h3>' +
      '<span class="eyebrow">' + delMes.length + ' movimientos</span></div>' +
      (delMes.length
        ? '<div class="tablewrap"><table class="ledger">' +
          '<thead><tr><th>Folio</th><th>Concepto</th><th class="c">Tipo</th><th class="r">Entra</th><th class="r">Sale</th>' +
          '<th class="r">Saldo</th><th class="noprint"></th></tr></thead><tbody>' + filas + '</tbody>' +
          '<tfoot><tr><td colspan="3">Totales del mes</td>' +
          '<td class="r">' + esc(CC.fmt.money2(delMes.filter(function (f) { return f.mov.tipo !== 'egreso'; })
            .reduce(function (a, f) { return a + f.mov.monto; }, 0))) + '</td>' +
          '<td class="r">' + esc(CC.fmt.money2(egresos)) + '</td><td colspan="2"></td></tr></tfoot>' +
          '</table></div>'
        : '<div class="empty"><strong>Sin movimientos en ' + esc(CC.fmt.periodo(p)) + '</strong>' +
          '<p>Cuando le pagues a los de la basura o recibas efectivo, captúralo aquí: el recibo sale solo.</p>' +
          '<button class="btn" data-accion="egreso" style="margin-top:8px">Registrar un egreso</button></div>') +
      '</div>');

    return out.join('');
  },

  montar: function (raiz) {
    raiz.querySelectorAll('[data-pdfcaja]').forEach(function (b) {
      b.onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.reciboCaja(b.getAttribute('data-pdfcaja'))); };
    });
    raiz.querySelectorAll('[data-delcaja]').forEach(function (b) {
      b.onclick = function () {
        var m = CC.Store.movCaja(b.getAttribute('data-delcaja'));
        CC.ui.confirmar('Eliminar movimiento',
          'Se borra el movimiento con su firma y su foto, y el saldo de la caja se recalcula.' +
          (m && m.gastoId ? ' También se quita la reposición de Gastos.' : ''),
          'Eliminar', function () {
            CC.Store.borrarMovCaja(m.id);
            CC.ui.toast('Movimiento eliminado');
          }, true);
      };
    });
  },

  egreso: function () { formularioCaja('egreso'); },
  ingreso: function () { formularioCaja('ingreso'); },

  /** Repone el fondo desde la cuenta del condominio; queda como gasto "Caja chica". */
  reponer: function () {
    var esc = CC.ui.esc;
    var k = CC.Model.cajaChica();
    var falta = Math.max(0, Math.round((k.fondo - k.saldo) * 100) / 100);

    CC.ui.modal('Reponer caja chica',
      '<p class="field__hint" style="margin-bottom:12px">Hay ' + esc(CC.fmt.money2(k.saldo)) + ' en caja. ' +
      'Con la reposición vuelve al fondo de ' + esc(CC.fmt.money(k.fondo)) + '. ' +
      'El dinero sale de la cuenta del condominio y aparece en Gastos.</p>' +
      '<div class="formgrid">' +
      '<label class="field"><span class="field__lab">Monto a reponer</span>' +
      '<input class="input num" id="kMonto" type="number" min="0" step="0.01" value="' + esc(falta.toFixed(2)) + '"></label>' +
      '<label class="field"><span class="field__lab">Fecha</span>' +
      '<input class="input" id="kFecha" type="date" value="' + esc(CC.per.hoyISO()) + '"></label>' +
      '<label class="field"><span class="field__lab">Cómo sale</span>' +
      '<select class="input" id="kMetodo"><option>Retiro de la cuenta</option><option>Cheque</option><option>Transferencia</option></select></label>' +
      '</div>' +
      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="kCancel">Cancelar</button>' +
      '<button type="button" class="btn" id="kOk">Reponer</button></div>',
      function (cuerpo) {
        cuerpo.querySelector('#kCancel').onclick = CC.ui.cerrarModal;
        cuerpo.querySelector('#kOk').onclick = function () {
          var monto = Number(cuerpo.querySelector('#kMonto').value);
          if (!(monto > 0)) { CC.ui.toast('Captura un monto mayor a cero', 'crit'); return; }
          var fecha = cuerpo.querySelector('#kFecha').value || CC.per.hoyISO();
          var metodo = cuerpo.querySelector('#kMetodo').value;
          var g = CC.Store.agregarGasto({
            periodo: CC.per.de(fecha), fecha: fecha, categoria: 'Caja chica',
            proveedor: 'Reposición de fondo', concepto: 'Reposición de caja chica',
            monto: monto, estado: 'pagado', metodo: metodo, folio: ''
          });
          CC.Store.agregarMovCaja({
            tipo: 'reposicion', fecha: fecha, periodo: CC.per.de(fecha),
            concepto: 'Reposición de caja chica', categoria: '', nombre: '',
            monto: monto, metodo: metodo, gastoId: g.id, nota: ''
          });
          CC.ui.cerrarModal();
          CC.ui.toast('Caja repuesta con ' + CC.fmt.money2(monto), 'good');
        };
      });
  }
};
