# 🍞 Don Yeyo S.A. | Trivia Inocuidad 2026 (PWA)

Aplicación Web Progresiva (PWA) interactiva, responsiva (Mobile & Desktop) y gamificada desarrollada para el **Desafío de Inocuidad 2026** de **Don Yeyo S.A.**.

Permite evaluar los conocimientos del personal sobre Buenas Prácticas de Manufactura (BPM), normas de calidad, HACCP y procedimientos de inocuidad en los procesos productivos de la planta.

---

## 🎯 Características Principales

1. **Acceso Seguro sin Registro Tradicional (Enlaces Únicos)**:
   - Cada colaborador cuenta con un enlace único generado mediante un hash criptográfico SHA-256 basado en una frase semilla secreta, su número de legajo, apellido y nombre.
   - Fórmula: `SHA256(SEED_PHRASE + legajo + APELLIDO + NOMBRE)`.
   - Ejemplo de enlace: `https://trivia.donyeyo.com.ar/?token=c7f8a9e1d2...`

2. **Control Dinámico de Fases y Estado Centralizado (`Configuracion` en Google Sheets)**:
   - Las preguntas están organizadas en hasta 3 fases de dificultad o temáticas semanales.
   - **Gobernanza desde Google Sheets:** La fase activa, el cierre de la jornada (`FASE_CERRADA`), la publicación de clasificados (`CLASIFICACION_PUBLICADA`), los cupos de clasificación (`CLASIFICACION_TOP_COUNT`), los tiempos y la visibilidad de métricas se configuran dinámicamente desde la pestaña **`Configuracion`** de Google Sheets, sin requerir redeploys.
   - **🛡️ Verdad Absoluta en Backend (Inmune a Manipulación):** El backend serverless (`Netlify Functions`) custodia la configuración. El frontend siempre acata lo que el backend le instruye. Cualquier intento de modificar el DOM, `localStorage`, cookies o URL para forzar una fase distinta o evadir el cierre de la jornada es bloqueado y rechazado con código HTTP 403 en el servidor.
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
   - Tiempo y aleatoriedad gobernados por la pestaña `Configuracion` (`TIEMPO_POR_PREGUNTA`, `MEZCLAR_PREGUNTAS`).
   - Bonificación de puntaje por rapidez de respuesta calculada exclusivamente en el servidor.
   - **Registro fidedigno de respuestas:** Si a un participante se le agota el tiempo en una pregunta, esta se registra como no contestada y no se contabiliza en el resumen de preguntas respondidas (ej. mostrando "4 de 5").
   - **🛡️ Protección Antitrampa Blindada Zero-Trust (Stateless HMAC & Entrega 1 a 1):**
     - **Sin exposición de preguntas futuras:** El cliente ya no recibe la lista de preguntas completa de la fase. El backend (`/api/questions`) entrega estrictamente la pregunta activa actual individual. Las preguntas siguientes no existen en el DOM, ni en la memoria de React ni en la pestaña *Network* de DevTools.
     - **Tokens criptográficos temporales (`questionToken`):** Cada pregunta se entrega acompañada de un token firmado con HMAC-SHA256 usando la `SEED_PHRASE` privada del servidor, que sella el `legajo`, `questionId` y el timestamp exacto de entrega (`deliveredAt`).
     - **Cálculo de tiempo real en servidor (Anti-Speedhack):** Al responder (`/api/submit-answer`), el backend valida la firma criptográfica HMAC y calcula el tiempo transcurrido en el servidor (`now - deliveredAt`). Si el cliente intenta falsear el tiempo en la consola de JavaScript o alterar el reloj, el servidor lo ignora y adopta el tiempo real. Si el tiempo superó el límite por pregunta (`TIEMPO_POR_PREGUNTA + 4s`), se declara automáticamente tiempo agotado con 0 puntos.
     - **Entrega atómica de siguiente pregunta (Zero Latency):** La respuesta de `/api/submit-answer` incluye de inmediato la siguiente pregunta pendiente con su nuevo token firmado, eliminando cualquier delay perceptible para el jugador.
     - Si un participante intenta recargar la pantalla (`F5`), cerrar la pestaña o navegar hacia atrás, el navegador advierte del abandono y la pregunta queda consumida con 0 puntos mediante `navigator.sendBeacon`. Al reanudar, el servidor solo entrega la siguiente pregunta pendiente.

6. **Soporte PWA & Vista Previa para WhatsApp / Redes (Open Graph)**:
   - Service Worker con soporte offline para assets base.
   - Web App Manifest completo con favicon e iconos corporativos.
   - Etiquetas **Open Graph (`og:image`, `og:title`, `og:description`)** y **Twitter Cards** configuradas con imagen HD (`public/og-preview.jpg`) para que al compartir cualquier enlace en **WhatsApp**, Facebook, LinkedIn o Telegram aparezca automáticamente la tarjeta de vista previa con la imagen oficial de la trivia.

7. **Listo para Despliegue en Netlify**:
   - Configuración `netlify.toml` con SPA fallback.
   - Serverless functions en `netlify/functions/` con arquitectura de persistencia modular.

8. **Persistencia Dual y Alta Concurrencia (Patrón Repository & Supabase)**:
   - **Soporte para 470+ usuarios simultáneos:** Integra Supabase (PostgreSQL) con índices B-Tree dedicados en hashes de participantes e inserciones atómicas de respuestas sin cuellos de botella por cuotas o bloqueos concurrentes.
   - **Feature Flag `DB_ENGINE`:** Permite alternar sin tocar código entre `sheets` (Google Sheets API v4 + Webhooks) y `supabase` (PostgreSQL de alta velocidad).
   - **Herramienta de migración idempotente (`npm run db:migrate`):** Lee datos de Google Sheets y los vuelca masivamente en Supabase mediante `UPSERT` en lotes sin riesgo de duplicados.

