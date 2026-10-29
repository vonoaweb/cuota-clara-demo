/* views/ayuda.js — Ayuda y manual: dónde está cada cosa y cómo se usa.
 *
 * Fernando, 29-oct-2026: "pdf cómo funciona e instrucciones… intenta mejorar UX…
 * dónde está cada cosa". El mismo texto sale aquí, en la pantalla, y en el manual
 * en PDF (manual/, que se arma con estos datos: CC.Ayuda). Cada pantalla tiene su
 * botón "Ayuda" arriba a la derecha que abre su parte.
 */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

CC.Ayuda = {
  /* Lo que más se busca: qué quiero hacer → dónde está */
  donde: [
    ['Dar de alta el condominio, las casas y los usuarios', 'Primeros pasos (en el menú, hasta arriba)'],
    ['Registrar que alguien pagó', 'Botón «Registrar pago» en Panel, Cobranza o dentro de la casa'],
    ['Ver cuánto debe una casa y mandarle su estado de cuenta', 'Casas → toca la casa → «Estado de cuenta PDF»'],
    ['Avisar por WhatsApp o correo a quien debe', 'Adeudos → «Enviar avisos»'],
    ['Hacer un convenio de pago en parcialidades', 'Adeudos → botón «Convenio» en el renglón de la casa'],
    ['Cobrar la renta de la casa club o una multa', 'Casas → la casa → «Cargo extra»'],
    ['Registrar un gasto con su comprobante', 'Egresos → «Registrar egreso»'],
    ['Pagarle en efectivo a alguien y que firme de recibido', 'Egresos → «Con recibo firmado»'],
    ['Revisar los egresos del mes (comité)', 'Egresos → «Revisar egresos»'],
    ['Contar la caja chica', 'Banco y caja → «Arqueo de caja» (o el atajo del Panel)'],
    ['Depositar al banco lo que sobró de la caja chica', 'Banco y caja → «Traspaso»'],
    ['Cuadrar con el estado de cuenta del banco', 'Banco y caja → «Conciliar con el banco»'],
    ['Cancelar un pago mal capturado', 'Cobranza → la ✕ junto al pago (pide el motivo; el folio se queda)'],
    ['Corregir o cancelar un egreso', 'Egresos → «Corregir» en el renglón'],
    ['Ver si falta algún folio o quién hizo algo', 'Folios y bitácora'],
    ['Revisar un recibo en papel', 'Folios y bitácora → «Buscar un folio»'],
    ['Cerrar el mes (comité)', 'Reportes y cierre → «Cerrar el mes»'],
    ['Cambio de administradora', 'Reportes y cierre → «Entrega-recepción»'],
    ['Cambiar la cuota, los recargos o poner el logo', 'Ajustes'],
    ['Agregar un usuario o cambiar una contraseña', 'Ajustes → Usuarios y contraseñas'],
    ['Guardar un respaldo en una memoria USB', 'Ajustes → «Guardar base de datos»'],
    ['Pantalla clara u oscura, letra más grande', 'Abajo en el menú (Claro · Oscuro · Auto) o Ajustes → Pantalla']
  ],

  /* Las reglas que cuidan el dinero (lo que pidió la administración: "que no haya ninguna trampa") */
  reglas: [
    'Cada recibo, egreso, traspaso y convenio lleva un folio consecutivo que pone el sistema. Nadie lo escoge.',
    'Nada se borra. Lo que se cancela conserva su folio con el motivo, y lo que se corrige guarda lo que decía antes.',
    'Cada quien entra con su nombre y su contraseña. La bitácora anota quién registró, corrigió o canceló cada cosa, y no se puede borrar.',
    'Cada egreso dice quién lo autorizó y lleva la foto de su comprobante. El comité los revisa, y nadie revisa lo que capturó él mismo.',
    'Cuando el comité cierra un mes, lo de ese mes ya no se puede cambiar. Si hace falta, lo reabre escribiendo por qué, y queda anotado.',
    'Si cambia quien administra, se hace la entrega-recepción: un acta con los saldos, los folios y lo pendiente, firmada por los dos y el comité.',
    'Cada mes, un respaldo en una memoria USB que guarde el comité.'
  ],

  /* Pantalla por pantalla. id = la sección del menú (el botón Ayuda de cada pantalla abre la suya) */
  secciones: [
    {
      id: 'inicio', titulo: 'Primeros pasos', donde: 'Menú, hasta arriba (mientras falte algo)',
      para: 'Dar de alta el condominio la primera vez. El sistema empieza en blanco: sin casas ni nombres.',
      pasos: [
        'Datos del condominio: nombre, dirección, quién administra, la cuenta del banco y el logo.',
        'Cuota y recargos: cuánto paga cada casa, hasta qué día, los recargos y desde qué mes empiezan.',
        'Las casas: se crean de un jalón con su número (por ejemplo de la 1 a la 105). Luego se llena el dueño, teléfono y correo de cada una, de corrido o subiendo un Excel.',
        'Lo que debía cada casa: el adeudo que traen de CondoVive. Si alguna debe varios meses, se pone cuántos.',
        'Banco y caja chica: el saldo del banco y el efectivo de la caja ese día.',
        'Usuarios: uno de la administración y uno del comité, cada quien con su contraseña.',
        'Hoja de arranque: un PDF con todo lo capturado, para que lo firmen la administración y el comité.'
      ],
      ojo: 'Cada paso se puede corregir después con «Ver o corregir». El Excel de casas necesita una columna con el número de casa; las demás (dueño, teléfono, correo) las reconoce por su título.'
    },
    {
      id: 'panel', titulo: 'Panel', donde: 'Menú → Panel',
      para: 'Cómo va el mes de un vistazo y los atajos de todos los días.',
      pasos: [
        'Arriba están los atajos: registrar un pago, un egreso, avisar a quien debe, buscar una casa, contar la caja y revisar folios.',
        'Las cifras: lo que hay en banco y caja chica, lo cobrado del mes, lo que falta por cobrar y el resultado.',
        '«Quién falta de pagar»: toca cualquier renglón para abrir la casa.',
        'Arriba a la derecha se escoge el mes que se quiere ver (Periodo).'
      ]
    },
    {
      id: 'unidades', titulo: 'Casas', donde: 'Menú → Cobrar → Casas',
      para: 'El padrón: cada casa con su dueño, quién vive, teléfono, correo y lo que debe.',
      pasos: [
        'Busca por número o nombre; filtra por las que deben o las que no tienen teléfono o correo.',
        'Toca una casa para ver su estado de cuenta, su historial (pagos, cargos, avisos y notas) y sus botones.',
        'Dentro de la casa: «Registrar pago», «Cargo extra» (casa club, multa), «Avisar adeudo», «Anotar», «Estado de cuenta PDF» y «Editar».',
        'Para cambiar muchas casas a la vez: Primeros pasos → Las casas → «Ver o corregir».'
      ],
      ojo: 'Una casa con pagos no se puede eliminar: sus recibos llevan folio.'
    },
    {
      id: 'cobranza', titulo: 'Cobranza', donde: 'Menú → Cobrar → Cobranza',
      para: 'Las cuotas del mes y los pagos que llegan.',
      pasos: [
        'Al empezar el mes: «Generar cuotas» crea la cuota de cada casa (el botón dice cuántas faltan).',
        '«Registrar pago»: escoge la casa, palomea los meses que paga y el sistema suma el monto. Pon la forma de pago (efectivo va a la caja chica; transferencia, al banco).',
        'Al guardar sale su recibo con folio P-0001, P-0002…: se baja en PDF o se manda por WhatsApp.',
        'Si un pago se capturó mal: la ✕ del renglón lo cancela. Pide el motivo, el saldo de la casa se recalcula y el folio se queda tachado.'
      ],
      ojo: 'Los recargos se ponen solos según el día en que se paga (por ejemplo, del 6 al 17: $50; del 18 en adelante: $100).'
    },
    {
      id: 'adeudos', titulo: 'Adeudos', donde: 'Menú → Cobrar → Adeudos',
      para: 'Quién debe, desde cuándo, y avisarles.',
      pasos: [
        '«Enviar avisos» abre WhatsApp con el mensaje ya escrito para cada casa, con el desglose: mes, cuota y recargo.',
        'También se puede avisar por correo.',
        'Convenio de pago: el adeudo en parcialidades, con su PDF para firmar.'
      ],
      ojo: 'El envío es de un clic por casa: el sistema escribe el mensaje y WhatsApp lo manda.'
    },
    {
      id: 'gastos', titulo: 'Egresos', donde: 'Menú → Gastos y dinero → Egresos',
      para: 'Todo lo que sale: del banco o de la caja chica.',
      pasos: [
        '«Registrar egreso»: concepto, categoría, quién recibe el dinero, quién lo autorizó, monto, fecha, forma de pago y de qué cuenta sale. El folio (E-0001…) se pone solo.',
        'Toma la foto del comprobante (la nota, el ticket o la factura): sale en el recibo del egreso.',
        '«Con recibo firmado»: para lo que se paga en efectivo; quien recibe firma con el dedo o con el mouse y el recibo se baja al guardar.',
        '«Corregir»: cambia lo que haga falta; queda lo que decía antes. «Cancelar este egreso» lo deja sin efecto con su motivo.',
        '«Revisar egresos» (comité): se revisa cada uno con su comprobante y se palomean.'
      ],
      ojo: 'Si se corrige un egreso ya revisado, vuelve a quedar «sin revisar».'
    },
    {
      id: 'caja', titulo: 'Banco y caja', donde: 'Menú → Gastos y dinero → Banco y caja',
      para: 'Cuánto hay en el banco y en la caja chica, con cada movimiento.',
      pasos: [
        'Lo que se cobra en efectivo entra a la caja chica; lo que se paga en efectivo sale de ahí.',
        '«Traspaso»: lo que sobró de la caja se deposita al banco (con la ficha de depósito).',
        '«Arqueo de caja»: se cuenta el efectivo y el sistema dice si cuadra, si falta o si sobra.',
        '«Conciliar con el banco»: se sube el Excel o CSV del estado de cuenta y el sistema dice qué cuadra, qué falta capturar y qué no aparece en el banco.',
        '«Otro ingreso»: lo que entra y no es cuota (una tarjeta de acceso, por ejemplo).'
      ]
    },
    {
      id: 'recibos', titulo: 'Recibos firmados', donde: 'Menú → Gastos y dinero → Recibos firmados',
      para: 'Los egresos pagados en mano con la firma de quien recibió el dinero.',
      pasos: ['Cada recibo con su folio, su firma y su comprobante. «Descargar PDF» para imprimirlo o mandarlo.']
    },
    {
      id: 'difusion', titulo: 'Difusión', donde: 'Menú → Avisar → Difusión',
      para: 'Mandar un correo a todos los vecinos, a los dueños, a quienes rentan o a los que deben.',
      pasos: ['Escoge una plantilla o escribe el mensaje, escoge a quién y se abre tu correo con los destinatarios.']
    },
    {
      id: 'avisos', titulo: 'Avisos', donde: 'Menú → Avisar → Avisos',
      para: 'El tablero de avisos que ven los vecinos en su portal (corte de agua, asamblea…).',
      pasos: ['«Publicar aviso»: título, texto y fecha. Se puede quitar cuando ya no aplique.']
    },
    {
      id: 'reportes', titulo: 'Reportes y cierre', donde: 'Menú → Revisar → Reportes y cierre',
      para: 'El cierre del mes para la asamblea, los reportes del año y el cierre con candado.',
      pasos: [
        'Escoge el mes arriba (Periodo). «Imprimir» saca el cierre listo para presentar; «Copiar resumen» lo deja para pegar en el grupo.',
        'Egresos del año por categoría, lo recuperado de cartera vencida y el histórico casa por casa: toca una cifra para ver su detalle.',
        '«Cerrar el mes» (comité): revisa que los egresos estén revisados, que se haya contado la caja y que el banco coincida. Al cerrar, lo de ese mes ya no se cambia.',
        '«Reabrir el mes»: solo el comité, escribiendo por qué. Queda en la bitácora.',
        '«Entrega-recepción»: cuando cambia quien administra.'
      ]
    },
    {
      id: 'folios', titulo: 'Folios y bitácora', donde: 'Menú → Revisar → Folios y bitácora',
      para: 'Comprobar que no falte ningún folio y ver quién hizo qué.',
      pasos: [
        '«Folios por serie»: cada serie del 1 al último; si faltara uno o se repitiera, sale en rojo.',
        '«Buscar un folio»: escribe el folio que trae un recibo en papel (P-0012, E-0007) y compara el nombre y el monto. Si no existe, ese papel no salió del sistema.',
        '«Cancelados»: todo lo cancelado con su motivo.',
        '«Bitácora»: cada movimiento con fecha, hora y quién lo hizo. Se filtra por persona o se busca una palabra.'
      ]
    },
    {
      id: 'reglamento', titulo: 'Reglamento', donde: 'Menú → Condominio → Reglamento',
      para: 'El reglamento interno con su numeración, y el expediente (escrituras, actas, pólizas).',
      pasos: ['«Nuevo capítulo» y sus artículos; la numeración es corrida y automática. «Imprimir» lo saca completo.']
    },
    {
      id: 'ajustes', titulo: 'Ajustes', donde: 'Menú → Condominio → Ajustes',
      para: 'Los datos del condominio, las reglas de cobro, las categorías, los usuarios y el respaldo.',
      pasos: [
        'Datos del condominio y logo: salen en los recibos y estados de cuenta.',
        'Reglas de cobro: día de vencimiento, recargos y avisos.',
        'Categorías de egresos y su presupuesto (fijos, variables y otros).',
        'Usuarios y contraseñas: agregar, poner contraseña nueva o dar de baja (solo el comité).',
        'Tus datos: «Guardar base de datos» baja un archivo con todo; guárdenlo en una memoria USB.',
        'Pantalla: colores claro u oscuro y el tamaño de la letra.'
      ]
    },
    {
      id: 'portal', titulo: 'Portal del residente', donde: 'Menú, abajo',
      para: 'Lo que ve un vecino: su saldo, sus recibos y a dónde se va la cuota.',
      pasos: ['Escoge una casa para ver su portal tal como lo vería el vecino.']
    }
  ]
};

