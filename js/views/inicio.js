/* views/inicio.js — Primeros pasos: dar de alta el condominio.
 *
 * El programa del condominio empieza en blanco (sin ejemplo, sin nombres
 * inventados). Aquí, paso por paso, capturan lo suyo: los datos del condominio,
 * la cuota y los recargos, las casas con su dueño, lo que debía cada casa al
 * empezar (lo que traen de CondoVive), el saldo del banco y la caja, los usuarios
 * con contraseña y, al final, la hoja de arranque para que el comité dé el visto
 * bueno (lo pidió la administradora en la reunión: "que lo revisen").
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

function arranque() { return CC.Store.estado().meta.arranque || {}; }

/** El mes en que empiezan a cobrar con el sistema (por omisión, el actual). */
function mesInicio() { return CC.Store.condominio().inicio || CC.per.hoy(); }

/** De "Casa 12", "12", " 12 " o 12 a la clave con que se guardó la casa. */
function claveDe(texto) {
  return String(texto === null || texto === undefined ? '' : texto).replace(/^\s*(casa|no\.?|n[uú]m(ero)?\.?)\s*/i, '').trim();
}

var PASOS = [
  {
    id: 'datos', titulo: 'Datos del condominio',
    texto: 'Nombre, dirección, quién administra, la cuenta del banco para que les paguen y el logo.',
    hecho: function () { var c = CC.Store.condominio(); return !!(c.nombre && c.administrador); },
    estado: function () { var c = CC.Store.condominio(); return c.nombre ? c.nombre + (c.logo ? ' · con logo' : ' · sin logo todavía') : ''; },
    boton: 'Llenar los datos', accion: function () { pasoDatos(); }
  },
  {
    id: 'reglas', titulo: 'Cuota y recargos',
    texto: 'Cuánto paga cada casa al mes, hasta qué día, los recargos y desde qué mes empiezan a cobrar con el sistema.',
    hecho: function () { return !!arranque().reglas; },
    estado: function () {
      var c = CC.Store.condominio();
      return arranque().reglas ? CC.fmt.money2(c.cuotaCasa || 0) + ' por casa · vence el día ' + c.diaVencimiento +
        ' · empiezan en ' + CC.fmt.periodo(mesInicio()).toLowerCase() : '';
    },
    boton: 'Poner la cuota', accion: function () { pasoReglas(); }
  },
  {
    id: 'casas', titulo: 'Las casas y sus dueños',
    texto: 'Crear las casas por su número y ponerle a cada una su dueño, teléfono y correo. Se puede subir desde Excel.',
    hecho: function () {
      var u = CC.Store.unidades();
      return u.length > 0 && u.every(function (x) { return x.propietario; });
    },
    estado: function () {
      var u = CC.Store.unidades();
      if (!u.length) return '';
      var falta = u.filter(function (x) { return !x.propietario; }).length;
      return u.length + ' casas' + (falta ? ' · faltan ' + falta + (falta === 1 ? ' nombre' : ' nombres') : ' · todas con dueño');
    },
    boton: 'Dar de alta las casas', accion: function () { pasoCasas(); }
  },
  {
    id: 'adeudos', titulo: 'Lo que debía cada casa al empezar',
    texto: 'El adeudo que traen de CondoVive, casa por casa. Si nadie debía, también se marca.',
    hecho: function () { return !!arranque().adeudos; },
    estado: function () {
      var cs = CC.Store.cargos().filter(function (c) { return c.tipo === 'inicial'; });
      if (!arranque().adeudos) return '';
      var casas = {}; cs.forEach(function (c) { casas[c.unidadId] = 1; });
      var t = cs.reduce(function (a, c) { return a + (Number(c.monto) || 0); }, 0);
      return cs.length ? Object.keys(casas).length + ' casas debían ' + CC.fmt.money2(t) : 'Ninguna casa debía';
    },
    boton: 'Poner los adeudos', accion: function () { pasoAdeudos(); }
  },
  {
    id: 'saldos', titulo: 'Banco y caja chica',
    texto: 'Con cuánto empiezan: el saldo del banco y el efectivo que hay en la caja chica ese día.',
    hecho: function () { return !!arranque().saldos; },
    estado: function () {
      if (!arranque().saldos) return '';
      return CC.Store.cuentas().map(function (c) { return c.nombre + ' ' + CC.fmt.money2(c.saldoInicial || 0); }).join(' · ');
    },
    boton: 'Poner los saldos', accion: function () { pasoSaldos(); }
  },
  {
    id: 'usuarios', titulo: 'Usuarios y contraseñas',
    texto: 'Cada quien entra con su nombre y su contraseña, y el sistema anota quién hizo cada cosa. Uno de la administración y uno del comité, cuando menos.',
    hecho: function () {
      var u = CC.Store.usuarios().filter(function (x) { return x.activo; });
      return u.some(function (x) { return x.rol === 'comite'; }) && u.some(function (x) { return x.rol === 'admin'; });
    },
    estado: function () {
      var u = CC.Store.usuarios().filter(function (x) { return x.activo; });
      return u.length ? u.map(function (x) { return x.nombre + ' (' + CC.Sesion.nombreRol(x.rol).toLowerCase() + ')'; }).join(' · ') : '';
    },
    boton: 'Crear los usuarios', accion: function () { pasoUsuarios(); }
  },
  {
    id: 'hoja', titulo: 'Hoja de arranque para el comité',
    texto: 'Un PDF con todo lo que se capturó para arrancar: las reglas, los saldos y lo que debe cada casa. Se imprime y lo firman la administración y el comité.',
    hecho: function () { return !!arranque().hoja; },
    estado: function () { var h = arranque().hoja; return h ? 'Bajada el ' + CC.fmt.fechaCorta(String(h).slice(0, 10)) : ''; },
    boton: 'Bajar la hoja de arranque', accion: function () {
      CC.Comprobantes.descargar(CC.Comprobantes.hojaArranque()).then(function (r) { if (r) CC.Store.marcarArranque('hoja'); });
    }
  }
];