9. **Panel de Gestión Integral de Participantes (Admin CRUD & Enlaces)**:
   - **Gestión completa CRUD:** Alta de nuevos colaboradores, edición de datos (nombre, apellido, sector, email) y eliminación con limpieza de registros.
   - **Generación y regeneración de enlaces únicos (Hashes):** Generación automática individual o masiva ("Generar Hashes Faltantes") aplicando la fórmula oficial `SHA256(SEED_PHRASE + legajo + APELLIDO + NOMBRE)`.
   - **Copia y prueba de enlaces:** Botón de un solo clic para copiar la URL de participación al portapapeles con confirmación visual instantánea y botón para abrir directamente en nueva pestaña.
   - **Seguimiento de invitaciones ("Email Enviado"):** Switch interactivo en tiempo real para auditar qué colaboradores ya recibieron su link y cuáles están pendientes.
   - **Reset de Trivia por Colaborador:** Permite habilitar a un participante a volver a responder la trivia desde cero (borrando sus respuestas en la fase activa o en todas las fases).
   - **Métricas y Filtros en Tiempo Real:** Tarjetas KPI con totales de nómina, cobertura de hashes, % de emails enviados y tasa de participación, con búsqueda libre y filtros por sector y estado.

10. **Panel de Administración Corporativo Don Yeyo (Guideline Profesional)**:
   - **Desacople de la Estética Gamer:** El área de administración prescinde del fondo giratorio animado (`SunburstBackground`) y adopta una interfaz corporativa limpia de sistema de gestión en tono `slate-950` inspirada en la directiva de diseño de Don Yeyo (`dy_shigma`).
   - **Aprovechamiento de Pantalla Completa (Full Width):** Las vistas y tablas se expanden en toda la anchura del monitor sin restricciones de contenedor angosto, otorgando máxima legibilidad y confort.
   - **Header Sobrio y Limpio (`AdminHeader`):** Barra superior fija con isotipo Don Yeyo, marca parametrizable por variable de entorno (`VITE_ADMIN_BRAND_NAME`), badge de motor de base de datos (`Supabase`) y menú de usuario con logout.
   - **Menú Drawer Deslizable (`AdminDrawer`):** Menú lateral categorizado con overlay y efecto `backdrop-blur`, estructurado en las siguientes 5 secciones clave:
     1. **Dashboard:** Vista por defecto al ingresar, con KPIs de inscriptos, progreso de participación, estado de fase y podio provisional.
     2. **Preguntas:** Gestor CRUD integral de preguntas por fase con opciones dinámicas y explicaciones pedagógicas.
     3. **Participantes:** Auditoría de colaboradores, generación de links únicos con hash, seguimiento de mailing y resets.
     4. **Participación:** Control de auditoría y publicación oficial, podio 3D Gamer y exportación a planilla Excel.
     5. **Mailing:** Centro de despacho y configuración de campañas de email corporativo Don Yeyo.
     6. **Configuración:** Parámetros de juego, temporizador por pregunta, penalizaciones, fases y fórmulas de cálculo.
   - **Conservación Estricta de la Pantalla de Juego y Podio 3D:** Toda la experiencia lúdica del participante (`TriviaGame`, `SplashIntro`, `GameOver`) y la estética 3D del Podio Gamer se mantienen 100% intactas para cuando se proyecten o consulten los resultados oficiales.

11. **Gestor CRUD de Preguntas y Fases (Admin API & UI)**:
   - **Gestión por Fase Numérica:** Selector de fase (Fase 1, 2, 3...) con conteo en tiempo real de preguntas registradas.
   - **Opciones Dinámicas de Respuesta:** Soporte para agregar o quitar opciones (A, B, C, D...), con selector visual para marcar la respuesta correcta.
   - **Explicación Pedagógica:** Campo dedicado para registrar el fundamento de la respuesta correcta según los estándares de inocuidad alimentaria de Don Yeyo S.A., preparado para retroalimentación formativa y mailing post-trivia.

12. **Centro de Gestión de Mailing y Comunicaciones Masivas (AdminMailingView)**:
   - **Sección Exclusiva e Independiente:** Reemplaza el botón flotante antiguo en la barra de herramientas de Participantes con un módulo integral de control de comunicaciones.
   - **Selector de Campañas de Email:**
     - **Campaña 1 (Activa):** *Invitación a Jugar* &mdash; Despacho masivo o por lotes con el enlace único criptográfico por colaborador, conteo de preguntas y mensaje motivacional.
     - **Campaña 2 (Preparada):** *Resultados y Feedback Pedagógico* &mdash; Diseñada para el cierre de fase, desglosando por participante aciertos, errores, puntaje y la justificación/explicación técnica de cada respuesta según la normativa de la planta.
   - **Métricas KPI de Cobertura en Vivo:** Padrón total de emails válidos, cantidad y porcentaje de correos enviados, pendientes de despacho y estado de salud del servidor SMTP.
   - **Despacho Flexible:** Opciones para despachar solo a colaboradores pendientes, forzar reenvío a la totalidad del padrón o realizar envíos de prueba individual indicando cualquier dirección de correo.
   - **Live Preview Interactivo (Desktop & Mobile):** Previsualización en tiempo real del diseño HTML oficial corporativo de Don Yeyo con alternador responsivo para verificar el renderizado en teléfonos y clientes de correo de escritorio.

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

Las configuraciones dinámicas de la trivia (fases, cierre, clasificados, tiempos, visibilidad de métricas) fueron migradas a la pestaña **`Configuracion`** de Google Sheets con columna de descripción, quedando el archivo `.env` reservado para credenciales y rangos de conexión:

