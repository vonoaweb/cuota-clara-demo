/* views/unidades.js — el padron de unidades y el estado de cuenta de cada una. */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

/* Filtro vivo de la lista (no se guarda: es estado de pantalla). */
var filtroUnidades = { texto: '', estado: 'todas', torre: 'todas' };

/* ---------- Formulario de alta y edicion ---------- */
function formularioUnidad(unidad) {
  var u = unidad || { clave: '', torre: '', m2: '', propietario: '', inquilino: '', telefono: '', email: '', ocupacion: 'Propietario', cuotaOverride: null };
  var esc = CC.ui.esc;
  var titulo = unidad ? 'Editar unidad ' + u.clave : 'Nueva unidad';

  CC.ui.modal(titulo,
    '<div class="formgrid">' +
    '<label class="field"><span class="field__lab">Clave</span>' +
    '<input class="input" id="fClave" value="' + esc(u.clave) + '" placeholder="A-101" required></label>' +
    '<label class="field"><span class="field__lab">Torre o edificio</span>' +
    '<input class="input" id="fTorre" value="' + esc(u.torre) + '" placeholder="Torre A"></label>' +
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
    '<label class="field"><span class="field__lab">Ocupación</span>' +
    '<select class="input" id="fOcup">' +
    ['Propietario', 'Rentado', 'Desocupado'].map(function (o) {
      return '<option' + (u.ocupacion === o ? ' selected' : '') + '>' + o + '</option>';
    }).join('') + '</select></label>' +
    '</div>' +
    '<div class="formactions">' +
    (unidad ? '<button type="button" class="btn btn--ghost" id="bBorrar" style="margin-right:auto">Eliminar unidad</button>' : '') +
    '<button type="button" class="btn btn--ghost" id="bCancel">Cancelar</button>' +
    '<button type="button" class="btn" id="bGuardar">Guardar</button>' +
    '</div>',
    function (cuerpo) {
      cuerpo.querySelector('#bCancel').onclick = CC.ui.cerrarModal;

      var borrar = cuerpo.querySelector('#bBorrar');
      if (borrar) borrar.onclick = function () {
        CC.ui.confirmar('Eliminar ' + u.clave,
          'Se borra la unidad junto con sus cargos y pagos. Esta acción no se puede deshacer.',
          'Eliminar', function () {
            CC.Store.borrarUnidad(u.id);
            CC.ui.toast('Unidad eliminada');
            location.hash = '#/unidades';
          }, true);
      };

      cuerpo.querySelector('#bGuardar').onclick = function () {
        var clave = cuerpo.querySelector('#fClave').value.trim();
        if (!clave) { CC.ui.toast('La clave de la unidad es obligatoria', 'crit'); return; }
        var cuotaTxt = cuerpo.querySelector('#fCuota').value.trim();
        var datos = {
          clave: clave,
          torre: cuerpo.querySelector('#fTorre').value.trim(),
          m2: Number(cuerpo.querySelector('#fM2').value) || 0,
          cuotaOverride: cuotaTxt === '' ? null : Number(cuotaTxt),
          propietario: cuerpo.querySelector('#fProp').value.trim(),
          inquilino: cuerpo.querySelector('#fInq').value.trim() || null,
          telefono: cuerpo.querySelector('#fTel').value.trim(),
          email: cuerpo.querySelector('#fMail').value.trim(),
          ocupacion: cuerpo.querySelector('#fOcup').value
        };
        if (unidad) { CC.Store.actualizarUnidad(u.id, datos); CC.ui.toast('Unidad actualizada', 'good'); }
        else { CC.Store.agregarUnidad(datos); CC.ui.toast('Unidad agregada', 'good'); }
        CC.ui.cerrarModal();
      };
    });
}

