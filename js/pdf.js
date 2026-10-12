/* pdf.js — documentos PDF sin librerías y sin internet.
 *
 * Los recibos se tienen que poder descargar en la computadora de la
 * administración aunque no haya internet, así que el PDF se arma aquí mismo:
 * texto en Helvetica (viene en todo lector de PDF, no hay que incrustar la
 * fuente), líneas, rectángulos y fotos en JPEG. Con eso alcanza para un
 * recibo, un vale de caja o un convenio.
 *
 * Las coordenadas van en puntos (72 por pulgada) con el origen ARRIBA a la
 * izquierda, como en pantalla; el cambio al sistema del PDF (origen abajo) se
 * hace aquí dentro.
 */
window.CC = window.CC || {};

CC.PDF = (function () {

  /* Anchos de Helvetica (F1) y Helvetica-Bold (F2), métricas AFM estándar en
     milésimas del tamaño de letra, para los caracteres 32 a 126. Hacen falta
     para alinear a la derecha y para partir renglones. */
  var ANCHO = {
    F1: [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
      556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
      1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
      667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
      333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
      556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584],
    F2: [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
      556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
      975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
      667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
      333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
      611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584]
  };

  /* Signos fuera del ASCII que sí usamos (WinAnsi). Las letras con acento se
     miden como su letra base. */
  var EXTRA = {
    F1: { 128: 556, 133: 1000, 145: 222, 146: 222, 147: 333, 148: 333, 149: 350, 150: 556, 151: 1000,
      160: 278, 161: 333, 170: 370, 171: 556, 176: 400, 178: 333, 179: 333, 183: 278, 186: 365, 187: 556, 191: 611, 215: 584 },
    F2: { 128: 556, 133: 1000, 145: 278, 146: 278, 147: 500, 148: 500, 149: 350, 150: 556, 151: 1000,
      160: 278, 161: 333, 170: 370, 171: 556, 176: 400, 178: 333, 179: 333, 183: 278, 186: 365, 187: 556, 191: 611, 215: 584 }
  };

  /* Unicode -> WinAnsi para los signos tipográficos comunes */
  var WIN = {
    0x20AC: 128, 0x201A: 130, 0x201E: 132, 0x2026: 133, 0x2018: 145, 0x2019: 146,
    0x201C: 147, 0x201D: 148, 0x2022: 149, 0x2013: 150, 0x2014: 151, 0x2122: 153
  };
  var SUSTITUTO = { 0x2212: '-', 0x202F: ' ', 0x2009: ' ', 0x2192: '->', 0x2190: '<-', 0x2713: 'v' };

  /** Deja el texto en bytes WinAnsi (un carácter por byte). */
  function aWin(s) {
    s = String(s === null || s === undefined ? '' : s);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c === 9 || c === 10 || c === 13) out += ' ';
      else if (c < 128 || (c >= 0xA0 && c <= 0xFF)) out += s.charAt(i);
      else if (WIN[c]) out += String.fromCharCode(WIN[c]);
      else if (SUSTITUTO[c]) out += SUSTITUTO[c];
      else if (c >= 0xD800 && c <= 0xDBFF) { out += '?'; i++; }   // emoji: fuera
      else out += '?';
    }
    return out;
  }

  function anchoCaracter(c, f) {
    if (c >= 32 && c <= 126) return ANCHO[f][c - 32];
    if (EXTRA[f][c]) return EXTRA[f][c];
    if (c >= 0xC0 && String.prototype.normalize) {
      var base = String.fromCharCode(c).normalize('NFD').charCodeAt(0);
      if (base >= 32 && base <= 126) return ANCHO[f][base - 32];
    }
    return 556;
  }

  function medirWin(s, f, tam) {
    var t = 0;
    for (var i = 0; i < s.length; i++) t += anchoCaracter(s.charCodeAt(i), f);
    return t * tam / 1000;
  }

  function escapar(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }

  function n(v) { return String(Math.round(v * 100) / 100); }

  function rgb(hex) {
    var h = String(hex || '#111111').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [0, 2, 4].map(function (i) {
      return n(parseInt(h.substr(i, 2), 16) / 255);
    }).join(' ');
  }

  function rutaRedondeada(x, y, w, h, r) {   // y = borde inferior, en coordenadas PDF
    var k = 0.5523 * r;
    return [
      n(x + r), n(y), 'm', n(x + w - r), n(y), 'l',
      n(x + w - r + k), n(y), n(x + w), n(y + r - k), n(x + w), n(y + r), 'c',
      n(x + w), n(y + h - r), 'l',
      n(x + w), n(y + h - r + k), n(x + w - r + k), n(y + h), n(x + w - r), n(y + h), 'c',
      n(x + r), n(y + h), 'l',
      n(x + r - k), n(y + h), n(x), n(y + h - r + k), n(x), n(y + h - r), 'c',
      n(x), n(y + r), 'l',
      n(x), n(y + r - k), n(x + r - k), n(y), n(x + r), n(y), 'c', 'h'
    ].join(' ');
  }

  function fechaPDF() {
    var d = new Date();
    function p(v) { return String(v).padStart(2, '0'); }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  /* ---------- Documento ---------- */
  function Documento(opc) {
    opc = opc || {};
    this.ancho = opc.ancho || 612;    // carta: 612 x 792
    this.alto = opc.alto || 792;
    this.titulo = opc.titulo || '';
    this.paginas = [];
    this.imagenes = [];
    this.nuevaPagina();
  }

  Documento.prototype = {
    nuevaPagina: function () { this.ops = []; this.paginas.push(this.ops); return this; },

    _y: function (y) { return this.alto - y; },

    /** Ancho en puntos de un texto. */
    medir: function (t, o) {
      o = o || {};
      return medirWin(aWin(t), o.negrita ? 'F2' : 'F1', o.tam || 10);
    },

    /** Escribe una línea; y es la línea base. Devuelve el ancho escrito. */
    texto: function (t, x, y, o) {
      o = o || {};
      var tam = o.tam || 10, f = o.negrita ? 'F2' : 'F1';
      var s = aWin(t);
      var w = medirWin(s, f, tam);
      if (o.alinear === 'der') x -= w;
      else if (o.alinear === 'centro') x -= w / 2;
      this.ops.push('BT /' + f + ' ' + n(tam) + ' Tf ' + rgb(o.color) + ' rg ' +
        n(x) + ' ' + n(this._y(y)) + ' Td (' + escapar(s) + ') Tj ET');
      return w;
    },

    /** Parte un texto en renglones que quepan en el ancho dado. */
    cortar: function (t, anchoMax, o) {
      o = o || {};
      var tam = o.tam || 10, f = o.negrita ? 'F2' : 'F1';
      var salida = [];
      String(t === null || t === undefined ? '' : t).split('\n').forEach(function (parrafo) {
        var palabras = aWin(parrafo).split(' ');
        var linea = '';
        palabras.forEach(function (p) {
          var prueba = linea ? linea + ' ' + p : p;
          if (linea && medirWin(prueba, f, tam) > anchoMax) { salida.push(linea); linea = p; }
          else linea = prueba;
        });
        salida.push(linea);
      });
      return salida;
    },

    /** Texto con salto de renglón automático. Devuelve la y del renglón siguiente. */
    parrafo: function (t, x, y, anchoMax, o) {
      o = o || {};
      var inter = o.interlineado || (o.tam || 10) * 1.42;
      var self = this;
      this.cortar(t, anchoMax, o).forEach(function (l) {
        // ya viene en WinAnsi: se escribe sin volver a convertir
        var tam = o.tam || 10, f = o.negrita ? 'F2' : 'F1';
        self.ops.push('BT /' + f + ' ' + n(tam) + ' Tf ' + rgb(o.color) + ' rg ' +
          n(x) + ' ' + n(self._y(y)) + ' Td (' + escapar(l) + ') Tj ET');
        y += inter;
      });
      return y;
    },

    linea: function (x1, y1, x2, y2, o) {
      o = o || {};
      this.ops.push((o.punteada ? '[2 2] 0 d ' : '[] 0 d ') + n(o.grosor || 0.6) + ' w ' +
        rgb(o.color) + ' RG ' + n(x1) + ' ' + n(this._y(y1)) + ' m ' + n(x2) + ' ' + n(this._y(y2)) + ' l S');
    },

    /** Rectángulo; o.relleno y/o o.borde son colores, o.radio redondea las esquinas. */
    rect: function (x, y, w, h, o) {
      o = o || {};
      var abajo = this._y(y) - h;
      var ruta = o.radio ? rutaRedondeada(x, abajo, w, h, o.radio)
        : n(x) + ' ' + n(abajo) + ' ' + n(w) + ' ' + n(h) + ' re';
      var s = '[] 0 d ';
      if (o.relleno) s += rgb(o.relleno) + ' rg ';
      if (o.borde || !o.relleno) s += rgb(o.borde) + ' RG ' + n(o.grosor || 0.6) + ' w ';
      this.ops.push(s + ruta + ' ' + (o.relleno && o.borde ? 'B' : o.relleno ? 'f' : 'S'));
    },

    /** img: lo que devuelve CC.PDF.jpeg(). Se ajusta dentro de la caja sin deformarse. */
    imagen: function (img, x, y, w, h, o) {
      if (!img) return null;
      o = o || {};
      var k = this.imagenes.indexOf(img);
      if (k < 0) { this.imagenes.push(img); k = this.imagenes.length - 1; }
      var esc = Math.min(w / img.ancho, h / img.alto);
      var dw = img.ancho * esc, dh = img.alto * esc;
      var dx = o.alinear === 'izq' ? x : x + (w - dw) / 2;
      var dy = o.abajo ? y + (h - dh) : y + (h - dh) / 2;
      this.ops.push('q ' + n(dw) + ' 0 0 ' + n(dh) + ' ' + n(dx) + ' ' + n(this._y(dy) - dh) +
        ' cm /Im' + (k + 1) + ' Do Q');
      return { x: dx, y: dy, w: dw, h: dh };
    },

    /** El archivo PDF completo, en bytes. */
    bytes: function () {
      var partes = [], offsets = [], pos = 0;
      function poner(p) { partes.push(p); pos += p.length; }
      function abrir(num) { offsets[num] = pos; poner(num + ' 0 obj\n'); }
      function cerrar() { poner('\nendobj\n'); }

      var nImg = this.imagenes.length, nPag = this.paginas.length;
      var IMG0 = 5, PAG0 = IMG0 + nImg, INFO = PAG0 + 2 * nPag;

      poner('%PDF-1.4\n%âãÏÓ\n');

      abrir(1); poner('<< /Type /Catalog /Pages 2 0 R >>'); cerrar();

      var hijos = [];
      for (var i = 0; i < nPag; i++) hijos.push((PAG0 + 2 * i) + ' 0 R');
      abrir(2); poner('<< /Type /Pages /Count ' + nPag + ' /Kids [' + hijos.join(' ') + '] >>'); cerrar();

      abrir(3); poner('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); cerrar();
      abrir(4); poner('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'); cerrar();

      var xobj = '';
      this.imagenes.forEach(function (img, k) {
        abrir(IMG0 + k);
        poner('<< /Type /XObject /Subtype /Image /Width ' + img.ancho + ' /Height ' + img.alto +
          ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + img.bytes.length +
          ' >>\nstream\n');
        poner(img.bytes);
        poner('\nendstream');
        cerrar();
        xobj += '/Im' + (k + 1) + ' ' + (IMG0 + k) + ' 0 R ';
      });

      var recursos = '<< /Font << /F1 3 0 R /F2 4 0 R >>' + (nImg ? ' /XObject << ' + xobj + '>>' : '') + ' >>';
      var self = this;
      this.paginas.forEach(function (ops, k) {
        var contenido = ops.join('\n');
        abrir(PAG0 + 2 * k);
        poner('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + n(self.ancho) + ' ' + n(self.alto) + ']' +
          ' /Resources ' + recursos + ' /Contents ' + (PAG0 + 2 * k + 1) + ' 0 R >>');
        cerrar();
        abrir(PAG0 + 2 * k + 1);
        poner('<< /Length ' + contenido.length + ' >>\nstream\n' + contenido + '\nendstream');
        cerrar();
      });

      abrir(INFO);
      poner('<< /Title (' + escapar(aWin(this.titulo)) + ') /Producer (Cuota Clara) /CreationDate (D:' + fechaPDF() + ') >>');
      cerrar();

      var xref = pos;
      poner('xref\n0 ' + (INFO + 1) + '\n0000000000 65535 f \n');
      for (var j = 1; j <= INFO; j++) poner(String(offsets[j]).padStart(10, '0') + ' 00000 n \n');
      poner('trailer\n<< /Size ' + (INFO + 1) + ' /Root 1 0 R /Info ' + INFO + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');

      var buf = new Uint8Array(pos), o = 0;
      partes.forEach(function (p) {
        if (typeof p === 'string') {
          for (var c = 0; c < p.length; c++) buf[o++] = p.charCodeAt(c) & 0xFF;
        } else { buf.set(p, o); o += p.length; }
      });
      return buf;
    },

    archivo: function (nombre) {
      var blob = new Blob([this.bytes()], { type: 'application/pdf' });
      try { return new File([blob], nombre, { type: 'application/pdf' }); }
      catch (e) { blob.name = nombre; return blob; }
    },

    /** Baja el PDF a la carpeta de descargas. */
    descargar: function (nombre) {
      var url = URL.createObjectURL(this.archivo(nombre));
      var a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }
  };

  /**
   * Convierte cualquier imagen (PNG de una firma, SVG, foto JPEG) en un JPEG
   * listo para el PDF, sobre fondo blanco. Devuelve null si no se pudo: el
   * documento sale igual, sin esa imagen.
   */
  function jpeg(dataURL, opc) {
    opc = opc || {};
    return new Promise(function (resolver) {
      if (!dataURL) { resolver(null); return; }
      var img = new Image();
      img.onload = function () {
        try {
          var w0 = img.naturalWidth || img.width || 300, h0 = img.naturalHeight || img.height || 100;
          var esc = Math.min(opc.escalaMax || 1, (opc.ladoMax || 900) / Math.max(w0, h0));
          var w = Math.max(1, Math.round(w0 * esc)), h = Math.max(1, Math.round(h0 * esc));
          var lienzo = document.createElement('canvas');
          lienzo.width = w; lienzo.height = h;
          var cx = lienzo.getContext('2d');
          cx.fillStyle = '#FFFFFF';
          cx.fillRect(0, 0, w, h);
          cx.drawImage(img, 0, 0, w, h);
          var b64 = lienzo.toDataURL('image/jpeg', opc.calidad || 0.88).split(',')[1];
          var bin = atob(b64), bytes = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          resolver({ bytes: bytes, ancho: w, alto: h });
        } catch (e) { resolver(null); }
      };
      img.onerror = function () { resolver(null); };
      img.src = dataURL;
    });
  }

  /** Nombre de archivo válido en Windows, Mac y celular. */
  function nombreArchivo(t) {
    return String(t).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) + '.pdf';
  }

  return {
    nuevo: function (opc) { return new Documento(opc); },
    jpeg: jpeg,
    nombreArchivo: nombreArchivo
  };
})();
