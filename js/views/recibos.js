/* views/recibos.js — comprobantes de pago en mano.
 *
 * El caso que lo motiva: llega el jardinero por su pago. Se captura en el
 * celular, firma con el dedo, se le toma foto al trabajo o a su identificacion
 * y se imprime o se guarda. Queda constancia de a quien se le pago y por que.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

/* Las imagenes se leen de IndexedDB despues de pintar; esto evita pedirlas dos
   veces en el mismo dibujado. */
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

CC.vistas.recibos = {
  titulo: 'Recibos de pago',
  sub: function () {
    var n = CC.Store.recibos().length;
    return n ? n + (n === 1 ? ' comprobante firmado' : ' comprobantes firmados')
             : 'Comprobantes de pago en mano';
  },
  acciones: function () {
    return [{ texto: 'Nuevo recibo', icono: 'mas', clase: 'btn', accion: 'nuevo' }];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var lista = CC.Store.recibos();

    if (!lista.length) {
      return '<div class="panelbox"><div class="empty">' +
        '<strong>Todavía no hay recibos</strong>' +
        '<p>Cuando alguien cobre en mano — el jardinero, el plomero, quien hizo un ' +
        'trabajo suelto — haz el comprobante aquí: firma con el dedo, toma la foto ' +
        'y queda guardado con folio.</p>' +
        '<button class="btn" data-accion="nuevo" style="margin-top:8px">Hacer el primero</button>' +
        '</div></div>';
    }

    var total = lista.reduce(function (a, r) { return a + (Number(r.monto) || 0); }, 0);
    var delPeriodo = lista.filter(function (r) { return r.periodo === ctx.periodo; });
    var totalPeriodo = delPeriodo.reduce(function (a, r) { return a + (Number(r.monto) || 0); }, 0);

    var out = [];

    out.push(CC.ui.stats([
      { lab: 'Recibos del periodo', val: String(delPeriodo.length), nota: '<span>' + esc(CC.fmt.periodo(ctx.periodo)) + '</span>' },
      { lab: 'Pagado en mano este mes', val: CC.fmt.money(totalPeriodo), nota: '<span>fuera de los contratos fijos</span>' },
      { lab: 'Comprobantes en total', val: String(lista.length), nota: '<span>' + esc(CC.fmt.money(total)) + ' acumulados</span>' }
    ]));

    out.push('<div class="reclista">' + lista.map(function (r) {
      var firma = r.firmaInline
        ? '<img src="' + esc(r.firmaInline) + '" alt="Firma de ' + esc(r.nombre) + '" class="firma__img">'
        : (r.firmaId ? '<span data-img="' + esc(r.firmaId) + '" data-alt="Firma"></span>' : '<span class="muted">Sin firma</span>');

      return '<article class="recibo recibo--comp" id="recibo-' + esc(r.id) + '">' +
        '<div class="recibo__head">' +
        '<div><p class="eyebrow">Recibo de pago</p>' +
        '<h3>' + esc(r.nombre) + '</h3>' +
        '<p class="muted" style="font-size:12.5px;margin-top:4px">' + esc(r.concepto) + '</p></div>' +
        '<div class="recibo__folio">' +
        'Folio ' + String(r.folio).padStart(4, '0') + '<br>' +
        esc(CC.fmt.fechaCorta(r.fecha)) + '<br>' +
        esc(r.metodo || '') + '</div>' +
        '</div>' +

        '<div class="recibo__cuerpo">' +
        '<dl class="datos">' +
        '<div><dt>Recibí de</dt><dd>' + esc(r.recibeDe || CC.Store.condominio().nombre) + '</dd></div>' +
        '<div><dt>Por concepto de</dt><dd>' + esc(r.concepto) + '</dd></div>' +
        (r.categoria ? '<div><dt>Servicio</dt><dd>' + esc(r.categoria) + '</dd></div>' : '') +
        (r.identificacion ? '<div><dt>Identificación</dt><dd class="mono">' + esc(r.identificacion) + '</dd></div>' : '') +
        (r.nota ? '<div><dt>Nota</dt><dd>' + esc(r.nota) + '</dd></div>' : '') +
        '</dl>' +

        '<div class="recibo__pruebas">' +
        '<div class="firma"><span class="firma__linea">' + firma + '</span>' +
        '<span class="firma__pie">Firma de quien recibe<br><strong>' + esc(r.nombre) + '</strong></span></div>' +
        (r.fotoId
          ? '<div class="foto"><span class="eyebrow">Evidencia</span>' +
            '<span data-img="' + esc(r.fotoId) + '" data-alt="Evidencia del pago" class="foto__hueco">' +
            '<span class="muted" style="font-size:11.5px">cargando…</span></span></div>'
          : '') +
        '</div>' +
        '</div>' +

        '<div class="recibo__tot">' +
        '<span>Cantidad recibida</span>' +
        '<strong>' + esc(CC.fmt.money2(r.monto)) + '</strong>' +
        '</div>' +

        '<div class="recibo__acciones noprint">' +
        '<button class="btn btn--sm btn--ghost" data-imprimir="' + esc(r.id) + '">' +
        CC.ui.icono('imprimir', 'i--sm') + ' Imprimir</button>' +
        '<button class="btn btn--sm btn--ghost" data-delrecibo="' + esc(r.id) + '">Eliminar</button>' +
        '</div>' +
        '</article>';
    }).join('') + '</div>');

    return out.join('');
  },

  montar: function (raiz) {
    pintarImagenes(raiz);

    raiz.querySelectorAll('[data-imprimir]').forEach(function (b) {
      b.onclick = function () {
        CC.vistas.recibos.imprimirUno(b.getAttribute('data-imprimir'));
      };
    });
    raiz.querySelectorAll('[data-delrecibo]').forEach(function (b) {
      b.onclick = function () {
        CC.ui.confirmar('Eliminar recibo',
          'Se borra el comprobante junto con su firma y su foto. No se puede deshacer.',
          'Eliminar', function () {
            CC.Store.borrarRecibo(b.getAttribute('data-delrecibo'));
            CC.ui.toast('Recibo eliminado');
          }, true);
      };
    });
  },

  /** Imprime un solo recibo, escondiendo los demas mientras dura la impresion. */
  imprimirUno: function (id) {
    var todos = document.querySelectorAll('.reclista .recibo');
    todos.forEach(function (el) {
      if (el.id !== 'recibo-' + id) el.classList.add('noprint');
    });
    window.print();
    setTimeout(function () {
      todos.forEach(function (el) { el.classList.remove('noprint'); });
    }, 500);
  },

  /* ---------- Captura ---------- */
  nuevo: function (ctx) {
    var esc = CC.ui.esc;
    var cats = CC.Store.categorias();
    var folio = CC.Store.siguienteFolio();

    CC.ui.modal('Recibo de pago — folio ' + String(folio).padStart(4, '0'),
      '<div class="formgrid">' +
      '<label class="field"><span class="field__lab">Quién recibe el pago</span>' +
      '<input class="input" id="rNombre" placeholder="Nombre completo" autocomplete="off"></label>' +

      '<label class="field"><span class="field__lab">Cantidad</span>' +
      '<input class="input num" id="rMonto" type="number" min="0" step="0.01" placeholder="0.00"></label>' +

      '<label class="field"><span class="field__lab">Fecha</span>' +
      '<input class="input" id="rFecha" type="date" value="' + esc(CC.per.hoyISO()) + '"></label>' +

      '<label class="field"><span class="field__lab">Forma de pago</span>' +
      '<select class="input" id="rMetodo">' +
      ['Efectivo', 'Transferencia', 'Cheque'].map(function (m) { return '<option>' + m + '</option>'; }).join('') +
      '</select></label>' +

      '<label class="field"><span class="field__lab">Servicio</span>' +
      '<select class="input" id="rCat"><option value="">Sin clasificar</option>' +
      cats.map(function (c) { return '<option value="' + esc(c.nombre) + '">' + esc(c.nombre) + '</option>'; }).join('') +
      '</select></label>' +

      '<label class="field"><span class="field__lab">Identificación (opcional)</span>' +
      '<input class="input mono" id="rIne" placeholder="INE, folio o teléfono"></label>' +
      '</div>' +

      '<label class="field" style="margin-top:14px"><span class="field__lab">Por concepto de</span>' +
      '<input class="input" id="rConcepto" placeholder="Poda de setos y limpieza de jardineras"></label>' +

      '<label class="field" style="margin-top:14px"><span class="field__lab">Nota interna (opcional)</span>' +
      '<input class="input" id="rNota" placeholder="Autorizado por el comité, trabajo fuera de contrato…"></label>' +

      '<div class="capturas">' +
      '<div class="captura">' +
      '<div class="captura__head"><span class="field__lab">Firma de quien recibe</span>' +
      '<button type="button" class="btn btn--sm btn--ghost" id="rLimpiar">Borrar</button></div>' +
      '<canvas id="rFirma" class="lienzo"></canvas>' +
      '<span class="field__hint">Firma con el dedo en el celular o con el mouse</span>' +
      '</div>' +

      '<div class="captura" id="rFotoCaja">' +
      '<div class="captura__head"><span class="field__lab">Foto (opcional)</span>' +
      '<button type="button" class="btn btn--sm btn--ghost" id="rQuitarFoto" hidden>Quitar</button></div>' +
      '<label class="dropfoto" for="rFoto" id="rFotoEtiqueta">' +
      CC.ui.icono('imprimir') +
      '<span>Tomar foto o elegir del carrete</span>' +
      '<small>La identificación o el trabajo terminado</small>' +
      '</label>' +
      '<input type="file" id="rFoto" accept="image/*" capture="environment" hidden>' +
      '<div id="rFotoPrev"></div>' +
      '</div>' +
      '</div>' +

      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="rCancel">Cancelar</button>' +
      '<button type="button" class="btn" id="rOk">Guardar recibo</button>' +
      '</div>',

      function (cuerpo) {
        var lienzo = cuerpo.querySelector('#rFirma');
        var firma = CC.Firma(lienzo);
        cuerpo.querySelector('#rLimpiar').onclick = function () { firma.limpiar(); };

        /* Foto: se comprime en cuanto se elige, para no cargar megabytes */
        var fotoDataURL = null;
        var entrada = cuerpo.querySelector('#rFoto');
        var prev = cuerpo.querySelector('#rFotoPrev');
        var etiqueta = cuerpo.querySelector('#rFotoEtiqueta');
        var quitar = cuerpo.querySelector('#rQuitarFoto');

        CC.Archivos.disponible().then(function (ok) {
          if (!ok) {
            cuerpo.querySelector('#rFotoCaja').innerHTML =
              '<div class="note note--demo"><div>Este navegador no deja guardar fotos. ' +
              'El recibo se guarda igual, con firma pero sin imagen.</div></div>';
          }
        });

        entrada.onchange = function () {
          var f = entrada.files && entrada.files[0];
          if (!f) return;
          CC.Archivos.comprimir(f, 1000, 0.65).then(function (dataURL) {
            fotoDataURL = dataURL;
            prev.innerHTML = '<img src="' + dataURL + '" alt="Vista previa" style="max-width:100%;border-radius:6px;display:block">';
            etiqueta.hidden = true;
            quitar.hidden = false;
          }, function (err) {
            CC.ui.toast(err.message || 'No se pudo leer la imagen', 'crit');
          });
        };

        quitar.onclick = function () {
          fotoDataURL = null;
          prev.innerHTML = '';
          etiqueta.hidden = false;
          quitar.hidden = true;
          entrada.value = '';
        };

        cuerpo.querySelector('#rCancel').onclick = CC.ui.cerrarModal;

        cuerpo.querySelector('#rOk').onclick = function () {
          var nombre = cuerpo.querySelector('#rNombre').value.trim();
          var concepto = cuerpo.querySelector('#rConcepto').value.trim();
          var monto = Number(cuerpo.querySelector('#rMonto').value);

          if (!nombre) { CC.ui.toast('Falta el nombre de quien recibe', 'crit'); return; }
          if (!concepto) { CC.ui.toast('Falta decir por qué es el pago', 'crit'); return; }
          if (!(monto > 0)) { CC.ui.toast('Captura una cantidad mayor a cero', 'crit'); return; }

          var boton = cuerpo.querySelector('#rOk');
          boton.disabled = true;
          boton.textContent = 'Guardando…';

          var firmaPNG = firma.aPNG();
          var tareas = [
            firmaPNG ? CC.Archivos.guardar(firmaPNG, 'firma') : Promise.resolve(null),
            fotoDataURL ? CC.Archivos.guardar(fotoDataURL, 'foto') : Promise.resolve(null)
          ];

          Promise.all(tareas).then(function (ids) {
            var fecha = cuerpo.querySelector('#rFecha').value || CC.per.hoyISO();
            CC.Store.agregarRecibo({
              fecha: fecha,
              periodo: CC.per.de(fecha),
              recibeDe: CC.Store.condominio().nombre,
              nombre: nombre,
              identificacion: cuerpo.querySelector('#rIne').value.trim(),
              concepto: concepto,
              categoria: cuerpo.querySelector('#rCat').value,
              monto: monto,
              metodo: cuerpo.querySelector('#rMetodo').value,
              firmaId: ids[0],
              firmaInline: null,
              fotoId: ids[1],
              nota: cuerpo.querySelector('#rNota').value.trim()
            });
            CC.ui.cerrarModal();
            CC.ui.toast('Recibo guardado' + (firmaPNG ? ' y firmado' : ''), 'good');
          });
        };
      });
  }
};
