# Cuota Clara

Administración de condominios: cuotas, cobranza, servicios, reportes y un
portal donde cada residente ve su estado de cuenta y en qué se gastó el dinero.

La tesis del producto: el problema de un condominio no es llevar las cuentas,
es que los vecinos **desconfíen** de quien las lleva. Todo está ordenado
alrededor de eso — de ahí el portal del residente y el desglose "a dónde va
tu cuota".

---

## Cómo correrlo

Es HTML, CSS y JavaScript sin dependencias ni paso de compilación. Cualquier
servidor de archivos estáticos sirve:

```bash
python -m http.server 8042 --directory condominio-app
```

Para subirlo a SiteGround o GitHub Pages basta copiar la carpeta tal cual.
No requiere PHP, base de datos ni backend.

---

## Estructura

```
condominio-app/
├── index.html            Shell de la aplicación (menú, barra superior, modal)
├── css/app.css           Una sola hoja: tokens → layout → componentes → print
├── js/
│   ├── format.js         Moneda, fechas y periodos en es-MX
│   ├── archivos.js       Firmas y fotos en IndexedDB, y el lienzo de firma
│   ├── store.js          Persistencia y estado (único punto que toca el guardado)
│   ├── seed.js           Datos de ejemplo y estructura vacía
│   ├── model.js          Reglas del condominio: indiviso, cuotas, saldos, caja
│   ├── ui.js             Piezas compartidas: modal, avisos, cifras, gráfica
│   ├── views/            Una vista por sección
│   └── app.js            Arranque y enrutador por hash
├── build-artifact.py     Genera la versión para publicar como Artifact
└── dist/                 Salida de ese script
```

### Secciones

| Sección | Para qué |
|---|---|
| Panel | Cómo va el mes en un vistazo |
| Unidades | Padrón, estado de cuenta e historial de cada casa |
| Cobranza | Generar cuotas, registrar pagos, recordatorios |
| Gastos | Servicios del condominio contra su presupuesto |
| Recibos | Comprobantes de pago en mano, con firma y foto |
| Difusión | Correos a los residentes, con plantillas |
| Reportes | Cierre mensual imprimible para asamblea |
| Avisos | Tablero que ven los residentes |
| Ajustes | Datos, reglas de cobro y respaldo |
| Portal | Lo que ve el vecino desde su lado |

Los scripts son clásicos (sin módulos ES) y se cargan en orden de dependencia.
Todo cuelga de un solo global, `CC`.

### Cómo se agrega una sección

Cada vista es un objeto registrado en `CC.vistas`:

```js
CC.vistas.miSeccion = {
  titulo: 'Mi sección',
  sub: function (ctx) { return 'subtítulo'; },
  acciones: function (ctx) { return [{ texto: 'Hacer algo', clase: 'btn', accion: 'algo' }]; },
  render: function (ctx) { return '<div>…</div>'; },   // devuelve HTML
  montar: function (raiz, ctx, redibujar) { },          // engancha eventos
  algo: function (ctx) { }                              // maneja data-accion="algo"
};
```

Agregar el enlace en `index.html` con `data-route="miSeccion"` y listo.
`ctx` trae `{ periodo, param, ruta }`.

---

## El modelo de datos

Un solo documento JSON con: `condominio`, `unidades`, `cargos`, `pagos`,
`gastos`, `avisos` y `categorias`.

Decisiones que vale la pena conocer:

- **La cuota se prorratea por indiviso**, no se reparte en partes iguales.
  Cada unidad guarda sus `m2`; el indiviso es `m2 / total` y la cuota es
  `indiviso × presupuestoMensual`. Es el modelo de la Ley de Propiedad en
  Condominio. Si un condominio cobra parejo, se captura `cuotaOverride`
  por unidad y el indiviso deja de mandar.
- **Los pagos se aplican a los cargos del más viejo al más nuevo** (`Model.aplicacion`).
  Así se sabe, cargo por cargo, qué quedó pendiente y desde cuándo — de ahí
  salen la antigüedad de saldos y los meses vencidos.
- **El recargo por mora se calcula, no se cobra.** Se muestra como estimado
  y no genera un cargo hasta que alguien decida cargarlo. Evita que el
  sistema genere deuda sola.
- **El fondo de reserva es un porcentaje de lo cobrado**, presentado como una
  parte del saldo en caja, no como una cuenta aparte.

---

## Recibos con firma y foto