CC.vistas.ayuda = {
  titulo: 'Ayuda y manual',
  sub: function () { return 'Dónde está cada cosa y cómo se usa'; },
  acciones: function () {
    return [{ texto: 'Bajar el manual en PDF', icono: 'imprimir', clase: 'btn', accion: 'manual' }];
  },

  render: function () {
    var esc = CC.ui.esc, A = CC.Ayuda;
    var reservas = CC.Store.amenidades().length > 0, visitas = !!CC.Store.condominio().registroVisitas;
    var out = [];
    out.push('<div class="panelbox"><div class="panelbox__head"><h3>¿Dónde está…?</h3><span class="eyebrow">Lo que más se busca</span></div>' +
      '<div class="tablewrap"><table class="ledger ayuda__donde"><thead><tr><th>Quiero…</th><th>Está en…</th></tr></thead><tbody>' +
      A.donde.map(function (d) { return '<tr><td>' + esc(d[0]) + '</td><td class="strong">' + esc(d[1]) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>');

    out.push('<div class="panelbox"><div class="panelbox__head"><h3>Las reglas que cuidan el dinero</h3></div><div class="panelbox__body">' +
      '<ol class="pasitos">' + A.reglas.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol></div></div>');

    out.push('<div class="chips noprint ayuda__indice">' + A.secciones.map(function (s) {
      return '<a class="chip" href="#/ayuda/' + s.id + '">' + esc(s.titulo) + '</a>';
    }).join('') + '</div>');

    out.push(A.secciones.map(function (s) {
      return '<section class="panelbox ayuda__sec" id="ayuda-' + s.id + '"><div class="panelbox__head"><h3>' + esc(s.titulo) + '</h3>' +
        '<span class="eyebrow">' + esc(s.donde) + '</span></div><div class="panelbox__body">' +
        '<p class="ayuda__para">' + esc(s.para) + '</p>' +
        '<ol class="pasitos">' + s.pasos.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol>' +
        (s.ojo ? '<div class="note"><div><strong>Ojo:</strong> ' + esc(s.ojo) + '</div></div>' : '') +
        '<a class="btn btn--sm btn--ghost noprint" href="#/' + s.id + '">Ir a ' + esc(s.titulo) + '</a></div></section>';
    }).join(''));
    if (reservas || visitas) {
      out.push('<p class="muted" style="font-size:12.5px">' + (reservas ? '<strong>Reservas</strong>: apartar canchas y casa club, con su agenda. ' : '') +
        (visitas ? '<strong>Visitas</strong>: el registro de la caseta, con nombre, casa y placas.' : '') + '</p>');
    }
    out.push('<div class="note"><div>¿Algo no queda claro o algo no funciona? Escríbenos a <strong>hola@vonoaweb.com</strong>. ' +
      'Vonoa Web hace y mantiene este sistema.</div></div>');
    return out.join('');
  },

  montar: function (raiz, ctx) {
    if (ctx.param) {
      var sec = raiz.querySelector('#ayuda-' + ctx.param);
      if (sec) setTimeout(function () { sec.scrollIntoView({ block: 'start' }); sec.classList.add('ayuda__sec--marcada'); }, 60);
    }
  },

  /** El manual en PDF viene con el sistema (manual/), hecho con este mismo texto. */
  manual: function () {
    var a = document.createElement('a');
    a.href = 'manual/Manual-Cuota-Clara.pdf';
    a.download = 'Manual Cuota Clara.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    CC.ui.toast('Bajando el manual', 'good');
  }
};
