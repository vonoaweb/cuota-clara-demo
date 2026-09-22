/* store.js — persistencia y estado.
 *
 * El resto de la aplicación nunca toca localStorage directamente: habla con
 * CC.Store. Eso deja un solo punto de cambio para conectar un backend real
 * (ver driver.remoto más abajo y el README): basta con implementar leer() y
 * escribir() contra una API y registrarlo con CC.Store.usarDriver().
 */
window.CC = window.CC || {};

CC.Store = (function () {
  var LLAVE = 'cuotaclara.v1';
  var estado = null;
  var oyentes = [];
  var driver = null;

  /* ---- Driver local: el navegador de quien usa la aplicación ---- */
  var driverLocal = {
    nombre: 'local',
    disponible: function () {
      try {
        var k = '__cc_probe__';
        window.localStorage.setItem(k, '1');
        window.localStorage.removeItem(k);
        return true;
      } catch (e) { return false; }
    },
    leer: function () {
      try {
        var crudo = window.localStorage.getItem(LLAVE);
        return crudo ? JSON.parse(crudo) : null;
      } catch (e) { return null; }
    },
    escribir: function (datos) {
      try {
        window.localStorage.setItem(LLAVE, JSON.stringify(datos));
        return true;
      } catch (e) { return false; }
    },
    borrar: function () {
      try { window.localStorage.removeItem(LLAVE); return true; }
      catch (e) { return false; }
    }
  };

  /* ---- Driver en memoria: cuando el navegador bloquea el almacenamiento
         (ventana privada, cookies restringidas). La aplicacion sigue
         funcionando; los cambios se pierden al cerrar. ---- */
  var driverMemoria = (function () {
    var caja = null;
    return {
      nombre: 'memoria',
      disponible: function () { return true; },
      leer: function () { return caja; },
      escribir: function (datos) { caja = JSON.parse(JSON.stringify(datos)); return true; },
      borrar: function () { caja = null; return true; }
    };
  })();

  function elegirDriver() {
    return driverLocal.disponible() ? driverLocal : driverMemoria;
  }

  function nuevoId(prefijo) {
    return prefijo + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function emitir() {
    for (var i = 0; i < oyentes.length; i++) {
      try { oyentes[i](estado); } catch (e) { /* un oyente roto no tumba a los demas */ }
    }
  }

  function guardar() {
    estado.meta.actualizado = new Date().toISOString();
    driver.escribir(estado);
    emitir();
  }

  return {
    /* --- ciclo de vida --- */
    iniciar: function () {
      driver = elegirDriver();
      var guardado = driver.leer();
      estado = (guardado && guardado.version === 1) ? guardado : CC.Seed.construir();
      if (!guardado) driver.escribir(estado);
      return estado;
    },
    usarDriver: function (d) {
      driver = d;
      var guardado = driver.leer();
      if (guardado) { estado = guardado; emitir(); }
    },
    driverActivo: function () { return driver ? driver.nombre : 'ninguno'; },
    persistente: function () { return driver !== driverMemoria; },

    /* --- lectura --- */
    estado: function () { return estado; },
    condominio: function () { return estado.condominio; },
    unidades: function () { return estado.unidades; },
    cargos: function () { return estado.cargos; },
    pagos: function () { return estado.pagos; },
    gastos: function () { return estado.gastos; },
    avisos: function () { return estado.avisos; },
    categorias: function () { return estado.categorias; },
    esDemo: function () { return !!estado.meta.demo; },

    unidad: function (id) {
      var u = estado.unidades;
      for (var i = 0; i < u.length; i++) if (u[i].id === id) return u[i];
      return null;
    },

    /* --- suscripcion: las vistas se redibujan cuando cambian los datos --- */
    alCambiar: function (fn) {
      oyentes.push(fn);
      return function () {
        var i = oyentes.indexOf(fn);
        if (i >= 0) oyentes.splice(i, 1);
      };
    },

    /* --- escritura --- */
    agregarPago: function (p) {
      p.id = nuevoId('pag');
      p.registrado = new Date().toISOString();
      estado.pagos.push(p);
      estado.meta.demo = false;
      guardar();
      return p;
    },
    borrarPago: function (id) {
      estado.pagos = estado.pagos.filter(function (p) { return p.id !== id; });
      guardar();
    },

    agregarCargo: function (c) {
      c.id = nuevoId('car');
      estado.cargos.push(c);
      estado.meta.demo = false;
      guardar();
      return c;
    },
    agregarCargos: function (lista) {
      for (var i = 0; i < lista.length; i++) {
        lista[i].id = nuevoId('car');
        estado.cargos.push(lista[i]);
      }
      estado.meta.demo = false;
      guardar();
      return lista.length;
    },
    borrarCargo: function (id) {
      estado.cargos = estado.cargos.filter(function (c) { return c.id !== id; });
      guardar();
    },

    agregarGasto: function (g) {
      g.id = nuevoId('gas');
      estado.gastos.push(g);
      estado.meta.demo = false;
      guardar();
      return g;
    },
    actualizarGasto: function (id, cambios) {
      var g = estado.gastos;
      for (var i = 0; i < g.length; i++) {
        if (g[i].id === id) { Object.assign(g[i], cambios); break; }
      }
      guardar();
    },
    borrarGasto: function (id) {
      estado.gastos = estado.gastos.filter(function (g) { return g.id !== id; });
      guardar();
    },

    agregarUnidad: function (u) {
      u.id = nuevoId('uni');
      estado.unidades.push(u);
      estado.meta.demo = false;
      guardar();
      return u;
    },
    actualizarUnidad: function (id, cambios) {
      var u = this.unidad(id);
      if (u) { Object.assign(u, cambios); guardar(); }
      return u;
    },
    borrarUnidad: function (id) {
      estado.unidades = estado.unidades.filter(function (u) { return u.id !== id; });
      estado.cargos = estado.cargos.filter(function (c) { return c.unidadId !== id; });
      estado.pagos = estado.pagos.filter(function (p) { return p.unidadId !== id; });
      guardar();
    },

    agregarAviso: function (a) {
      a.id = nuevoId('avi');
      estado.avisos.unshift(a);
      estado.meta.demo = false;
      guardar();
      return a;
    },
    borrarAviso: function (id) {
      estado.avisos = estado.avisos.filter(function (a) { return a.id !== id; });
      guardar();
    },

    actualizarCondominio: function (cambios) {
      Object.assign(estado.condominio, cambios);
      estado.meta.demo = false;
      guardar();
    },
    actualizarCategorias: function (lista) {
      estado.categorias = lista;
      guardar();
    },

    /* --- mantenimiento --- */
    /** Vacia todo y deja la estructura lista para capturar un condominio real. */
    empezarDeCero: function (datosCondominio) {
      estado = CC.Seed.vacio(datosCondominio);
      driver.escribir(estado);
      emitir();
    },
    restaurarEjemplo: function () {
      estado = CC.Seed.construir();
      driver.escribir(estado);
      emitir();
    },
    exportar: function () { return JSON.stringify(estado, null, 2); },
    importar: function (texto) {
      var datos = JSON.parse(texto);
      if (!datos || datos.version !== 1 || !Array.isArray(datos.unidades)) {
        throw new Error('El archivo no tiene el formato de Cuota Clara.');
      }
      estado = datos;
      driver.escribir(estado);
      emitir();
    },
    nuevoId: nuevoId
  };
})();