/* ---------- 1. Datos del condominio ---------- */
function pasoDatos() {
  var esc = CC.ui.esc, c = CC.Store.condominio();
  var logo = c.logo || null;
  function campo(id, lab, val, ph, hint) {
    return '<label class="field"><span class="field__lab">' + lab + '</span><input class="input" id="' + id + '" value="' + esc(val || '') +
      '" placeholder="' + esc(ph || '') + '">' + (hint ? '<span class="field__hint">' + hint + '</span>' : '') + '</label>';
  }
  CC.ui.modal('Datos del condominio',
    '<div class="formgrid">' +
    campo('dNombre', 'Nombre del condominio', c.nombre, 'Condominio …') +
    campo('dAdmin', 'Quién administra', c.administrador, 'Nombre de la administradora o del comité', 'Sale en los recibos') +
    campo('dDir', 'Dirección', c.direccion, 'Calle y número') +
    campo('dCiudad', 'Ciudad', c.ciudad, 'Guadalajara, Jalisco') +
    campo('dTel', 'Teléfono de la administración', c.telefono, '33 1234 5678') +
    campo('dMail', 'Correo de la administración', c.email, 'administracion@…') +
    '</div>' +
    '<label class="field" style="margin-top:14px"><span class="field__lab">Cuenta para que les paguen</span>' +
    '<input class="input mono" id="dCuenta" value="' + esc(c.cuenta || '') + '" placeholder="Banco, número de cuenta y CLABE">' +
    '<span class="field__hint">Sale en los avisos de adeudo y en los estados de cuenta</span></label>' +
    '<div class="field" style="margin-top:14px"><span class="field__lab">Logo</span><div class="logocond" id="dLogoCaja"></div>' +
    '<input type="file" id="dLogo" accept="image/*" hidden><span class="field__hint">Sale arriba en los recibos y estados de cuenta</span></div>' +
    '<div class="formactions"><button type="button" class="btn btn--ghost" id="dCerrar">Cerrar</button>' +
    '<button type="button" class="btn" id="dOk">Guardar</button></div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      function pintarLogo() {
        q('dLogoCaja').innerHTML = (logo ? '<img src="' + esc(logo) + '" alt="Logo">' : '<span class="muted">Sin logo</span>') +
          '<label class="btn btn--sm btn--ghost" for="dLogo">' + (logo ? 'Cambiar logo' : 'Subir logo') + '</label>' +
          (logo ? '<button type="button" class="btn btn--sm btn--ghost" id="dLogoQuitar">Quitar</button>' : '');
        if (q('dLogoQuitar')) q('dLogoQuitar').onclick = function () { logo = null; pintarLogo(); };
      }
      pintarLogo();
      q('dLogo').onchange = function () {
        var f = q('dLogo').files && q('dLogo').files[0];
        if (f) CC.ui.imagenEnBlanco(f, 500).then(function (d) { logo = d; pintarLogo(); }, function (e) { CC.ui.toast(e.message, 'crit'); });
      };
      q('dCerrar').onclick = CC.ui.cerrarModal;
      q('dOk').onclick = function () {
        if (!q('dNombre').value.trim()) { CC.ui.toast('Falta el nombre del condominio', 'crit'); q('dNombre').focus(); return; }
        if (!q('dAdmin').value.trim()) { CC.ui.toast('Falta quién administra', 'crit'); q('dAdmin').focus(); return; }
        CC.Store.actualizarCondominio({
          nombre: q('dNombre').value.trim(), administrador: q('dAdmin').value.trim(), direccion: q('dDir').value.trim(),
          ciudad: q('dCiudad').value.trim(), telefono: q('dTel').value.trim(), email: q('dMail').value.trim(),
          cuenta: q('dCuenta').value.trim(), logo: logo
        });
        CC.ui.cerrarModal();
        CC.ui.toast('Datos del condominio guardados', 'good');
      };
    });
}

