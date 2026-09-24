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
      campoNum('cMora', 'Recargo mensual (%)', c.tasaMoraMensual, 'Sobre el saldo vencido') +
      campoNum('cFondo', 'Fondo de reserva (%)', c.fondoReservaPct, 'Parte de lo cobrado que se aparta') +
      campoNum('cCaja', 'Saldo inicial en caja', c.saldoInicialCaja, 'Lo que había antes del primer registro') +
      '</div>' +
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
      '<div class="panelbox__head"><h3>Presupuesto por servicio</h3>' +
      '<button class="btn btn--sm btn--ghost" id="bNuevaCat">Agregar servicio</button></div>' +
      '<div class="tablewrap"><table class="ledger">' +
      '<thead><tr><th>Servicio</th><th>Proveedor habitual</th><th class="r" style="width:150px">Presupuesto mensual</th><th class="noprint"></th></tr></thead>' +
      '<tbody>' + (cats.length ? cats.map(function (x, i) {
        return '<tr>' +
          '<td><input class="input input--sm" data-cat="' + i + '" data-campo="nombre" value="' + esc(x.nombre) + '"></td>' +
          '<td><input class="input input--sm" data-cat="' + i + '" data-campo="proveedor" value="' + esc(x.proveedor || '') + '"></td>' +
          '<td><input class="input input--sm num" style="text-align:right" type="number" min="0" step="0.01" data-cat="' + i + '" data-campo="presupuesto" value="' + esc(x.presupuesto) + '"></td>' +
          '<td class="r noprint"><button class="iconbtn" data-delcat="' + i + '" title="Quitar servicio">' +
          CC.ui.icono('cerrar', 'i--sm') + '</button></td>' +
          '</tr>';
      }).join('') : '<tr><td colspan="4"><div class="empty"><strong>Sin servicios definidos</strong>' +
        '<p>Agrega los servicios que paga el condominio para comparar presupuesto contra gasto real.</p></div></td></tr>') +
      '</tbody>' +
      '<tfoot><tr><td colspan="2">Total presupuestado al mes</td>' +
      '<td class="r">' + esc(CC.fmt.money2(totalPresupuesto)) + '</td><td></td></tr></tfoot>' +
      '</table></div>' +
      '<div class="panelbox__body" style="border-top:1px solid var(--rule)">' +
      '<button class="btn btn--sm" id="bGuardarCats">Guardar presupuesto</button></div>' +
      '</div>');

    /* --- Respaldo y datos --- */
    var persistente = CC.Store.persistente();
    out.push(
      '<div class="panelbox">' +
      '<div class="panelbox__head"><h3>Tus datos</h3>' +
      '<span class="eyebrow">' + (persistente ? 'Guardado en este navegador' : 'Solo en memoria') + '</span></div>' +
      '<div class="panelbox__body stack">' +

      (persistente
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
        saldoInicialCaja: Number(v('cCaja')) || 0
      });
      CC.ui.toast('Datos guardados', 'good');
    };

    /* Las reglas de cobro se guardan con el mismo boton */
    ['cPresupuesto', 'cDia', 'cMora', 'cFondo', 'cCaja'].forEach(function (id) {
      var e = raiz.querySelector('#' + id);
      if (e) e.onchange = function () { raiz.querySelector('#bGuardarCond').click(); };
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
