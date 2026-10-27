/* perfil.js — Condominio Mallorca Naciones Unidas (demo personalizado, 26-oct-2026).
 *
 * Lo que sabemos de la reunión con la administración (grabación y notas de
 * Fernando del 26-oct): cuota de $1,500 por casa; recargo de $50 si se paga del
 * día 6 al 17 y de $100 del 18 en adelante; caja chica para lo que se cobra y se
 * paga en efectivo, cuyo sobrante se deposita al banco; casa club que se renta
 * por evento; alberca templada con bomba de calor; la basura se paga cada semana.
 * Son 105 casas; la Casa 107 es una de más, para probar los avisos.
 *
 * Los vecinos, las referencias, el saldo del banco, los importes de los gastos y
 * la renta de la casa club son de ejemplo: se cambian por los reales al cargar
 * su información.
 */
window.CC = window.CC || {};
CC.Perfil = {
  id: 'mallorca',
  semilla: 'mallorca-2',

  condominio: {
    nombre: 'Condominio Mallorca Naciones Unidas',
    direccion: '',
    ciudad: '',
    administrador: 'Administración',
    telefono: '',
    email: '',
    cuenta: '',                 // la cuenta real del condominio, cuando nos la den
    diaVencimiento: 5,
    recargoModo: 'tramos',
    recargoTramos: [{ dia: 6, monto: 50 }, { dia: 18, monto: 100 }],
    tasaMoraMensual: 0,
    fondoReservaPct: 0,
    saldoInicialCaja: 450000
  },

  /* Las casas se conocen por su número: "la casa 11", "la 83" */
  calles: ['Mallorca'],
  casasPorCalle: 105,
  formatoClave: '{n}',            // la clave es el número; en pantalla dice "Casa 12"
  prototipos: [{ tipo: 'Casa', m2: 180, peso: 100 }],
  cuotaFija: 1500,
  presupuestoMensual: 157500,   // 105 casas x $1,500
  cuotaExtra: 0,
  metodosPago: ['Transferencia', 'Transferencia', 'Transferencia', 'Depósito', 'Efectivo', 'Efectivo'],

  /* [categoría, presupuesto mensual, proveedor, grupo, 'caja' si se paga en efectivo] */
  categorias: [
    ['Vigilancia', 58000, 'Empresa de seguridad', 'fijo'],
    ['Administración', 14000, 'Honorarios de administración', 'fijo'],
    ['Limpieza general', 12000, 'Personal de limpieza', 'fijo'],
    ['Jardinería', 10000, 'Jardinero', 'fijo'],
    ['Alberca templada', 9000, 'Mantenimiento de alberca y bomba de calor', 'fijo'],
    ['Recolección de basura', 8000, 'Recolección semanal', 'fijo', 'caja'],
    ['Telefonía', 1200, 'Telefonía de caseta', 'fijo'],
    ['Seguro del inmueble', 3000, 'Aseguradora — póliza anual', 'fijo'],
    ['Energía eléctrica', 16000, 'CFE', 'variable'],
    ['Agua', 7000, 'SIAPA', 'variable'],
    ['Mantenimiento', 7000, 'Varios', 'variable'],
    ['Insumos de limpieza', 0, 'Varios', 'variable'],
    ['Papelería y copias', 0, 'Papelería', 'variable'],
    ['Comisiones bancarias', 25, 'Banco', 'otro']
  ],

  /* Lo que se paga en efectivo desde la caja chica, con su recibo firmado */
  gastosCaja: [
    [[3, 10, 17, 24], 'Recolección de basura de la semana', 'Recolección de basura', 2000, 'Recolector de basura', 'Se paga cada semana'],
    [[4, 18], 'Agua para los guardias (garrafones)', 'Insumos de limpieza', 165, 'Purificadora', ''],
    [[9], 'Duplicado de llaves y candado', 'Mantenimiento', 490, 'Cerrajería', ''],
    [[12], 'Limpieza de la alberca', 'Alberca templada', 1000, 'Encargado de la alberca', ''],
    [[21], 'Tornillos y copias', 'Papelería y copias', 186, 'Papelería', '']
  ],

  /* La Casa 107 no existe: es de más, para que los avisos de prueba lleguen al
     WhatsApp de Fernando. Se quita poniendo casaPrueba: null. */
  casaPrueba: {
    id: 'uni_casa_107', numero: 107, clave: '107', calle: 'Mallorca',
    prototipo: 'Casa', m2: 180, cuotaOverride: 1500,
    propietario: 'Vecino de Prueba', inquilino: null,
    telefono: '+52 33 1144 1101', email: '', ocupacion: 'Propietario'
  },

  amenidades: [
    {
      id: 'ame_club', nombre: 'Casa club', tipo: 'club',
      abre: '09:00', cierra: '23:00', maxHorasDia: 6, anticipacionDias: 60, mesesBloqueo: 3,
      costo: 1500, deposito: 2000
    }
  ],

  capitulosExtra: [
    {
      nombre: 'Casa club',
      articulos: [
        'La casa club se aparta por evento con la administración. La renta se carga al estado de cuenta de la casa que la aparta y se paga antes del evento.',
        'Se deja un depósito en garantía que se devuelve al revisar que el área quedó limpia y sin daños.',
        'No se aparta la casa club con tres o más meses de adeudo, salvo convenio de pago al corriente.'
      ]
    }
  ],

  temaAsamblea: 'el mantenimiento de la alberca templada',
  papeleria: 'Papelería'
};
