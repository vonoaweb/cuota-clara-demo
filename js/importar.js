/* importar.js — leer el estado de cuenta que baja el banco (Excel o CSV).
 *
 * Sin librerías: un .xlsx es un zip con XML adentro; se descomprime con lo que
 * ya trae el navegador (DecompressionStream) y se leen las celdas. Un .csv se
 * parte a mano, respetando comillas. El resultado es siempre una tabla:
 * renglones de celdas como texto o número.
 */
window.CC = window.CC || {};

CC.Importar = (function () {

  /* ---------- CSV ---------- */
  function partirCSV(texto) {
    texto = texto.replace(/^﻿/, '');
    // separador: el que más aparece en la primera línea
    var primera = texto.split(/\r?\n/)[0] || '';
    var sep = [',', ';', '\t', '|'].map(function (s) { return [s, primera.split(s).length]; })
      .sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var filas = [], fila = [], celda = '', comillas = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (comillas) {
        if (c === '"' && texto[i + 1] === '"') { celda += '"'; i++; }
        else if (c === '"') comillas = false;
        else celda += c;
      } else if (c === '"') comillas = true;
      else if (c === sep) { fila.push(celda); celda = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        fila.push(celda); filas.push(fila); fila = []; celda = '';
      } else celda += c;
    }
    if (celda || fila.length) { fila.push(celda); filas.push(fila); }
    return filas.filter(function (f) { return f.some(function (x) { return String(x).trim(); }); });
  }

  /* ---------- XLSX ---------- */
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  /** Las entradas de un zip: nombre -> {método, inicio, tamaño comprimido}. */
  function indiceZip(b) {
    var fin = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
      if (u32(b, i) === 0x06054b50) { fin = i; break; }
    }
    if (fin < 0) throw new Error('El archivo no parece un Excel (.xlsx).');
    var n = u16(b, fin + 10), o = u32(b, fin + 16), entradas = {};
    for (var k = 0; k < n; k++) {
      var metodo = u16(b, o + 10), comp = u32(b, o + 20);
      var lnom = u16(b, o + 28), lext = u16(b, o + 30), lcom = u16(b, o + 32), local = u32(b, o + 42);
      var nombre = new TextDecoder().decode(b.subarray(o + 46, o + 46 + lnom));
      var datos = local + 30 + u16(b, local + 26) + u16(b, local + 28);
      entradas[nombre] = { metodo: metodo, inicio: datos, tam: comp };
      o += 46 + lnom + lext + lcom;
    }
    return entradas;
  }

  function sacar(b, e) {
    var trozo = b.subarray(e.inicio, e.inicio + e.tam);
    if (e.metodo === 0) return Promise.resolve(new TextDecoder().decode(trozo));
    if (typeof DecompressionStream === 'undefined') {
      return Promise.reject(new Error('Este navegador no puede abrir Excel. Guárdalo como CSV desde Excel.'));
    }
    var flujo = new Blob([trozo]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(flujo).text();
  }

  /** Número de columna de una referencia "AB12" -> 27. */
  function columna(ref) {
    var letras = String(ref).replace(/[0-9]/g, ''), n = 0;
    for (var i = 0; i < letras.length; i++) n = n * 26 + (letras.charCodeAt(i) - 64);
    return n - 1;
  }

  function leerXLSX(buffer) {
    var b = new Uint8Array(buffer);
    var zip = indiceZip(b);
    var hoja = zip['xl/worksheets/sheet1.xml'] ? 'xl/worksheets/sheet1.xml'
      : Object.keys(zip).filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(k); }).sort()[0];
    if (!hoja) return Promise.reject(new Error('No encontré ninguna hoja en el Excel.'));
    var parser = new DOMParser();
    var compartidas = zip['xl/sharedStrings.xml'] ? sacar(b, zip['xl/sharedStrings.xml']) : Promise.resolve('');
    return Promise.all([compartidas, sacar(b, zip[hoja])]).then(function (r) {
      var textos = [];
      if (r[0]) {
        var ss = parser.parseFromString(r[0], 'application/xml').getElementsByTagName('si');
        for (var i = 0; i < ss.length; i++) {
          var ts = ss[i].getElementsByTagName('t'), t = '';
          for (var j = 0; j < ts.length; j++) t += ts[j].textContent;
          textos.push(t);
        }
      }
      var filas = [];
      var rows = parser.parseFromString(r[1], 'application/xml').getElementsByTagName('row');
      for (var k = 0; k < rows.length; k++) {
        var fila = [];
        var cs = rows[k].getElementsByTagName('c');
        for (var m = 0; m < cs.length; m++) {
          var c = cs[m], tipo = c.getAttribute('t'), v = c.getElementsByTagName('v')[0];
          var val;
          if (tipo === 's') val = v ? textos[Number(v.textContent)] : '';
          else if (tipo === 'inlineStr') {
            var it = c.getElementsByTagName('t');
            val = it.length ? it[0].textContent : '';
          } else if (tipo === 'str' || tipo === 'b') val = v ? v.textContent : '';
          else val = v ? Number(v.textContent) : '';
          fila[columna(c.getAttribute('r'))] = val;
        }
        for (var z = 0; z < fila.length; z++) if (fila[z] === undefined) fila[z] = '';
        if (fila.some(function (x) { return String(x).trim(); })) filas.push(fila);
      }
      return filas;
    });
  }

  /** Lee el archivo que eligió la persona y devuelve sus renglones. */
  function leer(archivo) {
    var nombre = (archivo.name || '').toLowerCase();
    if (/\.xls$/.test(nombre)) {
      return Promise.reject(new Error('Ese es el formato viejo de Excel (.xls). Ábrelo en Excel y guárdalo como .xlsx o CSV.'));
    }
    if (/\.pdf$/.test(nombre)) {
      return Promise.reject(new Error('El PDF no se puede leer. En la banca en línea descarga los movimientos en Excel o CSV.'));
    }
    return archivo.arrayBuffer().then(function (buf) {
      var b = new Uint8Array(buf);
      if (b[0] === 0x50 && b[1] === 0x4B) return leerXLSX(buf);     // "PK": es un zip (xlsx)
      var texto = new TextDecoder('utf-8').decode(b);
      if (texto.indexOf('�') >= 0) texto = new TextDecoder('windows-1252').decode(b);
      return partirCSV(texto);
    });
  }

  /* ---------- Interpretar los valores ---------- */

  /** "1,234.50", "$1,234.50", "-1234.5", "(1,234.50)" o un número -> número. */
  function numero(v) {
    if (typeof v === 'number') return v;
    var t = String(v || '').trim();
    if (!t) return null;
    var neg = /^\(.*\)$/.test(t) || /^-/.test(t) || /-$/.test(t);
    t = t.replace(/[()$\s]/g, '').replace(/-/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');   // 1.234,50
    else t = t.replace(/,/g, '');
    var n = Number(t);
    return isNaN(n) ? null : (neg ? -n : n);
  }

  /** "15/10/2026", "2026-10-15", "15-oct-2026" o número de serie de Excel -> "2026-10-15". */
  var MESES = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };
  function fecha(v) {
    if (typeof v === 'number' && v > 20000 && v < 80000) {
      var d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
      return d.toISOString().slice(0, 10);
    }
    var t = String(v || '').trim().toLowerCase();
    var m = t.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
    if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
    if (m) {
      var y = m[3].length === 2 ? '20' + m[3] : m[3];
      return y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');   // en México va día/mes
    }
    m = t.match(/^(\d{1,2})[-\/\s]([a-z]{3})[a-z]*[-\/\s](\d{2,4})/);
    if (m && MESES[m[2]]) {
      var yy = m[3].length === 2 ? '20' + m[3] : m[3];
      return yy + '-' + String(MESES[m[2]]).padStart(2, '0') + '-' + m[1].padStart(2, '0');
    }
    return null;
  }

  /**
   * Adivina qué columna es qué por los encabezados. Devuelve el número de
   * renglón donde empiezan los datos y las columnas encontradas.
   */
  function detectarColumnas(filas) {
    var pistas = {
      fecha: /fecha|date|dia/,
      concepto: /concepto|descrip|detalle|movimiento|referencia ampliada|leyenda/,
      cargo: /cargo|retiro|debito|débito|egreso|salida/,
      abono: /abono|deposito|depósito|credito|crédito|ingreso|entrada/,
      monto: /^importe$|^monto$|cantidad|importe/,
      saldo: /saldo/,
      referencia: /^referencia$|^ref|folio|rastreo|autoriz/
    };
    for (var i = 0; i < Math.min(filas.length, 15); i++) {
      var f = filas[i].map(function (x) { return String(x).toLowerCase().trim(); });
      var cols = {};
      Object.keys(pistas).forEach(function (k) {
        for (var j = 0; j < f.length; j++) {
          if (pistas[k].test(f[j]) && Object.keys(cols).map(function (q) { return cols[q]; }).indexOf(j) < 0) { cols[k] = j; break; }
        }
      });
      if (cols.fecha !== undefined && (cols.monto !== undefined || cols.cargo !== undefined || cols.abono !== undefined)) {
        return { inicio: i + 1, cols: cols, encabezados: filas[i] };
      }
    }
    return { inicio: 0, cols: {}, encabezados: [] };
  }

  /** Renglones del banco ya interpretados: {fecha, concepto, monto (+ entra, − sale), saldo, referencia}. */
  function movimientos(filas, cols, inicio) {
    var out = [];
    for (var i = inicio; i < filas.length; i++) {
      var f = filas[i];
      var fe = fecha(f[cols.fecha]);
      if (!fe) continue;
      var monto = null;
      if (cols.cargo !== undefined || cols.abono !== undefined) {
        var ab = cols.abono !== undefined ? numero(f[cols.abono]) : null;
        var ca = cols.cargo !== undefined ? numero(f[cols.cargo]) : null;
        if (ab) monto = Math.abs(ab);
        else if (ca) monto = -Math.abs(ca);
      } else if (cols.monto !== undefined) monto = numero(f[cols.monto]);
      if (monto === null || Math.abs(monto) < 0.005) continue;
      out.push({
        fila: i + 1, fecha: fe, monto: Math.round(monto * 100) / 100,
        concepto: cols.concepto !== undefined ? String(f[cols.concepto] || '').trim() : '',
        referencia: cols.referencia !== undefined ? String(f[cols.referencia] || '').trim() : '',
        saldo: cols.saldo !== undefined ? numero(f[cols.saldo]) : null
      });
    }
    return out;
  }

  /**
   * Junta cada renglón del banco con un movimiento del sistema del mismo monto,
   * a no más de unos días de distancia. Uno con uno: el más cercano en fecha.
   */
  function conciliar(banco, sistema, diasTolerancia) {
    var tol = diasTolerancia === undefined ? 3 : diasTolerancia;
    var usados = {}, hechos = {}, pares = [];

    // ¿El texto del banco trae la referencia de la casa, su número o la referencia del pago?
    function palabra(t, k) {
      var i = t.indexOf(k);
      while (i >= 0) {
        var antes = i === 0 ? ' ' : t.charAt(i - 1), despues = t.charAt(i + k.length) || ' ';
        if (!/[a-z0-9]/.test(antes) && !/[a-z0-9]/.test(despues)) return true;
        i = t.indexOf(k, i + 1);
      }
      return false;
    }
    function coincideTexto(b, s) {
      var t = ((b.concepto || '') + ' ' + (b.referencia || '')).toLowerCase();
      return (s.claves || []).some(function (k) {
        k = String(k || '').toLowerCase().trim();
        return k.length >= 3 && palabra(t, k);
      });
    }

    function ronda(d, conTexto) {
      banco.forEach(function (b, j) {
        if (hechos[j]) return;
        for (var i = 0; i < sistema.length; i++) {
          if (usados[i]) continue;
          var s = sistema[i];
          if (Math.abs((s.entra - s.sale) - b.monto) > 0.009) continue;
          if (Math.abs(CC.per.diasEntre(s.fecha, b.fecha)) !== d) continue;
          if (conTexto && !coincideTexto(b, s)) continue;
          usados[i] = true;
          hechos[j] = true;
          pares.push({ banco: b, sistema: s });
          break;
        }
      });
    }
    // Primero lo que coincide en monto y en texto (la referencia de la casa), hasta
    // una semana de diferencia; luego solo por monto, del mismo día a "tol" días.
    // Así las cuotas iguales de muchas casas no se cruzan entre sí.
    for (var d1 = 0; d1 <= Math.max(7, tol); d1++) ronda(d1, true);
    for (var d2 = 0; d2 <= tol; d2++) ronda(d2, false);
    return {
      pares: pares,
      soloBanco: banco.filter(function (b, j) { return !hechos[j]; }),
      soloSistema: sistema.filter(function (s, i) { return !usados[i]; })
    };
  }

  return {
    leer: leer, partirCSV: partirCSV, numero: numero, fecha: fecha,
    detectarColumnas: detectarColumnas, movimientos: movimientos, conciliar: conciliar
  };
})();
