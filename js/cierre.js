/* cierre.js — cerrar el mes y hacer la entrega-recepción.
 *
 * Para que "ya quien venga, ya no pueda hacer tranzas" (la administradora de
 * Mallorca, reunión del 26-oct):
 *
 *   - Cierre de mes: cuando el comité revisó los egresos, contó la caja y vio que
 *     el banco cuadra, cierra el mes. Desde ahí nada de ese mes se captura, se
 *     corrige ni se cancela. Solo el comité lo reabre, con motivo, y queda anotado.
 *   - Entrega-recepción: si la administradora se va, un acta en PDF con los saldos,
 *     el último folio de cada serie, quién debe y lo pendiente. La firman quien
 *     entrega, quien recibe y el comité.
 */
window.CC = window.CC || {};

CC.Cierre = (function () {
  var esc = function (s) { return CC.ui.esc(s); };

  function egresosDe(periodo) {
    return CC.Model.gastosVigentes().filter(function (g) { return g.periodo === periodo; });
  }

  /** Lo que conviene tener listo antes de cerrar un mes. */
  function revision(periodo) {
    var eg = egresosDe(periodo);
    var fin = CC.per.vence(periodo, 31);
    var arqueos = CC.Store.arqueos().filter(function (a) { return String(a.fecha || '').slice(0, 7) === periodo; });
    var pendientes = eg.filter(function (g) { return g.estado === 'pendiente'; });
    return {
      egresos: eg.length,
      sinRevisar: eg.filter(function (g) { return !g.revision; }),
      sinComprobante: eg.filter(function (g) { return !g.fotoId; }),
      porPagar: pendientes,
      arqueo: arqueos[0] || null,
      banco: CC.Model.saldoCuenta('banco', fin),
      caja: CC.Model.saldoCuenta('caja', fin)
    };
  }

  function linea(ok, texto, detalle) {
    return '<li class="revisa revisa--' + (ok ? 'ok' : 'falta') + '"><span aria-hidden="true">' + (ok ? '✓' : '!') + '</span>' +
      '<div><strong>' + texto + '</strong>' + (detalle ? '<small>' + detalle + '</small>' : '') + '</div></li>';
  }

  function cerrar(periodo) {
    if (CC.Store.mesCerrado(periodo)) { reabrir(periodo); return; }
    if (periodo >= CC.per.hoy()) {
      CC.ui.toast('Un mes se cierra cuando ya terminó: ' + CC.fmt.periodo(periodo) + ' todavía está corriendo', 'crit');
      return;
    }
    if (!CC.Sesion.puede('comite')) { CC.ui.toast('El mes lo cierra alguien del comité', 'crit'); return; }
    var r = revision(periodo);
    var anterior = CC.per.suma(periodo, -1);
    var faltaAnterior = !CC.Store.mesCerrado(anterior) && CC.Store.cierres().length > 0;
    CC.ui.modal('Cerrar ' + CC.fmt.periodo(periodo),
      '<p style="font-size:13.5px;color:var(--ink-2);margin-bottom:12px">Al cerrar el mes, todo lo de ' + esc(CC.fmt.periodo(periodo).toLowerCase()) +
      ' queda fijo: ya no se registra, se corrige ni se cancela nada con esa fecha. Si después hace falta, el comité lo reabre escribiendo por qué.</p>' +
      '<ul class="revisas">' +
      linea(!r.sinRevisar.length, r.sinRevisar.length ? r.sinRevisar.length + ' de ' + r.egresos + ' egresos sin revisar' : 'Egresos revisados (' + r.egresos + ')',
        r.sinRevisar.length ? 'Se revisan en Egresos → Revisar egresos' : '') +
      linea(!r.sinComprobante.length, r.sinComprobante.length ? r.sinComprobante.length + ' egresos sin comprobante' : 'Todos los egresos tienen comprobante',
        r.sinComprobante.length ? r.sinComprobante.slice(0, 6).map(function (g) { return 'E-' + String(g.folioE).padStart(4, '0'); }).join(', ') : '') +
      linea(!!r.arqueo, r.arqueo ? 'Caja chica contada el ' + esc(CC.fmt.fechaCorta(r.arqueo.fecha)) +
        (Math.abs(r.arqueo.diferencia || 0) < 0.005 ? ': cuadró' : ': diferencia de ' + esc(CC.fmt.money2(r.arqueo.diferencia))) : 'No se contó la caja chica este mes',
        r.arqueo ? '' : 'Se cuenta en Banco y caja → Arqueo de caja') +
      linea(!r.porPagar.length, r.porPagar.length ? r.porPagar.length + ' egresos siguen por pagar' : 'Sin egresos por pagar') +
      (faltaAnterior ? linea(false, CC.fmt.periodo(anterior) + ' no está cerrado', 'Conviene cerrar los meses en orden') : '') +
      '</ul>' +
      '<div class="cuentas" style="margin:12px 0">' +
      '<div class="cuenta"><span class="cuenta__nom">Banco al cierre, según el sistema</span><strong class="num">' + esc(CC.fmt.money2(r.banco)) + '</strong></div>' +
      '<div class="cuenta"><span class="cuenta__nom">Caja chica al cierre, según el sistema</span><strong class="num">' + esc(CC.fmt.money2(r.caja)) + '</strong></div></div>' +
      '<label class="check"><input type="checkbox" id="kBanco"> Revisé que el saldo del banco coincide con el estado de cuenta de ' +
      esc(CC.fmt.periodo(periodo).toLowerCase()) + '</label>' +
      '<label class="field" style="margin-top:12px"><span class="field__lab">Nota (opcional)</span>' +
      '<input class="input" id="kNota" placeholder="Pendiente: la factura de la CFE llega el día 10"></label>' +
      '<div class="formactions"><button type="button" class="btn btn--ghost" id="kCerrar">Regresar</button>' +
      '<button type="button" class="btn" id="kOk">' + CC.ui.icono('candado', 'i--sm') + ' Cerrar el mes</button></div>',
      function (cuerpo) {
        var q = function (id) { return cuerpo.querySelector('#' + id); };
        q('kCerrar').onclick = CC.ui.cerrarModal;
        q('kOk').onclick = function () {
          if (!q('kBanco').checked) { CC.ui.toast('Primero revisa que el banco coincida y palomea la casilla', 'crit'); return; }
          CC.Store.cerrarMes(periodo, {
            nota: q('kNota').value.trim(), banco: r.banco, caja: r.caja,
            sinRevisar: r.sinRevisar.length, sinComprobante: r.sinComprobante.length, arqueo: !!r.arqueo
          });
          CC.ui.cerrarModal();
          CC.ui.toast(CC.fmt.periodo(periodo) + ' cerrado. Ya no se puede cambiar.', 'good');
        };
      });
  }

  function reabrir(periodo) {
    if (!CC.Sesion.puede('comite')) { CC.ui.toast('Un mes cerrado solo lo reabre el comité', 'crit'); return; }
    CC.ui.pedirTexto('Reabrir ' + CC.fmt.periodo(periodo),
      'Se podrá corregir de nuevo lo de ese mes. Queda anotado quién lo reabrió, cuándo y por qué. ¿Por qué se reabre?',
      'Reabrir el mes', function (motivo) {
        CC.Store.reabrirMes(periodo, motivo);
        CC.ui.toast(CC.fmt.periodo(periodo) + ' reabierto. Al terminar, ciérrenlo otra vez.', 'good');
      });
  }

  /* ---------- Entrega-recepción ---------- */
  function entrega() {
    if (!CC.Sesion.puede('comite')) { CC.ui.toast('La entrega-recepción la hace alguien del comité', 'crit'); return; }
    var u = CC.Sesion.usuario();
    var admins = CC.Store.usuarios().filter(function (x) { return x.activo && x.rol === 'admin'; });
    var debeCaja = CC.Model.saldoCuenta('caja');
    CC.ui.modal('Entrega-recepción',
      '<p style="font-size:13.5px;color:var(--ink-2);margin-bottom:12px">Cuando cambia quien administra. Sale un acta en PDF con los saldos, ' +
      'el último folio de cada serie, quién debe y lo que queda pendiente, para que la firmen los dos y el comité.</p>' +
      '<div class="formgrid">' +
      '<label class="field"><span class="field__lab">Quién entrega</span><input class="input" id="eEntrega" value="' + esc(admins[0] ? admins[0].nombre : CC.Store.condominio().administrador || '') + '"></label>' +
      '<label class="field"><span class="field__lab">Quién recibe</span><input class="input" id="eRecibe" placeholder="Nombre de quien llega"></label>' +
      '<label class="field"><span class="field__lab">Por el comité</span><input class="input" id="eComite" value="' + esc(u && u.rol === 'comite' ? u.nombre : '') + '"></label>' +
      '</div>' +
      '<div class="listo" style="margin-top:14px"><span class="muted">En la caja chica debe haber</span><span class="listo__monto num" style="color:var(--ink)">' +
      esc(CC.fmt.money2(debeCaja)) + '</span></div>' +
      '<div class="formgrid"><label class="field"><span class="field__lab">Lo que se contó hoy, frente a los dos</span>' +
      '<input class="input num" id="eContado" type="number" min="0" step="0.01"></label></div>' +
      '<p class="arqueo__dif" id="eDif"></p>' +
      '<label class="field"><span class="field__lab">Notas (llaves, documentos, pendientes)</span><textarea class="input" id="eNota" rows="3" ' +
      'placeholder="Se entregan las llaves de la caseta, la chequera y la carpeta de facturas"></textarea></label>' +
      '<div class="formactions"><button type="button" class="btn btn--ghost" id="eCerrar">Regresar</button>' +
      '<button type="button" class="btn" id="eOk">Hacer la entrega y bajar el acta</button></div>',
      function (cuerpo) {
        var q = function (id) { return cuerpo.querySelector('#' + id); };
        q('eContado').oninput = function () {
          var dif = (Number(q('eContado').value) || 0) - debeCaja;
          q('eDif').innerHTML = Math.abs(dif) < 0.005 ? '<span style="color:var(--good)">Cuadra al centavo.</span>'
            : dif < 0 ? '<span style="color:var(--crit)">Faltan ' + esc(CC.fmt.money2(-dif)) + '.</span> Queda anotado en el acta.'
              : '<span style="color:var(--warn)">Sobran ' + esc(CC.fmt.money2(dif)) + '.</span> Queda anotado en el acta.';
        };
        q('eCerrar').onclick = CC.ui.cerrarModal;
        q('eOk').onclick = function () {
          var entrega = q('eEntrega').value.trim(), recibe = q('eRecibe').value.trim();
          if (!entrega || !recibe) { CC.ui.toast('Faltan los nombres de quien entrega y quien recibe', 'crit'); return; }
          if (q('eContado').value === '') { CC.ui.toast('Cuenten la caja chica frente a los dos y pongan lo contado', 'crit'); q('eContado').focus(); return; }
          var contado = Number(q('eContado').value) || 0;
          var e = CC.Store.agregarEntrega({
            entrega: entrega, recibe: recibe, comite: q('eComite').value.trim(), nota: q('eNota').value.trim(),
            cajaSistema: debeCaja, cajaContado: contado, diferencia: Math.round((contado - debeCaja) * 100) / 100,
            banco: CC.Model.saldoCuenta('banco')
          });
          CC.ui.cerrarModal();
          CC.Comprobantes.descargar(CC.Comprobantes.actaEntrega(e.id));
          CC.ui.modal('Entrega hecha',
            '<p style="font-size:13.5px;color:var(--ink-2);line-height:1.6">Se bajó el acta. Impriman dos copias y fírmenlas los tres.</p>' +
            '<ol class="pasitos"><li>En <strong>Ajustes → Usuarios</strong>, den de baja el usuario de ' + esc(entrega) + '.</li>' +
            '<li>Den de alta a ' + esc(recibe) + ' con su propia contraseña.</li>' +
            '<li>Guarden un respaldo: <strong>Ajustes → Guardar base de datos</strong>, en una memoria USB que se quede el comité.</li></ol>' +
            '<div class="formactions"><a class="btn" href="#/ajustes/usuarios" id="eUsuarios">Ir a Usuarios</a></div>',
            function (c2) { c2.querySelector('#eUsuarios').onclick = CC.ui.cerrarModal; });
        };
      });
  }

  return { revision: revision, cerrar: cerrar, reabrir: reabrir, entrega: entrega };
})();
