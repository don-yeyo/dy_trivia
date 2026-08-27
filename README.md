# 🍞 Don Yeyo S.A. | Trivia Inocuidad 2026 (PWA)

Aplicación Web Progresiva (PWA) interactiva, responsiva (Mobile & Desktop) y gamificada desarrollada para la **Semana de la Inocuidad 2026** de **Don Yeyo S.A.**.

Permite evaluar los conocimientos del personal sobre Buenas Prácticas de Manufactura (BPM), normas de calidad, HACCP y procedimientos de inocuidad en los procesos productivos de la planta.

---

## 🎯 Características Principales

1. **Acceso Seguro sin Registro Tradicional (Enlaces Únicos)**:
   - Cada colaborador cuenta con un enlace único generado mediante un hash criptográfico SHA-256 basado en una frase semilla secreta, su número de legajo, apellido y nombre.
   - Fórmula: `SHA256(SEED_PHRASE + legajo + APELLIDO + NOMBRE)`.
   - Ejemplo de enlace: `https://trivia.donyeyo.com.ar/?token=c7f8a9e1d2...`

2. **Control Dinámico de Fases (Fases 1, 2 y 3)**:
   - Las preguntas están organizadas en hasta 3 fases de dificultad o temáticas semanales.
   - La fase activa se configura instantáneamente por variable de entorno (`VITE_ACTIVE_PHASE`).
   - **Uso único por fase:** Una vez que un participante ingresa y finaliza la trivia en la fase habilitada, el enlace queda bloqueado para esa fase para evitar reintentos.
   - Cuando se habilita una nueva fase (ej. Fase 2), el **mismo enlace único** vuelve a quedar habilitado para responder la nueva fase.

3. **Origen de Datos Flexible (Google Sheets API & CSV)**:
   - Lee preguntas con entre 2 y 5 opciones posibles por pregunta.
   - Permite alternar entre Google Sheets publicado/API o archivos CSV locales mediante `VITE_DATA_SOURCE`.

4. **Experiencia Gaming 3D & Estética Don Yeyo**:
   - Paleta corporativa oficial: Azul Marino (`#0d2c5c`), Rojo Don Yeyo (`#e40521`), Blanco y acentos Neón.
   - Fondo dinámico de rayos rectos giratorios (*Sunburst Effect*) en todas las pantallas con formación acelerada desde el centro y desvanecimiento rápido de salida.
   - Pantalla de bienvenida (Splash) con bienvenida personalizada e icono de usuario centrado.
   - Tarjetas casual gaming con bisel metálico plateado de alta fidelidad.
   - Botones 3D estilo vidrio (*glassmorphism 3D*) con micro-animaciones de rebote, swap-in y aceleraciones rápidas.
   - Efectos de sonido generados por **Web Audio API** (sin assets pesados) para selección, aciertos, fallos y victoria.
   - Animación de confeti al completar la trivia.

5. **Cronómetro y Tiempo de Permanencia**:
   - Barra de tiempo animada por pregunta con alerta visual cuando restan pocos segundos.
   - Posibilidad de presentar preguntas de forma secuencial o aleatoria (`VITE_SHUFFLE_QUESTIONS`).
   - Bonificación de puntaje por rapidez de respuesta.

6. **Soporte PWA (Instalable en Android, iOS y Desktop)**:
   - Service Worker con soporte offline para assets base.
   - Web App Manifest completo con favicon e iconos corporativos.

7. **Listo para Despliegue en Netlify**:
   - Configuración `netlify.toml` con SPA fallback.
   - Serverless functions en `netlify/functions/` listas para interactuar con Google Sheets API o Webhooks de Google Apps Script.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18 + Vite 6
- **Estilos**: Vanilla CSS con Tokens Don Yeyo, Glassmorphism 3D y Keyframes
- **Iconografía**: `lucide-react`
- **Animaciones & Efectos**: `canvas-confetti`, Web Audio API sintetizado
- **Criptografía**: `crypto-js` (SHA-256)
- **Parser de Datos**: `papaparse`
- **Plataforma de Despliegue**: Netlify (Frontend + Serverless Functions)

---

## 📋 Variables de Entorno (`.env`)

