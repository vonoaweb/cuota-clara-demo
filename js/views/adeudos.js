/* views/adeudos.js — quién dejó de pagar, desde cuándo y qué se ha hecho.
 *
 * Avisos por WhatsApp y correo: el sistema detecta a quién le toca, escribe
 * cada mensaje con el saldo real de la casa y anota lo que se mandó en su
 * historial. El último clic (enviar) lo da la administración: WhatsApp y el
 * correo no dejan que un programa instalado en una computadora mande mensajes
 * por su cuenta sin un servicio de pago de por medio.
 *
 * Convenios: el adeudo se parte en parcialidades con fecha; cada pago que se
 * marca como abono al convenio lo va cubriendo.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

var filtroAdeudos = 'todas';

function linkWhatsApp(u, texto) {
  var t = CC.Comprobantes.telWa(u && u.telefono);
  return t ? 'https://wa.me/' + t + '?text=' + encodeURIComponent(texto) : '';
}

function linkCorreo(u, asunto, cuerpo) {
  var c = String((u && u.email) || '').trim();
  if (!c || c.indexOf('@') < 1) return '';
  return 'mailto:' + c + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);
}

function hace(iso) {
  var d = CC.per.diasEntre(iso, CC.per.hoyISO());
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 30) return 'hace ' + d + ' días';
  var m = Math.round(d / 30);
  return 'hace ' + m + (m === 1 ? ' mes' : ' meses');
}

/**
 * Ventana para avisar casa por casa. Con una sola casa es el aviso de esa
 * casa; con varias, una fila: se manda, "Siguiente", se manda.
 */
