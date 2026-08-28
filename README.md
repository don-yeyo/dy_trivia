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
   - **Logo oficial animado**: Latido constante y sutil (*heartbeat*) en el encabezado que le otorga dinamismo y vida visual permanente a la marca.
   - Fondo dinámico de rayos rectos giratorios (*Sunburst Effect*) en todas las pantallas con formación acelerada desde el centro y desvanecimiento rápido de salida.
   - **Pantalla de bienvenida y reanudación inteligente**:
     - *Primera vez:* "¡Bienvenido/a!", total de preguntas y botón "Comenzar Trivia".
     - *Reanudación:* "¡Bienvenido/a de nuevo!", conteo dinámico exacto de preguntas pendientes ("Te restan X preguntas...") y botón "Continuar Trivia".
     - *Aclaración explícita:* Cada pregunta permite un único intento por participante.
   - Tarjetas y opciones con **Glassmorphism auténtico / Vidrio Esmerilado** (`backdrop-filter: blur`, bordes translúcidos y reflejo interior) centralizadas mediante variables CSS en `:root` de `src/index.css`.
   - Botones 3D estilo casual gaming con micro-animaciones de rebote, swap-in y aceleraciones rápidas.
   - Efectos de sonido generados por **Web Audio API** (sin assets pesados) para selección, aciertos, fallos y victoria.
   - Animación de confeti al completar la trivia.

5. **Cronómetro y Tiempo de Permanencia**:
   - Barra de tiempo animada por pregunta con alerta visual cuando restan pocos segundos.
   - Posibilidad de presentar preguntas de forma secuencial o aleatoria (`VITE_SHUFFLE_QUESTIONS`).
   - Bonificación de puntaje por rapidez de respuesta.
   - **Registro fidedigno de respuestas:** Si a un participante se le agota el tiempo en una pregunta, esta se registra como no contestada y no se contabiliza en el resumen de preguntas respondidas (ej. mostrando "4 de 5").

6. **Soporte PWA & Vista Previa para WhatsApp / Redes (Open Graph)**:
   - Service Worker con soporte offline para assets base.
   - Web App Manifest completo con favicon e iconos corporativos.
   - Etiquetas **Open Graph (`og:image`, `og:title`, `og:description`)** y **Twitter Cards** configuradas con imagen HD (`public/og-preview.jpg`) para que al compartir cualquier enlace en **WhatsApp**, Facebook, LinkedIn o Telegram aparezca automáticamente la tarjeta de vista previa con la imagen oficial de la trivia.

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
| `VITE_ALLOW_SESSION_RESET` | Modo desarrollo: permitir reinicio de sesión y acceso sin token | `false` (prod) / `true` (dev) |
| `VITE_DATA_SOURCE` | Switch de origen de datos | `"csv"`, `"google_sheets_api"` o `"google_sheets"` |
| `VITE_GOOGLE_SHEETS_SPREADSHEET_ID` | ID de la planilla de Google Sheets | `"1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"` |
| `VITE_GOOGLE_SHEETS_API_KEY` | Clave API de Google Cloud Console | `"TU_API_KEY_DE_GOOGLE"` |
| `VITE_GOOGLE_SHEETS_QUESTIONS_RANGE` | Pestaña y rango de preguntas | `"Preguntas!A1:Z100"` |
| `VITE_GOOGLE_SHEETS_USERS_RANGE` | Pestaña y rango de participantes | `"Participantes!A1:Z500"` |
| `VITE_GOOGLE_SHEET_QUESTIONS_URL` | URL CSV publicada de preguntas | `"https://docs.google.com/..."` |
| `VITE_GOOGLE_SHEET_USERS_URL` | URL CSV publicada de usuarios | `"https://docs.google.com/..."` |
| `VITE_GOOGLE_APPS_SCRIPT_ENDPOINT` | Webhook de Apps Script para guardar resultados | `"https://script.google.com/macros/s/..."` |

---

## 🛡️ Arquitectura de Seguridad & Backend Serverless (Netlify Functions)

