/* archivos.js — almacen de imagenes (firmas y fotos).
 *
 * Las imagenes no caben en localStorage: una sola foto pesa mas que todo el
 * resto de la informacion junta. Por eso viven aparte, en IndexedDB, que da
 * decenas de megabytes en vez de cinco. Los registros solo guardan el id.
 *
 * Toda la interfaz es asincrona y nunca revienta: si el navegador bloquea
 * IndexedDB (ventana privada, permisos), `disponible()` devuelve false y la
 * aplicacion esconde las funciones de foto en lugar de fallar.
 */
window.CC = window.CC || {};

CC.Archivos = (function () {
  var BASE = 'cuotaclara-archivos';
  var ALMACEN = 'imagenes';
  var bd = null;
  var intentado = false;

  function abrir() {
    if (bd) return Promise.resolve(bd);
    if (intentado && !bd) return Promise.resolve(null);
    intentado = true;

    return new Promise(function (resolver) {
      var pet;
      try {
        if (!window.indexedDB) return resolver(null);
        pet = window.indexedDB.open(BASE, 1);
      } catch (e) { return resolver(null); }

      pet.onupgradeneeded = function () {
        var db = pet.result;
        if (!db.objectStoreNames.contains(ALMACEN)) db.createObjectStore(ALMACEN);
      };
      pet.onsuccess = function () { bd = pet.result; resolver(bd); };
      pet.onerror = function () { resolver(null); };
      pet.onblocked = function () { resolver(null); };
    });
  }

  function transaccion(modo) {
    return abrir().then(function (db) {
      if (!db) return null;
      try { return db.transaction(ALMACEN, modo).objectStore(ALMACEN); }
      catch (e) { return null; }
    });
  }

  /**
   * Reduce una imagen antes de guardarla. Una foto de celular ronda los 4 MB;
   * a 1000 px de lado y calidad 0.65 baja a unos 100 KB sin que se note en
   * pantalla ni al imprimir un recibo.
   */
  function comprimir(archivo, ladoMaximo, calidad) {
    ladoMaximo = ladoMaximo || 1000;
    calidad = calidad || 0.65;

    return new Promise(function (resolver, rechazar) {
      var lector = new FileReader();
      lector.onerror = function () { rechazar(new Error('No se pudo leer la imagen.')); };
      lector.onload = function () {
        var img = new Image();
        img.onerror = function () { rechazar(new Error('El archivo no es una imagen valida.')); };
        img.onload = function () {
          var escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
          var lienzo = document.createElement('canvas');
          lienzo.width = Math.round(img.width * escala);
          lienzo.height = Math.round(img.height * escala);
          var ctx = lienzo.getContext('2d');
          ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
          resolver(lienzo.toDataURL('image/jpeg', calidad));
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }

  return {
    disponible: function () { return abrir().then(function (db) { return !!db; }); },

    /** Guarda un dataURL y devuelve su id. */
    guardar: function (dataURL, prefijo) {
      var id = (prefijo || 'img') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      return transaccion('readwrite').then(function (almacen) {
        if (!almacen) return null;
        return new Promise(function (resolver) {
          var p = almacen.put(dataURL, id);
          p.onsuccess = function () { resolver(id); };
          p.onerror = function () { resolver(null); };
        });
      });
    },

    /** Devuelve el dataURL de un id, o null si ya no esta. */
    leer: function (id) {
      if (!id) return Promise.resolve(null);
      return transaccion('readonly').then(function (almacen) {
        if (!almacen) return null;
        return new Promise(function (resolver) {
          var p = almacen.get(id);
          p.onsuccess = function () { resolver(p.result || null); };
          p.onerror = function () { resolver(null); };
        });
      });
    },

    borrar: function (id) {
      if (!id) return Promise.resolve();
      return transaccion('readwrite').then(function (almacen) {
        if (!almacen) return;
        try { almacen.delete(id); } catch (e) { /* ya no estaba */ }
      });
    },

    /** Cuanto ocupan las imagenes guardadas, para avisarlo en Ajustes. */
    uso: function () {
      return transaccion('readonly').then(function (almacen) {
        if (!almacen) return { n: 0, bytes: 0 };
        return new Promise(function (resolver) {
          var n = 0, bytes = 0;
          var cur = almacen.openCursor();
          cur.onsuccess = function () {
            var c = cur.result;
            if (!c) return resolver({ n: n, bytes: bytes });
            n++;
            bytes += String(c.value || '').length * 0.75; // dataURL base64 -> bytes
            c.continue();
          };
          cur.onerror = function () { resolver({ n: n, bytes: bytes }); };
        });
      });
    },

    comprimir: comprimir
  };
})();

/* ---------------------------------------------------------------------------
   Lienzo de firma: se dibuja con el dedo en celular o con el mouse en
   computadora. Devuelve un PNG recortado a lo que realmente se trazo.
   --------------------------------------------------------------------------- */
CC.Firma = function (lienzo) {
  var ctx = lienzo.getContext('2d');
  var dibujando = false;
  var vacia = true;
  var limites = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };

  function ajustarTamano() {
    var caja = lienzo.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    lienzo.width = Math.round(caja.width * dpr);
    lienzo.height = Math.round(caja.height * dpr);
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111A22';
  }
  ajustarTamano();

  function punto(e) {
    var caja = lienzo.getBoundingClientRect();
    var t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - caja.left, y: t.clientY - caja.top };
  }

  function anotar(p) {
    limites.x1 = Math.min(limites.x1, p.x); limites.y1 = Math.min(limites.y1, p.y);
    limites.x2 = Math.max(limites.x2, p.x); limites.y2 = Math.max(limites.y2, p.y);
  }

  function iniciar(e) {
    e.preventDefault();
    dibujando = true; vacia = false;
    var p = punto(e); anotar(p);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  }
  function mover(e) {
    if (!dibujando) return;
    e.preventDefault();
    var p = punto(e); anotar(p);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function terminar() { dibujando = false; }

  lienzo.addEventListener('mousedown', iniciar);
  lienzo.addEventListener('mousemove', mover);
  window.addEventListener('mouseup', terminar);
  lienzo.addEventListener('touchstart', iniciar, { passive: false });
  lienzo.addEventListener('touchmove', mover, { passive: false });
  lienzo.addEventListener('touchend', terminar);

  return {
    vacia: function () { return vacia; },
    limpiar: function () {
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      vacia = true;
      limites = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
    },
    /** PNG recortado al trazo, con un margen, sobre fondo blanco. */
    aPNG: function () {
      if (vacia) return null;
      var dpr = window.devicePixelRatio || 1;
      var m = 8;
      var x = Math.max(0, limites.x1 - m), y = Math.max(0, limites.y1 - m);
      var an = Math.min(lienzo.width / dpr, limites.x2 + m) - x;
      var al = Math.min(lienzo.height / dpr, limites.y2 + m) - y;
      if (!(an > 0 && al > 0)) return lienzo.toDataURL('image/png');

      var salida = document.createElement('canvas');
      salida.width = Math.round(an * dpr);
      salida.height = Math.round(al * dpr);
      var sctx = salida.getContext('2d');
      sctx.fillStyle = '#FFFFFF';
      sctx.fillRect(0, 0, salida.width, salida.height);
      sctx.drawImage(lienzo, x * dpr, y * dpr, an * dpr, al * dpr, 0, 0, salida.width, salida.height);
      return salida.toDataURL('image/png');
    }
  };
};
