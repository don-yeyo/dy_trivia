-- ==============================================================================
-- TRIVIA INOCUIDAD 2026 (DON YEYO S.A.)
-- ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL) PARA ALTA CONCURRENCIA
-- ==============================================================================
-- Optimizado para capa gratuita: Acceso exclusivo REST vía PostgREST,
-- cero WebSockets y máxima velocidad con índices B-Tree dedicados.
-- ==============================================================================

-- 1. TABLA: CONFIGURACIÓN DINÁMICA
CREATE TABLE IF NOT EXISTS public.config (
  clave VARCHAR(80) PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABLA: PARTICIPANTES
CREATE TABLE IF NOT EXISTS public.participants (
  id BIGSERIAL PRIMARY KEY,
  legajo VARCHAR(50) NOT NULL UNIQUE,
  token_hash VARCHAR(64) UNIQUE,
  apellido VARCHAR(100) NOT NULL DEFAULT '',
  nombre VARCHAR(100) NOT NULL DEFAULT '',
  documento VARCHAR(50) DEFAULT '',
  sector VARCHAR(100) DEFAULT '',
  grupo VARCHAR(100) DEFAULT '',
  telefono VARCHAR(50) DEFAULT '',
  email VARCHAR(150) DEFAULT '',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Migraciones idempotentes para tablas existentes
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS grupo VARCHAR(100) DEFAULT '';
ALTER TABLE public.participants ALTER COLUMN token_hash DROP NOT NULL;

-- Índices B-Tree para validación y búsqueda de token en < 5ms
CREATE INDEX IF NOT EXISTS idx_participants_hash ON public.participants (token_hash);
CREATE INDEX IF NOT EXISTS idx_participants_legajo ON public.participants (legajo);
CREATE INDEX IF NOT EXISTS idx_participants_activo ON public.participants (activo);
CREATE INDEX IF NOT EXISTS idx_participants_grupo ON public.participants (grupo);

-- TABLA: GRUPOS DE PARTICIPANTES (OPCIONAL/CATÁLOGO)
CREATE TABLE IF NOT EXISTS public.groups (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT DEFAULT '',
  color VARCHAR(30) DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABLA: PREGUNTAS
CREATE TABLE IF NOT EXISTS public.questions (
  id INT NOT NULL,
  fase INT NOT NULL DEFAULT 1,
  pregunta TEXT NOT NULL,
  opciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  respuesta_correcta INT NOT NULL,
  puntos INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (fase, id)
);

CREATE INDEX IF NOT EXISTS idx_questions_fase ON public.questions (fase);

-- 4. TABLA: RESPUESTAS (INSERCIONES ATÓMICAS POR FILA INDEPENDIENTE)
CREATE TABLE IF NOT EXISTS public.responses (
  id BIGSERIAL PRIMARY KEY,
  legajo VARCHAR(50) NOT NULL,
  fase INT NOT NULL DEFAULT 1,
  pregunta_id INT NOT NULL,
  respuesta_seleccionada INT,
  es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
  puntos_obtenidos INT NOT NULL DEFAULT 0,
  tiempo_tardado INT NOT NULL DEFAULT 0,
  fecha_hora_respuesta TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- Restricción para garantizar inserción atómica e idempotente (anti-race condition)
  CONSTRAINT uq_responses_legajo_fase_pregunta UNIQUE (legajo, fase, pregunta_id)
);

-- Índices compuestos para ranking y cálculos masivos sin bloqueo
CREATE INDEX IF NOT EXISTS idx_responses_fase_legajo ON public.responses (fase, legajo);

-- 5. VALORES PREDETERMINADOS DE CONFIGURACIÓN
INSERT INTO public.config (clave, valor, descripcion) VALUES
  ('FASE_ACTIVA', '1', 'Fase actualmente abierta al público (1, 2 o 3)'),
  ('FASE_CERRADA', 'FALSE', 'Indica si la fase activa se encuentra cerrada'),
  ('CLASIFICACION_PUBLICADA', 'FALSE', 'Indica si el podio y clasificación son públicos'),
  ('CLASIFICACION_TOP_COUNT', '30', 'Cantidad de participantes clasificados'),
  ('MOSTRAR_PARCIALES_EN_TABLA', 'TRUE', 'Muestra participantes parciales en tabla'),
  ('MOSTRAR_NO_RESPONDIDOS_EN_TABLA', 'FALSE', 'Muestra inscriptos sin jugar en tabla'),
  ('FECHA_PUBLICACION_CLASIFICACION', '', 'Fecha y hora ISO de publicación oficial'),
  ('TIEMPO_POR_PREGUNTA', '45', 'Segundos asignados por cada pregunta'),
  ('MEZCLAR_PREGUNTAS', 'FALSE', 'Aleatoriza el orden de las preguntas'),
  ('OCULTAR_RESUMEN_RESPONDIDAS', 'TRUE', 'Oculta respondidas en resumen'),
  ('OCULTAR_RESUMEN_TIEMPO', 'FALSE', 'Oculta tiempo en resumen')
ON CONFLICT (clave) DO NOTHING;

-- 6. TABLA: PARÁMETROS DINÁMICOS DE MAILING (INVITACIÓN Y RESULTADOS)
CREATE TABLE IF NOT EXISTS public.mailing_parametros (
  id BIGSERIAL PRIMARY KEY,
  email_tipo VARCHAR(50) NOT NULL, -- 'INVITACION' | 'RESULTADOS'
  nombre_parametro VARCHAR(100) NOT NULL,
  valor TEXT NOT NULL DEFAULT '',
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_mailing_tipo_parametro UNIQUE (email_tipo, nombre_parametro)
);

CREATE INDEX IF NOT EXISTS idx_mailing_tipo ON public.mailing_parametros (email_tipo);

-- Poblado de parámetros iniciales de Invitación y Resultados
INSERT INTO public.mailing_parametros (email_tipo, nombre_parametro, valor, descripcion) VALUES
  -- Invitación
  ('INVITACION', 'TITULO_EMAIL', '¡ACÁ EMPIEZA EL DESAFÍO DE INOCUIDAD!', 'Título principal del encabezado'),
  ('INVITACION', 'SUBTITULO', 'Llegó el momento de demostrar todo lo que sabés. Cada respuesta correcta suma puntos, pero recordá que el tiempo también es un factor clave y puede marcar la diferencia al momento de clasificar.', 'Bajada o subtítulo del correo'),
  ('INVITACION', 'MENSAJE_PRINCIPAL', '<p>🏆 <strong>Completá la trivia, acumulá puntos y asegurá tu lugar en la Fase 2.</strong></p><p>⏱️ <strong>No lo olvides:</strong> el reloj comienza a correr desde el momento en que iniciás la trivia. Cuanto más rápido y preciso seas en tus respuestas, mayores serán tus posibilidades de avanzar.</p><p>¿Aceptás el desafío?</p><p>👉 Ingresá al siguiente enlace y poné a prueba tus conocimientos.</p><p><strong>¡MUCHA SUERTE!</strong></p>', 'Cuerpo HTML principal'),
  ('INVITACION', 'MENSAJE_SECUNDARIO', '⚠️ <strong>Muy importante:</strong> si abandonás la trivia y volvés a ingresar, continuarás desde la siguiente pregunta disponible y no podrás regresar a las anteriores para responderlas.', 'Alerta o aclaración secundaria en recuadro'),
  ('INVITACION', 'CALL_TO_ACTION_TEXTO', 'INGRESAR A LA TRIVIA AHORA', 'Texto del botón principal'),
  ('INVITACION', 'EMPRESA_NOMBRE', 'Don Yeyo S.A. • Departamento de Calidad e Inocuidad', 'Firma institucional en el pie'),
  ('INVITACION', 'CONTACTO_SOPORTE', 'Para consultas o inconvenientes de acceso, comunicate con el área de RR.HH. o Calidad.', 'Texto de soporte o contacto'),
  ('INVITACION', 'ANIO_ACTUAL', '2026', 'Año vigente para el pie'),
  ('INVITACION', 'URL_LOGO', 'https://dy-inocuidad.netlify.app/logo-donyeyo.svg', 'URL absoluta al logotipo oficial'),
  ('INVITACION', 'URL_FONDO', 'https://dy-inocuidad.netlify.app/mailing/fondo-rayos.png', 'URL absoluta al fondo de rayos'),

  -- Resultados
  ('RESULTADOS', 'TITULO_EMAIL', '¡RESULTADOS DEL DESAFÍO DE INOCUIDAD 2026!', 'Título principal para la devolución'),
  ('RESULTADOS', 'SUBTITULO', 'La etapa ha finalizado. Mirá cómo te fue, revisá tus respuestas y conocé el podio oficial.', 'Bajada o subtítulo de resultados'),
  ('RESULTADOS', 'MENSAJE_PRINCIPAL', '<p>🎉 <strong>¡Muchas gracias por haber participado con tu compromiso diario hacia la inocuidad alimentaria!</strong></p><p>Cada respuesta representa tu conocimiento en las Buenas Prácticas de Manufactura (BPM) y los estándares de calidad que hacen grande a Don Yeyo.</p><p>🏆 <strong>Ya podés consultar la tabla general de clasificación y el Podio oficial de ganadores.</strong></p>', 'Cuerpo HTML principal'),
  ('RESULTADOS', 'MENSAJE_PRINCIPAL_ALTERNATIVO', '<p>Aunque no hayas tenido la oportunidad de completar esta fase de la trivia, <strong>tu compromiso diario con la calidad y la inocuidad alimentaria sigue siendo fundamental para Don Yeyo</strong>.</p><p>💡 Te compartimos a continuación el cuestionario con todas las preguntas correctas y sus fundamentos técnicos para que puedas capacitarte y repasar las Buenas Prácticas de Manufactura (BPM).</p><p>🏆 <strong>¡También podés consultar el Podio oficial de ganadores y la tabla de posiciones!</strong></p>', 'Mensaje para participantes que no jugaron la fase'),
  ('RESULTADOS', 'MENSAJE_SECUNDARIO', 'ℹ️ <strong>Importante:</strong> Los clasificados a las instancias finales serán contactados por el Departamento de Calidad y Recursos Humanos.', 'Alerta o aclaración secundaria'),
  ('RESULTADOS', 'CALL_TO_ACTION_TEXTO', 'VER PODIO Y CLASIFICADOS', 'Texto del botón principal al podio'),
  ('RESULTADOS', 'EMPRESA_NOMBRE', 'Don Yeyo S.A. • Departamento de Calidad e Inocuidad', 'Firma institucional en el pie'),
  ('RESULTADOS', 'CONTACTO_SOPORTE', 'Por dudas sobre tu puntaje o clasificación, comunicate con el área de Calidad.', 'Texto de soporte o contacto'),
  ('RESULTADOS', 'ANIO_ACTUAL', '2026', 'Año vigente para el pie'),
  ('RESULTADOS', 'URL_LOGO', 'https://dy-inocuidad.netlify.app/logo-donyeyo.svg', 'URL absoluta al logotipo oficial'),
  ('RESULTADOS', 'URL_FONDO', 'https://dy-inocuidad.netlify.app/mailing/fondo-rayos.png', 'URL absoluta al fondo de rayos')
ON CONFLICT (email_tipo, nombre_parametro) DO NOTHING;

-- 7. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailing_parametros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service Role full access config" ON public.config
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');

CREATE POLICY "Service Role full access participants" ON public.participants
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');

CREATE POLICY "Service Role full access questions" ON public.questions
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');

CREATE POLICY "Service Role full access responses" ON public.responses
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');

CREATE POLICY "Service Role full access mailing_parametros" ON public.mailing_parametros
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');