function colaAvisos(ids, periodo) {
  var esc = CC.ui.esc;
  var i = 0, enviados = {}, total = 0;
  var unico = ids.length === 1;

  CC.ui.modal(unico ? 'Aviso de adeudo' : 'Avisos de adeudo', '<div class="cola" id="cola"></div>', function (cuerpo) {
    var caja = cuerpo.querySelector('#cola');

    function registrar(u, canal, s) {
      CC.Store.registrarAvisoAdeudo({
        unidadId: u.id, canal: canal,
        saldo: Math.round(s.saldo * 100) / 100, meses: s.mesesVencidos
      });
      enviados[u.id] = enviados[u.id] || {};
      enviados[u.id][canal] = true;
      total++;
    }

    function pintar() {
      var u = CC.Store.unidad(ids[i]);
      var s = CC.Model.situacion(u.id, periodo);
      var cv = CC.Model.convenioDe(u.id);
      var ult = CC.Model.ultimoAviso(u.id);
      var hecho = enviados[u.id] || {};
      var texto = CC.Model.avisoAdeudo(u.id, periodo);
      var asunto = CC.Model.asuntoAviso(u.id);
      var wa = linkWhatsApp(u, texto), mail = linkCorreo(u, asunto, texto);
      var pct = ((i + 1) / ids.length) * 100;

      caja.innerHTML =
        (unico ? '' :
          '<div class="cola__prog"><span class="mono">' + (i + 1) + ' de ' + ids.length + '</span>' +
          '<span class="bar__track"><span class="bar__fill" style="width:' + pct.toFixed(1) + '%"></span></span></div>') +

        '<div class="cola__casa">' +
        '<div><strong>Casa ' + esc(u.clave) + '</strong> · ' + esc(u.inquilino || u.propietario) + '</div>' +
        '<div class="cola__datos">' +
        '<span>Debe <b class="num">' + esc(CC.fmt.money2(s.saldo)) + '</b></span>' +
        (s.desde ? '<span>sin pagar desde ' + esc(CC.fmt.periodo(s.desde).toLowerCase()) + '</span>' : '') +
        (cv ? '<span>convenio ' + cv.pagadas + ' de ' + cv.plan.length + '</span>' : '') +
        '<span>' + (ult ? 'último aviso ' + esc(hace(ult.fecha)) : 'sin avisos antes') + '</span>' +
        '</div></div>' +

        '<label class="field"><span class="field__lab">Mensaje</span>' +
        '<textarea class="input" id="cTexto" rows="10">' + esc(texto) + '</textarea>' +
        '<span class="field__hint">Ya lleva el saldo de la casa. Puedes cambiarlo antes de enviarlo.</span></label>' +

        '<div class="cola__canales">' +
        (wa
          ? '<a class="btn' + (hecho.whatsapp ? ' btn--soft' : '') + '" id="cWa" target="_blank" rel="noopener" href="' + esc(wa) + '">' +
            CC.ui.icono('wa', 'i--sm') + '<span>' + (hecho.whatsapp ? 'WhatsApp enviado' : 'Enviar por WhatsApp') + '</span></a>'
          : '<span class="cola__falta">Sin teléfono capturado</span>') +
        (mail
          ? '<a class="btn btn--ghost' + (hecho.correo ? ' btn--soft' : '') + '" id="cMail" href="' + esc(mail) + '">' +
            CC.ui.icono('difusion', 'i--sm') + '<span>' + (hecho.correo ? 'Correo enviado' : 'Enviar por correo') + '</span></a>'
          : '<span class="cola__falta">Sin correo capturado</span>') +
        '</div>' +

        (unico
          ? '<div class="formactions"><button type="button" class="btn btn--ghost" id="cFin">Listo</button></div>'
          : '<div class="formactions">' +
            '<button type="button" class="btn btn--ghost" id="cAnt"' + (i === 0 ? ' disabled' : '') + '>Anterior</button>' +
            '<button type="button" class="btn ' + (hecho.whatsapp || hecho.correo ? '' : 'btn--ghost') + '" id="cSig">' +
            (i === ids.length - 1 ? 'Terminar' : 'Siguiente casa') + '</button></div>') +
        '<p class="field__hint">Cada envío queda anotado en el historial de la casa, con fecha.</p>';

      var ta = caja.querySelector('#cTexto');
      var aWa = caja.querySelector('#cWa'), aMail = caja.querySelector('#cMail');
      ta.oninput = function () {
        if (aWa) aWa.href = linkWhatsApp(u, ta.value);
        if (aMail) aMail.href = linkCorreo(u, asunto, ta.value);
      };
      if (aWa) aWa.addEventListener('click', function () {
        registrar(u, 'whatsapp', s);
        aWa.classList.add('btn--soft');
        aWa.querySelector('span').textContent = 'WhatsApp enviado';
        var sig = caja.querySelector('#cSig');
        if (sig) sig.classList.remove('btn--ghost');
      });
      if (aMail) aMail.addEventListener('click', function () {
        registrar(u, 'correo', s);
        aMail.classList.add('btn--soft');
        aMail.querySelector('span').textContent = 'Correo enviado';
        var sig = caja.querySelector('#cSig');
        if (sig) sig.classList.remove('btn--ghost');
      });

      var fin = caja.querySelector('#cFin');
      if (fin) fin.onclick = cerrar;
      var ant = caja.querySelector('#cAnt');
      if (ant) ant.onclick = function () { if (i > 0) { i--; pintar(); } };
      var sig = caja.querySelector('#cSig');
      if (sig) sig.onclick = function () {
        if (i < ids.length - 1) { i++; pintar(); } else cerrar();
      };
    }

    function cerrar() {
      CC.ui.cerrarModal();
      if (total) CC.ui.toast(total + (total === 1 ? ' aviso anotado' : ' avisos anotados') + ' en el historial', 'good');
    }

    pintar();
  });
}

