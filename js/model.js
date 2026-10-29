/* model.js — reglas del condominio.
 *
 * Aquí vive toda la aritmética: indiviso, cuotas, antigüedad de saldos,
 * recargos, caja y fondo de reserva. Las vistas solo preguntan y pintan;
 * ninguna hace cuentas por su cuenta.
 */
window.CC = window.CC || {};

CC.Model = (function () {

  function suma(lista, campo) {
    var t = 0;
    for (var i = 0; i < lista.length; i++) t += Number(lista[i][campo]) || 0;
    return t;
  }

  /* ---------- Índice por casa ----------
     Con 150 casas y cuatro periodos hay cientos de cargos y pagos. Recorrer
     las listas completas para cada casa se vuelve lento, así que se agrupan
     una sola vez y el índice se tira cuando algo cambia. */
  var _idx = null;

  function indice() {
    if (_idx) return _idx;
    var cargos = {}, pagos = {};

    CC.Store.cargos().forEach(function (c) {
      (cargos[c.unidadId] = cargos[c.unidadId] || []).push(c);
    });
    CC.Store.pagos().forEach(function (p) {
      (pagos[p.unidadId] = pagos[p.unidadId] || []).push(p);
    });

    // El orden importa: los pagos se aplican a los cargos más viejos primero
    Object.keys(cargos).forEach(function (k) {
      cargos[k].sort(function (a, b) {
        if (a.periodo !== b.periodo) return a.periodo < b.periodo ? -1 : 1;
        return a.tipo === 'cuota' ? -1 : 1;
      });
    });
    Object.keys(pagos).forEach(function (k) {
      pagos[k].sort(function (a, b) { return (a.fecha || '') < (b.fecha || '') ? -1 : 1; });
    });

    _idx = { cargos: cargos, pagos: pagos };
    return _idx;
  }

  if (CC.Store && CC.Store.alCambiar) {
    CC.Store.alCambiar(function () { _idx = null; });
  }

  /* ---------- Casas, indiviso y cuota ---------- */

  function totalM2() {
    var u = CC.Store.unidades(), t = 0;
    for (var i = 0; i < u.length; i++) t += Number(u[i].m2) || 0;
    return t;
  }

  /** Porcentaje de indiviso como fraccion (0.0597 = 5.97%). */
  function indiviso(unidad) {
    var t = totalM2();
    if (!t) return 0;
    return (Number(unidad.m2) || 0) / t;
  }

  /** Cuota mensual: la captura manual manda; si no, se prorratea por indiviso. */
  function cuota(unidad) {
    if (unidad.cuotaOverride !== null && unidad.cuotaOverride !== undefined && unidad.cuotaOverride !== '') {
      return Number(unidad.cuotaOverride) || 0;
    }
    return Math.round(indiviso(unidad) * (Number(CC.Store.condominio().presupuestoMensual) || 0));
  }

  /** Suma de las cuotas de todas las casas: el ingreso esperado del mes. */
  function cuotaTotal() {
    return CC.Store.unidades().reduce(function (a, u) { return a + cuota(u); }, 0);
  }

  /** Los egresos que cuentan: los cancelados conservan su folio pero no suman. */
  function gastosVigentes() {
    return CC.Store.gastos().filter(function (g) { return g.estado !== 'cancelado'; });
  }

  /* ---------- Periodos ---------- */

  /** Todos los periodos con movimiento, más el mes en curso, del más nuevo al más viejo. */
  function periodos() {
    var set = {};
    CC.Store.cargos().forEach(function (c) { set[c.periodo] = 1; });
    CC.Store.gastos().forEach(function (g) { set[g.periodo] = 1; });
    CC.Store.pagos().forEach(function (p) { set[p.periodo] = 1; set[CC.per.de(p.fecha)] = 1; });
    set[CC.per.hoy()] = 1;
    return Object.keys(set).sort().reverse();
  }

  /* ---------- Estado de cuenta por unidad ---------- */

  /**
   * Aplica los pagos a los cargos en orden cronológico (lo más viejo primero).
   * Es la forma en que se cobra en la práctica y permite saber, cargo por
   * cargo, que quedo pendiente y desde cuando.
   */
  function aplicacion(unidadId, hasta) {
    var tope = hasta || CC.per.hoy();
    var ix = indice();

    // Ya vienen ordenados del índice: solo hay que recortar al periodo
    var cargos = (ix.cargos[unidadId] || []).filter(function (c) { return c.periodo <= tope; });
    var pagos = (ix.pagos[unidadId] || []).filter(function (p) { return p.periodo <= tope; });

    var bolsa = suma(pagos, 'monto');
    var lineas = cargos.map(function (c) {
      var cubierto = Math.min(bolsa, c.monto);
      bolsa -= cubierto;
      return { cargo: c, cubierto: cubierto, pendiente: c.monto - cubierto };
    });

    return {
      lineas: lineas,
      pagos: pagos,
      cargado: suma(cargos, 'monto'),
      pagado: suma(pagos, 'monto'),
      saldo: suma(cargos, 'monto') - suma(pagos, 'monto'),
      aFavor: bolsa   // pago de más: queda como saldo a favor
    };
  }

  /** Resumen de cobranza de una unidad: saldo, antigüedad, recargo y estado. */
  function situacion(unidadId, hasta) {
    var tope = hasta || CC.per.hoy();
    var ap = aplicacion(unidadId, tope);
    var cond = CC.Store.condominio();
    var hoyISO = CC.per.hoyISO();

    var vencidos = ap.lineas.filter(function (l) {
      return l.pendiente > 0.005 && String(l.cargo.fechaVence) <= hoyISO;
    });

    var mesesSet = {};
    vencidos.forEach(function (l) { mesesSet[l.cargo.periodo] = 1; });
    var mesesVencidos = Object.keys(mesesSet).length;
    var masViejo = Object.keys(mesesSet).sort()[0] || null;

    var tasa = cond.recargoModo === 'porcentaje' || !cond.recargoModo ? (Number(cond.tasaMoraMensual) || 0) / 100 : 0;
    var recargo = vencidos.reduce(function (a, l) {
      var meses = Math.max(0, CC.per.dif(l.cargo.periodo, tope));
      return a + l.pendiente * tasa * meses;
    }, 0);

    var montoVencido = vencidos.reduce(function (a, l) { return a + l.pendiente; }, 0);
    var venceMasViejo = vencidos.reduce(function (a, l) {
      return !a || l.cargo.fechaVence < a ? l.cargo.fechaVence : a;
    }, null);
    var todos = indice().pagos[unidadId] || [];
    var ultimo = todos.length ? todos[todos.length - 1] : null;

    var estado = 'corriente';
    if (ap.saldo > 0.005) estado = mesesVencidos >= 2 ? 'moroso' : (mesesVencidos === 1 ? 'vencido' : 'corriente');

    return {
      saldo: ap.saldo,
      aFavor: ap.aFavor,
      cargado: ap.cargado,
      pagado: ap.pagado,
      vencido: montoVencido,
      mesesVencidos: mesesVencidos,
      desde: masViejo,
      venceMasViejo: venceMasViejo,
      ultimoPago: ultimo,
      recargo: Math.round(recargo * 100) / 100,
      estado: estado,
      lineas: ap.lineas,
      pagos: ap.pagos
    };
  }

  var ETIQUETA_ESTADO = {
    corriente: { texto: 'Al corriente', clase: 'pill--good' },
    vencido: { texto: 'Vencido', clase: 'pill--warn' },
    moroso: { texto: 'Moroso', clase: 'pill--crit' }
  };

  /** Todas las casas con su situación, listas para tabla. */
  function padron(hasta) {
    return CC.Store.unidades().map(function (u) {
      var s = situacion(u.id, hasta);
      return {
        unidad: u,
        cuota: cuota(u),
        indiviso: indiviso(u),
        situacion: s
      };
    }).sort(ordenCasas);
  }

  /** Ordena por calle y luego por número: "Fresnos 2" antes que "Fresnos 10". */
  function ordenCasas(a, b) {
    var ua = a.unidad || a, ub = b.unidad || b;
    var ca = ua.calle || '', cb = ub.calle || '';
    if (ca !== cb) return ca < cb ? -1 : 1;
    var na = Number(ua.numero), nb = Number(ub.numero);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return (ua.clave || '') < (ub.clave || '') ? -1 : 1;
  }

  /* ---------- Resumen financiero del periodo ---------- */

  function resumen(periodo) {
    var p = periodo || CC.per.hoy();

    // lo esperado son las cuotas del mes; los recargos se cobran, pero no se presupuestan
    var cargosP = CC.Store.cargos().filter(function (c) { return c.periodo === p && c.tipo !== 'recargo'; });
    var pagosP = CC.Store.pagos().filter(function (x) { return x.periodo === p; });
    var gastosP = gastosVigentes().filter(function (g) { return g.periodo === p; });

    var esperado = suma(cargosP, 'monto');
    var cobrado = suma(pagosP, 'monto');
    var egresos = suma(gastosP, 'monto');
    var egresosPagados = suma(gastosP.filter(function (g) { return g.estado === 'pagado'; }), 'monto');

    var pad = padron(p);
    var morosos = pad.filter(function (r) { return r.situacion.estado !== 'corriente'; });
    var carteraVencida = pad.reduce(function (a, r) { return a + Math.max(0, r.situacion.vencido); }, 0);

    return {
      periodo: p,
      esperado: esperado,
      cobrado: cobrado,
      porCobrar: Math.max(0, esperado - cobrado),
      cobranzaPct: esperado > 0 ? cobrado / esperado : 0,
      egresos: egresos,
      egresosPagados: egresosPagados,
      egresosPendientes: egresos - egresosPagados,
      resultado: cobrado - egresosPagados,
      resultadoDevengado: esperado - egresos,
      presupuestoEgresos: CC.Store.categorias().reduce(function (a, c) { return a + (Number(c.presupuesto) || 0); }, 0),
      morosos: morosos.length,
      carteraVencida: carteraVencida,
      unidades: pad.length
    };
  }

  /** Dinero del condominio al cierre del periodo: banco más caja chica. */
  function caja(hasta) {
    var fin = CC.per.vence(hasta || CC.per.hoy(), 31);
    return CC.Store.cuentas().reduce(function (a, c) { return a + saldoCuenta(c.id, fin); }, 0);
  }

  /** Parte del saldo en caja que corresponde al fondo de reserva. */
  function fondoReserva(hasta) {
    var tope = hasta || CC.per.hoy();
    var pct = (Number(CC.Store.condominio().fondoReservaPct) || 0) / 100;
    var cobrado = suma(CC.Store.pagos().filter(function (p) { return p.periodo <= tope; }), 'monto');
    return cobrado * pct;
  }

  /** Egresos del periodo agrupados por categoria, contra su presupuesto. */
  function porCategoria(periodo) {
    var p = periodo || CC.per.hoy();
    var mapa = {};
    CC.Store.categorias().forEach(function (c) {
      mapa[c.nombre] = { categoria: c.nombre, monto: 0, presupuesto: Number(c.presupuesto) || 0, pendiente: 0 };
    });
    gastosVigentes().filter(function (g) { return g.periodo === p; }).forEach(function (g) {
      if (!mapa[g.categoria]) mapa[g.categoria] = { categoria: g.categoria, monto: 0, presupuesto: 0, pendiente: 0 };
      mapa[g.categoria].monto += Number(g.monto) || 0;
      if (g.estado !== 'pagado') mapa[g.categoria].pendiente += Number(g.monto) || 0;
    });
    return Object.keys(mapa).map(function (k) { return mapa[k]; })
      .filter(function (x) { return x.monto > 0 || x.presupuesto > 0; })
      .sort(function (a, b) { return b.monto - a.monto; });
  }

  /** Serie mensual de ingresos y egresos, para la grafica de reportes. */
  function serie(hasta, n) {
    return CC.per.ultimos(hasta || CC.per.hoy(), n || 6).map(function (p) {
      var r = resumen(p);
      return { periodo: p, ingresos: r.cobrado, egresos: r.egresos, esperado: r.esperado };
    });
  }

  /* ---------- Generacion de cuotas del mes ---------- */

  /** Casas a las que todavía no se les ha generado la cuota del periodo. */
  function faltanCuota(periodo) {
    var conCuota = {};
    CC.Store.cargos().forEach(function (c) {
      if (c.periodo === periodo && c.tipo === 'cuota') conCuota[c.unidadId] = 1;
    });
    return CC.Store.unidades().filter(function (u) { return !conCuota[u.id]; });
  }

  /** Construye (sin guardar) los cargos de cuota faltantes del periodo. */
  function proyectarCuotas(periodo) {
    var cond = CC.Store.condominio();
    var vence = CC.per.vence(periodo, cond.diaVencimiento);
    return faltanCuota(periodo).map(function (u) {
      return {
        unidadId: u.id, periodo: periodo, tipo: 'cuota',
        concepto: 'Cuota de mantenimiento ' + CC.fmt.periodo(periodo),
        monto: cuota(u), fechaVence: vence
      };
    });
  }

  /* ---------- Texto de recordatorio para WhatsApp ---------- */

  function recordatorio(unidadId, periodo) {
    var u = CC.Store.unidad(unidadId);
    var s = situacion(unidadId, periodo);
    var c = CC.Store.condominio();
    var quien = (u.inquilino || u.propietario || '').split(' ')[0];
    var total = s.saldo + s.recargo;

    var l = [];
    l.push('Hola ' + quien + ', le escribimos de la administración de ' + c.nombre + '.');
    l.push('');
    l.push('Estado de cuenta de la casa ' + u.clave + ' al ' + CC.fmt.fecha(CC.per.hoyISO()) + ':');
    l.push('• Saldo pendiente: ' + CC.fmt.money2(s.saldo));
    if (s.mesesVencidos > 0) {
      l.push('• Meses vencidos: ' + s.mesesVencidos + ' (desde ' + CC.fmt.periodo(s.desde) + ')');
    }
    if (s.recargo > 0) {
      l.push('• Recargo por mora (' + c.tasaMoraMensual + '% mensual): ' + CC.fmt.money2(s.recargo));
      l.push('• Total a pagar: ' + CC.fmt.money2(total));
    }
    l.push('');
    if (c.cuenta) {
      l.push('Puede pagar por transferencia a: ' + c.cuenta);
      l.push('Al hacerlo, por favor envíenos el comprobante para aplicarlo el mismo día.');
    }
    l.push('');
    l.push('Gracias, ' + (c.administrador || 'Administración') + '.');
    return l.join('\n');
  }

  /* ---------- Recibo de cada pago ---------- */

  /** Cómo se repartió cada pago de una casa entre sus cargos (lo más viejo primero). */
  function repartoPagos(unidadId) {
    var ix = indice();
    var cargos = (ix.cargos[unidadId] || []).map(function (c) {
      return { cargo: c, resta: Number(c.monto) || 0 };
    });
    var k = 0, salida = {};
    (ix.pagos[unidadId] || []).forEach(function (p) {
      var bolsa = Number(p.monto) || 0, lineas = [];
      while (bolsa > 0.005 && k < cargos.length) {
        var c = cargos[k];
        var toma = Math.min(bolsa, c.resta);
        if (toma > 0.005) {
          lineas.push({
            concepto: c.cargo.concepto, periodo: c.cargo.periodo, monto: toma,
            tipo: c.cargo.tipo, cargoId: c.cargo.id,
            completo: toma >= (Number(c.cargo.monto) || 0) - 0.005,
            liquida: c.resta - toma <= 0.005
          });
        }
        c.resta -= toma;
        bolsa -= toma;
        if (c.resta <= 0.005) k++;
      }
      salida[p.id] = { lineas: lineas, aFavor: bolsa };
    });
    return salida;
  }

  /** Todo lo que lleva el recibo de un pago: a qué se aplicó y cómo quedó la casa. */
  function datosRecibo(pagoId) {
    var p = CC.Store.pago(pagoId);
    if (!p) return null;
    var ix = indice();
    var rep = repartoPagos(p.unidadId)[p.id] || { lineas: [], aFavor: 0 };
    var tope = p.periodo > CC.per.de(p.fecha) ? p.periodo : CC.per.de(p.fecha);
    var cargado = suma((ix.cargos[p.unidadId] || []).filter(function (c) { return c.periodo <= tope; }), 'monto');
    var pagado = 0, lista = ix.pagos[p.unidadId] || [];
    for (var i = 0; i < lista.length; i++) {
      pagado += Number(lista[i].monto) || 0;
      if (lista[i].id === p.id) break;
    }
    var cv = p.convenioId ? CC.Store.convenio(p.convenioId) : null;
    return {
      pago: p,
      unidad: CC.Store.unidad(p.unidadId),
      lineas: rep.lineas,
      aFavor: rep.aFavor,
      saldoDespues: Math.round((cargado - pagado) * 100) / 100,
      convenio: cv ? estadoConvenio(cv) : null
    };
  }

  /* ---------- Convenios de pago en parcialidades ---------- */

  /** Fechas y montos de cada parcialidad. La última absorbe los centavos. */
  function planConvenio(cv) {
    var n = Math.max(1, Number(cv.parcialidades) || 1);
    var monto = Number(cv.monto) || 0, plan = [];
    for (var i = 0; i < n; i++) {
      plan.push({
        n: i + 1,
        fecha: cv.cada === 'quincena' ? CC.per.masDias(cv.primera, 15 * i) : CC.per.masMeses(cv.primera, i),
        monto: i === n - 1 ? Math.round(((Number(cv.adeudo) || 0) - monto * (n - 1)) * 100) / 100 : monto
      });
    }
    return plan;
  }

  /** Cuántas parcialidades van cubiertas con los pagos marcados para el convenio. */
  function estadoConvenio(cv) {
    var plan = planConvenio(cv), hoy = CC.per.hoyISO();
    var pagos = (indice().pagos[cv.unidadId] || []).filter(function (p) { return p.convenioId === cv.id; });
    var pagado = suma(pagos, 'monto'), acum = 0, pagadas = 0, atrasadas = 0, siguiente = null;
    plan.forEach(function (x) {
      acum += x.monto;
      x.cubierta = pagado >= acum - 0.005;
      x.vencida = !x.cubierta && x.fecha < hoy;
      if (x.cubierta) pagadas++;
      else {
        if (!siguiente) siguiente = x;
        if (x.vencida) atrasadas++;
      }
    });
    var estado = cv.estado === 'cancelado' ? 'cancelado'
      : pagadas === plan.length ? 'cumplido' : atrasadas ? 'atrasado' : 'al dia';
    return {
      convenio: cv, plan: plan, pagos: pagos, pagado: pagado,
      pagadas: pagadas, atrasadas: atrasadas, siguiente: siguiente,
      resta: Math.max(0, (Number(cv.adeudo) || 0) - pagado),
      estado: estado
    };
  }

  /** El convenio vigente de una casa (ni cancelado ni cumplido), o null. */
  function convenioDe(unidadId) {
    var lista = CC.Store.convenios();
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].unidadId !== unidadId || lista[i].estado === 'cancelado') continue;
      var e = estadoConvenio(lista[i]);
      if (e.estado !== 'cumplido') return e;
    }
    return null;
  }

  var ETIQUETA_CONVENIO = {
    'al dia': { texto: 'Al día', clase: 'pill--good' },
    atrasado: { texto: 'Atrasado', clase: 'pill--crit' },
    cumplido: { texto: 'Cumplido', clase: 'pill--good' },
    cancelado: { texto: 'Cancelado', clase: 'pill--mute' }
  };

  /* ---------- Adeudos y avisos ---------- */

  /** Casas con algo vencido, de la que dejó de pagar hace más tiempo a la más reciente. */
  function deudores(periodo) {
    return padron(periodo).filter(function (x) { return x.situacion.vencido > 0.005; })
      .sort(function (a, b) {
        var da = a.situacion.venceMasViejo || '', db = b.situacion.venceMasViejo || '';
        if (da !== db) return da < db ? -1 : 1;
        return b.situacion.saldo - a.situacion.saldo;
      });
  }

  function avisosDe(unidadId) {
    return CC.Store.avisosAdeudo().filter(function (a) { return a.unidadId === unidadId; })
      .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
  }

  function ultimoAviso(unidadId) { return avisosDe(unidadId)[0] || null; }

  /**
   * A quién le toca aviso hoy: debe algo vencido desde hace más de los días de
   * gracia, no está al día en un convenio y no se le avisó en los últimos días.
   */
  function porAvisar(periodo) {
    var c = CC.Store.condominio();
    var gracia = Number(c.avisoDiasTras);
    if (isNaN(gracia)) gracia = 3;
    var cada = Number(c.avisoRepetirDias) || 7;
    var hoy = CC.per.hoyISO();
    return deudores(periodo).filter(function (x) {
      var s = x.situacion;
      if (!s.venceMasViejo || CC.per.masDias(s.venceMasViejo, gracia) > hoy) return false;
      var cv = convenioDe(x.unidad.id);
      if (cv && cv.estado === 'al dia') return false;
      var ult = ultimoAviso(x.unidad.id);
      return !ult || CC.per.diasEntre(ult.fecha, hoy) >= cada;
    });
  }

  /** El mensaje de adeudo de una casa, con su saldo real. Sirve para WhatsApp y correo. */
  function avisoAdeudo(unidadId, periodo) {
    var u = CC.Store.unidad(unidadId);
    var s = situacion(unidadId, periodo);
    var c = CC.Store.condominio();
    var cv = convenioDe(unidadId);
    var quien = (u.inquilino || u.propietario || '').split(' ')[0];
    var hoy = CC.per.hoyISO();

    var l = [];
    l.push('Hola ' + quien + ', buen día. Le escribimos de la administración de ' + c.nombre + '.');
    l.push('');
    if (cv && cv.siguiente) {
      l.push('Le recordamos la parcialidad ' + cv.siguiente.n + ' de ' + cv.plan.length +
        ' de su convenio de pago de la casa ' + u.clave + ': ' + CC.fmt.money2(cv.siguiente.monto) +
        ', con fecha del ' + CC.fmt.fecha(cv.siguiente.fecha) + '.');
      l.push('Lleva ' + cv.pagadas + ' de ' + cv.plan.length + ' parcialidades cubiertas.');
    } else {
      l.push('Según nuestros registros, la casa ' + u.clave + ' tiene pendiente:');
      l.push('');
      pendientesPorMes(unidadId, periodo).forEach(function (m) {
        l.push('• ' + CC.fmt.periodo(m.periodo) + ': ' + CC.fmt.money2(m.total) +
          (m.partes.length > 1 ? ' (' + m.partes.map(function (x) {
            return x.etiqueta + ' ' + CC.fmt.money2(x.monto);
          }).join(' + ') + ')' : ''));
      });
      l.push('');
      l.push('Total al ' + CC.fmt.fecha(hoy) + ': ' + CC.fmt.money2(s.saldo));
      if (s.ultimoPago) {
        l.push('Último pago registrado: ' + CC.fmt.fecha(s.ultimoPago.fecha) + ', por ' + CC.fmt.money2(s.ultimoPago.monto));
      }
    }
    l.push('');
    if (c.cuenta) {
      l.push('Puede pagar por transferencia a: ' + c.cuenta);
      l.push('Al pagar, mándenos su comprobante y le enviamos su recibo.');
    }
    if (!cv && s.mesesVencidos >= 2) {
      l.push('Si le ayuda, podemos hacer un convenio para pagarlo en parcialidades.');
    }
    l.push('Si ya pagó, por favor ignore este mensaje y disculpe la molestia.');
    l.push('');
    l.push('Atentamente, ' + (c.administrador || 'la administración') + '.');
    return l.join('\n');
  }

  function asuntoAviso(unidadId) {
    var u = CC.Store.unidad(unidadId);
    return 'Aviso de adeudo · Casa ' + (u ? u.clave : '') + ' · ' + CC.Store.condominio().nombre;
  }

  /* ---------- Caja chica ---------- */

  /** Movimientos en orden, cada uno con el saldo que dejó. */
  function cajaChica() {
    var movs = CC.Store.cajaChica().slice().sort(function (a, b) {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
      return (a.folio || 0) - (b.folio || 0);
    });
    var saldo = 0;
    var filas = movs.map(function (m) {
      saldo += (m.tipo === 'egreso' ? -1 : 1) * (Number(m.monto) || 0);
      return { mov: m, saldo: Math.round(saldo * 100) / 100 };
    });
    return {
      filas: filas,
      saldo: Math.round(saldo * 100) / 100,
      fondo: Number(CC.Store.condominio().fondoCajaChica) || 0
    };
  }

  /* ---------- Reservas de áreas comunes ---------- */

  function aMin(hhmm) { var a = String(hhmm || '0:0').split(':'); return Number(a[0]) * 60 + Number(a[1] || 0); }
  function aHora(min) { return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }

  /** Horas en que se puede empezar a jugar: de la apertura a una hora antes del cierre. */
  function horasDe(a) {
    var out = [];
    for (var m = aMin(a.abre || '07:00'); m + 60 <= aMin(a.cierra || '22:00'); m += 60) out.push(aHora(m));
    return out;
  }

  /** Reservas confirmadas de un día (y de un área, si se indica), en orden de hora. */
  function reservasDel(fecha, amenidadId) {
    return CC.Store.reservas().filter(function (r) {
      return r.estado !== 'cancelada' && r.fecha === fecha && (!amenidadId || r.amenidadId === amenidadId);
    }).sort(function (a, b) { return a.hora < b.hora ? -1 : 1; });
  }

  /** La reserva que ocupa esa hora en esa área, o null. */
  function ocupada(amenidadId, fecha, hora) {
    var m = aMin(hora);
    var l = reservasDel(fecha, amenidadId);
    for (var i = 0; i < l.length; i++) {
      var ini = aMin(l[i].hora), fin = ini + 60 * (Number(l[i].horas) || 1);
      if (m >= ini && m < fin) return l[i];
    }
    return null;
  }

  /**
   * Revisa una reserva contra las reglas del área. Devuelve el motivo por el que
   * no se puede, en palabras para el vecino, o null si se puede.
   */
  function validarReserva(r) {
    var a = CC.Store.amenidad(r.amenidadId);
    if (!a) return 'Elige la cancha.';
    var u = CC.Store.unidad(r.unidadId);
    if (!u) return 'Elige la casa.';
    var horas = Number(r.horas) || 1;
    var ini = aMin(r.hora), fin = ini + 60 * horas;
    if (ini < aMin(a.abre || '07:00') || fin > aMin(a.cierra || '22:00')) {
      return a.nombre + ' abre de ' + (a.abre || '07:00') + ' a ' + (a.cierra || '22:00') + '.';
    }
    var hoy = CC.per.hoyISO();
    if (r.fecha < hoy) return 'Esa fecha ya pasó.';
    var dias = Number(a.anticipacionDias) || 7;
    if (CC.per.diasEntre(hoy, r.fecha) > dias) return 'Se aparta con máximo ' + dias + ' días de anticipación.';
    for (var m = ini; m < fin; m += 60) {
      var o = ocupada(a.id, r.fecha, aHora(m));
      if (o && o.id !== r.id) {
        var ou = CC.Store.unidad(o.unidadId);
        return 'A las ' + aHora(m) + ' ya está apartada' + (ou ? ' por ' + ou.clave : '') + '.';
      }
    }
    var max = Number(a.maxHorasDia) || 2;
    var yaTiene = reservasDel(r.fecha).filter(function (x) {
      return x.unidadId === r.unidadId && x.id !== r.id && (CC.Store.amenidad(x.amenidadId) || {}).tipo === a.tipo;
    }).reduce(function (t, x) { return t + (Number(x.horas) || 1); }, 0);
    if (yaTiene + horas > max) {
      return 'La casa ' + u.clave + ' ya tiene ' + yaTiene + (yaTiene === 1 ? ' hora' : ' horas') +
        ' ese día; el máximo es ' + max + '.';
    }
    var bloqueo = Number(a.mesesBloqueo) || 0;
    if (bloqueo) {
      var s = situacion(u.id);
      var cvb = convenioDe(u.id);
      if (s.mesesVencidos >= bloqueo && !(cvb && cvb.estado === 'al dia')) {
        return 'La casa ' + u.clave + ' debe ' + s.mesesVencidos + ' meses (' + CC.fmt.money2(s.saldo) +
          '). El reglamento no deja apartar con ' + bloqueo + ' meses o más de adeudo.';
      }
    }
    return null;
  }

  /** Lo que la casa tiene apartado de hoy en adelante. */
  function proximasReservas(unidadId) {
    var hoy = CC.per.hoyISO();
    return CC.Store.reservas().filter(function (r) {
      return r.estado !== 'cancelada' && r.unidadId === unidadId && r.fecha >= hoy;
    }).sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1; });
  }

  /** Mensaje de confirmación para mandarle al vecino. */
  function textoReserva(reservaId) {
    var r = CC.Store.reserva(reservaId);
    if (!r) return '';
    var u = CC.Store.unidad(r.unidadId) || {}, a = CC.Store.amenidad(r.amenidadId) || {};
    var c = CC.Store.condominio();
    var quien = (u.inquilino || u.propietario || '').split(' ')[0];
    var fin = aHora(aMin(r.hora) + 60 * (Number(r.horas) || 1));
    var dia = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long' });
    return [
      'Hola ' + quien + ', quedó apartada su ' + (a.nombre || 'cancha').toLowerCase() + ':',
      '',
      dia.charAt(0).toUpperCase() + dia.slice(1) + ' ' + CC.fmt.fechaLarga(r.fecha) + ', de ' + r.hora + ' a ' + fin + ' h.',
      'Casa ' + u.clave + '.',
      (Number(a.costo) || Number(a.deposito))
        ? 'Renta: ' + CC.fmt.money2(Number(a.costo) || 0) + (Number(a.deposito) ? ' · depósito en garantía: ' + CC.fmt.money2(a.deposito) + ' (se devuelve si el área queda en orden)' : '')
        : null,
      '',
      'Si no van a poder ir, avísenos para liberarla.',
      'Gracias, ' + (c.administrador || 'la administración') + ', ' + c.nombre + '.'
    ].filter(function (x) { return x !== null; }).join('\n');
  }

  /* ---------- Pagos adelantados y anualidad ---------- */

  /**
   * Hasta qué mes tiene cubiertas sus cuotas una casa, contando las que pagó
   * por adelantado. null si debe algo o no tiene cuotas.
   */
  function pagadoHasta(unidadId) {
    var ap = aplicacion(unidadId, '9999-12');
    var ultimo = null;
    for (var i = 0; i < ap.lineas.length; i++) {
      var l = ap.lineas[i];
      if (l.pendiente > 0.005) break;
      if (l.cargo.tipo === 'cuota') ultimo = l.cargo.periodo;
    }
    if (!ultimo) return null;
    // lo que sobra a favor alcanza para más meses
    var u = CC.Store.unidad(unidadId), c = u ? cuota(u) : 0;
    if (c > 0 && ap.aFavor >= c) ultimo = CC.per.suma(ultimo, Math.floor(ap.aFavor / c));
    return ultimo;
  }

  /**
   * Cuotas de los próximos n meses que la casa todavía no tiene generadas, para
   * pagarlas por adelantado. Con la anualidad, los últimos meses van bonificados.
   */
  function proyectarAdelanto(unidadId, n, gratis) {
    var u = CC.Store.unidad(unidadId);
    if (!u) return [];
    var cond = CC.Store.condominio();
    var tiene = {};
    (indice().cargos[unidadId] || []).forEach(function (c) { if (c.tipo === 'cuota') tiene[c.periodo] = 1; });
    var p = CC.per.hoy(), lista = [];
    while (lista.length < n) {
      if (!tiene[p]) lista.push(p);
      p = CC.per.suma(p, 1);
    }
    var monto = cuota(u);
    return lista.map(function (per, i) {
      var bonificada = i >= n - (gratis || 0);
      return {
        unidadId: u.id, periodo: per, tipo: 'cuota',
        concepto: 'Cuota de mantenimiento ' + CC.fmt.periodo(per) + (bonificada ? ' — bonificada por pago anual' : ''),
        monto: bonificada ? 0 : monto,
        fechaVence: CC.per.vence(per, cond.diaVencimiento)
      };
    });
  }

  /* ---------- Visitas ---------- */

  function visitasDel(fecha) {
    return CC.Store.visitas().filter(function (v) { return v.fecha === fecha; })
      .sort(function (a, b) { return (a.entrada || a.horaAprox || '99') < (b.entrada || b.horaAprox || '99') ? -1 : 1; });
  }
  function visitasDentro() {
    return CC.Store.visitas().filter(function (v) { return v.estado === 'dentro'; });
  }
  function visitasEsperadas(desde) {
    var hoy = desde || CC.per.hoyISO();
    return CC.Store.visitas().filter(function (v) { return v.estado === 'esperada' && v.fecha >= hoy; })
      .sort(function (a, b) { return (a.fecha + (a.horaAprox || '')) < (b.fecha + (b.horaAprox || '')) ? -1 : 1; });
  }
  function visitasDe(unidadId) {
    return CC.Store.visitas().filter(function (v) { return v.unidadId === unidadId; })
      .sort(function (a, b) { return (a.fecha + (a.entrada || '')) < (b.fecha + (b.entrada || '')) ? 1 : -1; });
  }

  /** Cuota de mantenimiento por tipo de casa, para verla de un vistazo. */
  function cuotasPorTipo() {
    var grupos = {};
    CC.Store.unidades().forEach(function (u) {
      var k = u.prototipo || 'Sin tipo';
      var c = cuota(u);
      if (!grupos[k]) grupos[k] = { tipo: k, m2: u.m2, casas: 0, total: 0, min: c, max: c };
      var g = grupos[k];
      g.casas++;
      g.total += c;
      g.min = Math.min(g.min, c);
      g.max = Math.max(g.max, c);
    });
    return Object.keys(grupos).sort().map(function (k) { return grupos[k]; });
  }


  /* ---------- Recargos por pago tardío ---------- */

  function tramos() {
    return (CC.Store.condominio().recargoTramos || [])
      .map(function (t) { return { dia: Number(t.dia) || 0, monto: Number(t.monto) || 0 }; })
      .filter(function (t) { return t.dia >= 1 && t.monto > 0; })
      .sort(function (a, b) { return a.dia - b.dia; });
  }

  /** La regla de recargos en palabras, para los avisos y el portal del vecino. */
  function textoRecargo() {
    var c = CC.Store.condominio();
    if (c.recargoModo === 'ninguno') return 'no se cobran recargos';
    if (c.recargoModo === 'tramos') {
      var t = tramos();
      if (!t.length) return 'no se cobran recargos';
      return 'si se paga después del día ' + (t[0].dia - 1) + ' hay recargo: ' + t.map(function (x, i) {
        return 'del día ' + x.dia + (t[i + 1] ? ' al ' + (t[i + 1].dia - 1) : ' en adelante') + ', ' + CC.fmt.money(x.monto);
      }).join('; ');
    }
    return 'se genera un recargo de ' + (Number(c.tasaMoraMensual) || 0) + '% mensual sobre el saldo vencido';
  }

  /** Recargo de una cuota según el día en que quedó pagada (o hoy, si sigue pendiente). */
  function recargoPara(cuota, fechaCubierta) {
    var t = tramos();
    if (!t.length) return 0;
    var ref = fechaCubierta || CC.per.hoyISO();
    var perRef = CC.per.de(ref);
    if (perRef < cuota.periodo) return 0;                 // la pagó antes de su mes
    var dia = perRef > cuota.periodo ? 99 : Number(ref.slice(8, 10));
    var monto = 0;
    t.forEach(function (x) { if (dia >= x.dia) monto = x.monto; });
    return monto;
  }

  function ordenCargos(a, b) {
    if (a.periodo !== b.periodo) return a.periodo < b.periodo ? -1 : 1;
    if (a.tipo === 'cuota' && b.tipo !== 'cuota') return -1;
    if (b.tipo === 'cuota' && a.tipo !== 'cuota') return 1;
    return 0;
  }

  /**
   * Fecha en que quedó pagado cada cargo de una casa (los pagos cubren lo más
   * viejo primero). Lo que sigue pendiente no aparece.
   */
  function coberturas(unidadId, cargosLista) {
    var cargos = (cargosLista || indice().cargos[unidadId] || []).slice().sort(ordenCargos);
    var restos = cargos.map(function (c) { return Number(c.monto) || 0; });
    var res = {}, k = 0;
    (indice().pagos[unidadId] || []).forEach(function (p) {
      var bolsa = Number(p.monto) || 0;
      while (k < cargos.length) {
        if (restos[k] <= 0.005) { res[cargos[k].id] = p.fecha; k++; continue; }
        if (bolsa <= 0.005) break;
        var toma = Math.min(bolsa, restos[k]);
        restos[k] -= toma;
        bolsa -= toma;
      }
    });
    return res;
  }

  /**
   * Los recargos que faltan o que cambiaron. Uno por cuota, nunca dos: así no
   * pasa lo de cargar el mismo recargo dos veces. Si una persona lo corrigió o
   * lo condonó, el sistema ya no lo toca.
   */
  function recargosPendientes() {
    var crear = [], actualizar = [];
    if (CC.Store.condominio().recargoModo !== 'tramos' || !tramos().length) {
      return { crear: crear, actualizar: actualizar };
    }
    var hoyP = CC.per.hoy();
    var ix = indice();
    CC.Store.unidades().forEach(function (u) {
      var lista = (ix.cargos[u.id] || []).slice();
      var deCuota = {};
      lista.forEach(function (c) { if (c.tipo === 'recargo' && c.de) deCuota[c.de] = c; });
      lista.filter(function (c) { return c.tipo === 'cuota' && Number(c.monto) > 0 && c.periodo <= hoyP; })
        .sort(ordenCargos)
        .forEach(function (cu) {
          var ex = deCuota[cu.id];
          if (ex && (ex.condonado || ex.manual)) return;
          // el recargo de un mes mueve la fecha en que se cubren los siguientes
          var monto = recargoPara(cu, coberturas(u.id, lista)[cu.id] || null);
          if (ex) {
            if (Math.abs((Number(ex.monto) || 0) - monto) > 0.005) {
              actualizar.push({ id: ex.id, monto: monto });
              lista[lista.indexOf(ex)] = Object.assign({}, ex, { monto: monto });
            }
          } else if (monto > 0) {
            var n = {
              id: CC.Store.nuevoId('rcg'), unidadId: u.id, periodo: cu.periodo, tipo: 'recargo',
              de: cu.id, auto: true, concepto: 'Recargo por pago tardío ' + CC.fmt.periodo(cu.periodo),
              monto: monto, fechaVence: cu.fechaVence
            };
            crear.push(n);
            lista.push(n);
          }
        });
    });
    return { crear: crear, actualizar: actualizar };
  }

  var aplicando = false;
  /** Pone al día los recargos. Se llama al abrir y cada vez que cambian los datos. */
  function aplicarRecargos() {
    if (aplicando) return 0;
    aplicando = true;
    try {
      var r = recargosPendientes();
      return CC.Store.sincronizarRecargos(r.crear, r.actualizar);
    } finally { aplicando = false; }
  }

  /** Lo que debe una casa, mes por mes: la cuota, su recargo y lo demás. */
  function pendientesPorMes(unidadId, hasta) {
    var s = situacion(unidadId, hasta);
    var meses = {};
    s.lineas.forEach(function (l) {
      if (l.pendiente <= 0.005) return;
      var p = l.cargo.periodo;
      if (!meses[p]) meses[p] = { periodo: p, total: 0, partes: [], cargos: [] };
      var t = l.cargo.tipo;
      meses[p].partes.push({
        etiqueta: t === 'cuota' ? 'cuota' : t === 'recargo' ? 'recargo' : t === 'extraordinaria' ? 'extraordinaria'
          : t === 'multa' ? 'multa' : t === 'casaclub' ? 'casa club' : t === 'inicial' ? 'saldo anterior' : 'otro cargo',
        monto: l.pendiente, concepto: l.cargo.concepto, tipo: t
      });
      meses[p].cargos.push(l.cargo.id);
      meses[p].total += l.pendiente;
    });
    return Object.keys(meses).sort().map(function (p) { return meses[p]; });
  }

  /* ---------- Banco y caja chica ---------- */

  function folio4(n) { return String(n || 0).padStart(4, '0'); }
  function nombreCuenta(id) { var c = CC.Store.cuenta(id); return c ? c.nombre : id; }

  /**
   * Todo lo que entró y salió de una cuenta, en orden, con el saldo que fue
   * dejando. Es lo que se compara contra el estado de cuenta del banco.
   */
  function movimientosCuenta(cuentaId) {
    var movs = [];
    var claves = {}, refs = {};
    CC.Store.unidades().forEach(function (u) { claves[u.id] = u.clave; refs[u.id] = u.referencia || ''; });

    CC.Store.pagos().forEach(function (p) {
      if ((p.cuenta || 'banco') !== cuentaId) return;
      movs.push({
        fecha: p.fecha, tipo: 'cuota', id: p.id, folio: 'P-' + folio4(p.folio),
        concepto: 'Pago casa ' + (claves[p.unidadId] || '—') + (p.metodo ? ' · ' + p.metodo : ''),
        referencia: p.referencia || '', entra: Number(p.monto) || 0, sale: 0,
        // lo que el banco suele escribir en su concepto, para reconocer el pago
        claves: [p.referencia, refs[p.unidadId], 'casa ' + (claves[p.unidadId] || '')]
      });
    });
    CC.Store.ingresos().forEach(function (i) {
      if (i.cancelado || i.cuenta !== cuentaId) return;
      movs.push({
        fecha: i.fecha, tipo: 'ingreso', id: i.id, folio: 'I-' + folio4(i.folio),
        concepto: i.concepto + (i.nombre ? ' · ' + i.nombre : ''), referencia: i.referencia || '',
        entra: Number(i.monto) || 0, sale: 0
      });
    });
    gastosVigentes().forEach(function (g) {
      if (g.estado !== 'pagado' || (g.cuenta || 'banco') !== cuentaId) return;
      movs.push({
        fecha: g.fechaPago || g.fecha, tipo: 'egreso', id: g.id, folio: 'E-' + folio4(g.folioE),
        concepto: g.concepto + (g.proveedor ? ' · ' + g.proveedor : ''), categoria: g.categoria,
        referencia: g.referencia || g.folio || '', entra: 0, sale: Number(g.monto) || 0,
        claves: [g.referencia, g.folio]
      });
    });
    CC.Store.traspasos().forEach(function (t) {
      if (t.cancelado) return;
      if (t.de === cuentaId) {
        movs.push({
          fecha: t.fecha, tipo: 'traspaso', id: t.id, folio: 'T-' + folio4(t.folio),
          concepto: 'Traspaso a ' + nombreCuenta(t.a), referencia: t.referencia || '', entra: 0, sale: Number(t.monto) || 0
        });
      }
      if (t.a === cuentaId) {
        movs.push({
          fecha: t.fecha, tipo: 'traspaso', id: t.id, folio: 'T-' + folio4(t.folio),
          concepto: 'Traspaso de ' + nombreCuenta(t.de), referencia: t.referencia || '', entra: Number(t.monto) || 0, sale: 0
        });
      }
    });

    // Por fecha; el mismo día, primero lo que entra
    movs.sort(function (a, b) {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
      return (a.sale > 0 ? 1 : 0) - (b.sale > 0 ? 1 : 0);
    });
    var c = CC.Store.cuenta(cuentaId);
    var saldo = c ? Number(c.saldoInicial) || 0 : 0;
    movs.forEach(function (m) {
      saldo += m.entra - m.sale;
      m.saldo = Math.round(saldo * 100) / 100;
    });
    return movs;
  }

  /** Lo que debe haber en la cuenta a una fecha (o hoy). */
  function saldoCuenta(cuentaId, hastaFecha) {
    var c = CC.Store.cuenta(cuentaId);
    var s = c ? Number(c.saldoInicial) || 0 : 0;
    movimientosCuenta(cuentaId).forEach(function (m) {
      if (!hastaFecha || m.fecha <= hastaFecha) s += m.entra - m.sale;
    });
    return Math.round(s * 100) / 100;
  }

  /** El mes de una cuenta como en el estado de cuenta del banco: saldo inicial, movimientos y saldo final. */
  function estadoCuentaBanco(cuentaId, periodo) {
    var c = CC.Store.cuenta(cuentaId);
    var inicial = c ? Number(c.saldoInicial) || 0 : 0;
    var filas = [];
    movimientosCuenta(cuentaId).forEach(function (m) {
      var p = m.fecha.slice(0, 7);
      if (p < periodo) inicial = m.saldo;
      else if (p === periodo) filas.push(m);
    });
    var entradas = suma(filas, 'entra'), salidas = suma(filas, 'sale');
    return {
      inicial: inicial, filas: filas, entradas: entradas, salidas: salidas,
      final: Math.round((inicial + entradas - salidas) * 100) / 100
    };
  }

  /* ---------- Reportes ---------- */

  /**
   * Egresos del año por categoría y mes: el reporte que se va acumulando mes con
   * mes. Agrupado en fijos, variables y otros.
   */
  function egresosDelAnio(anio, cuentaId) {
    var hasta = CC.per.hoy(), meses = [];
    for (var m = 1; m <= 12; m++) {
      var per = anio + '-' + String(m).padStart(2, '0');
      if (per <= hasta) meses.push(per);
    }
    var cats = {};
    CC.Store.categorias().forEach(function (c) {
      cats[c.nombre] = { categoria: c.nombre, grupo: c.grupo || 'variable', porMes: {}, total: 0, presupuesto: Number(c.presupuesto) || 0 };
    });
    gastosVigentes().forEach(function (g) {
      if (String(g.periodo).slice(0, 4) !== String(anio)) return;
      if (cuentaId && (g.cuenta || 'banco') !== cuentaId) return;
      var f = cats[g.categoria] || (cats[g.categoria] = { categoria: g.categoria, grupo: 'otro', porMes: {}, total: 0, presupuesto: 0 });
      f.porMes[g.periodo] = (f.porMes[g.periodo] || 0) + (Number(g.monto) || 0);
      f.total += Number(g.monto) || 0;
    });
    var ordenGrupo = { fijo: 0, variable: 1, otro: 2 };
    var filas = Object.keys(cats).map(function (k) { return cats[k]; }).filter(function (f) { return f.total > 0; });
    filas.sort(function (a, b) {
      var ga = ordenGrupo[a.grupo] === undefined ? 2 : ordenGrupo[a.grupo];
      var gb = ordenGrupo[b.grupo] === undefined ? 2 : ordenGrupo[b.grupo];
      return (ga - gb) || (b.total - a.total);
    });
    var porMes = {};
    meses.forEach(function (per) {
      porMes[per] = filas.reduce(function (a, f) { return a + (f.porMes[per] || 0); }, 0);
    });
    return { anio: anio, meses: meses, filas: filas, porMes: porMes, total: suma(filas, 'total') };
  }

  /**
   * Lo que entró en el mes por cuotas, dicho por concepto: cuotas del mes, lo
   * recuperado de meses atrasados (mes por mes), adelantos, recargos y otros.
   */
  function ingresosDelMes(periodo) {
    var r = {
      cuotasDelMes: 0, recuperado: {}, recuperadoTotal: 0, adelantado: 0, recargos: 0,
      otrosCargos: 0, aFavor: 0, otrosIngresos: 0, pagos: 0, total: 0
    };
    var porCasa = {};
    CC.Store.pagos().forEach(function (p) {
      if (CC.per.de(p.fecha) === periodo) (porCasa[p.unidadId] = porCasa[p.unidadId] || []).push(p.id);
    });
    Object.keys(porCasa).forEach(function (uid) {
      var rep = repartoPagos(uid);
      porCasa[uid].forEach(function (pid) {
        var x = rep[pid];
        if (!x) return;
        r.pagos++;
        x.lineas.forEach(function (l) {
          if (l.tipo === 'recargo') r.recargos += l.monto;
          else if (l.periodo < periodo) {
            r.recuperado[l.periodo] = (r.recuperado[l.periodo] || 0) + l.monto;
            r.recuperadoTotal += l.monto;
          } else if (l.periodo > periodo) r.adelantado += l.monto;
          else if (l.tipo === 'cuota') r.cuotasDelMes += l.monto;
          else r.otrosCargos += l.monto;
        });
        r.aFavor += x.aFavor;
      });
    });
    CC.Store.ingresos().forEach(function (i) {
      if (!i.cancelado && CC.per.de(i.fecha) === periodo) r.otrosIngresos += Number(i.monto) || 0;
    });
    r.total = r.cuotasDelMes + r.recuperadoTotal + r.adelantado + r.recargos + r.otrosCargos + r.aFavor + r.otrosIngresos;
    return r;
  }

  /** Casa por casa, lo que quedó pendiente de cada uno de los últimos meses. */
  function historicoAdeudos(hasta, n) {
    var tope = hasta || CC.per.hoy();
    var meses = CC.per.ultimos(tope, n || 6);
    var filas = padron(tope).map(function (x) {
      var porMes = {}, anterior = 0;
      x.situacion.lineas.forEach(function (l) {
        if (l.pendiente <= 0.005) return;
        if (l.cargo.periodo < meses[0]) anterior += l.pendiente;
        else porMes[l.cargo.periodo] = (porMes[l.cargo.periodo] || 0) + l.pendiente;
      });
      return { unidad: x.unidad, porMes: porMes, anterior: anterior, saldo: x.situacion.saldo };
    });
    return { meses: meses, filas: filas };
  }

  /** Estado de cuenta de una casa entre dos meses, con su saldo de arranque. */
  function estadoCuentaCasa(unidadId, desde, hasta) {
    var movs = [];
    (indice().cargos[unidadId] || []).forEach(function (c) {
      if (c.periodo > hasta) return;
      movs.push({
        fecha: c.fechaVence || (c.periodo + '-01'), concepto: c.concepto + (c.condonado ? ' (condonado)' : ''),
        cargo: Number(c.monto) || 0, abono: 0
      });
    });
    (indice().pagos[unidadId] || []).forEach(function (p) {
      if (CC.per.de(p.fecha) > hasta) return;
      movs.push({
        fecha: p.fecha,
        concepto: 'Pago recibido · folio P-' + folio4(p.folio) + (p.metodo ? ' · ' + p.metodo : '') +
          (p.referencia ? ' · ref. ' + p.referencia : ''),
        cargo: 0, abono: Number(p.monto) || 0
      });
    });
    movs.sort(function (a, b) {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
      return b.cargo - a.cargo;
    });
    var inicial = 0, filas = [];
    movs.forEach(function (m) {
      if (m.fecha.slice(0, 7) < desde) inicial += m.cargo - m.abono;
      else filas.push(m);
    });
    var saldo = inicial;
    filas.forEach(function (m) { saldo += m.cargo - m.abono; m.saldo = Math.round(saldo * 100) / 100; });
    return {
      inicial: Math.round(inicial * 100) / 100, filas: filas, final: Math.round(saldo * 100) / 100,
      pendientes: pendientesPorMes(unidadId, hasta)
    };
  }


  return {
    gastosVigentes: gastosVigentes,
    textoRecargo: textoRecargo,
    pendientesPorMes: pendientesPorMes,
    coberturas: coberturas,
    recargosPendientes: recargosPendientes,
    aplicarRecargos: aplicarRecargos,
    movimientosCuenta: movimientosCuenta,
    saldoCuenta: saldoCuenta,
    estadoCuentaBanco: estadoCuentaBanco,
    egresosDelAnio: egresosDelAnio,
    ingresosDelMes: ingresosDelMes,
    historicoAdeudos: historicoAdeudos,
    estadoCuentaCasa: estadoCuentaCasa,
    pagadoHasta: pagadoHasta,
    proyectarAdelanto: proyectarAdelanto,
    visitasDel: visitasDel,
    visitasDentro: visitasDentro,
    visitasEsperadas: visitasEsperadas,
    visitasDe: visitasDe,
    horasDe: horasDe,
    reservasDel: reservasDel,
    ocupada: ocupada,
    validarReserva: validarReserva,
    proximasReservas: proximasReservas,
    textoReserva: textoReserva,
    aMin: aMin,
    aHora: aHora,
    repartoPagos: repartoPagos,
    datosRecibo: datosRecibo,
    planConvenio: planConvenio,
    estadoConvenio: estadoConvenio,
    convenioDe: convenioDe,
    ETIQUETA_CONVENIO: ETIQUETA_CONVENIO,
    deudores: deudores,
    avisosDe: avisosDe,
    ultimoAviso: ultimoAviso,
    porAvisar: porAvisar,
    avisoAdeudo: avisoAdeudo,
    asuntoAviso: asuntoAviso,
    cajaChica: cajaChica,
    cuotasPorTipo: cuotasPorTipo,
    totalM2: totalM2,
    indiviso: indiviso,
    cuota: cuota,
    cuotaTotal: cuotaTotal,
    periodos: periodos,
    aplicacion: aplicacion,
    situacion: situacion,
    padron: padron,
    resumen: resumen,
    caja: caja,
    fondoReserva: fondoReserva,
    porCategoria: porCategoria,
    serie: serie,
    faltanCuota: faltanCuota,
    proyectarCuotas: proyectarCuotas,
    ordenCasas: ordenCasas,
    recordatorio: recordatorio,
    ETIQUETA_ESTADO: ETIQUETA_ESTADO,
    suma: suma
  };
})();
