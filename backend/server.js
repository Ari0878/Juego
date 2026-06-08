// server.js - Hangman Multiplayer Backend
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const { getRandomWord } = require("./words");

// ─── DB ──────────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ─── APP ─────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getRoomByCode(code) {
  const res = await pool.query("SELECT * FROM rooms WHERE code = $1", [
    code.toUpperCase(),
  ]);
  return res.rows[0] || null;
}

async function getUsedWords(roomId) {
  const res = await pool.query(
    "SELECT word FROM used_words WHERE room_id = $1",
    [roomId]
  );
  return res.rows.map((r) => r.word);
}

function maskWord(word, guessedLetters) {
  return word
    .split("")
    .map((l) => (guessedLetters.includes(l) ? l : "_"))
    .join("");
}

function checkWin(word, guessedLetters) {
  return word.split("").every((l) => guessedLetters.includes(l));
}

// Serializa el estado para enviar al cliente
function serializeRoom(room) {
  const masked = room.current_word
    ? maskWord(room.current_word, room.guessed_letters)
    : null;
  return {
    code: room.code,
    status: room.status,
    currentPlayer: room.current_player,
    player1Name: room.player1_name,
    player2Name: room.player2_name,
    player1Score: room.player1_score,
    player2Score: room.player2_score,
    maskedWord: masked,
    wordLength: room.current_word ? room.current_word.length : 0,
    guessedLetters: room.guessed_letters,
    wrongAttempts: room.wrong_attempts,
    maxAttempts: room.max_attempts,
    winner: room.winner,
    roundsPlayed: room.rounds_played,
    maxRounds: room.max_rounds,
  };
}

// ─── REST ROUTES ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ ok: true }));

// Crear sala
app.post("/rooms", async (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return res.status(400).json({ error: "playerName requerido" });

  let code;
  let attempts = 0;
  do {
    code = generateRoomCode();
    attempts++;
    if (attempts > 20) return res.status(500).json({ error: "No se pudo generar código único" });
    const existing = await pool.query("SELECT id FROM rooms WHERE code = $1", [code]);
    if (existing.rows.length === 0) break;
  } while (true);

  const result = await pool.query(
    `INSERT INTO rooms (code, player1_name, status)
     VALUES ($1, $2, 'waiting')
     RETURNING *`,
    [code, playerName]
  );
  const room = result.rows[0];
  res.json({ roomId: room.id, code: room.code });
});

// Unirse a sala
app.post("/rooms/:code/join", async (req, res) => {
  const { playerName } = req.body;
  const code = req.params.code.toUpperCase();
  if (!playerName) return res.status(400).json({ error: "playerName requerido" });

  const room = await getRoomByCode(code);
  if (!room) return res.status(404).json({ error: "Sala no encontrada" });
  if (room.player2_name) return res.status(400).json({ error: "Sala llena" });
  if (room.status !== "waiting") return res.status(400).json({ error: "Juego ya iniciado" });

  const result = await pool.query(
    `UPDATE rooms SET player2_name = $1 WHERE code = $2 RETURNING *`,
    [playerName, code]
  );
  const updated = result.rows[0];
  res.json({ roomId: updated.id, code: updated.code });
});

