/* views/reservas.js — apartar las canchas (y cualquier área común que se aparte).
 *
 * El vecino pide su hora por WhatsApp o en la caseta y la administración la
 * aparta aquí. El sistema cuida las reglas del reglamento: el horario, las
 * horas por casa al día, los días de anticipación y que una casa con adeudo
 * largo no aparte. La agenda del día se imprime para el guardia.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var diaReservas = null;   // fecha que se está viendo (estado de pantalla)

function nombreDia(iso, largo) {
  var d = new Date(iso + 'T12:00:00');
  var t = d.toLocaleDateString('es-MX', largo ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short' });
  return t.charAt(0).toUpperCase() + t.slice(1).replace('.', '');
}

function finDe(r) { return CC.Model.aHora(CC.Model.aMin(r.hora) + 60 * (Number(r.horas) || 1)); }

/** Reglas del área en una línea, como las diría el reglamento. */
function reglasDe(a) {
  return a.nombre + ': de ' + (a.abre || '07:00') + ' a ' + (a.cierra || '22:00') + ' h · máximo ' + (a.maxHorasDia || 2) +
    (Number(a.maxHorasDia) === 1 ? ' hora' : ' horas') + ' al día por casa · se aparta con hasta ' +
    (a.anticipacionDias || 7) + ' días' +
    (Number(a.costo) ? ' · renta ' + CC.fmt.money(a.costo) : '') +
    (Number(a.deposito) ? ' + depósito ' + CC.fmt.money(a.deposito) : '') +
    (a.mesesBloqueo ? ' · no aparta quien deba ' + a.mesesBloqueo + ' meses o más' : '');
}

/** Ventana para apartar. pre: {unidadId, amenidadId, fecha, hora, fijaCasa}. */
function formularioReserva(pre) {
  pre = pre || {};
  var esc = CC.ui.esc;
  var ams = CC.Store.amenidades();
  if (!ams.length) { CC.ui.toast('Primero da de alta las canchas en Ajustes', 'crit'); return; }
  var casas = CC.Store.unidades().slice().sort(CC.Model.ordenCasas);
  var hoy = CC.per.hoyISO();
  var a0 = CC.Store.amenidad(pre.amenidadId) || ams[0];
  var fijo = pre.fijaCasa ? CC.Store.unidad(pre.unidadId) : null;

  CC.ui.modal(fijo ? 'Apartar cancha — casa ' + fijo.clave : 'Apartar cancha',
    '<div class="formgrid">' +
    (fijo ? '' :
      '<label class="field"><span class="field__lab">Casa</span>' +
      '<select class="input" id="rvCasa"><option value="">Elige la casa…</option>' + casas.map(function (u) {
        return '<option value="' + esc(u.id) + '"' + (u.id === pre.unidadId ? ' selected' : '') + '>' +
          esc(u.clave) + ' — ' + esc(u.inquilino || u.propietario || '') + '</option>';
      }).join('') + '</select></label>') +
    '<label class="field"><span class="field__lab">Cancha</span>' +
    '<select class="input" id="rvAme">' + ams.map(function (a) {
      return '<option value="' + esc(a.id) + '"' + (a.id === a0.id ? ' selected' : '') + '>' + esc(a.nombre) + '</option>';
    }).join('') + '</select></label>' +
    '<label class="field"><span class="field__lab">Día</span>' +
    '<input class="input" id="rvFecha" type="date" min="' + esc(hoy) + '" value="' + esc(pre.fecha || hoy) + '"></label>' +
    '<label class="field"><span class="field__lab">Hora</span><select class="input" id="rvHora"></select></label>' +
    '<label class="field"><span class="field__lab">Cuánto tiempo</span>' +
    '<select class="input" id="rvHoras"></select></label>' +
    '<label class="field"><span class="field__lab">Quién juega (opcional)</span>' +
    '<input class="input" id="rvNombre" placeholder="Nombre de quien va a jugar"></label>' +
    '</div>' +
    '<div class="rvmsg" id="rvMsg"></div>' +
    '<p class="field__hint" id="rvReglas"></p>' +
    '<div class="formactions">' +
    '<button type="button" class="btn btn--ghost" id="rvCancel">Cancelar</button>' +
    '<button type="button" class="btn" id="rvOk">Apartar</button>' +
    '</div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };

      function llenarHoras() {
        var a = CC.Store.amenidad(q('rvAme').value);
        var actual = q('rvHora').value || pre.hora;
        q('rvHora').innerHTML = CC.Model.horasDe(a).map(function (h) {
          var o = CC.Model.ocupada(a.id, q('rvFecha').value, h);
          var ou = o ? CC.Store.unidad(o.unidadId) : null;
          return '<option value="' + h + '"' + (h === actual ? ' selected' : '') + '>' + h +
            (o ? ' · ocupada' + (ou ? ' (' + ou.clave + ')' : '') : '') + '</option>';
        }).join('');
        q('rvReglas').textContent = reglasDe(a);
        var max = Math.min(Number(a.maxHorasDia) || 2, 8), dur = Number(q('rvHoras').value) || 1;
        var opciones = '';
        for (var k = 1; k <= max; k++) {
          opciones += '<option value="' + k + '"' + (k === Math.min(dur, max) ? ' selected' : '') + '>' + k + (k === 1 ? ' hora' : ' horas') + '</option>';
        }
        q('rvHoras').innerHTML = opciones;
      }

      function borrador() {
        return {
          unidadId: fijo ? fijo.id : q('rvCasa').value,
          amenidadId: q('rvAme').value,
          fecha: q('rvFecha').value,
          hora: q('rvHora').value,
          horas: Number(q('rvHoras').value) || 1,
          nombre: q('rvNombre').value.trim(),
          nota: ''
        };
      }

      function revisar() {
        var b = borrador();
        var msg = q('rvMsg');
        if (!b.unidadId) { msg.className = 'rvmsg'; msg.textContent = ''; q('rvOk').disabled = true; return null; }
        var err = CC.Model.validarReserva(b);
        msg.className = 'rvmsg ' + (err ? 'rvmsg--no' : 'rvmsg--si');
        msg.textContent = err || ('Libre: ' + nombreDia(b.fecha, true) + ', de ' + b.hora + ' a ' + finDe(b) + ' h.');
        q('rvOk').disabled = !!err;
        return err ? null : b;
      }

      llenarHoras();
      revisar();
      ['rvAme', 'rvFecha'].forEach(function (id) { q(id).onchange = function () { llenarHoras(); revisar(); }; });
      ['rvHora', 'rvHoras'].forEach(function (id) { q(id).onchange = revisar; });
      if (q('rvCasa')) q('rvCasa').onchange = revisar;

      q('rvCancel').onclick = CC.ui.cerrarModal;
      q('rvOk').onclick = function () {
        var b = revisar();
        if (!b) return;
        var r = CC.Store.agregarReserva(b);
        confirmada(r.id);
      };
    });
}