| Variable | Alcance | Descripción | Valores Ejemplo |
| :--- | :--- | :--- | :--- |
| `DB_ENGINE` | 🔒 Backend | Selector del motor de base de datos (Feature Flag) | `"sheets"` (default) / `"supabase"` |
| `SUPABASE_URL` | 🔒 Backend | URL del proyecto Supabase (PostgREST API) | `"https://xyzcompany.supabase.co"` |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 Backend | Clave de servicio secreta de Supabase (omite RLS en backend) | `"eyJhbGciOi..."` |
| `SUPABASE_ANON_KEY` | 🔒 Backend | Clave anónima pública de Supabase | `"eyJhbGciOi..."` |
| `ADMIN_USER` | 🔒 Backend | Usuario del Administrador para determinar clasificados | `"usuario_admin"` |
| `ADMIN_PASSWORD` | 🔒 Backend | Contraseña del Administrador (NUNCA expuesta al cliente) | `"contraseña_segura_aqui"` |
| `SEED_PHRASE` | 🔒 Backend | Frase semilla para cálculo y validación criptográfica de enlaces | `"DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO"` |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | 🔒 Backend | ID de la planilla de Google Sheets | `"1txRiWnszPxjH0iixtr_zwHDFYAiArOyIaVlylXECJCw"` |
| `GOOGLE_SHEETS_API_KEY` | 🔒 Backend | Clave API de Google Cloud Console (Sheets v4) | `"AIzaSy..."` |
| `GOOGLE_SHEETS_CONFIG_RANGE` | 🔒 Backend | Pestaña y rango de configuración del juego | `"Configuracion!A1:C30"` |
| `GOOGLE_SHEETS_QUESTIONS_RANGE` | 🔒 Backend | Pestaña y rango de preguntas | `"Preguntas!A1:Z100"` |
| `GOOGLE_SHEETS_USERS_RANGE` | 🔒 Backend | Pestaña y rango de participantes | `"Participantes!A1:Z500"` |
| `GOOGLE_SHEETS_RESULTS_RANGE` | 🔒 Backend | Pestaña y rango de resultados | `"Resultados!A1:Z1000"` |
| `GOOGLE_APPS_SCRIPT_ENDPOINT` | 🔒 Backend | Webhook de Apps Script para persistencia | `"https://script.google.com/macros/s/.../exec"` |
| `POINTS_PER_CORRECT` | 🔒 Backend | Puntos base por cada pregunta acertada (jerarquía principal) | `10000` (default) |
| `VITE_POINTS_PER_CORRECT` | 🌐 Frontend | Puntos base por acierto para el frontend | `10000` (default) |
| `SCORE_TIME_FACTOR` | 🔒 Backend | Factor multiplicador para el bonus por velocidad | `1000` (default) |
| `VITE_SCORE_TIME_FACTOR` | 🌐 Frontend | Factor multiplicador de velocidad para el cliente | `1000` (default) |
| `VITE_APP_TITLE` | 🌐 Frontend | Título institucional de la aplicación | `"Trivia Inocuidad 2026 - Don Yeyo"` |
| `VITE_DATA_SOURCE` | 🌐 Frontend | Switch de origen de datos | `"google_sheets_api"` o `"csv"` |
| `VITE_MAX_TIME_TOTAL` | 🌐 Frontend | Tiempo máximo de permanencia total en segundos | `600` |
| `VITE_ALLOW_SESSION_RESET` | 🌐 Frontend | Modo desarrollo: permitir reinicio de sesión | `false` (prod) / `true` (dev) |
| `VITE_GOOGLE_SHEETS_CONFIG_RANGE` | 🌐 Frontend | Fallback en modo local sin servidor | `"Configuracion!A1:C30"` |

---

### 🧮 Fórmula Gamer de Puntuación (Jerarquía por Aciertos + Bonus por Velocidad)

Los puntos de la trivia se calculan garantizando que **quien acierte más preguntas siempre se ubique por encima de quien acertó menos**, y desempatando por velocidad de respuesta:

$$\text{Puntaje} = (\text{Aciertos} \times \text{POINTS\_PER\_CORRECT}) + \text{round}\left(\left(\frac{\text{Aciertos}}{\text{Segundos Totales}}\right) \times \text{SCORE\_TIME\_FACTOR}\right)$$

- **Aciertos:** Cantidad de preguntas respondidas correctamente.
- **Base por acierto (`POINTS_PER_CORRECT`):** $10.000$ puntos por cada respuesta correcta (cada acierto representa un escalón de 10.000 puntos que la velocidad jamás puede vulnerar).
- **Bonus de velocidad (`SCORE_TIME_FACTOR`):** Ratio aciertos/tiempo escalado por $1.000$, sumando entre $50$ y $500$ puntos adicionales según la rapidez del participante.
- **Resultado:** Número entero donde quien tiene 14 aciertos tiene $\approx 140.100$ pts y jamás puede ser superado por alguien de 13 aciertos ($\approx 130.300$ pts). Entre dos participantes con 14 aciertos, quien respondió en menor tiempo obtiene mayor puntaje.

---

## 🗄️ Comandos de Base de Datos y Migración (Supabase)

```bash
# Verificar tablas e índices en Supabase
npm run db:init

# Migrar masivamente Configuración, Participantes y Preguntas de Google Sheets a Supabase
npm run db:migrate
```

---

## 🏆 Pantalla de Podio, Clasificación y Panel de Administración

### 1. Panel de Administración (`/admin` o `?admin=1`)
- **Acceso Directo Oculto por Seguridad:** No existe ningún botón ni ícono visible en la interfaz pública para acceder al panel de administración. El acceso se realiza exclusivamente escribiendo en la barra del navegador la URL `/admin` o `?admin=1`.
- **Autenticación Segura en Servidor:** Las credenciales (`ADMIN_USER` y `ADMIN_PASSWORD`) residen exclusivamente en variables de entorno del backend (Netlify Functions) y **nunca** son expuestas al frontend ni bundle de cliente.
- **Configuración Integral Sincronizada con Google Sheets:**
  - **Fase del Torneo (`FASE_ACTIVA`):** Selector de Fase 1, Fase 2 o Fase 3 con actualización reactiva inmediata de la clasificación.
  - **Estado de Fase (`FASE_CERRADA`):** Switch para conmutar entre Fase Abierta (permite ingreso y respuestas de participantes) y Fase Cerrada (bloquea envíos de respuestas para iniciar el corte oficial o auditoría).
  - **Publicación Oficial de Clasificados (`CLASIFICACION_PUBLICADA`):** Switch y controles directos para alternar entre *Oculta (En Auditoría)* y *Publicada Oficial (Visible)*. **Importante:** Una fase puede estar cerrada (sin admitir más respuestas de participantes) pero aún no publicada (en revisión por Calidad/RRHH).
  - **Banner Principal de Publicación Oficial y Botones de Acción:** En `/admin` se incluye un banner reactivo que indica claramente si los resultados son visibles en los dispositivos de los colaboradores o si permanecen privados para auditoría interna, con botones directos para **"Publicar Clasificación Ahora"** y **"Despublicar / Volver a Auditoría"** sin necesidad de abrir la vista de proyección.
  - **Cupo de Clasificados (`CLASIFICACION_TOP_COUNT`):** Campo numérico con presets rápidos (5, 10, 20, 30...) que define el corte oficial de clasificados para la tabla y la proyección.
  - **Tiempo por Pregunta (`TIEMPO_POR_PREGUNTA`):** Configuración en segundos (presets: 15s, 20s, 30s, 45s, o 0 para tiempo ilimitado).
  - **Mezclar Preguntas (`MEZCLAR_PREGUNTAS`):** Aleatorización del orden de preguntas por participante.
  - **Visibilidad en Tablas y Pantallas Públicas:** Toggles para `MOSTRAR_PARCIALES_EN_TABLA`, `MOSTRAR_NO_RESPONDIDOS_EN_TABLA`, `OCULTAR_RESUMEN_RESPONDIDAS` y `OCULTAR_RESUMEN_TIEMPO`.
  - **Botón "Guardar Configuración en Google Sheets":** Persiste todos los cambios directamente en el backend y los sincroniza con la pestaña `Configuracion` de Google Sheets vía Apps Script.
