/* views/visitas.js — registro de visitas en la caseta.
 *
 * Quién entró, a qué casa, a qué hora y si ya salió. El guardia registra la
 * entrada en un toque; las visitas que el vecino avisó desde su portal ya están
 * escritas y solo se confirman. Queda la bitácora de cada día por si algo pasa.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var diaVisitas = null;
var buscaVisitas = '';

var TIPOS_VISITA = ['Visita', 'Paquetería', 'Servicio doméstico', 'Proveedor', 'Taxi o app'];

function horaAhora() {
  var d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/**
 * Captura de una visita. modo 'entrada' = llegó ahora (caseta);
 * modo 'aviso' = la casa avisa que viene (portal del residente).
 */
function formularioVisita(modo, pre) {
  pre = pre || {};
  var esc = CC.ui.esc;
  var aviso = modo === 'aviso';
  var casas = CC.Store.unidades().slice().sort(CC.Model.ordenCasas);
  var fija = pre.unidadId ? CC.Store.unidad(pre.unidadId) : null;

  CC.ui.modal(aviso ? 'Avisar que viene una visita' + (fija ? ' — casa ' + fija.clave : '') : 'Registrar entrada',
    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">Nombre de quien viene</span>' +
    '<input class="input" id="viNombre" placeholder="Nombre completo" autocomplete="off"></label>' +
    '<label class="field"><span class="field__lab">Tipo</span><select class="input" id="viTipo">' +
    TIPOS_VISITA.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label>' +
    (fija ? '' :
      '<label class="field"><span class="field__lab">Va a la casa</span><select class="input" id="viCasa">' +
      '<option value="">Elige la casa…</option>' + casas.map(function (u) {
        return '<option value="' + esc(u.id) + '">' + esc(u.clave) + ' — ' + esc(u.inquilino || u.propietario || '') + '</option>';
      }).join('') + '</select></label>') +
    '<label class="field"><span class="field__lab">Placas (si viene en auto)</span>' +
    '<input class="input mono" id="viPlacas" placeholder="JKL-123-A" style="text-transform:uppercase"></label>' +
    '<label class="field"><span class="field__lab">Personas</span>' +
    '<input class="input num" id="viPersonas" type="number" min="1" max="30" value="1"></label>' +
    (aviso
      ? '<label class="field"><span class="field__lab">Día</span>' +
        '<input class="input" id="viFecha" type="date" min="' + esc(CC.per.hoyISO()) + '" value="' + esc(CC.per.hoyISO()) + '"></label>' +
        '<label class="field"><span class="field__lab">Hora aproximada</span>' +
        '<input class="input" id="viHora" type="time" value="18:00"></label>'
      : '') +
    '</div>' +
    '<label class="field" style="margin-top:14px"><span class="field__lab">Nota (opcional)</span>' +
    '<input class="input" id="viNota" placeholder="' + (aviso ? 'Viene a la fiesta; trae pastel' : 'Deja paquete en caseta') + '"></label>' +
    '<div class="formactions">' +
    '<button type="button" class="btn btn--ghost" id="viCancel">Cancelar</button>' +
    '<button type="button" class="btn" id="viOk">' + (aviso ? 'Avisar a la caseta' : 'Registrar entrada') + '</button>' +
    '</div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      q('viCancel').onclick = CC.ui.cerrarModal;
      q('viOk').onclick = function () {
        var nombre = q('viNombre').value.trim();
        var casa = fija ? fija.id : q('viCasa').value;
        if (!nombre) { CC.ui.toast('Falta el nombre de quien viene', 'crit'); return; }
        if (!casa) { CC.ui.toast('Falta la casa a la que va', 'crit'); return; }
        var v = {
          tipo: q('viTipo').value, nombre: nombre, unidadId: casa,
          placas: q('viPlacas').value.trim().toUpperCase(),
          personas: Math.max(1, Number(q('viPersonas').value) || 1),
          nota: q('viNota').value.trim()
        };
        if (aviso) {
          v.fecha = q('viFecha').value || CC.per.hoyISO();
          v.horaAprox = q('viHora').value || '';
          v.estado = 'esperada'; v.entrada = null; v.salida = null; v.aviso = 'Portal del residente';
        } else {
          v.fecha = CC.per.hoyISO(); v.entrada = horaAhora(); v.salida = null;
          v.estado = 'dentro'; v.aviso = 'Caseta';
        }
        CC.Store.agregarVisita(v);
        CC.ui.cerrarModal();
        CC.ui.toast(aviso ? 'Listo: la caseta ya sabe que viene ' + nombre : 'Entrada registrada a las ' + v.entrada, 'good');
      };
    });
}