/** Aviso de reserva hecha, con la confirmación lista para el vecino. */
function confirmada(reservaId) {
  var esc = CC.ui.esc;
  var r = CC.Store.reserva(reservaId);
  var u = CC.Store.unidad(r.unidadId), a = CC.Store.amenidad(r.amenidadId);
  var tel = CC.Comprobantes.telWa(u && u.telefono);
  CC.ui.modal('Cancha apartada',
    '<div class="listo">' +
    '<span class="listo__monto">' + esc(r.hora) + '–' + esc(finDe(r)) + '</span>' +
    '<span>' + esc(a.nombre) + ' · ' + esc(nombreDia(r.fecha, true)) + '</span>' +
    '<span class="muted">Casa ' + esc(u.clave) + (r.nombre ? ' · ' + esc(r.nombre) : '') + '</span>' +
    (Number(a.costo) || Number(a.deposito)
      ? '<span class="muted">Renta ' + esc(CC.fmt.money2(a.costo || 0)) + (Number(a.deposito) ? ' · depósito ' + esc(CC.fmt.money2(a.deposito)) : '') + '</span>'
      : '') +
    '</div>' +
    '<div class="formactions" style="justify-content:center">' +
    (tel ? '<a class="btn btn--ghost" target="_blank" rel="noopener" href="https://wa.me/' + esc(tel) + '?text=' +
      encodeURIComponent(CC.Model.textoReserva(r.id)) + '">' + CC.ui.icono('wa', 'i--sm') + ' Mandar confirmación</a>' : '') +
    '<button type="button" class="btn" id="rvListo">Listo</button>' +
    '</div>',
    function (cuerpo) { cuerpo.querySelector('#rvListo').onclick = CC.ui.cerrarModal; });
}