- **Apertura de Pantalla de Proyección Blindada:** Botón destacado que abre en pestaña independiente (`_blank`) la vista de proyección cinematográfica (`?view=proyeccion`).
  - **🛡️ Acceso Exclusivo de Administrador:** La pantalla de proyección requiere obligatoriamente sesión activa de administrador; si un usuario no autenticado o deslogueado intenta acceder a `/admin?view=proyeccion` o `/proyeccion`, es bloqueado y redirigido al formulario de inicio de sesión.
  - **Inmune a manipulación de Query Params:** La fase y el cupo de clasificados son leídos directamente desde Google Sheets (`Configuracion!A1:C30`). No se admiten ni se leen query params manipulables en la URL.
- **Disparador Gamer "Determinar Clasificados":** Al hacer clic en la proyección o en el panel, activa una animación gamer de alta fidelidad que simula el escaneo de registros de la planta, auditoría de respuestas correctas, cálculo de tiempos y desempates.
- **Publicación Oficial:** Al completar el cálculo o pulsar publicar, la clasificación y el podio quedan inmediatamente disponibles para que todos los colaboradores puedan ingresar a verla públicamente desde sus teléfonos celulares.
- **Exportación a Excel (.xlsx) para Fases Cerradas:**
  - Cuando una fase se encuentra cerrada (`FASE_CERRADA`), se habilita automáticamente el botón **"Exportar a Excel (.xlsx)"** en la barra de acciones y en la cabecera de la vista previa.
  - Genera un archivo `.xlsx` profesional compuesto por 3 pestañas:
    1. **Clasificación Fase X:** Nómina general completa con posición, estado de clasificación (`CLASIFICADO (TOP N)` / `NO CLASIFICADO`), legajo, nombre, sector, puntaje, aciertos, tiempo en segundos y tiempo formateado.
    2. **Top N Clasificados:** Nómina exclusiva de colaboradores que obtuvieron el cupo para la siguiente instancia.
    3. **Podio Fase X:** Detalle de los 3 puestos de honor (Oro, Plata, Bronce).
  - Incluye columnas con anchos ajustados automáticamente y metadatos de auditoría (administrador que exportó y fecha de corte).
- **Gestión:** Incluye botón para copiar el enlace público de clasificación y botón para reiniciar/despublicar la clasificación.

### 2. Pantalla Pública de Clasificación (`/clasificacion` o `?view=clasificacion`)
- **Cupo Oficial Dictado por Google Sheets (`CLASIFICACION_TOP_COUNT`):** La tabla de clasificados del participante refleja con exactitud el cupo de corte configurado en la planilla (ej. Top 5, Top 10, Top 20, etc.). El backend serverless impone esta regla y los usuarios públicos no pueden adulterar el cupo mediante parámetros de URL.
- **Estado Previo (No publicada):** Si la administración aún no determinó los clasificados, muestra una pantalla amigable indicando que la evaluación está en curso y los resultados se publicarán pronto.
- **Estado Publicado:**
  - **Experiencia Desktop Intacta:** Despliega el **Podio de Honor 3D Gamer** en cuadrícula con pedestales volumétricos (1° Puesto Oro en el centro, 2° Plata y 3° Bronce a los costados) junto a la **Tabla General de Clasificados** con 12 columnas informativas completas.
  - **Experiencia Mobile Optimizada (100% Responsive):** En dispositivos móviles, el podio se transforma automáticamente en tarjetas horizontales ordenadas por mérito (1° Oro Campeón con corona animada, 2° Plata y 3° Bronce) con avatares, medallas, nombres sin truncamientos y métricas nítidas. La tabla de clasificados se adapta a una lista de items flex compactos y legibles, evitando desbordes horizontales o textos cortados.
- **Conformación de la Tabla según Flags de Supabase (`config`):**
  - `MOSTRAR_PARCIALES_EN_TABLA`: cuando es `true`, incluye en la tabla a quienes respondieron parcialmente pero no completaron todas las preguntas de la fase (con badge distintivo `Parcial (X/N)`). Cuando es `false`, los excluye de la tabla.
  - `MOSTRAR_NO_RESPONDIDOS_EN_TABLA`: cuando es `true`, incluye en la tabla a los colaboradores inscriptos del padrón que aún no participaron de la fase (con badge `Sin jugar` y valores `-`). Cuando es `false`, los excluye de la tabla.
  - Colaboradores que completaron el 100% de las preguntas de la fase siempre se incluyen y se ordenan por mérito oficial: 1° Puntaje (suma de respuestas correctas según el punto asignado a cada pregunta), 2° Menor tiempo total acumulado (desempate).

---

## 📬 Sistema Integral de Mailing y Notificaciones (100% Supabase)

El sistema cuenta con un motor de despacho de correos electrónicos transaccionales diseñado para entregar a cada colaborador su enlace de acceso único y personalizado con la plantilla oficial HTML de la **Semana de la Inocuidad 2026**:

1. **Persistencia y Control Centralizado en Supabase**:
   - Ya no utiliza Google Sheets. Los datos de colaboradores, emails y marcas de envío se leen y actualizan directamente en la base de datos PostgreSQL de Supabase (tablas `participants` y clave `EMAILS_ENVIADOS` en `config`).