El caso que lo motiva: llega el jardinero por su pago y hay que dejar
constancia. Se captura en el celular, firma con el dedo sobre el lienzo, se
toma la foto y se imprime o se guarda con folio consecutivo.

- La **firma** se dibuja en un `<canvas>` (`CC.Firma`) y se guarda recortada al
  trazo, sobre fondo blanco, como PNG de unos 6 KB.
- La **foto** se comprime antes de guardarla: a 1000 px de lado y calidad 0.65,
  una foto de celular de 4 MB baja a unos 100 KB.
- Ambas viven en **IndexedDB** (`CC.Archivos`), no en `localStorage`: una sola
  foto no cabría junto al resto de la información. Los registros solo guardan
  el id de la imagen.

Si el navegador bloquea IndexedDB, `CC.Archivos.disponible()` devuelve `false`
y la aplicación esconde la parte de la foto en vez de fallar.

## Difusión por correo

La aplicación **no envía correo por su cuenta** — eso necesita un servidor. Lo
que hace es preparar el mensaje y entregárselo al correo que la persona ya usa,
con los destinatarios en copia oculta (`mailto:?bcc=…`). Sale desde su cuenta y
le queda en enviados.

Con muchas direcciones el navegador trunca la URL, así que arriba de ~1800
caracteres el botón cambia de comportamiento: copia las direcciones al
portapapeles para pegarlas en el campo CCO. Las plantillas sustituyen
`{condominio}`, `{administrador}`, `{periodo}`, `{vencimiento}`, `{mora}` y
`{cuenta}` con los datos reales.

## Dónde se guardan los datos

En el navegador de quien usa la aplicación (`localStorage` para los datos,
IndexedDB para las imágenes), a través de `CC.Store` y `CC.Archivos`. Ninguna
otra parte del código toca el almacenamiento, y esa es la costura para conectar
un backend real.

Hoy hay dos drivers: `local` (localStorage) y `memoria` (respaldo cuando el
navegador bloquea el guardado, por ejemplo en ventana privada). Un driver es
cuatro métodos:

```js
CC.Store.usarDriver({
  nombre: 'api',
  disponible: function () { return true; },
  leer:      function () { /* devuelve el documento o null */ },
  escribir:  function (datos) { /* lo persiste */ },
  borrar:    function () { }
});
```

### Qué falta para que sea multiusuario

Tal como está, cada navegador tiene su propia copia. Eso alcanza para que un
administrador lleve el condominio y para enseñarlo a un prospecto, pero **no**
para que varios vecinos entren a la vez. Para eso hace falta:

1. Un backend con autenticación (Supabase, Firebase o API propia).
2. Un driver que hable con él, sustituyendo el local.
3. Roles: administrador contra residente — hoy el portal es una vista previa
   con selector de unidad, no una sesión.

El resto de la aplicación no cambia: las vistas y el modelo ya trabajan
contra `CC.Store`.

---

## Datos de ejemplo

Arranca con un condominio ficticio — "Residencial Alameda 214", 18 unidades en
dos torres — para que se vea trabajando desde el primer segundo. Está marcado
como ejemplo en el panel y se apaga solo en cuanto se captura el primer dato
real. En **Ajustes → Empezar con mi condominio** se vacía todo.

Los importes del ejemplo son plausibles para un condominio pequeño en
Guadalajara, pero **son inventados**: no vienen de ningún condominio real ni
de una fuente publicada.

---

## Publicar como Artifact

`python build-artifact.py` genera `dist/artifact-index.html`: es el mismo
`index.html` sin las etiquetas `<!doctype>`, `<html>`, `<head>` y `<body>`,
que el visor de claude.ai agrega por su cuenta. Los marcadores
`<!--ARTIFACT:…-->` delimitan qué se extrae. `index.html` sigue siendo la
única fuente.

---

## Detalles de la interfaz

- **Impresión**: el estado de cuenta de una unidad y el cierre mensual están
  pensados para imprimirse. `@media print` oculta menús y botones.
- **Tema**: claro, oscuro o el del sistema. La preferencia se guarda aparte
  de los datos.
- **Recordatorios**: arma el texto con el saldo real de la unidad y abre
  WhatsApp con el mensaje listo, o lo copia al portapapeles.
- **Respaldo**: se copia y se pega como texto, en lugar de descargar un
  archivo, porque el visor de artifacts bloquea las descargas. Para
  hospedaje propio se puede cambiar por un `<a download>`.