/* ---------- 2. Cuota y recargos ---------- */
function pasoReglas() {
  var esc = CC.ui.esc, c = CC.Store.condominio();
  var tr = (c.recargoTramos || []).concat([{ dia: '', monto: '' }, { dia: '', monto: '' }]).slice(0, 2);
  var hoy = CC.per.hoy(), inicio = mesInicio();
  var meses = [-2, -1, 0, 1, 2, 3].map(function (k) { return CC.per.suma(hoy, k); });
  if (meses.indexOf(inicio) < 0) meses.push(inicio);
  CC.ui.modal('Cuota y recargos',
    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">Cuota de cada casa al mes</span>' +
    '<input class="input num" id="rCuota" type="number" min="0" step="0.01" value="' + esc(c.cuotaCasa || '') + '" placeholder="1500">' +
    '<span class="field__hint">Si alguna casa paga distinto, se cambia en esa casa</span></label>' +
    '<label class="field"><span class="field__lab">Se paga a más tardar el día</span>' +
    '<input class="input num" id="rDia" type="number" min="1" max="28" value="' + esc(c.diaVencimiento || 5) + '"></label>' +
    '<label class="field"><span class="field__lab">Empiezan a cobrar con el sistema en</span><select class="input" id="rInicio">' +
    meses.sort().map(function (p) { return '<option value="' + p + '"' + (p === inicio ? ' selected' : '') + '>' + esc(CC.fmt.periodo(p)) + '</option>'; }).join('') +
    '</select><span class="field__hint">Lo de antes se pone como "lo que debía cada casa"</span></label>' +
    '</div>' +
    '<div class="recargos"><span class="field__lab">Recargo si pagan tarde</span>' +
    '<label class="check check--suave" style="margin:8px 0 10px"><input type="checkbox" id="rSin"' + (c.recargoModo === 'tramos' ? '' : ' checked') + '> No cobramos recargos</label>' +
    '<div id="rTramos">' + tr.map(function (t, i) {
      return '<div class="tramo">Si pagan desde el día <input class="input input--sm num" type="number" min="1" max="31" id="rDia' + i + '" value="' + esc(t.dia) +
        '"> el recargo es de $<input class="input input--sm num" type="number" min="0" id="rMonto' + i + '" value="' + esc(t.monto) + '"></div>';
    }).join('') +
    '<p class="field__hint">Por ejemplo: desde el día 6, $50; desde el día 18, $100. El sistema pone el recargo solo, uno por mes.</p></div></div>' +
    '<div class="formactions"><button type="button" class="btn btn--ghost" id="rCerrar">Cerrar</button>' +
    '<button type="button" class="btn" id="rOk">Guardar</button></div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      q('rSin').onchange = function () { q('rTramos').hidden = q('rSin').checked; };
      q('rSin').onchange();
      q('rCerrar').onclick = CC.ui.cerrarModal;
      q('rOk').onclick = function () {
        var cuota = Number(q('rCuota').value);
        if (!(cuota > 0)) { CC.ui.toast('Pon la cuota de cada casa', 'crit'); q('rCuota').focus(); return; }
        var tramos = [0, 1].map(function (i) { return { dia: Number(q('rDia' + i).value), monto: Number(q('rMonto' + i).value) }; })
          .filter(function (t) { return t.dia >= 1 && t.monto > 0; }).sort(function (a, b) { return a.dia - b.dia; });
        var sin = q('rSin').checked || !tramos.length;
        var anterior = Number(c.cuotaCasa) || 0;
        var casas = CC.Store.unidades();
        CC.Store.actualizarCondominio({
          cuotaCasa: cuota, diaVencimiento: Math.min(28, Math.max(1, Number(q('rDia').value) || 5)),
          recargoModo: sin ? 'ninguno' : 'tramos', recargoTramos: sin ? [] : tramos,
          inicio: q('rInicio').value, presupuestoMensual: cuota * casas.length
        });
        // Las casas que tenían la cuota de antes (o ninguna) se quedan con la nueva
        var cambiar = casas.filter(function (u) { return u.cuotaOverride === null || u.cuotaOverride === undefined || Number(u.cuotaOverride) === anterior; })
          .map(function (u) { return { id: u.id, cambios: { cuotaOverride: cuota } }; });
        if (cambiar.length) CC.Store.actualizarUnidades(cambiar);
        CC.Store.marcarArranque('reglas');
        CC.Model.aplicarRecargos();
        CC.ui.cerrarModal();
        CC.ui.toast('Cuota y recargos guardados', 'good');
      };
    });
}

