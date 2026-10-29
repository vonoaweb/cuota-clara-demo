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

  var driverPreferido = null;   // el programa de escritorio guarda en un archivo (escritorio.js)

  function elegirDriver() {
    if (driverPreferido && driverPreferido.disponible()) return driverPreferido;
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

  /* Mientras corre una escritura envuelta (ver envolver), guardar espera: se guarda
     y se redibuja una sola vez al final, ya con su línea en la bitácora. */
  var envueltas = 0, guardarPendiente = false;

  function guardar() {
    if (envueltas) { guardarPendiente = true; return; }
    estado.meta.actualizado = new Date().toISOString();
    driver.escribir(estado);
    emitir();
  }

  /**
   * Completa lo que falte en un documento guardado por una version anterior.
   * Sin esto, a quien ya tenia datos le explotarian las secciones nuevas.
   */
  function migrar(d) {
    if (!d || typeof d !== 'object') return d;
    if (!Array.isArray(d.recibos)) d.recibos = [];
    if (!Array.isArray(d.notas)) d.notas = [];
    if (!Array.isArray(d.difusiones)) d.difusiones = [];
    if (!Array.isArray(d.documentos)) d.documentos = [];
    if (!d.reglamento || !Array.isArray(d.reglamento.capitulos)) {
      d.reglamento = { titulo: 'Reglamento Interno', aprobado: '', nota: '', capitulos: [] };
    }
    if (!Array.isArray(d.convenios)) d.convenios = [];
    if (!Array.isArray(d.avisosAdeudo)) d.avisosAdeudo = [];
    if (!Array.isArray(d.cajaChica)) d.cajaChica = [];
    if (!Array.isArray(d.amenidades)) d.amenidades = [];
    if (!Array.isArray(d.reservas)) d.reservas = [];
    if (!Array.isArray(d.visitas)) d.visitas = [];
    if (!Array.isArray(d.traspasos)) d.traspasos = [];
    if (!Array.isArray(d.ingresos)) d.ingresos = [];
    if (!Array.isArray(d.proveedores)) d.proveedores = [];
    if (!Array.isArray(d.arqueos)) d.arqueos = [];
    if (!Array.isArray(d.usuarios)) d.usuarios = [];
    if (!Array.isArray(d.bitacora)) d.bitacora = [];
    if (!Array.isArray(d.cierres)) d.cierres = [];
    if (!Array.isArray(d.entregas)) d.entregas = [];
    if (!d.meta) d.meta = { demo: false, creado: new Date().toISOString() };
    if (typeof d.meta.folioRecibo !== 'number') d.meta.folioRecibo = d.recibos.length;
    if (typeof d.meta.folioCaja !== 'number') d.meta.folioCaja = d.cajaChica.length;
    if (typeof d.meta.folioConvenio !== 'number') d.meta.folioConvenio = d.convenios.length;

    // Cada pago lleva folio para su recibo. A los pagos de antes se les pone
    // en orden de fecha, para que el folio siga la cronología.
    if (typeof d.meta.folioPago !== 'number') {
      var sinFolio = (d.pagos || []).slice().sort(function (a, b) {
        return (a.fecha || '') < (b.fecha || '') ? -1 : (a.fecha === b.fecha ? 0 : 1);
      });
      var f = 0;
      sinFolio.forEach(function (p) { if (typeof p.folio !== 'number') p.folio = ++f; else f = Math.max(f, p.folio); });
      d.meta.folioPago = f;
    }

    // Cuentas: el dinero está en el banco o en la caja chica. El "saldo inicial
    // en caja" de antes era el del banco.
    var c0 = d.condominio || {};
    if (!Array.isArray(d.cuentas)) {
      d.cuentas = [
        { id: 'banco', nombre: 'Banco', saldoInicial: Number(c0.saldoInicialCaja) || 0 },
        { id: 'caja', nombre: 'Caja chica', saldoInicial: 0 }
      ];
    }
    (d.pagos || []).forEach(function (x) { if (!x.cuenta) x.cuenta = x.metodo === 'Efectivo' ? 'caja' : 'banco'; });
    (d.gastos || []).forEach(function (x) { if (!x.cuenta) x.cuenta = x.metodo === 'Efectivo' ? 'caja' : 'banco'; });
    (d.categorias || []).forEach(function (x) {
      if (!x.grupo) x.grupo = (Number(x.presupuesto) || 0) > 0 ? 'fijo' : 'variable';
    });

    // Folio consecutivo de egresos, en orden de fecha
    if (typeof d.meta.folioEgreso !== 'number') {
      var fe = 0;
      (d.gastos || []).slice().sort(porFecha).forEach(function (g) {
        if (typeof g.folioE !== 'number') g.folioE = ++fe; else fe = Math.max(fe, g.folioE);
      });
      d.meta.folioEgreso = fe;
    }
    if (typeof d.meta.folioIngreso !== 'number') d.meta.folioIngreso = d.ingresos.length;
    if (typeof d.meta.folioTraspaso !== 'number') d.meta.folioTraspaso = d.traspasos.length;

    // La caja chica de antes (vales de un fondo fijo) y los recibos sueltos pasan a
    // ser egresos, ingresos y traspasos: el recibo y el egreso son una sola captura.
    if (d.cajaChica.length && !d.meta.cajaConvertida) convertirCajaChica(d);
    if (d.recibos.length && !d.meta.recibosConvertidos) convertirRecibos(d);

    // Reglas nuevas con su valor de siempre
    var c = d.condominio || {};
    if (!c.recargoModo) c.recargoModo = 'porcentaje';
    if (!Array.isArray(c.recargoTramos)) c.recargoTramos = [{ dia: 6, monto: 50 }, { dia: 18, monto: 100 }];
    if (c.avisoDiasTras === undefined) c.avisoDiasTras = 3;
    if (c.avisoRepetirDias === undefined) c.avisoRepetirDias = 7;
    if (c.fondoCajaChica === undefined) c.fondoCajaChica = 5000;

    // El campo de agrupación se llamaba "torre" cuando el ejemplo eran
    // departamentos; en un condominio de casas es la calle.
    (d.unidades || []).forEach(function (u) {
      if (u.calle === undefined) u.calle = u.torre || '';
    });
    return d;
  }

  function porFecha(a, b) {
    return (a.fecha || '') < (b.fecha || '') ? -1 : (a.fecha === b.fecha ? 0 : 1);
  }

  function convertirCajaChica(d) {
    var quitar = {};
    d.cajaChica.slice().sort(porFecha).forEach(function (m) {
      if (m.tipo === 'egreso') {
        d.meta.folioEgreso = (d.meta.folioEgreso || 0) + 1;
        d.gastos.push({
          id: nuevoId('gas'), folioE: d.meta.folioEgreso, periodo: m.periodo, fecha: m.fecha,
          categoria: m.categoria || 'Caja chica', proveedor: m.nombre || '', concepto: m.concepto,
          monto: m.monto, estado: 'pagado', metodo: 'Efectivo', cuenta: 'caja', folio: '', referencia: '',
          recibo: true, firmaId: m.firmaId || null, firmaInline: m.firmaInline || null, fotoId: m.fotoId || null,
          identificacion: m.identificacion || '', nota: m.nota || ''
        });
      } else if (m.tipo === 'ingreso') {
        d.meta.folioIngreso = (d.meta.folioIngreso || 0) + 1;
        d.ingresos.push({
          id: nuevoId('ing'), folio: d.meta.folioIngreso, periodo: m.periodo, fecha: m.fecha, cuenta: 'caja',
          concepto: m.concepto, categoria: m.categoria || '', nombre: m.nombre || '', unidadId: m.unidadId || null,
          monto: m.monto, metodo: 'Efectivo', firmaId: m.firmaId || null, firmaInline: m.firmaInline || null,
          fotoId: m.fotoId || null, nota: m.nota || ''
        });
      } else {
        // La reposición era dinero que pasaba del banco a la caja: es un traspaso, no un gasto
        if (m.gastoId) quitar[m.gastoId] = 1;
        d.meta.folioTraspaso = (d.meta.folioTraspaso || 0) + 1;
        d.traspasos.push({
          id: nuevoId('tra'), folio: d.meta.folioTraspaso, periodo: m.periodo, fecha: m.fecha,
          de: 'banco', a: 'caja', monto: m.monto, referencia: '', nota: m.concepto
        });
      }
    });
    d.gastos = d.gastos.filter(function (g) { return !quitar[g.id]; });
    d.cajaChica = [];
    d.meta.cajaConvertida = true;
  }

  function convertirRecibos(d) {
    d.recibos.slice().sort(porFecha).forEach(function (r) {
      d.meta.folioEgreso = (d.meta.folioEgreso || 0) + 1;
      d.gastos.push({
        id: nuevoId('gas'), folioE: d.meta.folioEgreso, periodo: r.periodo || String(r.fecha).slice(0, 7),
        fecha: r.fecha, categoria: r.categoria || 'Otros', proveedor: r.nombre || '', concepto: r.concepto,
        monto: r.monto, estado: 'pagado', metodo: r.metodo || 'Efectivo',
        cuenta: (r.metodo || 'Efectivo') === 'Efectivo' ? 'caja' : 'banco', folio: '', referencia: '',
        recibo: true, firmaId: r.firmaId || null, firmaInline: r.firmaInline || null, fotoId: r.fotoId || null,
        identificacion: r.identificacion || '', nota: r.nota || ''
      });
    });
    d.recibos = [];
    d.meta.recibosConvertidos = true;
  }

  /* ---------- Quién, cuándo y de qué mes ----------
     Toda escritura pasa por aquí (envolver, al final): se revisa que quien la hace
     tenga permiso y que el mes no esté cerrado, y se anota en la bitácora. */

  function quien() {
    var u = CC.Sesion && CC.Sesion.usuario();
    return u ? { id: u.id, nombre: u.nombre } : null;
  }

  function mesCerrado(periodo) {
    return !!periodo && !!estado && (estado.cierres || []).some(function (c) { return c.periodo === periodo && !c.reabierto; });
  }

  /** Un error que se le muestra tal cual a quien usa el sistema (app.js lo pone en un aviso). */
  function Bloqueo(mensaje) { var e = new Error(mensaje); e.bloqueo = true; return e; }

  var MONEDA = function (n) { return CC.fmt.money2(Number(n) || 0); };
  var F4 = function (pre, n) { return pre + String(n || 0).padStart(4, '0'); };
  var CASA = function (id) { var u = buscar(estado.unidades, id); return u ? 'casa ' + u.clave : ''; };
  var PER = function (fecha) { return fecha ? String(fecha).slice(0, 7) : null; };
  var pagoDe = function (id) { return buscar(estado.pagos, id) || {}; };
  var gastoDe = function (id) { return buscar(estado.gastos, id) || {}; };
  var cargoDe = function (id) { return buscar(estado.cargos, id) || {}; };
  var traspasoDe = function (id) { return buscar(estado.traspasos, id) || {}; };
  var ingresoDe = function (id) { return buscar(estado.ingresos, id) || {}; };
  var camposCorregidos = function (o) {
    var h = (o && o.historial) || [];
    return h.length ? Object.keys(h[h.length - 1].antes).join(', ') : '';
  };

  /*
   * Por cada escritura: rol ('comite' si solo el comité la hace), mes (los meses que
   * toca, para el candado del cierre), nuevo (al registro se le anota quién lo hizo)
   * y nota (lo que queda en la bitácora: [qué hizo, detalle]).
   */
  var REGLAS = {
    agregarPago: { nuevo: true, mes: function (p) { return [PER(p.fecha)]; },
      nota: function (r) { return ['Registró el pago ' + F4('P-', r.folio), CASA(r.unidadId) + ' · ' + MONEDA(r.monto) + ' · ' + (r.metodo || '')]; } },
    cancelarPago: { mes: function (id) { return [PER(pagoDe(id).fecha)]; },
      nota: function (r, id, motivo) { var p = pagoDe(id); return ['Canceló el pago ' + F4('P-', p.folio), CASA(p.unidadId) + ' · ' + MONEDA(p.monto) + ' · motivo: ' + (motivo || '—')]; } },
    agregarCargo: { nuevo: true, mes: function (c) { return [c.periodo]; },
      nota: function (r) { return ['Cargó ' + (r.concepto || 'un cargo'), CASA(r.unidadId) + ' · ' + MONEDA(r.monto)]; } },
    agregarCargos: { mes: function (l) { return l.map(function (c) { return c.periodo; }); },
      nota: function (n, l) { return ['Generó ' + n + (n === 1 ? ' cargo' : ' cargos'), (l[0] && l[0].concepto) || '']; } },
    editarCargo: { mes: function (id) { return [cargoDe(id).periodo]; },
      nota: function (r) { return r ? ['Corrigió un cargo', CASA(r.unidadId) + ' · ' + r.concepto + ' · ahora ' + MONEDA(r.monto)] : null; } },
    condonarCargo: { mes: function (id) { return [cargoDe(id).periodo]; },
      nota: function (r, id, motivo) { var c = cargoDe(id); return ['Condonó ' + (c.concepto || 'un cargo'), CASA(c.unidadId) + ' · motivo: ' + (motivo || '—')]; } },
    borrarCargo: { mes: function (id) { return [cargoDe(id).periodo]; }, antes: function (id) { return cargoDe(id); },
      nota: function (r, id, antes) { return ['Borró un cargo', CASA(antes.unidadId) + ' · ' + (antes.concepto || '') + ' · ' + MONEDA(antes.monto)]; } },
    agregarGasto: { nuevo: true, mes: function (g) { return [g.periodo, PER(g.fecha)]; },
      nota: function (r) { return ['Registró el egreso ' + F4('E-', r.folioE), r.concepto + ' · ' + MONEDA(r.monto)]; } },
    editarGasto: { mes: function (id, c) { var g = gastoDe(id); return [g.periodo, c && PER(c.fecha)]; },
      nota: function (r) { return r ? ['Corrigió el egreso ' + F4('E-', r.folioE), 'cambió: ' + (camposCorregidos(r) || '—')] : null; } },
    cancelarGasto: { mes: function (id) { return [gastoDe(id).periodo]; },
      nota: function (r, id, motivo) { var g = gastoDe(id); return ['Canceló el egreso ' + F4('E-', g.folioE), g.concepto + ' · ' + MONEDA(g.monto) + ' · motivo: ' + (motivo || '—')]; } },
    revisarGastos: { rol: 'comite',
      nota: function (r, ids) { return ['Revisó ' + ids.length + (ids.length === 1 ? ' egreso' : ' egresos'), ids.map(function (id) { return F4('E-', gastoDe(id).folioE); }).join(', ')]; } },
    agregarTraspaso: { nuevo: true, mes: function (t) { return [PER(t.fecha)]; },
      nota: function (r) { return ['Registró el traspaso ' + F4('T-', r.folio), MONEDA(r.monto)]; } },
    editarTraspaso: { mes: function (id, c) { return [PER(traspasoDe(id).fecha), c && PER(c.fecha)]; },
      nota: function (r) { return r ? ['Corrigió el traspaso ' + F4('T-', r.folio), 'cambió: ' + (camposCorregidos(r) || '—')] : null; } },
    cancelarTraspaso: { mes: function (id) { return [PER(traspasoDe(id).fecha)]; },
      nota: function (r, id) { var t = traspasoDe(id); return ['Canceló el traspaso ' + F4('T-', t.folio), MONEDA(t.monto)]; } },
    agregarIngreso: { nuevo: true, mes: function (i) { return [PER(i.fecha)]; },
      nota: function (r) { return ['Registró el ingreso ' + F4('I-', r.folio), r.concepto + ' · ' + MONEDA(r.monto)]; } },
    cancelarIngreso: { mes: function (id) { return [PER(ingresoDe(id).fecha)]; },
      nota: function (r, id) { var i = ingresoDe(id); return ['Canceló el ingreso ' + F4('I-', i.folio), (i.concepto || '') + ' · ' + MONEDA(i.monto)]; } },
    agregarArqueo: { nuevo: true,
      nota: function (r) { return ['Contó la caja chica (arqueo)', 'contado ' + MONEDA(r.contado) + ' · diferencia ' + MONEDA(r.diferencia)]; } },
    actualizarCuenta: { candadoInicial: true,
      nota: function (r) { return r ? ['Cambió los datos de la cuenta ' + r.nombre, 'saldo inicial ' + MONEDA(r.saldoInicial)] : null; } },
    agregarUnidad: { nuevo: true, nota: function (r) { return ['Dio de alta la casa ' + r.clave, r.propietario || '']; } },
    actualizarUnidad: { nota: function (r, id, c) { return r ? ['Cambió los datos de la casa ' + r.clave, Object.keys(c || {}).join(', ')] : null; } },
    borrarUnidad: { antes: function (id) { return buscar(estado.unidades, id) || {}; },
      nota: function (r, id, antes) { return r ? ['Eliminó la casa ' + antes.clave, antes.propietario || ''] : null; } },
    agregarUnidades: { nota: function (n, l) { return ['Dio de alta ' + n + (n === 1 ? ' casa' : ' casas'), l.length ? 'de la ' + l[0].clave + ' a la ' + l[l.length - 1].clave : '']; } },
    actualizarUnidades: { nota: function (n) { return n ? ['Llenó el padrón', n + (n === 1 ? ' casa' : ' casas') + ' con cambios'] : null; } },
    ponerSaldosAnteriores: { mes: function (l) { return l.map(function (c) { return c.periodo; }); },
      nota: function (n, l) {
        var t = l.reduce(function (a, c) { return a + (Number(c.monto) || 0); }, 0);
        var casas = {}; l.forEach(function (c) { casas[c.unidadId] = 1; });
        return ['Puso lo que debía cada casa al empezar', Object.keys(casas).length + ' casas · ' + MONEDA(t)];
      } },
    agregarConvenio: { nuevo: true, nota: function (r) { return ['Hizo el convenio ' + F4('CV-', r.folio), CASA(r.unidadId) + ' · ' + MONEDA(r.adeudo)]; } },
    actualizarConvenio: { nota: function (r, id, c) { return r ? ['Cambió el convenio ' + F4('CV-', r.folio), Object.keys(c || {}).join(', ')] : null; } },
    actualizarCondominio: { nota: function (r, c) { return ['Cambió los datos del condominio', Object.keys(c || {}).filter(function (k) { return k !== 'logo'; }).join(', ') || 'logo']; } },
    actualizarCategorias: { nota: function () { return ['Cambió las categorías y el presupuesto', '']; } },
    agregarUsuario: { rol: 'comite-o-primero',
      nota: function (r) { return ['Dio de alta al usuario ' + r.nombre, CC.Sesion ? CC.Sesion.nombreRol(r.rol) : r.rol]; } },
    actualizarUsuario: { rol: 'comite-o-uno-mismo',
      nota: function (r, id, c) {
        if (!r) return null;
        var que = c.activo === false ? 'Dio de baja al usuario ' : c.clave ? 'Cambió la contraseña de ' : 'Cambió el usuario ';
        return [que + r.nombre, c.rol ? 'ahora: ' + (CC.Sesion ? CC.Sesion.nombreRol(c.rol) : c.rol) : ''];
      } },
    cerrarMes: { rol: 'comite', nota: function (r, p) { return ['Cerró el mes de ' + CC.fmt.periodo(p), (r && r.nota) || '']; } },
    reabrirMes: { rol: 'comite', nota: function (r, p, motivo) { return r ? ['Reabrió el mes de ' + CC.fmt.periodo(p), 'motivo: ' + (motivo || '—')] : null; } },
    agregarEntrega: { rol: 'comite', nota: function (r) { return ['Hizo la entrega-recepción', (r.entrega || '') + ' entrega a ' + (r.recibe || '')]; } },
    empezarDeCero: { rol: 'comite', nota: function () { return ['Empezó en blanco con los datos de su condominio', '']; } },
    importar: { rol: 'comite', nota: function () { return ['Abrió una base de datos desde un archivo', 'reemplazó los datos que había']; } }
  };

  function envolver(api) {
    Object.keys(REGLAS).forEach(function (nombre) {
      var regla = REGLAS[nombre], original = api[nombre];
      if (typeof original !== 'function') return;
      api[nombre] = function () {
        var args = Array.prototype.slice.call(arguments);
        permiso(nombre, regla, args);
        if (regla.mes) {
          var meses = regla.mes.apply(null, args).filter(Boolean);
          var cerrado = meses.filter(mesCerrado)[0];
          if (cerrado) throw Bloqueo('El mes de ' + CC.fmt.periodo(cerrado) + ' ya está cerrado. ' +
            'Si hay que corregir algo, el comité tiene que reabrirlo en Reportes.');
        }
        if (regla.candadoInicial && (estado.cierres || []).some(function (c) { return !c.reabierto; })) {
          throw Bloqueo('Los saldos iniciales ya no se cambian: hay meses cerrados. El comité tendría que reabrirlos.');
        }
        var antes = regla.antes ? JSON.parse(JSON.stringify(regla.antes.apply(null, args))) : null;
        var autor = quien();
        var r;
        envueltas++;
        try { r = original.apply(api, args); } finally { envueltas--; }
        if (regla.nuevo && r && typeof r === 'object' && autor) r.registradoPor = autor;
        try {
          // la nota recibe: lo que regresó, los argumentos y, si la regla lo pide, cómo estaba antes
          var n = regla.nota.apply(null, [r].concat(args.slice(0, regla.antes ? 1 : args.length), antes ? [antes] : []));
          if (n) estado.bitacora.push({ fecha: new Date().toISOString(), por: autor, accion: n[0], detalle: n[1] || '' });
        } catch (e) { /* una nota que no se pudo escribir no detiene la captura */ }
        // Ya con la nota: se guarda y se redibuja una sola vez
        if (guardarPendiente && !envueltas) { guardarPendiente = false; guardar(); } else driver.escribir(estado);
        return r;
      };
    });
  }

  function permiso(nombre, regla, args) {
    if (!regla.rol || !CC.Sesion || !CC.Sesion.hayUsuarios()) return;
    var u = CC.Sesion.usuario();
    if (!u) throw Bloqueo('Primero entra con tu nombre y contraseña.');
    if (u.rol === 'comite') return;
    if (regla.rol === 'comite-o-uno-mismo' && args[0] === u.id && args[1] && !args[1].rol && args[1].activo !== false) return;
    throw Bloqueo('Esto lo hace alguien del comité (' + nombreAccion(nombre) + ').');
  }

  function nombreAccion(n) {
    return {
      revisarGastos: 'revisar egresos', cerrarMes: 'cerrar el mes', reabrirMes: 'reabrir el mes',
      agregarEntrega: 'entrega-recepción', agregarUsuario: 'dar de alta usuarios', actualizarUsuario: 'cambiar usuarios',
      empezarDeCero: 'empezar en blanco', importar: 'abrir una base de datos'
    }[n] || n;
  }

  function buscar(lista, id) {
    for (var i = 0; i < (lista || []).length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  /** Aplica cambios y deja constancia de lo que había antes (para auditar). */
  function cambiarConHistorial(obj, cambios) {
    var antes = {}, hay = false;
    // Un campo vacío que se guarda vacío ('' en vez de nada, false en vez de nada) no es una corrección
    var vacio = function (v) { return v === undefined || v === null || v === '' || v === false; };
    Object.keys(cambios).forEach(function (k) {
      if (vacio(obj[k]) && vacio(cambios[k])) return;
      if (JSON.stringify(obj[k]) !== JSON.stringify(cambios[k])) { antes[k] = obj[k]; hay = true; }
    });
    if (!hay) return false;
    obj.historial = (obj.historial || []).concat([{ fecha: new Date().toISOString(), por: quien(), antes: antes }]);
    Object.assign(obj, cambios);
    return true;
  }

  var api = {
    /* --- ciclo de vida --- */
    iniciar: function () {
      driver = elegirDriver();
      var guardado = driver.leer();
      var usar = (guardado && guardado.version === 1) ? migrar(guardado) : null;

      // Si lo guardado salió del condominio de EJEMPLO de una versión anterior, se
      // vuelve a sembrar: quien abre el demo debe ver el actual, aunque haya
      // jugado con él (registrar un pago de prueba no lo vuelve un condominio
      // real). Un condominio real empieza vacío y no trae "semilla": ese nunca se
      // toca. Por si acaso, la copia anterior se guarda aparte.
      // En el programa del condominio (perfil con produccion: true) no hay ejemplo:
      // si lo guardado era de ejemplo, se empieza en blanco para que capturen lo suyo.
      var produccion = !!(CC.Perfil && CC.Perfil.produccion);
      if (usar && usar.meta && usar.meta.semilla && (produccion || usar.meta.semilla !== CC.Seed.SEMILLA)) {
        try { window.localStorage.setItem(LLAVE + '.anterior', JSON.stringify(usar)); } catch (e) { /* sin espacio */ }
        usar = null;
      }

      estado = usar || migrar(produccion ? CC.Seed.vacio(CC.Seed.condominioInicial()) : CC.Seed.construir());
      if (!usar) driver.escribir(estado);
      return estado;
    },
    usarDriver: function (d) {
      driver = d;
      var guardado = driver.leer();
      if (guardado) { estado = guardado; emitir(); }
    },
    driverActivo: function () { return driver ? driver.nombre : 'ninguno'; },
    preferirDriver: function (d) { driverPreferido = d; },
    persistente: function () { return driver !== driverMemoria; },

    /* --- lectura --- */
    estado: function () { return estado; },
    condominio: function () { return estado.condominio; },
    unidades: function () { return estado.unidades; },
    cargos: function () { return estado.cargos; },
    /** Los pagos que cuentan. Los cancelados conservan su folio pero no suman. */
    pagos: function () { return estado.pagos.filter(function (p) { return !p.cancelado; }); },
    /** Todos, con los cancelados: para la lista de cobranza y el control de folios. */
    todosLosPagos: function () { return estado.pagos; },
    gastos: function () { return estado.gastos; },
    avisos: function () { return estado.avisos; },
    categorias: function () { return estado.categorias; },
    recibos: function () { return estado.recibos || []; },
    notas: function () { return estado.notas || []; },
    difusiones: function () { return estado.difusiones || []; },
    documentos: function () { return estado.documentos || []; },
    reglamento: function () { return estado.reglamento; },
    convenios: function () { return estado.convenios || []; },
    avisosAdeudo: function () { return estado.avisosAdeudo || []; },
    cajaChica: function () { return estado.cajaChica || []; },
    cuentas: function () { return estado.cuentas || []; },
    cuenta: function (id) { return buscar(estado.cuentas, id); },
    traspasos: function () { return estado.traspasos || []; },
    traspaso: function (id) { return buscar(estado.traspasos, id); },
    ingresos: function () { return estado.ingresos || []; },
    ingreso: function (id) { return buscar(estado.ingresos, id); },
    proveedores: function () { return estado.proveedores || []; },
    arqueos: function () { return estado.arqueos || []; },
    gasto: function (id) { return buscar(estado.gastos, id); },
    cargo: function (id) { return buscar(estado.cargos, id); },
    amenidades: function () { return estado.amenidades || []; },
    amenidad: function (id) {
      var l = estado.amenidades || [];
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    reservas: function () { return estado.reservas || []; },
    visitas: function () { return estado.visitas || []; },
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
      estado.meta.folioPago = (estado.meta.folioPago || 0) + 1;
      p.folio = estado.meta.folioPago;
      p.registrado = new Date().toISOString();
      estado.pagos.push(p);
      estado.meta.demo = false;
      guardar();
      return p;
    },
    /**
     * Un pago no se borra: se cancela con su motivo. El folio sigue a la vista
     * para que no falte ninguno y el saldo de la casa se recalcula.
     */
    cancelarPago: function (id, motivo) {
      var p = buscar(estado.pagos, id);
      if (!p || p.cancelado) return;
      cambiarConHistorial(p, { cancelado: true, motivoCancelacion: motivo || '', canceladoEl: new Date().toISOString() });
      estado.meta.demo = false;
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
    /** Corrige un cargo (monto o concepto); queda marcado como corregido a mano. */
    editarCargo: function (id, cambios) {
      var c = buscar(estado.cargos, id);
      if (!c) return null;
      if (cambiarConHistorial(c, cambios)) {
        if (c.auto) c.manual = true;   // el sistema ya no lo vuelve a calcular
        estado.meta.demo = false;
        guardar();
      }
      return c;
    },
    /** Perdonar un cargo (un recargo, por ejemplo): queda en cero y a la vista. */
    condonarCargo: function (id, motivo) {
      var c = buscar(estado.cargos, id);
      if (!c) return;
      cambiarConHistorial(c, { monto: 0, condonado: true, motivo: motivo || '' });
      estado.meta.demo = false;
      guardar();
    },
    /**
     * Recargos que el sistema calcula solo. Es una regla del condominio, no una
     * captura: no convierte el demo en datos reales.
     */
    sincronizarRecargos: function (crear, actualizar) {
      // Lo de un mes cerrado ya no se mueve, ni siquiera los recargos automáticos
      crear = crear.filter(function (c) { return !mesCerrado(c.periodo); });
      actualizar = actualizar.filter(function (a) { var c = buscar(estado.cargos, a.id); return c && !mesCerrado(c.periodo); });
      if (!crear.length && !actualizar.length) return 0;
      crear.forEach(function (c) { estado.cargos.push(c); });
      actualizar.forEach(function (a) {
        var c = buscar(estado.cargos, a.id);
        if (c) c.monto = a.monto;
      });
      estado.cargos = estado.cargos.filter(function (c) {
        return !(c.tipo === 'recargo' && c.auto && !c.condonado && !c.manual && !(Number(c.monto) > 0.005));
      });
      guardar();
      return crear.length + actualizar.length;
    },
    borrarCargo: function (id) {
      estado.cargos = estado.cargos.filter(function (c) { return c.id !== id; });
      guardar();
    },

    agregarGasto: function (g) {
      g.id = nuevoId('gas');
      estado.meta.folioEgreso = (estado.meta.folioEgreso || 0) + 1;
      g.folioE = estado.meta.folioEgreso;
      if (!g.cuenta) g.cuenta = g.metodo === 'Efectivo' ? 'caja' : 'banco';
      g.registrado = new Date().toISOString();
      this._anotarProveedor(g.proveedor);
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
    /** Corrige un egreso ya capturado; lo que tenía antes queda en su historial. */
    editarGasto: function (id, cambios) {
      var g = buscar(estado.gastos, id);
      if (!g) return null;
      if (cambios.fecha) cambios.periodo = String(cambios.fecha).slice(0, 7);
      var revisado = g.revision;
      if (cambiarConHistorial(g, cambios)) {
        // Lo que se corrige después de revisado vuelve a quedar por revisar
        if (revisado) { g.historial[g.historial.length - 1].antes.revision = revisado; g.revision = null; }
        this._anotarProveedor(g.proveedor);
        estado.meta.demo = false;
        guardar();
      }
      return g;
    },
    /** Cancelar en vez de borrar: el folio sigue a la vista, pero ya no cuenta. */
    cancelarGasto: function (id, motivo) {
      var g = buscar(estado.gastos, id);
      if (!g) return;
      cambiarConHistorial(g, { estado: 'cancelado', motivoCancelacion: motivo || '' });
      estado.meta.demo = false;
      guardar();
    },
    /** Quien revisa (el comité o el tesorero) da por buenos los egresos: queda su nombre y la fecha. */
    revisarGastos: function (ids, nombre) {
      var fecha = new Date().toISOString();
      ids.forEach(function (id) {
        var g = buscar(estado.gastos, id);
        if (g) g.revision = { nombre: nombre, fecha: fecha };
      });
      estado.meta.demo = false;
      guardar();
    },
    _anotarProveedor: function (nombre) {
      nombre = String(nombre || '').trim();
      if (!nombre) return;
      var ya = (estado.proveedores || []).some(function (p) { return p.toLowerCase() === nombre.toLowerCase(); });
      if (!ya) estado.proveedores.push(nombre);
    },
    agregarCategoria: function (nombre, grupo) {
      nombre = String(nombre || '').trim();
      if (!nombre) return null;
      var ya = estado.categorias.filter(function (c) { return c.nombre.toLowerCase() === nombre.toLowerCase(); })[0];
      if (ya) return ya;
      var c = { id: nuevoId('cat'), nombre: nombre, presupuesto: 0, proveedor: '', grupo: grupo || 'variable' };
      estado.categorias.push(c);
      guardar();
      return c;
    },
    agregarUnidad: function (u) {
      u.id = nuevoId('uni');
      estado.unidades.push(u);
      estado.meta.demo = false;
      guardar();
      return u;
    },
    /** Varias casas de un jalón (Primeros pasos: crear de la 1 a la 105). */
    agregarUnidades: function (lista) {
      lista.forEach(function (u) { u.id = nuevoId('uni'); estado.unidades.push(u); });
      estado.meta.demo = false;
      guardar();
      return lista.length;
    },
    /** El padrón completo en una sola guardada: [{ id, cambios }]. */
    actualizarUnidades: function (lista) {
      var n = 0;
      lista.forEach(function (x) {
        var u = buscar(estado.unidades, x.id);
        if (u) { Object.assign(u, x.cambios); n++; }
      });
      if (n) { estado.meta.demo = false; guardar(); }
      return n;
    },
    /**
     * Lo que debía cada casa el día que empezaron con el sistema. Reemplaza lo que
     * se hubiera puesto antes (se puede corregir mientras arrancan).
     */
    ponerSaldosAnteriores: function (cargos) {
      estado.cargos = estado.cargos.filter(function (c) { return c.tipo !== 'inicial'; });
      cargos.forEach(function (c) { c.id = nuevoId('car'); c.tipo = 'inicial'; estado.cargos.push(c); });
      estado.meta.demo = false;
      guardar();
      return cargos.length;
    },
    actualizarUnidad: function (id, cambios) {
      var u = this.unidad(id);
      if (u) { Object.assign(u, cambios); guardar(); }
      return u;
    },
    /** Solo se borra una casa sin pagos: sus recibos llevan folio y no puede faltar ninguno. */
    borrarUnidad: function (id) {
      if (estado.pagos.some(function (p) { return p.unidadId === id; })) return false;
      estado.unidades = estado.unidades.filter(function (u) { return u.id !== id; });
      estado.cargos = estado.cargos.filter(function (c) { return c.unidadId !== id; });
      estado.pagos = estado.pagos.filter(function (p) { return p.unidadId !== id; });
      estado.convenios = (estado.convenios || []).filter(function (c) { return c.unidadId !== id; });
      estado.avisosAdeudo = (estado.avisosAdeudo || []).filter(function (a) { return a.unidadId !== id; });
      estado.notas = (estado.notas || []).filter(function (n) { return n.unidadId !== id; });
      guardar();
      return true;
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

    /* --- recibos de pago a proveedores (el del jardinero) --- */
    siguienteFolio: function () {
      return (estado.meta.folioRecibo || 0) + 1;
    },
    agregarRecibo: function (r) {
      r.id = nuevoId('rec');
      estado.meta.folioRecibo = (estado.meta.folioRecibo || 0) + 1;
      r.folio = estado.meta.folioRecibo;
      r.registrado = new Date().toISOString();
      estado.recibos.unshift(r);
      estado.meta.demo = false;
      guardar();
      return r;
    },
    recibo: function (id) {
      var r = estado.recibos || [];
      for (var i = 0; i < r.length; i++) if (r[i].id === id) return r[i];
      return null;
    },
    borrarRecibo: function (id) {
      var r = this.recibo(id);
      if (r) {
        // las imagenes viven aparte: hay que soltarlas a mano
        if (r.firmaId) CC.Archivos.borrar(r.firmaId);
        if (r.fotoId) CC.Archivos.borrar(r.fotoId);
      }
      estado.recibos = estado.recibos.filter(function (x) { return x.id !== id; });
      guardar();
    },

    pago: function (id) {
      var p = estado.pagos;
      for (var i = 0; i < p.length; i++) if (p[i].id === id) return p[i];
      return null;
    },

    /* --- convenios de pago en parcialidades --- */
    agregarConvenio: function (c) {
      c.id = nuevoId('cnv');
      estado.meta.folioConvenio = (estado.meta.folioConvenio || 0) + 1;
      c.folio = estado.meta.folioConvenio;
      c.estado = 'activo';
      c.registrado = new Date().toISOString();
      estado.convenios.unshift(c);
      estado.meta.demo = false;
      guardar();
      return c;
    },
    convenio: function (id) {
      var l = estado.convenios || [];
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    actualizarConvenio: function (id, cambios) {
      var c = this.convenio(id);
      if (c) { Object.assign(c, cambios); estado.meta.demo = false; guardar(); }
      return c;
    },

    /* --- avisos de adeudo mandados a cada casa (WhatsApp o correo) --- */
    registrarAvisoAdeudo: function (a) {
      a.id = nuevoId('ava');
      a.fecha = a.fecha || new Date().toISOString();
      estado.avisosAdeudo.unshift(a);
      estado.meta.demo = false;
      guardar();
      return a;
    },

    /* --- caja chica: el efectivo que maneja la administración --- */
    agregarMovCaja: function (m) {
      m.id = nuevoId('caj');
      estado.meta.folioCaja = (estado.meta.folioCaja || 0) + 1;
      m.folio = estado.meta.folioCaja;
      m.registrado = new Date().toISOString();
      estado.cajaChica.push(m);
      estado.meta.demo = false;
      guardar();
      return m;
    },
    movCaja: function (id) {
      var l = estado.cajaChica || [];
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    borrarMovCaja: function (id) {
      var m = this.movCaja(id);
      if (!m) return;
      if (m.firmaId) CC.Archivos.borrar(m.firmaId);
      if (m.fotoId) CC.Archivos.borrar(m.fotoId);
      // la reposición también salió de la cuenta del condominio como gasto
      if (m.gastoId) estado.gastos = estado.gastos.filter(function (g) { return g.id !== m.gastoId; });
      estado.cajaChica = estado.cajaChica.filter(function (x) { return x.id !== id; });
      guardar();
    },

    /* --- reservas de áreas comunes (canchas) --- */
    agregarReserva: function (r) {
      r.id = nuevoId('res');
      r.estado = 'confirmada';
      r.registrado = new Date().toISOString();
      estado.reservas.push(r);
      estado.meta.demo = false;
      guardar();
      return r;
    },
    reserva: function (id) {
      var l = estado.reservas || [];
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    cancelarReserva: function (id, motivo) {
      var r = this.reserva(id);
      if (r) { r.estado = 'cancelada'; r.motivo = motivo || ''; r.cancelada = new Date().toISOString(); guardar(); }
      return r;
    },
    /* --- registro de visitas en la caseta --- */
    agregarVisita: function (v) {
      v.id = nuevoId('vis');
      v.registrado = new Date().toISOString();
      estado.visitas.push(v);
      estado.meta.demo = false;
      guardar();
      return v;
    },
    actualizarVisita: function (id, cambios) {
      var l = estado.visitas || [];
      for (var i = 0; i < l.length; i++) {
        if (l[i].id === id) { Object.assign(l[i], cambios); break; }
      }
      estado.meta.demo = false;
      guardar();
    },

    guardarAmenidades: function (lista) {
      estado.amenidades = lista;
      estado.meta.demo = false;
      guardar();
    },

    /* --- cuentas: banco y caja chica --- */
    actualizarCuenta: function (id, cambios) {
      var c = buscar(estado.cuentas, id);
      if (c) { cambiarConHistorial(c, cambios); estado.meta.demo = false; guardar(); }
      return c;
    },
    agregarTraspaso: function (t) {
      t.id = nuevoId('tra');
      estado.meta.folioTraspaso = (estado.meta.folioTraspaso || 0) + 1;
      t.folio = estado.meta.folioTraspaso;
      t.periodo = String(t.fecha).slice(0, 7);
      t.registrado = new Date().toISOString();
      estado.traspasos.push(t);
      estado.meta.demo = false;
      guardar();
      return t;
    },
    editarTraspaso: function (id, cambios) {
      var t = buscar(estado.traspasos, id);
      if (!t) return null;
      if (cambios.fecha) cambios.periodo = String(cambios.fecha).slice(0, 7);
      if (cambiarConHistorial(t, cambios)) { estado.meta.demo = false; guardar(); }
      return t;
    },
    cancelarTraspaso: function (id) {
      var t = buscar(estado.traspasos, id);
      if (!t) return;
      cambiarConHistorial(t, { cancelado: true });
      estado.meta.demo = false;
      guardar();
    },
    agregarIngreso: function (i) {
      i.id = nuevoId('ing');
      estado.meta.folioIngreso = (estado.meta.folioIngreso || 0) + 1;
      i.folio = estado.meta.folioIngreso;
      i.periodo = String(i.fecha).slice(0, 7);
      i.registrado = new Date().toISOString();
      estado.ingresos.push(i);
      estado.meta.demo = false;
      guardar();
      return i;
    },
    cancelarIngreso: function (id) {
      var i = buscar(estado.ingresos, id);
      if (!i) return;
      cambiarConHistorial(i, { cancelado: true });
      estado.meta.demo = false;
      guardar();
    },
    agregarArqueo: function (a) {
      a.id = nuevoId('arq');
      a.registrado = new Date().toISOString();
      estado.arqueos.unshift(a);
      estado.meta.demo = false;
      guardar();
      return a;
    },

    /* --- notas en la bitacora de una unidad --- */
    agregarNota: function (n) {
      n.id = nuevoId('not');
      n.fecha = n.fecha || new Date().toISOString().slice(0, 10);
      estado.notas.unshift(n);
      estado.meta.demo = false;
      guardar();
      return n;
    },
    borrarNota: function (id) {
      estado.notas = estado.notas.filter(function (n) { return n.id !== id; });
      guardar();
    },

    /* --- difusiones enviadas a los residentes --- */
    agregarDifusion: function (d) {
      d.id = nuevoId('dif');
      d.enviada = new Date().toISOString();
      estado.difusiones.unshift(d);
      estado.meta.demo = false;
      guardar();
      return d;
    },
    borrarDifusion: function (id) {
      estado.difusiones = estado.difusiones.filter(function (d) { return d.id !== id; });
      guardar();
    },

    /* --- expediente del condominio --- */
    agregarDocumento: function (d) {
      d.id = nuevoId('doc');
      estado.documentos.unshift(d);
      estado.meta.demo = false;
      guardar();
      return d;
    },
    borrarDocumento: function (id) {
      var lista = estado.documentos || [];
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id && lista[i].fotoId) CC.Archivos.borrar(lista[i].fotoId);
      }
      estado.documentos = lista.filter(function (d) { return d.id !== id; });
      guardar();
    },

    /* --- reglamento interno --- */
    actualizarReglamento: function (cambios) {
      Object.assign(estado.reglamento, cambios);
      estado.meta.demo = false;
      guardar();
    },
    agregarCapitulo: function (nombre) {
      estado.reglamento.capitulos.push({ nombre: nombre, articulos: [] });
      estado.meta.demo = false;
      guardar();
    },
    borrarCapitulo: function (i) {
      estado.reglamento.capitulos.splice(i, 1);
      guardar();
    },
    guardarCapitulo: function (i, nombre, articulos) {
      var cap = estado.reglamento.capitulos[i];
      if (!cap) return;
      cap.nombre = nombre;
      cap.articulos = articulos;
      estado.meta.demo = false;
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
      estado = migrar(CC.Seed.vacio(datosCondominio));
      driver.escribir(estado);
      emitir();
    },
    restaurarEjemplo: function () {
      estado = migrar(CC.Seed.construir());
      driver.escribir(estado);
      emitir();
    },
    exportar: function () { return JSON.stringify(estado, null, 2); },
    importar: function (texto) {
      var datos = JSON.parse(texto);
      if (!datos || datos.version !== 1 || !Array.isArray(datos.unidades)) {
        throw new Error('El archivo no tiene el formato de Cuota Clara.');
      }
      estado = migrar(datos);
      driver.escribir(estado);
      emitir();
    },
    /* --- usuarios, bitácora, cierre de mes y entrega-recepción --- */
    usuarios: function () { return estado.usuarios || []; },
    usuario: function (id) { return buscar(estado.usuarios, id); },
    agregarUsuario: function (u) {
      u.id = u.id || nuevoId('usr');
      u.activo = true;
      u.creado = new Date().toISOString();
      estado.usuarios.push(u);
      estado.meta.demo = false;
      guardar();
      return u;
    },
    /** Cambiar la contraseña, el papel o dar de baja. Un usuario nunca se borra: queda en la bitácora. */
    actualizarUsuario: function (id, cambios) {
      var u = buscar(estado.usuarios, id);
      if (u) { Object.assign(u, cambios); guardar(); }
      return u;
    },
    bitacora: function () { return estado.bitacora || []; },
    /** Una línea en la bitácora sin más cambio (entrar, salir, bajar el acta de entrega). */
    anotar: function (accion, detalle) {
      if (!estado) return;
      estado.bitacora.push({ fecha: new Date().toISOString(), por: quien(), accion: accion, detalle: detalle || '' });
      driver.escribir(estado);
    },

    cierres: function () { return estado.cierres || []; },
    mesCerrado: function (periodo) { return mesCerrado(periodo); },
    /** El cierre vigente de un mes (null si está abierto). */
    cierre: function (periodo) {
      return (estado.cierres || []).filter(function (c) { return c.periodo === periodo && !c.reabierto; })[0] || null;
    },
    cerrarMes: function (periodo, datos) {
      var c = Object.assign({ id: nuevoId('cie'), periodo: periodo, fecha: new Date().toISOString(), por: quien() }, datos || {});
      estado.cierres.push(c);
      estado.meta.demo = false;
      guardar();
      return c;
    },
    reabrirMes: function (periodo, motivo) {
      var c = this.cierre(periodo);
      if (!c) return null;
      c.reabierto = { fecha: new Date().toISOString(), por: quien(), motivo: motivo || '' };
      guardar();
      return c;
    },
    entregas: function () { return estado.entregas || []; },
    agregarEntrega: function (e) {
      e.id = nuevoId('ent');
      e.fecha = e.fecha || new Date().toISOString();
      e.por = quien();
      estado.entregas.push(e);
      estado.meta.demo = false;
      guardar();
      return e;
    },
    /** Los pasos del arranque que ya se hicieron (Primeros pasos). */
    marcarArranque: function (paso, valor) {
      estado.meta.arranque = estado.meta.arranque || {};
      estado.meta.arranque[paso] = valor === undefined ? new Date().toISOString() : valor;
      guardar();
    },
    nuevoId: nuevoId
  };

  envolver(api);
  return api;
})();