Para garantizar la **máxima seguridad de datos y transparencia del concurso**:
1. **Credenciales y Secretos 100% Protegidos**: La `API Key` de Google Sheets, el `Spreadsheet ID` y el webhook de Apps Script residen exclusivamente en el entorno seguro de **Netlify Functions** (`netlify/functions/`). NUNCA se exponen al navegador cliente ni viajan en peticiones de red del frontend.
2. **Sanitización de Respuestas Correctas**: El endpoint `/api/questions` devuelve al frontend las preguntas y opciones **sin incluir la columna de respuesta correcta ni pistas**.
3. **Evaluación de Respuestas en Servidor**: Al responder una pregunta, el frontend envía la selección a `POST /api/submit-answer`. La Serverless Function es la única que contrasta la opción elegida contra la respuesta correcta original, calcula el puntaje con bonificación de velocidad y persiste el resultado en Google Sheets en tiempo real.

### 🌐 Endpoints Serverless Disponibles:
- `GET /api/auth?token=...&phase=1`: Valida el hash/token del colaborador y obtiene su progreso sin exponer listas completas de nómina.
- `GET /api/questions?phase=1`: Devuelve las preguntas de la fase activa sanitizadas.
- `POST /api/submit-answer`: Evalúa en servidor el acierto/fallo de la respuesta y la persiste en Google Sheets vía Apps Script.

#### Paso 1: Crear Proyecto y Habilitar Google Sheets API en Google Cloud
1. Ingresa a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un nuevo proyecto (ej: `Don Yeyo - Trivia Inocuidad 2026`).
3. En el menú lateral, dirígete a **APIs & Services (APIs y servicios) > Library (Biblioteca)**.
4. Busca **"Google Sheets API"** y haz clic en **Enable (Habilitar)**.

#### Paso 2: Crear y Restringir la API Key
1. Dirígete a **APIs & Services > Credentials (Credenciales)**.
2. Haz clic en **+ Create Credentials (+ Crear credenciales) > API key (Clave de API)**.
3. Copia la API Key generada.
4. *(Recomendado para Producción)* Edita la clave y aplícale restricciones:
   - **Application restrictions**: Selecciona **HTTP referrers (sitios web)** e ingresa tu dominio de producción (ej: `https://trivia.donyeyo.com.ar/*`) y `http://localhost:*` para desarrollo local.
   - **API restrictions**: Selecciona **Restrict key** y marca únicamente **Google Sheets API**.

#### Paso 3: Configurar la Planilla de Google Sheets
1. Abre tu hoja de cálculo en Google Sheets.
2. Copia el **Spreadsheet ID** que figura en la URL:
   `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit`
3. Haz clic en el botón **Compartir** (arriba a la derecha) y asegúrate de que el acceso general esté configurado en:
   **"Cualquier persona con el enlace" -> Lector**.
4. Nombra tus pestañas:
   - Pestaña 1: `Preguntas` (con las columnas de preguntas).
   - Pestaña 2: `Participantes` (con la nómina de colaboradores).

#### Paso 4: Cargar en `.env`
```env
VITE_DATA_SOURCE="google_sheets_api"
VITE_GOOGLE_SHEETS_SPREADSHEET_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
VITE_GOOGLE_SHEETS_API_KEY="TU_API_KEY_DE_GOOGLE_AQUI"
VITE_GOOGLE_SHEETS_QUESTIONS_RANGE="Preguntas!A1:Z100"
VITE_GOOGLE_SHEETS_USERS_RANGE="Participantes!A1:Z500"
```

---

### Modo 3: Publicación Web CSV (`VITE_DATA_SOURCE="google_sheets"`)

Ideal si no deseas crear un proyecto en Google Cloud Console:
1. En tu Google Sheet ve a **Archivo > Compartir > Publicar en la web**.
2. Selecciona la pestaña (ej: `Preguntas`) y formato **Valores separados por comas (.csv)**.
3. Haz clic en **Publicar** y copia el enlace generado en `VITE_GOOGLE_SHEET_QUESTIONS_URL`.
4. Repite para la pestaña `Participantes` en `VITE_GOOGLE_SHEET_USERS_URL`.