/* ---------- 3. Las casas ---------- */
function pasoCasas() {
  if (CC.Store.unidades().length) { padron(); return; }
  var esc = CC.ui.esc, c = CC.Store.condominio();
  CC.ui.modal('Dar de alta las casas',
    '<p style="font-size:13.5px;color:var(--ink-2);margin-bottom:14px">Se crean de un jalón, con su número. Después llenas el dueño, ' +
    'el teléfono y el correo de cada una (o los subes desde Excel).</p>' +
    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">¿Cuántas casas son?</span>' +
    '<input class="input num" id="cN" type="number" min="1" max="2000" value="' + esc(c.casasPrevistas || '') + '" placeholder="105"></label>' +
    '<label class="field"><span class="field__lab">Empiezan en el número</span>' +
    '<input class="input num" id="cDesde" type="number" min="0" value="1"></label>' +
    '<label class="field"><span class="field__lab">Cuota de cada una</span>' +
    '<input class="input num" id="cCuota" type="number" min="0" step="0.01" value="' + esc(c.cuotaCasa || '') + '" placeholder="1500"></label>' +
    '</div>' +
    '<div class="formactions"><button type="button" class="btn btn--ghost" id="cCerrar">Cerrar</button>' +
    '<button type="button" class="btn" id="cOk">Crear las casas</button></div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      q('cCerrar').onclick = CC.ui.cerrarModal;
      q('cOk').onclick = function () {
        var n = Math.round(Number(q('cN').value)), desde = Math.round(Number(q('cDesde').value) || 0);
        var cuota = Number(q('cCuota').value) || Number(c.cuotaCasa) || null;
        if (!(n > 0)) { CC.ui.toast('¿Cuántas casas son?', 'crit'); q('cN').focus(); return; }
        var lista = [];
        for (var i = 0; i < n; i++) {
          var num = String(desde + i);
          lista.push({ clave: num, calle: '', numero: num, prototipo: '', m2: '', propietario: '', inquilino: null,
            telefono: '', email: '', ocupacion: 'Propietario', cuotaOverride: cuota });
        }
        CC.Store.agregarUnidades(lista);
        if (cuota) CC.Store.actualizarCondominio({ cuotaCasa: cuota, presupuestoMensual: cuota * CC.Store.unidades().length });
        CC.ui.toast(n + ' casas creadas: ahora pon el dueño de cada una', 'good');
        padron();
      };
    });
}