/** Detalle de una reserva: confirmar por WhatsApp o liberarla. */
function verReserva(reservaId) {
  var esc = CC.ui.esc;
  var r = CC.Store.reserva(reservaId);
  if (!r) return;
  var u = CC.Store.unidad(r.unidadId) || {}, a = CC.Store.amenidad(r.amenidadId) || {};
  var tel = CC.Comprobantes.telWa(u.telefono);
  var pasada = r.fecha < CC.per.hoyISO();

  CC.ui.modal(a.nombre + ' · ' + r.hora + ' h',
    '<dl class="datos">' +
    '<div><dt>Casa</dt><dd><a class="strong" href="#/unidad/' + esc(u.id) + '">' + esc(u.clave) + '</a> · ' +
    esc(u.inquilino || u.propietario || '') + '</dd></div>' +
    '<div><dt>Día</dt><dd>' + esc(nombreDia(r.fecha, true)) + '</dd></div>' +
    '<div><dt>Horario</dt><dd>' + esc(r.hora) + ' a ' + esc(finDe(r)) + ' h</dd></div>' +
    (r.nombre ? '<div><dt>Juega</dt><dd>' + esc(r.nombre) + '</dd></div>' : '') +
    (u.telefono ? '<div><dt>Teléfono</dt><dd class="mono">' + esc(u.telefono) + '</dd></div>' : '') +
    '</dl>' +
    '<div class="formactions">' +
    (pasada ? '' : '<button type="button" class="btn btn--ghost" id="rvBaja" style="margin-right:auto">Liberar la cancha</button>') +
    (tel && !pasada ? '<a class="btn btn--ghost" target="_blank" rel="noopener" href="https://wa.me/' + esc(tel) + '?text=' +
      encodeURIComponent(CC.Model.textoReserva(r.id)) + '">' + CC.ui.icono('wa', 'i--sm') + ' Confirmación</a>' : '') +
    '<button type="button" class="btn" id="rvOk">Listo</button>' +
    '</div>',
    function (cuerpo) {
      cuerpo.querySelector('#rvOk').onclick = CC.ui.cerrarModal;
      var baja = cuerpo.querySelector('#rvBaja');
      if (baja) baja.onclick = function () {
        CC.ui.confirmar('Liberar la cancha',
          'La hora queda libre para otra casa. La reserva queda en el historial como cancelada.',
          'Liberar', function () {
            CC.Store.cancelarReserva(r.id);
            CC.ui.toast('Cancha liberada');
          }, true);
      };
    });
}

