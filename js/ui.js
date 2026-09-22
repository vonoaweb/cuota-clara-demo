/* ui.js — piezas de interfaz que se repiten en varias vistas:
   escape de texto, avisos flotantes, ventana modal, distintivos,
   rejilla de cifras, barras y la grafica de ingresos contra egresos. */
window.CC = window.CC || {};

CC.ui = (function () {

  /* ---------- Texto ---------- */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function h(html) {
    var t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  }

  function icono(nombre, clase) {
    return '<svg class="i ' + (clase || '') + '"><use href="#i-' + nombre + '"/></svg>';
  }

  /* ---------- Avisos flotantes ---------- */
  function toast(mensaje, tono) {
    var cont = document.getElementById('toasts');
    var el = h('<div class="toast ' + (tono ? 'toast--' + tono : '') + '">' + esc(mensaje) + '</div>');
    cont.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .2s ease';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 220);
    }, 3200);
  }

  /* ---------- Ventana modal ---------- */
  var focoPrevio = null;

  function modal(titulo, html, alMontar) {
    var m = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = titulo;
    var cuerpo = document.getElementById('modalBody');
    cuerpo.innerHTML = html;
    focoPrevio = document.activeElement;
    m.hidden = false;
    if (typeof alMontar === 'function') alMontar(cuerpo);
    var primero = cuerpo.querySelector('input:not([type=hidden]), select, textarea, button');
    if (primero) primero.focus();
  }

  function cerrarModal() {
    var m = document.getElementById('modal');
    if (m.hidden) return;
    m.hidden = true;
    document.getElementById('modalBody').innerHTML = '';
    if (focoPrevio && focoPrevio.focus) focoPrevio.focus();
    focoPrevio = null;
  }

  function confirmar(titulo, texto, etiquetaOk, alAceptar, critico) {
    modal(titulo,
      '<p style="font-size:13.5px;color:var(--ink-2);line-height:1.6">' + esc(texto) + '</p>' +
      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" data-cancel="1">Cancelar</button>' +
      '<button type="button" class="btn ' + (critico ? 'btn--crit' : '') + '" data-ok="1">' + esc(etiquetaOk) + '</button>' +
      '</div>',
      function (cuerpo) {
        cuerpo.querySelector('[data-cancel]').onclick = cerrarModal;
        cuerpo.querySelector('[data-ok]').onclick = function () { cerrarModal(); alAceptar(); };
      });
  }

  /* ---------- Portapapeles ---------- */
  function copiar(texto, mensaje) {
    function aviso(ok) { toast(ok ? (mensaje || 'Copiado') : 'No se pudo copiar', ok ? 'good' : 'crit'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () { aviso(true); }, function () { aviso(false); });
      return;
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      aviso(ok);
    } catch (e) { aviso(false); }
  }

  /* ---------- Distintivos y cifras ---------- */
  function pill(estado) {
    var e = CC.Model.ETIQUETA_ESTADO[estado] || CC.Model.ETIQUETA_ESTADO.corriente;
    return '<span class="pill ' + e.clase + '">' + e.texto + '</span>';
  }

  function pillLibre(texto, clase) {
    return '<span class="pill pill--flat ' + (clase || 'pill--mute') + '">' + esc(texto) + '</span>';
  }

  /** items: [{lab, val, tono, nota}] */
  function stats(items) {
    return '<div class="stats">' + items.map(function (s) {
      return '<div class="stat">' +
        '<span class="stat__lab">' + esc(s.lab) + '</span>' +
        '<span class="stat__val' + (s.tono ? ' stat__val--' + s.tono : '') + '">' + esc(s.val) + '</span>' +
        (s.nota ? '<span class="stat__note">' + s.nota + '</span>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /** items: [{lab, val, frac, tono}] — barras horizontales proporcionales */
  function barras(items) {
    var max = items.reduce(function (a, i) { return Math.max(a, i.frac || 0); }, 0) || 1;
    return '<div class="bars">' + items.map(function (i) {
      var w = Math.max(1.5, ((i.frac || 0) / max) * 100);
      var color = i.tono === 'crit' ? 'var(--crit)' : i.tono === 'warn' ? 'var(--warn)'
        : i.tono === 'good' ? 'var(--good)' : 'var(--accent)';
      return '<div class="bar">' +
        '<span class="bar__lab" title="' + esc(i.lab) + '">' + esc(i.lab) + '</span>' +
        '<span class="bar__track"><span class="bar__fill" style="width:' + w.toFixed(1) + '%;background:' + color + '"></span></span>' +
        '<span class="bar__val">' + esc(i.val) + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- Grafica de ingresos contra egresos ---------- */

  /** Redondea hacia arriba a una cifra "redonda" para el eje. */
  function techo(n) {
    if (n <= 0) return 1000;
    var mag = Math.pow(10, Math.floor(Math.log(n) / Math.LN10));
    var r = n / mag;
    var paso = r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10;
    return paso * mag;
  }

  var ejeFmt = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

  function graficaSerie(serie) {
    var W = 680, H = 252, padL = 64, padR = 14, padT = 14, padB = 36;
    var pw = W - padL - padR, ph = H - padT - padB;

    var pico = serie.reduce(function (a, s) {
      return Math.max(a, s.ingresos || 0, s.egresos || 0);
    }, 0);
    var top = techo(pico * 1.08);
    var n = Math.max(1, serie.length);
    var gw = pw / n;
    var bw = Math.min(24, gw * 0.28);
    var y = function (v) { return padT + ph - (v / top) * ph; };

    var s = [];
    s.push('<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Ingresos cobrados y egresos por mes">');

    // Reticula y etiquetas del eje vertical
    for (var i = 0; i <= 4; i++) {
      var v = top * i / 4;
      var yy = y(v);
      s.push('<line class="grid" x1="' + padL + '" y1="' + yy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + yy.toFixed(1) + '"/>');
      s.push('<text x="' + (padL - 9) + '" y="' + (yy + 3.5).toFixed(1) + '" text-anchor="end" font-size="10">' +
        ejeFmt.format(Math.round(v)) + '</text>');
    }
    s.push('<line class="axis" x1="' + padL + '" y1="' + (padT + ph) + '" x2="' + (W - padR) + '" y2="' + (padT + ph) + '"/>');

    // Barras por mes
    serie.forEach(function (d, k) {
      var cx = padL + gw * k + gw / 2;
      var x1 = cx - bw - 2, x2 = cx + 2;
      var hIn = Math.max(0, (d.ingresos / top) * ph);
      var hEg = Math.max(0, (d.egresos / top) * ph);
      s.push('<rect x="' + x1.toFixed(1) + '" y="' + y(d.ingresos).toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + hIn.toFixed(1) + '" rx="2" fill="var(--c-serie-1)"><title>Cobrado ' +
        esc(CC.fmt.periodoCorto(d.periodo)) + ': ' + esc(CC.fmt.money(d.ingresos)) + '</title></rect>');
      s.push('<rect x="' + x2.toFixed(1) + '" y="' + y(d.egresos).toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + hEg.toFixed(1) + '" rx="2" fill="var(--c-serie-2)"><title>Egresos ' +
        esc(CC.fmt.periodoCorto(d.periodo)) + ': ' + esc(CC.fmt.money(d.egresos)) + '</title></rect>');
      s.push('<text x="' + cx.toFixed(1) + '" y="' + (padT + ph + 17) + '" text-anchor="middle" font-size="10.5">' +
        esc(CC.fmt.mesCorto(d.periodo)) + '</text>');
    });

    s.push('</svg>');
    return s.join('');
  }

  function leyendaSerie() {
    return '<div class="legend">' +
      '<b><i style="background:var(--c-serie-1)"></i>Cobrado</b>' +
      '<b><i style="background:var(--c-serie-2)"></i>Egresos</b>' +
      '<b class="muted">Pesos por mes</b>' +
      '</div>';
  }

  /* ---------- Tema ---------- */
  var TEMAS = ['sistema', 'claro', 'oscuro'];

  function leerTema() {
    try { return window.localStorage.getItem('cuotaclara.tema') || 'sistema'; }
    catch (e) { return 'sistema'; }
  }

  function aplicarTema(t) {
    var raiz = document.documentElement;
    if (t === 'claro') raiz.setAttribute('data-theme', 'light');
    else if (t === 'oscuro') raiz.setAttribute('data-theme', 'dark');
    else raiz.removeAttribute('data-theme');
    try { window.localStorage.setItem('cuotaclara.tema', t); } catch (e) { /* sin persistencia */ }
    var btn = document.getElementById('btnTema');
    if (btn) btn.querySelector('span').textContent =
      t === 'claro' ? 'Tema claro' : t === 'oscuro' ? 'Tema oscuro' : 'Tema del sistema';
  }

  function ciclarTema() {
    var actual = leerTema();
    aplicarTema(TEMAS[(TEMAS.indexOf(actual) + 1) % TEMAS.length]);
  }

  return {
    esc: esc, h: h, icono: icono,
    toast: toast, modal: modal, cerrarModal: cerrarModal, confirmar: confirmar, copiar: copiar,
    pill: pill, pillLibre: pillLibre, stats: stats, barras: barras,
    graficaSerie: graficaSerie, leyendaSerie: leyendaSerie,
    leerTema: leerTema, aplicarTema: aplicarTema, ciclarTema: ciclarTema
  };
})();