| Variable | Descripción | Valores Ejemplo |
| :--- | :--- | :--- |
| `VITE_APP_TITLE` | Título institucional de la aplicación | `"Trivia Inocuidad 2026 - Don Yeyo"` |
| `VITE_SEED_PHRASE` | Frase semilla para generar y validar hashes | `"DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO"` |
| `VITE_ACTIVE_PHASE` | Fase habilitada actualmente en la trivia | `1`, `2` o `3` |
| `VITE_SHUFFLE_QUESTIONS` | Orden de preguntas aleatorio o secuencial | `true` / `false` |
| `VITE_TIME_PER_QUESTION` | Tiempo límite en segundos por pregunta (0 = libre) | `45` |
| `VITE_MAX_TIME_TOTAL` | Tiempo máximo de permanencia total en segundos | `600` |
| `VITE_DATA_SOURCE` | Origen de datos para preguntas y usuarios | `"csv"` o `"google_sheets"` |
| `VITE_GOOGLE_SHEET_QUESTIONS_URL` | URL de publicación CSV de Google Sheet de preguntas | `"https://docs.google.com/..."` |
| `VITE_GOOGLE_SHEET_USERS_URL` | URL de publicación CSV de Google Sheet de usuarios | `"https://docs.google.com/..."` |
| `VITE_GOOGLE_APPS_SCRIPT_ENDPOINT` | Webhook de Google Apps Script para guardar resultados | `"https://script.google.com/macros/s/..."` |

---

## 🚀 Instalación y Ejecución Local

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone <url-del-repositorio>
cd dy_trivia
npm install
```

### 2. Configurar variables de entorno
Copia la plantilla y ajusta los valores según la fase activa:
```bash
cp .env.template .env
```

### 3. Iniciar en modo desarrollo
```bash
npm run dev
```
La aplicación abrirá automáticamente en `http://localhost:3000`.

### 4. Compilar para Producción
```bash
npm run build
```

---

## 👥 Modal de Enlaces Únicos para RRHH / Calidad

En el pie de página de la aplicación, el botón **"Enlaces RRHH"** abre un panel que lista los enlaces generados para cada colaborador de la planilla, permitiendo copiar el link personal o probar la experiencia en una pestaña nueva.

---

## 📄 Estructura de Planillas Google Sheets

### 1. Planilla de Preguntas (`preguntas_inocuidad`)
| Columna | Nombre | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| A | `pregunta` | Texto | Enunciado de la pregunta |
| B | `opcion1` | Texto | Opción A |
| C | `opcion2` | Texto | Opción B |
| D | `opcion3` | Texto | Opción C |
| E | `opcion4` | Texto | Opción D (opcional) |
| F | `opcion5` | Texto | Opción E (opcional) |
| G | `respuesta_correcta` | Número | Número de opción correcta (1 a 5) |
| H | `puntos` | Número | Puntaje base de la pregunta |
| I | `explicacion` | Texto | Justificación técnica de inocuidad |
| J | `fase` | Número | Fase a la que pertenece (1, 2 o 3) |

### 2. Planilla de Usuarios (`usuarios_participantes`)
| Columna | Nombre | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| A | `legajo` | Texto / Número | Legajo del colaborador |
| B | `apellido` | Texto | Apellido del colaborador |
| C | `nombre` | Texto | Nombre del colaborador |
| D | `token_hash` | Texto | Hash SHA-256 generado |
| E | `fase1` | Timestamp | Fecha/hora en que completó la Fase 1 |
| F | `fase2` | Timestamp | Fecha/hora en que completó la Fase 2 |
| G | `fase3` | Timestamp | Fecha/hora en que completó la Fase 3 |

---

## 🌐 Publicación en Netlify

1. Conectar el repositorio Git a Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. En **Site Settings > Environment Variables**, cargar las variables de entorno de `.env`.
5. Al cambiar de fase en la empresa (ej: pasar de Fase 1 a Fase 2), solo basta con actualizar `VITE_ACTIVE_PHASE=2` en Netlify y redeployar.

---
**Don Yeyo S.A. &copy; 2026** - Dirección de Calidad e Inocuidad Alimentaria.
