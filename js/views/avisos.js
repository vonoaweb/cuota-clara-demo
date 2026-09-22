/* views/avisos.js — el tablero del condominio: lo que la administración
   comunica a todos los residentes. */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var PRIORIDADES = [
  ['alta', 'Urgente'],
  ['media', 'Importante'],
  ['normal', 'Informativo']
];

CC.vistas.avisos = {
  titulo: 'Avisos',
  sub: function () {
    var n = CC.Store.avisos().length;
    return n ? n + (n === 1 ? ' aviso publicado' : ' avisos publicados') : 'Sin avisos publicados';
  },
  acciones: function () {
    return [{ texto: 'Publicar aviso', icono: 'más', clase: 'btn', accion: 'nuevo' }];
  },

  render: function () {
    var esc = CC.ui.esc;
    var lista = CC.Store.avisos();

    if (!lista.length) {
      return '<div class="panelbox"><div class="empty">' +
        '<strong>Todavía no hay avisos</strong>' +
        '<p>Publica aquí lo que los vecinos necesitan saber: asambleas, cortes de agua, ' +
        'mantenimientos programados. Todos los ven en su portal.</p>' +
        '<button class="btn" data-accion="nuevo" style="margin-top:8px">Publicar el primero</button>' +
        '</div></div>';
    }

    return '<div class="avisos">' + lista.map(function (a) {
      var etiqueta = PRIORIDADES.filter(function (x) { return x[0] === a.prioridad; })[0];
      var clase = a.prioridad === 'alta' ? 'pill--crit' : a.prioridad === 'media' ? 'pill--warn' : 'pill--mute';
      return '<article class="aviso aviso--' + esc(a.prioridad) + '">' +
        '<div class="aviso__body">' +
        '<h4>' + esc(a.titulo) + '</h4>' +
        '<p>' + esc(a.cuerpo) + '</p>' +
        '<div class="aviso__meta">' +
        '<span class="pill ' + clase + '">' + esc(etiqueta ? etiqueta[1] : 'Informativo') + '</span>' +
        '<span>Publicado el ' + esc(CC.fmt.fecha(a.fecha)) + '</span>' +
        '</div></div>' +
        '<button class="iconbtn noprint" data-delaviso="' + esc(a.id) + '" title="Eliminar aviso">' +
        CC.ui.icono('cerrar', 'i--sm') + '</button>' +
        '</article>';
    }).join('') + '</div>';
  },

  montar: function (raiz) {
    raiz.querySelectorAll('[data-delaviso]').forEach(function (b) {
      b.onclick = function () {
        CC.ui.confirmar('Eliminar aviso',
          'El aviso deja de verse en el portal de los residentes.',
          'Eliminar', function () {
            CC.Store.borrarAviso(b.getAttribute('data-delaviso'));
            CC.ui.toast('Aviso eliminado');
          }, true);
      };
    });
  },

  nuevo: function () {
    var esc = CC.ui.esc;
    CC.ui.modal('Publicar aviso',
      '<label class="field"><span class="field__lab">Título</span>' +
      '<input class="input" id="aTitulo" placeholder="Asamblea ordinaria: domingo 5 de octubre"></label>' +

      '<label class="field" style="margin-top:14px"><span class="field__lab">Mensaje</span>' +
      '<textarea class="input" id="aCuerpo" rows="6" placeholder="Escribe el aviso como lo leería un vecino."></textarea></label>' +

      '<div class="formgrid" style="margin-top:14px">' +
      '<label class="field"><span class="field__lab">Prioridad</span>' +
      '<select class="input" id="aPrio">' + PRIORIDADES.map(function (x) {
        return '<option value="' + x[0] + '"' + (x[0] === 'normal' ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></label>' +
      '<label class="field"><span class="field__lab">Fecha</span>' +
      '<input class="input" id="aFecha" type="date" value="' + esc(CC.per.hoyISO()) + '"></label>' +
      '</div>' +

      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="aCancel">Cancelar</button>' +
      '<button type="button" class="btn" id="aOk">Publicar</button>' +
      '</div>',

      function (cuerpo) {
        cuerpo.querySelector('#aCancel').onclick = CC.ui.cerrarModal;
        cuerpo.querySelector('#aOk').onclick = function () {
          var titulo = cuerpo.querySelector('#aTitulo').value.trim();
          if (!titulo) { CC.ui.toast('El aviso necesita un título', 'crit'); return; }
          CC.Store.agregarAviso({
            titulo: titulo,
            cuerpo: cuerpo.querySelector('#aCuerpo').value.trim(),
            prioridad: cuerpo.querySelector('#aPrio').value,
            fecha: cuerpo.querySelector('#aFecha').value || CC.per.hoyISO()
          });
          CC.ui.cerrarModal();
          CC.ui.toast('Aviso publicado', 'good');
        };
      });
  }
};