---

### 📝 Registro en Vivo de Respuestas (Google Apps Script Webhook)

Para guardar automáticamente los puntajes, tiempos, desglose de respuestas y fecha/hora en tu Google Sheet al terminar cada partida:

#### Paso 1: Abrir el editor de Apps Script
1. En tu Google Sheet ve al menú superior: **Extensiones > Apps Script**.
2. Reemplaza el contenido de `Código.gs` con el siguiente código optimizado:

```javascript
/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT - WEBHOOK TRIVIA INOCUIDAD 2026 (DON YEYO S.A.)
 * Registra en tiempo real cada pregunta respondida, acumulando puntajes,
 * respuestas correctas, tiempos y el JSON detallado por colaborador.
 * ==============================================================================
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // 1. Acción especial: Poblar datos de prueba desde script
    if (data.action === "POBLAR_DEMO") {
      poblarDesdePayload(ss, data);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Tablas pobladas con éxito" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Acción: Guardar respuesta individual de pregunta en tiempo real
    if (data.action === "SAVE_QUESTION_ANSWER" && data.answer) {
      saveIndividualAnswer(ss, data);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Pregunta guardada" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "OK" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Guarda o actualiza la respuesta de una pregunta individual en la pestaña 'Resultados'
 */
function saveIndividualAnswer(ss, data) {
  var sheetResultados = ss.getSheetByName("Resultados");
  if (!sheetResultados) {
    sheetResultados = ss.insertSheet("Resultados");
    sheetResultados.appendRow([
      "Fecha y Hora", "Legajo", "Fase", "Puntaje Obtenido", "Respuestas Correctas", "Tiempo Total (Segundos)", "Detalle Respuestas (JSON)"
    ]);
    sheetResultados.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#e2e8f0");
  }

  var values = sheetResultados.getDataRange().getValues();
  var targetRowIndex = -1;
  var existingAnswers = [];

  // Buscar fila existente para este legajo y fase
  for (var r = 1; r < values.length; r++) {
    var rowLegajo = String(values[r][1]).trim();
    var rowFase = parseInt(values[r][2], 10);
    if (rowLegajo === String(data.legajo).trim() && rowFase === parseInt(data.fase, 10)) {
      targetRowIndex = r + 1;
      var rawJson = values[r][6];
      if (rawJson) {
        try {
          existingAnswers = JSON.parse(rawJson);
        } catch (e) {}
      }
      break;
    }
  }

  // Insertar o actualizar la respuesta en el array de respuestas
  var newAnswer = data.answer;
  var answerIndex = -1;
  for (var i = 0; i < existingAnswers.length; i++) {
    if (existingAnswers[i].questionId === newAnswer.questionId) {
      answerIndex = i;
      break;
    }
  }

  if (answerIndex >= 0) {
    existingAnswers[answerIndex] = newAnswer;
  } else {
    existingAnswers.push(newAnswer);
  }

  // Recalcular métricas acumuladas
  var totalScore = 0;
  var totalCorrect = 0;
  var totalSeconds = 0;

  existingAnswers.forEach(function(ans) {
    totalScore += (ans.pointsEarned || 0);
    if (ans.isCorrect) totalCorrect += 1;
    totalSeconds += (ans.timeSpent || 0);
  });

  var timestamp = data.fechaHoraRespuesta || new Date().toISOString();

  if (targetRowIndex !== -1) {
    // Actualizar fila existente
    sheetResultados.getRange(targetRowIndex, 1).setValue(timestamp);
    sheetResultados.getRange(targetRowIndex, 4).setValue(totalScore);
    sheetResultados.getRange(targetRowIndex, 5).setValue(totalCorrect);
    sheetResultados.getRange(targetRowIndex, 6).setValue(totalSeconds);
    sheetResultados.getRange(targetRowIndex, 7).setValue(JSON.stringify(existingAnswers));
  } else {
    // Crear nueva fila para este colaborador y fase
    sheetResultados.appendRow([
      timestamp,
      data.legajo,
      data.fase,
      totalScore,
      totalCorrect,
      totalSeconds,
      JSON.stringify(existingAnswers)
    ]);
  }
}

/**
 * ⚡ FUNCIÓN DE 1-CLIC PARA POBLAR LA HOJA DIRECTAMENTE DESDE EL EDITOR DE APPS SCRIPT
 * Selecciona "poblarDatosDemo" en el menú superior y haz clic en "Ejecutar (Run)"
 */
function poblarDatosDemo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Crear y poblar pestaña "Preguntas"
  var sheetPreguntas = ss.getSheetByName("Preguntas");
  if (!sheetPreguntas) {
    sheetPreguntas = ss.insertSheet("Preguntas");
  } else {
    sheetPreguntas.clear();
  }

  sheetPreguntas.appendRow([
    "pregunta", "opcion1", "opcion2", "opcion3", "opcion4", "opcion5", "respuesta_correcta", "puntos", "explicacion", "fase"
  ]);
  sheetPreguntas.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#0d2c5c").setFontColor("#ffffff");

  var preguntas = [
    ["¿Cuál es el tiempo mínimo recomendado para el lavado y desinfección de manos en la línea de producción?", "10 segundos", "20 segundos con jabón bactericida y fricción", "5 segundos con agua solamente", "1 minuto completo", "40 segundos sin secado", 2, 100, "Según BPM y normas de inocuidad, el lavado efectivo requiere al menos 20 segundos de fricción con jabón desinfectante.", 1],
    ["¿Qué tipo de contaminación ocurre si un operario usa guantes sucios para manipular producto terminado?", "Contaminación Física", "Contaminación Cruzada / Biológica", "Contaminación Radiológica", "Contaminación Atmosférica", "", 2, 100, "La transferencia de microorganismos de una superficie sucia al alimento listo para consumo es contaminación cruzada.", 1],
    ["Ante la detección de un objeto extraño metálico en la tolva de amasado, ¿cuál es la acción inmediata?", "Ignorarlo y continuar", "Detener la línea inmediatamente y dar aviso a Calidad / Supervisor", "Retirarlo al final del turno", "Aumentar la velocidad del proceso", "", 2, 150, "Cualquier peligro físico detectado exige la detención inmediata y notificación al área de Calidad para trazabilidad.", 1],
    ["¿Cuál de las siguientes indumentarias está prohibida en zona de elaboración según el estándar Don Yeyo?", "Cofia cubriendo todo el cabello", "Barbijos o cubrebarba si corresponde", "Anillos, aros, relojes y cadenas", "Calzado de seguridad exclusivo de planta", "", 3, 100, "Todo tipo de joyería y accesorios personales representan un peligro físico y fuente de contaminación en planta.", 1],
    ["¿Qué significa la sigla BPM en la industria alimentaria de Don Yeyo?", "Buenas Prácticas de Manufactura", "Bases Para el Mantenimiento", "Buenas Políticas de Manejo", "Balance de Producción Mensual", "", 1, 100, "BPM (Buenas Prácticas de Manufactura) son los principios básicos y prácticas de higiene para garantizar alimentos seguros.", 1],
    ["En el sistema HACCP, ¿qué es un PCC (Punto Crítico de Control)?", "Una etapa donde se revisa el costo del producto", "Una etapa donde se puede aplicar un control esencial para prevenir o eliminar un peligro de inocuidad", "Un punto de reunión en emergencias", "La hora de descanso del personal", "", 2, 150, "Un PCC es una fase en la que es vital aplicar control para reducir un peligro a niveles aceptables.", 2],
    ["Si un termómetro de cámara de refrigeración marca 12°C cuando el límite crítico es máximo 4°C, ¿qué debe hacerse?", "Abrir la puerta para ventilar", "Registrar el desvío, retener el lote y alertar inmediatamente a Calidad", "Esperar al siguiente turno para ver si baja", "Apagar la alarma sonora", "", 2, 150, "Superar el límite crítico de temperatura compromete la cadena de frío y requiere acción correctiva inmediata.", 2],
    ["¿Por qué es fundamental la rotación de materias primas bajo el criterio FIFO (Primero que Entra, Primero que Sale)?", "Para evitar el vencimiento y deterioro de ingredientes", "Para gastar menos energía eléctrica", "Para ordenar las estanterías por color", "Para que el camión no espere", "", 1, 100, "El sistema FIFO garantiza frescura, previene materias primas caducadas y asegura la calidad organoléptica.", 2],
    ["¿Qué producto químico está autorizado para desinfección directa de superficies en contacto con masas?", "Detergente industrial no apto alimenticio", "Sanitizante de grado alimenticio aprobado según concentración estipulada", "Lavandina pura sin dilución", "Alcohol etílico al 96% sin dosificar", "", 2, 120, "Solo sanitizantes aprobados para contacto alimentario en dosis precisas aseguran desinfección sin contaminación química.", 2],
    ["¿Cuál es el procedimiento correcto al toser o estornudar dentro de la nave de envasado?", "Girar hacia la cinta de empaque", "Apartarse de la línea, cubrirse con el pliegue del codo, cambiarse barbijo/cofia y lavarse las manos", "Taparse con las manos y seguir operando", "No hacer nada", "", 2, 100, "Protege el producto y obliga a higienizar manos y recambio de EPP antes de reanudar la manipulación.", 3],
    ["En el Plan de Limpieza y Desinfección (POES), ¿cuál es la diferencia entre limpiar y desinfectar?", "Son exactamente lo mismo", "Limpiar elimina suciedad visible; desinfectar reduce microorganismos a niveles seguros", "Desinfectar es solo pasar un trapo húmedo", "Limpiar requiere químicos fuertes y desinfectar solo agua fría", "", 2, 150, "Limpieza remueve materia orgánica/suciedad, mientras que la desinfección inactiva la carga microbiana residual.", 3],
    ["¿Qué acción se debe tomar si se detecta presencia o indicios de plagas en el depósito de harina?", "Colocar veneno casero en la esquina", "Aislar la zona, retener la materia prima afectada y reportar al responsable de MIP y Calidad", "Ignorarlo si es un insecto pequeño", "Barrer hacia afuera", "", 2, 150, "El Manejo Integrado de Plagas (MIP) prohíbe pesticidas no controlados y exige reporte inmediato y aislamiento.", 3],
    ["¿Qué documento acredita que un lote de panificado cumple todas las especificaciones de inocuidad antes del despacho?", "Remito comercial simple", "Certificado de Calidad y Liberación de Lote", "Factura de venta", "Planilla de asistencia del personal", "", 2, 120, "La liberación de lote formal garantiza que se validaron todos los controles microbiológicos y de proceso.", 3]
  ];

  preguntas.forEach(function(row) {
    sheetPreguntas.appendRow(row);
  });

  // 2. Crear y poblar pestaña "Participantes"
  var sheetParticipantes = ss.getSheetByName("Participantes");
  if (!sheetParticipantes) {
    sheetParticipantes = ss.insertSheet("Participantes");
  } else {
    sheetParticipantes.clear();
  }

  sheetParticipantes.appendRow([
    "legajo", "apellido", "nombre", "token_hash", "fase1", "fase2", "fase3"
  ]);
  sheetParticipantes.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#E5353B").setFontColor("#ffffff");

  var participantes = [
    [1001, "Pérez", "Juan", "c7f8a9e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9", "", "", ""],
    [1002, "González", "María", "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2", "", "", ""],
    [1003, "Rodríguez", "Carlos", "f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2", "", "", ""],
    [1004, "López", "Ana", "b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8", "", "", ""],
    [1005, "Martínez", "Lucas", "d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3", "", "", ""],
    [9999, "Demo", "Participante", "demo_token_inocuidad_2026", "", "", ""]
  ];

  participantes.forEach(function(row) {
    sheetParticipantes.appendRow(row);
  });

  SpreadsheetApp.flush();
  Logger.log("✅ ¡Pestañas Preguntas y Participantes pobladas exitosamente!");
}

function poblarDesdePayload(ss, data) {
  if (data.preguntas && data.preguntas.length > 0) {
    var sheetPreguntas = ss.getSheetByName("Preguntas") || ss.insertSheet("Preguntas");
    sheetPreguntas.clear();
    sheetPreguntas.appendRow(["pregunta", "opcion1", "opcion2", "opcion3", "opcion4", "opcion5", "respuesta_correcta", "puntos", "explicacion", "fase"]);
    sheetPreguntas.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#0d2c5c").setFontColor("#ffffff");
    data.preguntas.forEach(function(p) {
      sheetPreguntas.appendRow([p.pregunta, p.opcion1, p.opcion2, p.opcion3, p.opcion4, p.opcion5, p.respuesta_correcta, p.puntos, p.explicacion, p.fase]);
    });
  }

  if (data.participantes && data.participantes.length > 0) {
    var sheetParticipantes = ss.getSheetByName("Participantes") || ss.insertSheet("Participantes");
    sheetParticipantes.clear();
    sheetParticipantes.appendRow(["legajo", "apellido", "nombre", "token_hash", "fase1", "fase2", "fase3"]);
    sheetParticipantes.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#E5353B").setFontColor("#ffffff");
    data.participantes.forEach(function(u) {
      sheetParticipantes.appendRow([u.legajo, u.apellido, u.nombre, u.token_hash, u.fase1 || "", u.fase2 || "", u.fase3 || ""]);
    });
  }
}
```