2. **Panel de Despacho en Tiempo Real (Admin > Colaboradores > Botón Mailing)**:
   - **Métricas instantáneas**: Total de colaboradores, cantidad con email válido, enlaces con hash generados, correos enviados y pendientes.
   - **Previsualización / Envío de Prueba**: Permite ingresar cualquier casilla de correo y enviar una muestra fidedigna con datos reales para verificar cómo se renderiza la plantilla en Outlook Desktop, Outlook Web y Gmail.
   - **Envío a Pendientes**: Despacha invitaciones únicamente a quienes tienen `email_enviado === false` y cuentan con dirección de correo y hash.
   - **Reenvío a Todos**: Permite relanzar o recordar la trivia reenviando los enlaces a la totalidad de la nómina con email registrado.
   - **Sincronización Masiva de Marcas**: Botones para marcar a todos como enviados o pendientes en la base de datos sin disparar correos (ideal para auditoría o migraciones).
3. **Acciones Individuales por Fila**:
   - En la grilla de participantes, cada fila incluye un botón de acción rápida para enviar o reenviar el correo de participación directamente al colaborador seleccionado.
4. **Estados de Trivia Fidedignos en la Grilla**:
   - **Completado (15/15)**: Badge verde con check cuando el participante respondió todas las preguntas de la trivia.
   - **En Curso / Parcial (X/15)**: Badge ámbar con rayo cuando el participante inició la trivia pero aún tiene preguntas pendientes de responder.
   - **Sin jugar (0/15)**: Indicador tenue para colaboradores que aún no ingresaron a responder.
   - **Filtro Avanzado de Trivia**: Dropdown en la barra de herramientas para segmentar la nómina por *Todos*, *Completados*, *En Curso / Parcial* y *Sin jugar*.
5. **CLI Automatizado de Terminal (`scripts/enviarMailing.js`)**:
   - `npm run mailing:test` -> Envía correo de prueba a `TEST_EMAIL`.
   - `npm run mailing:send` -> Envía a colaboradores pendientes.
   - `npm run mailing:resend` -> Reenvía masivamente a toda la nómina.
   - `node scripts/enviarMailing.js --legajo <n>` -> Envía o reenvía a un legajo específico.

---

## 🛡️ Arquitectura de Seguridad & Backend Serverless (Netlify Functions)

Para garantizar la **máxima seguridad de datos y transparencia del concurso**:
1. **Credenciales y Secretos 100% Protegidos**: La `API Key`, credenciales de Supabase (`SUPABASE_SERVICE_ROLE_KEY`), credenciales de administrador (`ADMIN_USER`, `ADMIN_PASSWORD`) y configuración SMTP residen exclusivamente en el entorno seguro de **Netlify Functions** (`netlify/functions/`). NUNCA se exponen al navegador cliente ni viajan en peticiones de red del frontend.
2. **Sanitización de Respuestas Correctas**: El endpoint `/api/questions` devuelve al frontend las preguntas y opciones **sin incluir la columna de respuesta correcta ni pistas**.
3. **Evaluación de Respuestas en Servidor**: Al responder una pregunta, el frontend envía la selección a `POST /api/submit-answer`. La Serverless Function es la única que contrasta la opción elegida contra la respuesta correcta original, calcula el punto obtenido (1 punto por acierto) y persiste el resultado en la base de datos en tiempo real.
4. **Cálculo y Auditoría de Clasificados**: `/api/classification` calcula las posiciones oficiales aplicando la regla oficial de la trivia: 1° Mayor puntaje (suma de aciertos ponderados por pregunta), 2° Menor tiempo total acumulado en responder (desempate por velocidad), 3° Mayor cantidad de respuestas correctas, y 4° Fecha/hora de envío.

### 🌐 Endpoints Serverless Disponibles:
- `POST /api/admin-auth`: Autentica al Administrador de forma segura y emite tokens de sesión firmados (validez de 12 horas).
- `GET /api/classification?phase=1&topCount=30`: Obtiene el podio y los clasificados (modo público si está publicado, o preview con token de admin).
- `POST /api/classification`: Dispara la determinación de clasificados o el reinicio de publicación oficial (requiere token de admin).
- `GET /api/auth?token=...&phase=1`: Valida el hash/token del colaborador y obtiene su progreso sin exponer listas completas de nómina.
- `GET /api/questions?phase=1`: Devuelve las preguntas de la fase activa sanitizadas (entrega atómica 1 a 1 protegida con HMAC).
- `POST /api/submit-answer`: Evalúa en servidor el acierto/fallo de la respuesta, calcula el tiempo real y persiste en Supabase.
- `GET /api/participants`: Lista completa de nómina para el panel de administración con estadísticas de progreso y marcas de email.
- `POST /api/participants`: Endpoints CRUD para crear, actualizar, eliminar, regenerar hashes, marcar emails y resetear trivias.
- `GET /api/mailing?action=GET_STATUS`: Consulta métricas y estado del servicio de mailing.
- `POST /api/mailing`: Endpoint administrativo para envío individual, masivo, pruebas y marcado masivo en Supabase.

### 📥 Herramienta de Importación de Colaboradores (CSV a Google Sheets):
- **Panel Administrativo Visual:** En `/admin`, botón **"Importar CSV"** que abre un modal interactivo donde se puede:
  1. Subir el archivo `legajos.csv` o pegar su contenido en un área de texto.
  2. Detección automática de delimitador (`;` o `,`).
  3. Desduplicación estricta utilizando el número de **legajo** como clave primaria.
  4. Mapeo de campos:
     - `legajo` <- `Leg`
     - `apellido` <- texto antes de la coma de `Apellido y Nombre` (con trim).
     - `nombre` <- texto después de la coma de `Apellido y Nombre` (con trim).
     - `token_hash` <- hash único determinista SHA-256 (`SHA256(SEED_PHRASE_legajo_APELLIDO_NOMBRE)`).
     - `documento` <- `Nro. de Documento`.
     - `sector` <- `Sector`.
     - `telefono` <- `Telefono`.
     - `email` <- `E-mail`.
  5. Vista previa inmediata con los primeros registros mapeados y contadores de validados/duplicados.
  6. Descarga directa del CSV procesado (`usuarios_participantes.csv`) para importación manual instantánea en Google Sheets o sincronización remota mediante Apps Script.