/** Alta de un convenio: el adeudo partido en parcialidades, con su tabla al momento. */
function formularioConvenio(unidadId, periodo) {
  var esc = CC.ui.esc;
  var u = CC.Store.unidad(unidadId);
  if (!u) return;
  var s = CC.Model.situacion(u.id, periodo);
  var vigente = CC.Model.convenioDe(u.id);
  if (vigente) { verConvenio(vigente.convenio.id); return; }

  var adeudo = Math.max(0, Math.round(s.saldo * 100) / 100);
  var primera = CC.per.masDias(CC.per.hoyISO(), 7);

  CC.ui.modal('Convenio de pago — casa ' + u.clave,
    '<p class="field__hint" style="margin-bottom:12px">El adeudo se parte en pagos con fecha. ' +
    'Al registrar cada pago se marca como abono al convenio y aquí se ve cuánto lleva.</p>' +
    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">Adeudo a convenir</span>' +
    '<input class="input num" id="vAdeudo" type="number" min="0" step="0.01" value="' + esc(adeudo.toFixed(2)) + '">' +
    '<span class="field__hint">' + (s.desde ? 'Debe desde ' + esc(CC.fmt.periodo(s.desde).toLowerCase()) : 'Saldo actual') + '</span></label>' +
    '<label class="field"><span class="field__lab">Parcialidades</span>' +
    '<select class="input" id="vN">' + [2, 3, 4, 5, 6, 8, 10, 12].map(function (k) {
      return '<option value="' + k + '"' + (k === 3 ? ' selected' : '') + '>' + k + ' pagos</option>';
    }).join('') + '</select></label>' +
    '<label class="field"><span class="field__lab">Cada</span>' +
    '<select class="input" id="vCada"><option value="mes">Mes</option><option value="quincena">Quincena</option></select></label>' +
    '<label class="field"><span class="field__lab">Primer pago</span>' +
    '<input class="input" id="vPrimera" type="date" value="' + esc(primera) + '"></label>' +
    '</div>' +
    '<label class="field" style="margin-top:14px"><span class="field__lab">Nota (opcional)</span>' +
    '<input class="input" id="vNota" placeholder="Aprobado por el comité el …"></label>' +
    '<div class="convplan" id="vPlan"></div>' +
    '<div class="formactions">' +
    '<button type="button" class="btn btn--ghost" id="vCancel">Cancelar</button>' +
    '<button type="button" class="btn" id="vOk">Guardar y descargar para firmar</button>' +
    '</div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };

      function borrador() {
        var total = Math.max(0, Number(q('vAdeudo').value) || 0);
        var n = Number(q('vN').value) || 3;
        return {
          unidadId: u.id, fecha: CC.per.hoyISO(), adeudo: total, parcialidades: n,
          monto: Math.floor((total / n) * 100) / 100,
          cada: q('vCada').value, primera: q('vPrimera').value || primera,
          detalle: s.desde ? 'por cuotas de mantenimiento pendientes desde ' + CC.fmt.periodo(s.desde).toLowerCase() : '',
          nota: q('vNota').value.trim()
        };
      }

      function plan() {
        var b = borrador();
        var filas = CC.Model.planConvenio(b);
        q('vPlan').innerHTML =
          '<table class="ledger"><thead><tr><th>No.</th><th>Fecha</th><th class="r">Monto</th></tr></thead><tbody>' +
          filas.map(function (x) {
            return '<tr><td class="mono">' + x.n + '</td><td>' + esc(CC.fmt.fechaLarga(x.fecha)) + '</td>' +
              '<td class="r strong">' + esc(CC.fmt.money2(x.monto)) + '</td></tr>';
          }).join('') +
          '</tbody><tfoot><tr><td colspan="2">Total</td><td class="r">' + esc(CC.fmt.money2(b.adeudo)) + '</td></tr></tfoot></table>';
      }
      ['vAdeudo', 'vN', 'vCada', 'vPrimera'].forEach(function (id) { q(id).oninput = plan; q(id).onchange = plan; });
      plan();

      q('vCancel').onclick = CC.ui.cerrarModal;
      q('vOk').onclick = function () {
        var b = borrador();
        if (!(b.adeudo > 0)) { CC.ui.toast('Captura el adeudo a convenir', 'crit'); return; }
        var cv = CC.Store.agregarConvenio(b);
        CC.Store.agregarNota({
          unidadId: u.id, tipo: 'gestion', fecha: CC.per.hoyISO(),
          texto: 'Convenio de pago ' + CC.Comprobantes.folio('CV-', cv.folio) + ': ' + CC.fmt.money2(b.adeudo) +
            ' en ' + b.parcialidades + ' parcialidades de ' + CC.fmt.money2(b.monto) + '.'
        });
        CC.ui.cerrarModal();
        CC.Comprobantes.descargar(CC.Comprobantes.convenio(cv.id));
      };
    });
}

