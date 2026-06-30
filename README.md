# 🏉 Liceo Rugby Club - Firebase

## 📋 Requisitos

- Node.js instalado
- Cuenta de Google
- Proyecto Firebase creado

---

## 🚀 Guía de deploy paso a paso

### 1. Crear proyecto en Firebase

1. Ir a https://console.firebase.google.com
2. Click **"Agregar proyecto"** → Nombre: `liceo-rugby-club`
3. Habilitar **Google Analytics** (opcional)

### 2. Configurar Firestore

1. En la consola Firebase, ir a **Firestore Database**
2. Click **"Crear base de datos"**
3. Elegir modo **"Comenzar en modo de prueba"** (después se puede restringir)
4. Elegir región cercana (ej: `us-central1`)

### 3. Vincular app web

1. Ir a **Configuración del proyecto** > **General**
2. Click **"Agregar app"** > **Web** (icono `</>`)
3. Copiar el objeto `firebaseConfig`
4. Pegarlo en `public/js/firebase-config.js`

### 4. Subir a GitHub

```bash
# Inicializar repo
cd "C:\Users\DANIEL\Desktop\SISTEMA LICEO"
git init
git add .
git commit -m "Primer commit - Liceo Rugby Club Firebase"

# Crear repo en GitHub, luego:
git remote add origin https://github.com/TU_USUARIO/liceo-rugby-club.git
git push -u origin main
```

### 5. Instalar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

- Seleccionar proyecto (el creado en paso 1)
- Carpeta pública: `public`
- Single-page app: **Sí**
- Sobrescribir index.html: **No**

### 6. Deploy

```bash
firebase deploy
```

✅ **Listo.** La app se publica en:
`https://TU_PROYECTO.web.app`

---

## 🔧 Funcionalidades

| Sección | Descripción |
|---------|-------------|
| **🔍 Buscar** | Búsqueda por nombre, apellido, DNI |
| **👥 Jugadores** | CRUD completo (agregar, editar, eliminar) |
| **📅 Asistencia** | 3 checks semanales + estado automático |
| **💰 Cuotas Club** | 12 checks mensuales |
| **🏛️ Cuotas Unión** | 2 cuotas (check, importe, medio de pago) |
| **🍺 3° Tiempo** | Partidos + pagos por jugador |

## 📁 Estructura del proyecto

```
public/
├── index.html            # App principal
├── css/
│   └── style.css         # Estilos
├── js/
│   ├── firebase-config.js  # Config Firebase (completar)
│   └── app.js              # Lógica de la app
firebase.json               # Config hosting
```
