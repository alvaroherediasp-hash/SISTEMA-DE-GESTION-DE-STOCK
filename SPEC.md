# Sistema Club Liceo - Especificación

## 1. Project Overview
- **Nombre**: Sistema Club Liceo
- **Tipo**: Aplicación web full-stack
- **Funcionalidad**: Gestión de jugadores, asistencia a entrenamientos, cuotas (club y unión), y carga de partidos
- **Target**: Administradores del club

## 2. Tech Stack
- **Backend**: Node.js + Express
- **Frontend**: HTML/CSS/JS con Bootstrap 5
- **Database**: MySQL
- **Server**: Servidor local

## 3. UI/UX Specification

### Layout
- Navbar fijo superior con menú de navegación
- Contenedor principal con padding
- Cards para secciones
- Tablas responsivas con Bootstrap

### Color Scheme
- Primary: `#1a237e` (azul oscuro club)
- Secondary: `#c62828` (rojo)
- Background: `#f5f5f5`
- Cards: `#ffffff`

### Pages
1. **Buscar Jugador** (Home) - Buscador por nombre/apellido o DNI
2. **Jugadores** - CRUD completo de jugadores
3. **Asistencia Entrenamiento** - Check semanal (3 días)
4. **Cuotas Club** - 12 meses con checks
5. **Cuotas Unión** - Cuota 1 y Cuota 2 con checks
6. **Partidos** - Carga de partidos con pagos por jugador

## 4. Data Models

### Jugador
- id (PK)
- nombre (string)
- apellido (string)
- dni (string, unique)
- fecha_nacimiento (date)
- telefono (string)
- email (string)
- categoria (string)
- created_at (timestamp)

### AsistenciaEntrenamiento
- id (PK)
- jugador_id (FK)
- semana (string - formato "YYYY-WW")
- dia1_check (boolean)
- dia2_check (boolean)
- dia3_check (boolean)
- estado (enum: "completo", "incompleto", "no_asistio")
- created_at (timestamp)

### CuotaClub
- id (PK)
- jugador_id (FK)
- mes (1-12)
- anio (int)
- check (boolean)
- created_at (timestamp)

### CuotaUnion
- id (PK)
- jugador_id (FK)
- anio (int)
- cuota1_check (boolean)
- cuota1_importe (decimal)
- cuota1_medio_pago (string)
- cuota2_check (boolean)
- cuota2_importe (decimal)
- cuota2_medio_pago (string)
- created_at (timestamp)

### Partido
- id (PK)
- fecha (date)
- created_at (timestamp)

### PagoPartido
- id (PK)
- partido_id (FK)
- jugador_id (FK)
- check (boolean)
- importe (decimal)
- medio_pago (string)
- estado_pago (enum: "pagado", "no_pago")
- created_at (timestamp)

## 5. API Endpoints

### Jugadores
- GET /api/jugadores - Listar todos
- GET /api/jugadores/:id - Ver jugador
- GET /api/jugadores/buscar?q= - Buscar por nombre/apellido/DNI
- POST /api/jugadores - Crear
- PUT /api/jugadores/:id - Modificar
- DELETE /api/jugadores/:id - Eliminar

### Asistencia Entrenamiento
- GET /api/asistencia?semana= - Ver semana
- POST /api/asistencia - Crear/actualizar semana
- GET /api/asistencia/estado/:jugadorId - Ver estado actual

### Cuotas Club
- GET /api/cuotas-club/:jugadorId - Ver cuotas jugador
- POST /api/cuotas-club - Crear/actualizar

### Cuotas Unión
- GET /api/cuotas-union/:jugadorId - Ver cuotas jugador
- POST /api/cuotas-union - Crear/actualizar

### Partidos
- GET /api/partidos - Listar partidos
- POST /api/partidos - Crear partido
- GET /api/partidos/:id - Ver partido con pagos
- POST /api/partidos/:id/pagos - Actualizar pagos

## 6. Funcionalidades Específicas

### Buscador (Home)
- Input de búsqueda
- Búsqueda en tiempo real (debounce 300ms)
- Busca por: nombre, apellido, DNI
- Muestra resultados en cards o tabla

### Asistencia Entrenamiento
- Selector de semana (calendario)
- 3 checkboxes por semana (Lun/Mié/Vie o configurable)
- Cálculo automático de estado:
  - 3 checks = "completo"
  - 1-2 checks = "incompleto"
  - 0 checks = "no_asistio"

### Cuotas Club
- 12 checks (Enero-Diciembre)
- Visualización por año
- Estado: pagada/no pagada

### Cuotas Unión
- 2 columnas: Cuota 1, Cuota 2
- Cada una con: check, importe, medio_pago
- Selector de año

### Partidos
- Botón "Agregar Partido" - crea partido con fecha hoy
- Por cada jugador: 3 columnas (check, importe, medio_pago)
- Si fecha < hoy y vacío → "no pago"

## 7. Acceptance Criteria
- [ ] Buscador funcional por nombre, apellido y DNI
- [ ] CRUD jugadores completo
- [ ] Asistencia semanal con 3 checks y cálculo de estado
- [ ] Cuotas Club con 12 meses
- [ ] Cuotas Unión con 2 cuotas
- [ ] Partidos con pagos por jugador
- [ ] Interfaz responsiva con Bootstrap
- [ ] Persistencia en MySQL