/** El convenio vigente de una casa: avance, tabla y acciones. */
function verConvenio(convenioId) {
  var cv = CC.Store.convenio(convenioId);
  if (!cv) return;
  var e = CC.Model.estadoConvenio(cv);
  var u = CC.Store.unidad(cv.unidadId);

  CC.ui.modal('Convenio ' + CC.Comprobantes.folio('CV-', cv.folio) + ' — casa ' + (u ? u.clave : ''),
    convenioHTML(e) +
    '<div class="formactions">' +
    (e.estado === 'cancelado' || e.estado === 'cumplido' ? '' :
      '<button type="button" class="btn btn--ghost" id="vBaja" style="margin-right:auto">Cancelar convenio</button>') +
    '<button type="button" class="btn btn--ghost" id="vPdf">' + CC.ui.icono('imprimir', 'i--sm') + ' Descargar PDF</button>' +
    '<button type="button" class="btn" id="vOk">Listo</button>' +
    '</div>',
    function (cuerpo) {
      cuerpo.querySelector('#vOk').onclick = CC.ui.cerrarModal;
      cuerpo.querySelector('#vPdf').onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.convenio(cv.id)); };
      var baja = cuerpo.querySelector('#vBaja');
      if (baja) baja.onclick = function () {
        CC.ui.confirmar('Cancelar convenio',
          'El convenio queda como cancelado y el adeudo se vuelve a cobrar completo. Los pagos ya hechos se conservan.',
          'Cancelar convenio', function () {
            CC.Store.actualizarConvenio(cv.id, { estado: 'cancelado' });
            CC.ui.toast('Convenio cancelado');
          }, true);
      };
    });
}