/* ---------- Vista: padron ---------- */
CC.vistas.unidades = {
  titulo: 'Unidades',
  sub: function () {
    var n = CC.Store.unidades().length;
    return n + (n === 1 ? ' unidad' : ' unidades') + ' · ' + CC.fmt.num(CC.Model.totalM2()) + ' m² en total';
  },
  acciones: function () {
    return [{ texto: 'Nueva unidad', icono: 'más', clase: 'btn', accion: 'nuevaUnidad' }];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var pad = CC.Model.padron(ctx.periodo);
    var torres = {};
    CC.Store.unidades().forEach(function (u) { if (u.torre) torres[u.torre] = 1; });
    var listaTorres = Object.keys(torres).sort();

    if (!pad.length) {
      return '<div class="panelbox"><div class="empty">' +
        '<strong>Todavía no hay unidades</strong>' +
        '<p>Captura los departamentos o casas del condominio. El metraje de cada uno define su porcentaje de indiviso y su cuota.</p>' +
        '<button class="btn" data-accion="nuevaUnidad" style="margin-top:8px">Agregar la primera unidad</button>' +
        '</div></div>';
    }

    /* Filtros */
    var f = filtroUnidades;
    var chipsEstado = [['todas', 'Todas'], ['corriente', 'Al corriente'], ['vencido', 'Vencidas'], ['moroso', 'Morosas']]
      .map(function (c) {
        return '<button class="chip' + (f.estado === c[0] ? ' is-on' : '') + '" data-festado="' + c[0] + '">' + c[1] + '</button>';
      }).join('');
    var chipsTorre = listaTorres.length > 1
      ? '<span style="width:1px;height:22px;background:var(--rule);margin:0 4px"></span>' +
        '<button class="chip' + (f.torre === 'todas' ? ' is-on' : '') + '" data-ftorre="todas">Todas las torres</button>' +
        listaTorres.map(function (t) {
          return '<button class="chip' + (f.torre === t ? ' is-on' : '') + '" data-ftorre="' + esc(t) + '">' + esc(t) + '</button>';
        }).join('')
      : '';

    var visibles = pad.filter(function (x) {
      if (f.estado !== 'todas' && x.situacion.estado !== f.estado) return false;
      if (f.torre !== 'todas' && x.unidad.torre !== f.torre) return false;
      if (f.texto) {
        var t = f.texto.toLowerCase();
        var campo = (x.unidad.clave + ' ' + x.unidad.propietario + ' ' + (x.unidad.inquilino || '')).toLowerCase();
        if (campo.indexOf(t) < 0) return false;
      }
      return true;
    });

    var totalCuota = visibles.reduce(function (a, x) { return a + x.cuota; }, 0);
    var totalSaldo = visibles.reduce(function (a, x) { return a + x.situacion.saldo; }, 0);

    var filas = visibles.map(function (x) {
      var u = x.unidad, s = x.situacion;
      var clase = s.estado === 'moroso' ? 'row--crit' : s.estado === 'vencido' ? 'row--warn' : '';
      return '<tr class="' + clase + '">' +
        '<td><a href="#/unidad/' + esc(u.id) + '" class="strong">' + esc(u.clave) + '</a>' +
        (u.torre ? '<div class="muted" style="font-size:11px">' + esc(u.torre) + '</div>' : '') + '</td>' +
        '<td><div class="cellstack"><span>' + esc(u.inquilino || u.propietario || '—') + '</span>' +
        (u.inquilino ? '<small>Inquilino · prop. ' + esc(u.propietario) + '</small>'
          : '<small>' + esc(u.ocupacion || '') + '</small>') + '</div></td>' +
        '<td><div class="indiviso"><span class="indiviso__bar"><i style="width:' +
        Math.min(100, x.indiviso * 100 * 8).toFixed(1) + '%"></i></span>' +
        '<span class="indiviso__val">' + esc(CC.fmt.pct(x.indiviso)) + '</span></div></td>' +
        '<td class="r">' + esc(CC.fmt.money2(x.cuota)) + '</td>' +
        '<td class="r ' + (s.saldo > 0.005 ? 'strong' : 'muted') + '">' +
        (s.aFavor > 0.005 ? '<span style="color:var(--good)">' + esc(CC.fmt.money2(s.aFavor)) + ' a favor</span>'
          : esc(CC.fmt.money2(Math.max(0, s.saldo)))) + '</td>' +
        '<td class="c">' + CC.ui.pill(s.estado) +
        (s.mesesVencidos > 1 ? '<div class="muted" style="font-size:10.5px;margin-top:2px">' + s.mesesVencidos + ' meses</div>' : '') +
        '</td>' +
        '</tr>';
    }).join('');

    return '<div class="section">' +
      '<div class="section__head" style="align-items:center">' +
      '<div class="search"><svg class="i"><use href="#i-buscar"/></svg>' +
      '<input class="input" id="qUnidad" type="search" placeholder="Buscar unidad o residente" value="' + esc(f.texto) + '"></div>' +
      '<div class="chips">' + chipsEstado + chipsTorre + '</div>' +
      '</div>' +

      '<div class="panelbox"><div class="tablewrap"><table class="ledger">' +
      '<thead><tr>' +
      '<th>Unidad</th><th>Residente</th><th>Indiviso</th>' +
      '<th class="r">Cuota mensual</th><th class="r">Saldo</th><th class="c">Estado</th>' +
      '</tr></thead>' +
      '<tbody>' + (filas || '<tr><td colspan="6"><div class="empty"><strong>Sin coincidencias</strong>' +
        '<p>Ninguna unidad cumple con el filtro activo.</p></div></td></tr>') + '</tbody>' +
      (visibles.length ? '<tfoot><tr>' +
        '<td colspan="3">' + visibles.length + ' de ' + pad.length + ' unidades</td>' +
        '<td class="r">' + esc(CC.fmt.money2(totalCuota)) + '</td>' +
        '<td class="r">' + esc(CC.fmt.money2(Math.max(0, totalSaldo))) + '</td>' +
        '<td></td></tr></tfoot>' : '') +
      '</table></div></div>' +
      '</div>';
  },

  montar: function (raiz, ctx, redibujar) {
    var q = raiz.querySelector('#qUnidad');
    if (q) {
      q.oninput = function () { filtroUnidades.texto = q.value; redibujar(true); };
    }
    raiz.querySelectorAll('[data-festado]').forEach(function (b) {
      b.onclick = function () { filtroUnidades.estado = b.getAttribute('data-festado'); redibujar(); };
    });
    raiz.querySelectorAll('[data-ftorre]').forEach(function (b) {
      b.onclick = function () { filtroUnidades.torre = b.getAttribute('data-ftorre'); redibujar(); };
    });
  },

  nuevaUnidad: function () { formularioUnidad(null); }
};

