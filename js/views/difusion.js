/* views/difusion.js — correos a los residentes.
 *
 * Sin servidor de correo, la aplicacion no puede enviar por su cuenta: prepara
 * el mensaje y lo entrega al correo que la persona ya usa (Gmail, Outlook),
 * con los destinatarios en copia oculta. Tambien deja copiar la lista y el
 * texto para pegarlos donde sea.
 *
 * Lo que se manda queda registrado, para que despues se pueda comprobar que el
 * aviso si se circulo — que es la mitad de los pleitos en un condominio.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var GRUPOS = [
  ['todos', 'Todos los residentes'],
  ['deudores', 'Solo quienes deben'],
  ['corriente', 'Solo los que están al corriente']
];

var PLANTILLAS = {
  aviso: {
    nombre: 'Aviso general',
    asunto: 'Aviso — {condominio}',
    cuerpo: 'Estimados vecinos:\n\n[Escribe aquí el aviso]\n\nQuedamos atentos a cualquier duda.\n\n{administrador}\n{condominio}'
  },
  asamblea: {
    nombre: 'Convocatoria a asamblea',
    asunto: 'Convocatoria a asamblea — {condominio}',
    cuerpo: 'Estimados vecinos:\n\nSe convoca a asamblea el [día] de [mes] a las [hora] en [lugar].\n\nOrden del día:\n1. Lectura del estado financiero\n2. [Punto a tratar]\n3. Asuntos generales\n\nSu asistencia es importante para que haya quórum.\n\n{administrador}\n{condominio}'
  },
  cobranza: {
    nombre: 'Recordatorio de cuota',
    asunto: 'Recordatorio de cuota — {condominio}',
    cuerpo: 'Estimados vecinos:\n\nLes recordamos que la cuota de mantenimiento de {periodo} vence el día {vencimiento}. Después de esa fecha se genera un recargo de {mora}% mensual sobre el saldo vencido.\n\nPueden pagar por transferencia a:\n{cuenta}\n\nPor favor envíen su comprobante para aplicarlo el mismo día. Si ya realizaron su pago, hagan caso omiso de este mensaje.\n\n{administrador}\n{condominio}'
  },
  corte: {
    nombre: 'Corte de servicio o mantenimiento',
    asunto: 'Mantenimiento programado — {condominio}',
    cuerpo: 'Estimados vecinos:\n\nEl [día] de [hora] a [hora] se realizará [trabajo]. Durante ese lapso [qué servicio se interrumpe].\n\nAgradecemos su comprensión.\n\n{administrador}\n{condominio}'
  }
};

/* Estado de pantalla: no se guarda, es la redaccion en curso. */
var borrador = { grupo: 'todos', plantilla: 'aviso', asunto: null, cuerpo: null };

function destinatarios(grupo, periodo) {
  return CC.Model.padron(periodo).filter(function (x) {
    if (grupo === 'deudores') return x.situacion.saldo > 0.005;
    if (grupo === 'corriente') return x.situacion.saldo <= 0.005;
    return true;
  });
}

function correosDe(lista) {
  var vistos = {};
  lista.forEach(function (x) {
    var c = (x.unidad.email || '').trim();
    if (c && c.indexOf('@') > 0) vistos[c.toLowerCase()] = 1;
  });
  return Object.keys(vistos);
}

/** Sustituye las llaves de la plantilla por los datos reales del condominio. */
function rellenar(texto, periodo) {
  var c = CC.Store.condominio();
  return String(texto)
    .replace(/\{condominio\}/g, c.nombre || 'el condominio')
    .replace(/\{administrador\}/g, c.administrador || 'La administración')
    .replace(/\{periodo\}/g, CC.fmt.periodo(periodo))
    .replace(/\{vencimiento\}/g, c.diaVencimiento)
    .replace(/\{mora\}/g, c.tasaMoraMensual)
    .replace(/\{cuenta\}/g, c.cuenta || '[capturar la cuenta en Ajustes]');
}

