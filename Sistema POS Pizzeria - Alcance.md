# Sistema de Punto de Venta e Inventario — Alcance

**MIGUEL ÁNGEL GUTIÉRREZ** · Full Stack Engineer

---

## Alcance

Con base en los requerimientos obtenidos se ha determinado desarrollar un sistema web para una pizzería, con la capacidad de registrar las ventas, controlar el inventario de insumos mediante recetas, realizar el arqueo de caja entre turnos y generar los reportes del negocio. El sistema será simple de usar para el cajero y estará optimizado para tablet. Para esto se deben desarrollar las siguientes funcionalidades:

---

## Punto de Venta (Caja)

### Inicio de Sesión

- Cada usuario ingresa con su **PIN personal** desde la pantalla de la caja, lo que permite cambiar de cajero rápidamente.
- El usuario administrador ingresa con contraseña y tiene acceso a todos los módulos.
- Roles disponibles:
  - **Administrador:** acceso completo.
  - **Cajero:** acceso al punto de venta y al arqueo de su turno.

### Venta

- Pantalla táctil con los productos organizados por categoría, cada uno con su **imagen** y precio.
- resumen de venta con cantidades, descuentos aplicados y total.
- Aplicación automática de las **promociones** vigentes.
- Opción de **venta al por mayor**, que aplica el precio mayorista configurado en cada producto.
- No se podrá vender sin un turno de caja abierto.

### Pizzas Mitad y Mitad e Ingredientes Extra

- Al vender una pizza se podrá elegir:
  - **Mitad y mitad:** dos sabores en una misma pizza. El precio se calcula según la regla configurada por el administrador: precio de la pizza más cara o promedio de ambas.
  - **Ingredientes extra:** se agregan a la pizza y suman su precio al total.
- El inventario descontará la mitad de los ingredientes de cada sabor, la base completa y los ingredientes extra agregados.

### Canal de Venta

- Cada venta se registra como **Al paso** o **Delivery**.
- Las ventas delivery se registran al tomar el pedido y quedan como **pendientes de cobro**. Al entregarse, se marcan como cobradas indicando el medio de pago.
- Listado de pedidos delivery pendientes de cobro en la caja.
- El cobro se suma al turno de caja en que se realiza.

### Medios de Pago

- Efectivo (con cálculo de vuelto).
- Transferencia.
- Tarjeta.
- JUNAEB.

### Voucher

- Al finalizar cada venta se podrá **elegir si imprimir o no** el voucher.
- Formato para impresora térmica de 58 mm, con el nombre del negocio, el detalle de la venta, el total y el medio de pago.
- Impresión desde la tablet Android o desde un computador.

---

## Sistema Administrador

### Gestión de Productos

- Dentro de este módulo se podrán crear, editar y desactivar los productos de venta: pizzas, galletones, empanadas, café, bebestibles, agua con o sin gas, snickers, mantequilla de maní y otros.
- Los datos de cada producto serán los siguientes:
  - Nombre
  - Categoría
  - Imagen
  - Precio de venta
  - Precio al por mayor
  - Tamaños (opcional): por ejemplo mediana y familiar, cada uno con su propio precio y receta
  - Tipo: elaborado (con receta) o de reventa (descuenta su propio stock)
  - Costo indirecto por unidad (opcional, por ejemplo la luz en el caso del café)
- Gestión de los **ingredientes extra** disponibles para las pizzas, con su precio (fijo o según el tamaño de la pizza).

### Promociones

- El administrador podrá crear, editar, activar y desactivar promociones (por ejemplo descuentos o 2×1), con fecha de inicio y de término.

### Inventario de Insumos

- Registro de los insumos utilizados por el negocio (harina, queso, salsa, ingredientes, envases, etc.) con los siguientes datos:
  - Nombre
  - Unidad de medida (gramos, mililitros o unidades)
  - Stock actual
  - Stock mínimo (genera una alerta cuando el stock está bajo)
  - Costo promedio (se actualiza automáticamente con cada compra)
- **Registro de compras:** ingresa mercadería al inventario indicando cantidad y costo. Se permite comprar en una unidad (por ejemplo kilos) y el sistema la convierte a la unidad de la receta.
- **Mermas y ajustes:** registro de pérdidas o correcciones de stock con su motivo.
- Historial de movimientos de cada insumo: compras, ventas, mermas y ajustes.

