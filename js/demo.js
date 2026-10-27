/* demo.js — el demo para enseñar a cualquiera.
 *
 * Los vecinos del demo son inventados, pero sus teléfonos podrían ser de alguien
 * de verdad. Si el perfil trae demoPublico: true, todo WhatsApp que se mande desde
 * el sistema (avisos de adeudo, recibos, reservas) le llega a quien está probando
 * el demo: se le pide su número una vez y se queda en su navegador, nada más.
 * Sin demoPublico este archivo no hace nada.
 */
window.CC = window.CC || {};

CC.Demo = (function () {
  var LLAVE = 'cuotaclara-demo-whatsapp';
  var memoria = '';   // por si el navegador no deja guardar

  function activo() { return !!(CC.Perfil && CC.Perfil.demoPublico); }

  function numero() {
    try { return localStorage.getItem(LLAVE) || memoria; } catch (e) { return memoria; }
  }

  function guardar(n) {
    memoria = n;
    try { localStorage.setItem(LLAVE, n); } catch (e) { /* se queda en memoria */ }
    // El Panel dice a qué número llega; se pone al día sin redibujar
    document.querySelectorAll('[data-demonum]').forEach(function (el) { el.textContent = formato(n); });
    document.querySelectorAll('[data-demotiene]').forEach(function (el) { el.hidden = false; });
  }

  /** 523312345678 → "+52 33 1234 5678" */
  function formato(n) {
    return n.length === 12 && n.indexOf('52') === 0
      ? '+52 ' + n.slice(2, 4) + ' ' + n.slice(4, 8) + ' ' + n.slice(8)
      : '+' + n;
  }

  /** Lo que se escribe ("33 1234 5678", "+52 1 33…") a lo que pide wa.me. */
  function normalizar(texto) {
    var d = String(texto || '').replace(/\D/g, '');
    if (d.length === 10) return '52' + d;
    if (d.length === 13 && d.indexOf('521') === 0) return '52' + d.slice(3);
    return d.length >= 11 && d.length <= 15 ? d : '';
  }

  /** El número de quien prueba el demo, y si todavía no lo dio, se lo pide. */
  function conNumero(alListo, cambiar) {
    var n = numero();
    if (n && !cambiar) { alListo(n); return; }
    var esc = CC.ui.esc;
    CC.ui.modal('¿A qué WhatsApp te lo mandamos?',
      '<p style="margin-bottom:12px">Es un demo: los vecinos son inventados, así que los mensajes te llegan a ti. ' +
      'Tu número se queda en este navegador; no se manda a ningún lado.</p>' +
      '<label class="field"><span class="field__lab">Tu WhatsApp</span>' +
      '<input class="input num" id="dWa" type="tel" inputmode="tel" placeholder="33 1234 5678" value="' + esc(n ? n.replace(/^52/, '') : '') + '"></label>' +
      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="dCerrar">Cancelar</button>' +
      '<button type="button" class="btn" id="dOk">' + CC.ui.icono('wa', 'i--sm') + ' Mandar</button></div>',
      function (cuerpo) {
        var inp = cuerpo.querySelector('#dWa');
        var ok = function () {
          var limpio = normalizar(inp.value);
          if (!limpio) { CC.ui.toast('Escribe tu número a 10 dígitos', 'crit'); inp.focus(); return; }
          guardar(limpio);
          CC.ui.cerrarModal();
          alListo(limpio);
        };
        cuerpo.querySelector('#dCerrar').onclick = CC.ui.cerrarModal;
        cuerpo.querySelector('#dOk').onclick = ok;
        inp.onkeydown = function (e) { if (e.key === 'Enter') ok(); };
        setTimeout(function () { inp.focus(); }, 50);
      });
  }

  function abrir(enlace, n) {
    window.open(enlace.replace(/wa\.me\/\d*/, 'wa.me/' + n), '_blank', 'noopener');
  }

  // Cualquier enlace a WhatsApp del sistema se desvía al número de quien prueba.
  // Se intercepta antes que nadie (captura) y sin detener el clic, para que lo
  // demás que hace el botón (anotar el aviso en el historial) siga pasando.
  document.addEventListener('click', function (e) {
    if (!activo() || !e.target.closest) return;
    if (e.target.closest('[data-demonumero]')) { conNumero(function () {}, true); return; }   // "cambiar"
    var a = e.target.closest('a[href*="wa.me/"]');
    if (!a) return;
    e.preventDefault();
    var enlace = a.href;
    conNumero(function (n) { abrir(enlace, n); });
  }, true);

  return { activo: activo, numero: numero, formato: formato, conNumero: conNumero, abrir: abrir };
})();
