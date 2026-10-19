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
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  apellido VARCHAR(100) NOT NULL DEFAULT '',
  nombre VARCHAR(100) NOT NULL DEFAULT '',
  documento VARCHAR(50) DEFAULT '',
  sector VARCHAR(100) DEFAULT '',
  telefono VARCHAR(50) DEFAULT '',
  email VARCHAR(150) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices B-Tree para validación y búsqueda de token en < 5ms
CREATE INDEX IF NOT EXISTS idx_participants_hash ON public.participants (token_hash);
CREATE INDEX IF NOT EXISTS idx_participants_legajo ON public.participants (legajo);

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

-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service Role full access config" ON public.config
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');

CREATE POLICY "Service Role full access participants" ON public.participants
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');

CREATE POLICY "Service Role full access questions" ON public.questions
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');

CREATE POLICY "Service Role full access responses" ON public.responses
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');
