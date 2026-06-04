-- =============================================
-- HANGMAN GAME - DATABASE SCHEMA
-- Ejecuta esto en tu base de datos PostgreSQL
-- =============================================

-- Tabla de salas de juego
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting', -- waiting | playing | finished
  current_word VARCHAR(20),
  current_player INTEGER DEFAULT 1,    -- 1 o 2
  player1_name VARCHAR(50),
  player2_name VARCHAR(50),
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  guessed_letters TEXT[] DEFAULT '{}',
  wrong_attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 6,
  winner INTEGER DEFAULT NULL,         -- 1, 2, o NULL si empate
  rounds_played INTEGER DEFAULT 0,
  max_rounds INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de palabras usadas en cada sala
CREATE TABLE IF NOT EXISTS used_words (
  id SERIAL PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  word VARCHAR(20) NOT NULL,
  round_number INTEGER,
  won_by INTEGER,   -- 1, 2, o NULL
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_used_words_room ON used_words(room_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