/** Busca en la primera fila los encabezados que se reconocen; si no hay, usa el orden casa, dueño, teléfono, correo. */
function columnasPadron(filas) {
  var pistas = {
    // "No.", "Núm", "Número de casa"… pero no "Nombre"
    casa: /^(casa\b|no\.|no$|n[uú]m(\.|ero)?(\s|$)|n[uú]mero|unidad|lote|depto|#)/, propietario: /propietari|due[ñn]o|nombre|cond[oó]mino/,
    telefono: /tel|cel|whats|m[oó]vil/, email: /correo|mail/, inquilino: /inquilin|arrendatari|habita|renta/,
    debe: /debe|adeudo|saldo/, meses: /mes/
  };
  var f0 = (filas[0] || []).map(function (x) { return String(x).toLowerCase().trim(); });
  var cols = {};
  Object.keys(pistas).forEach(function (k) {
    for (var j = 0; j < f0.length; j++) {
      var usada = Object.keys(cols).some(function (q) { return cols[q] === j; });
      if (!usada && pistas[k].test(f0[j])) { cols[k] = j; break; }
    }
  });
  if (cols.casa === undefined) return { inicio: 0, cols: { casa: 0, propietario: 1, telefono: 2, email: 3, debe: 1, meses: 2 } };
  return { inicio: 1, cols: cols };
}

/** Lee un Excel o CSV y regresa sus renglones con la clave de la casa ya limpia. */
function leerPadron(archivo) {
  return CC.Importar.leer(archivo).then(function (filas) {
    var d = columnasPadron(filas);
    return filas.slice(d.inicio).map(function (f) {
      var o = {};
      Object.keys(d.cols).forEach(function (k) { o[k] = f[d.cols[k]] === undefined ? '' : String(f[d.cols[k]]).trim(); });
      o.casa = claveDe(o.casa);
      return o;
    }).filter(function (o) { return o.casa; });
  });
}

/** El padrón en una tabla: todas las casas para llenar de corrido. */
function padron() {
  var esc = CC.ui.esc;
  var casas = CC.Store.unidades().slice().sort(CC.Model.ordenCasas);
  CC.ui.modal('El padrón: dueño, teléfono y correo de cada casa',
    '<p style="font-size:13px;color:var(--ink-2);margin-bottom:10px">Escribe de corrido (con Tab pasas al siguiente) o sube el Excel que tengan: ' +
    'una columna con el número de casa y las demás con dueño, teléfono y correo.</p>' +
    '<div class="formrow" style="gap:8px;margin-bottom:10px">' +
    '<label class="btn btn--sm btn--soft" for="pArchivo">' + CC.ui.icono('reportes', 'i--sm') + ' Subir desde Excel o CSV</label>' +
    '<input type="file" id="pArchivo" accept=".xlsx,.csv,.txt" hidden>' +
    '<button type="button" class="btn btn--sm btn--ghost" id="pMas">' + CC.ui.icono('mas', 'i--sm') + ' Agregar más casas</button>' +
    '<span class="muted" id="pCuenta" style="font-size:12px;align-self:center"></span></div>' +
    '<div class="tablewrap padron"><table class="ledger"><thead><tr><th>Casa</th><th>Dueño (sale en los recibos)</th><th>Teléfono (WhatsApp)</th>' +
    '<th>Correo</th><th>Quién vive, si la rentan</th></tr></thead><tbody>' +
    casas.map(function (u) {
      return '<tr data-id="' + esc(u.id) + '"><td class="strong mono">' + esc(u.clave) + '</td>' +
        '<td><input class="input input--sm" data-c="propietario" value="' + esc(u.propietario || '') + '"></td>' +
        '<td><input class="input input--sm mono" data-c="telefono" inputmode="tel" value="' + esc(u.telefono || '') + '"></td>' +
        '<td><input class="input input--sm" data-c="email" type="email" value="' + esc(u.email || '') + '"></td>' +
        '<td><input class="input input--sm" data-c="inquilino" value="' + esc(u.inquilino || '') + '"></td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<div class="formactions" style="margin-top:12px"><button type="button" class="btn btn--ghost" id="pCerrar">Cerrar sin guardar</button>' +
    '<button type="button" class="btn" id="pOk">Guardar el padrón</button></div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      function contar() {
        var vacios = Array.prototype.filter.call(cuerpo.querySelectorAll('[data-c="propietario"]'), function (i) { return !i.value.trim(); }).length;
        q('pCuenta').textContent = casas.length + ' casas · ' + (vacios ? 'faltan ' + vacios + (vacios === 1 ? ' dueño' : ' dueños') : 'todas con dueño');
      }
      contar();
      cuerpo.addEventListener('input', contar);
      q('pCerrar').onclick = CC.ui.cerrarModal;
      q('pMas').onclick = function () { CC.ui.cerrarModal(); masCasas(); };
      q('pArchivo').onchange = function () {
        var f = q('pArchivo').files && q('pArchivo').files[0];
        if (!f) return;
        leerPadron(f).then(function (filas) {
          var puestas = 0, noHay = [];
          filas.forEach(function (o) {
            var u = casas.filter(function (x) { return String(x.clave) === o.casa; })[0];
            if (!u) { noHay.push(o.casa); return; }
            var tr = cuerpo.querySelector('tr[data-id="' + u.id + '"]');
            ['propietario', 'telefono', 'email', 'inquilino'].forEach(function (k) {
              if (o[k]) tr.querySelector('[data-c="' + k + '"]').value = o[k];
            });
            puestas++;
          });
          contar();
          CC.ui.toast(puestas + ' casas llenadas desde el archivo' + (noHay.length ? '; no existen: ' + noHay.slice(0, 5).join(', ') : '') +
            '. Revisa y guarda.', puestas ? 'good' : 'crit');
        }, function (err) { CC.ui.toast(err.message || 'No se pudo leer el archivo', 'crit'); });
      };
      q('pOk').onclick = function () {
        var lista = [];
        cuerpo.querySelectorAll('tr[data-id]').forEach(function (tr) {
          var u = CC.Store.unidad(tr.getAttribute('data-id'));
          var c = {};
          ['propietario', 'telefono', 'email', 'inquilino'].forEach(function (k) {
            var v = tr.querySelector('[data-c="' + k + '"]').value.trim();
            if (k === 'inquilino') v = v || null;
            if ((u[k] || null) !== (v || null)) c[k] = v;
          });
          if (c.inquilino !== undefined) c.ocupacion = c.inquilino ? 'Rentada' : 'Propietario';
          if (Object.keys(c).length) lista.push({ id: u.id, cambios: c });
        });
        if (lista.length) CC.Store.actualizarUnidades(lista);
        CC.ui.cerrarModal();
        CC.ui.toast(lista.length ? 'Padrón guardado (' + lista.length + (lista.length === 1 ? ' casa' : ' casas') + ')' : 'No había cambios', 'good');
      };
    }, { ancho: true });
}

function masCasas() {
  var casas = CC.Store.unidades();
  var ultimo = casas.reduce(function (a, u) { return Math.max(a, Number(u.clave) || 0); }, 0);
  CC.ui.modal('Agregar más casas',
    '<div class="formgrid"><label class="field"><span class="field__lab">¿Cuántas más?</span>' +
    '<input class="input num" id="mN" type="number" min="1" value="1"></label>' +
    '<label class="field"><span class="field__lab">Desde el número</span><input class="input num" id="mDesde" type="number" value="' + (ultimo + 1) + '"></label></div>' +
    '<div class="formactions"><button type="button" class="btn btn--ghost" id="mCerrar">Cerrar</button><button type="button" class="btn" id="mOk">Agregar</button></div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      q('mCerrar').onclick = CC.ui.cerrarModal;
      q('mOk').onclick = function () {
        var n = Math.round(Number(q('mN').value)), desde = Math.round(Number(q('mDesde').value));
        var cuota = Number(CC.Store.condominio().cuotaCasa) || null;
        var existen = {}; casas.forEach(function (u) { existen[String(u.clave)] = 1; });
        var lista = [];
        for (var i = 0; i < n; i++) {
          var num = String(desde + i);
          if (existen[num]) { CC.ui.toast('La casa ' + num + ' ya existe', 'crit'); return; }
          lista.push({ clave: num, calle: '', numero: num, prototipo: '', m2: '', propietario: '', inquilino: null,
            telefono: '', email: '', ocupacion: 'Propietario', cuotaOverride: cuota });
        }
        if (!lista.length) return;
        CC.Store.agregarUnidades(lista);
        padron();
      };
    });
}

