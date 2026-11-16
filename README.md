# Trosso Colosso POS

Sistema punto de venta completo para Pizzería Trosso Colosso.

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Instalación rápida

### 1. Instalar dependencias
```bash
npm run setup
```

### 2. Configurar entorno
```bash
cp server/.env.example server/.env
# Editar server/.env con tus credenciales de PostgreSQL
```

### 3. Crear la base de datos
```sql
-- En psql:
CREATE DATABASE trosso_pos;
```

### 4. Inicializar el schema
```bash
psql postgresql://postgres:PASSWORD@localhost:5432/trosso_pos -f server/db/schema.sql
```

### 5. Ejecutar en desarrollo
```bash
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

## Credenciales por defecto

- **Admin**: usuario "Administrador", contraseña: `admin123`
- Cajeros: se crean desde panel de administración con PIN de 4-6 dígitos

## Funcionalidades

- POS con categorías, búsqueda y carrito (optimizado para tablet)
- Pizzas mitad y mitad con precio automático (precio mayor o promedio)
- Ingredientes extra para pizzas
- Delivery con pedidos pendientes y pago diferido
- Turnos de caja con apertura/cierre y arqueo
- Inventario con costo promedio ponderado
- Recetas y descuento automático de stock en ventas
- Promociones (porcentaje, descuento fijo, 2x1)
- Gastos operacionales por mes
- Reportes: ventas, costos, P&L mensual, balance
- Exportación a Excel
- Gestión de usuarios con roles (admin/cajero)