/* ---------- Vista: estado de cuenta de una unidad ---------- */
CC.vistas.unidad = {
  titulo: function (ctx) {
    var u = CC.Store.unidad(ctx.param);
    return u ? 'Unidad ' + u.clave : 'Unidad';
  },
  sub: function (ctx) {
    var u = CC.Store.unidad(ctx.param);
    if (!u) return '';
    return (u.inquilino ? u.inquilino + ' (inquilino) · prop. ' + u.propietario : u.propietario) +
      ' · ' + CC.fmt.num(u.m2) + ' m²';
  },
  acciones: function (ctx) {
    if (!CC.Store.unidad(ctx.param)) return [];
    return [
      { texto: 'Registrar pago', icono: 'más', clase: 'btn', accion: 'pagoUnidad' },
      { texto: 'Recordatorio', icono: 'wa', clase: 'btn btn--ghost', accion: 'recordatorio' },
      { texto: 'Imprimir', icono: 'imprimir', clase: 'btn btn--ghost', accion: 'imprimir' },
      { texto: 'Editar', icono: 'ajustes', clase: 'btn btn--ghost', accion: 'editar' }
    ];
  },

  render: function (ctx) {
    var esc = CC.ui.esc;
    var u = CC.Store.unidad(ctx.param);
    if (!u) {
      return '<div class="panelbox"><div class="empty"><strong>Unidad no encontrada</strong>' +
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
        movs.push({ fecha: c.fechaVence || (c.periodo + '-01'), concepto: c.concepto, cargo: c.monto, abono: 0 });
      });
    CC.Store.pagos().filter(function (p) { return p.unidadId === u.id && p.periodo <= ctx.periodo; })
      .forEach(function (p) {
        movs.push({
          fecha: p.fecha,
          concepto: 'Pago recibido — ' + (p.metodo || 'sin método') + (p.referencia ? ' · ref. ' + p.referencia : ''),
          cargo: 0, abono: p.monto, id: p.id
        });
      });
    movs.sort(function (a, b) { return (a.fecha || '') < (b.fecha || '') ? -1 : (a.fecha === b.fecha ? 0 : 1); });

    var corriente = 0;
    var filas = movs.map(function (m) {
      corriente += m.cargo - m.abono;
      return '<tr>' +
        '<td class="mono" style="font-size:12px;white-space:nowrap">' + esc(CC.fmt.fechaCorta(m.fecha)) + '</td>' +
        '<td>' + esc(m.concepto) + '</td>' +
        '<td class="r">' + (m.cargo ? esc(CC.fmt.money2(m.cargo)) : '') + '</td>' +
        '<td class="r" style="color:var(--good)">' + (m.abono ? esc(CC.fmt.money2(m.abono)) : '') + '</td>' +
        '<td class="r strong">' + esc(CC.fmt.money2(corriente)) + '</td>' +
        '</tr>';
    }).join('');

    var totalPagar = s.saldo + s.recargo;

    var cabecera =
      '<div class="recibo">' +
      '<div class="recibo__head">' +
      '<div><p class="eyebrow">Estado de cuenta</p>' +
      '<h3>' + esc(cond.nombre || 'Condominio') + ' — Unidad ' + esc(u.clave) + '</h3>' +
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
        '<p>Esta unidad no tiene cargos ni pagos hasta este periodo.</p></div></td></tr>') + '</tbody>' +
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
        nota: '<span>' + (s.saldo > 0.005 ? 'por cobrar' : s.saldo < -0.005 ? 'a favor del residente' : 'sin adeudo') + '</span>'
      },
      {
        lab: 'Meses vencidos', val: String(s.mesesVencidos),
        tono: s.mesesVencidos >= 2 ? 'crit' : s.mesesVencidos === 1 ? 'warn' : 'good',
        nota: s.desde ? '<span>desde ' + esc(CC.fmt.periodo(s.desde)) + '</span>' : '<span>al corriente</span>'
      },
      {
        lab: 'Recargo estimado', val: CC.fmt.money2(s.recargo),
        tono: s.recargo > 0 ? 'warn' : null,
        nota: '<span>calculado, aún no cargado</span>'
      }
    ]);

    return '<p class="noprint"><a href="#/unidades" class="btn btn--sm btn--ghost">' +
      CC.ui.icono('volver', 'i--sm') + ' Padrón de unidades</a></p>' +
      cifras + cabecera;
  },

  pagoUnidad: function (ctx) { CC.vistas.cobranza.formularioPago(ctx.param, ctx.periodo); },
  editar: function (ctx) { formularioUnidad(CC.Store.unidad(ctx.param)); },
  imprimir: function () { window.print(); },

  recordatorio: function (ctx) {
    var u = CC.Store.unidad(ctx.param);
    if (!u) return;
    var texto = CC.Model.recordatorio(u.id, ctx.periodo);
    var digitos = String(u.telefono || '').replace(/\D/g, '');
    var tel = digitos.length === 10 ? '52' + digitos : digitos;
    var esc = CC.ui.esc;

    CC.ui.modal('Recordatorio de pago — ' + u.clave,
      '<p class="field__hint" style="margin-bottom:10px">Revisa el texto antes de enviarlo. Se arma con el saldo real de la unidad.</p>' +
      '<textarea class="input" id="txtRec" rows="12" style="font-size:13px">' + esc(texto) + '</textarea>' +
      '<div class="formactions">' +
      '<button type="button" class="btn btn--ghost" id="bCopiar">Copiar texto</button>' +
      (tel
        ? '<a class="btn" id="bWa" target="_blank" rel="noopener" href="https://wa.me/' + esc(tel) + '?text=' + encodeURIComponent(texto) + '">Abrir en WhatsApp</a>'
        : '<span class="field__hint">Esta unidad no tiene teléfono capturado</span>') +
      '</div>',
      function (cuerpo) {
        var ta = cuerpo.querySelector('#txtRec');
        cuerpo.querySelector('#bCopiar').onclick = function () {
          CC.ui.copiar(ta.value, 'Recordatorio copiado');
        };
        var wa = cuerpo.querySelector('#bWa');
        if (wa) {
          ta.oninput = function () {
            wa.href = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(ta.value);
          };
        }
      });
  }
};
