/* format.js — formato de moneda, fechas y periodos (es-MX).
   Todo lo que se ve en pantalla pasa por aquí, para que las cifras
   se lean igual en toda la aplicación. */
window.CC = window.CC || {};

CC.fmt = (function () {
  var money0 = new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
  var money2 = new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN',
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  var pct1 = new Intl.NumberFormat('es-MX', {
    style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1
  });
  var num2 = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  return {
    /** $1,234 — para cifras grandes de resumen */
    money: function (n) { return money0.format(Math.round(Number(n) || 0)); },
    /** $1,234.56 — para renglones de libro mayor */
    money2: function (n) { return money2.format(Number(n) || 0); },
    /** Con signo explicito: util en resultado del mes */
    moneySigno: function (n) {
      var v = Math.round(Number(n) || 0);
      return (v > 0 ? '+' : v < 0 ? '−' : '') + money0.format(Math.abs(v));
    },
    pct: function (frac) { return pct1.format(Number(frac) || 0); },
    num: function (n) { return num2.format(Number(n) || 0); },

    /** '2026-09' -> 'Septiembre 2026' */
    periodo: function (p) {
      if (!p) return '';
      var a = p.split('-');
      return cap(MESES[Number(a[1]) - 1] || '') + ' ' + a[0];
    },
    /** '2026-09' -> 'sep 2026' */
    periodoCorto: function (p) {
      if (!p) return '';
      var a = p.split('-');
      return (MESES_CORTO[Number(a[1]) - 1] || '') + ' ' + a[0];
    },
    /** '2026-09' -> 'sep' */
    mesCorto: function (p) {
      if (!p) return '';
      return MESES_CORTO[Number(p.split('-')[1]) - 1] || '';
    },
    /** '2026-09-14' -> '14 sep 2026' */
    fecha: function (iso) {
      if (!iso) return '—';
      var a = String(iso).slice(0, 10).split('-');
      if (a.length < 3) return iso;
      return Number(a[2]) + ' ' + (MESES_CORTO[Number(a[1]) - 1] || '') + ' ' + a[0];
    },
    /** '2026-09-14' -> '14/09/2026' — para documentos imprimibles */
    fechaCorta: function (iso) {
      if (!iso) return '—';
      var a = String(iso).slice(0, 10).split('-');
      return a.length < 3 ? iso : a[2] + '/' + a[1] + '/' + a[0];
    },
    meses: MESES,
    mesesCorto: MESES_CORTO,
    cap: cap
  };
})();

/* Utilidades de periodo: los periodos son cadenas 'YYYY-MM' ordenables. */
CC.per = {
  hoy: function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  },
  hoyISO: function () { return new Date().toISOString().slice(0, 10); },
  /** Suma (o resta) meses a un periodo */
  suma: function (p, n) {
    var a = p.split('-'), y = Number(a[0]), m = Number(a[1]) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + '-' + String(m + 1).padStart(2, '0');
  },
  /** Distancia en meses entre dos periodos (b - a) */
  dif: function (a, b) {
    var x = a.split('-'), y = b.split('-');
    return (Number(y[0]) - Number(x[0])) * 12 + (Number(y[1]) - Number(x[1]));
  },
  /** Los ultimos n periodos terminando en p (incluyente) */
  ultimos: function (p, n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) out.push(CC.per.suma(p, -i));
    return out;
  },
  /** Fecha de vencimiento de un periodo, según el día de corte */
  vence: function (p, dia) {
    var a = p.split('-'), y = Number(a[0]), m = Number(a[1]);
    var ultimo = new Date(y, m, 0).getDate();
    var d = Math.min(Math.max(Number(dia) || 10, 1), ultimo);
    return a[0] + '-' + a[1] + '-' + String(d).padStart(2, '0');
  },
  /** El periodo al que pertenece una fecha ISO */
  de: function (iso) { return String(iso).slice(0, 7); }
};