- **Script Local Automatizado:** Se puede ejecutar directamente `node scripts/importarLegajos.js` en consola para parsear el archivo `data/legajos.csv`, generar los 475 hashes únicos deterministas y actualizar la copia local sincronizada en `public/data/usuarios_participantes.csv`.

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

    // 3. Acción: Actualizar configuraciones en la pestaña 'Configuracion'
    if (data.action === "UPDATE_CONFIG" && data.updates) {
      updateConfigKeys(ss, data.updates);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Configuración actualizada" }))
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
 * Actualiza o inserta claves en la pestaña 'Configuracion'
 */
function updateConfigKeys(ss, updates) {
  var sheetConfig = ss.getSheetByName("Configuracion");
  if (!sheetConfig) {
    sheetConfig = ss.insertSheet("Configuracion");
    sheetConfig.appendRow(["clave", "valor", "descripcion"]);
    sheetConfig.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#0d2c5c").setFontColor("#ffffff");
  }

  var data = sheetConfig.getDataRange().getValues();
  if (!data || data.length === 0) {
    for (var k in updates) {
      sheetConfig.appendRow([k, updates[k], "Parámetro configurado desde Admin"]);
    }
    return;
  }

  // Detectar si la primera fila es encabezado o dato real
  var firstCell = String(data[0][0] || '').toLowerCase().trim();
  var isHeader = (firstCell === "clave" || firstCell === "key" || firstCell === "parametro");
  var startRow = isHeader ? 1 : 0;

  var keyColIndex = 0; // Columna A por defecto
  var valColIndex = 1; // Columna B por defecto

  if (isHeader) {
    for (var c = 0; c < data[0].length; c++) {
      var h = String(data[0][c]).toLowerCase().trim();
      if (h === "clave" || h === "key" || h === "parametro") keyColIndex = c;
      if (h === "valor" || h === "value") valColIndex = c;
    }
  }

  // Mapear filas existentes por clave (1-based para getRange)
  var existingKeys = {};
  for (var r = startRow; r < data.length; r++) {
    var rowKey = String(data[r][keyColIndex]).trim().toUpperCase();
    if (rowKey) {
      existingKeys[rowKey] = r + 1; // Fila 1-based
    }
  }

  for (var keyToUpdate in updates) {
    var normalizedKey = String(keyToUpdate).trim().toUpperCase();
    var valToSet = String(updates[keyToUpdate]);

    if (existingKeys[normalizedKey]) {
      var targetRow = existingKeys[normalizedKey];
      sheetConfig.getRange(targetRow, valColIndex + 1).setValue(valToSet);
    } else {
      var newRow = [];
      newRow[keyColIndex] = normalizedKey;
      newRow[valColIndex] = valToSet;
      newRow[2] = "Parámetro configurado desde Admin";
      sheetConfig.appendRow(newRow);
      existingKeys[normalizedKey] = sheetConfig.getLastRow();
    }
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

  // 3. Crear pestaña "Configuracion" con columna obligatoria de "Descripcion"
  crearPestanaConfiguracion(ss);

  SpreadsheetApp.flush();
  Logger.log("✅ ¡Pestañas Preguntas, Participantes y Configuracion preparadas exitosamente!");
}

/**
 * Crea o inicializa la pestaña "Configuracion" con las claves del sistema y sus descripciones
 */
function crearPestanaConfiguracion(ss) {
  var sheet = ss.getSheetByName("Configuracion");
  if (!sheet) {
    sheet = ss.insertSheet("Configuracion");
  } else {
    sheet.clear();
  }

  // Encabezados con columna de Descripción obligatoria
  sheet.appendRow(["Clave", "Valor", "Descripcion"]);
  sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#0d2c5c").setFontColor("#ffffff");

  var configRows = [
    ["FASE_ACTIVA", "1", "Fase del juego habilitada para participar (1, 2 o 3)"],
    ["FASE_CERRADA", "false", "Indica si la fase actual cerró (true: bloquea nuevas respuestas)"],
    ["CLASIFICACION_PUBLICADA", "false", "Indica si el podio oficial está visible públicamente (true/false)"],
    ["CLASIFICACION_TOP_COUNT", "30", "Cantidad de participantes que clasifican a la tabla de honor"],
    ["MOSTRAR_PARCIALES_EN_TABLA", "false", "Muestra en la tabla a quienes respondieron parcialmente sin terminar"],
    ["MOSTRAR_NO_RESPONDIDOS_EN_TABLA", "false", "Muestra en la tabla a colaboradores inscriptos que aún no jugaron"],
    ["FECHA_PUBLICACION_CLASIFICACION", "", "Fecha y hora ISO registrada al determinar y publicar la clasificación"],
    ["TIEMPO_POR_PREGUNTA", "45", "Segundos disponibles para responder cada pregunta"],
    ["MEZCLAR_PREGUNTAS", "false", "Orden aleatorio (true) o secuencial según planilla (false)"],
    ["OCULTAR_RESUMEN_RESPONDIDAS", "true", "Oculta la métrica de 'Respondidas' en la pantalla final"],
    ["OCULTAR_RESUMEN_TIEMPO", "false", "Oculta la métrica de 'Tiempo Total' en la pantalla final"]
  ];

  configRows.forEach(function(r) {
    sheet.appendRow(r);
  });
}

/**
 * Actualiza claves de configuración en la pestaña 'Configuracion'
 */
function updateConfigKeys(ss, updates) {
  var sheet = ss.getSheetByName("Configuracion");
  if (!sheet) {
    crearPestanaConfiguracion(ss);
    sheet = ss.getSheetByName("Configuracion");
  }

  var data = sheet.getDataRange().getValues();
  var keys = Object.keys(updates);

  keys.forEach(function(key) {
    var val = updates[key];
    var found = false;
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim().toUpperCase() === key.toUpperCase()) {
        sheet.getRange(r + 1, 2).setValue(val);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, val, "Configuración dinámica del sistema"]);
    }
  });
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

  if (data.configuracion) {
    updateConfigKeys(ss, data.configuracion);
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

### 1. Pestaña de Configuración Centralizada (`Configuracion`)
Esta pestaña es el **cerebro operacional dinámico** de la trivia. Permite alterar el estado de la competición en caliente desde la planilla o desde el panel de administración sin tocar variables de entorno ni redeployar la aplicación.

| Columna | Nombre | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| **A** | `Clave` | Texto | Identificador único de la directiva o configuración |
| **B** | `Valor` | Texto / Booleano / Número | Valor vigente de la directiva |
| **C** | `Descripcion` | Texto | Explicación humana de la función e impacto de la variable |

#### Claves soportadas en la hoja `Configuracion`:
| Clave | Valor Inicial / Ejemplo | Descripción Obligatoria (Columna C) |
| :--- | :--- | :--- |
| `FASE_ACTIVA` | `1` | Fase del juego habilitada para participar (1, 2 o 3). |
| `FASE_CERRADA` | `false` | Indica si la fase actual cerró (true: bloquea nuevas respuestas y muestra pantalla de fin de fase). |
| `CLASIFICACION_PUBLICADA` | `false` | Indica si el podio oficial y ranking están visibles para todos los colaboradores (true/false). |
| `CLASIFICACION_TOP_COUNT` | `30` | Cantidad de colaboradores que clasifican a la tabla de honor y podio. |
| `MOSTRAR_PARCIALES_EN_TABLA` | `false` | Muestra en la tabla a quienes respondieron parcialmente pero no terminaron todas las preguntas. |
| `MOSTRAR_NO_RESPONDIDOS_EN_TABLA`| `false` | Muestra en la tabla a los colaboradores inscriptos que aún no participaron de la fase. |
| `FECHA_PUBLICACION_CLASIFICACION` | *vacío* | Marca de tiempo ISO registrada por el backend al oficializar la clasificación. |
| `TIEMPO_POR_PREGUNTA` | `45` | Segundos disponibles para responder cada pregunta individual. |
| `MEZCLAR_PREGUNTAS` | `false` | Presenta las preguntas en orden aleatorio (true) o secuencial según planilla (false). |
| `OCULTAR_RESUMEN_RESPONDIDAS` | `true` | Oculta la tarjeta de "Preguntas Respondidas" en la pantalla de resumen final. |
| `OCULTAR_RESUMEN_TIEMPO` | `false` | Oculta la tarjeta de "Tiempo Total" en la pantalla de resumen final. |

> 🛡️ **Garantía de Seguridad Backend-First**:
> Todas las peticiones al juego (`/api/config`, `/api/auth`, `/api/questions`, `/api/submit-answer`, `/api/classification`) leen directamente estas configuraciones en las Netlify Functions. Si un participante modifica el HTML, `localStorage` o cookies para enviar una fase distinta o enviar respuestas con la fase cerrada, el servidor rechaza automáticamente la acción con error `403 Forbidden`.

---

### 2. Pestaña de Preguntas (`Preguntas`)
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

---

### 3. Pestaña de Participantes (`Participantes`)
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

---

## 📧 Bot de Mailing Masivo por Terminal (Newsletter & Notificaciones)

El proyecto incluye un bot de envío masivo de emails desarrollado en Node.js (`scripts/enviarMailing.js`), diseñado para ejecutarse localmente por terminal con soporte para campañas dinámicas, comodines de personalización, validación estricta de columnas en Google Sheets y registro automático de marcas temporales.

### 🎨 1. Plantilla y Estética (`mailing/mailing.html` y `mailing/`)

La plantilla de mailing (`mailing/mailing.html` y en la raíz `mailing.html`) respeta fielmente la identidad visual de la Trivia de Don Yeyo S.A.:
- **Fondo de Rayos (Sunburst):** Fondo estático con los azules corporativos (`#091a36` a `#0d2c5c`) y rayos sutiles.
- **Logo Don Yeyo:** Logo oficial optimizado e incrustado con **CID Inline** para máxima compatibilidad con Microsoft Outlook, Gmail, Apple Mail y clientes móviles.
- **Directorio de imágenes aislado:** Todos los assets del mailing están agrupados bajo el directorio **`mailing/`**:
  - `mailing/fondo-rayos-16-9.png`: Fondo de rayos apaisado 16:9 en alta resolución (1920x1080 px).
  - `mailing/fondo-rayos-9-16.png`: Fondo de rayos vertical 9:16 en alta resolución para mobile y stories (1080x1920 px).
  - `mailing/fondo-rayos-1-1.png`: Fondo de rayos cuadrado 1:1 en alta resolución (1200x1200 px).
  - `mailing/fondo-rayos.png`: Cabecera optimizada para correos de mailing (1200x500 px).
  - `mailing/logo.png`: Logo oficial de Don Yeyo en formato PNG para clientes de email.
  - `mailing/logo.svg`: Vector original del logo.
  - `mailing/mailing.html`: Plantilla HTML responsive con tablas y estilos inline.

### 🧩 2. Comodines Soportados en la Plantilla

#### Comodines de Participante (desde la pestaña `Participantes` de Google Sheets):
| Comodín | Origen de Dato | Ejemplo de Reemplazo |
| :--- | :--- | :--- |
| `{{nombre}}` | Columna `nombre` | Juan Carlos |
| `{{apellido}}` | Columna `apellido` | Pérez |
| `{{nombre_completo}}` | Nombre y apellido combinados | Juan Carlos Pérez |
| `{{legajo}}` | Columna `legajo` | 1042 |
| `{{sector}}` | Columna `sector` | GCIA.OPER-EXPEDICION |
| `{{email}}` | Columna `email` / `correo` | juan.perez@donyeyo.com.ar |
| `{{documento}}` | Columna `documento` | 32456789 |
| `{{link_trivia}}` / `{{trivia_url}}` | **Enlace único con token criptográfico** | `https://dy-inocuidad.netlify.app/?token=64fb9ced...` |

> 💡 **Nota sobre `{{link_trivia}}`:** El bot calcula o toma el hash SHA-256 de cada colaborador usando la frase clave `SEED_PHRASE` y su legajo/apellido/nombre, generando un enlace de acceso directo de 1 clic sin necesidad de que el colaborador escriba su usuario.

#### Comodines de Campaña y Entorno (desde `.env_mailn`):
| Comodín | Variable en `.env_mailn` | Descripción |
| :--- | :--- | :--- |
| `%TITULO_EMAIL%` | `TITULO_EMAIL` | Título del correo en el encabezado. |
| `%SUBTITULO%` | `SUBTITULO` | Subtítulo descriptivo de la campaña. |
| `%MENSAJE_PRINCIPAL%` | `MENSAJE_PRINCIPAL` | Cuerpo principal del mensaje (soporta HTML o texto). |
| `%MENSAJE_SECUNDARIO%` | `MENSAJE_SECUNDARIO` | Consejos, tips o recordatorios destacados en cuadro celeste. |
| `%CALL_TO_ACTION_TEXTO%` | `CALL_TO_ACTION_TEXTO` | Texto del botón principal (ej: "INGRESAR A LA TRIVIA AHORA"). |
| `%NEWSLETER_ACTUAL%` | `NEWSLETER_ACTUAL` | Nombre de la columna de campaña en Google Sheets. |
| `%EMPRESA_NOMBRE%` | `EMPRESA_NOMBRE` | Nombre del departamento o empresa en el footer. |
| `%CONTACTO_SOPORTE%` | `CONTACTO_SOPORTE` | Datos de contacto para consultas de colaboradores. |
| `%ANIO_ACTUAL%` | `ANIO_ACTUAL` | Año en curso (ej: 2026). |

*(Cualquier variable adicional declarada en `.env_mailn` puede usarse con la sintaxis `%MI_VARIABLE%`).*

---

### ⚙️ 3. Configuración en `.env_mailn`

Copiar el archivo de plantilla `.env_mailn.template` a `.env_mailn` y completar con las credenciales correspondientes:

```bash
cp .env_mailn.template .env_mailn
```

Variables clave en `.env_mailn`:
- `NEWSLETER_ACTUAL`: Nombre exacto de la columna en Google Sheets (ej: `"Email Link de Trivia"`).
- `SMTP_HOST`: Host del servidor SMTP (ej: `smtp.gmail.com` o `smtp.office365.com`).
- `SMTP_PORT`: Puerto (`587` para STARTTLS o `465` para SSL).
- `SMTP_USER` y `SMTP_PASS`: Usuario y contraseña (para Gmail se recomienda *Contraseña de Aplicación*).
- `SMTP_FROM`: Remitente visible (ej: `"\"Trivia Don Yeyo\" <calidad@donyeyo.com.ar>"`).
- `TEST_EMAIL`: Correo electrónico personal para envíos de prueba antes de la salida masiva.
- `SMTP_DELAY_MS`: Pausa en milisegundos entre envíos (por defecto `1200` ms para evitar bloqueos por spam).

---

### 🛡️ 4. Flujo de Control y Validación Estricta de Columnas

1. **El Administrador crea la columna en Google Sheets**:
   - En la pestaña `Participantes`, el administrador agrega una nueva columna con el título deseado, por ejemplo: `Email Link de Trivia` (o `Recordatorio Fase 1`, etc.).
   - Configura en `.env_mailn`: `NEWSLETER_ACTUAL="Email Link de Trivia"`.
2. **Validación automática**:
   - Al ejecutar el script, el bot consulta la hoja de cálculo.
   - **Si la columna NO existe:** El bot arroja un **ERROR FATAL**, lista las columnas disponibles y **se detiene inmediatamente sin enviar ningún correo**.
3. **Filtro inteligente de envíos**:
   - Revisa fila por fila la celda correspondiente a esa columna.
   - Si la celda **ya tiene una marca temporal**, el participante es **omitido** (ya fue notificado).
   - Solo se envía a las casillas cuya celda esté **vacía**.
4. **Inserción de Marca Temporal**:
   - Tras enviar con éxito cada correo vía SMTP, el bot llama al Webhook de Google Apps Script (`action: "MARCAR_NEWSLETTER"`).
   - Inserta la fecha y hora exacta (ej: `13/10/2026 09:30:15`) en la celda del participante.
   - Si la conexión se interrumpe a mitad de camino, los correos ya procesados quedan marcados y al relanzar el script continuará únicamente con los pendientes.

---

### 🚀 5. Comandos de Ejecución

#### A. Modo de Prueba (Recomendado antes de envíos masivos)
Envía un único correo a tu casilla personal simulando los datos de un participante real. **NO modifica Google Sheets**.

```bash
# Envía a la casilla TEST_EMAIL configurada en .env_mailn
npm run mailing:test

# O envía a una casilla específica por argumento:
node scripts/enviarMailing.js --test tu_correo@donyeyo.com.ar
```

#### B. Simulación sin envíos (Dry Run)
Permite inspeccionar la conexión, los encabezados y cuántos correos se enviarían sin hacer envíos SMTP ni alterar la planilla:

```bash
node scripts/enviarMailing.js --dry-run
```

#### C. Envío Masivo Real
Ejecuta el envío a todos los colaboradores que tengan la celda vacía en la columna `%NEWSLETER_ACTUAL%`:

```bash
npm run mailing:send
```

Opciones adicionales de terminal:
```bash
# Sobreescribir la columna de campaña en la ejecución actual:
node scripts/enviarMailing.js --send --columna "Recordatorio Fase 2"

# Limitar la tanda a un máximo de correos (ej: primeros 25):
node scripts/enviarMailing.js --send --limit 25
```

---

### 🔄 6. Actualización de Google Apps Script (`Código.gs`)

Para que la planilla de Google Sheets registre las marcas temporales en tiempo real, asegúrese de tener la última versión de `google-apps-script.js`:
1. Abrir la planilla en Google Sheets: **Extensiones > Apps Script**.
2. Pegar el código actualizado de `google-apps-script.js`.
3. Guardar cambios.
4. Hacer clic en el botón superior azul: **Implementar > Administrar implementaciones**.
5. Clic en el icono del lápiz (**Editar**), seleccionar **"Nueva versión"** y presionar **Implementar**.

---

## 🌐 Publicación en Netlify

1. Conectar el repositorio Git a Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. En **Site Settings > Environment Variables**, cargar las variables de conexión de `.env` (`GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_API_KEY`, `GOOGLE_APPS_SCRIPT_ENDPOINT`, `ADMIN_USER`, `ADMIN_PASSWORD`, `SEED_PHRASE`).
5. **Cero Redeploys Operativos:** Al cambiar de fase en la empresa o cerrar la jornada, **no hace falta redeployar**: solo basta con cambiar el valor de `FASE_ACTIVA` o `FASE_CERRADA` en la hoja `Configuracion` de Google Sheets. El backend lo aplicará inmediatamente a todos los dispositivos.

---
**Don Yeyo S.A. &copy; 2026** - Dirección de Calidad e Inocuidad Alimentaria.

