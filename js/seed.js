/* seed.js — datos de ejemplo y estructura vacía.
 *
 * Los datos de ejemplo son inventados: sirven para que la aplicación se vea
 * trabajando desde el primer segundo. La aplicacion los marca como "ejemplo"
 * en pantalla y se borran solos en cuanto se captura el primer dato real
 * (o con el boton "Empezar con mi condominio" en Ajustes).
 */
window.CC = window.CC || {};

CC.Seed = (function () {

  /* Unidades del condominio de ejemplo: 18 departamentos, 2 torres.
     El metraje define el porcentaje de indiviso y, con el, la cuota. */
  var UNIDADES = [
    ['A-101', 'Torre A', 92, 'Mariana Esquivel Rangel', null, '33 1204 8871'],
    ['A-102', 'Torre A', 86, 'Jorge Luis Peña Ordaz', null, '33 2288 4310'],
    ['A-103', 'Torre A', 86, 'Silvia Cárdenas Mota', 'Iván Robles Nava', '33 3391 7725'],
    ['A-104', 'Torre A', 92, 'Rodrigo Villaseñor Lara', null, '33 1877 5063'],
    ['A-201', 'Torre A', 88, 'Gabriela Montes de Oca', null, '33 2044 9918'],
    ['A-202', 'Torre A', 82, 'Héctor Zamudio Prieto', null, '33 3512 6604'],
    ['A-203', 'Torre A', 82, 'Claudia Rentería Ávila', null, '33 1663 2287'],
    ['A-204', 'Torre A', 88, 'Fernando Arriaga Sosa', 'Paola Núñez Terán', '33 2915 7140'],
    ['A-301', 'Torre A', 118, 'Ernesto Bracamontes Gil', null, '33 3708 1152'],
    ['A-302', 'Torre A', 118, 'Adriana Fuentes Carranza', null, '33 1450 9936'],
    ['B-101', 'Torre B', 78, 'Luis Alberto Sandoval Meza', null, '33 2671 3308'],
    ['B-102', 'Torre B', 74, 'Norma Idalia Treviño Cantú', null, '33 3129 8845'],
    ['B-103', 'Torre B', 74, 'Óscar Palomares Ibarra', 'Daniela Quiroz Ruvalcaba', '33 1982 4471'],
    ['B-104', 'Torre B', 78, 'Martín Escalante Duarte', null, '33 2356 6019'],
    ['B-201', 'Torre B', 78, 'Verónica Aguirre Salcido', null, '33 3844 2765'],
    ['B-202', 'Torre B', 74, 'Ricardo Galindo Bernal', null, '33 1507 9382'],
    ['B-203', 'Torre B', 74, 'Alejandra Padilla Ceniceros', null, '33 2790 5534'],
    ['B-204', 'Torre B', 78, 'Tomás Herrera Valdivia', null, '33 3065 1197']
  ];

  /* Presupuesto mensual de egresos por categoria. Suma 34,450. */
  var CATEGORIAS = [
    ['Vigilancia', 13800, 'Seguridad Privada Altavista'],
    ['Limpieza', 4200, 'Servicios Integrales Muñoz'],
    ['Jardinería', 2900, 'Vivero y Jardines El Roble'],
    ['Energía eléctrica', 3600, 'CFE Suministrador'],
    ['Agua', 2300, 'SIAPA'],
    ['Elevador', 2450, 'Elevadores Técnicos de Occidente'],
    ['Administración', 3200, 'Honorarios de administración'],
    ['Cisterna y bombas', 850, 'Hidroservicio GDL'],
    ['Seguro del inmueble', 1150, 'Seguros Atlas — póliza anual']
  ];

  /* Unidades que arrastran adeudo, y cuantos de los ultimos periodos deben.
     4 = debe los cuatro periodos del historial. */
  var ADEUDOS = { 'B-203': 4, 'A-203': 3, 'B-104': 2, 'A-102': 1 };
  /* Ademas de los anteriores, estas no han pagado el mes en curso todavía. */
  var PENDIENTES_MES = ['A-301', 'B-102'];

  var PRESUPUESTO_MENSUAL = 38700;   // ingreso objetivo por cuotas
  var CUOTA_EXTRA = 850;             // derrama por impermeabilización
  var N_PERIODOS = 4;

  /* Generador pseudoaleatorio con semilla: el ejemplo se ve igual siempre. */
  function rng(semilla) {
    var s = 0;
    for (var i = 0; i < semilla.length; i++) s = (s * 31 + semilla.charCodeAt(i)) >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* Los correos de ejemplo se derivan del nombre, sin acentos. */
  function sinAcentos(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /* Una firma garabateada, para que los recibos de ejemplo se vean firmados.
     Las firmas reales se dibujan con el dedo y se guardan en CC.Archivos. */
  function firmaEjemplo(trazo) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="190" height="60" viewBox="0 0 190 60">' +
      '<rect width="190" height="60" fill="#fff"/>' +
      '<path d="' + trazo + '" fill="none" stroke="#111A22" stroke-width="2.1" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var TRAZOS = [
    'M12,42 C24,10 34,52 46,30 C56,12 62,46 74,28 C86,12 94,40 106,32 C116,26 126,38 140,22 M30,50 C70,46 110,48 156,42',
    'M14,38 C26,16 32,48 44,26 C54,10 66,44 78,26 C88,12 98,42 112,30 C124,20 134,36 148,26 M26,48 C68,52 108,44 150,48'
  ];

  function condominioEjemplo() {
    return {
      nombre: 'Residencial Alameda 214',
      direccion: 'Av. Alameda 214, Col. Jardines del Bosque',
      ciudad: 'Guadalajara, Jalisco',
      administrador: 'Comité de Administración',
      telefono: '33 3616 4420',
      email: 'administracion@alameda214.mx',
      cuenta: 'BBVA 0123 4567 89 — CLABE 012320001234567897',
      presupuestoMensual: PRESUPUESTO_MENSUAL,
      diaVencimiento: 10,
      tasaMoraMensual: 3,      // % mensual sobre saldo vencido
      fondoReservaPct: 11,     // % de cada cuota que va al fondo
      saldoInicialCaja: 62400  // saldo en caja al inicio del historial
    };
  }

  function vacio(datos) {
    var c = Object.assign(condominioEjemplo(), {
      nombre: '', direccion: '', ciudad: '', administrador: '',
      telefono: '', email: '', cuenta: '', saldoInicialCaja: 0
    }, datos || {});
    return {
      version: 1,
      condominio: c,
      unidades: [],
      cargos: [],
      pagos: [],
      gastos: [],
      avisos: [],
      categorias: CATEGORIAS.map(function (x) {
        return { id: CC.Store.nuevoId('cat'), nombre: x[0], presupuesto: 0, proveedor: '' };
      }),
      recibos: [],
      notas: [],
      difusiones: [],
      meta: {
        demo: false, folioRecibo: 0,
        creado: new Date().toISOString(), actualizado: new Date().toISOString()
      }
    };
  }

  function construir() {
    var hoy = CC.per.hoy();
    var periodos = CC.per.ultimos(hoy, N_PERIODOS);
    var periodoExtra = periodos[1];              // la derrama cayo hace dos meses
    var cond = condominioEjemplo();

    var totalM2 = UNIDADES.reduce(function (a, u) { return a + u[2]; }, 0);

    var unidades = UNIDADES.map(function (u, i) {
      var indiviso = u[2] / totalM2;
      return {
        id: 'uni_' + u[0].toLowerCase().replace('-', ''),
        clave: u[0],
        torre: u[1],
        m2: u[2],
        cuotaOverride: null,
        propietario: u[3],
        inquilino: u[4],
        telefono: u[5],
        email: sinAcentos(u[3].split(' ')[0]) + '.' + u[0].toLowerCase() + '@correo.mx',
        ocupacion: u[4] ? 'Rentado' : (u[0] === 'B-204' ? 'Desocupado' : 'Propietario'),
        _cuota: Math.round(indiviso * PRESUPUESTO_MENSUAL)
      };
    });

    var categorias = CATEGORIAS.map(function (x) {
      return { id: 'cat_' + x[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 10), nombre: x[0], presupuesto: x[1], proveedor: x[2] };
    });

    var cargos = [], pagos = [], gastos = [];
    var azar = rng('alameda214');

    /* --- Cargos: la cuota de cada unidad, cada periodo --- */
    periodos.forEach(function (p) {
      var vence = CC.per.vence(p, cond.diaVencimiento);
      unidades.forEach(function (u) {
        cargos.push({
          id: 'car_' + u.clave + '_' + p,
          unidadId: u.id, periodo: p, tipo: 'cuota',
          concepto: 'Cuota de mantenimiento ' + CC.fmt.periodo(p),
          monto: u._cuota, fechaVence: vence
        });
      });
      if (p === periodoExtra) {
        unidades.forEach(function (u) {
          cargos.push({
            id: 'carx_' + u.clave + '_' + p,
            unidadId: u.id, periodo: p, tipo: 'extraordinaria',
            concepto: 'Cuota extraordinaria — impermeabilización de azotea',
            monto: CUOTA_EXTRA, fechaVence: vence
          });
        });
      }
    });

    /* --- Pagos: todos pagan, salvo los adeudos definidos arriba --- */
    var metodos = ['Transferencia', 'Transferencia', 'Transferencia', 'Depósito', 'Efectivo'];
    periodos.forEach(function (p, idx) {
      var desdeElFinal = N_PERIODOS - idx;   // 4 = el más viejo, 1 = el mes en curso
      unidades.forEach(function (u) {
        var debeUltimos = ADEUDOS[u.clave] || 0;
        if (debeUltimos >= desdeElFinal) return;                       // no pago este periodo
        if (p === hoy && PENDIENTES_MES.indexOf(u.clave) >= 0) return; // aún no paga el mes
        var monto = u._cuota + (p === periodoExtra ? CUOTA_EXTRA : 0);
        var dia = Math.min(2 + Math.floor(azar() * 12), 28);
        pagos.push({
          id: 'pag_' + u.clave + '_' + p,
          unidadId: u.id, periodo: p,
          fecha: p + '-' + String(dia).padStart(2, '0'),
          monto: monto,
          metodo: metodos[Math.floor(azar() * metodos.length)],
          referencia: String(400000 + Math.floor(azar() * 599999)),
          nota: ''
        });
      });
    });

    /* --- Gastos: los servicios del condominio, mes con mes --- */
    var pendientesMesActual = ['Seguro del inmueble', 'Elevador', 'Administración'];
    periodos.forEach(function (p) {
      categorias.forEach(function (cat, ci) {
        // los servicios medidos varian mes a mes; los contratados son fijos
        var variable = (cat.nombre === 'Energía eléctrica' || cat.nombre === 'Agua');
        var factor = variable ? (0.86 + azar() * 0.3) : 1;
        var monto = Math.round(cat.presupuesto * factor);
        var dia = Math.min(3 + ci * 2 + Math.floor(azar() * 3), 27);
        var pendiente = (p === hoy && pendientesMesActual.indexOf(cat.nombre) >= 0);
        gastos.push({
          id: 'gas_' + cat.id + '_' + p,
          periodo: p,
          fecha: p + '-' + String(dia).padStart(2, '0'),
          categoria: cat.nombre,
          proveedor: cat.proveedor,
          concepto: cat.nombre + ' — ' + CC.fmt.periodo(p),
          monto: monto,
          estado: pendiente ? 'pendiente' : 'pagado',
          metodo: pendiente ? '' : 'Transferencia',
          folio: 'F-' + p.replace('-', '') + '-' + String(100 + ci)
        });
      });
    });

    /* Un gasto imprevisto, para que el reporte no se vea demasiado limpio */
    gastos.push({
      id: 'gas_reparacion',
      periodo: periodos[2],
      fecha: periodos[2] + '-18',
      categoria: 'Cisterna y bombas',
      proveedor: 'Hidroservicio GDL',
      concepto: 'Cambio de bomba hidroneumatica (imprevisto)',
      monto: 7380,
      estado: 'pagado',
      metodo: 'Transferencia',
      folio: 'F-' + periodos[2].replace('-', '') + '-201'
    });

    var avisos = [
      {
        id: 'avi_1',
        fecha: hoy + '-15',
        titulo: 'Asamblea ordinaria: domingo 5 de octubre, 10:00 h',
        cuerpo: 'Se revisará el cierre financiero del trimestre y la propuesta de cuota para 2027.\nEl orden del día y el estado de cuenta del condominio están disponibles en el portal.',
        prioridad: 'alta'
      },
      {
        id: 'avi_2',
        fecha: hoy + '-08',
        titulo: 'Mantenimiento del elevador — Torre A',
        cuerpo: 'El proveedor realizará el servicio preventivo el jueves de 9:00 a 14:00 h. Durante esas horas el elevador de la Torre A estará fuera de servicio.',
        prioridad: 'media'
      },
      {
        id: 'avi_3',
        fecha: CC.per.suma(hoy, -1) + '-22',
        titulo: 'Concluyó la impermeabilización de azotea',
        cuerpo: 'Los trabajos terminaron dentro del presupuesto aprobado en asamblea. El comprobante y la garantía por 5 años quedaron en el expediente del condominio.',
        prioridad: 'normal'
      }
    ];

    /* --- Recibos de pago en mano: el jardinero, el plomero --- */
    var recibos = [
      {
        id: 'rec_1', folio: 2,
        fecha: hoy + '-12',
        periodo: hoy,
        recibeDe: 'Residencial Alameda 214',
        nombre: 'Salvador Ibarra Mendoza',
        identificacion: 'INE 1234567890',
        concepto: 'Poda de setos y limpieza de jardineras de acceso',
        categoria: 'Jardinería',
        monto: 1450,
        metodo: 'Efectivo',
        firmaInline: firmaEjemplo(TRAZOS[0]),
        fotoId: null,
        nota: 'Trabajo extra fuera del contrato mensual, autorizado por el comité.',
        registrado: new Date().toISOString()
      },
      {
        id: 'rec_2', folio: 1,
        fecha: CC.per.suma(hoy, -1) + '-26',
        periodo: CC.per.suma(hoy, -1),
        recibeDe: 'Residencial Alameda 214',
        nombre: 'Jorge Alberto Ramírez Solís',
        identificacion: 'INE 0987654321',
        concepto: 'Reparación de fuga en toma de agua, Torre B planta baja',
        categoria: 'Cisterna y bombas',
        monto: 980,
        metodo: 'Efectivo',
        firmaInline: firmaEjemplo(TRAZOS[1]),
        fotoId: null,
        nota: '',
        registrado: new Date().toISOString()
      }
    ];

    /* --- Bitácora: notas sueltas sobre unidades --- */
    var notas = [
      {
        id: 'not_1', unidadId: 'uni_b203', fecha: hoy + '-14',
        tipo: 'gestion',
        texto: 'Se le llamó por teléfono. Pidió convenio a 3 pagos para ponerse al corriente; queda pendiente que el comité lo apruebe en la próxima asamblea.'
      },
      {
        id: 'not_2', unidadId: 'uni_a203', fecha: CC.per.suma(hoy, -1) + '-28',
        tipo: 'gestion',
        texto: 'Recordatorio enviado por WhatsApp. Confirmó recepción y dijo que pagaría en quincena.'
      },
      {
        id: 'not_3', unidadId: 'uni_a103', fecha: CC.per.suma(hoy, -2) + '-09',
        tipo: 'incidencia',
        texto: 'Reportó ruido de la bomba durante la noche. Se revisó con el proveedor y se ajustó el horario del temporizador.'
      }
    ];

    unidades.forEach(function (u) { delete u._cuota; });

    return {
      version: 1,
      condominio: cond,
      unidades: unidades,
      cargos: cargos,
      pagos: pagos,
      gastos: gastos,
      avisos: avisos,
      categorias: categorias,
      recibos: recibos,
      notas: notas,
      difusiones: [],
      meta: {
        demo: true, folioRecibo: 2,
        creado: new Date().toISOString(), actualizado: new Date().toISOString()
      }
    };
  }

  return { construir: construir, vacio: vacio };
})();
