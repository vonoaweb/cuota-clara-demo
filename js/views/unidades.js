/* views/unidades.js — el padron de unidades y el estado de cuenta de cada una. */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

/* Filtro vivo de la lista (no se guarda: es estado de pantalla). */
var filtroUnidades = { texto: '', estado: 'todas', calle: 'todas' };

/* ---------- Formulario de alta y edicion ---------- */
function formularioUnidad(unidad) {
  var u = unidad || {
    clave: '', calle: '', numero: '', prototipo: '', m2: '', propietario: '',
    inquilino: '', telefono: '', email: '', ocupacion: 'Propietario', cuotaOverride: null
  };
  var esc = CC.ui.esc;
  var titulo = unidad ? 'Editar casa ' + u.clave : 'Nueva casa';

  /* Calles ya capturadas, para no escribirlas de nuevo en cada alta */
  var calles = {};
  CC.Store.unidades().forEach(function (x) { if (x.calle) calles[x.calle] = 1; });
  var listaCalles = Object.keys(calles).sort();

  CC.ui.modal(titulo,
    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">Identificador</span>' +
    '<input class="input" id="fClave" value="' + esc(u.clave) + '" placeholder="Fresnos 12" required>' +
    '<span class="field__hint">Como se le conoce a la casa en el condominio</span></label>' +
    '<label class="field"><span class="field__lab">Calle</span>' +
    '<input class="input" id="fCalle" value="' + esc(u.calle || '') + '" placeholder="Circuito Fresnos" list="listaCalles">' +
    '<datalist id="listaCalles">' +
    listaCalles.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') +
    '</datalist></label>' +
    '<label class="field"><span class="field__lab">Número</span>' +
    '<input class="input num" id="fNumero" type="number" min="0" step="1" value="' + esc(u.numero || '') + '">' +
    '<span class="field__hint">Ordena el padrón dentro de la calle</span></label>' +
    '<label class="field"><span class="field__lab">Prototipo</span>' +
    '<input class="input" id="fProto" value="' + esc(u.prototipo || '') + '" placeholder="A, B, C…"></label>' +
    '<label class="field"><span class="field__lab">Metros cuadrados</span>' +
    '<input class="input num" id="fM2" type="number" min="0" step="0.01" value="' + esc(u.m2) + '">' +
    '<span class="field__hint">Define el indiviso y con él la cuota</span></label>' +
    '<label class="field"><span class="field__lab">Cuota fija (opcional)</span>' +
    '<input class="input num" id="fCuota" type="number" min="0" step="0.01" value="' + esc(u.cuotaOverride === null || u.cuotaOverride === undefined ? '' : u.cuotaOverride) + '" placeholder="Prorrateo por indiviso">' +
    '<span class="field__hint">Si la capturas, ignora el indiviso</span></label>' +
    '<label class="field"><span class="field__lab">Propietario</span>' +
    '<input class="input" id="fProp" value="' + esc(u.propietario) + '"></label>' +
    '<label class="field"><span class="field__lab">Inquilino (si aplica)</span>' +
    '<input class="input" id="fInq" value="' + esc(u.inquilino || '') + '"></label>' +
    '<label class="field"><span class="field__lab">Teléfono</span>' +
    '<input class="input" id="fTel" value="' + esc(u.telefono || '') + '" placeholder="33 1234 5678"></label>' +
    '<label class="field"><span class="field__lab">Correo</span>' +
    '<input class="input" id="fMail" type="email" value="' + esc(u.email || '') + '"></label>' +
    '<label class="field"><span class="field__lab">Teléfono del arrendatario</span>' +
    '<input class="input" id="fTelInq" value="' + esc(u.telInquilino || '') + '"></label>' +
    '<label class="field"><span class="field__lab">Correo del arrendatario</span>' +
    '<input class="input" id="fMailInq" type="email" value="' + esc(u.emailInquilino || '') + '"></label>' +
    '<label class="field"><span class="field__lab">Referencia bancaria</span>' +
    '<input class="input mono" id="fRef" value="' + esc(u.referencia || '') + '" placeholder="Con la que paga en el banco">' +
    '<span class="field__hint">Sirve para reconocer sus depósitos</span></label>' +
    '<label class="field"><span class="field__lab">Ocupación</span>' +
    '<select class="input" id="fOcup">' +
    ['Propietario', 'Rentada', 'Desocupada'].map(function (o) {
      return '<option' + (u.ocupacion === o ? ' selected' : '') + '>' + o + '</option>';
    }).join('') + '</select></label>' +
    '</div>' +
    '<div class="formactions">' +
    (unidad ? '<button type="button" class="btn btn--ghost" id="bBorrar" style="margin-right:auto">Eliminar casa</button>' : '') +
    '<button type="button" class="btn btn--ghost" id="bCancel">Cancelar</button>' +
    '<button type="button" class="btn" id="bGuardar">Guardar</button>' +
    '</div>',
    function (cuerpo) {
      cuerpo.querySelector('#bCancel').onclick = CC.ui.cerrarModal;

      var borrar = cuerpo.querySelector('#bBorrar');
      if (borrar) borrar.onclick = function () {
        var conFolio = CC.Store.todosLosPagos().filter(function (p) { return p.unidadId === u.id; }).length;
        if (conFolio) {
          CC.ui.toast('La casa ' + u.clave + ' tiene ' + conFolio + (conFolio === 1 ? ' pago' : ' pagos') +
            ' con folio; no se puede eliminar para que no falte ningún recibo', 'crit');
          return;
        }
        CC.ui.confirmar('Eliminar ' + u.clave,
          'Se borra la casa junto con sus cargos e historial. Esta acción no se puede deshacer.',
          'Eliminar', function () {
            CC.Store.borrarUnidad(u.id);
            CC.ui.toast('Casa eliminada');
            location.hash = '#/unidades';
          }, true);
      };

      cuerpo.querySelector('#bGuardar').onclick = function () {
        var clave = cuerpo.querySelector('#fClave').value.trim();
        if (!clave) { CC.ui.toast('La casa necesita un identificador', 'crit'); return; }
        var cuotaTxt = cuerpo.querySelector('#fCuota').value.trim();
        var numTxt = cuerpo.querySelector('#fNumero').value.trim();
        var datos = {
          clave: clave,
          calle: cuerpo.querySelector('#fCalle').value.trim(),
          numero: numTxt === '' ? null : Number(numTxt),
          prototipo: cuerpo.querySelector('#fProto').value.trim(),
          m2: Number(cuerpo.querySelector('#fM2').value) || 0,
          cuotaOverride: cuotaTxt === '' ? null : Number(cuotaTxt),
          propietario: cuerpo.querySelector('#fProp').value.trim(),
          inquilino: cuerpo.querySelector('#fInq').value.trim() || null,
          telefono: cuerpo.querySelector('#fTel').value.trim(),
          email: cuerpo.querySelector('#fMail').value.trim(),
          telInquilino: cuerpo.querySelector('#fTelInq').value.trim(),
          emailInquilino: cuerpo.querySelector('#fMailInq').value.trim(),
          referencia: cuerpo.querySelector('#fRef').value.trim(),
          ocupacion: cuerpo.querySelector('#fOcup').value
        };
        if (unidad) { CC.Store.actualizarUnidad(u.id, datos); CC.ui.toast('Casa actualizada', 'good'); }
        else { CC.Store.agregarUnidad(datos); CC.ui.toast('Casa agregada', 'good'); }
        CC.ui.cerrarModal();
      };
    });
}