/** Bloque reutilizable: barra de avance, siguiente pago y tabla de parcialidades. */
function convenioHTML(e) {
  var esc = CC.ui.esc;
  var et = CC.Model.ETIQUETA_CONVENIO[e.estado];
  var pct = e.plan.length ? (e.pagadas / e.plan.length) * 100 : 0;
  return '<div class="conv">' +
    '<div class="conv__cab">' +
    '<span class="pill ' + et.clase + '">' + et.texto + '</span>' +
    '<span class="mono">' + e.pagadas + ' de ' + e.plan.length + ' parcialidades</span>' +
    '<span class="muted">· pagado ' + esc(CC.fmt.money2(e.pagado)) + ' de ' + esc(CC.fmt.money2(e.convenio.adeudo)) + '</span>' +
    '</div>' +
    '<span class="bar__track conv__barra"><span class="bar__fill" style="width:' + pct.toFixed(1) + '%;background:' +
    (e.estado === 'atrasado' ? 'var(--crit)' : 'var(--good)') + '"></span></span>' +
    (e.siguiente
      ? '<p class="conv__sig">Siguiente: <strong>' + esc(CC.fmt.money2(e.siguiente.monto)) + '</strong> el ' +
        esc(CC.fmt.fechaLarga(e.siguiente.fecha)) + (e.atrasadas ? ' · <span style="color:var(--crit)">' + e.atrasadas +
        (e.atrasadas === 1 ? ' parcialidad atrasada' : ' parcialidades atrasadas') + '</span>' : '') + '</p>'
      : '') +
    '<div class="tablewrap"><table class="ledger"><thead><tr><th>No.</th><th>Fecha</th><th class="r">Monto</th><th class="c">Estado</th></tr></thead><tbody>' +
    e.plan.map(function (x) {
      return '<tr class="' + (x.vencida ? 'row--crit' : '') + '"><td class="mono">' + x.n + '</td>' +
        '<td>' + esc(CC.fmt.fecha(x.fecha)) + '</td>' +
        '<td class="r">' + esc(CC.fmt.money2(x.monto)) + '</td>' +
        '<td class="c">' + (x.cubierta ? '<span class="pill pill--good">Pagada</span>'
          : x.vencida ? '<span class="pill pill--crit">Atrasada</span>' : '<span class="pill pill--mute">Pendiente</span>') +
        '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
}

CC.vistas.adeudos = {
  titulo: 'Adeudos',
  sub: function (ctx) {
    var l = CC.Model.deudores(ctx.periodo);
    if (!l.length) return 'Nadie tiene pagos vencidos';
    var t = l.reduce(function (a, x) { return a + x.situacion.saldo; }, 0);
    return l.length + (l.length === 1 ? ' casa' : ' casas') + ' con pagos vencidos · ' + CC.fmt.money(t) + ' por cobrar';
  },
  acciones: function (ctx) {
    var n = CC.Model.porAvisar(ctx.periodo).length;
    return [{ texto: n ? 'Enviar avisos (' + n + ')' : 'Enviar avisos', icono: 'wa', clase: 'btn', accion: 'avisarTodos' }];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var p = ctx.periodo;
    var deudores = CC.Model.deudores(p);
    var porAvisar = CC.Model.porAvisar(p);
    var idsPorAvisar = {};
    porAvisar.forEach(function (x) { idsPorAvisar[x.unidad.id] = 1; });
    var c = CC.Store.condominio();
    var out = [];

    var conConvenio = deudores.filter(function (x) { return CC.Model.convenioDe(x.unidad.id); });
    var largos = deudores.filter(function (x) { return x.situacion.mesesVencidos >= 3; });
    var total = deudores.reduce(function (a, x) { return a + x.situacion.saldo; }, 0);

    out.push(CC.ui.stats([
      {
        lab: 'Casas que deben', val: String(deudores.length), tono: deudores.length ? 'warn' : 'good',
        nota: '<span>de ' + CC.Store.unidades().length + ' casas</span>'
      },
      { lab: 'Por cobrar', val: CC.fmt.money(total), tono: total > 0 ? 'crit' : 'good', nota: '<span>saldo de esas casas</span>' },
      {
        lab: 'Tres meses o más', val: String(largos.length), tono: largos.length ? 'crit' : 'good',
        nota: '<span>' + esc(CC.fmt.money(largos.reduce(function (a, x) { return a + x.situacion.saldo; }, 0))) + '</span>'
      },
      {
        lab: 'En convenio', val: String(conConvenio.length),
        nota: '<span>pagando en parcialidades</span>'
      }
    ]));

    /* --- Lo que toca hoy --- */
    if (porAvisar.length) {
      out.push('<div class="cta">' +
        '<div class="cta__txt"><strong>Toca avisar a ' + porAvisar.length + (porAvisar.length === 1 ? ' casa' : ' casas') + '.</strong> ' +
        'Pasaron ' + esc(c.avisoDiasTras) + ' días del vencimiento y no se les ha avisado en los últimos ' +
        esc(c.avisoRepetirDias) + '. Cada mensaje ya está escrito con su saldo.</div>' +
        '<button class="btn" data-accion="avisarTodos">' + CC.ui.icono('wa', 'i--sm') + ' Enviar avisos</button>' +
        '</div>');
    } else if (deudores.length) {
      out.push('<div class="note"><div>Todas las casas que deben ya tienen aviso reciente. ' +
        'Se vuelve a avisar cada ' + esc(c.avisoRepetirDias) + ' días; lo cambias en <a href="#/ajustes"><u>Ajustes</u></a>.</div></div>');
    }

    /* --- Filtros --- */
    var f = filtroAdeudos;
    var chips = [
      ['todas', 'Todas', deudores.length],
      ['avisar', 'Por avisar', porAvisar.length],
      ['largos', 'Tres meses o más', largos.length],
      ['convenio', 'En convenio', conConvenio.length]
    ].map(function (x) {
      return '<button class="chip' + (f === x[0] ? ' is-on' : '') + '" data-fadeudo="' + x[0] + '">' +
        esc(x[1]) + ' <em class="chip__n">' + x[2] + '</em></button>';
    }).join('');

    var visibles = deudores.filter(function (x) {
      if (f === 'avisar') return idsPorAvisar[x.unidad.id];
      if (f === 'largos') return x.situacion.mesesVencidos >= 3;
      if (f === 'convenio') return CC.Model.convenioDe(x.unidad.id);
      return true;
    });

    var hoy = CC.per.hoy();
    var filas = visibles.map(function (x) {
      var u = x.unidad, s = x.situacion;
      var cv = CC.Model.convenioDe(u.id);
      var ult = CC.Model.ultimoAviso(u.id);
      var texto = CC.Model.avisoAdeudo(u.id, p);
      var wa = linkWhatsApp(u, texto), mail = linkCorreo(u, CC.Model.asuntoAviso(u.id), texto);
      var meses = s.desde ? CC.per.dif(s.desde, hoy) + 1 : 0;
      var clase = s.mesesVencidos >= 2 ? 'row--crit' : 'row--warn';

      return '<tr class="' + clase + ' fila-clic" data-casa="' + esc(u.id) + '" title="Ver la casa">' +
        '<td><a href="#/unidad/' + esc(u.id) + '" class="strong">' + esc(u.clave) + '</a>' +
        '<div class="muted" style="font-size:11px">' + esc(u.inquilino || u.propietario) + '</div></td>' +
        '<td><div class="cellstack"><span>' + esc(s.desde ? CC.fmt.periodo(s.desde) : '—') + '</span>' +
        '<small>' + (meses > 1 ? meses + ' meses sin pagar' : 'este mes') + '</small></div></td>' +
        '<td><div class="cellstack">' + (s.ultimoPago
          ? '<span class="mono" style="font-size:12px">' + esc(CC.fmt.fecha(s.ultimoPago.fecha)) + '</span>' +
            '<small>' + esc(CC.fmt.money2(s.ultimoPago.monto)) + '</small>'
          : '<span class="muted">Sin pagos</span>') + '</div></td>' +
        '<td class="r strong">' + esc(CC.fmt.money2(s.saldo)) + '</td>' +
        '<td><div class="cellstack">' + (ult
          ? '<span>' + (ult.canal === 'correo' ? 'Correo' : 'WhatsApp') + '</span><small>' + esc(hace(ult.fecha)) + '</small>'
          : '<span class="muted">Sin aviso</span>') +
        (idsPorAvisar[u.id] ? '<small style="color:var(--warn);font-weight:600">toca avisar</small>' : '') +
        '</div></td>' +
        '<td>' + (cv
          ? '<button class="pill ' + CC.Model.ETIQUETA_CONVENIO[cv.estado].clase + ' pill--btn" data-vercv="' + esc(cv.convenio.id) + '">' +
            cv.pagadas + ' de ' + cv.plan.length + ' · ' + CC.Model.ETIQUETA_CONVENIO[cv.estado].texto + '</button>'
          : '<button class="btn btn--sm btn--ghost" data-nuevocv="' + esc(u.id) + '">Convenio</button>') + '</td>' +
        '<td class="r noprint" style="white-space:nowrap">' +
        (wa ? '<a class="btn btn--sm btn--soft" target="_blank" rel="noopener" href="' + esc(wa) + '" data-avisado="' + esc(u.id) + '|whatsapp" title="Avisar por WhatsApp">' +
          CC.ui.icono('wa', 'i--sm') + '</a> ' : '') +
        (mail ? '<a class="btn btn--sm btn--ghost" href="' + esc(mail) + '" data-avisado="' + esc(u.id) + '|correo" title="Avisar por correo">' +
          CC.ui.icono('difusion', 'i--sm') + '</a>' : '') +
        '</td></tr>';
    }).join('');

    out.push('<div class="section">' +
      '<div class="section__head"><h2>Quién dejó de pagar y desde cuándo</h2>' +
      '<p>De la casa que lleva más tiempo sin pagar a la más reciente.</p></div>' +
      '<div class="chips noprint">' + chips + '</div>' +
      '<div class="panelbox"><div class="tablewrap"><table class="ledger">' +
      '<thead><tr><th>Casa</th><th>Sin pagar desde</th><th>Último pago</th><th class="r">Debe</th>' +
      '<th>Último aviso</th><th>Convenio</th><th class="noprint"></th></tr></thead>' +
      '<tbody>' + (filas || '<tr><td colspan="7"><div class="empty"><strong>' +
        (deudores.length ? 'Ninguna casa en este filtro' : 'Nadie tiene pagos vencidos') + '</strong>' +
        '<p>' + (deudores.length ? 'Prueba con otro filtro.' : 'Todas las casas están al corriente.') + '</p></div></td></tr>') +
      '</tbody>' +
      (visibles.length ? '<tfoot><tr><td colspan="3">' + visibles.length + (visibles.length === 1 ? ' casa' : ' casas') + '</td>' +
        '<td class="r">' + esc(CC.fmt.money2(visibles.reduce(function (a, x) { return a + x.situacion.saldo; }, 0))) + '</td>' +
        '<td colspan="3"></td></tr></tfoot>' : '') +
      '</table></div></div></div>');

    /* --- Convenios --- */
    var convenios = CC.Store.convenios().map(CC.Model.estadoConvenio)
      .filter(function (e) { return e.estado !== 'cancelado'; });
    out.push('<div class="section">' +
      '<div class="section__head"><h2>Convenios de pago</h2>' +
      '<p>Adeudos partidos en parcialidades. Cada pago marcado como abono al convenio lo va cubriendo.</p></div>' +
      '<div class="panelbox">' + (convenios.length
        ? '<div class="tablewrap"><table class="ledger"><thead><tr><th>Folio</th><th>Casa</th><th class="r">Adeudo</th>' +
          '<th>Avance</th><th>Siguiente pago</th><th class="c">Estado</th><th class="noprint"></th></tr></thead><tbody>' +
          convenios.map(function (e) {
            var cv = e.convenio, u = CC.Store.unidad(cv.unidadId);
            var et = CC.Model.ETIQUETA_CONVENIO[e.estado];
            var pct = (e.pagadas / e.plan.length) * 100;
            return '<tr class="' + (e.estado === 'atrasado' ? 'row--crit' : '') + '">' +
              '<td class="mono" style="font-size:12px">' + esc(CC.Comprobantes.folio('CV-', cv.folio)) + '</td>' +
              '<td>' + (u ? '<a class="strong" href="#/unidad/' + esc(u.id) + '">' + esc(u.clave) + '</a>' : '—') + '</td>' +
              '<td class="r">' + esc(CC.fmt.money2(cv.adeudo)) + '</td>' +
              '<td style="min-width:130px"><div class="cellstack"><span class="bar__track" style="display:block">' +
              '<span class="bar__fill" style="width:' + pct.toFixed(1) + '%;background:' +
              (e.estado === 'atrasado' ? 'var(--crit)' : 'var(--good)') + '"></span></span>' +
              '<small>' + e.pagadas + ' de ' + e.plan.length + ' · ' + esc(CC.fmt.money(e.pagado)) + ' pagado</small></div></td>' +
              '<td>' + (e.siguiente
                ? '<div class="cellstack"><span>' + esc(CC.fmt.money2(e.siguiente.monto)) + '</span><small>' +
                  esc(CC.fmt.fecha(e.siguiente.fecha)) + '</small></div>'
                : '<span class="muted">—</span>') + '</td>' +
              '<td class="c"><span class="pill ' + et.clase + '">' + et.texto + '</span></td>' +
              '<td class="r noprint" style="white-space:nowrap">' +
              '<button class="btn btn--sm btn--ghost" data-vercv="' + esc(cv.id) + '">Ver</button> ' +
              '<button class="btn btn--sm btn--ghost" data-pdfcv="' + esc(cv.id) + '" title="Descargar PDF">PDF</button></td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="empty"><strong>Sin convenios</strong><p>Desde la lista de arriba, el botón "Convenio" parte el adeudo ' +
          'de una casa en pagos y baja el documento para firmar.</p></div>') +
      '</div></div>');

    out.push('<p class="field__hint noprint">El sistema detecta a quién le toca y escribe cada mensaje con su saldo; ' +
      'el envío final es un clic tuyo en WhatsApp o en tu correo. Así nada sale sin que lo veas.</p>');

    return out.join('');
  },

  montar: function (raiz, ctx, redibujar) {
    raiz.querySelectorAll('[data-fadeudo]').forEach(function (b) {
      b.onclick = function () { filtroAdeudos = b.getAttribute('data-fadeudo'); redibujar(); };
    });
    raiz.querySelectorAll('[data-avisado]').forEach(function (a) {
      a.addEventListener('click', function () {
        var partes = a.getAttribute('data-avisado').split('|');
        var s = CC.Model.situacion(partes[0], ctx.periodo);
        // Se anota después del clic: al guardar se redibuja la tabla, y el
        // enlace tiene que alcanzar a abrir WhatsApp o el correo primero.
        setTimeout(function () {
          CC.Store.registrarAvisoAdeudo({
            unidadId: partes[0], canal: partes[1],
            saldo: Math.round(s.saldo * 100) / 100, meses: s.mesesVencidos
          });
          CC.ui.toast('Aviso anotado en el historial de la casa', 'good');
        }, 0);
      });
    });
    raiz.querySelectorAll('[data-nuevocv]').forEach(function (b) {
      b.onclick = function () { formularioConvenio(b.getAttribute('data-nuevocv'), ctx.periodo); };
    });
    raiz.querySelectorAll('[data-vercv]').forEach(function (b) {
      b.onclick = function () { verConvenio(b.getAttribute('data-vercv')); };
    });
    raiz.querySelectorAll('[data-pdfcv]').forEach(function (b) {
      b.onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.convenio(b.getAttribute('data-pdfcv'))); };
    });
  },

  /* ---------- Acciones ---------- */
  avisarTodos: function (ctx) {
    var lista = CC.Model.porAvisar(ctx.periodo);
    if (!lista.length) {
      lista = CC.Model.deudores(ctx.periodo);
      if (!lista.length) { CC.ui.toast('Nadie tiene pagos vencidos', 'good'); return; }
      CC.ui.toast('Todas ya tenían aviso reciente: se muestran todas las que deben');
    }
    colaAvisos(lista.map(function (x) { return x.unidad.id; }), ctx.periodo);
  },
  avisarUna: function (unidadId, periodo) { colaAvisos([unidadId], periodo); },
  convenio: function (unidadId, periodo) { formularioConvenio(unidadId, periodo); },
  verConvenio: verConvenio,
  convenioHTML: convenioHTML
};
