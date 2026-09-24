/* seed.js — datos de ejemplo y estructura vacía.
 *
 * El ejemplo es un condominio horizontal de 150 casas en cinco calles
 * internas, del tamaño y con los costos de un fraccionamiento privado en
 * Guadalajara. Todo es inventado: la aplicación lo marca como ejemplo en
 * pantalla y se borra en cuanto se captura el primer dato real.
 */
window.CC = window.CC || {};

CC.Seed = (function () {

  /* --- Traza del condominio: cinco calles, treinta casas cada una --- */
  var CALLES = [
    'Circuito Fresnos',
    'Privada Encino',
    'Andador Nogal',
    'Paseo del Roble',
    'Retorno Jacaranda'
  ];
  var CASAS_POR_CALLE = 30;

  /* Tres prototipos de casa. El metraje define el indiviso y con él la cuota. */
  var PROTOTIPOS = [
    { tipo: 'A', m2: 120, peso: 47 },
    { tipo: 'B', m2: 145, peso: 37 },
    { tipo: 'C', m2: 180, peso: 16 }
  ];

  /* Presupuesto mensual de egresos. Suma 163,000. */
  var CATEGORIAS = [
    ['Vigilancia', 58000, 'Seguridad Privada Altavista'],
    ['Energía eléctrica', 22000, 'CFE Suministrador'],
    ['Jardinería', 18000, 'Vivero y Jardines El Roble'],
    ['Administración', 18000, 'Honorarios de administración'],
    ['Limpieza', 12000, 'Servicios Integrales Muñoz'],
    ['Agua', 9000, 'SIAPA'],
    ['Recolección de basura', 8500, 'Recolectora Metropolitana'],
    ['Alberca', 7500, 'Albercas y Equipos de Occidente'],
    ['Mantenimiento y bombas', 6000, 'Hidroservicio GDL'],
    ['Seguro del inmueble', 4000, 'Seguros Atlas — póliza anual']
  ];

  var PRESUPUESTO_MENSUAL = 180000;  // ingreso objetivo por cuotas
  var CUOTA_EXTRA = 1200;            // derrama por repavimentación
  var N_PERIODOS = 4;

  var NOMBRES = [
    'María', 'José', 'Guadalupe', 'Juan', 'Alejandra', 'Ricardo', 'Verónica', 'Martín',
    'Silvia', 'Óscar', 'Adriana', 'Fernando', 'Claudia', 'Héctor', 'Norma', 'Tomás',
    'Gabriela', 'Rodrigo', 'Mariana', 'Ernesto', 'Paola', 'Luis', 'Daniela', 'Jorge',
    'Cecilia', 'Armando', 'Rosario', 'Ignacio', 'Beatriz', 'Salvador', 'Leticia', 'Raúl',
    'Patricia', 'Enrique', 'Carmen', 'Arturo', 'Lorena', 'Sergio', 'Mónica', 'Alberto'
  ];
  var APELLIDOS = [
    'Esquivel', 'Peña', 'Cárdenas', 'Villaseñor', 'Montes', 'Zamudio', 'Rentería', 'Arriaga',
    'Bracamontes', 'Fuentes', 'Sandoval', 'Treviño', 'Palomares', 'Escalante', 'Aguirre',
    'Galindo', 'Padilla', 'Herrera', 'Robles', 'Quiroz', 'Cervantes', 'Naranjo', 'Barajas',
    'Íñiguez', 'Chávez', 'Gutiérrez', 'Pelayo', 'Orozco', 'Maciel', 'Lomelí', 'Curiel',
    'Ascencio', 'Preciado', 'Valdivia', 'Michel', 'Gallardo', 'Tejeda', 'Rivas', 'Nuño', 'Solís'
  ];

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
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]/g, '');
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
      nombre: 'Privada Los Fresnos',
      direccion: 'Av. Santa Anita 1450',
      ciudad: 'Tlajomulco de Zúñiga, Jalisco',
      administrador: 'Comité de Administración',
      telefono: '33 3616 4420',
      email: 'administracion@privadalosfresnos.mx',
      cuenta: 'BBVA 0123 4567 89 — CLABE 012320001234567897',
      presupuestoMensual: PRESUPUESTO_MENSUAL,
      diaVencimiento: 10,
      tasaMoraMensual: 3,      // % mensual sobre saldo vencido
      fondoReservaPct: 9,      // % de cada cuota que va al fondo
      saldoInicialCaja: 342000 // saldo en caja al inicio del historial
    };
  }

  /* --- Reglamento interno: el articulado que rige la convivencia --- */
  function reglamentoEjemplo() {
    return {
      titulo: 'Reglamento Interno',
      aprobado: '2026-03-15',
      nota: 'Modelo de referencia. Antes de aplicarlo debe revisarlo un abogado ' +
            'y aprobarse en asamblea, y protocolizarse conforme a la Ley de ' +
            'Propiedad en Condominio del Estado de Jalisco.',
      capitulos: [
        {
          nombre: 'Disposiciones generales',
          articulos: [
            'El presente reglamento es obligatorio para propietarios, inquilinos, familiares, visitantes y personal de servicio. El propietario responde por las faltas que cometan quienes ocupan su casa o acuden a ella.',
            'La administración es la única facultada para aplicar este reglamento. Cualquier modificación requiere acuerdo de asamblea con la mayoría que señale la escritura constitutiva.',
            'Todo propietario debe mantener actualizados en la administración su teléfono, correo y los datos de quien habita la casa cuando esté rentada.'
          ]
        },
        {
          nombre: 'Cuotas y pagos',
          articulos: [
            'La cuota de mantenimiento se calcula por porcentaje de indiviso, conforme al metraje de cada casa, y vence el día 10 de cada mes.',
            'El saldo vencido genera un recargo por mora del 3% mensual, que se calcula sobre el importe no cubierto y a partir de la fecha de vencimiento.',
            'Los pagos se aplican siempre al adeudo más antiguo, sin importar el mes que el residente indique al pagar.',
            'Con tres o más mensualidades vencidas, la administración puede suspender el acceso a las áreas comunes de recreación, previa notificación por escrito. Nunca se suspenden servicios esenciales ni el acceso a la casa.',
            'Las cuotas extraordinarias solo proceden por acuerdo de asamblea, que debe señalar el monto, el destino y el plazo de pago.'
          ]
        },
        {
          nombre: 'Uso de las casas',
          articulos: [
            'Las casas son de uso exclusivamente habitacional. No se permite instalar comercios, talleres, bodegas ni actividades que generen afluencia de personas ajenas al condominio.',
            'Queda prohibido almacenar sustancias inflamables, explosivas o peligrosas en cantidad mayor a la de uso doméstico normal.',
            'Cuando la casa se rente, el propietario debe entregar copia de este reglamento al inquilino y avisar a la administración antes de que se ocupe.'
          ]
        },
        {
          nombre: 'Fachadas y obras',
          articulos: [
            'No se permite alterar la fachada, el color exterior, la herrería, la cochera ni la altura de las bardas sin autorización escrita de la administración.',
            'Toda obra mayor debe avisarse con cinco días de anticipación, indicando duración y responsable. El horario permitido es de lunes a viernes de 9:00 a 18:00 h y sábados de 9:00 a 14:00 h. No se permite obra en domingo ni en día festivo.',
            'El propietario que realice obra responde por el retiro del escombro y por cualquier daño a vialidades, banquetas o áreas comunes.'
          ]
        },
        {
          nombre: 'Áreas comunes',
          articulos: [
            'Las áreas comunes son de uso de todos los residentes. Ningún residente puede apropiarse de ellas ni colocar objetos, plantas o muebles que impidan el paso.',
            'El salón de eventos y el asador se reservan con la administración con al menos cinco días de anticipación, y se entrega un depósito en garantía que se devuelve si el área queda en las mismas condiciones.',
            'Los menores de doce años deben ir acompañados de un adulto en la alberca y en el área de juegos. El condominio no cuenta con salvavidas.',
            'El horario de la alberca es de 8:00 a 21:00 h. No se permite introducir vidrio en el área.'
          ]
        },
        {
          nombre: 'Estacionamiento y vialidades',
          articulos: [
            'Cada casa cuenta con su propio cajón. Los vehículos de visitas se estacionan únicamente en los cajones marcados para visitantes.',
            'Queda prohibido estacionarse sobre las banquetas, frente a las tomas de agua contra incendio, en los accesos de otras casas o en doble fila.',
            'La velocidad máxima dentro del condominio es de 15 km/h. Los peatones tienen preferencia en todo momento.',
            'No se permite reparar vehículos, cambiar aceite ni lavarlos con manguera dentro del condominio, salvo en la zona destinada para ello.'
          ]
        },
        {
          nombre: 'Mascotas',
          articulos: [
            'Las mascotas deben circular por las áreas comunes con correa y bajo el control de una persona capaz de sujetarlas.',
            'El dueño está obligado a recoger de inmediato los desechos de su mascota. Hay dispensadores de bolsas en las áreas verdes.',
            'No se permite que las mascotas permanezcan solas en las áreas comunes ni que ingresen a la alberca ni al área de juegos.',
            'El dueño responde por los daños y las lesiones que cause su mascota.'
          ]
        },
        {
          nombre: 'Ruido y convivencia',
          articulos: [
            'El horario de descanso es de 22:00 a 8:00 h de domingo a jueves, y de 24:00 a 9:00 h viernes, sábado y víspera de día festivo.',
            'Las reuniones dentro de una casa no deben alcanzar un volumen audible desde otra casa durante el horario de descanso.',
            'El uso de herramienta ruidosa, podadora o taladro se permite únicamente dentro del horario de obra.'
          ]
        },
        {
          nombre: 'Basura y limpieza',
          articulos: [
            'La basura se saca únicamente en los días y horarios de recolección, en bolsa cerrada y en el contenedor correspondiente.',
            'Los residuos de jardinería, escombro, muebles y aparatos deben retirarse por cuenta del propietario. El servicio de recolección no los recibe.',
            'Cada residente mantiene limpia la banqueta y el frente de su casa.'
          ]
        },
        {
          nombre: 'Seguridad y acceso',
          articulos: [
            'El acceso de visitas se autoriza por el residente ante la caseta. El personal de vigilancia registra la entrada y puede solicitar identificación.',
            'El personal de servicio doméstico, de obra o de mensajería se registra en la caseta y debe portar identificación mientras permanezca en el condominio.',
            'El control de acceso y el llavero electrónico son personales e intransferibles. Prestarlos a terceros es responsabilidad del titular.',
            'El personal de vigilancia no está facultado para recibir pagos, paquetería de valor ni llaves de las casas.'
          ]
        },
        {
          nombre: 'Sanciones',
          articulos: [
            'El incumplimiento se sanciona, según la gravedad y la reincidencia, con: amonestación por escrito, multa, o suspensión del uso de áreas comunes de recreación.',
            'La multa se determina en asamblea y no puede exceder el importe de dos cuotas mensuales de mantenimiento por cada falta.',
            'La multa se carga al estado de cuenta de la casa y se cobra junto con la cuota de mantenimiento.',
            'El residente sancionado puede inconformarse por escrito ante la administración dentro de los diez días siguientes, y el comité resuelve en la siguiente sesión.'
          ]
        }
      ]
    };
  }

  function documentosEjemplo(hoy) {
    return [
      {
        id: 'doc_1', nombre: 'Escritura constitutiva del régimen de condominio',
        tipo: 'Escritura', fecha: '2019-06-11', fotoId: null,
        nota: 'Escritura pública 24,188, notaría 12 de Guadalajara. El original está en la caja fuerte de la administración.'
      },
      {
        id: 'doc_2', nombre: 'Acta de asamblea ordinaria',
        tipo: 'Acta', fecha: '2026-03-15', fotoId: null,
        nota: 'Se aprobó el presupuesto del ejercicio, la cuota vigente y el reglamento interno.'
      },
      {
        id: 'doc_3', nombre: 'Póliza de seguro del inmueble',
        tipo: 'Póliza', fecha: '2026-01-20', fotoId: null,
        nota: 'Seguros Atlas, vigencia anual. Cubre áreas comunes, caseta y equipo de bombeo. Renovar en enero.'
      },
      {
        id: 'doc_4', nombre: 'Contrato de vigilancia',
        tipo: 'Contrato', fecha: '2026-02-01', fotoId: null,
        nota: 'Seguridad Privada Altavista. Tres turnos, dos elementos por turno. Vigencia de un año con renovación automática.'
      },
      {
        id: 'doc_5', nombre: 'Dictamen de mantenimiento del equipo de bombeo',
        tipo: 'Dictamen', fecha: CC.per.suma(hoy, -2) + '-19', fotoId: null,
        nota: 'Se recomendó cambiar la bomba número 2 antes de fin de año.'
      }
    ];
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
      documentos: [],
      reglamento: { titulo: 'Reglamento Interno', aprobado: '', nota: '', capitulos: [] },
      meta: {
        demo: false, folioRecibo: 0,
        creado: new Date().toISOString(), actualizado: new Date().toISOString()
      }
    };
  }

  function construir() {
    var hoy = CC.per.hoy();
    var periodos = CC.per.ultimos(hoy, N_PERIODOS);
    var periodoExtra = periodos[1];              // la derrama cayó hace dos meses
    var cond = condominioEjemplo();
    var azar = rng('losfresnos150');

    /* --- Las 150 casas --- */
    var unidades = [];
    CALLES.forEach(function (calle, ci) {
      for (var n = 1; n <= CASAS_POR_CALLE; n++) {
        // reparto de prototipos estable por posición
        var r = azar() * 100, acum = 0, proto = PROTOTIPOS[0];
        for (var k = 0; k < PROTOTIPOS.length; k++) {
          acum += PROTOTIPOS[k].peso;
          if (r <= acum) { proto = PROTOTIPOS[k]; break; }
        }

        var nombre = NOMBRES[Math.floor(azar() * NOMBRES.length)];
        var ap1 = APELLIDOS[Math.floor(azar() * APELLIDOS.length)];
        var ap2 = APELLIDOS[Math.floor(azar() * APELLIDOS.length)];
        var propietario = nombre + ' ' + ap1 + ' ' + ap2;

        var rentada = azar() < 0.18;
        var desocupada = !rentada && azar() < 0.04;
        var inquilino = rentada
          ? NOMBRES[Math.floor(azar() * NOMBRES.length)] + ' ' +
            APELLIDOS[Math.floor(azar() * APELLIDOS.length)]
          : null;

        var clave = calle.split(' ').pop() + ' ' + n;   // "Fresnos 12"
        unidades.push({
          id: 'uni_' + sinAcentos(calle.split(' ').pop()) + '_' + n,
          clave: clave,
          calle: calle,
          numero: n,
          prototipo: proto.tipo,
          m2: proto.m2,
          cuotaOverride: null,
          propietario: propietario,
          inquilino: inquilino,
          telefono: '33 ' + (1000 + Math.floor(azar() * 8999)) + ' ' + (1000 + Math.floor(azar() * 8999)),
          email: sinAcentos(nombre) + '.' + sinAcentos(ap1) + (ci * 30 + n) + '@correo.mx',
          ocupacion: rentada ? 'Rentada' : (desocupada ? 'Desocupada' : 'Propietario')
        });
      }
    });

    var totalM2 = unidades.reduce(function (a, u) { return a + u.m2; }, 0);
    unidades.forEach(function (u) {
      u._cuota = Math.round((u.m2 / totalM2) * PRESUPUESTO_MENSUAL);
    });

    var categorias = CATEGORIAS.map(function (x) {
      return {
        id: 'cat_' + sinAcentos(x[0]).slice(0, 12),
        nombre: x[0], presupuesto: x[1], proveedor: x[2]
      };
    });

    /* --- Quién debe y cuánto: alrededor del 20% de la cartera --- */
    var adeudos = {};   // clave -> cuántos de los últimos periodos debe
    var pendientesMes = {};
    unidades.forEach(function (u) {
      var r = azar();
      if (r < 0.030) adeudos[u.clave] = 4;        // caso grave
      else if (r < 0.075) adeudos[u.clave] = 3;
      else if (r < 0.135) adeudos[u.clave] = 2;
      else if (r < 0.205) adeudos[u.clave] = 1;
      else if (r < 0.330) pendientesMes[u.clave] = 1;  // aún no paga el mes en curso
    });

    /* --- Cargos: la cuota de cada casa, cada periodo --- */
    var cargos = [];
    periodos.forEach(function (p) {
      var vence = CC.per.vence(p, cond.diaVencimiento);
      unidades.forEach(function (u) {
        cargos.push({
          id: 'car_' + u.id + '_' + p,
          unidadId: u.id, periodo: p, tipo: 'cuota',
          concepto: 'Cuota de mantenimiento ' + CC.fmt.periodo(p),
          monto: u._cuota, fechaVence: vence
        });
      });
      if (p === periodoExtra) {
        unidades.forEach(function (u) {
          cargos.push({
            id: 'carx_' + u.id + '_' + p,
            unidadId: u.id, periodo: p, tipo: 'extraordinaria',
            concepto: 'Cuota extraordinaria — repavimentación de vialidades',
            monto: CUOTA_EXTRA, fechaVence: vence
          });
        });
      }
    });

    /* --- Pagos --- */
    var pagos = [];
    var metodos = ['Transferencia', 'Transferencia', 'Transferencia', 'Depósito', 'Efectivo'];
    periodos.forEach(function (p, idx) {
      var desdeElFinal = N_PERIODOS - idx;   // 4 = el más viejo, 1 = el mes en curso
      unidades.forEach(function (u) {
        if ((adeudos[u.clave] || 0) >= desdeElFinal) return;
        if (p === hoy && pendientesMes[u.clave]) return;
        var monto = u._cuota + (p === periodoExtra ? CUOTA_EXTRA : 0);
        var dia = Math.min(2 + Math.floor(azar() * 12), 28);
        pagos.push({
          id: 'pag_' + u.id + '_' + p,
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
    var gastos = [];
    var pendientesMesActual = ['Seguro del inmueble', 'Alberca', 'Administración'];
    periodos.forEach(function (p) {
      categorias.forEach(function (cat, ci) {
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

    gastos.push({
      id: 'gas_bomba',
      periodo: periodos[2],
      fecha: periodos[2] + '-18',
      categoria: 'Mantenimiento y bombas',
      proveedor: 'Hidroservicio GDL',
      concepto: 'Cambio de bomba hidroneumática del pozo (imprevisto)',
      monto: 28400,
      estado: 'pagado',
      metodo: 'Transferencia',
      folio: 'F-' + periodos[2].replace('-', '') + '-201'
    });

    /* --- Avisos --- */
    var avisos = [
      {
        id: 'avi_1', fecha: hoy + '-15',
        titulo: 'Asamblea ordinaria: domingo 5 de octubre, 10:00 h en el salón',
        cuerpo: 'Se revisará el cierre financiero del trimestre, el avance de la repavimentación y la propuesta de cuota para 2027.\nEl orden del día y el estado de cuenta del condominio están disponibles en el portal.',
        prioridad: 'alta'
      },
      {
        id: 'avi_2', fecha: hoy + '-08',
        titulo: 'Repavimentación: Circuito Fresnos cerrado del 28 al 30',
        cuerpo: 'Los trabajos avanzan por etapas. Durante esos tres días el Circuito Fresnos quedará cerrado a la circulación y se habilitará el acceso por Retorno Jacaranda.\nPor favor saquen sus vehículos antes de las 7:00 h del día 28.',
        prioridad: 'media'
      },
      {
        id: 'avi_3', fecha: CC.per.suma(hoy, -1) + '-22',
        titulo: 'Nuevo horario de la alberca',
        cuerpo: 'A partir de este mes la alberca abre de 8:00 a 21:00 h todos los días. Se recuerda que los menores de doce años deben estar acompañados de un adulto.',
        prioridad: 'normal'
      }
    ];

    /* --- Recibos de pago en mano --- */
    var recibos = [
      {
        id: 'rec_1', folio: 2,
        fecha: hoy + '-12', periodo: hoy,
        recibeDe: cond.nombre,
        nombre: 'Salvador Ibarra Mendoza',
        identificacion: 'INE 1234567890',
        concepto: 'Poda de setos y limpieza de jardineras del acceso principal',
        categoria: 'Jardinería',
        monto: 2800,
        metodo: 'Efectivo',
        firmaInline: firmaEjemplo(TRAZOS[0]),
        fotoId: null,
        nota: 'Trabajo extra fuera del contrato mensual, autorizado por el comité.',
        registrado: new Date().toISOString()
      },
      {
        id: 'rec_2', folio: 1,
        fecha: CC.per.suma(hoy, -1) + '-26', periodo: CC.per.suma(hoy, -1),
        recibeDe: cond.nombre,
        nombre: 'Jorge Alberto Ramírez Solís',
        identificacion: 'INE 0987654321',
        concepto: 'Reparación de fuga en la toma general de Andador Nogal',
        categoria: 'Mantenimiento y bombas',
        monto: 1650,
        metodo: 'Efectivo',
        firmaInline: firmaEjemplo(TRAZOS[1]),
        fotoId: null,
        nota: '',
        registrado: new Date().toISOString()
      }
    ];

    /* --- Bitácora: notas sobre casas concretas --- */
    var morosos = Object.keys(adeudos);
    var notas = [];
    function casaPorClave(clave) {
      for (var i = 0; i < unidades.length; i++) if (unidades[i].clave === clave) return unidades[i];
      return null;
    }
    [
      ['gestion', hoy + '-14', 'Se le llamó por teléfono. Pidió convenio a tres pagos para ponerse al corriente; queda pendiente que el comité lo apruebe en la próxima asamblea.'],
      ['gestion', CC.per.suma(hoy, -1) + '-28', 'Recordatorio enviado por WhatsApp. Confirmó recepción y dijo que pagaría en quincena.'],
      ['incidencia', CC.per.suma(hoy, -2) + '-09', 'Reportó ruido del equipo de bombeo durante la noche. Se revisó con el proveedor y se ajustó el horario del temporizador.']
    ].forEach(function (n, i) {
      var casa = casaPorClave(morosos[i]) || unidades[i * 17];
      if (casa) notas.push({ id: 'not_' + (i + 1), unidadId: casa.id, fecha: n[1], tipo: n[0], texto: n[2] });
    });

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
      documentos: documentosEjemplo(hoy),
      reglamento: reglamentoEjemplo(),
      meta: {
        demo: true, folioRecibo: 2,
        creado: new Date().toISOString(), actualizado: new Date().toISOString()
      }
    };
  }

  return { construir: construir, vacio: vacio };
})();