/* ---------- Vista: padron ---------- */
CC.vistas.unidades = {
  titulo: 'Casas',
  sub: function () {
    var n = CC.Store.unidades().length;
    if (!n) return 'Sin casas capturadas';
    return n + (n === 1 ? ' casa' : ' casas') + ' · ' +
      CC.fmt.num(CC.Model.totalM2()) + ' m² de construcción en total';
  },
  acciones: function () {
    return [{ texto: 'Nueva casa', icono: 'mas', clase: 'btn', accion: 'nuevaUnidad' }];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var pad = CC.Model.padron(ctx.periodo);

    if (!pad.length) {
      return '<div class="panelbox"><div class="empty">' +
        '<strong>Todavía no hay casas</strong>' +
        '<p>Captura las casas del condominio. El metraje de cada una define su ' +
        'porcentaje de indiviso y con él su cuota mensual.</p>' +
        '<button class="btn" data-accion="nuevaUnidad" style="margin-top:8px">Agregar la primera casa</button>' +
        '</div></div>';
    }

    /* --- Calles, para filtrar --- */
    var conteoCalle = {};
    pad.forEach(function (x) {
      var c = x.unidad.calle || 'Sin calle';
      conteoCalle[c] = (conteoCalle[c] || 0) + 1;
    });
    var calles = Object.keys(conteoCalle).sort();

    var f = filtroUnidades;
    var chipsEstado = [
      ['todas', 'Todas', pad.length],
      ['corriente', 'Al corriente', pad.filter(function (x) { return x.situacion.estado === 'corriente'; }).length],
      ['vencido', 'Vencidas', pad.filter(function (x) { return x.situacion.estado === 'vencido'; }).length],
      ['moroso', 'Morosas', pad.filter(function (x) { return x.situacion.estado === 'moroso'; }).length],
      ['sindatos', 'Sin teléfono o correo', pad.filter(function (x) { return !x.unidad.telefono || !x.unidad.email; }).length]
    ].map(function (c) {
      return '<button class="chip' + (f.estado === c[0] ? ' is-on' : '') + '" data-festado="' + c[0] + '">' +
        esc(c[1]) + ' <em class="chip__n">' + c[2] + '</em></button>';
    }).join('');

    var chipsCalle = calles.length > 1
      ? '<button class="chip' + (f.calle === 'todas' ? ' is-on' : '') + '" data-fcalle="todas">Todas las calles</button>' +
        calles.map(function (c) {
          return '<button class="chip' + (f.calle === c ? ' is-on' : '') + '" data-fcalle="' + esc(c) + '">' +
            esc(c) + ' <em class="chip__n">' + conteoCalle[c] + '</em></button>';
        }).join('')
      : '';

    /* --- Filtrado --- */
    var visibles = pad.filter(function (x) {
      if (f.estado === 'sindatos') { if (x.unidad.telefono && x.unidad.email) return false; }
      else if (f.estado !== 'todas' && x.situacion.estado !== f.estado) return false;
      if (f.calle !== 'todas' && (x.unidad.calle || 'Sin calle') !== f.calle) return false;
      if (f.texto) {
        var t = f.texto.toLowerCase();
        var campo = (x.unidad.clave + ' ' + x.unidad.propietario + ' ' +
          (x.unidad.inquilino || '') + ' ' + (x.unidad.calle || '')).toLowerCase();
        if (campo.indexOf(t) < 0) return false;
      }
      return true;
    });

    var totalCuota = visibles.reduce(function (a, x) { return a + x.cuota; }, 0);
    var totalSaldo = visibles.reduce(function (a, x) { return a + Math.max(0, x.situacion.saldo); }, 0);

    /* --- Resumen del padrón --- */
    var resumen = CC.ui.stats([
      { lab: 'Casas', val: String(pad.length), nota: '<span>' + calles.length + ' calles</span>' },
      {
        lab: 'Cuotas del mes', val: CC.fmt.money(pad.reduce(function (a, x) { return a + x.cuota; }, 0)),
        nota: '<span>promedio ' + esc(CC.fmt.money(pad.reduce(function (a, x) { return a + x.cuota; }, 0) / pad.length)) + ' por casa</span>'
      },
      {
        lab: 'Casas con saldo',
        val: String(pad.filter(function (x) { return x.situacion.saldo > 0.005; }).length),
        tono: 'warn',
        nota: '<span>' + esc(CC.fmt.pct(pad.filter(function (x) { return x.situacion.saldo > 0.005; }).length / pad.length)) + ' del padrón</span>'
      },
      {
        lab: 'Por cobrar acumulado',
        val: CC.fmt.money(pad.reduce(function (a, x) { return a + Math.max(0, x.situacion.saldo); }, 0)),
        tono: 'crit',
        nota: '<span>de todos los periodos</span>'
      }
    ]);

    /* --- Renglones, con encabezado cuando cambia de calle --- */
    var calleActual = null;
    var filas = visibles.map(function (x) {
      var u = x.unidad, s = x.situacion;
      var encabezado = '';
      if (f.calle === 'todas' && u.calle !== calleActual) {
        calleActual = u.calle;
        encabezado = '<tr class="ledger__grupo"><td colspan="7">' + esc(u.calle || 'Sin calle') +
          ' <span class="muted">· ' + conteoCalle[u.calle || 'Sin calle'] + ' casas</span></td></tr>';
      }

      var clase = s.estado === 'moroso' ? 'row--crit' : s.estado === 'vencido' ? 'row--warn' : '';
      return encabezado + '<tr class="' + clase + ' fila-clic" data-casa="' + esc(u.id) + '" title="Ver la casa">' +
        '<td><a href="#/unidad/' + esc(u.id) + '" class="strong">' + esc(u.clave) + '</a>' +
        (u.prototipo ? '<div class="muted" style="font-size:11px">Tipo ' + esc(u.prototipo) + ' · ' + esc(u.m2) + ' m²</div>' : '') +
        '</td>' +
        '<td><div class="cellstack"><span>' + esc(u.inquilino || u.propietario || '—') + '</span>' +
        (u.inquilino ? '<small>Inquilino · prop. ' + esc(u.propietario) + '</small>'
          : '<small>' + esc(u.ocupacion || '') + '</small>') + '</div></td>' +
        '<td><div class="indiviso"><span class="indiviso__bar"><i style="width:' +
        Math.min(100, x.indiviso * 100 * 90).toFixed(1) + '%"></i></span>' +
        '<span class="indiviso__val">' + esc(CC.fmt.pct(x.indiviso)) + '</span></div></td>' +
        '<td class="r">' + esc(CC.fmt.money2(x.cuota)) + '</td>' +
        '<td class="r ' + (s.saldo > 0.005 ? 'strong' : 'muted') + '">' +
        (s.aFavor > 0.005 ? '<span style="color:var(--good)">' + esc(CC.fmt.money2(s.aFavor)) + ' a favor</span>'
          : esc(CC.fmt.money2(Math.max(0, s.saldo)))) + '</td>' +
        '<td class="c">' + CC.ui.pill(s.estado) +
        (s.desde ? '<div class="muted" style="font-size:10.5px;margin-top:2px">desde ' + esc(CC.fmt.periodoCorto(s.desde)) + '</div>' : '') +
        '</td>' +
        '<td class="r noprint" style="white-space:nowrap">' +
        '<a class="btn btn--sm btn--soft" href="#/unidad/' + esc(u.id) + '">Ver historial</a></td>' +
        '</tr>';
    }).join('');

    var tipos = CC.Model.cuotasPorTipo();
    var cuotasTipo = tipos.length > 1 || (tipos[0] && tipos[0].tipo !== 'Sin tipo')
      ? '<div class="panelbox"><div class="panelbox__head"><h3>Cuota de mantenimiento por tipo de casa</h3>' +
        '<span class="eyebrow">' + esc(CC.fmt.periodo(ctx.periodo)) + '</span></div>' +
        '<div class="tipos">' + tipos.map(function (t) {
          return '<div class="tipo">' +
            '<span class="tipo__nom">Tipo ' + esc(t.tipo) + '</span>' +
            '<span class="tipo__m2">' + esc(t.m2) + ' m² · ' + t.casas + ' casas</span>' +
            '<strong class="num">' + esc(t.min === t.max ? CC.fmt.money2(t.min) : CC.fmt.money(t.min) + '–' + CC.fmt.money(t.max)) + '</strong>' +
            '<span class="tipo__m2">al mes · ' + esc(CC.fmt.money(t.total)) + ' entre todas</span>' +
            '</div>';
        }).join('') + '</div></div>'
      : '';

    return '<div class="section">' + resumen + cuotasTipo + '</div>' +

      '<div class="section">' +
      '<div class="section__head noprint" style="align-items:center">' +
      '<div class="search"><svg class="i"><use href="#i-buscar"/></svg>' +
      '<input class="input" id="qUnidad" type="search" placeholder="Buscar casa, calle o residente" value="' + esc(f.texto) + '"></div>' +
      '<div class="chips">' + chipsEstado + '</div>' +
      '</div>' +
      (chipsCalle ? '<div class="chips noprint">' + chipsCalle + '</div>' : '') +

      '<div class="panelbox"><div class="tablewrap"><table class="ledger ledger--padron">' +
      '<thead><tr>' +
      '<th>Casa</th><th>Residente</th><th>Indiviso</th>' +
      '<th class="r">Cuota mensual</th><th class="r">Saldo</th><th class="c">Estado</th><th class="noprint"></th>' +
      '</tr></thead>' +
      '<tbody>' + (filas || '<tr><td colspan="7"><div class="empty"><strong>Sin coincidencias</strong>' +
        '<p>Ninguna casa cumple con el filtro activo.</p></div></td></tr>') + '</tbody>' +
      (visibles.length ? '<tfoot><tr>' +
        '<td colspan="3">' + visibles.length + ' de ' + pad.length + ' casas</td>' +
        '<td class="r">' + esc(CC.fmt.money2(totalCuota)) + '</td>' +
        '<td class="r">' + esc(CC.fmt.money2(totalSaldo)) + '</td>' +
        '<td colspan="2"></td></tr></tfoot>' : '') +
      '</table></div></div>' +
      '</div>';
  },

  montar: function (raiz, ctx, redibujar) {
    var q = raiz.querySelector('#qUnidad');
    if (q) q.oninput = function () { filtroUnidades.texto = q.value; redibujar(true); };

    raiz.querySelectorAll('[data-festado]').forEach(function (b) {
      b.onclick = function () { filtroUnidades.estado = b.getAttribute('data-festado'); redibujar(); };
    });
    raiz.querySelectorAll('[data-fcalle]').forEach(function (b) {
      b.onclick = function () { filtroUnidades.calle = b.getAttribute('data-fcalle'); redibujar(); };
    });
  },

  nuevaUnidad: function () { formularioUnidad(null); }
};

