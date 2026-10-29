/* sesion.js — quién está usando el sistema.
 *
 * Lo pidió la administradora de Mallorca (reunión del 26-oct, min 27 y 30): "para
 * ver quién hizo esta actualización" y "ya quien venga, ya no puede hacer
 * tranzas". Cada persona entra con su nombre y su contraseña, y el sistema anota
 * en la bitácora quién registró, corrigió o canceló cada cosa.
 *
 * Dos papeles:
 *   - Administración: captura pagos, egresos, casas, avisos… el día a día.
 *   - Comité: además revisa los egresos, cierra el mes, hace la entrega-recepción
 *     y da de alta a los usuarios. Nadie revisa lo que capturó él mismo.
 *
 * Mientras no haya usuarios (el demo, o un condominio que todavía no los crea) el
 * sistema se usa sin contraseña, como siempre. La contraseña se guarda cifrada
 * (SHA-256 con sal), nunca tal cual.
 */
window.CC = window.CC || {};

CC.Sesion = (function () {
  var LLAVE = 'cuotaclara.sesion';
  var MINUTOS_INACTIVO = 20;     // si nadie mueve nada en 20 min, se cierra la sesión
  var actual = null, temporizador = null;

  var ROLES = { admin: 'Administración', comite: 'Comité' };

  function hayUsuarios() {
    return CC.Store.usuarios().some(function (u) { return u.activo; });
  }

  function leerGuardada() {
    try {
      var id = window.sessionStorage.getItem(LLAVE);
      var u = id && CC.Store.usuario(id);
      return u && u.activo ? u : null;
    } catch (e) { return null; }
  }

  function usuario() {
    if (!hayUsuarios()) return null;
    if (!actual) actual = leerGuardada();
    return actual;
  }

  function cifrar(texto, sal) {
    var datos = new TextEncoder().encode(sal + '·' + texto);
    return crypto.subtle.digest('SHA-256', datos).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function entrar(id, clave) {
    var u = CC.Store.usuario(id);
    if (!u || !u.activo) return Promise.reject(new Error('Ese usuario ya no está activo'));
    return cifrar(clave, u.id).then(function (h) {
      if (h !== u.clave) throw new Error('La contraseña no coincide');
      actual = u;
      try { window.sessionStorage.setItem(LLAVE, u.id); } catch (e) { /* solo en memoria */ }
      CC.Store.anotar('Entró al sistema', ROLES[u.rol] || '');
      vigilar();
      return u;
    });
  }

  function salir(motivo) {
    if (actual) CC.Store.anotar(motivo === 'inactivo' ? 'Se cerró su sesión por inactividad' : 'Salió del sistema', '');
    actual = null;
    try { window.sessionStorage.removeItem(LLAVE); } catch (e) { /* nada */ }
    clearTimeout(temporizador);
    pintarPuerta();
  }

  /** Comité puede todo; Administración, todo menos lo que dice "comite". */
  function puede(rol) {
    if (!hayUsuarios()) return true;
    var u = usuario();
    if (!u) return false;
    return rol !== 'comite' || u.rol === 'comite';
  }

  function nombreRol(r) { return ROLES[r] || r; }

  /* ---------- Cierre por inactividad ---------- */
  function vigilar() {
    clearTimeout(temporizador);
    if (!actual) return;
    temporizador = setTimeout(function () { salir('inactivo'); }, MINUTOS_INACTIVO * 60000);
  }
  ['click', 'keydown', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function () { if (actual) vigilar(); }, true);
  });

  /* ---------- La puerta de entrada ---------- */
  function pintarPuerta() {
    var puerta = document.getElementById('puerta');
    var necesita = hayUsuarios() && !usuario();
    document.documentElement.classList.toggle('con-puerta', necesita);
    if (!necesita) { if (puerta) puerta.remove(); pintarUsuario(); return; }
    var esc = CC.ui.esc;
    var c = CC.Store.condominio();
    var lista = CC.Store.usuarios().filter(function (u) { return u.activo; });
    if (!puerta) {
      puerta = document.createElement('div');
      puerta.id = 'puerta';
      puerta.className = 'puerta';
      document.body.appendChild(puerta);
    }
    puerta.innerHTML = '<div class="puerta__caja" role="dialog" aria-labelledby="puertaTit">' +
      (c.logo ? '<img class="puerta__logo" src="' + esc(c.logo) + '" alt="">' : '') +
      '<p class="eyebrow">Cuota Clara</p>' +
      '<h1 id="puertaTit">' + esc(c.nombre || 'Administración del condominio') + '</h1>' +
      '<p class="puerta__txt">¿Quién eres? Toca tu nombre y escribe tu contraseña.</p>' +
      '<div class="puerta__nombres">' + lista.map(function (u) {
        return '<button type="button" class="puerta__nombre" data-usuario="' + esc(u.id) + '"><strong>' + esc(u.nombre) +
          '</strong><small>' + esc(nombreRol(u.rol)) + '</small></button>';
      }).join('') + '</div>' +
      '<form class="puerta__clave" id="puertaForm" hidden>' +
      '<label class="field"><span class="field__lab" id="puertaQuien">Contraseña</span>' +
      '<input class="input" id="puertaClave" type="password" autocomplete="current-password"></label>' +
      '<button class="btn" type="submit">Entrar</button>' +
      '<p class="puerta__error" id="puertaError" role="alert"></p></form>' +
      '<p class="puerta__pie">¿Olvidaste tu contraseña? Pídele a alguien del comité que te ponga una nueva en Ajustes → Usuarios.</p>' +
      // En el demo (datos de ejemplo), quien lo prueba no se queda encerrado
      (CC.Store.estado().meta.semilla ? '<button type="button" class="linkbtn" id="puertaEjemplo">Es el demo: volver a los datos de ejemplo, sin usuarios</button>' : '') +
      '</div>';
    var elegido = null;
    puerta.querySelectorAll('[data-usuario]').forEach(function (b) {
      b.onclick = function () {
        elegido = b.getAttribute('data-usuario');
        puerta.querySelectorAll('[data-usuario]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        puerta.querySelector('#puertaForm').hidden = false;
        puerta.querySelector('#puertaQuien').textContent = 'Contraseña de ' + CC.Store.usuario(elegido).nombre;
        puerta.querySelector('#puertaError').textContent = '';
        var inp = puerta.querySelector('#puertaClave');
        inp.value = '';
        inp.focus();
      };
    });
    if (lista.length === 1) puerta.querySelector('[data-usuario]').click();
    var ejemplo = puerta.querySelector('#puertaEjemplo');
    if (ejemplo) ejemplo.onclick = function () { CC.Store.restaurarEjemplo(); pintarPuerta(); };
    puerta.querySelector('#puertaForm').onsubmit = function (e) {
      e.preventDefault();
      if (!elegido) return;
      entrar(elegido, puerta.querySelector('#puertaClave').value).then(function () {
        pintarPuerta();
        if (CC.redibujar) CC.redibujar();
      }, function (err) {
        puerta.querySelector('#puertaError').textContent = err.message;
        puerta.querySelector('#puertaClave').select();
      });
    };
  }

  /** En el menú: quién está dentro y el botón para salir. */
  function pintarUsuario() {
    var caja = document.getElementById('navUsuario');
    if (!caja) return;
    var u = usuario();
    caja.hidden = !u;
    if (!u) return;
    caja.innerHTML = '<span><strong>' + CC.ui.esc(u.nombre) + '</strong><small>' + CC.ui.esc(nombreRol(u.rol)) + '</small></span>' +
      '<button type="button" class="btn btn--sm btn--ghost" id="bSalir">Salir</button>';
    caja.querySelector('#bSalir').onclick = function () { salir(); };
  }

  return {
    ROLES: ROLES, nombreRol: nombreRol, hayUsuarios: hayUsuarios, usuario: usuario,
    cifrar: cifrar, entrar: entrar, salir: salir, puede: puede, pintarPuerta: pintarPuerta, pintarUsuario: pintarUsuario
  };
})();