/* ---------- 4. Lo que debía cada casa ---------- */
function pasoAdeudos() {
  var esc = CC.ui.esc;
  var casas = CC.Store.unidades().slice().sort(CC.Model.ordenCasas);
  if (!casas.length) { CC.ui.toast('Primero da de alta las casas (paso 3)', 'crit'); return; }
  var inicio = mesInicio();
  var antes = {};
  CC.Store.cargos().filter(function (c) { return c.tipo === 'inicial'; }).forEach(function (c) {
    var a = antes[c.unidadId] = antes[c.unidadId] || { debe: 0, meses: 0 };
    a.debe += Number(c.monto) || 0; a.meses++;
  });
  CC.ui.modal('Lo que debía cada casa al empezar',
    '<p style="font-size:13px;color:var(--ink-2);margin-bottom:10px">El adeudo de cada casa hasta ' +
    esc(CC.fmt.periodo(CC.per.suma(inicio, -1)).toLowerCase()) + ', como lo traen de CondoVive (cuotas y recargos juntos). ' +
    'Deja en blanco las que no deben. Si debe varios meses, pon cuántos: así el sistema sabe desde cuándo debe.</p>' +
    '<div class="formrow" style="gap:8px;margin-bottom:10px">' +
    '<label class="btn btn--sm btn--soft" for="aArchivo">' + CC.ui.icono('reportes', 'i--sm') + ' Subir desde Excel o CSV</label>' +
    '<input type="file" id="aArchivo" accept=".xlsx,.csv,.txt" hidden>' +
    '<span class="muted" id="aTotal" style="font-size:12px;align-self:center"></span></div>' +
    '<div class="tablewrap padron"><table class="ledger"><thead><tr><th>Casa</th><th>Dueño</th><th class="r">Debe ($)</th><th class="r">Meses que debe</th></tr></thead><tbody>' +
    casas.map(function (u) {
      var a = antes[u.id];
      return '<tr data-id="' + esc(u.id) + '"><td class="strong mono">' + esc(u.clave) + '</td><td>' + esc(u.propietario || '—') + '</td>' +
        '<td class="r"><input class="input input--sm num" style="width:120px;text-align:right" type="number" min="0" step="0.01" data-c="debe" value="' + (a ? a.debe.toFixed(2) : '') + '"></td>' +
        '<td class="r"><input class="input input--sm num" style="width:80px;text-align:right" type="number" min="1" max="36" data-c="meses" value="' + (a ? a.meses : '') + '" placeholder="1"></td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<div class="formactions" style="margin-top:12px"><button type="button" class="btn btn--ghost" id="aCerrar">Cerrar sin guardar</button>' +
    '<button type="button" class="btn btn--ghost" id="aNadie">Nadie debía</button>' +
    '<button type="button" class="btn" id="aOk">Guardar los adeudos</button></div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      function total() {
        var t = 0, n = 0;
        cuerpo.querySelectorAll('[data-c="debe"]').forEach(function (i) { var v = Number(i.value); if (v > 0) { t += v; n++; } });
        q('aTotal').textContent = n ? n + (n === 1 ? ' casa debe ' : ' casas deben ') + CC.fmt.money2(t) : 'Ninguna casa con adeudo';
      }
      total();
      cuerpo.addEventListener('input', total);
      q('aCerrar').onclick = CC.ui.cerrarModal;
      q('aArchivo').onchange = function () {
        var f = q('aArchivo').files && q('aArchivo').files[0];
        if (!f) return;
        leerPadron(f).then(function (filas) {
          var puestas = 0;
          filas.forEach(function (o) {
            var u = casas.filter(function (x) { return String(x.clave) === o.casa; })[0];
            var monto = CC.Importar.numero(o.debe);
            if (!u || !(monto > 0)) return;
            var tr = cuerpo.querySelector('tr[data-id="' + u.id + '"]');
            tr.querySelector('[data-c="debe"]').value = monto.toFixed(2);
            if (Number(o.meses) > 0) tr.querySelector('[data-c="meses"]').value = Math.round(Number(o.meses));
            puestas++;
          });
          total();
          CC.ui.toast(puestas + ' adeudos llenados desde el archivo. Revisa y guarda.', puestas ? 'good' : 'crit');
        }, function (err) { CC.ui.toast(err.message || 'No se pudo leer el archivo', 'crit'); });
      };
      function guardar(cargos) {
        CC.Store.ponerSaldosAnteriores(cargos);
        CC.Store.marcarArranque('adeudos');
        CC.ui.cerrarModal();
        CC.ui.toast(cargos.length ? 'Adeudos guardados' : 'Listo: ninguna casa debía', 'good');
      }
      q('aNadie').onclick = function () { guardar([]); };
      q('aOk').onclick = function () {
        var dia = CC.Store.condominio().diaVencimiento || 5;
        var cargos = [];
        cuerpo.querySelectorAll('tr[data-id]').forEach(function (tr) {
          var debe = Math.round((Number(tr.querySelector('[data-c="debe"]').value) || 0) * 100) / 100;
          if (!(debe > 0)) return;
          var m = Math.max(1, Math.min(36, Math.round(Number(tr.querySelector('[data-c="meses"]').value) || 1)));
          var parte = Math.floor(debe / m * 100) / 100;
          // del mes más viejo al más reciente; el último se queda con los centavos
          for (var k = m; k >= 1; k--) {
            var per = CC.per.suma(inicio, -k);
            cargos.push({
              unidadId: tr.getAttribute('data-id'), periodo: per, fechaVence: CC.per.vence(per, dia),
              concepto: 'Saldo anterior al sistema — ' + CC.fmt.periodo(per),
              monto: k === 1 ? Math.round((debe - parte * (m - 1)) * 100) / 100 : parte
            });
          }
        });
        guardar(cargos);
      };
    }, { ancho: true });
}