CC.vistas.reservas = {
  titulo: 'Reservas',
  sub: function () {
    var ams = CC.Store.amenidades();
    if (!ams.length) return 'Sin áreas para apartar';
    var hoy = CC.per.hoyISO();
    var n = CC.Model.reservasDel(hoy).length;
    return ams.map(function (a) { return a.nombre; }).join(' · ') + ' · ' + n + (n === 1 ? ' reserva hoy' : ' reservas hoy');
  },
  acciones: function () {
    if (!CC.Store.amenidades().length) return [];
    return [
      { texto: 'Apartar cancha', icono: 'mas', clase: 'btn', accion: 'apartar' },
      { texto: 'Imprimir agenda', icono: 'imprimir', clase: 'btn btn--ghost', accion: 'imprimir' }
    ];
  },

  render: function () {
    var esc = CC.ui.esc;
    var ams = CC.Store.amenidades();
    if (!ams.length) {
      return '<div class="panelbox"><div class="empty"><strong>No hay áreas para apartar</strong>' +
        '<p>Da de alta las canchas, el salón o el asador en Ajustes y aquí se apartan por hora.</p>' +
        '<a class="btn" href="#/ajustes" style="margin-top:8px">Ir a Ajustes</a></div></div>';
    }

    var hoy = CC.per.hoyISO();
    var fecha = diaReservas || hoy;
    var ahora = new Date();
    var minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    var out = [];

    /* --- Días: hoy y lo que se puede apartar por adelantado --- */
    var dias = [];
    var inicio = fecha < hoy ? fecha : hoy;
    for (var i = 0; i < 8; i++) dias.push(CC.per.masDias(inicio, i));
    if (dias.indexOf(fecha) < 0) dias[0] = fecha;
    out.push('<div class="dias noprint">' +
      '<button class="iconbtn" data-dia="' + esc(CC.per.masDias(fecha, -1)) + '" title="Día anterior">' + CC.ui.icono('volver', 'i--sm') + '</button>' +
      dias.map(function (d) {
        var n = CC.Model.reservasDel(d).length;
        return '<button class="dia' + (d === fecha ? ' is-on' : '') + (d === hoy ? ' dia--hoy' : '') + '" data-dia="' + esc(d) + '">' +
          '<span>' + esc(d === hoy ? 'Hoy' : nombreDia(d)) + '</span><b>' + Number(d.slice(8)) + '</b>' +
          '<em>' + (n ? n + (n === 1 ? ' reserva' : ' reservas') : 'libre') + '</em></button>';
      }).join('') +
      '<input class="input input--sm" type="date" id="rvIr" value="' + esc(fecha) + '" title="Ir a otra fecha">' +
      '</div>');

    /* --- La agenda del día: horas contra canchas --- */
    var horas = {};
    ams.forEach(function (a) { CC.Model.horasDe(a).forEach(function (h) { horas[h] = 1; }); });
    var lista = Object.keys(horas).sort();
    var libres = 0, ocupadas = 0;

    var filas = lista.map(function (h) {
      var pasada = fecha < hoy || (fecha === hoy && CC.Model.aMin(h) + 60 <= minAhora);
      return '<tr' + (pasada ? ' class="agenda__pasada"' : '') + '><th class="mono">' + esc(h) + '</th>' +
        ams.map(function (a) {
          if (CC.Model.horasDe(a).indexOf(h) < 0) return '<td><span class="slot slot--cerrada">Cerrada</span></td>';
          var r = CC.Model.ocupada(a.id, fecha, h);
          if (r) {
            ocupadas++;
            var u = CC.Store.unidad(r.unidadId) || {};
            var sigue = r.hora !== h;
            return '<td><button class="slot slot--ocupada' + (sigue ? ' slot--sigue' : '') + '" data-res="' + esc(r.id) + '">' +
              '<b>' + esc(u.clave || '—') + '</b><small>' + esc(sigue ? 'continúa' : (r.nombre || u.propietario || '')) + '</small></button></td>';
          }
          if (pasada) return '<td><span class="slot slot--cerrada">—</span></td>';
          libres++;
          return '<td><button class="slot slot--libre" data-libre="' + esc(a.id + '|' + h) + '"><b>Libre</b><small>Apartar</small></button></td>';
        }).join('') + '</tr>';
    }).join('');

    out.push('<div class="panelbox">' +
      '<div class="panelbox__head"><h3>' + esc(nombreDia(fecha, true)) + '</h3>' +
      '<span class="eyebrow">' + ocupadas + (ocupadas === 1 ? ' hora apartada' : ' horas apartadas') +
      (libres ? ' · ' + libres + ' libres' : '') + '</span></div>' +
      '<div class="tablewrap"><table class="agenda"><thead><tr><th>Hora</th>' +
      ams.map(function (a) { return '<th>' + esc(a.nombre) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + filas + '</tbody></table></div></div>');

    /* --- Reglas, a la vista --- */
    var tiposVistos = {};
    var reglas = ams.filter(function (a) { if (tiposVistos[a.tipo]) return false; tiposVistos[a.tipo] = 1; return true; })
      .map(function (a) { return esc(reglasDe(a)); }).join('<br>');
    out.push('<div class="note"><div><strong>Reglas que aplica el sistema al apartar</strong> (se cambian en Ajustes)<br>' +
      reglas + '</div></div>');

    return out.join('');
  },

  montar: function (raiz, ctx, redibujar) {
    raiz.querySelectorAll('[data-dia]').forEach(function (b) {
      b.onclick = function () { diaReservas = b.getAttribute('data-dia'); redibujar(); };
    });
    var ir = raiz.querySelector('#rvIr');
    if (ir) ir.onchange = function () { if (ir.value) { diaReservas = ir.value; redibujar(); } };
    raiz.querySelectorAll('[data-libre]').forEach(function (b) {
      b.onclick = function () {
        var p = b.getAttribute('data-libre').split('|');
        formularioReserva({ amenidadId: p[0], hora: p[1], fecha: diaReservas || CC.per.hoyISO() });
      };
    });
    raiz.querySelectorAll('[data-res]').forEach(function (b) {
      b.onclick = function () { verReserva(b.getAttribute('data-res')); };
    });
  },

  apartar: function () { formularioReserva({ fecha: diaReservas || CC.per.hoyISO() }); },
  imprimir: function () { window.print(); },

  /* para el portal del residente y la ficha de la casa */
  formulario: formularioReserva,
  ver: verReserva,
  nombreDia: nombreDia,
  finDe: finDe
};
