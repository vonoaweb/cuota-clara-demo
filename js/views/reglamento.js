/* views/reglamento.js — el reglamento interno y el expediente del condominio.
 *
 * El reglamento se numera solo: los artículos se guardan como texto y la
 * numeración corrida se calcula al pintar, para que insertar uno a la mitad
 * no obligue a renumerar todo a mano. Está pensado para imprimirse y
 * repartirse, y para buscarle un artículo en medio de una discusión.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var busquedaRegl = '';

CC.vistas.reglamento = {
  titulo: 'Reglamento',
  sub: function () {
    var r = CC.Store.reglamento();
    var n = (r.capitulos || []).reduce(function (a, c) { return a + c.articulos.length; }, 0);
    return n
      ? n + ' artículos en ' + r.capitulos.length + ' capítulos' +
        (r.aprobado ? ' · aprobado el ' + CC.fmt.fecha(r.aprobado) : '')
      : 'Sin artículos capturados';
  },
  acciones: function () {
    return [
      { texto: 'Imprimir', icono: 'imprimir', clase: 'btn btn--ghost', accion: 'imprimir' },
      { texto: 'Nuevo capítulo', icono: 'mas', clase: 'btn btn--ghost', accion: 'nuevoCapitulo' },
      { texto: 'Agregar documento', icono: 'mas', clase: 'btn', accion: 'nuevoDocumento' }
    ];
  },

  render: function () {
    var esc = CC.ui.esc;
    var r = CC.Store.reglamento();
    var cond = CC.Store.condominio();
    var caps = r.capitulos || [];
    var out = [];

    /* --- Buscador: lo que de verdad se usa cuando hay un pleito --- */
    out.push('<div class="section__head noprint" style="align-items:center">' +
      '<div class="search"><svg class="i"><use href="#i-buscar"/></svg>' +
      '<input class="input" id="qRegl" type="search" placeholder="Buscar en el reglamento: mascotas, ruido, alberca…" ' +
      'value="' + esc(busquedaRegl) + '"></div>' +
      (busquedaRegl ? '<button class="btn btn--sm btn--ghost" id="qReglLimpiar">Ver todo</button>' : '') +
      '</div>');

    /* --- El documento --- */
    var termino = busquedaRegl.trim().toLowerCase();
    var numero = 0;
    var encontrados = 0;

    var cuerpo = caps.map(function (cap, ci) {
      var articulos = cap.articulos.map(function (texto) {
        numero++;
        return { n: numero, texto: texto };
      });

      var visibles = termino
        ? articulos.filter(function (a) {
            return a.texto.toLowerCase().indexOf(termino) >= 0 ||
                   cap.nombre.toLowerCase().indexOf(termino) >= 0;
          })
        : articulos;

      encontrados += visibles.length;
      if (termino && !visibles.length) return '';

      return '<section class="regl__cap">' +
        '<header class="regl__caphead">' +
        '<h4>' + esc(cap.nombre) + '</h4>' +
        '<button class="iconbtn noprint" data-editcap="' + ci + '" title="Editar capítulo">' +
        CC.ui.icono('ajustes', 'i--sm') + '</button>' +
        '</header>' +
        '<ol class="regl__arts">' + visibles.map(function (a) {
          var texto = esc(a.texto);
          if (termino) {
            // resaltar lo buscado sin romper el escapado
            texto = texto.replace(new RegExp('(' + termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
              '<mark>$1</mark>');
          }
          return '<li class="regl__art"><span class="regl__num">Artículo ' + a.n + '</span>' +
            '<p>' + texto + '</p></li>';
        }).join('') + '</ol>' +
        '</section>';
    }).join('');

    if (!caps.length) {
      out.push('<div class="panelbox"><div class="empty">' +
        '<strong>Todavía no hay reglamento</strong>' +
        '<p>Captura el reglamento interno por capítulos. Después se puede imprimir ' +
        'para repartirlo y los residentes lo ven desde su portal.</p>' +
        '<button class="btn" data-accion="nuevoCapitulo" style="margin-top:8px">Agregar el primer capítulo</button>' +
        '</div></div>');
    } else {
      out.push('<article class="regl">' +
        '<header class="regl__portada">' +
        '<p class="eyebrow">' + esc(cond.nombre || 'Condominio') + '</p>' +
        '<h2>' + esc(r.titulo || 'Reglamento Interno') + '</h2>' +
        (r.aprobado
          ? '<p class="regl__aprobado">Aprobado en asamblea el ' + esc(CC.fmt.fecha(r.aprobado)) + '</p>'
          : '') +
        (r.nota ? '<p class="regl__nota">' + esc(r.nota) + '</p>' : '') +
        '</header>' +
        (termino
          ? '<p class="regl__hallazgos noprint">' + encontrados +
            (encontrados === 1 ? ' artículo coincide' : ' artículos coinciden') +
            ' con “' + esc(busquedaRegl) + '”</p>'
          : '') +
        (cuerpo || '<div class="empty"><strong>Sin coincidencias</strong>' +
          '<p>Ningún artículo menciona lo que buscas.</p></div>') +
        '</article>');
    }

    /* --- Expediente --- */
    var docs = CC.Store.documentos();
    out.push('<div class="panelbox noprint">' +
      '<div class="panelbox__head"><h3>Expediente del condominio</h3>' +
      '<span class="eyebrow">' + docs.length + ' documentos</span></div>' +
      (docs.length
        ? '<div class="tablewrap"><table class="ledger">' +
          '<thead><tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th></th><th></th></tr></thead><tbody>' +
          docs.map(function (d) {
            return '<tr>' +
              '<td><div class="cellstack"><span class="strong">' + esc(d.nombre) + '</span>' +
              (d.nota ? '<small>' + esc(d.nota) + '</small>' : '') + '</div></td>' +
              '<td>' + CC.ui.pillLibre(d.tipo || 'Documento', 'pill--mute') + '</td>' +
              '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(CC.fmt.fechaCorta(d.fecha)) + '</td>' +
              '<td style="width:82px">' +
              (d.fotoId
                ? '<span data-img="' + esc(d.fotoId) + '" data-alt="Escaneo" class="doc__mini"></span>'
                : '<span class="muted" style="font-size:11px">sin escaneo</span>') + '</td>' +
              '<td class="r"><button class="iconbtn" data-deldoc="' + esc(d.id) + '" title="Quitar del expediente">' +
              CC.ui.icono('cerrar', 'i--sm') + '</button></td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="empty"><strong>Expediente vacío</strong>' +
          '<p>Guarda aquí la escritura del régimen, las actas de asamblea, las pólizas ' +
          'y los contratos. Puedes tomarles foto para tener el escaneo a la mano.</p>' +
          '<button class="btn" data-accion="nuevoDocumento" style="margin-top:8px">Agregar el primero</button></div>') +
      '</div>');

    return out.join('');
  },

  montar: function (raiz, ctx, redibujar) {
    if (CC.vistas.recibos && CC.vistas.recibos.montar) {
      // reutiliza el pintado diferido de imágenes
      raiz.querySelectorAll('[data-img]').forEach(function (hueco) {
        var id = hueco.getAttribute('data-img');
        CC.Archivos.leer(id).then(function (dataURL) {
          if (!dataURL || !hueco.isConnected) return;
          var img = new Image();
          img.src = dataURL;
          img.alt = hueco.getAttribute('data-alt') || '';
          img.style.cssText = 'width:100%;border-radius:4px;display:block';
          hueco.appendChild(img);
        });
      });
    }

    var q = raiz.querySelector('#qRegl');
    if (q) q.oninput = function () { busquedaRegl = q.value; redibujar(true); };

    var limpiar = raiz.querySelector('#qReglLimpiar');
    if (limpiar) limpiar.onclick = function () { busquedaRegl = ''; redibujar(); };

    raiz.querySelectorAll('[data-editcap]').forEach(function (b) {
      b.onclick = function () {
        CC.vistas.reglamento.editarCapitulo(Number(b.getAttribute('data-editcap')));
      };
    });

    raiz.querySelectorAll('[data-deldoc]').forEach(function (b) {
      b.onclick = function () {
        CC.ui.confirmar('Quitar del expediente',
          'El documento y su escaneo se borran de la aplicación. El papel original no se toca.',
          'Quitar', function () {
            CC.Store.borrarDocumento(b.getAttribute('data-deldoc'));
            CC.ui.toast('Documento quitado');
          }, true);
      };
    });
  },

  imprimir: function () { window.print(); },

  /* ---------- Capítulos ---------- */
  nuevoCapitulo: function () {
    CC.ui.modal('Nuevo capítulo',
      '<label class="field"><span class="field__lab">Nombre del capítulo</span>' +
      '<input class="input" id="cNombre" placeholder="Mascotas, Estacionamiento, Sanciones…"></label>' +
      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="cCancel">Cancelar</button>' +
      '<button type="button" class="btn" id="cOk">Agregar</button></div>',
      function (cuerpo) {
        cuerpo.querySelector('#cCancel').onclick = CC.ui.cerrarModal;
        cuerpo.querySelector('#cOk').onclick = function () {
          var n = cuerpo.querySelector('#cNombre').value.trim();
          if (!n) { CC.ui.toast('Ponle nombre al capítulo', 'crit'); return; }
          CC.Store.agregarCapitulo(n);
          CC.ui.cerrarModal();
          CC.ui.toast('Capítulo agregado', 'good');
        };
      });
  },

  editarCapitulo: function (i) {
    var cap = CC.Store.reglamento().capitulos[i];
    if (!cap) return;
    var esc = CC.ui.esc;

    CC.ui.modal('Editar: ' + cap.nombre,
      '<label class="field"><span class="field__lab">Nombre del capítulo</span>' +
      '<input class="input" id="eNombre" value="' + esc(cap.nombre) + '"></label>' +
      '<label class="field" style="margin-top:14px"><span class="field__lab">Artículos</span>' +
      '<textarea class="input" id="eArts" rows="14" style="font-size:13px">' +
      esc(cap.articulos.join('\n\n')) + '</textarea>' +
      '<span class="field__hint">Un artículo por bloque, separados por un renglón en blanco. ' +
      'La numeración corrida se pone sola.</span></label>' +
      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="eBorrar" style="margin-right:auto">Borrar capítulo</button>' +
      '<button type="button" class="btn btn--ghost" id="eCancel">Cancelar</button>' +
      '<button type="button" class="btn" id="eOk">Guardar</button></div>',
      function (cuerpo) {
        cuerpo.querySelector('#eCancel').onclick = CC.ui.cerrarModal;

        cuerpo.querySelector('#eBorrar').onclick = function () {
          CC.ui.confirmar('Borrar capítulo',
            'Se borra “' + cap.nombre + '” con todos sus artículos.',
            'Borrar', function () {
              CC.Store.borrarCapitulo(i);
              CC.ui.cerrarModal();
              CC.ui.toast('Capítulo borrado');
            }, true);
        };

        cuerpo.querySelector('#eOk').onclick = function () {
          var nombre = cuerpo.querySelector('#eNombre').value.trim();
          var arts = cuerpo.querySelector('#eArts').value
            .split(/\n\s*\n/)
            .map(function (t) { return t.trim().replace(/\s*\n\s*/g, ' '); })
            .filter(Boolean);
          if (!nombre) { CC.ui.toast('El capítulo necesita nombre', 'crit'); return; }
          CC.Store.guardarCapitulo(i, nombre, arts);
          CC.ui.cerrarModal();
          CC.ui.toast(arts.length + ' artículos guardados', 'good');
        };
      });
  },

  /* ---------- Expediente ---------- */
  nuevoDocumento: function () {
    var esc = CC.ui.esc;
    CC.ui.modal('Agregar al expediente',
      '<div class="formgrid">' +
      '<label class="field"><span class="field__lab">Nombre</span>' +
      '<input class="input" id="dNombre" placeholder="Acta de asamblea ordinaria"></label>' +
      '<label class="field"><span class="field__lab">Tipo</span>' +
      '<select class="input" id="dTipo">' +
      ['Acta', 'Escritura', 'Póliza', 'Contrato', 'Dictamen', 'Factura', 'Otro']
        .map(function (t) { return '<option>' + t + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="field"><span class="field__lab">Fecha</span>' +
      '<input class="input" id="dFecha" type="date" value="' + esc(CC.per.hoyISO()) + '"></label>' +
      '</div>' +
      '<label class="field" style="margin-top:14px"><span class="field__lab">Nota</span>' +
      '<input class="input" id="dNota" placeholder="Dónde está el original, qué se acordó, cuándo se renueva…"></label>' +

      '<div class="captura" style="margin-top:16px" id="dFotoCaja">' +
      '<div class="captura__head"><span class="field__lab">Escaneo o foto (opcional)</span>' +
      '<button type="button" class="btn btn--sm btn--ghost" id="dQuitarFoto" hidden>Quitar</button></div>' +
      '<label class="dropfoto" for="dFoto" id="dFotoEtiqueta">' +
      CC.ui.icono('imprimir') +
      '<span>Tomar foto del documento</span>' +
      '<small>Queda a la mano sin buscar el papel</small></label>' +
      '<input type="file" id="dFoto" accept="image/*" capture="environment" hidden>' +
      '<div id="dFotoPrev"></div>' +
      '</div>' +

      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="dCancel">Cancelar</button>' +
      '<button type="button" class="btn" id="dOk">Guardar</button></div>',

      function (cuerpo) {
        var fotoDataURL = null;
        var entrada = cuerpo.querySelector('#dFoto');
        var prev = cuerpo.querySelector('#dFotoPrev');
        var etiqueta = cuerpo.querySelector('#dFotoEtiqueta');
        var quitar = cuerpo.querySelector('#dQuitarFoto');

        CC.Archivos.disponible().then(function (ok) {
          if (!ok) cuerpo.querySelector('#dFotoCaja').hidden = true;
        });

        entrada.onchange = function () {
          var f = entrada.files && entrada.files[0];
          if (!f) return;
          // los documentos se leen: conviene más resolución que en una foto de obra
          CC.Archivos.comprimir(f, 1600, 0.7).then(function (dataURL) {
            fotoDataURL = dataURL;
            prev.innerHTML = '<img src="' + dataURL + '" alt="Vista previa" style="max-width:100%;border-radius:6px;display:block">';
            etiqueta.hidden = true;
            quitar.hidden = false;
          }, function (err) { CC.ui.toast(err.message || 'No se pudo leer la imagen', 'crit'); });
        };

        quitar.onclick = function () {
          fotoDataURL = null; prev.innerHTML = '';
          etiqueta.hidden = false; quitar.hidden = true; entrada.value = '';
        };

        cuerpo.querySelector('#dCancel').onclick = CC.ui.cerrarModal;

        cuerpo.querySelector('#dOk').onclick = function () {
          var nombre = cuerpo.querySelector('#dNombre').value.trim();
          if (!nombre) { CC.ui.toast('Ponle nombre al documento', 'crit'); return; }

          var boton = cuerpo.querySelector('#dOk');
          boton.disabled = true; boton.textContent = 'Guardando…';

          (fotoDataURL ? CC.Archivos.guardar(fotoDataURL, 'doc') : Promise.resolve(null))
            .then(function (fotoId) {
              CC.Store.agregarDocumento({
                nombre: nombre,
                tipo: cuerpo.querySelector('#dTipo').value,
                fecha: cuerpo.querySelector('#dFecha').value || CC.per.hoyISO(),
                nota: cuerpo.querySelector('#dNota').value.trim(),
                fotoId: fotoId
              });
              CC.ui.cerrarModal();
              CC.ui.toast('Guardado en el expediente', 'good');
            });
        };
      });
  }
};