/* ---------- 5. Banco y caja chica ---------- */
function pasoSaldos() {
  var esc = CC.ui.esc;
  CC.ui.modal('Banco y caja chica: con cuánto empiezan',
    '<p style="font-size:13px;color:var(--ink-2);margin-bottom:12px">Lo que había el día que empezaron con el sistema: el saldo del ' +
    'estado de cuenta del banco y el efectivo contado de la caja chica. De ahí en adelante, el sistema suma y resta solo.</p>' +
    '<div class="formgrid">' + CC.Store.cuentas().map(function (c) {
      return '<label class="field"><span class="field__lab">' + esc(c.nombre) + '</span>' +
        '<input class="input num" type="number" step="0.01" data-cuenta="' + esc(c.id) + '" value="' + esc(c.saldoInicial || '') + '" placeholder="0.00"></label>';
    }).join('') + '</div>' +
    '<div class="formactions"><button type="button" class="btn btn--ghost" id="sCerrar">Cerrar</button>' +
    '<button type="button" class="btn" id="sOk">Guardar</button></div>',
    function (cuerpo) {
      cuerpo.querySelector('#sCerrar').onclick = CC.ui.cerrarModal;
      cuerpo.querySelector('#sOk').onclick = function () {
        cuerpo.querySelectorAll('[data-cuenta]').forEach(function (inp) {
          CC.Store.actualizarCuenta(inp.getAttribute('data-cuenta'), { saldoInicial: Number(inp.value) || 0 });
        });
        CC.Store.marcarArranque('saldos');
        CC.ui.cerrarModal();
        CC.ui.toast('Saldos guardados', 'good');
      };
    });
}

/* ---------- 6. Usuarios ---------- */
function pasoUsuarios() {
  if (CC.Store.usuarios().length) { location.hash = '#/ajustes/usuarios'; return; }
  function bloque(pre, titulo, texto) {
    return '<fieldset class="bloque"><legend>' + titulo + '</legend><p class="field__hint" style="margin-bottom:10px">' + texto + '</p>' +
      '<div class="formgrid"><label class="field"><span class="field__lab">Nombre</span><input class="input" id="' + pre + 'Nom" autocomplete="off"></label>' +
      '<label class="field"><span class="field__lab">Contraseña</span><input class="input" id="' + pre + 'Cla" type="password" autocomplete="new-password"></label>' +
      '<label class="field"><span class="field__lab">Repite la contraseña</span><input class="input" id="' + pre + 'Cla2" type="password" autocomplete="new-password"></label></div></fieldset>';
  }
  CC.ui.modal('Usuarios y contraseñas',
    '<p style="font-size:13px;color:var(--ink-2);margin-bottom:12px">Que cada quien escriba su propia contraseña (mínimo 4 letras o números) y no la comparta. ' +
    'Después se pueden agregar más en Ajustes → Usuarios.</p>' +
    bloque('uA', 'Quien administra', 'Captura el día a día: pagos, egresos, avisos, casas.') +
    bloque('uC', 'Alguien del comité', 'Además revisa los egresos, cierra cada mes y da de alta a los usuarios. Nadie revisa lo que capturó él mismo.') +
    '<div class="formactions"><button type="button" class="btn btn--ghost" id="uCerrar">Cerrar</button>' +
    '<button type="button" class="btn" id="uOk">Crear los dos usuarios</button></div>',
    function (cuerpo) {
      var q = function (id) { return cuerpo.querySelector('#' + id); };
      q('uCerrar').onclick = CC.ui.cerrarModal;
      q('uOk').onclick = function () {
        var datos = [['uC', 'comite'], ['uA', 'admin']].map(function (x) {
          return { pre: x[0], rol: x[1], nombre: q(x[0] + 'Nom').value.trim(), clave: q(x[0] + 'Cla').value, clave2: q(x[0] + 'Cla2').value };
        });
        for (var i = 0; i < datos.length; i++) {
          var d = datos[i];
          if (!d.nombre) { CC.ui.toast('Falta un nombre', 'crit'); q(d.pre + 'Nom').focus(); return; }
          if (d.clave.length < 4) { CC.ui.toast('La contraseña de ' + d.nombre + ' necesita 4 letras o números cuando menos', 'crit'); q(d.pre + 'Cla').focus(); return; }
          if (d.clave !== d.clave2) { CC.ui.toast('Las contraseñas de ' + d.nombre + ' no coinciden', 'crit'); q(d.pre + 'Cla2').focus(); return; }
        }
        if (datos[0].nombre.toLowerCase() === datos[1].nombre.toLowerCase()) { CC.ui.toast('Tienen que ser dos personas distintas', 'crit'); return; }
        q('uOk').disabled = true;
        // Primero el del comité (que puede dar de alta a los demás); entra y da de alta al de administración
        var com = datos[0], adm = datos[1];
        var idC = CC.Store.nuevoId('usr'), idA = CC.Store.nuevoId('usr');
        Promise.all([CC.Sesion.cifrar(com.clave, idC), CC.Sesion.cifrar(adm.clave, idA)]).then(function (h) {
          CC.Store.agregarUsuario({ id: idC, nombre: com.nombre, rol: 'comite', clave: h[0] });
          return CC.Sesion.entrar(idC, com.clave).then(function () {
            CC.Store.agregarUsuario({ id: idA, nombre: adm.nombre, rol: 'admin', clave: h[1] });
          });
        }).then(function () {
          CC.ui.cerrarModal();
          CC.ui.toast('Usuarios creados. Desde ahora cada quien entra con su nombre y contraseña.', 'good');
          CC.Sesion.salir();
        }, function (err) { q('uOk').disabled = false; CC.ui.toast(err.message || 'No se pudieron crear', 'crit'); });
      };
    });
}