#### Paso 2: Guardar e Implementar como Aplicación Web
1. Haz clic en el icono **Guardar** (💾) o presiona `Ctrl + S`.
2. Haz clic en el botón azul **Implementar > Nueva implementación**.
3. En el icono del **engranaje ⚙️**, selecciona **Aplicación web**.
4. Configura:
   - **Descripción**: `Webhook Trivia Inocuidad 2026`
   - **Ejecutar como**: **Yo** (`tu-correo@empresa.com`)
   - **Quién tiene acceso**: **Cualquier usuario** *(Permite que los dispositivos de los colaboradores envíen sus resultados sin requerir login)*.
5. Haz clic en **Implementar**.

#### Paso 3: Autorizar Permisos de Google
1. En la ventana *"La aplicación web requiere que autorices el acceso a tus datos"*, haz clic en **Autorizar acceso**.
2. Selecciona tu cuenta de Google.
3. En la pantalla *"Google hasn’t verified this app / Google no ha verificado esta aplicación"*, haz clic en el enlace **Advanced (Configuración avanzada)**.
4. Haz clic en **Go to Untitled project (unsafe)** / **Ir al proyecto (no seguro)**.
5. En la pantalla de confirmación de permisos, haz clic en **Continue / Permitir**.

#### Paso 4: Copiar la URL generada en `.env`
Google mostrará el modal final con la **URL de la aplicación web** (que termina en `/exec`):
```env
VITE_GOOGLE_APPS_SCRIPT_ENDPOINT="https://script.google.com/macros/s/AKfycbx_H0vdG-GEq5b5YXSNgEg582QECQ1ekd-eLmFCx_w337_6Kai4kBnD1aStYkPYCri9YA/exec"
```

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

## 📄 Estructura de Columnas en Google Sheets

### 1. Pestaña de Preguntas (`Preguntas`)
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

### 2. Pestaña de Participantes (`Participantes`)
| Columna | Nombre | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| A | `legajo` | Texto / Número | Legajo del colaborador |
| B | `apellido` | Texto | Apellido del colaborador |
| C | `nombre` | Texto | Nombre del colaborador |
| D | `token_hash` | Texto | Hash SHA-256 (opcional, si está vacío la app lo calcula) |
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
