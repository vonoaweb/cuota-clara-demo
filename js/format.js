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
    /** '2026-10-12' -> '12 de octubre de 2026' — para convenios y cartas */
    fechaLarga: function (iso) {
      if (!iso) return '';
      var a = String(iso).slice(0, 10).split('-');
      return Number(a[2]) + ' de ' + (MESES[Number(a[1]) - 1] || '') + ' de ' + a[0];
    },
    /** 2173.5 -> 'DOS MIL CIENTO SETENTA Y TRES PESOS 50/100 M.N.' — como en un cheque */
    letras: letras,
    meses: MESES,
    mesesCorto: MESES_CORTO,
    cap: cap
  };

  /* ---------- Cantidad con letra ---------- */
  function letras(monto) {
    var UNI = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
      'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE',
      'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS',
      'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
    var DEC = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    var CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
      'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    function cientos(n) {
      if (n === 100) return 'CIEN';
      var c = Math.floor(n / 100), r = n % 100, out = CEN[c];
      if (r) {
        var d = r < 30 ? UNI[r] : DEC[Math.floor(r / 10)] + (r % 10 ? ' Y ' + UNI[r % 10] : '');
        out += (out ? ' ' : '') + d;
      }
      return out;
    }

    var total = Math.round(Math.abs(Number(monto) || 0) * 100);
    var ent = Math.floor(total / 100), cent = total % 100;
    var partes = [];
    var millones = Math.floor(ent / 1000000), miles = Math.floor((ent % 1000000) / 1000), resto = ent % 1000;
    if (millones) partes.push(millones === 1 ? 'UN MILLÓN' : cientos(millones) + ' MILLONES');
    if (miles) partes.push(miles === 1 ? 'MIL' : cientos(miles) + ' MIL');
    if (resto) partes.push(cientos(resto));
    var texto = partes.length ? partes.join(' ') : 'CERO';
    var moneda = ent === 1 ? 'PESO' : (ent && !miles && !resto ? 'DE PESOS' : 'PESOS');
    return texto + ' ' + moneda + ' ' + String(cent).padStart(2, '0') + '/100 M.N.';
  }
})();

/* Utilidades de periodo: los periodos son cadenas 'YYYY-MM' ordenables. */
CC.per = {
  hoy: function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  },
  /** Fecha local de hoy. toISOString() da la de Greenwich: después de las
      18:00 en México ya diría mañana. */
  hoyISO: function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },
  /** '2026-10-12' + 15 días */
  masDias: function (iso, n) {
    var a = String(iso).slice(0, 10).split('-');
    var d = new Date(Number(a[0]), Number(a[1]) - 1, Number(a[2]) + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },
  /** El mismo día n meses después; el 31 cae en el último día de los meses cortos */
  masMeses: function (iso, n) {
    var a = String(iso).slice(0, 10).split('-');
    return CC.per.vence(CC.per.suma(a[0] + '-' + a[1], n), Number(a[2]));
  },
  /** Días de a hasta b */
  diasEntre: function (a, b) {
    var x = String(a).slice(0, 10).split('-'), y = String(b).slice(0, 10).split('-');
    var da = Date.UTC(Number(x[0]), Number(x[1]) - 1, Number(x[2]));
    var db = Date.UTC(Number(y[0]), Number(y[1]) - 1, Number(y[2]));
    return Math.round((db - da) / 86400000);
  },
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