CC.vistas.inicio = {
  titulo: 'Primeros pasos',
  sub: function () {
    var n = CC.vistas.inicio.pendientes();
    return n ? 'Dar de alta el condominio · ' + (n === 1 ? 'falta 1 paso' : 'faltan ' + n + ' pasos') : 'Todo listo para trabajar';
  },
  acciones: function () { return []; },
  /** Cuántos pasos faltan. Con los datos de ejemplo del demo no hay nada que dar de alta. */
  pendientes: function () {
    if (CC.Store.estado().meta.semilla) return 0;
    return PASOS.filter(function (p) { return !p.hecho(); }).length;
  },

  render: function () {
    var esc = CC.ui.esc;
    var hechos = PASOS.filter(function (p) { return p.hecho(); }).length;
    var siguiente = PASOS.filter(function (p) { return !p.hecho(); })[0];
    var out = [];
    out.push('<div class="arranque__head"><div><h2>' + (siguiente ? 'Vamos a dar de alta su condominio' : '¡Listo! Ya pueden trabajar') + '</h2>' +
      '<p class="muted">' + (siguiente
        ? 'Siete pasos, en orden. Cada uno se puede corregir después. Van ' + hechos + ' de ' + PASOS.length + '.'
        : 'Ya está todo para arrancar. Lo de todos los días: registrar los pagos y los egresos.') + '</p></div>' +
      '<div class="arranque__barra" role="progressbar" aria-valuemin="0" aria-valuemax="' + PASOS.length + '" aria-valuenow="' + hechos + '">' +
      '<i style="width:' + Math.round(hechos / PASOS.length * 100) + '%"></i></div></div>');
    if (!siguiente) {
      out.push('<div class="cta"><div class="cta__txt"><strong>¿Qué sigue?</strong><span>Cada que alguien pague, regístralo; cada que salga dinero, ' +
        'regístralo con su comprobante. A fin de mes, el comité revisa y cierra el mes en Reportes.</span></div>' +
        '<div class="formrow" style="gap:8px"><button class="btn" data-accion="pago">' + CC.ui.icono('mas', 'i--sm') + ' Registrar un pago</button>' +
        '<a class="btn btn--ghost" href="#/panel">Ir al Panel</a></div></div>');
    }
    out.push('<ol class="pasos">' + PASOS.map(function (p, i) {
      var hecho = p.hecho(), est = p.estado();
      var actual = siguiente && siguiente.id === p.id;
      return '<li class="paso' + (hecho ? ' paso--hecho' : '') + (actual ? ' paso--actual' : '') + '">' +
        '<span class="paso__num" aria-hidden="true">' + (hecho ? '✓' : (i + 1)) + '</span>' +
        '<div class="paso__txt"><strong>' + esc(p.titulo) + (hecho ? ' <span class="pill pill--good">Listo</span>' : '') + '</strong>' +
        '<span>' + esc(p.texto) + '</span>' + (est ? '<small>' + esc(est) + '</small>' : '') + '</div>' +
        '<button type="button" class="btn ' + (actual ? '' : 'btn--ghost') + '" data-paso="' + p.id + '">' +
        esc(hecho ? 'Ver o corregir' : p.boton) + '</button></li>';
    }).join('') + '</ol>');
    out.push('<p class="muted" style="font-size:12.5px">¿Dudas? En <a class="enlace" href="#/ayuda">Ayuda</a> está cómo se usa cada pantalla, y se puede bajar el manual en PDF.</p>');
    return out.join('');
  },

  montar: function (raiz) {
    raiz.querySelectorAll('[data-paso]').forEach(function (b) {
      b.onclick = function () {
        var p = PASOS.filter(function (x) { return x.id === b.getAttribute('data-paso'); })[0];
        if (p) p.accion();
      };
    });
  },

  padron: padron,
  pasoAdeudos: pasoAdeudos,
  leerPadron: leerPadron
};