### Recetario

- Cada producto elaborado (pizzas, galletones, empanadas, café) tendrá una receta con los insumos y las cantidades que utiliza.
- Al registrar una venta, el sistema **descontará automáticamente** los insumos de la receta.
- El sistema calculará el **costo real** de cada producto y su margen de ganancia.

**Ejemplo:**
- Pizza Napolitana: masa 250 g, salsa 80 ml, queso 200 g, tomate 60 g, orégano 2 g.
- Costo de la receta según costos promedio: $3.200
- Precio de venta: $9.000
- Margen: $5.800 (64%)

En el caso del café, al costo de la receta se suma el costo indirecto de la luz configurado en el producto.

### Caja y Arqueo por Turno

- **Apertura de turno:** el cajero registra el monto inicial de efectivo.
- Durante el turno se podrán registrar **ingresos y retiros** de caja con su motivo.
- **Cierre de turno (arqueo):** el cajero ingresa lo contado por cada medio de pago y el sistema muestra el monto esperado, el contado y la diferencia.
- El arqueo podrá realizarse entre turnos y no solo al cierre del día.
- Historial de turnos con el detalle de cada arqueo y el usuario responsable.

**Ejemplo:**
- Monto inicial: $20.000
- Ventas en efectivo del turno: $85.000
- Retiro de caja: $10.000
- Efectivo esperado: $95.000 — Efectivo contado: $94.500 — Diferencia: -$500

### Gastos

- Registro de los gastos del mes por categoría: arriendo, luz, gas, agua, sueldos y otros. Estos gastos se utilizan en el estado de resultados.

### Usuarios

- Crear, editar y desactivar usuarios, asignando su rol y su PIN.

### Configuración

- Nombre y logo del negocio, texto del voucher, regla de precio de las pizzas mitad y mitad y horario de cierre del día comercial (para negocios que atienden después de medianoche).

---

## Reportes

### Ventas

- Ventas netas por día y por período, con filtros por fecha.
- Ventas por medio de pago: efectivo, transferencia, tarjeta y JUNAEB.
- **Ventas delivery** y **ventas al paso**.
- Productos más vendidos.

### Reporte de Costos

- Costo de ventas, margen por producto y mermas valorizadas del período.

### Estado de Resultados (Mensual)

- Resumen del resultado del negocio en el mes.

**Ejemplo:**
- Ventas netas: $4.500.000
- Costo de ventas (según recetas): $1.600.000
- Margen bruto: $2.900.000
- Gastos del mes: $1.800.000
- Resultado del mes: $1.100.000

### Balance General (Simplificado)

- Efectivo en caja según los arqueos, inventario valorizado y resultado del período.
- Exportación de los reportes a Excel.

---

## Plataforma

- Aplicación web adaptable a **tablet, computador y celular**: la caja está optimizada para tablet Android y el administrador puede revisar los reportes desde su teléfono.
- Base de datos en la nube con **respaldos diarios automáticos** y 30 días de historial.
- Despliegue y puesta en marcha del sistema en el servidor.
- Capacitación de uso.
- Compatible con la impresora térmica Xprinter XP-58IIH (58 mm).

---

## No Incluye

- Facturación o boleta electrónica.
- Integración con aplicaciones de delivery (PedidosYa, Uber Eats u otras).
- Funcionamiento sin conexión a internet.
- Gestión de más de un local.
- Balance contable formal (el balance incluido es simplificado).

---

## Tiempos de Entrega

- **Semana 1:** punto de venta, productos, inventario y recetario funcionando, con una demostración.
- **Semana 2:** caja y arqueo, reportes, voucher y publicación del sistema completo.
- **Semana 3:** ajustes después de las pruebas en el local, prueba de impresión y capacitación.

El plazo comienza al confirmar el proyecto.

---

## Consideraciones

- El sistema requiere conexión a internet en el local.
- La semana de ajustes incluye cambios menores como textos, orden, campos visibles o formato del voucher.
- Las funcionalidades no descritas en este documento, o los cambios a lo ya aprobado, se solicitan por escrito y se cotizan por separado.
- La corrección de errores respecto de lo descrito en este documento siempre está incluida.