/* ---------- Vista: estado de cuenta de una unidad ---------- */
CC.vistas.unidad = {
  titulo: function (ctx) {
    var u = CC.Store.unidad(ctx.param);
    return u ? 'Casa ' + u.clave : 'Casa';
  },
  sub: function (ctx) {
    var u = CC.Store.unidad(ctx.param);
    if (!u) return '';
    return (u.inquilino ? u.inquilino + ' (inquilino) · prop. ' + u.propietario : u.propietario) +
      ' · ' + CC.fmt.num(u.m2) + ' m²';
  },
  acciones: function (ctx) {
    if (!CC.Store.unidad(ctx.param)) return [];
    var s = CC.Model.situacion(ctx.param, ctx.periodo);
    var lista = [
      { texto: 'Registrar pago', icono: 'mas', clase: 'btn', accion: 'pagoUnidad' },
      { texto: 'Cargo extra', icono: 'mas', clase: 'btn btn--ghost', accion: 'cargoExtra' }
    ];
    if (s.saldo > 0.005) {
      lista.push({ texto: 'Avisar adeudo', icono: 'wa', clase: 'btn btn--ghost', accion: 'recordatorio' });
      lista.push({ texto: CC.Model.convenioDe(ctx.param) ? 'Convenio' : 'Hacer convenio', icono: 'recibos', clase: 'btn btn--ghost', accion: 'convenio' });
    }
    lista.push({ texto: 'Anotar', icono: 'avisos', clase: 'btn btn--ghost', accion: 'nota' });
    lista.push({ texto: 'Estado de cuenta PDF', icono: 'imprimir', clase: 'btn btn--ghost', accion: 'estadoCuenta' });
    lista.push({ texto: 'Editar', icono: 'ajustes', clase: 'btn btn--ghost', accion: 'editar' });
    return lista;
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var u = CC.Store.unidad(ctx.param);
    if (!u) {
      return '<div class="panelbox"><div class="empty"><strong>Casa no encontrada</strong>' +
        '<p>Puede que se haya eliminado.</p>' +
        '<a class="btn btn--ghost" href="#/unidades" style="margin-top:8px">Volver al padrón</a></div></div>';
    }

    var s = CC.Model.situacion(u.id, ctx.periodo);
    var cuota = CC.Model.cuota(u);
    var cond = CC.Store.condominio();

    /* Movimientos en orden cronológico, con saldo corriente */
    var movs = [];
    CC.Store.cargos().filter(function (c) { return c.unidadId === u.id && c.periodo <= ctx.periodo; })
      .forEach(function (c) {
        movs.push({
          fecha: c.fechaVence || (c.periodo + '-01'), cargo: c.monto, abono: 0, cargoId: c.id,
          concepto: c.concepto + (c.condonado ? ' (condonado)' : c.manual ? ' (corregido)' : '')
        });
      });
    CC.Store.pagos().filter(function (p) { return p.unidadId === u.id && p.periodo <= ctx.periodo; })
      .forEach(function (p) {
        movs.push({
          fecha: p.fecha,
          concepto: 'Pago recibido P-' + String(p.folio || 0).padStart(4, '0') + ' — ' + (p.metodo || 'sin método') + (p.referencia ? ' · ref. ' + p.referencia : ''),
          cargo: 0, abono: p.monto, id: p.id
        });
      });
    movs.sort(function (a, b) { return (a.fecha || '') < (b.fecha || '') ? -1 : (a.fecha === b.fecha ? 0 : 1); });

    var corriente = 0;
    var filas = movs.map(function (m) {
      corriente += m.cargo - m.abono;
      return '<tr>' +
        '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(CC.fmt.fechaCorta(m.fecha)) + '</td>' +
        '<td>' + esc(m.concepto) + (m.cargoId ? ' <button class="linkbtn noprint" data-corcargo="' + esc(m.cargoId) + '">corregir</button>' : '') + '</td>' +
        '<td class="r">' + (m.cargo || m.cargoId ? esc(CC.fmt.money2(m.cargo)) : '') + '</td>' +
        '<td class="r" style="color:var(--good)">' + (m.abono ? esc(CC.fmt.money2(m.abono)) : '') + '</td>' +
        '<td class="r strong">' + esc(CC.fmt.money2(corriente)) + '</td>' +
        '</tr>';
    }).join('');

    var totalPagar = s.saldo + s.recargo;

    var cabecera =
      '<div class="recibo">' +
      '<div class="recibo__head">' +
      '<div><p class="eyebrow">Estado de cuenta</p>' +
      '<h3>' + esc(cond.nombre || 'Condominio') + ' — Casa ' + esc(u.clave) + '</h3>' +
      '<p class="muted" style="font-size:12px;margin-top:4px">' +
      esc(u.inquilino || u.propietario) + (u.telefono ? ' · ' + esc(u.telefono) : '') + '</p></div>' +
      '<div class="recibo__folio">' +
      'Corte: ' + esc(CC.fmt.periodo(ctx.periodo)) + '<br>' +
      'Emitido: ' + esc(CC.fmt.fechaCorta(CC.per.hoyISO())) + '<br>' +
      'Indiviso: ' + esc(CC.fmt.pct(CC.Model.indiviso(u))) + '</div>' +
      '</div>' +
      '<div class="tablewrap"><table class="ledger">' +
      '<thead><tr><th>Fecha</th><th>Concepto</th><th class="r">Cargo</th><th class="r">Abono</th><th class="r">Saldo</th></tr></thead>' +
      '<tbody>' + (filas || '<tr><td colspan="5"><div class="empty"><strong>Sin movimientos</strong>' +
        '<p>Esta casa no tiene cargos ni pagos hasta este periodo.</p></div></td></tr>') + '</tbody>' +
      '</table></div>' +
      '<div class="recibo__tot">' +
      '<span>' + (s.saldo < -0.005 ? 'Saldo a favor' : 'Saldo al corte') + '</span>' +
      '<strong style="color:' + (s.saldo > 0.005 ? 'var(--crit)' : 'var(--good)') + '">' +
      esc(CC.fmt.money2(Math.abs(s.saldo))) + '</strong>' +
      '</div>' +
      (s.recargo > 0
        ? '<div class="recibo__tot" style="border-top:1px solid var(--rule)">' +
          '<span>Recargo por mora (' + esc(cond.tasaMoraMensual) + '% mensual) &rarr; total a pagar</span>' +
          '<strong style="color:var(--crit)">' + esc(CC.fmt.money2(totalPagar)) + '</strong></div>'
        : '') +
      '</div>';

    var cifras = CC.ui.stats([
      { lab: 'Cuota mensual', val: CC.fmt.money2(cuota), nota: '<span>' + esc(CC.fmt.pct(CC.Model.indiviso(u))) + ' de indiviso</span>' },
      {
        lab: 'Saldo', val: CC.fmt.money2(Math.abs(s.saldo)),
        tono: s.saldo > 0.005 ? 'crit' : 'good',
        nota: '<span>' + (s.saldo > 0.005 ? 'por cobrar'
          : s.saldo < -0.005 ? 'a favor' + (CC.Model.pagadoHasta(u.id) ? ' · pagado hasta ' + esc(CC.fmt.periodoCorto(CC.Model.pagadoHasta(u.id))) : '')
          : 'sin adeudo') + '</span>'
      },
      {
        lab: 'Meses vencidos', val: String(s.mesesVencidos),
        tono: s.mesesVencidos >= 2 ? 'crit' : s.mesesVencidos === 1 ? 'warn' : 'good',
        nota: s.desde ? '<span>desde ' + esc(CC.fmt.periodo(s.desde)) + '</span>' : '<span>al corriente</span>'
      },
      {
        lab: 'Último pago',
        val: s.ultimoPago ? CC.fmt.fecha(s.ultimoPago.fecha) : 'Sin pagos',
        tono: s.ultimoPago && CC.per.diasEntre(s.ultimoPago.fecha, CC.per.hoyISO()) > 45 ? 'warn' : null,
        nota: s.ultimoPago ? '<span>' + esc(CC.fmt.money2(s.ultimoPago.monto)) + ' · ' +
          esc(CC.per.diasEntre(s.ultimoPago.fecha, CC.per.hoyISO())) + ' días</span>' : '<span>no hay pagos registrados</span>'
      }
    ]);

    /* Convenio vigente, si lo hay */
    var cv = CC.Model.convenioDe(u.id);
    var bloqueConvenio = cv
      ? '<div class="panelbox"><div class="panelbox__head"><h3>Convenio de pago ' +
        esc(CC.Comprobantes.folio('CV-', cv.convenio.folio)) + '</h3>' +
        '<button class="btn btn--sm btn--ghost" data-pdfcv="' + esc(cv.convenio.id) + '">' +
        CC.ui.icono('imprimir', 'i--sm') + ' PDF para firmar</button></div>' +
        '<div class="panelbox__body">' + CC.vistas.adeudos.convenioHTML(cv) + '</div></div>'
      : '';

    /* --- Bitácora: todo lo que ha pasado con esta casa, en un solo hilo --- */
    var eventos = [];

    CC.Store.cargos().filter(function (c) { return c.unidadId === u.id; })
      .forEach(function (c) {
        eventos.push({
          fecha: c.fechaVence || (c.periodo + '-01'),
          etiqueta: c.tipo === 'extraordinaria' ? 'Cuota extraordinaria' : 'Cargo',
          tono: 'mute',
          titulo: c.concepto,
          detalle: 'Se generó por ' + CC.fmt.money2(c.monto) +
            ', con vencimiento el ' + CC.fmt.fecha(c.fechaVence)
        });
      });

    CC.Store.pagos().filter(function (p) { return p.unidadId === u.id; })
      .forEach(function (p) {
        eventos.push({
          fecha: p.fecha,
          etiqueta: 'Pago',
          tono: 'good',
          pagoId: p.id,
          titulo: 'Pagó ' + CC.fmt.money2(p.monto) + ' · folio ' + CC.Comprobantes.folio('P-', p.folio) +
            (p.convenioId ? ' · abono al convenio' : ''),
          detalle: [
            p.metodo,
            p.referencia ? 'referencia ' + p.referencia : '',
            'aplicado a ' + CC.fmt.periodo(p.periodo),
            p.nota
          ].filter(Boolean).join(' · ')
        });
      });
    // Los cancelados también se ven, con su motivo: el folio no desaparece
    CC.Store.todosLosPagos().filter(function (p) { return p.unidadId === u.id && p.cancelado; })
      .forEach(function (p) {
        eventos.push({
          fecha: p.fecha,
          etiqueta: 'Pago cancelado',
          tono: 'mute',
          titulo: CC.fmt.money2(p.monto) + ' · folio ' + CC.Comprobantes.folio('P-', p.folio) + ' (no cuenta)',
          detalle: 'Se canceló el ' + CC.fmt.fecha(String(p.canceladoEl || '').slice(0, 10)) +
            (p.motivoCancelacion ? ': ' + p.motivoCancelacion : '')
        });
      });

    CC.Store.notas().filter(function (n) { return n.unidadId === u.id; })
      .forEach(function (n) {
        eventos.push({
          fecha: n.fecha,
          etiqueta: n.tipo === 'incidencia' ? 'Incidencia' : 'Gestión',
          tono: n.tipo === 'incidencia' ? 'warn' : 'accent',
          titulo: n.tipo === 'incidencia' ? 'Incidencia reportada' : 'Gestión de cobranza',
          detalle: n.texto,
          notaId: n.id
        });
      });

    CC.Model.avisosDe(u.id).forEach(function (a) {
      eventos.push({
        fecha: a.fecha.slice(0, 10),
        etiqueta: 'Aviso',
        tono: 'warn',
        titulo: 'Aviso de adeudo por ' + (a.canal === 'correo' ? 'correo' : 'WhatsApp'),
        detalle: 'Se le avisó que debía ' + CC.fmt.money2(a.saldo) +
          (a.meses > 1 ? ' (' + a.meses + ' meses)' : '') + '.'
      });
    });

    eventos.sort(function (a, b) { return (a.fecha || '') < (b.fecha || '') ? 1 : -1; });

    var bitacora =
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Historial de la casa</h3>' +
      '<span class="eyebrow">' + eventos.length + ' movimientos desde ' +
      esc(eventos.length ? CC.fmt.periodo(CC.per.de(eventos[eventos.length - 1].fecha)) : '—') +
      '</span></div>' +
      (eventos.length
        ? '<ol class="bitacora">' + eventos.map(function (e) {
            return '<li class="bitacora__item bitacora__item--' + e.tono + '">' +
              '<div class="bitacora__marca" aria-hidden="true"></div>' +
              '<div class="bitacora__cuerpo">' +
              '<div class="bitacora__cab">' +
              '<span class="pill pill--flat pill--' + (e.tono === 'accent' ? 'mute' : e.tono) + '">' +
              esc(e.etiqueta) + '</span>' +
              '<time class="mono">' + esc(CC.fmt.fecha(e.fecha)) + '</time>' +
              (e.notaId
                ? '<button class="iconbtn noprint" data-delnota="' + esc(e.notaId) + '" title="Borrar nota">' +
                  CC.ui.icono('cerrar', 'i--sm') + '</button>'
                : '') +
              (e.pagoId
                ? '<button class="btn btn--sm btn--ghost noprint bitacora__accion" data-recpago="' + esc(e.pagoId) + '">' +
                  CC.ui.icono('imprimir', 'i--sm') + ' Recibo</button>'
                : '') +
              '</div>' +
              '<p class="bitacora__titulo">' + esc(e.titulo) + '</p>' +
              (e.detalle ? '<p class="bitacora__detalle">' + esc(e.detalle) + '</p>' : '') +
              '</div></li>';
          }).join('') + '</ol>'
        : '<div class="empty"><strong>Sin movimientos</strong>' +
          '<p>Aquí aparecerá todo lo que pase con esta casa: cargos, pagos, ' +
          'llamadas de cobranza e incidencias.</p></div>') +
      '</div>';

    return '<p class="noprint"><a href="#/unidades" class="btn btn--sm btn--ghost">' +
      CC.ui.icono('volver', 'i--sm') + ' Padrón de casas</a></p>' +
      cifras + bloqueConvenio + cabecera + bitacora + bloqueVisitas(u);

    /* Las últimas visitas de la casa, si el condominio lleva el registro */
    function bloqueVisitas(casa) {
      if (!cond.registroVisitas) return '';
      var l = CC.Model.visitasDe(casa.id).slice(0, 6);
      return '<div class="panelbox"><div class="panelbox__head"><h3>Visitas de la casa</h3>' +
        '<a class="btn btn--sm btn--soft" href="#/visitas">Registro de visitas</a></div>' +
        (l.length ? '<ul class="reslista">' + l.map(function (v) {
          return '<li><span><b>' + esc(v.nombre) + '</b> · ' + esc(v.tipo) + '</span><span class="muted mono" style="font-size:12px">' +
            esc(v.estado === 'esperada' ? 'esperada ' + CC.fmt.fecha(v.fecha) : CC.fmt.fecha(v.fecha) + ' ' + (v.entrada || '')) + '</span></li>';
        }).join('') + '</ul>' : '<div class="empty"><strong>Sin visitas registradas</strong></div>') + '</div>';
    }
  },

  montar: function (raiz) {
    raiz.querySelectorAll('[data-corcargo]').forEach(function (b) {
      b.onclick = function () { CC.vistas.unidad.corregirCargo(b.getAttribute('data-corcargo')); };
    });
    raiz.querySelectorAll('[data-recpago]').forEach(function (b) {
      b.onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.reciboPago(b.getAttribute('data-recpago'))); };
    });
    raiz.querySelectorAll('[data-pdfcv]').forEach(function (b) {
      b.onclick = function () { CC.Comprobantes.descargar(CC.Comprobantes.convenio(b.getAttribute('data-pdfcv'))); };
    });
    raiz.querySelectorAll('[data-delnota]').forEach(function (b) {
      b.onclick = function () {
        CC.ui.confirmar('Borrar nota',
          'La nota desaparece del historial de la casa.',
          'Borrar', function () {
            CC.Store.borrarNota(b.getAttribute('data-delnota'));
            CC.ui.toast('Nota borrada');
          }, true);
      };
    });
  },

  /** Anota una llamada, un acuerdo o una incidencia en el historial. */
  nota: function (ctx) {
    var u = CC.Store.unidad(ctx.param);
    if (!u) return;
    var esc = CC.ui.esc;

    CC.ui.modal('Anotar en el historial de ' + u.clave,
      '<div class="formgrid">' +
      '<label class="field"><span class="field__lab">Tipo</span>' +
      '<select class="input" id="nTipo">' +
      '<option value="gestion">Gestión de cobranza</option>' +
      '<option value="incidencia">Incidencia</option>' +
      '</select></label>' +
      '<label class="field"><span class="field__lab">Fecha</span>' +
      '<input class="input" id="nFecha" type="date" value="' + esc(CC.per.hoyISO()) + '"></label>' +
      '</div>' +
      '<label class="field" style="margin-top:14px"><span class="field__lab">Qué pasó</span>' +
      '<textarea class="input" id="nTexto" rows="5" ' +
      'placeholder="Se le llamó, quedó de pagar el viernes. / Reportó una fuga en el patio."></textarea>' +
      '<span class="field__hint">Queda en el historial de la casa, con fecha. Sirve de constancia.</span></label>' +
      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="nCancel">Cancelar</button>' +
      '<button type="button" class="btn" id="nOk">Guardar nota</button>' +
      '</div>',
      function (cuerpo) {
        cuerpo.querySelector('#nCancel').onclick = CC.ui.cerrarModal;
        cuerpo.querySelector('#nOk').onclick = function () {
          var texto = cuerpo.querySelector('#nTexto').value.trim();
          if (!texto) { CC.ui.toast('Escribe qué pasó', 'crit'); return; }
          CC.Store.agregarNota({
            unidadId: u.id,
            tipo: cuerpo.querySelector('#nTipo').value,
            fecha: cuerpo.querySelector('#nFecha').value || CC.per.hoyISO(),
            texto: texto
          });
          CC.ui.cerrarModal();
          CC.ui.toast('Anotado en el historial', 'good');
        };
      });
  },

  pagoUnidad: function (ctx) { CC.vistas.cobranza.formularioPago(ctx.param, ctx.periodo); },
  editar: function (ctx) { formularioUnidad(CC.Store.unidad(ctx.param)); },
  imprimir: function () { window.print(); },

  /** Un cargo que no es la cuota (la renta de la casa club, una multa) va al estado de cuenta de la casa. */
  cargoExtra: function (ctx) {
    var esc = CC.ui.esc;
    var u = CC.Store.unidad(ctx.param);
    if (!u) return;
    var TIPOS = [['casaclub', 'Renta de la casa club'], ['multa', 'Multa'], ['otro', 'Otro cargo']];
    var meses = CC.Model.periodos().slice();
    if (meses.indexOf(ctx.periodo) < 0) meses.push(ctx.periodo);
    meses.sort().reverse();
    CC.ui.modal('Cargo extra — casa ' + u.clave,
      '<div class="formgrid">' +
      '<label class="field"><span class="field__lab">Qué es</span><select class="input" id="xTipo">' +
      TIPOS.map(function (t) { return '<option value="' + t[0] + '">' + esc(t[1]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span class="field__lab">Monto</span><input class="input num" id="xMonto" type="number" min="0" step="0.01"></label>' +
      '<label class="field" style="grid-column:1/-1"><span class="field__lab">Concepto (así sale en su estado de cuenta)</span>' +
      '<input class="input" id="xConcepto" value="Renta de la casa club"></label>' +
      '<label class="field"><span class="field__lab">Mes</span><select class="input" id="xMes">' +
      meses.map(function (p) { return '<option value="' + p + '"' + (p === ctx.periodo ? ' selected' : '') + '>' + esc(CC.fmt.periodo(p)) + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="field"><span class="field__lab">Vence</span><input class="input" id="xVence" type="date" value="' + esc(CC.per.hoyISO()) + '"></label>' +
      '</div>' +
      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="xCerrar">Cancelar</button>' +
      '<button type="button" class="btn" id="xOk">Cargar a la casa</button></div>',
      function (cuerpo) {
        var q = function (id) { return cuerpo.querySelector('#' + id); };
        var sugerido = { casaclub: 'Renta de la casa club', multa: 'Multa', otro: '' };
        q('xTipo').onchange = function () {
          var actual = q('xConcepto').value.trim();
          var esSugerido = Object.keys(sugerido).some(function (k) { return sugerido[k] === actual; });
          if (!actual || esSugerido) q('xConcepto').value = sugerido[q('xTipo').value];
          q('xConcepto').focus();
        };
        q('xCerrar').onclick = CC.ui.cerrarModal;
        q('xOk').onclick = function () {
          var monto = Number(q('xMonto').value);
          var concepto = q('xConcepto').value.trim();
          if (!(monto > 0)) { CC.ui.toast('Escribe el monto', 'crit'); return; }
          if (!concepto) { CC.ui.toast('Escribe el concepto', 'crit'); return; }
          CC.Store.agregarCargo({
            unidadId: u.id, periodo: q('xMes').value, tipo: q('xTipo').value,
            concepto: concepto, monto: monto, fechaVence: q('xVence').value || CC.per.hoyISO()
          });
          CC.ui.cerrarModal();
          CC.ui.toast(CC.fmt.money2(monto) + ' cargados a la casa ' + u.clave, 'good');
        };
      });
  },

  /** Corregir un cargo: un recargo de más, un monto mal capturado. Queda constancia. */
  corregirCargo: function (cargoId) {
    var esc = CC.ui.esc;
    var c = CC.Store.cargo(cargoId);
    if (!c) return;
    var esRecargo = c.tipo === 'recargo';
    CC.ui.modal('Corregir cargo',
      '<p class="field__hint" style="margin-bottom:12px">' + esc(c.concepto) + ' · ' + esc(CC.fmt.periodo(c.periodo)) + '</p>' +
      '<div class="formgrid">' +
      '<label class="field"><span class="field__lab">Concepto</span><input class="input" id="kConcepto" value="' + esc(c.concepto) + '"></label>' +
      '<label class="field"><span class="field__lab">Monto</span><input class="input num" id="kMonto" type="number" min="0" step="0.01" value="' + esc(c.monto) + '"></label>' +
      '</div>' +
      (esRecargo && c.auto ? '<p class="field__hint" style="margin-top:10px">Este recargo lo pone el sistema. Si lo corriges o lo condonas, ya no lo vuelve a calcular.</p>' : '') +
      ((c.historial || []).length ? '<details class="historial"><summary>' + c.historial.length + ' cambios</summary><ul>' +
        c.historial.map(function (h) {
          return '<li><span class="mono">' + esc(CC.fmt.fecha(h.fecha)) + '</span> antes: ' +
            esc(Object.keys(h.antes).map(function (k) { return k + ' = ' + h.antes[k]; }).join(' · ')) + '</li>';
        }).join('') + '</ul></details>' : '') +
      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="kCondonar" style="margin-right:auto">Condonar</button>' +
      '<button type="button" class="btn btn--ghost" id="kCerrar">Cerrar</button>' +
      '<button type="button" class="btn" id="kOk">Guardar</button></div>',
      function (cuerpo) {
        var q = function (id) { return cuerpo.querySelector('#' + id); };
        q('kCerrar').onclick = CC.ui.cerrarModal;
        q('kCondonar').onclick = function () {
          CC.ui.pedirTexto('Condonar cargo', 'El cargo queda en $0 y a la vista, con el motivo. ¿Por qué se condona?', 'Condonar', function (motivo) {
            CC.Store.condonarCargo(c.id, motivo);
            CC.ui.toast('Cargo condonado', 'good');
          });
        };
        q('kOk').onclick = function () {
          var monto = Number(q('kMonto').value);
          if (!(monto >= 0)) { CC.ui.toast('Revisa el monto', 'crit'); return; }
          CC.Store.editarCargo(c.id, { concepto: q('kConcepto').value.trim() || c.concepto, monto: monto });
          CC.ui.cerrarModal();
          CC.ui.toast('Cargo corregido; el cambio queda anotado', 'good');
        };
      });
  },

  /** Estado de cuenta en PDF de tal mes a tal mes, para bajarlo o mandarlo al vecino. */
  estadoCuenta: function (ctx) {
    var esc = CC.ui.esc;
    var u = CC.Store.unidad(ctx.param);
    if (!u) return;
    var meses = CC.Model.periodos().slice().sort();
    var hasta = ctx.periodo, desde = meses[0] || ctx.periodo;
    var opciones = function (sel) {
      return meses.map(function (p) { return '<option value="' + p + '"' + (p === sel ? ' selected' : '') + '>' + esc(CC.fmt.periodo(p)) + '</option>'; }).join('');
    };
    CC.ui.modal('Estado de cuenta — casa ' + u.clave,
      '<div class="formgrid">' +
      '<label class="field"><span class="field__lab">Desde</span><select class="input" id="ecDesde">' + opciones(desde) + '</select></label>' +
      '<label class="field"><span class="field__lab">Hasta</span><select class="input" id="ecHasta">' + opciones(hasta) + '</select></label>' +
      '</div>' +
      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="ecCerrar">Cerrar</button>' +
      (u.telefono ? '<button type="button" class="btn btn--ghost" id="ecWa">' + CC.ui.icono('wa', 'i--sm') + ' Mandar por WhatsApp</button>' : '') +
      '<button type="button" class="btn" id="ecPdf">' + CC.ui.icono('imprimir', 'i--sm') + ' Descargar PDF</button></div>',
      function (cuerpo) {
        var q = function (id) { return cuerpo.querySelector('#' + id); };
        var rango = function () {
          var a = q('ecDesde').value, b = q('ecHasta').value;
          return a <= b ? [a, b] : [b, a];
        };
        q('ecCerrar').onclick = CC.ui.cerrarModal;
        q('ecPdf').onclick = function () { var r = rango(); CC.Comprobantes.descargar(CC.Comprobantes.estadoCuenta(u.id, r[0], r[1])); };
        if (q('ecWa')) q('ecWa').onclick = function () {
          var r = rango();
          CC.Comprobantes.compartir(CC.Comprobantes.estadoCuenta(u.id, r[0], r[1]), CC.Comprobantes.textoEstadoCuenta(u.id, r[0], r[1]), u.telefono);
        };
      });
  },

  /** Aviso de adeudo por WhatsApp o correo, con el saldo real de la casa. */
  recordatorio: function (ctx) { CC.vistas.adeudos.avisarUna(ctx.param, ctx.periodo); },
  convenio: function (ctx) {
    var cv = CC.Model.convenioDe(ctx.param);
    if (cv) CC.vistas.adeudos.verConvenio(cv.convenio.id);
    else CC.vistas.adeudos.convenio(ctx.param, ctx.periodo);
  }
};