CC.vistas.difusion = {
  titulo: 'Difusión',
  sub: function (ctx) {
    var n = correosDe(destinatarios(borrador.grupo, ctx.periodo)).length;
    return n + (n === 1 ? ' correo disponible' : ' correos disponibles') + ' en el grupo elegido';
  },
  acciones: function () { return []; },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var unidades = CC.Store.unidades();

    if (!unidades.length) {
      return '<div class="panelbox"><div class="empty">' +
        '<strong>Todavía no hay residentes</strong>' +
        '<p>Captura las casas con su correo para poder mandarles avisos.</p>' +
        '<a class="btn" href="#/unidades" style="margin-top:8px">Ir a casas</a></div></div>';
    }

    var elegidos = destinatarios(borrador.grupo, ctx.periodo);
    var correos = correosDe(elegidos);
    var sinCorreo = elegidos.filter(function (x) {
      return !(x.unidad.email || '').trim();
    });

    var plantilla = PLANTILLAS[borrador.plantilla];
    var asunto = borrador.asunto !== null ? borrador.asunto : rellenar(plantilla.asunto, ctx.periodo);
    var cuerpo = borrador.cuerpo !== null ? borrador.cuerpo : rellenar(plantilla.cuerpo, ctx.periodo);

    var out = [];

    out.push('<div class="note"><div>' +
      '<strong>La aplicación no manda el correo por su cuenta.</strong> Prepara el mensaje y lo abre ' +
      'en el correo que ya usas, con los vecinos en copia oculta para que nadie vea las direcciones ' +
      'de los demás. Así sale desde tu cuenta de siempre y queda en tus enviados.' +
      '</div></div>');

    /* --- A quién --- */
    out.push('<div class="panelbox">' +
      '<div class="panelbox__head"><h3>A quién le llega</h3>' +
      '<span class="eyebrow">' + correos.length + ' de ' + elegidos.length + ' con correo</span></div>' +
      '<div class="panelbox__body stack">' +
      '<div class="chips">' + GRUPOS.map(function (g) {
        return '<button class="chip' + (borrador.grupo === g[0] ? ' is-on' : '') + '" data-grupo="' + g[0] + '">' +
          esc(g[1]) + '</button>';
      }).join('') + '</div>' +
      (sinCorreo.length
        ? '<div class="note note--demo"><div><strong>' + sinCorreo.length +
          (sinCorreo.length === 1 ? ' casa no tiene correo' : ' casas no tienen correo') + ':</strong> ' +
          esc(sinCorreo.map(function (x) { return x.unidad.clave; }).join(', ')) +
          '. No les va a llegar. Captúralo en Casas.</div></div>'
        : '') +
      '</div></div>');

    /* --- Mensaje --- */
    out.push('<div class="panelbox">' +
      '<div class="panelbox__head"><h3>El mensaje</h3>' +
      '<div class="chips">' + Object.keys(PLANTILLAS).map(function (k) {
        return '<button class="chip' + (borrador.plantilla === k ? ' is-on' : '') + '" data-plantilla="' + k + '">' +
          esc(PLANTILLAS[k].nombre) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="panelbox__body stack">' +
      '<label class="field"><span class="field__lab">Asunto</span>' +
      '<input class="input" id="dAsunto" value="' + esc(asunto) + '"></label>' +
      '<label class="field"><span class="field__lab">Mensaje</span>' +
      '<textarea class="input" id="dCuerpo" rows="12">' + esc(cuerpo) + '</textarea>' +
      '<span class="field__hint">Se guarda lo que escribas al cambiar de grupo. Elegir otra plantilla lo reemplaza.</span></label>' +
      '<div class="formrow">' +
      '<button class="btn" id="dAbrir"' + (correos.length ? '' : ' disabled') + '>Abrir en mi correo</button>' +
      '<button class="btn btn--ghost" id="dCopiarCorreos"' + (correos.length ? '' : ' disabled') + '>Copiar las direcciones</button>' +
      '<button class="btn btn--ghost" id="dCopiarTexto">Copiar el mensaje</button>' +
      '<button class="btn btn--ghost" id="dRegistrar">Anotar como enviado</button>' +
      '</div>' +
      '<p class="field__hint">Si tu correo no abre con todos los destinatarios, usa “Copiar las direcciones” ' +
      'y pégalas en el campo CCO de tu correo.</p>' +
      '</div></div>');

    /* --- Estado de cuenta individual --- */
    var conSaldo = destinatarios('deudores', ctx.periodo).filter(function (x) {
      return (x.unidad.email || '').trim();
    });
    if (conSaldo.length) {
      out.push('<div class="panelbox">' +
        '<div class="panelbox__head"><h3>Estado de cuenta uno por uno</h3>' +
        '<span class="eyebrow">' + conSaldo.length + ' con saldo</span></div>' +
        '<div class="tablewrap"><table class="ledger">' +
        '<thead><tr><th>Casa</th><th>Correo</th><th class="r">Saldo</th><th class="noprint"></th></tr></thead><tbody>' +
        conSaldo.map(function (x) {
          return '<tr class="' + (x.situacion.estado === 'moroso' ? 'row--crit' : 'row--warn') + '">' +
            '<td class="strong">' + esc(x.unidad.clave) + '</td>' +
            '<td class="muted" style="font-size:12px">' + esc(x.unidad.email) + '</td>' +
            '<td class="r strong">' + esc(CC.fmt.money2(x.situacion.saldo)) + '</td>' +
            '<td class="r noprint"><button class="btn btn--sm btn--soft" data-individual="' + esc(x.unidad.id) + '">' +
            'Preparar correo</button></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="panelbox__body" style="border-top:1px solid var(--rule)">' +
        '<p class="field__hint">Cada correo lleva el saldo real de esa casa y su desglose. ' +
        'Es el mismo texto del recordatorio de WhatsApp, pero para correo.</p></div>' +
        '</div>');
    }

    /* --- Historial --- */
    var enviadas = CC.Store.difusiones();
    out.push('<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Lo que ya se circuló</h3>' +
      '<span class="eyebrow">' + enviadas.length + ' registros</span></div>' +
      (enviadas.length
        ? '<div class="tablewrap"><table class="ledger">' +
          '<thead><tr><th>Fecha</th><th>Asunto</th><th>Grupo</th><th class="c">Destinatarios</th><th class="noprint"></th></tr></thead><tbody>' +
          enviadas.map(function (d) {
            return '<tr>' +
              '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(CC.fmt.fechaCorta(d.enviada)) + '</td>' +
              '<td>' + esc(d.asunto) + '</td>' +
              '<td class="muted">' + esc(d.grupoNombre || '') + '</td>' +
              '<td class="c strong">' + (d.destinatarios || 0) + '</td>' +
              '<td class="r noprint"><button class="iconbtn" data-deldif="' + esc(d.id) + '" title="Quitar del historial">' +
              CC.ui.icono('cerrar', 'i--sm') + '</button></td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="empty"><strong>Sin registros todavía</strong>' +
          '<p>Cuando mandes un aviso, anótalo aquí. Sirve como constancia de que sí se circuló.</p></div>') +
      '</div>');

    return out.join('');
  },

  montar: function (raiz, ctx, redibujar) {
    var inAsunto = raiz.querySelector('#dAsunto');
    var inCuerpo = raiz.querySelector('#dCuerpo');

    function guardarBorrador() {
      if (inAsunto) borrador.asunto = inAsunto.value;
      if (inCuerpo) borrador.cuerpo = inCuerpo.value;
    }
    if (inAsunto) inAsunto.oninput = guardarBorrador;
    if (inCuerpo) inCuerpo.oninput = guardarBorrador;

    raiz.querySelectorAll('[data-grupo]').forEach(function (b) {
      b.onclick = function () {
        guardarBorrador();
        borrador.grupo = b.getAttribute('data-grupo');
        redibujar();
      };
    });

    raiz.querySelectorAll('[data-plantilla]').forEach(function (b) {
      b.onclick = function () {
        borrador.plantilla = b.getAttribute('data-plantilla');
        borrador.asunto = null;   // la plantilla manda
        borrador.cuerpo = null;
        redibujar();
      };
    });

    var elegidos = destinatarios(borrador.grupo, ctx.periodo);
    var correos = correosDe(elegidos);

    var abrir = raiz.querySelector('#dAbrir');
    if (abrir) abrir.onclick = function () {
      var url = 'mailto:?bcc=' + encodeURIComponent(correos.join(',')) +
        '&subject=' + encodeURIComponent(inAsunto.value) +
        '&body=' + encodeURIComponent(inCuerpo.value);

      // Los navegadores cortan las URLs muy largas: con muchas direcciones,
      // es mas seguro copiarlas que abrir un mailto truncado.
      if (url.length > 1800) {
        CC.ui.copiar(correos.join(', '),
          'Son muchas direcciones para abrirlas solas: se copiaron, pégalas en CCO');
        return;
      }
      window.location.href = url;
      CC.ui.toast('Se abrió tu correo con ' + correos.length + ' destinatarios en copia oculta');
    };

    var copiarCorreos = raiz.querySelector('#dCopiarCorreos');
    if (copiarCorreos) copiarCorreos.onclick = function () {
      CC.ui.copiar(correos.join(', '), correos.length + ' direcciones copiadas');
    };

    var copiarTexto = raiz.querySelector('#dCopiarTexto');
    if (copiarTexto) copiarTexto.onclick = function () {
      CC.ui.copiar(inAsunto.value + '\n\n' + inCuerpo.value, 'Mensaje copiado');
    };

    var registrar = raiz.querySelector('#dRegistrar');
    if (registrar) registrar.onclick = function () {
      if (!inAsunto.value.trim()) { CC.ui.toast('Ponle asunto antes de anotarlo', 'crit'); return; }
      var g = GRUPOS.filter(function (x) { return x[0] === borrador.grupo; })[0];
      CC.Store.agregarDifusion({
        asunto: inAsunto.value.trim(),
        cuerpo: inCuerpo.value,
        grupo: borrador.grupo,
        grupoNombre: g ? g[1] : '',
        destinatarios: correos.length,
        periodo: ctx.periodo
      });
      CC.ui.toast('Anotado en el historial', 'good');
    };

    raiz.querySelectorAll('[data-individual]').forEach(function (b) {
      b.onclick = function () {
        var u = CC.Store.unidad(b.getAttribute('data-individual'));
        if (!u) return;
        var texto = CC.Model.recordatorio(u.id, ctx.periodo);
        var asunto = 'Estado de cuenta casa ' + u.clave + ' — ' + CC.Store.condominio().nombre;
        window.location.href = 'mailto:' + encodeURIComponent(u.email) +
          '?subject=' + encodeURIComponent(asunto) +
          '&body=' + encodeURIComponent(texto);
      };
    });

    raiz.querySelectorAll('[data-deldif]').forEach(function (b) {
      b.onclick = function () {
        CC.Store.borrarDifusion(b.getAttribute('data-deldif'));
        CC.ui.toast('Quitado del historial');
      };
    });
  }
};