CC.vistas.visitas = {
  titulo: 'Visitas',
  sub: function () {
    var hoy = CC.per.hoyISO();
    var l = CC.Model.visitasDel(hoy).filter(function (v) { return v.estado !== 'esperada'; });
    return 'Hoy: ' + l.length + (l.length === 1 ? ' entrada' : ' entradas') + ' · ' +
      CC.Model.visitasDentro().length + ' dentro ahora · ' + CC.Model.visitasEsperadas().length + ' esperadas';
  },
  acciones: function () {
    return [
      { texto: 'Registrar entrada', icono: 'mas', clase: 'btn', accion: 'entrada' },
      { texto: 'Imprimir', icono: 'imprimir', clase: 'btn btn--ghost', accion: 'imprimir' }
    ];
  },

  render: function () {
    var esc = CC.ui.esc;
    var hoy = CC.per.hoyISO();
    var fecha = diaVisitas || hoy;
    var out = [];

    var dentro = CC.Model.visitasDentro();
    var esperadas = CC.Model.visitasEsperadas();
    var delDia = CC.Model.visitasDel(fecha).filter(function (v) { return v.estado !== 'esperada'; });
    var semana = CC.Store.visitas().filter(function (v) {
      return v.estado !== 'esperada' && v.fecha > CC.per.masDias(hoy, -7) && v.fecha <= hoy;
    }).length;

    function casaDe(v) { var u = CC.Store.unidad(v.unidadId); return u ? u.clave : '—'; }

    out.push(CC.ui.stats([
      { lab: 'Entraron hoy', val: String(CC.Model.visitasDel(hoy).filter(function (v) { return v.estado !== 'esperada'; }).length), nota: '<span>registradas en caseta</span>' },
      { lab: 'Dentro ahora', val: String(dentro.length), tono: dentro.length ? 'warn' : 'good', nota: '<span>sin salida registrada</span>' },
      { lab: 'Esperadas', val: String(esperadas.length), nota: '<span>avisadas por los vecinos</span>' },
      { lab: 'Últimos 7 días', val: String(semana), nota: '<span>entradas</span>' }
    ]));

    /* --- Esperadas: el vecino ya avisó --- */
    if (esperadas.length) {
      out.push('<div class="panelbox"><div class="panelbox__head"><h3>Avisaron que vienen</h3>' +
        '<span class="eyebrow">desde el portal del residente</span></div><ul class="reslista">' +
        esperadas.map(function (v) {
          return '<li><span><b>' + esc(v.nombre) + '</b> · ' + esc(v.tipo) + ' · casa ' + esc(casaDe(v)) +
            (v.placas ? ' · <span class="mono">' + esc(v.placas) + '</span>' : '') + '<br><small class="muted">' +
            esc(v.fecha === hoy ? 'Hoy' : CC.vistas.reservas.nombreDia(v.fecha, true)) +
            (v.horaAprox ? ', cerca de las ' + esc(v.horaAprox) : '') + (v.nota ? ' · ' + esc(v.nota) : '') + '</small></span>' +
            (v.fecha === hoy ? '<button class="btn btn--sm" data-llego="' + esc(v.id) + '">Llegó</button>' : '') + '</li>';
        }).join('') + '</ul></div>');
    }

    /* --- Dentro ahora --- */
    if (dentro.length) {
      out.push('<div class="panelbox"><div class="panelbox__head"><h3>Dentro del condominio</h3></div><ul class="reslista">' +
        dentro.map(function (v) {
          return '<li><span><b>' + esc(v.nombre) + '</b> · casa ' + esc(casaDe(v)) + '<br><small class="muted">Entró a las ' +
            esc(v.entrada) + (v.fecha !== hoy ? ' del ' + esc(CC.fmt.fecha(v.fecha)) : '') + ' · ' + esc(v.tipo) + '</small></span>' +
            '<button class="btn btn--sm btn--ghost" data-salio="' + esc(v.id) + '">Salió</button></li>';
        }).join('') + '</ul></div>');
    }

    /* --- Bitácora del día --- */
    var t = buscaVisitas.toLowerCase();
    var filas = delDia.filter(function (v) {
      if (!t) return true;
      return (v.nombre + ' ' + casaDe(v) + ' ' + (v.placas || '') + ' ' + v.tipo).toLowerCase().indexOf(t) >= 0;
    }).reverse().map(function (v) {
      return '<tr>' +
        '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(v.entrada || '—') + '</td>' +
        '<td class="mono" style="font-size:12px;white-space:nowrap">' + (v.salida ? esc(v.salida) : '<span class="pill pill--warn">dentro</span>') + '</td>' +
        '<td><div class="cellstack"><span>' + esc(v.nombre) + '</span><small>' + esc(v.tipo) +
        (v.personas > 1 ? ' · ' + v.personas + ' personas' : '') + '</small></div></td>' +
        '<td><a class="strong" href="#/unidad/' + esc(v.unidadId) + '">' + esc(casaDe(v)) + '</a></td>' +
        '<td class="mono" style="font-size:12px">' + esc(v.placas || '—') + '</td>' +
        '<td><small class="muted">' + esc(v.aviso === 'Portal del residente' ? 'La casa avisó' : 'Caseta') + '</small></td>' +
        '</tr>';
    }).join('');

    out.push('<div class="section">' +
      '<div class="section__head noprint" style="align-items:center">' +
      '<div class="search"><svg class="i"><use href="#i-buscar"/></svg>' +
      '<input class="input" id="qVisita" type="search" placeholder="Buscar nombre, casa o placas" value="' + esc(buscaVisitas) + '"></div>' +
      '<input class="input input--sm" type="date" id="viDia" value="' + esc(fecha) + '" max="' + esc(hoy) + '" style="width:auto">' +
      '</div>' +
      '<div class="panelbox"><div class="panelbox__head"><h3>Bitácora del ' + esc(fecha === hoy ? 'día de hoy' : CC.vistas.reservas.nombreDia(fecha, true)) + '</h3>' +
      '<span class="eyebrow">' + delDia.length + ' entradas</span></div>' +
      (filas
        ? '<div class="tablewrap"><table class="ledger"><thead><tr><th>Entró</th><th>Salió</th><th>Quién</th>' +
          '<th>Casa</th><th>Placas</th><th>Registro</th></tr></thead><tbody>' + filas + '</tbody></table></div>'
        : '<div class="empty"><strong>' + (t ? 'Nada coincide con la búsqueda' : 'Sin entradas ese día') + '</strong></div>') +
      '</div></div>');

    return out.join('');
  },

  montar: function (raiz, ctx, redibujar) {
    raiz.querySelectorAll('[data-llego]').forEach(function (b) {
      b.onclick = function () {
        CC.Store.actualizarVisita(b.getAttribute('data-llego'), { estado: 'dentro', entrada: horaAhora(), fecha: CC.per.hoyISO() });
        CC.ui.toast('Entrada registrada', 'good');
      };
    });
    raiz.querySelectorAll('[data-salio]').forEach(function (b) {
      b.onclick = function () {
        CC.Store.actualizarVisita(b.getAttribute('data-salio'), { estado: 'salio', salida: horaAhora() });
        CC.ui.toast('Salida registrada');
      };
    });
    var q = raiz.querySelector('#qVisita');
    if (q) q.oninput = function () { buscaVisitas = q.value; redibujar(true); };
    var d = raiz.querySelector('#viDia');
    if (d) d.onchange = function () { diaVisitas = d.value || null; redibujar(); };
  },

  entrada: function () { formularioVisita('entrada'); },
  imprimir: function () { window.print(); },
  avisar: function (unidadId) { formularioVisita('aviso', { unidadId: unidadId }); }
};
