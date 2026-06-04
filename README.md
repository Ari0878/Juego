# 🪢 Hangman Duel — Guía Completa

Juego de ahorcado multijugador 2 personas, por turnos, con sala compartida.

---

## 🗂 Estructura del proyecto

```
hangman-game/
├── backend/          ← Node.js + Express + Socket.IO + PostgreSQL
│   ├── server.js
│   ├── words.js
│   ├── schema.sql
│   ├── package.json
│   └── .env.example
└── mobile/           ← Expo Go (React Native)
    ├── App.js
    ├── config.js     ← ⚠️ Aquí pones la URL del servidor
    ├── app/
    │   ├── HomeScreen.js
    │   ├── WaitingScreen.js
    │   └── GameScreen.js
    └── components/
        ├── HangmanDrawing.js
        └── Keyboard.js
```

---

## PASO 1 — Desplegar el Backend en Railway (gratis)

### 1.1 Crear cuenta en Railway
1. Ve a https://railway.app
2. Regístrate con GitHub

### 1.2 Crear proyecto PostgreSQL
1. Dashboard → **New Project** → **Deploy PostgreSQL**
2. Una vez creado, clic en la base de datos → pestaña **Connect**
3. Copia la variable `DATABASE_URL` (formato: `postgresql://...`)

### 1.3 Subir el backend
**Opción A — GitHub (recomendada)**
1. Crea un repo en GitHub, sube la carpeta `backend/`
2. En Railway → **New Service** → **Deploy from GitHub**
3. Selecciona tu repo

**Opción B — Railway CLI**
```bash
npm install -g @railway/cli
cd backend
railway login
railway init
railway up
```

### 1.4 Configurar variables de entorno en Railway
En tu servicio de Node.js → pestaña **Variables**:
```
DATABASE_URL = (el valor que copiaste del Postgres)
PORT         = 3000
NODE_ENV     = production
```

### 1.5 Ejecutar el schema SQL
1. En Railway → tu servicio PostgreSQL → pestaña **Query**
2. Pega el contenido de `schema.sql` y ejecuta

### 1.6 Obtener tu URL pública
En tu servicio Node.js → pestaña **Settings** → **Networking** → **Generate Domain**
Te dará algo como: `https://hangman-backend-production.up.railway.app`

---

## PASO 2 — Configurar la App Móvil

### 2.1 Edita `mobile/config.js`
```js
export const SERVER_URL = "https://TU-URL.up.railway.app"; // ← cambia esto
```

### 2.2 Instalar dependencias
```bash
cd mobile
npm install
```

### 2.3 Instalar Expo Go en los celulares
- Android: https://play.google.com/store/apps/details?id=host.exp.exponent
- iOS: https://apps.apple.com/app/expo-go/id982107779

### 2.4 Correr la app
```bash
npx expo start
```
Escanea el QR que aparece con Expo Go en cada celular.

> ⚠️ Ambos celulares deben tener conexión a internet para conectarse al servidor en Railway.

---

## PASO 3 — Jugar

### Flujo completo:
1. **Jugador 1** abre la app → escribe su nombre → **CREAR SALA**
2. Aparece un código de 6 letras (ej: `XK9M2P`)
3. **Jugador 2** abre la app → escribe su nombre → **UNIRSE** → ingresa el código
4. El juego inicia automáticamente cuando ambos están conectados

### Reglas:
- 5 rondas por partida
- 6 intentos máximos por ronda (el ahorcado se dibuja progresivamente)
- Si adivinas una letra correcta → sigues adivinando (tu turno continúa)
- Si fallas → pasa el turno al otro jugador
- Si nadie adivina la palabra → la gana el otro jugador
- Al final de 5 rondas → se muestra quién ganó la partida

### Palabras:
- Se obtienen de **palabras.dev** (API pública de palabras en español)
- Si la API falla → usa el banco local de 25 palabras
- Palabras: 3-7 letras, sin acentos, letras del alfabeto español

---

## Alternativa: Usar Render (también gratis)

1. Ve a https://render.com → New → **Web Service**
2. Conecta tu repo de GitHub con la carpeta `backend/`
3. Build command: `npm install`
4. Start command: `npm start`
5. Agrega las variables de entorno igual que en Railway
6. Para PostgreSQL: New → **PostgreSQL** (plan gratuito)

> ⚠️ Render en plan gratuito se "duerme" después de 15 minutos de inactividad. La primera conexión tarda ~30 segundos en despertar.

---

## 🔧 Solución de problemas

| Problema | Solución |
|---|---|
| App no conecta | Verifica `SERVER_URL` en `config.js` |
| "Sala no encontrada" | Verifica que el backend esté corriendo |
| Sala llena | Solo 2 jugadores por sala |
| Letras no responden | Solo puede adivinar el jugador en turno |
| Palabras repetidas | El sistema evita repetir palabras en la misma partida |

---

## 📦 Tecnologías usadas

| Componente | Tecnología |
|---|---|
| App móvil | React Native + Expo |
| Tiempo real | Socket.IO |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL |
| Palabras | palabras.dev + banco local |
| Deploy | Railway / Render |