// ─── SOCKET.IO ───────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Socket conectado: ${socket.id}`);

  // Unirse a sala por socket
  socket.on("join_room", async ({ code, playerName }) => {
    const roomCode = code.toUpperCase();
    const room = await getRoomByCode(roomCode);
    if (!room) {
      socket.emit("error", { message: "Sala no encontrada" });
      return;
    }
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerName = playerName;

    // Detectar qué jugador es
    if (room.player1_name === playerName) {
      socket.data.playerNumber = 1;
    } else if (room.player2_name === playerName) {
      socket.data.playerNumber = 2;
    }

    socket.emit("room_state", serializeRoom(room));
    console.log(`${playerName} se unió a sala ${roomCode}`);

    // Si los dos están conectados y hay jugador 2, iniciar
    if (room.player2_name && room.status === "waiting") {
      await startRound(roomCode);
    }
  });

  // Adivinar letra
  socket.on("guess_letter", async ({ code, letter, playerNumber }) => {
    const roomCode = code.toUpperCase();
    const room = await getRoomByCode(roomCode);

    if (!room || room.status !== "playing") {
      socket.emit("error", { message: "Juego no activo" });
      return;
    }
    if (room.current_player !== playerNumber) {
      socket.emit("error", { message: "No es tu turno" });
      return;
    }

    const L = letter.toUpperCase();
    if (room.guessed_letters.includes(L)) {
      socket.emit("error", { message: "Letra ya usada" });
      return;
    }

    const newGuessed = [...room.guessed_letters, L];
    const isCorrect = room.current_word.includes(L);
    let newWrongAttempts = room.wrong_attempts;
    if (!isCorrect) newWrongAttempts++;

    const won = checkWin(room.current_word, newGuessed);
    const lost = newWrongAttempts >= room.max_attempts;

    let updates = {
      guessed_letters: newGuessed,
      wrong_attempts: newWrongAttempts,
    };

    if (won || lost) {
      // Fin de ronda
      const roundWinner = won ? playerNumber : (playerNumber === 1 ? 2 : 1);
      
      await pool.query(
        "INSERT INTO used_words (room_id, word, round_number, won_by) VALUES ($1, $2, $3, $4)",
        [room.id, room.current_word, room.rounds_played + 1, roundWinner]
      );

      const newP1Score = room.player1_score + (roundWinner === 1 ? 1 : 0);
      const newP2Score = room.player2_score + (roundWinner === 2 ? 1 : 0);
      const newRounds = room.rounds_played + 1;

      let finalWinner = null;
      let newStatus = "playing";

      if (newRounds >= room.max_rounds) {
        newStatus = "finished";
        if (newP1Score > newP2Score) finalWinner = 1;
        else if (newP2Score > newP1Score) finalWinner = 2;
        else finalWinner = 0; // empate
      }

      await pool.query(
        `UPDATE rooms SET
          guessed_letters = $1,
          wrong_attempts = $2,
          player1_score = $3,
          player2_score = $4,
          rounds_played = $5,
          status = $6,
          winner = $7,
          current_player = $8
         WHERE code = $9`,
        [
          newGuessed,
          newWrongAttempts,
          newP1Score,
          newP2Score,
          newRounds,
          newStatus,
          finalWinner,
          roundWinner === 1 ? 2 : 1, // siguiente turno al perdedor
          roomCode,
        ]
      );

      const updatedRoom = await getRoomByCode(roomCode);

      io.to(roomCode).emit("round_end", {
        ...serializeRoom(updatedRoom),
        roundWinner,
        revealedWord: room.current_word,
        wasCorrect: won,
      });

      // Si el juego no terminó, iniciar siguiente ronda después de 4s
      if (newStatus === "playing") {
        setTimeout(() => startRound(roomCode), 4000);
      }
    } else {
      // Solo cambiar turno si la letra fue incorrecta
      const nextPlayer = isCorrect ? playerNumber : (playerNumber === 1 ? 2 : 1);
      updates.current_player = nextPlayer;

      await pool.query(
        `UPDATE rooms SET
          guessed_letters = $1,
          wrong_attempts = $2,
          current_player = $3
         WHERE code = $4`,
        [newGuessed, newWrongAttempts, nextPlayer, roomCode]
      );

      const updatedRoom = await getRoomByCode(roomCode);
      io.to(roomCode).emit("room_state", {
        ...serializeRoom(updatedRoom),
        lastLetter: L,
        wasCorrect: isCorrect,
        guessingPlayer: playerNumber,
      });
    }
  });

  // Saltar turno (cuando se acaba el tiempo)
  socket.on("skip_turn", async ({ code, playerNumber }) => {
    const roomCode = code.toUpperCase();
    const room = await getRoomByCode(roomCode);

    if (!room || room.status !== "playing") {
      socket.emit("error", { message: "Juego no activo" });
      return;
    }
    if (room.current_player !== playerNumber) {
      socket.emit("error", { message: "No es tu turno" });
      return;
    }

    // Cambiar al otro jugador
    const nextPlayer = playerNumber === 1 ? 2 : 1;

    await pool.query(
      `UPDATE rooms SET current_player = $1 WHERE code = $2`,
      [nextPlayer, roomCode]
    );

    const updatedRoom = await getRoomByCode(roomCode);
    io.to(roomCode).emit("room_state", {
      ...serializeRoom(updatedRoom),
      skipped: true,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Socket desconectado: ${socket.id}`);
  });
});

// Inicia una nueva ronda
async function startRound(roomCode) {
  const room = await getRoomByCode(roomCode);
  if (!room) return;

  const usedWords = await getUsedWords(room.id);
  const { word } = await getRandomWord(usedWords);

  await pool.query(
    `UPDATE rooms SET
      current_word = $1,
      guessed_letters = '{}',
      wrong_attempts = 0,
      status = 'playing'
     WHERE code = $2`,
    [word, roomCode]
  );

  const updated = await getRoomByCode(roomCode);
  io.to(roomCode).emit("new_round", {
    ...serializeRoom(updated),
    roundNumber: updated.rounds_played + 1,
  });

  console.log(`Nueva ronda en ${roomCode}: palabra=${word}`);
}

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Hangman server corriendo en puerto ${PORT}`);
});
