/* comprobantes.js — los documentos que se descargan en PDF.
 *
 * El recibo de cada pago de cuota, los recibos de caja chica, el recibo de un
 * proveedor (el del jardinero) y el convenio de pago para firmar. Todos llevan
 * el mismo encabezado del condominio, folio y la cantidad con letra, como los
 * recibos de papel que ya conocen.
 */
window.CC = window.CC || {};

CC.Comprobantes = (function () {
  var TINTA = '#111A22', TINTA2 = '#37495A', GRIS = '#66798A', LINEA = '#C3CED7',
    ACENTO = '#1B3A5C', SUAVE = '#E4EBF2', BIEN = '#1A6E45', MAL = '#9C2F28';
  var M = 36;                 // margen
  var DER = 612 - M - 158;    // columna derecha de los recibos (total y firma)

  function folio(prefijo, n) { return prefijo + String(n || 0).padStart(4, '0'); }

  function recortar(doc, t, ancho, o) {
    t = String(t || '');
    if (doc.medir(t, o) <= ancho) return t;
    while (t.length > 1 && doc.medir(t + '…', o) > ancho) t = t.slice(0, -1);
    return t + '…';
  }

  /* ---------- Piezas comunes ---------- */

  function encabezado(doc, tipo, fol, fecha) {
    var c = CC.Store.condominio();
    doc.rect(0, 0, doc.ancho, 5, { relleno: ACENTO });
    doc.texto(recortar(doc, c.nombre || 'Condominio', 330, { tam: 14, negrita: true }), M, M + 10,
      { tam: 14, negrita: true, color: TINTA });
    var l2 = [c.direccion, c.ciudad].filter(Boolean).join(', ');
    var l3 = [c.telefono ? 'Tel. ' + c.telefono : '', c.email].filter(Boolean).join(' · ');
    if (l2) doc.texto(recortar(doc, l2, 330, { tam: 8.5 }), M, M + 24, { tam: 8.5, color: GRIS });
    if (l3) doc.texto(recortar(doc, l3, 330, { tam: 8.5 }), M, M + 35, { tam: 8.5, color: GRIS });
    var X = doc.ancho - M;
    doc.texto(tipo.toUpperCase(), X, M + 8, { tam: 8, negrita: true, color: ACENTO, alinear: 'der' });
    doc.texto('Folio ' + fol, X, M + 23, { tam: 13, negrita: true, color: TINTA, alinear: 'der' });
    doc.texto('Fecha: ' + CC.fmt.fechaCorta(fecha), X, M + 35, { tam: 8.5, color: GRIS, alinear: 'der' });
    doc.linea(M, M + 45, doc.ancho - M, M + 45, { grosor: 1.1, color: TINTA });
    return M + 45;
  }

  /** Etiqueta chica a la izquierda y el valor al lado. Devuelve la y siguiente. */
  function dato(doc, y, etiqueta, valor, o) {
    o = o || {};
    var tam = o.tam || 10;
    doc.texto(etiqueta.toUpperCase(), M, y, { tam: 6.8, negrita: true, color: GRIS });
    var y2 = doc.parrafo(valor || '—', M + 88, y, o.ancho || (DER - 18 - M - 88),
      { tam: tam, negrita: o.negrita, color: o.color || TINTA, interlineado: tam * 1.35 });
    return y2 + (o.despues === undefined ? 5 : o.despues);
  }

  function cajaTotal(doc, y, etiqueta, monto) {
    doc.rect(DER, y, 158, 56, { relleno: SUAVE, radio: 6 });
    doc.texto(etiqueta.toUpperCase(), DER + 12, y + 16, { tam: 6.8, negrita: true, color: ACENTO });
    doc.texto(CC.fmt.money2(monto), DER + 146, y + 42, { tam: 18, negrita: true, color: TINTA, alinear: 'der' });
    return y + 56;
  }

  function firma(doc, x, yLinea, ancho, img, nombre, rol) {
    if (img) doc.imagen(img, x + 8, yLinea - 46, ancho - 16, 42, { abajo: true });
    doc.linea(x, yLinea, x + ancho, yLinea, { grosor: 0.7, color: TINTA2 });
    doc.texto(rol, x + ancho / 2, yLinea + 11, { tam: 7.5, color: GRIS, alinear: 'centro' });
    if (nombre) {
      doc.texto(recortar(doc, nombre, ancho, { tam: 8.5, negrita: true }), x + ancho / 2, yLinea + 22,
        { tam: 8.5, negrita: true, color: TINTA, alinear: 'centro' });
    }
  }

  function pie(doc, texto) {
    doc.linea(M, doc.alto - 30, doc.ancho - M, doc.alto - 30, { grosor: 0.4, color: LINEA });
    doc.texto(texto, M, doc.alto - 19, { tam: 7, color: GRIS });
    doc.texto('Cuota Clara', doc.ancho - M, doc.alto - 19, { tam: 7, color: GRIS, alinear: 'der' });
  }

  /** Lee una imagen guardada (firma o foto) y la deja lista para el PDF. */
  function imagen(id, inline, opc) {
    var origen = inline ? Promise.resolve(inline) : (id ? CC.Archivos.leer(id) : Promise.resolve(null));
    return origen.then(function (dataURL) { return CC.PDF.jpeg(dataURL, opc); });
  }

  /* ---------- Recibo de pago de cuota (para el vecino) ---------- */

  function reciboPago(pagoId) {
    var d = CC.Model.datosRecibo(pagoId);
    if (!d) return Promise.reject(new Error('No se encontró el pago.'));
    var p = d.pago, u = d.unidad || { clave: '—', propietario: '' };
    var c = CC.Store.condominio();
    var fol = folio('P-', p.folio);
    var doc = CC.PDF.nuevo({ ancho: 612, alto: 396, titulo: 'Recibo ' + fol + ' · Casa ' + u.clave });

    var top = encabezado(doc, 'Recibo de pago', fol, p.fecha);
    var y = top + 24;
    var anchoValor = DER - 18 - M - 88;

    y = dato(doc, y, 'Recibimos de', u.propietario + (u.inquilino ? ' (habita: ' + u.inquilino + ')' : ''), { negrita: true });
    y = dato(doc, y, 'Casa', u.clave + (u.calle ? ' · ' + u.calle : ''));
    y = dato(doc, y, 'La cantidad de', CC.fmt.letras(p.monto), { tam: 8.5, despues: 8 });

    doc.texto('POR CONCEPTO DE', M, y, { tam: 6.8, negrita: true, color: GRIS });
    var lineas = d.lineas.length ? d.lineas : [{ concepto: 'Pago a cuenta', monto: p.monto, completo: true }];
    var MAX = 5;
    lineas.slice(0, MAX).forEach(function (l) {
      var txt = l.concepto + (l.completo ? '' : ' (abono)');
      doc.texto(recortar(doc, txt, anchoValor - 74, { tam: 9 }), M + 88, y, { tam: 9, color: TINTA });
      doc.texto(CC.fmt.money2(l.monto), DER - 18, y, { tam: 9, color: TINTA, alinear: 'der' });
      y += 13;
    });
    if (lineas.length > MAX) {
      var resto = lineas.slice(MAX).reduce(function (a, l) { return a + l.monto; }, 0);
      doc.texto('y ' + (lineas.length - MAX) + ' conceptos más', M + 88, y, { tam: 9, color: GRIS });
      doc.texto(CC.fmt.money2(resto), DER - 18, y, { tam: 9, color: GRIS, alinear: 'der' });
      y += 13;
    }
    if (d.aFavor > 0.005) {
      doc.texto('Queda a favor para los meses siguientes', M + 88, y, { tam: 9, color: TINTA });
      doc.texto(CC.fmt.money2(d.aFavor), DER - 18, y, { tam: 9, color: TINTA, alinear: 'der' });
      y += 13;
    }
    y += 6;
    y = dato(doc, y, 'Forma de pago', [p.metodo, p.referencia ? 'referencia ' + p.referencia : ''].filter(Boolean).join(' · '), { tam: 9.5 });
    if (d.convenio) {
      y = dato(doc, y, 'Convenio', 'Abono al convenio ' + folio('CV-', d.convenio.convenio.folio) + ': ' +
        d.convenio.pagadas + ' de ' + d.convenio.plan.length + ' parcialidades cubiertas', { tam: 9 });
    }
    if (p.nota) dato(doc, y, 'Nota', p.nota, { tam: 9 });

    var yb = cajaTotal(doc, top + 14, 'Total recibido', p.monto);
    var sd = d.saldoDespues;
    doc.texto('SALDO DESPUÉS DE ESTE PAGO', DER, yb + 20, { tam: 6.8, negrita: true, color: GRIS });
    doc.texto(sd > 0.005 ? CC.fmt.money2(sd) + ' pendiente' : sd < -0.005 ? CC.fmt.money2(-sd) + ' a favor' : 'Al corriente',
      DER, yb + 35, { tam: 11, negrita: true, color: sd > 0.005 ? MAL : BIEN });

    firma(doc, DER, 318, 158, null, c.administrador || 'Administración', 'Recibió por la administración');
    pie(doc, 'Consérvelo como comprobante de su pago. Generado el ' + CC.fmt.fechaCorta(CC.per.hoyISO()) + '.');

    return Promise.resolve({ doc: doc, nombre: CC.PDF.nombreArchivo('Recibo ' + fol + ' Casa ' + u.clave) });
  }

  /** El mensaje que acompaña al recibo cuando se manda por WhatsApp. */
  function textoReciboPago(pagoId) {
    var d = CC.Model.datosRecibo(pagoId);
    if (!d) return '';
    var p = d.pago, u = d.unidad || {}, c = CC.Store.condominio();
    var quien = (u.inquilino || u.propietario || '').split(' ')[0];
    var sd = d.saldoDespues;
    return [
      'Hola ' + quien + ', le confirmamos que recibimos su pago de ' + CC.fmt.money2(p.monto) +
        ' del ' + CC.fmt.fecha(p.fecha) + ' para la casa ' + u.clave + '.',
      '',
      'Recibo folio ' + folio('P-', p.folio),
      'Se aplicó a: ' + (d.lineas.length
        ? d.lineas.map(function (l) { return l.concepto + (l.completo ? '' : ' (abono)'); }).join('; ')
        : 'pago a cuenta'),
      'Saldo después del pago: ' + (sd > 0.005 ? CC.fmt.money2(sd) : sd < -0.005 ? CC.fmt.money2(-sd) + ' a favor' : 'al corriente'),
      '',
      'Gracias. ' + (c.administrador || 'La administración') + ', ' + c.nombre + '.'
    ].join('\n');
  }

  /* ---------- Recibos de caja chica y de proveedor ---------- */

  /**
   * Recibo de media carta con datos a la izquierda, total y foto a la derecha
   * y una o dos firmas abajo.
   */
  function reciboSimple(cfg) {
    return Promise.all([
      cfg.firmaImg || Promise.resolve(null),
      cfg.fotoImg || Promise.resolve(null)
    ]).then(function (imgs) {
      var doc = CC.PDF.nuevo({ ancho: 612, alto: 396, titulo: cfg.titulo });
      var top = encabezado(doc, cfg.tipo, cfg.folio, cfg.fecha);
      var y = top + 24;
      cfg.filas.forEach(function (f) {
        if (f[1]) y = dato(doc, y, f[0], f[1], f[2]);
      });

      var yb = cajaTotal(doc, top + 14, cfg.totalEtiqueta, cfg.monto);
      if (imgs[1]) {
        doc.texto('EVIDENCIA', DER, yb + 18, { tam: 6.8, negrita: true, color: GRIS });
        doc.imagen(imgs[1], DER, yb + 24, 158, 112, { alinear: 'izq' });
      }

      if (cfg.firmaIzq) firma(doc, M, 318, 190, cfg.firmaIzq.conImagen ? imgs[0] : null, cfg.firmaIzq.nombre, cfg.firmaIzq.rol);
      if (cfg.firmaDer) firma(doc, DER, 318, 158, cfg.firmaDer.conImagen ? imgs[0] : null, cfg.firmaDer.nombre, cfg.firmaDer.rol);
      pie(doc, cfg.pie || ('Generado el ' + CC.fmt.fechaCorta(CC.per.hoyISO()) + '.'));
      return { doc: doc, nombre: CC.PDF.nombreArchivo(cfg.archivo) };
    });
  }

  function cuentaNombre(id) { var c = CC.Store.cuenta(id || 'banco'); return c ? c.nombre : 'Banco'; }

  /** Recibo de un egreso: lo firma quien recibe el dinero (el jardinero, el de la basura). */
  function reciboEgreso(gastoId) {
    var g = CC.Store.gasto(gastoId);
    if (!g) return Promise.reject(new Error('No se encontró el egreso.'));
    var c = CC.Store.condominio();
    var fol = folio('E-', g.folioE);
    return reciboSimple({
      tipo: 'Recibo de egreso', folio: fol, fecha: g.fecha,
      titulo: 'Recibo ' + fol + ' · ' + g.concepto,
      archivo: 'Recibo ' + fol + ' ' + g.concepto,
      filas: [
        ['Recibí de', c.nombre, { negrita: true }],
        ['La cantidad de', CC.fmt.letras(g.monto), { tam: 8.5, despues: 8 }],
        ['Por concepto de', g.concepto, { negrita: true }],
        ['Categoría', g.categoria],
        ['Forma de pago', [g.metodo, cuentaNombre(g.cuenta), g.referencia].filter(Boolean).join(' · ')],
        ['Identificación', g.identificacion, { tam: 9 }],
        ['Nota', g.nota, { tam: 9 }]
      ],
      totalEtiqueta: 'Cantidad entregada', monto: g.monto,
      firmaImg: imagen(g.firmaId, g.firmaInline, { ladoMax: 640, escalaMax: 3 }),
      fotoImg: g.fotoId ? imagen(g.fotoId, null, { ladoMax: 700 }) : null,
      firmaIzq: { rol: 'Entregó por la administración', nombre: c.administrador || 'Administración' },
      firmaDer: { rol: 'Recibí conforme', nombre: g.proveedor, conImagen: true },
      pie: (g.estado === 'cancelado' ? 'CANCELADO' + (g.motivoCancelacion ? ': ' + g.motivoCancelacion : '') + '. ' : '') +
        'Comprobante de egreso. Generado el ' + CC.fmt.fechaCorta(CC.per.hoyISO()) + '.'
    });
  }

  /** Recibo de un ingreso que no es cuota (tarjeta de acceso, multa en efectivo). */
  function reciboIngreso(ingresoId) {
    var i = CC.Store.ingreso(ingresoId);
    if (!i) return Promise.reject(new Error('No se encontró el ingreso.'));
    var c = CC.Store.condominio();
    var casa = i.unidadId ? CC.Store.unidad(i.unidadId) : null;
    var fol = folio('I-', i.folio);
    return reciboSimple({
      tipo: 'Recibo de ingreso', folio: fol, fecha: i.fecha,
      titulo: 'Recibo ' + fol + ' · ' + i.concepto,
      archivo: 'Recibo ' + fol + ' ' + i.concepto,
      filas: [
        ['Recibimos de', (i.nombre || '') + (casa ? ' · casa ' + casa.clave : ''), { negrita: true }],
        ['La cantidad de', CC.fmt.letras(i.monto), { tam: 8.5, despues: 8 }],
        ['Por concepto de', i.concepto, { negrita: true }],
        ['Forma de pago', [i.metodo, cuentaNombre(i.cuenta), i.referencia].filter(Boolean).join(' · ')],
        ['Nota', i.nota, { tam: 9 }]
      ],
      totalEtiqueta: 'Cantidad recibida', monto: i.monto,
      firmaImg: imagen(i.firmaId, i.firmaInline, { ladoMax: 640, escalaMax: 3 }),
      firmaIzq: { rol: 'Entregó', nombre: i.nombre, conImagen: true },
      firmaDer: { rol: 'Recibió por la administración', nombre: c.administrador || 'Administración' }
    });
  }

  /** Póliza de traspaso: el depósito del efectivo de la caja al banco, con su ficha. */
  function polizaTraspaso(traspasoId) {
    var t = CC.Store.traspaso(traspasoId);
    if (!t) return Promise.reject(new Error('No se encontró el traspaso.'));
    var c = CC.Store.condominio();
    var fol = folio('T-', t.folio);
    return reciboSimple({
      tipo: 'Póliza de traspaso', folio: fol, fecha: t.fecha,
      titulo: 'Traspaso ' + fol, archivo: 'Poliza de traspaso ' + fol,
      filas: [
        ['De la cuenta', cuentaNombre(t.de), { negrita: true }],
        ['A la cuenta', cuentaNombre(t.a), { negrita: true }],
        ['La cantidad de', CC.fmt.letras(t.monto), { tam: 8.5, despues: 8 }],
        ['Ficha o referencia', t.referencia],
        ['Nota', t.nota, { tam: 9 }]
      ],
      totalEtiqueta: 'Monto traspasado', monto: t.monto,
      firmaIzq: { rol: 'Hizo el traspaso', nombre: c.administrador || 'Administración' },
      firmaDer: { rol: 'Revisó', nombre: '' },
      pie: (t.cancelado ? 'CANCELADO. ' : '') + 'Póliza de traspaso entre cuentas. Generada el ' + CC.fmt.fechaCorta(CC.per.hoyISO()) + '.'
    });
  }

  /* ---------- Convenio de pago (carta, para firmar) ---------- */

  function convenio(convenioId) {
    var cv = CC.Store.convenio(convenioId);
    if (!cv) return Promise.reject(new Error('No se encontró el convenio.'));
    var e = CC.Model.estadoConvenio(cv);
    var u = CC.Store.unidad(cv.unidadId) || { clave: '—', propietario: '' };
    var c = CC.Store.condominio();
    var fol = folio('CV-', cv.folio);
    var doc = CC.PDF.nuevo({ titulo: 'Convenio ' + fol + ' · Casa ' + u.clave });
    var ancho = doc.ancho - 2 * M;
    var LIMITE = doc.alto - 56;

    var y = encabezado(doc, 'Convenio de pago', fol, cv.fecha) + 34;
    doc.texto('Convenio de pago en parcialidades', M, y, { tam: 15, negrita: true, color: TINTA });
    y += 22;
    y = doc.parrafo('En ' + (c.ciudad || '________') + ', a ' + CC.fmt.fechaLarga(cv.fecha) + ', ' +
      (c.administrador || 'la administración') + ' de ' + c.nombre + ' y ' + (u.propietario || '________') +
      ', propietario(a) de la casa ' + u.clave + ', acuerdan lo siguiente:', M, y, ancho, { tam: 10, color: TINTA2 }) + 8;

    var periodoTxt = cv.cada === 'quincena' ? 'quincenales' : 'mensuales';
    [
      ['Adeudo', 'Al ' + CC.fmt.fechaLarga(cv.fecha) + ' la casa ' + u.clave + ' debe ' + CC.fmt.money2(cv.adeudo) +
        ' (' + CC.fmt.letras(cv.adeudo) + ')' + (cv.detalle ? ', ' + cv.detalle : '') + '.'],
      ['Forma de pago', 'El adeudo se cubre en ' + e.plan.length + ' parcialidades ' + periodoTxt +
        ' en las fechas de la tabla. Cada pago se registra y se entrega su recibo.'],
      ['Cuota del mes', 'Además de las parcialidades, la casa sigue pagando su cuota de mantenimiento de cada mes en su fecha normal.'],
      ['Recargos', 'Mientras el convenio se cumpla, la administración no aplicará recargos por mora sobre este adeudo.'],
      ['Si no se cumple', 'Si se atrasan dos parcialidades, el convenio queda sin efecto y el saldo pendiente se cobra conforme al reglamento interno.']
    ].forEach(function (cl, i) {
      doc.texto((i + 1) + '. ' + cl[0], M, y, { tam: 9.5, negrita: true, color: TINTA });
      y = doc.parrafo(cl[1], M + 14, y + 13, ancho - 14, { tam: 9.2, color: TINTA2 }) + 4;
    });
    if (cv.nota) y = doc.parrafo('Nota: ' + cv.nota, M, y + 2, ancho, { tam: 9, color: GRIS }) + 4;

    function cabeceraTabla() {
      doc.rect(M, y, ancho, 20, { relleno: SUAVE });
      var o = { tam: 7.2, negrita: true, color: ACENTO };
      doc.texto('NO.', M + 10, y + 13, o);
      doc.texto('FECHA', M + 50, y + 13, o);
      doc.texto('MONTO', M + 250, y + 13, Object.assign({ alinear: 'der' }, o));
      doc.texto('PAGADA', M + 300, y + 13, o);
      doc.texto('FIRMA DE RECIBIDO', M + 380, y + 13, o);
      y += 20;
    }
    y += 8;
    cabeceraTabla();
    e.plan.forEach(function (x) {
      if (y + 22 > LIMITE) { doc.nuevaPagina(); y = M + 10; cabeceraTabla(); }
      doc.texto(String(x.n), M + 10, y + 14, { tam: 9.5, color: TINTA });
      doc.texto(CC.fmt.fechaLarga(x.fecha), M + 50, y + 14, { tam: 9.5, color: TINTA });
      doc.texto(CC.fmt.money2(x.monto), M + 250, y + 14, { tam: 9.5, negrita: true, color: TINTA, alinear: 'der' });
      if (x.cubierta) doc.texto('Sí', M + 300, y + 14, { tam: 9.5, negrita: true, color: BIEN });
      doc.linea(M + 380, y + 16, M + ancho - 10, y + 16, { grosor: 0.4, color: LINEA, punteada: true });
      doc.linea(M, y + 22, M + ancho, y + 22, { grosor: 0.4, color: LINEA });
      y += 22;
    });
    doc.texto('Total', M + 50, y + 15, { tam: 9.5, negrita: true, color: TINTA });
    doc.texto(CC.fmt.money2(cv.adeudo), M + 250, y + 15, { tam: 9.5, negrita: true, color: TINTA, alinear: 'der' });
    y += 22;

    if (y + 100 > LIMITE) { doc.nuevaPagina(); y = M + 20; }
    var yFirma = Math.max(y + 78, Math.min(LIMITE - 24, y + 120));
    firma(doc, M + 10, yFirma, 220, null, u.propietario, 'Propietario(a) de la casa ' + u.clave);
    firma(doc, doc.ancho - M - 230, yFirma, 220, null, c.administrador || 'Administración', 'Por la administración');
    pie(doc, 'Convenio ' + fol + ' · casa ' + u.clave + ' · generado el ' + CC.fmt.fechaCorta(CC.per.hoyISO()) + '.');

    return Promise.resolve({ doc: doc, nombre: CC.PDF.nombreArchivo('Convenio ' + fol + ' Casa ' + u.clave) });
  }

  /* ---------- Estado de cuenta de una casa (carta) ---------- */

  /** Lo que se le manda al vecino: de tal mes a tal mes, con cada cargo y cada pago. */
  function estadoCuenta(unidadId, desde, hasta) {
    var u = CC.Store.unidad(unidadId);
    if (!u) return Promise.reject(new Error('No se encontró la casa.'));
    var c = CC.Store.condominio();
    var e = CC.Model.estadoCuentaCasa(unidadId, desde, hasta);
    var titulo = 'Estado de cuenta · Casa ' + u.clave;
    var doc = CC.PDF.nuevo({ titulo: titulo });
    var ancho = doc.ancho - 2 * M;
    var LIMITE = doc.alto - 56;
    var rango = desde === hasta ? CC.fmt.periodo(desde) : CC.fmt.periodo(desde) + ' a ' + CC.fmt.periodo(hasta);

    var y = encabezado(doc, 'Estado de cuenta', 'Casa ' + u.clave, CC.per.hoyISO()) + 30;
    doc.texto(u.propietario || '', M, y, { tam: 14, negrita: true, color: TINTA });
    y += 16;
    doc.texto(rango + (u.referencia ? ' · referencia bancaria ' + u.referencia : ''), M, y, { tam: 9.5, color: GRIS });
    y += 22;

    function cabecera() {
      doc.rect(M, y, ancho, 20, { relleno: SUAVE });
      var o = { tam: 7.2, negrita: true, color: ACENTO };
      doc.texto('FECHA', M + 8, y + 13, o);
      doc.texto('CONCEPTO', M + 70, y + 13, o);
      doc.texto('CARGO', M + 370, y + 13, Object.assign({ alinear: 'der' }, o));
      doc.texto('ABONO', M + 445, y + 13, Object.assign({ alinear: 'der' }, o));
      doc.texto('SALDO', M + ancho - 8, y + 13, Object.assign({ alinear: 'der' }, o));
      y += 20;
    }
    cabecera();
    doc.texto('Saldo anterior', M + 70, y + 13, { tam: 9, negrita: true, color: TINTA });
    doc.texto(CC.fmt.money2(e.inicial), M + ancho - 8, y + 13, { tam: 9, negrita: true, color: TINTA, alinear: 'der' });
    doc.linea(M, y + 19, M + ancho, y + 19, { grosor: 0.4, color: LINEA });
    y += 19;
    e.filas.forEach(function (m) {
      if (y + 18 > LIMITE) { doc.nuevaPagina(); y = M + 10; cabecera(); }
      doc.texto(CC.fmt.fechaCorta(m.fecha), M + 8, y + 12, { tam: 8.5, color: TINTA2 });
      doc.texto(recortar(doc, m.concepto, 245, { tam: 8.5 }), M + 70, y + 12, { tam: 8.5, color: TINTA });
      if (m.cargo) doc.texto(CC.fmt.money2(m.cargo), M + 370, y + 12, { tam: 8.5, color: TINTA, alinear: 'der' });
      if (m.abono) doc.texto(CC.fmt.money2(m.abono), M + 445, y + 12, { tam: 8.5, color: BIEN, alinear: 'der' });
      doc.texto(CC.fmt.money2(m.saldo), M + ancho - 8, y + 12, { tam: 8.5, negrita: true, color: TINTA, alinear: 'der' });
      doc.linea(M, y + 17, M + ancho, y + 17, { grosor: 0.3, color: LINEA });
      y += 17;
    });
    y += 10;
    if (y + 90 > LIMITE) { doc.nuevaPagina(); y = M + 20; }
    doc.rect(M + ancho - 200, y, 200, 46, { relleno: e.final > 0.005 ? '#F7E2E0' : SUAVE, radio: 6 });
    doc.texto(e.final > 0.005 ? 'SALDO POR PAGAR' : e.final < -0.005 ? 'SALDO A FAVOR' : 'AL CORRIENTE',
      M + ancho - 188, y + 15, { tam: 7, negrita: true, color: e.final > 0.005 ? MAL : ACENTO });
    doc.texto(CC.fmt.money2(Math.abs(e.final)), M + ancho - 12, y + 36, { tam: 16, negrita: true, color: TINTA, alinear: 'der' });

    if (e.pendientes.length) {
      doc.texto('LO QUE QUEDA PENDIENTE', M, y + 12, { tam: 7, negrita: true, color: GRIS });
      var yy = y + 26;
      e.pendientes.forEach(function (p) {
        if (yy > LIMITE) return;
        doc.texto(CC.fmt.periodo(p.periodo) + ': ' + CC.fmt.money2(p.total) +
          (p.partes.length > 1 ? '  (' + p.partes.map(function (x) { return x.etiqueta + ' ' + CC.fmt.money2(x.monto); }).join(' + ') + ')' : ''),
          M, yy, { tam: 8.5, color: TINTA2 });
        yy += 12;
      });
      y = Math.max(y + 56, yy + 6);
    } else y += 56;
    if (c.cuenta && y + 30 < LIMITE) {
      doc.parrafo('Puede pagar por transferencia a ' + c.cuenta + (u.referencia ? ', con la referencia ' + u.referencia : '') + '.',
        M, y + 8, ancho, { tam: 9, color: TINTA2 });
    }
    pie(doc, 'Estado de cuenta de la casa ' + u.clave + ' · generado el ' + CC.fmt.fechaCorta(CC.per.hoyISO()) + '.');
    return Promise.resolve({ doc: doc, nombre: CC.PDF.nombreArchivo('Estado de cuenta Casa ' + u.clave + ' ' + rango) });
  }

  /** El mensaje que acompaña al estado de cuenta en WhatsApp. */
  function textoEstadoCuenta(unidadId, desde, hasta) {
    var u = CC.Store.unidad(unidadId) || {};
    var c = CC.Store.condominio();
    var e = CC.Model.estadoCuentaCasa(unidadId, desde, hasta);
    var quien = (u.propietario || '').split(' ')[0];
    var l = ['Hola ' + quien + ', le compartimos el estado de cuenta de la casa ' + u.clave + ' (' +
      (desde === hasta ? CC.fmt.periodo(desde) : CC.fmt.periodo(desde) + ' a ' + CC.fmt.periodo(hasta)) + ').', ''];
    if (e.pendientes.length) {
      l.push('Pendiente:');
      e.pendientes.forEach(function (p) { l.push('• ' + CC.fmt.periodo(p.periodo) + ': ' + CC.fmt.money2(p.total)); });
      l.push('Total: ' + CC.fmt.money2(e.final));
    } else l.push(e.final < -0.005 ? 'Tiene ' + CC.fmt.money2(-e.final) + ' a favor.' : 'Está al corriente. ¡Gracias!');
    l.push('', (c.administrador || 'La administración') + ', ' + c.nombre + '.');
    return l.join('\n');
  }

  /* ---------- Salida ---------- */

  function descargar(promesa, silencioso) {
    return promesa.then(function (r) {
      r.doc.descargar(r.nombre);
      if (!silencioso) CC.ui.toast('Descargado: ' + r.nombre, 'good');
      return r;
    }).catch(function (err) {
      CC.ui.toast((err && err.message) || 'No se pudo generar el PDF', 'crit');
    });
  }

  function telWa(telefono) {
    var d = String(telefono || '').replace(/\D/g, '');
    // En el demo para enseñar, el WhatsApp le llega a quien lo prueba (js/demo.js);
    // si aún no da su número, el enlace lleva un 0 y se le pide al tocarlo
    if (d && CC.Demo && CC.Demo.activo()) return CC.Demo.numero() || '0';
    return d.length === 10 ? '52' + d : d;
  }

  /**
   * En el celular abre el menú de compartir con el PDF adjunto (ahí se elige
   * WhatsApp). En la computadora baja el PDF y abre WhatsApp con el mensaje,
   * para adjuntarlo a mano: wa.me no deja mandar archivos.
   */
  function compartir(promesa, texto, telefono) {
    return promesa.then(function (r) {
      var archivo = r.doc.archivo(r.nombre);
      var tactil = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
      function respaldo() {
        r.doc.descargar(r.nombre);
        var enlace = 'https://wa.me/' + telWa(telefono) + '?text=' + encodeURIComponent(texto);
        if (CC.Demo && CC.Demo.activo()) CC.Demo.conNumero(function (n) { CC.Demo.abrir(enlace, n); });
        else if (telWa(telefono)) window.open(enlace, '_blank', 'noopener');
        CC.ui.toast('PDF descargado. Adjúntalo en el chat que se abrió.', 'good');
      }
      if (tactil && navigator.canShare && navigator.canShare({ files: [archivo] })) {
        return navigator.share({ files: [archivo], title: r.nombre, text: texto }).catch(function (err) {
          if (!err || err.name !== 'AbortError') respaldo();
        });
      }
      respaldo();
    }).catch(function (err) {
      CC.ui.toast((err && err.message) || 'No se pudo generar el PDF', 'crit');
    });
  }

  return {
    folio: folio,
    reciboPago: reciboPago,
    textoReciboPago: textoReciboPago,
    reciboEgreso: reciboEgreso,
    reciboIngreso: reciboIngreso,
    polizaTraspaso: polizaTraspaso,
    estadoCuenta: estadoCuenta,
    textoEstadoCuenta: textoEstadoCuenta,
    convenio: convenio,
    descargar: descargar,
    compartir: compartir,
    telWa: telWa
  };
})();
