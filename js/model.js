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

  /* ---------- Periodos ---------- */

  /** Todos los periodos con movimiento, más el mes en curso, del más nuevo al más viejo. */
  function periodos() {
    var set = {};
    CC.Store.cargos().forEach(function (c) { set[c.periodo] = 1; });
    CC.Store.gastos().forEach(function (g) { set[g.periodo] = 1; });
    CC.Store.pagos().forEach(function (p) { set[p.periodo] = 1; });
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

    var tasa = (Number(cond.tasaMoraMensual) || 0) / 100;
    var recargo = vencidos.reduce(function (a, l) {
      var meses = Math.max(0, CC.per.dif(l.cargo.periodo, tope));
      return a + l.pendiente * tasa * meses;
    }, 0);

    var montoVencido = vencidos.reduce(function (a, l) { return a + l.pendiente; }, 0);

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

    var cargosP = CC.Store.cargos().filter(function (c) { return c.periodo === p; });
    var pagosP = CC.Store.pagos().filter(function (x) { return x.periodo === p; });
    var gastosP = CC.Store.gastos().filter(function (g) { return g.periodo === p; });

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

  /** Saldo en caja acumulado hasta el periodo indicado (incluyente). */
  function caja(hasta) {
    var tope = hasta || CC.per.hoy();
    var cond = CC.Store.condominio();
    var entra = suma(CC.Store.pagos().filter(function (p) { return p.periodo <= tope; }), 'monto');
    var sale = suma(CC.Store.gastos().filter(function (g) {
      return g.periodo <= tope && g.estado === 'pagado';
    }), 'monto');
    return (Number(cond.saldoInicialCaja) || 0) + entra - sale;
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
    CC.Store.gastos().filter(function (g) { return g.periodo === p; }).forEach(function (g) {
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

  return {
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
