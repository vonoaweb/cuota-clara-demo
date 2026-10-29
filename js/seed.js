/* seed.js — datos de ejemplo y estructura vacía.
 *
 * El ejemplo es un condominio horizontal de 150 casas en cinco calles
 * internas, del tamaño y con los costos de un fraccionamiento privado en
 * Guadalajara. Todo es inventado: la aplicación lo marca como ejemplo en
 * pantalla y se borra en cuanto se captura el primer dato real.
 */
window.CC = window.CC || {};

CC.Seed = (function () {

  /* Cada cliente puede traer su propio condominio de ejemplo en js/perfil.js
     (nombre, calles, presupuesto, canchas…). Lo que el perfil no diga se toma
     de aquí: Privada Los Fresnos, el ejemplo original. */
  var P = CC.Perfil || {};

  /* --- Traza del condominio: cinco calles, treinta casas cada una --- */
  var CALLES = P.calles || [
    'Circuito Fresnos',
    'Privada Encino',
    'Andador Nogal',
    'Paseo del Roble',
    'Retorno Jacaranda'
  ];
  var CASAS_POR_CALLE = P.casasPorCalle || 30;

  /* Tres prototipos de casa. El metraje define el indiviso y con él la cuota. */
  var PROTOTIPOS = P.prototipos || [
    { tipo: 'A', m2: 120, peso: 47 },
    { tipo: 'B', m2: 145, peso: 37 },
    { tipo: 'C', m2: 180, peso: 16 }
  ];

  /* Presupuesto mensual de egresos. Suma 163,000. */
  var CATEGORIAS = P.categorias || [
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

  var PRESUPUESTO_MENSUAL = P.presupuestoMensual || 180000;  // ingreso objetivo por cuotas
  var CUOTA_EXTRA = P.cuotaExtra !== undefined ? P.cuotaExtra : 1200;                     // derrama acordada en asamblea
  var CONCEPTO_EXTRA = P.conceptoExtra || 'Cuota extraordinaria — repavimentación de vialidades';
  var N_PERIODOS = 4;

  /* Versión del condominio de ejemplo. Al subirla, a quien abrió el demo antes
     se le vuelve a sembrar con los datos nuevos en lugar de dejarle los viejos.
     Solo afecta a los datos de ejemplo: lo que alguien capturó de verdad
     (meta.demo === false) nunca se toca. */
  var SEMILLA = P.semilla || 6;   // … 5 = banco y caja chica, egresos con folio · 6 = egresos con quién autorizó y revisión
  // Los correos inventados de los vecinos; el demo para enseñar usa example.com, que no es de nadie
  var DOMINIO_CORREO = P.dominioCorreo || 'correo.mx';

  /* Casa de prueba (opcional, la trae el perfil): debe desde hace cuatro meses, así
     sale primero en Adeudos y en "Enviar avisos", y el Panel muestra "Pruébalo en
     vivo" para mandarle el aviso a su WhatsApp. Por omisión no hay ninguna: los
     demos son públicos y no deben llevar teléfonos reales (Fernando, 27-oct-2026). */
  var CASA_PRUEBA = P.casaPrueba || null;
  if (CASA_PRUEBA) CASA_PRUEBA.prueba = true;

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
    return Object.assign({
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
    }, P.condominio || {}, { presupuestoMensual: PRESUPUESTO_MENSUAL });
  }

  /* --- Reglamento interno: el articulado que rige la convivencia --- */
  function reglamentoEjemplo() {
    var r = reglamentoBase();
    if (P.capitulosExtra && P.capitulosExtra.length) {
      var sanciones = r.capitulos.pop();
      r.capitulos = r.capitulos.concat(P.capitulosExtra, [sanciones]);
    }
    return r;
  }

  function reglamentoBase() {
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

  function aHoraSeed(min) { return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }

  /** '2026-11' -> '1 de noviembre': para que la asamblea de ejemplo siempre sea la próxima. */
  function primerDomingo(periodo) {
    var a = periodo.split('-');
    var d = new Date(Number(a[0]), Number(a[1]) - 1, 1);
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    return d.getDate() + ' de ' + CC.fmt.meses[d.getMonth()];
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
        return { id: CC.Store.nuevoId('cat'), nombre: x[0], presupuesto: 0, proveedor: '', grupo: x[3] || 'variable' };
      }),
      recibos: [],
      notas: [],
      difusiones: [],
      documentos: [],
      reglamento: { titulo: 'Reglamento Interno', aprobado: '', nota: '', capitulos: [] },
      convenios: [],
      avisosAdeudo: [],
      cajaChica: [],
      amenidades: (P.amenidades || []).map(function (a) { return Object.assign({}, a); }),
      reservas: [],
      visitas: [],
      meta: {
        demo: false, folioRecibo: 0, folioPago: 0, folioCaja: 0, folioConvenio: 0,
        creado: new Date().toISOString(), actualizado: new Date().toISOString()
      }
    };
  }

  /**
   * Con lo que arranca el programa de un condominio real (perfil con produccion):
   * sus reglas, que dijeron en la reunión (cuota, día de pago, recargos), y nada
   * inventado. Lo demás lo capturan ellos en Primeros pasos.
   */
  function condominioInicial() {
    var c = P.condominio || {};
    return {
      nombre: c.nombre || '', ciudad: c.ciudad || '',
      diaVencimiento: c.diaVencimiento || 10,
      recargoModo: c.recargoModo || 'ninguno',
      recargoTramos: c.recargoTramos || [],
      tasaMoraMensual: c.tasaMoraMensual || 0,
      fondoReservaPct: 0, mesesGratisAnualidad: 0,
      registroVisitas: !!c.registroVisitas,
      presupuestoMensual: 0, saldoInicialCaja: 0,
      cuotaCasa: P.cuotaFija || 0,
      casasPrevistas: P.calles && P.calles.length === 1 ? (P.casasPorCalle || 0) : 0
    };
  }

  function construir() {
    // copia local: construir() puede llamarse más de una vez (restaurar el ejemplo)
    var casaPrueba = CASA_PRUEBA ? Object.assign({}, CASA_PRUEBA) : null;
    var hoy = CC.per.hoy();
    var periodos = CC.per.ultimos(hoy, N_PERIODOS);
    var periodoExtra = periodos[1];              // la derrama cayó hace dos meses
    var cond = condominioEjemplo();
    var azar = rng(P.id || 'losfresnos150');

    /* --- Las 150 casas --- */
    var unidades = [];
    var corrido = 0;
    CALLES.forEach(function (calle, ci) {
      var casasCalle = Array.isArray(CASAS_POR_CALLE) ? CASAS_POR_CALLE[ci] : CASAS_POR_CALLE;
      for (var n = 1; n <= casasCalle; n++) {
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

        corrido++;
        // "Fresnos 12", o "Casa 12" si el condominio numera sus casas de corrido
        var clave = P.formatoClave ? P.formatoClave.replace('{n}', corrido) : calle.split(' ').pop() + ' ' + n;
        var tel = function () { return '33 ' + (1000 + Math.floor(azar() * 8999)) + ' ' + (1000 + Math.floor(azar() * 8999)); };
        var sinTel = azar() < 0.05, sinMail = azar() < 0.08;   // como en la vida real: hay casas sin datos
        unidades.push({
          id: P.formatoClave ? 'uni_casa_' + corrido : 'uni_' + sinAcentos(calle.split(' ').pop()) + '_' + n,
          clave: clave,
          calle: calle,
          numero: P.formatoClave ? corrido : n,
          prototipo: proto.tipo,
          m2: proto.m2,
          cuotaOverride: P.cuotaFija || null,
          propietario: propietario,
          inquilino: inquilino,
          telefono: sinTel ? '' : tel(),
          email: sinMail ? '' : sinAcentos(nombre) + '.' + sinAcentos(ap1) + (ci * 30 + n) + '@' + DOMINIO_CORREO,
          telInquilino: inquilino ? tel() : '',
          emailInquilino: inquilino ? sinAcentos(inquilino.split(' ')[0]) + '.' + sinAcentos(inquilino.split(' ').pop()) + corrido + '@' + DOMINIO_CORREO : '',
          referencia: String(100000 + corrido * 7 + 3),
          ocupacion: rentada ? 'Rentada' : (desocupada ? 'Desocupada' : 'Propietario')
        });
      }
    });
    if (casaPrueba) {
      // La casa de prueba puede ser una que ya existe (la 107, por ejemplo) o una de más
      var misma = casaPrueba.reemplaza && unidades.filter(function (u) { return u.numero === casaPrueba.numero; })[0];
      if (misma) {
        Object.assign(misma, {
          propietario: casaPrueba.propietario, inquilino: null, telefono: casaPrueba.telefono,
          email: casaPrueba.email || '', telInquilino: '', emailInquilino: '', ocupacion: 'Propietario', prueba: true
        });
        casaPrueba = misma;
      } else {
        unidades.push(Object.assign({}, casaPrueba));
      }
    }

    var totalM2 = unidades.reduce(function (a, u) { return a + u.m2; }, 0);
    unidades.forEach(function (u) {
      u._cuota = u.cuotaOverride || Math.round((u.m2 / totalM2) * PRESUPUESTO_MENSUAL);
    });

    var categorias = CATEGORIAS.map(function (x) {
      return {
        id: 'cat_' + sinAcentos(x[0]).slice(0, 12),
        nombre: x[0], presupuesto: x[1], proveedor: x[2],
        grupo: x[3] || (x[1] > 0 ? 'fijo' : 'variable'),
        soloCaja: x[4] === 'caja'   // se paga en efectivo desde la caja chica (gastosCaja)
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
    if (casaPrueba) {
      adeudos[casaPrueba.clave] = 4;
      delete pendientesMes[casaPrueba.clave];
    }

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
      if (p === periodoExtra && CUOTA_EXTRA > 0) {
        unidades.forEach(function (u) {
          cargos.push({
            id: 'carx_' + u.id + '_' + p,
            unidadId: u.id, periodo: p, tipo: 'extraordinaria',
            concepto: CONCEPTO_EXTRA,
            monto: CUOTA_EXTRA, fechaVence: vence
          });
        });
      }
    });

    // A la casa de prueba se le suma una multa: así encabeza la lista de adeudos
    if (casaPrueba) cargos.push({
      id: 'carm_prueba', unidadId: casaPrueba.id, periodo: periodos[1], tipo: 'multa',
      concepto: 'Multa por ruido después de las 23:00 (reglamento interno)',
      monto: 500, fechaVence: CC.per.vence(periodos[1], cond.diaVencimiento)
    });

    /* --- Pagos --- */
    var pagos = [];
    var metodos = P.metodosPago || ['Transferencia', 'Transferencia', 'Transferencia', 'Depósito', 'Efectivo'];
    var diaHoy0 = Number(CC.per.hoyISO().slice(8, 10));
    // Con recargos por tramos, casi todos pagan a tiempo y los que no, pagan su recargo
    var tramosSeed = cond.recargoModo === 'tramos'
      ? (cond.recargoTramos || []).slice().sort(function (a, b) { return a.dia - b.dia; }) : [];
    var diaLimite = tramosSeed.length ? tramosSeed[0].dia - 1 : null;
    function recargoSeed(dia) {
      var m = 0;
      tramosSeed.forEach(function (t) { if (dia >= t.dia) m = t.monto; });
      return m;
    }
    periodos.forEach(function (p, idx) {
      var desdeElFinal = N_PERIODOS - idx;   // 4 = el más viejo, 1 = el mes en curso
      unidades.forEach(function (u) {
        if ((adeudos[u.clave] || 0) >= desdeElFinal) return;
        if (p === hoy && pendientesMes[u.clave]) return;
        var monto = u._cuota + (p === periodoExtra ? CUOTA_EXTRA : 0);
        var dia = diaLimite
          ? (azar() < 0.84 ? 1 + Math.floor(azar() * diaLimite) : diaLimite + 1 + Math.floor(azar() * 16))
          : Math.min(2 + Math.floor(azar() * 12), 28);
        if (p === hoy) dia = Math.max(1, Math.min(dia, diaHoy0));   // nadie paga en el futuro
        var rec = tramosSeed.length ? recargoSeed(dia) : 0;
        if (rec) {
          cargos.push({
            id: 'rcg_' + u.id + '_' + p, unidadId: u.id, periodo: p, tipo: 'recargo',
            de: 'car_' + u.id + '_' + p, auto: true, concepto: 'Recargo por pago tardío ' + CC.fmt.periodo(p),
            monto: rec, fechaVence: CC.per.vence(p, cond.diaVencimiento)
          });
        }
        var metodo = metodos[Math.floor(azar() * metodos.length)];
        pagos.push({
          id: 'pag_' + u.id + '_' + p,
          unidadId: u.id, periodo: p,
          fecha: p + '-' + String(dia).padStart(2, '0'),
          monto: monto + rec,
          metodo: metodo,
          cuenta: metodo === 'Efectivo' ? 'caja' : 'banco',
          referencia: metodo === 'Efectivo' ? '' : String(400000 + Math.floor(azar() * 599999)),
          nota: rec ? 'Incluye recargo de ' + CC.fmt.money(rec) : ''
        });
      });
    });

    /* --- Pagos adelantados: casas que pagaron la anualidad en julio --- */
    if (P.anualidad) {
      var gratis = P.anualidad.mesesGratis || 0;
      var vence0 = function (per) { return CC.per.vence(per, cond.diaVencimiento); };
      unidades.forEach(function (u, i) {
        if (u.prueba || i % (P.anualidad.cada || 11) !== 4) return;
        if (adeudos[u.clave] || pendientesMes[u.clave]) return;
        // fuera sus pagos de mes con mes
        pagos = pagos.filter(function (x) { return x.unidadId !== u.id; });
        // las cuotas que faltan para completar doce meses, con la última bonificada
        for (var k = N_PERIODOS; k < 12; k++) {
          var per = CC.per.suma(periodos[0], k), bon = k >= 12 - gratis;
          cargos.push({
            id: 'cara_' + u.id + '_' + per, unidadId: u.id, periodo: per, tipo: 'cuota',
            concepto: 'Cuota de mantenimiento ' + CC.fmt.periodo(per) + (bon ? ' — bonificada por pago anual' : ''),
            monto: bon ? 0 : u._cuota, fechaVence: vence0(per)
          });
        }
        var fin = CC.per.suma(periodos[0], 11);
        pagos.push({
          id: 'pag_anual_' + u.id, unidadId: u.id, periodo: periodos[0],
          fecha: periodos[0] + '-05', monto: u._cuota * (12 - gratis),
          metodo: 'Transferencia', referencia: String(810000 + i),
          nota: 'Anualidad ' + CC.fmt.periodoCorto(periodos[0]) + ' – ' + CC.fmt.periodoCorto(fin) +
            (gratis ? ': 12 meses por el precio de ' + (12 - gratis) : '')
        });
        pagos.push({
          id: 'pag_extra_' + u.id, unidadId: u.id, periodo: periodoExtra,
          fecha: periodoExtra + '-08', monto: CUOTA_EXTRA,
          metodo: 'Transferencia', referencia: String(820000 + i), nota: 'Cuota extraordinaria'
        });
      });
    }

    /* --- Gastos: los servicios del condominio, mes con mes --- */
    var gastos = [];
    var pendientesMesActual = ['Seguro del inmueble', 'Alberca', 'Administración'];
    periodos.forEach(function (p) {
      categorias.forEach(function (cat, ci) {
        if (cat.soloCaja || !(cat.presupuesto > 0)) return;
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
          cuenta: 'banco',
          folio: 'F-' + p.replace('-', '') + '-' + String(100 + ci),
          referencia: pendiente ? '' : 'SPEI ' + String(5000000 + Math.floor(azar() * 4999999))
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
      cuenta: 'banco',
      folio: 'F-' + periodos[2].replace('-', '') + '-201'
    });

    /* --- Avisos --- */
    var avisos = [
      {
        id: 'avi_1', fecha: hoy + '-15',
        titulo: 'Asamblea ordinaria: domingo ' + primerDomingo(CC.per.suma(hoy, 1)) + ', 10:00 h',
        cuerpo: 'Se revisará el cierre financiero del trimestre, ' + (P.temaAsamblea || 'el avance de la repavimentación') + ' y la propuesta de cuota para 2027.\nEl orden del día y el estado de cuenta del condominio están disponibles en el portal.',
        prioridad: 'alta'
      },
      {
        id: 'avi_2', fecha: hoy + '-08',
        titulo: P.avisoObra ? P.avisoObra.titulo : 'Repavimentación: ' + CALLES[0] + ' cerrado del 28 al 30',
        cuerpo: P.avisoObra ? P.avisoObra.cuerpo : 'Los trabajos avanzan por etapas. Durante esos tres días el ' + CALLES[0] +
          ' quedará cerrado a la circulación y se habilitará el acceso por ' + CALLES[CALLES.length - 1] + '.\nPor favor saquen sus vehículos antes de las 7:00 h del día 28.',
        prioridad: 'media'
      },
      {
        id: 'avi_3', fecha: CC.per.suma(hoy, -1) + '-22',
        titulo: P.avisoHorario ? P.avisoHorario.titulo : 'Nuevo horario de la alberca',
        cuerpo: P.avisoHorario ? P.avisoHorario.cuerpo : 'A partir de este mes la alberca abre de 8:00 a 21:00 h todos los días. Se recuerda que los menores de doce años deben estar acompañados de un adulto.',
        prioridad: 'normal'
      }
    ];

    /* --- Pagos en mano con recibo firmado: son egresos de la caja chica --- */
    [
      [hoy + '-12', hoy, 'Salvador Ibarra Mendoza', 'INE 1234567890',
        'Poda de setos y limpieza de jardineras del acceso principal', 'Jardinería', 2800,
        'Trabajo extra fuera del contrato mensual, autorizado por el comité.', 0],
      [CC.per.suma(hoy, -1) + '-26', CC.per.suma(hoy, -1), 'Jorge Alberto Ramírez Solís', 'INE 0987654321',
        'Reparación de fuga en la toma general de ' + CALLES[2 % CALLES.length], 'Mantenimiento y bombas', 1650, '', 1]
    ].forEach(function (r, i) {
      if (r[1] === hoy && Number(r[0].slice(8, 10)) > diaHoy0) return;
      gastos.push({
        id: 'gas_rec_' + (i + 1), periodo: r[1], fecha: r[0], categoria: r[5], proveedor: r[2],
        concepto: r[4], monto: r[6], estado: 'pagado', metodo: 'Efectivo', cuenta: 'caja', folio: '',
        referencia: '', recibo: true, identificacion: r[3], firmaInline: firmaEjemplo(TRAZOS[r[8]]), nota: r[7]
      });
    });

    /* --- Bitácora: notas sobre casas concretas --- */
    // la casa de prueba queda fuera de notas, convenios y avisos ya enviados
    var morosos = Object.keys(adeudos).filter(function (k) { return !casaPrueba || k !== casaPrueba.clave; });
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

    /* --- Lo que debía una casa al cierre de un periodo --- */
    function deudaAl(u, hasta) {
      var cargado = cargos.filter(function (c) { return c.unidadId === u.id && c.periodo <= hasta; })
        .reduce(function (a, c) { return a + c.monto; }, 0);
      var pagado = pagos.filter(function (x) { return x.unidadId === u.id && x.periodo <= hasta; })
        .reduce(function (a, x) { return a + x.monto; }, 0);
      return Math.round((cargado - pagado) * 100) / 100;
    }

    /* --- Convenios de pago: uno al día y uno atrasado --- */
    var graves = morosos.filter(function (k, i) { return i > 0 && adeudos[k] >= 3; });
    var convenios = [];
    [
      // [casa, periodo en que se firmó, día, parcialidades, día del primer pago]
      [graves[graves.length - 1], periodos[2], 20, 4, 28],
      [graves[Math.floor(graves.length / 2)], periodos[1], 15, 3, 20]
    ].forEach(function (d, i) {
      var casa = casaPorClave(d[0]);
      if (!casa) return;
      var adeudo = deudaAl(casa, d[1]);
      if (!(adeudo > 0)) return;
      var monto = Math.floor((adeudo / d[3]) * 100) / 100;
      var cv = {
        id: 'cnv_' + (i + 1), folio: i + 1, unidadId: casa.id,
        fecha: d[1] + '-' + String(d[2]).padStart(2, '0'),
        adeudo: adeudo, parcialidades: d[3], monto: monto, cada: 'mes',
        primera: d[1] + '-' + String(d[4]).padStart(2, '0'),
        detalle: 'por cuotas de mantenimiento pendientes',
        nota: 'Aprobado por el comité.', estado: 'activo', registrado: new Date().toISOString()
      };
      convenios.push(cv);
      // la primera parcialidad ya se pagó
      pagos.push({
        id: 'pag_cnv_' + (i + 1), unidadId: casa.id, periodo: d[1], fecha: cv.primera,
        monto: monto, metodo: 'Transferencia', referencia: String(700100 + i * 37),
        convenioId: cv.id, nota: ''
      });
      notas.push({
        id: 'not_cnv_' + (i + 1), unidadId: casa.id, fecha: cv.fecha, tipo: 'gestion',
        texto: 'Convenio de pago CV-000' + (i + 1) + ': $' + adeudo.toFixed(2) + ' en ' + d[3] +
          ' parcialidades. Firmó en la administración.'
      });
    });
    var enConvenio = {};
    convenios.forEach(function (cv) { enConvenio[cv.unidadId] = 1; });

    /* --- Avisos de adeudo ya enviados: a unas casas hace poco, a otras hace semanas --- */
    var avisosAdeudo = [];
    var hoyISO = CC.per.hoyISO();
    morosos.forEach(function (k, i) {
      var casa = casaPorClave(k);
      if (!casa || enConvenio[casa.id] || i % 3 === 2) return;
      var reciente = i % 3 === 0;
      avisosAdeudo.push({
        id: 'ava_' + i, unidadId: casa.id,
        canal: reciente ? 'whatsapp' : 'correo',
        fecha: CC.per.masDias(hoyISO, reciente ? -3 : -12) + 'T10:' + String(10 + i % 40).padStart(2, '0') + ':00',
        saldo: deudaAl(casa, reciente ? hoy : periodos[2]),
        meses: adeudos[k]
      });
    });

    /* --- Caja chica: lo que se cobra y se paga en efectivo ---
       Las cuotas pagadas en efectivo entran a la caja; de ahí salen los gastos
       menores (el pago semanal a los de la basura, el agua de la caseta). Al cerrar
       el mes, lo que sobró se deposita al banco con un traspaso. */
    var diaHoy = diaHoy0;
    var recolector = 'Juan Carlos Medina Ruiz';
    var GASTOS_CAJA = P.gastosCaja || [
      // [días del mes, concepto, categoría, monto, quién recibe, nota]
      [[3, 10, 17, 24], 'Pago semanal a recolectores de basura', 'Recolección de basura', 400, recolector, 'Camión municipal, ruta 14'],
      [[5], 'Garrafones de agua para caseta', 'Limpieza', 165, 'Purificadora La Gota', ''],
      [[19], P.limpiezaCaja || 'Material de limpieza para el salón', 'Limpieza', 386.5, 'Abarrotes Doña Mary', ''],
      [[26], 'Copias del reglamento para la asamblea', 'Administración', 240, P.papeleria || 'Papelería Escolar Tlajomulco', '']
    ];
    var ingresos = [], traspasos = [];
    function casaN(n) { return unidades[n % unidades.length]; }
    [periodos[2], periodos[3]].forEach(function (per, k) {
      var esActual = per === hoy;
      GASTOS_CAJA.forEach(function (g, gi) {
        g[0].forEach(function (d, di) {
          if (esActual && d > diaHoy) return;
          if (k === 0 && gi >= 2 && di > 0) return;
          gastos.push({
            id: 'gas_caja_' + per + '_' + gi + '_' + di, periodo: per, fecha: per + '-' + String(d).padStart(2, '0'),
            categoria: g[2], proveedor: g[4], concepto: g[1], monto: g[3], estado: 'pagado',
            metodo: 'Efectivo', cuenta: 'caja', folio: '', referencia: '', recibo: true,
            identificacion: g[4] === recolector ? 'INE 2468013579' : '',
            firmaInline: firmaEjemplo(TRAZOS[(gi + di) % 2]), nota: g[5]
          });
        });
      });
      // un ingreso en efectivo que no es cuota: la venta de una tarjeta de acceso
      if (!esActual || diaHoy >= 8) {
        var cs = casaN(37 + k * 41);
        ingresos.push({
          id: 'ing_' + per, folio: 0, periodo: per, fecha: per + '-08', cuenta: 'caja',
          concepto: 'Venta de tarjeta de acceso', categoria: 'Tarjetas de acceso',
          nombre: cs.inquilino || cs.propietario, unidadId: cs.id, monto: 350, metodo: 'Efectivo', nota: ''
        });
      }
    });

    /* --- Reservas de áreas comunes (las canchas de tenis, si el perfil las trae) --- */
    var amenidades = (P.amenidades || []).map(function (a) { return Object.assign({}, a); });
    var reservas = [];
    if (amenidades.length) {
      var bloqueadas = {};   // las casas con tres o más meses vencidos no apartan
      Object.keys(adeudos).forEach(function (k) { if (adeudos[k] >= 3) bloqueadas[k] = 1; });
      var jugadores = unidades.filter(function (u) { return !bloqueadas[u.clave] && !u.prueba; });
      var lunes = CC.per.masDias(hoyISO, -((new Date(hoyISO + 'T12:00:00').getDay() + 6) % 7));
      var nRes = 0;
      for (var dia = -7; dia < 14; dia++) {
        var fecha = CC.per.masDias(lunes, dia);
        var finde = [0, 6].indexOf(new Date(fecha + 'T12:00:00').getDay()) >= 0;
        var horasBuenas = finde ? [7, 8, 9, 10, 11, 17, 18] : [7, 8, 19, 20, 21];
        amenidades.forEach(function (a) {
          if (a.tipo === 'club') {
            // eventos de fin de semana: una reunión por la tarde
            if (!finde || azar() > (dia < 7 ? 0.7 : 0.45)) return;
            var uc = jugadores[Math.floor(azar() * jugadores.length)];
            var eventos = ['Cumpleaños', 'Reunión familiar', 'Bautizo', 'Junta de vecinos de la calle', 'Fiesta infantil'];
            reservas.push({
              id: 'res_' + (++nRes), amenidadId: a.id, unidadId: uc.id,
              fecha: fecha, hora: azar() < 0.5 ? '14:00' : '16:00', horas: Math.min(Number(a.maxHorasDia) || 5, 5),
              nombre: eventos[Math.floor(azar() * eventos.length)], nota: '',
              estado: 'confirmada', registrado: new Date().toISOString()
            });
            return;
          }
          horasBuenas.forEach(function (h) {
            var lleno = dia < 7 ? (finde ? 0.8 : 0.55) : 0.3;   // la semana que entra todavía tiene lugar
            if (azar() > lleno) return;
            var u = jugadores[Math.floor(azar() * jugadores.length)];
            reservas.push({
              id: 'res_' + (++nRes), amenidadId: a.id, unidadId: u.id,
              fecha: fecha, hora: String(h).padStart(2, '0') + ':00', horas: 1,
              nombre: (u.inquilino || u.propietario).split(' ')[0] + ' y acompañante',
              nota: '', estado: 'confirmada', registrado: new Date().toISOString()
            });
          });
        });
      }
    }

    /* --- Registro de visitas en la caseta --- */
    var visitas = [];
    if (P.registroVisitas) {
      var tipos = [
        ['Visita', 45], ['Paquetería', 20], ['Servicio doméstico', 13], ['Proveedor', 10], ['Taxi o app', 12]
      ];
      var letras = 'ABCDEFGHJKLMNPRSTUVWXYZ';
      var placas = function () {
        return 'J' + letras[Math.floor(azar() * letras.length)] + letras[Math.floor(azar() * letras.length)] + '-' +
          (100 + Math.floor(azar() * 899)) + '-' + letras[Math.floor(azar() * letras.length)];
      };
      var proveedores = ['Plomería Hernández', 'Gas Express Nieto', 'Fumigaciones del Valle', 'Jardinería Los Pinos', 'Técnico de internet'];
      var ahora = new Date(), minAhora = ahora.getHours() * 60 + ahora.getMinutes();
      var nVis = 0;
      for (var dv = -6; dv <= 0; dv++) {
        var fv = CC.per.masDias(hoyISO, dv);
        var cuantas = 14 + Math.floor(azar() * 10);
        for (var q = 0; q < cuantas; q++) {
          var t = azar() * 100, acu = 0, tipo = tipos[0][0];
          for (var w = 0; w < tipos.length; w++) { acu += tipos[w][1]; if (t <= acu) { tipo = tipos[w][0]; break; } }
          var casaV = unidades[Math.floor(azar() * unidades.length)];
          var ent = 7 * 60 + Math.floor(azar() * 14 * 60);
          var dur = tipo === 'Paquetería' || tipo === 'Taxi o app' ? 5 + Math.floor(azar() * 10)
            : tipo === 'Servicio doméstico' ? 300 + Math.floor(azar() * 180) : 30 + Math.floor(azar() * 180);
          if (dv === 0 && ent > minAhora) continue;           // todavía no llega
          var sale = ent + dur;
          var dentro = dv === 0 && sale > minAhora;
          var nombreV = tipo === 'Paquetería' ? 'Repartidor de paquetería'
            : tipo === 'Taxi o app' ? 'Conductor de app'
            : tipo === 'Proveedor' ? proveedores[Math.floor(azar() * proveedores.length)]
            : NOMBRES[Math.floor(azar() * NOMBRES.length)] + ' ' + APELLIDOS[Math.floor(azar() * APELLIDOS.length)];
          visitas.push({
            id: 'vis_' + (++nVis), fecha: fv, tipo: tipo, nombre: nombreV, unidadId: casaV.id,
            entrada: aHoraSeed(ent), salida: dentro ? null : aHoraSeed(Math.min(sale, 23 * 60 + 50)),
            estado: dentro ? 'dentro' : 'salio',
            placas: tipo === 'Paquetería' || azar() < 0.35 ? '' : placas(),
            personas: tipo === 'Visita' ? 1 + Math.floor(azar() * 3) : 1,
            aviso: azar() < 0.4 ? 'Portal del residente' : 'Caseta', nota: ''
          });
        }
      }
      // las que la casa avisó que vienen, hoy más tarde y mañana
      [[0, '18:30', 'Visita'], [0, '20:00', 'Visita'], [1, '09:00', 'Proveedor'], [1, '17:00', 'Visita']].forEach(function (e) {
        var fe = CC.per.masDias(hoyISO, e[0]);
        if (e[0] === 0 && Number(e[1].slice(0, 2)) * 60 < minAhora) return;
        var casaE = unidades[Math.floor(azar() * unidades.length)];
        visitas.push({
          id: 'vis_' + (++nVis), fecha: fe, horaAprox: e[1], tipo: e[2],
          nombre: e[2] === 'Proveedor' ? proveedores[Math.floor(azar() * proveedores.length)]
            : NOMBRES[Math.floor(azar() * NOMBRES.length)] + ' ' + APELLIDOS[Math.floor(azar() * APELLIDOS.length)],
          unidadId: casaE.id, entrada: null, salida: null, estado: 'esperada',
          placas: azar() < 0.5 ? placas() : '', personas: 1 + Math.floor(azar() * 2),
          aviso: 'Portal del residente', nota: ''
        });
      });
    }

    /* --- La casa club se renta por evento: la renta va al estado de cuenta y se paga --- */
    reservas.forEach(function (r) {
      var a = amenidades.filter(function (x) { return x.id === r.amenidadId; })[0];
      var u = unidades.filter(function (x) { return x.id === r.unidadId; })[0];
      if (!a || !u || !(Number(a.costo) > 0) || r.fecha >= hoyISO) return;
      if (adeudos[u.clave] || pendientesMes[u.clave]) return;
      var per = r.fecha.slice(0, 7);
      cargos.push({
        id: 'carc_' + r.id, unidadId: u.id, periodo: per, tipo: 'casaclub', reservaId: r.id,
        concepto: 'Renta de ' + a.nombre.toLowerCase() + ' — ' + (r.nombre || 'evento') + ', ' + CC.fmt.fecha(r.fecha),
        monto: Number(a.costo), fechaVence: r.fecha
      });
      pagos.push({
        id: 'pagc_' + r.id, unidadId: u.id, periodo: per, fecha: r.fecha, monto: Number(a.costo),
        metodo: 'Efectivo', cuenta: 'caja', referencia: '', nota: 'Renta de ' + a.nombre.toLowerCase()
      });
    });

    /* --- Fin de mes: el efectivo que sobró en la caja se deposita al banco --- */
    var nIng = 0;
    ingresos.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }).forEach(function (i) { i.folio = ++nIng; });
    var nTra = 0, saldoCaja = 0;
    periodos.forEach(function (per) {
      if (per === hoy) return;
      var entra = pagos.filter(function (x) { return x.cuenta === 'caja' && x.fecha.slice(0, 7) === per; })
        .reduce(function (a, x) { return a + x.monto; }, 0) +
        ingresos.filter(function (x) { return x.periodo === per; }).reduce(function (a, x) { return a + x.monto; }, 0);
      var sale = gastos.filter(function (x) { return x.cuenta === 'caja' && x.periodo === per && x.estado === 'pagado'; })
        .reduce(function (a, x) { return a + x.monto; }, 0);
      saldoCaja += entra - sale;
      var deposito = Math.round(saldoCaja * 100) / 100;
      if (deposito > 0) {
        traspasos.push({
          id: 'tra_' + per, folio: ++nTra, periodo: per, fecha: CC.per.vence(per, 31), de: 'caja', a: 'banco',
          monto: deposito, referencia: 'Ficha de depósito ' + (731000 + nTra * 17), nota: 'Depósito del efectivo de ' + CC.fmt.periodo(per).toLowerCase()
        });
        saldoCaja -= deposito;
      }
    });

    unidades.forEach(function (u) { delete u._cuota; });

    /* --- Quién autorizó cada egreso y la revisión del comité (la de los meses
       cerrados ya se hizo; la del mes en curso está pendiente) --- */
    gastos.forEach(function (g) {
      g.autorizo = g.monto >= 5000 ? 'Presidente del comité' : 'Administración';
      if (g.periodo < hoy && g.estado === 'pagado') {
        g.revision = { nombre: 'Tesorero del comité', fecha: CC.per.vence(CC.per.suma(g.periodo, 1), 4) + 'T19:00:00.000Z' };
      }
    });

    return {
      version: 1,
      condominio: cond,
      unidades: unidades,
      cargos: cargos,
      pagos: pagos,
      gastos: gastos,
      avisos: avisos,
      categorias: categorias,
      recibos: [],
      notas: notas,
      difusiones: [],
      documentos: documentosEjemplo(hoy),
      reglamento: reglamentoEjemplo(),
      convenios: convenios,
      avisosAdeudo: avisosAdeudo,
      cajaChica: [],
      cuentas: [
        { id: 'banco', nombre: 'Banco', saldoInicial: cond.saldoInicialCaja || 0 },
        { id: 'caja', nombre: 'Caja chica', saldoInicial: 0 }
      ],
      ingresos: ingresos,
      traspasos: traspasos,
      amenidades: amenidades,
      reservas: reservas,
      visitas: visitas,
      meta: {
        demo: true, semilla: SEMILLA, folioRecibo: 0,
        folioConvenio: convenios.length, folioIngreso: nIng, folioTraspaso: nTra,
        creado: new Date().toISOString(), actualizado: new Date().toISOString()
      }
    };
  }

  return { construir: construir, vacio: vacio, condominioInicial: condominioInicial, SEMILLA: SEMILLA };
})();
