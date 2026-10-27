/* views/ajustes.js — datos del condominio, reglas de cobro, presupuesto
   por servicio y manejo del respaldo. */
window.CC = window.CC || {};
CC.vistas = CC.vistas || {};

CC.vistas.ajustes = {
  titulo: 'Ajustes',
  sub: function () { return 'Datos del condominio y reglas de cobro'; },
  acciones: function () { return []; },

  render: function () {
    var esc = CC.ui.esc;
    var c = CC.Store.condominio();
    var cats = CC.Store.categorias();
    var totalPresupuesto = cats.reduce(function (a, x) { return a + (Number(x.presupuesto) || 0); }, 0);
    var cuotaTotal = CC.Model.cuotaTotal();

    var out = [];

    /* --- Identidad --- */
    out.push(
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Datos del condominio</h3>' +
      '<button class="btn btn--sm" id="bGuardarCond">Guardar cambios</button></div>' +
      '<div class="panelbox__body">' +
      '<div class="formgrid">' +
      campo('cNombre', 'Nombre', c.nombre, 'Residencial Alameda 214') +
      campo('cDireccion', 'Dirección', c.direccion, 'Av. Alameda 214') +
      campo('cCiudad', 'Ciudad', c.ciudad, 'Guadalajara, Jalisco') +
      campo('cAdmin', 'Administrador o comité', c.administrador, 'Comité de Administración') +
      campo('cTel', 'Teléfono', c.telefono, '33 1234 5678') +
      campo('cMail', 'Correo', c.email, 'administracion@condominio.mx') +
      '</div>' +
      '<label class="field" style="margin-top:14px"><span class="field__lab">Cuenta para pagos</span>' +
      '<input class="input mono" id="cCuenta" value="' + esc(c.cuenta || '') + '" placeholder="Banco, cuenta y CLABE">' +
      '<span class="field__hint">Aparece en el portal del residente y en los recordatorios de pago</span></label>' +
      '<div class="field" style="margin-top:14px"><span class="field__lab">Logo del condominio</span>' +
      '<div class="logocond">' + (c.logo ? '<img src="' + esc(c.logo) + '" alt="Logo del condominio">' : '<span class="muted">Sin logo</span>') +
      '<label class="btn btn--sm btn--ghost" for="cLogo">' + (c.logo ? 'Cambiar logo' : 'Subir logo') + '</label>' +
      '<input type="file" id="cLogo" accept="image/*" hidden>' +
      (c.logo ? '<button type="button" class="btn btn--sm btn--ghost" id="cLogoQuitar">Quitar</button>' : '') + '</div>' +
      '<span class="field__hint">Sale arriba en los recibos de pago y de egreso y en los estados de cuenta</span></div>' +
      '</div></div>');

    /* --- Reglas de cobro --- */
    out.push(
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Reglas de cobro</h3>' +
      '<span class="eyebrow">Definen cuotas, vencimientos y recargos</span></div>' +
      '<div class="panelbox__body">' +
      '<div class="formgrid">' +
      campoNum('cPresupuesto', 'Presupuesto mensual', c.presupuestoMensual, 'Se reparte entre las casas por indiviso') +
      campoNum('cDia', 'Día de vencimiento', c.diaVencimiento, 'Día del mes en que vence la cuota') +
      campoNum('cFondo', 'Fondo de reserva (%)', c.fondoReservaPct, 'Parte de lo cobrado que se aparta') +
      campoNum('cAvisoDias', 'Avisar a los … días', c.avisoDiasTras, 'Días después del vencimiento para el primer aviso') +
      campoNum('cAvisoCada', 'Repetir aviso cada … días', c.avisoRepetirDias, 'Mientras la casa siga debiendo') +
      campoNum('cAnual', 'Meses gratis por pagar el año', c.mesesGratisAnualidad || 0, '0 = la anualidad no tiene descuento') +
      '</div>' +
      /* Recargos: montos fijos según el día en que se paga, un porcentaje o nada */
      '<div class="recargos">' +
      '<span class="field__lab">Recargo por pago tardío</span>' +
      '<div class="chips" style="margin:8px 0 10px">' + [['tramos', 'Monto fijo según el día de pago'], ['porcentaje', 'Porcentaje mensual'], ['ninguno', 'Sin recargo']]
        .map(function (m) {
          return '<label class="chip' + ((c.recargoModo || 'porcentaje') === m[0] ? ' is-on' : '') + '"><input type="radio" name="cModo" value="' + m[0] + '"' +
            ((c.recargoModo || 'porcentaje') === m[0] ? ' checked' : '') + ' hidden>' + m[1] + '</label>';
        }).join('') + '</div>' +
      '<div id="cTramos"' + (c.recargoModo === 'tramos' ? '' : ' hidden') + '>' +
      (c.recargoTramos || []).concat([{ dia: '', monto: '' }]).slice(0, 4).map(function (t, i) {
        return '<div class="tramo">Si se paga desde el día <input class="input input--sm num" type="number" min="1" max="31" data-tramo="' + i +
          '" data-campo="dia" value="' + esc(t.dia) + '"> el recargo es de $<input class="input input--sm num" type="number" min="0" step="1" data-tramo="' + i +
          '" data-campo="monto" value="' + esc(t.monto) + '"></div>';
      }).join('') +
      '<p class="field__hint">El sistema pone el recargo solo, uno por mes, y lo ajusta si el pago se registra con otra fecha. ' +
      'Deja vacío un renglón para quitarlo.</p></div>' +
      '<div id="cPorc"' + ((c.recargoModo || 'porcentaje') === 'porcentaje' ? '' : ' hidden') + '>' +
      campoNum('cMora', 'Recargo mensual (%)', c.tasaMoraMensual, 'Se calcula sobre el saldo vencido, como estimado; no se carga') +
      '</div></div>' +

      '<label class="check" style="background:var(--surface-2);border-color:var(--rule);color:var(--ink-2)">' +
      '<input type="checkbox" id="cVisitas"' + (c.registroVisitas ? ' checked' : '') + '> ' +
      'Llevar el registro de visitas de la caseta</label>' +
      '<div class="note" style="margin-top:16px"><div>' +
      'Con un presupuesto de <strong>' + esc(CC.fmt.money(c.presupuestoMensual)) + '</strong> repartido entre ' +
      CC.Store.unidades().length + ' casas, las cuotas suman <strong>' + esc(CC.fmt.money(cuotaTotal)) + '</strong> al mes. ' +
      (totalPresupuesto > 0
        ? 'El presupuesto de egresos es de <strong>' + esc(CC.fmt.money(totalPresupuesto)) + '</strong>, lo que deja ' +
          '<strong>' + esc(CC.fmt.money(cuotaTotal - totalPresupuesto)) + '</strong> de margen mensual.'
        : 'Define abajo el presupuesto de cada servicio para comparar contra el gasto real.') +
      '</div></div>' +
      '</div></div>');

    /* --- Presupuesto por servicio --- */
    out.push(
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Categorías de egresos y presupuesto</h3>' +
      '<button class="btn btn--sm btn--ghost" id="bNuevaCat">Agregar servicio</button></div>' +
      '<div class="tablewrap"><table class="ledger">' +
      '<thead><tr><th>Categoría</th><th>Tipo</th><th>Proveedor habitual</th><th class="r" style="width:150px">Presupuesto mensual</th><th class="noprint"></th></tr></thead>' +
      '<tbody>' + (cats.length ? cats.map(function (x, i) {
        return '<tr>' +
          '<td><input class="input input--sm" data-cat="' + i + '" data-campo="nombre" value="' + esc(x.nombre) + '"></td>' +
          '<td><select class="input input--sm" data-cat="' + i + '" data-campo="grupo">' +
          [['fijo', 'Fijo'], ['variable', 'Variable'], ['otro', 'Otro']].map(function (g) {
            return '<option value="' + g[0] + '"' + ((x.grupo || 'variable') === g[0] ? ' selected' : '') + '>' + g[1] + '</option>';
          }).join('') + '</select></td>' +
          '<td><input class="input input--sm" data-cat="' + i + '" data-campo="proveedor" value="' + esc(x.proveedor || '') + '"></td>' +
          '<td><input class="input input--sm num" style="text-align:right" type="number" min="0" step="0.01" data-cat="' + i + '" data-campo="presupuesto" value="' + esc(x.presupuesto) + '"></td>' +
          '<td class="r noprint"><button class="iconbtn" data-delcat="' + i + '" title="Quitar servicio">' +
          CC.ui.icono('cerrar', 'i--sm') + '</button></td>' +
          '</tr>';
      }).join('') : '<tr><td colspan="5"><div class="empty"><strong>Sin categorías</strong>' +
        '<p>Agrega los servicios que paga el condominio para comparar presupuesto contra gasto real.</p></div></td></tr>') +
      '</tbody>' +
      '<tfoot><tr><td colspan="3">Total presupuestado al mes</td>' +
      '<td class="r">' + esc(CC.fmt.money2(totalPresupuesto)) + '</td><td></td></tr></tfoot>' +
      '</table></div>' +
      '<div class="panelbox__body" style="border-top:1px solid var(--rule)">' +
      '<button class="btn btn--sm" id="bGuardarCats">Guardar presupuesto</button></div>' +
      '</div>');

    /* --- Áreas que se apartan (canchas, salón, asador) --- */
    // Un condominio que no aparta áreas (perfil con reservas: false) no ve esta sección
    var ams = CC.Store.amenidades();
    if (!(CC.Perfil && CC.Perfil.reservas === false)) out.push(
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Áreas que se apartan</h3>' +
      '<button class="btn btn--sm btn--ghost" id="bNuevaArea">Agregar área</button></div>' +
      '<div class="tablewrap"><table class="ledger">' +
      '<thead><tr><th>Área</th><th>Abre</th><th>Cierra</th><th class="r">Horas por casa al día</th>' +
      '<th class="r">Días de anticipación</th><th class="r">No aparta con … meses de adeudo</th>' +
      '<th class="r">Renta</th><th class="r">Depósito</th><th class="noprint"></th></tr></thead>' +
      '<tbody>' + (ams.length ? ams.map(function (a, i) {
        function inp(campo, tipo, extra) {
          return '<input class="input input--sm' + (tipo === 'number' ? ' num' : '') + '" type="' + tipo + '" data-area="' + i +
            '" data-campo="' + campo + '" value="' + esc(a[campo] === undefined ? '' : a[campo]) + '"' + (extra || '') + '>';
        }
        return '<tr><td>' + inp('nombre', 'text') + '</td>' +
          '<td>' + inp('abre', 'time', ' step="3600"') + '</td><td>' + inp('cierra', 'time', ' step="3600"') + '</td>' +
          '<td class="r">' + inp('maxHorasDia', 'number', ' min="1" max="6" style="width:70px;text-align:right"') + '</td>' +
          '<td class="r">' + inp('anticipacionDias', 'number', ' min="1" max="60" style="width:70px;text-align:right"') + '</td>' +
          '<td class="r">' + inp('mesesBloqueo', 'number', ' min="0" max="12" style="width:70px;text-align:right"') + '</td>' +
          '<td class="r">' + inp('costo', 'number', ' min="0" step="50" style="width:84px;text-align:right"') + '</td>' +
          '<td class="r">' + inp('deposito', 'number', ' min="0" step="50" style="width:84px;text-align:right"') + '</td>' +
          '<td class="r noprint"><button class="iconbtn" data-delarea="' + i + '" title="Quitar área">' +
          CC.ui.icono('cerrar', 'i--sm') + '</button></td></tr>';
      }).join('') : '<tr><td colspan="9"><div class="empty"><strong>Sin áreas</strong>' +
        '<p>Agrega las canchas, el salón o el asador para apartarlos por hora desde Reservas.</p></div></td></tr>') +
      '</tbody></table></div>' +
      (ams.length ? '<div class="panelbox__body" style="border-top:1px solid var(--rule)">' +
        '<button class="btn btn--sm" id="bGuardarAreas">Guardar áreas</button>' +
        '<span class="field__hint" style="margin-left:10px">0 meses = puede apartar aunque deba</span></div>' : '') +
      '</div>');

    /* --- Respaldo y datos --- */
    var persistente = CC.Store.persistente();
    out.push(
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Tus datos</h3>' +
      '<span class="eyebrow">' + (CC.Escritorio ? 'Guardado en esta computadora' : persistente ? 'Guardado en este navegador' : 'Solo en memoria') + '</span></div>' +
      '<div class="panelbox__body stack">' +

      (CC.Escritorio
        ? '<p style="font-size:12.5px;color:var(--ink-2);max-width:66ch">La base de datos es un archivo en <strong>Documentos\\Cuota Clara</strong> ' +
          'de esta computadora y se guarda sola con cada cambio. Cada día queda una copia en la carpeta <strong>Respaldos</strong> ' +
          '(se guardan 90 días). Para tener otra copia fuera de la computadora, copia esa carpeta a una memoria USB.</p>' +
          '<div class="formrow" style="gap:9px"><button class="btn btn--soft" id="bCarpeta">Abrir la carpeta de datos</button>' +
          '<button class="btn btn--ghost" id="bBuscarAct">Buscar actualizaciones</button>' +
          '<span class="field__hint" style="align-self:center">Versión ' + esc(CC.Escritorio.version) + '</span></div>'
        : persistente
        ? '<p style="font-size:12.5px;color:var(--ink-2);max-width:66ch">La información se guarda en este navegador y sigue ' +
          'aquí la próxima vez que abras la aplicación. No viaja a ningún servidor. Copia el respaldo de vez en cuando: ' +
          'si borras los datos del navegador, se pierde.</p>'
        : '<div class="note note--demo"><div><strong>Este navegador no permite guardar datos.</strong> ' +
          'Puedes usar la aplicación, pero los cambios se pierden al cerrar la pestaña. Suele pasar en ventanas privadas.</div></div>') +

      '<div class="formrow" style="gap:9px">' +
      '<button class="btn" id="bDescargar">Guardar base de datos</button>' +
      '<button class="btn btn--ghost" id="bAbrirArchivo">Abrir desde archivo</button>' +
      '<input type="file" id="fArchivo" accept=".json,application/json" hidden>' +
      '<button class="btn btn--ghost" id="bCopiarRespaldo">Copiar como texto</button>' +
      '<button class="btn btn--ghost" id="bRestaurar">Pegar desde texto</button>' +
      '</div>' +
      '<p class="field__hint">"Guardar base de datos" baja un archivo con todo: padrón, pagos, ' +
      'gastos, recibos y reglamento. Guárdalo en una carpeta o en una memoria USB. ' +
      'Con "Abrir desde archivo" se recupera tal cual, en esta o en otra computadora.</p>' +

      '<div style="border-top:1px solid var(--rule);padding-top:16px;margin-top:4px">' +
      '<p class="eyebrow" style="margin-bottom:8px">Empezar de nuevo</p>' +
      '<div class="formrow" style="gap:9px">' +
      '<button class="btn btn--ghost" id="bVaciar">Empezar con mi condominio</button>' +
      '<button class="btn btn--ghost" id="bEjemplo">Volver a los datos de ejemplo</button>' +
      '</div>' +
      '<p class="field__hint" style="margin-top:8px">' +
      '"Empezar con mi condominio" borra todo y te deja la estructura vacía para capturar tus casas reales.</p>' +
      '</div>' +

      '</div></div>');

    return out.join('');

    function campo(id, etiqueta, valor, ph) {
      return '<label class="field"><span class="field__lab">' + esc(etiqueta) + '</span>' +
        '<input class="input" id="' + id + '" value="' + esc(valor || '') + '" placeholder="' + esc(ph || '') + '"></label>';
    }
    function campoNum(id, etiqueta, valor, hint) {
      return '<label class="field"><span class="field__lab">' + esc(etiqueta) + '</span>' +
        '<input class="input num" id="' + id + '" type="number" min="0" step="0.01" value="' + esc(valor) + '">' +
        (hint ? '<span class="field__hint">' + esc(hint) + '</span>' : '') + '</label>';
    }
  },

  montar: function (raiz, ctx, redibujar) {
    var v = function (id) { var e = raiz.querySelector('#' + id); return e ? e.value : ''; };

    raiz.querySelector('#bGuardarCond').onclick = function () {
      CC.Store.actualizarCondominio({
        nombre: v('cNombre').trim(),
        direccion: v('cDireccion').trim(),
        ciudad: v('cCiudad').trim(),
        administrador: v('cAdmin').trim(),
        telefono: v('cTel').trim(),
        email: v('cMail').trim(),
        cuenta: v('cCuenta').trim(),
        presupuestoMensual: Number(v('cPresupuesto')) || 0,
        diaVencimiento: Math.min(28, Math.max(1, Number(v('cDia')) || 10)),
        tasaMoraMensual: Number(v('cMora')) || 0,
        fondoReservaPct: Number(v('cFondo')) || 0,

        avisoDiasTras: Math.max(0, Math.round(Number(v('cAvisoDias')) || 0)),
        avisoRepetirDias: Math.max(1, Math.round(Number(v('cAvisoCada')) || 7)),

        mesesGratisAnualidad: Math.max(0, Math.min(6, Math.round(Number(v('cAnual')) || 0))),
        registroVisitas: !!(raiz.querySelector('#cVisitas') || {}).checked
      });
      CC.ui.toast('Datos guardados', 'good');
    };

    /* El logo: se guarda en los datos del condominio (viaja con el respaldo) */
    var inpLogo = raiz.querySelector('#cLogo');
    if (inpLogo) inpLogo.onchange = function () {
      var f = inpLogo.files && inpLogo.files[0];
      if (!f) return;
      var lector = new FileReader();
      lector.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, 500 / Math.max(img.width || 1, img.height || 1));
          var lienzo = document.createElement('canvas');
          lienzo.width = Math.max(1, Math.round((img.width || 300) * k));
          lienzo.height = Math.max(1, Math.round((img.height || 150) * k));
          var cx = lienzo.getContext('2d');
          cx.fillStyle = '#FFFFFF';   // un PNG transparente no debe salir con fondo negro
          cx.fillRect(0, 0, lienzo.width, lienzo.height);
          cx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
          CC.Store.actualizarCondominio({ logo: lienzo.toDataURL('image/jpeg', 0.9) });
          CC.ui.toast('Logo guardado: ya sale en los recibos', 'good');
        };
        img.onerror = function () { CC.ui.toast('El archivo no es una imagen', 'crit'); };
        img.src = lector.result;
      };
      lector.readAsDataURL(f);
    };
    var quitarLogo = raiz.querySelector('#cLogoQuitar');
    if (quitarLogo) quitarLogo.onclick = function () {
      CC.Store.actualizarCondominio({ logo: null });
      CC.ui.toast('Logo quitado');
    };

    /* Las reglas de cobro se guardan con el mismo boton */
    /* Recargos: el tipo y sus tramos */
    raiz.querySelectorAll('input[name="cModo"]').forEach(function (r) {
      r.onchange = function () {
        var modo = raiz.querySelector('input[name="cModo"]:checked').value;
        CC.Store.actualizarCondominio({ recargoModo: modo });
        CC.Model.aplicarRecargos();
        CC.ui.toast(modo === 'tramos' ? 'Recargos por día de pago activados' : modo === 'ninguno' ? 'Sin recargos' : 'Recargo por porcentaje', 'good');
      };
    });
    raiz.querySelectorAll('[data-tramo]').forEach(function (inp) {
      inp.onchange = function () {
        var t = [];
        raiz.querySelectorAll('[data-tramo][data-campo="dia"]').forEach(function (d) {
          var i = d.getAttribute('data-tramo');
          var m = raiz.querySelector('[data-tramo="' + i + '"][data-campo="monto"]');
          if (Number(d.value) >= 1 && Number(m.value) > 0) t.push({ dia: Number(d.value), monto: Number(m.value) });
        });
        t.sort(function (a, b) { return a.dia - b.dia; });
        CC.Store.actualizarCondominio({ recargoTramos: t });
        CC.Model.aplicarRecargos();
        CC.ui.toast('Recargos actualizados', 'good');
      };
    });

    ['cPresupuesto', 'cDia', 'cMora', 'cFondo', 'cAvisoDias', 'cAvisoCada', 'cAnual', 'cVisitas'].forEach(function (id) {
      var e = raiz.querySelector('#' + id);
      if (e) e.onchange = function () { raiz.querySelector('#bGuardarCond').click(); };
    });

    /* Áreas que se apartan */
    function leerAreas() {
      var l = CC.Store.amenidades().map(function (x) { return Object.assign({}, x); });
      raiz.querySelectorAll('[data-area]').forEach(function (inp) {
        var a = l[Number(inp.getAttribute('data-area'))], campo = inp.getAttribute('data-campo');
        if (!a) return;
        a[campo] = inp.type === 'number' ? (Number(inp.value) || 0) : inp.value.trim();
      });
      return l;
    }
    var bAreas = raiz.querySelector('#bGuardarAreas');
    if (bAreas) bAreas.onclick = function () {
      CC.Store.guardarAmenidades(leerAreas().filter(function (a) { return a.nombre; }));
      CC.ui.toast('Áreas guardadas', 'good');
    };
    var bNueva = raiz.querySelector('#bNuevaArea');
    if (bNueva) bNueva.onclick = function () {
      var l = leerAreas();
      l.push({
        id: CC.Store.nuevoId('ame'), nombre: 'Nueva área', tipo: 'area' + (l.length + 1),
        abre: '08:00', cierra: '21:00', maxHorasDia: 2, anticipacionDias: 7, mesesBloqueo: 3
      });
      CC.Store.guardarAmenidades(l);
    };
    raiz.querySelectorAll('[data-delarea]').forEach(function (b) {
      b.onclick = function () {
        var l = leerAreas();
        l.splice(Number(b.getAttribute('data-delarea')), 1);
        CC.Store.guardarAmenidades(l);
        CC.ui.toast('Área quitada; sus reservas pasadas se conservan');
      };
    });

    raiz.querySelector('#bGuardarCats').onclick = function () {
      var cats = CC.Store.categorias().map(function (x) { return Object.assign({}, x); });
      raiz.querySelectorAll('[data-cat]').forEach(function (inp) {
        var i = Number(inp.getAttribute('data-cat'));
        var campo = inp.getAttribute('data-campo');
        if (!cats[i]) return;
        cats[i][campo] = campo === 'presupuesto' ? (Number(inp.value) || 0) : inp.value.trim();
      });
      CC.Store.actualizarCategorias(cats.filter(function (x) { return x.nombre; }));
      CC.ui.toast('Presupuesto guardado', 'good');
    };

    raiz.querySelector('#bNuevaCat').onclick = function () {
      var cats = CC.Store.categorias().slice();
      cats.push({ id: CC.Store.nuevoId('cat'), nombre: 'Nuevo servicio', presupuesto: 0, proveedor: '' });
      CC.Store.actualizarCategorias(cats);
    };

    raiz.querySelectorAll('[data-delcat]').forEach(function (b) {
      b.onclick = function () {
        var i = Number(b.getAttribute('data-delcat'));
        var cats = CC.Store.categorias().slice();
        cats.splice(i, 1);
        CC.Store.actualizarCategorias(cats);
      };
    });

    /* Guardar la base de datos como archivo: es lo que la mayoría entiende por
       "tener sus datos". Queda un .json que se puede copiar a una USB. */
    var bCarpeta = raiz.querySelector('#bCarpeta');
    if (bCarpeta) bCarpeta.onclick = function () { CC.Escritorio.abrirCarpeta(); };
    var bBuscar = raiz.querySelector('#bBuscarAct');
    if (bBuscar) bBuscar.onclick = function () {
      bBuscar.disabled = true;
      CC.Escritorio.buscarActualizacion().then(function (hay) {
        bBuscar.disabled = false;
        CC.ui.toast(hay ? 'Hay una versión nueva; se está descargando y te aviso para reiniciar' : 'Ya tienes la versión más reciente', 'good');
      });
    };

    raiz.querySelector('#bDescargar').onclick = function () {
      var nombre = (CC.Store.condominio().nombre || 'condominio')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
      var archivo = nombre + '-' + CC.per.hoyISO() + '.json';

      try {
        var blob = new Blob([CC.Store.exportar()], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = archivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        CC.ui.toast('Se guardó ' + archivo, 'good');
      } catch (e) {
        // Algunos visores bloquean las descargas: queda el camino de copiar el texto
        CC.ui.copiar(CC.Store.exportar(),
          'Aquí no se permite descargar; el respaldo se copió como texto');
      }
    };

    raiz.querySelector('#bAbrirArchivo').onclick = function () {
      raiz.querySelector('#fArchivo').click();
    };

    raiz.querySelector('#fArchivo').onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var lector = new FileReader();
      lector.onload = function () {
        try {
          CC.Store.importar(String(lector.result));
          CC.ui.toast('Base de datos abierta: ' + f.name, 'good');
        } catch (err) {
          CC.ui.toast(err.message || 'Ese archivo no es una base de datos de Cuota Clara', 'crit');
        }
      };
      lector.onerror = function () { CC.ui.toast('No se pudo leer el archivo', 'crit'); };
      lector.readAsText(f);
      e.target.value = '';
    };

    raiz.querySelector('#bCopiarRespaldo').onclick = function () {
      CC.ui.copiar(CC.Store.exportar(), 'Respaldo copiado: pégalo en un archivo de texto y guárdalo');
    };

    raiz.querySelector('#bRestaurar').onclick = function () {
      CC.ui.modal('Restaurar desde respaldo',
        '<p class="field__hint" style="margin-bottom:10px">Pega aquí el respaldo que copiaste antes. ' +
        'Reemplaza toda la información actual.</p>' +
        '<textarea class="input mono" id="txtRestaurar" rows="10" style="font-size:11.5px" placeholder="{ ... }"></textarea>' +
        '<div class="formactions">' +
        '<button type="button" class="btn btn--ghost" id="rCancel">Cancelar</button>' +
        '<button type="button" class="btn" id="rOk">Restaurar</button></div>',
        function (cuerpo) {
          cuerpo.querySelector('#rCancel').onclick = CC.ui.cerrarModal;
          cuerpo.querySelector('#rOk').onclick = function () {
            try {
              CC.Store.importar(cuerpo.querySelector('#txtRestaurar').value);
              CC.ui.cerrarModal();
              CC.ui.toast('Respaldo restaurado', 'good');
            } catch (e) {
              CC.ui.toast(e.message || 'No se pudo leer el respaldo', 'crit');
            }
          };
        });
    };

    raiz.querySelector('#bVaciar').onclick = function () {
      CC.ui.confirmar('Empezar con mi condominio',
        'Se borra todo lo que hay ahora, incluidos los datos de ejemplo, y quedas con la estructura vacía. ' +
        'Si quieres conservar lo actual, copia primero el respaldo.',
        'Borrar y empezar', function () {
          CC.Store.empezarDeCero({ nombre: 'Mi condominio' });
          CC.ui.toast('Listo: captura tus casas en la sección Casas', 'good');
          location.hash = '#/ajustes';
        }, true);
    };

    raiz.querySelector('#bEjemplo').onclick = function () {
      CC.ui.confirmar('Volver a los datos de ejemplo',
        'Se reemplaza la información actual por el condominio de ejemplo.',
        'Restaurar ejemplo', function () {
          CC.Store.restaurarEjemplo();
          CC.ui.toast('Datos de ejemplo restaurados');
        }, true);
    };
  }
};
