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
      l.push('Según nuestros registros, la casa ' + u.clave + ' tiene pendiente su cuota de mantenimiento' +
        (s.mesesVencidos > 1
          ? ' desde ' + CC.fmt.periodo(s.desde).toLowerCase() + ' (' + s.mesesVencidos + ' meses).'
          : ' de ' + CC.fmt.periodo(s.desde).toLowerCase() + '.'));
      l.push('');
      l.push('Saldo al ' + CC.fmt.fecha(hoy) + ': ' + CC.fmt.money2(s.saldo));
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


  return {
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
