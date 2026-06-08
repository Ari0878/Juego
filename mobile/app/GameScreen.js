// app/GameScreen.js
// ✨ Mejoras incluidas:
//   1. ⏱  Temporizador por turno (multijugador)
//   2. 🔊 Efectos de sonido (expo-av)
//   3. 📊 Estadísticas de partida al final
//   4. 🎉 Animaciones mejoradas (win/loss)
//   5. 💡 Sistema de pistas extra

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Alert, Animated, Modal,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { Audio } from "expo-av";
import HangmanDrawing from "../components/HangmanDrawing";
import Keyboard from "../components/Keyboard";
import { SERVER_URL, COLORS, MAX_WRONG } from "../config";
import { getRandomWord } from "../data/words";

// ─── Constantes ──────────────────────────────────────────────────────────────
const TURN_SECONDS = 30; // segundos por turno — solo presión visual, no fuerza cambio de turno
const MAX_HINTS = 3;     // máximo de pistas por partida

// ─── Hook de sonidos ─────────────────────────────────────────────────────────
function useSounds() {
  const sounds = useRef({});

  const loadSounds = useCallback(async () => {
    try {
      // Usamos URLs de sonidos gratuitos (freesound / GitHub CDN)
      // Puedes sustituirlas por archivos locales en ./assets/sounds/
      const soundFiles = {
        correct:  { uri: "https://actions.google.com/sounds/v1/cartoon/pop.ogg" },
        wrong:    { uri: "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg" },
        win:      { uri: "https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg" },
        lose:     { uri: "https://actions.google.com/sounds/v1/cartoon/concussive_hit_guitar_boing.ogg" },
        hint:     { uri: "https://actions.google.com/sounds/v1/cartoon/light_switch.ogg" },
        tick:     { uri: "https://actions.google.com/sounds/v1/cartoon/clocks_ticking.ogg" },
      };
      for (const [key, source] of Object.entries(soundFiles)) {
        const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
        sounds.current[key] = sound;
      }
    } catch (e) {
      // Si no hay internet o falla expo-av, simplemente seguimos sin sonido
      console.warn("Sonidos no cargados:", e.message);
    }
  }, []);

  const play = useCallback(async (key) => {
    try {
      const sound = sounds.current[key];
      if (!sound) return;
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch (_) {}
  }, []);

  const unload = useCallback(async () => {
    for (const sound of Object.values(sounds.current)) {
      try { await sound.unloadAsync(); } catch (_) {}
    }
    sounds.current = {};
  }, []);

  return { loadSounds, play, unload };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildInitialSPState({ word, playerName, difficulty, hintsCount, playerWins }) {
  const maxAttempts = difficulty === "easy" ? 7 : difficulty === "hard" ? 3 : 5;
  const letters = Array.from(new Set(word.split("")));
  const available = letters.filter((c) => /[A-ZÑ]/i.test(c));
  const hintLetters = [];
  const pool = [...available];
  while (hintLetters.length < hintsCount && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    hintLetters.push(pool.splice(idx, 1)[0]);
  }
  const guessed = [...hintLetters];
  const masked = word.split("").map((c) => (guessed.includes(c) ? c : "_")).join("");
  return {
    code: null, status: "playing", currentPlayer: 1,
    player1Name: playerName, player2Name: null,
    player1Score: playerWins || 0, player2Score: 0,
    maskedWord: masked, wordLength: word.length,
    guessedLetters: guessed, wrongAttempts: 0,
    maxAttempts, winner: null, roundsPlayed: 0, maxRounds: 1,
    current_word: word,
  };
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function GameScreen({ route, navigation }) {
  const { code, playerName, playerNumber, initialState } = route.params;
  const singlePlayer  = route.params?.singlePlayer  || false;
  const difficulty    = route.params?.difficulty    || "normal";
  const socketRef     = useRef(null);
  const timerRef      = useRef(null);

  // Estado de juego
  const [gameState,  setGameState]  = useState(initialState || null);
  const [roundModal, setRoundModal] = useState(null);
  const [pauseModal, setPauseModal] = useState(false);
  const [usedWords,  setUsedWords]  = useState([]);
  const [playerWins, setPlayerWins] = useState(0);

  // ── 💡 Pistas ──────────────────────────────────────────────────────────────
  const [hintsUsed, setHintsUsed]   = useState(0);

  // ── ⏱ Temporizador ────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const timeLeftRef = useRef(TURN_SECONDS);
  const currentPlayerRef = useRef(null);

  // ── 📊 Estadísticas ────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    correctGuesses: 0,
    wrongGuesses:   0,
    hintsUsed:      0,
    wordsWon:       0,
    wordsLost:      0,
    bestStreak:     0,
    currentStreak:  0,
    totalLetters:   0,
  });

  // ── 🎉 Animaciones ────────────────────────────────────────────────────────
  const [shakeAnim]   = useState(new Animated.Value(0));
  const [pulseAnim]   = useState(new Animated.Value(1));
  const [bounceAnim]  = useState(new Animated.Value(0));   // para ganancia
  const [flashAnim]   = useState(new Animated.Value(0));   // para pérdida
  const [timerAnim]   = useState(new Animated.Value(1));   // escala del timer

  // ── 🔊 Sonidos ────────────────────────────────────────────────────────────
  const { loadSounds, play, unload } = useSounds();

  const isMyTurn = gameState && gameState.currentPlayer === playerNumber;
  const hintsCount = difficulty === "easy" ? 2 : difficulty === "hard" ? 0 : 1;

  // ─── Ciclo de vida ─────────────────────────────────────────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    loadSounds();
    return () => { unload(); clearTimerInterval(); };
  }, []);

  useEffect(() => {
    if (singlePlayer) {
      (async () => {
        const { word } = await getRandomWord(usedWords);
        setUsedWords((prev) => [...prev, word]);
        setGameState(buildInitialSPState({ word, playerName, difficulty, hintsCount, playerWins: 0 }));
      })();
      return;
    }
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect",    () => socket.emit("join_room", { code, playerName }));
    socket.on("room_state", (state) => {
      console.log("room_state recibido:", state.currentPlayer, state.status);
      const prevPlayer = currentPlayerRef.current;
      currentPlayerRef.current = state.currentPlayer;
      setGameState(state);
      // Reiniciar timer cuando cambia el turno o es la primera vez
      if (state.status === "playing") {
        if (prevPlayer === null || prevPlayer !== state.currentPlayer) {
          console.log("Iniciando/reiniciando timer:", prevPlayer, "->", state.currentPlayer);
          resetTimer();
          startTimer();
        }
      } else {
        clearTimerInterval();
      }
    });
    socket.on("new_round",  (state) => {
      currentPlayerRef.current = state.currentPlayer;
      setRoundModal(null);
      setGameState(state);
      resetTimer();
      startTimer();
    });
    socket.on("round_end",  (state) => {
      clearTimerInterval();
      setGameState(state);
      setRoundModal({
        won: state.roundWinner === playerNumber,
        word: state.revealedWord,
        winner: state.roundWinner,
        p1Name: state.player1Name, p2Name: state.player2Name,
        p1Score: state.player1Score, p2Score: state.player2Score,
        isFinished: state.status === "finished",
        gameWinner: state.winner, status: state.status,
      });
    });
    socket.on("error", () => { shakeScreen(); play("wrong"); });
    return () => { socket.disconnect(); clearTimerInterval(); };
  }, []);

  function clearTimerInterval() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function resetTimer() {
    timeLeftRef.current = TURN_SECONDS;
    setTimeLeft(TURN_SECONDS);
  }

  function startTimer() {
    clearTimerInterval();
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);

      // Animación de urgencia en los últimos 5 segundos
      if (timeLeftRef.current <= 5 && timeLeftRef.current > 0) {
        play("tick");
        Animated.sequence([
          Animated.timing(timerAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
          Animated.timing(timerAnim, { toValue: 1,   duration: 150, useNativeDriver: true }),
        ]).start();
      }

      if (timeLeftRef.current <= 0) {
        clearTimerInterval();
        // Tiempo agotado → cambiar de turno
        shakeScreen();
        play("wrong");
        // Emitir evento al servidor para cambiar de turno
        if (socketRef.current && !singlePlayer && gameState?.status === "playing") {
          console.log("Emitiendo skip_turn:", { code, playerNumber });
          socketRef.current.emit("skip_turn", { code, playerNumber });
        }
      }
    }, 1000);
  }

  // ─── Animaciones ──────────────────────────────────────────────────────────
  const shakeScreen = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const bounceWin = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 4,   duration: 100, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: -8,  duration: 80,  useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0,   duration: 60,  useNativeDriver: true }),
    ]).start();
  };

  const flashLoss = () => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const pulseLetter = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // ─── Pista extra ──────────────────────────────────────────────────────────
  const handleHint = () => {
    if (!gameState || gameState.status !== "playing") return;
    if (hintsUsed >= MAX_HINTS) {
      Alert.alert("Sin pistas", `Ya usaste las ${MAX_HINTS} pistas disponibles.`); return;
    }
    const word = gameState.current_word;
    if (!word) { Alert.alert("Pista", "Solo disponible en modo solo con palabra conocida."); return; }

    const unrevealed = word.split("").filter((c) => !gameState.guessedLetters.includes(c) && /[A-ZÑ]/i.test(c));
    if (unrevealed.length === 0) { Alert.alert("Pista", "Todas las letras ya están reveladas."); return; }

    const letter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    play("hint");
    setHintsUsed((h) => h + 1);
    setStats((s) => ({ ...s, hintsUsed: s.hintsUsed + 1 }));

    // Tratar la pista como un acierto sin animación de turno
    processGuess(letter, true);
  };

  // ─── Guess central ────────────────────────────────────────────────────────
  const processGuess = (letter, isHint = false) => {
    if (!gameState || gameState.status !== "playing") return;
    const L = letter.toUpperCase();
    if (gameState.guessedLetters.includes(L)) return;

    const newGuessed = [...gameState.guessedLetters, L];
    const isCorrect  = gameState.current_word.includes(L);
    const newWrong   = gameState.wrongAttempts + (isCorrect ? 0 : 1);
    const masked     = gameState.current_word.split("").map((c) => (newGuessed.includes(c) ? c : "_")).join("");
    const won        = gameState.current_word.split("").every((c) => newGuessed.includes(c));
    const lost       = newWrong >= gameState.maxAttempts;

    // Sonido y animación
    if (isCorrect) { play("correct"); pulseLetter(); }
    else           { play("wrong");  shakeScreen(); }

    // Actualizar estadísticas
    setStats((s) => ({
      ...s,
      correctGuesses: s.correctGuesses + (isCorrect ? 1 : 0),
      wrongGuesses:   s.wrongGuesses   + (isCorrect ? 0 : 1),
      totalLetters:   s.totalLetters   + 1,
      currentStreak:  isCorrect ? s.currentStreak + 1 : 0,
      bestStreak:     isCorrect ? Math.max(s.bestStreak, s.currentStreak + 1) : s.bestStreak,
    }));

    setGameState({ ...gameState, guessedLetters: newGuessed, wrongAttempts: newWrong, maskedWord: masked });

    if (won || lost) {
      clearTimerInterval();
      if (won) {
        play("win");
        bounceWin();
        setPlayerWins((prev) => prev + 1);
        setStats((s) => ({ ...s, wordsWon: s.wordsWon + 1 }));
        setTimeout(async () => {
          const { word: newWord } = await getRandomWord(usedWords);
          setUsedWords((prev) => [...prev, newWord]);
          setGameState(buildInitialSPState({ word: newWord, playerName, difficulty, hintsCount, playerWins: playerWins + 1 }));
          setHintsUsed(0);
          resetTimer();
        }, 1800);
      } else {
        play("lose");
        flashLoss();
        setStats((s) => ({ ...s, wordsLost: s.wordsLost + 1 }));
        setRoundModal({
          won: false, word: gameState.current_word,
          winner: 2, p1Name: gameState.player1Name, p2Name: "COMPUTADORA",
          p1Score: playerWins, p2Score: 1,
          isFinished: true, gameWinner: 2, status: "finished",
        });
      }
    }
  };

  const handleGuess = (letter) => {
    if (singlePlayer) {
      processGuess(letter);
      return;
    }
    if (!isMyTurn || !socketRef.current) return;
    socketRef.current.emit("guess_letter", { code, letter, playerNumber });
    pulseLetter();

    // Estadísticas básicas en multijugador (sin saber si es correcto hasta room_state)
    setStats((s) => ({ ...s, totalLetters: s.totalLetters + 1 }));
  };

  // ─── Salida y nuevo juego ─────────────────────────────────────────────────
  const handleExit = (confirmed = false) => {
    clearTimerInterval();
    setPauseModal(false);
    if (singlePlayer) {
      navigation.navigate("Home", { mode: "solo", playerName: gameState?.player1Name || playerName, difficulty });
      return;
    }
    if (confirmed) {
      try { socketRef.current?.disconnect(); } catch (e) {}
      navigation.replace("Home");
    } else {
      Alert.alert("Salir", "¿Quieres abandonar la partida?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: () => {
          try { socketRef.current?.disconnect(); } catch (e) {}
          navigation.replace("Home");
        }},
      ]);
    }
  };

  const handleNewGame = async () => {
    setRoundModal(null);
    setUsedWords([]);
    setPlayerWins(0);
    setHintsUsed(0);
    setStats({ correctGuesses: 0, wrongGuesses: 0, hintsUsed: 0, wordsWon: 0, wordsLost: 0, bestStreak: 0, currentStreak: 0, totalLetters: 0 });
    const { word } = await getRandomWord([]);
    setUsedWords([word]);
    setGameState(buildInitialSPState({ word, playerName, difficulty, hintsCount, playerWins: 0 }));
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Conectando al juego...</Text>
      </View>
    );
  }

  const maskedLetters = gameState.maskedWord ? gameState.maskedWord.split("") : [];
  const attemptsLeft  = gameState.maxAttempts - gameState.wrongAttempts;
  const myName        = playerNumber === 1 ? gameState.player1Name : gameState.player2Name;
  const opponentName  = playerNumber === 1 ? gameState.player2Name : gameState.player1Name;
  const myScore       = playerNumber === 1 ? gameState.player1Score : gameState.player2Score;
  const opponentScore = playerNumber === 1 ? gameState.player2Score : gameState.player1Score;

  // Color del temporizador
  const timerColor = timeLeft <= 5 ? COLORS.danger : timeLeft <= 10 ? COLORS.warning : COLORS.mint;

  // Porcentaje de aciertos
  const accuracy = stats.totalLetters > 0
    ? Math.round((stats.correctGuesses / stats.totalLetters) * 100)
    : 0;

  return (
    <Animated.View style={[
      styles.container,
      { transform: [{ translateX: shakeAnim }, { translateY: bounceAnim }] },
    ]}>
      {/* Flash de pérdida */}
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, { opacity: flashAnim }]}
      />

      {/* Botones de navegación */}
      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.navBtn} onPress={handleExit}>
          <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
          <Text style={styles.navBtnText}>Salir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setPauseModal(true); clearTimerInterval(); }}>
          <Ionicons name="pause-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.navBtnText}>Pausa</Text>
        </TouchableOpacity>
      </View>

      {/* ⏱ Temporizador tipo reloj (solo multijugador) */}
      {!singlePlayer && gameState.status === "playing" && (
        <Animated.View style={[styles.clockContainer, { transform: [{ scale: timerAnim }] }]}>
          <View style={[styles.clockRing, { borderColor: timerColor }]}>
            <View style={[
              styles.clockProgress,
              {
                borderColor: timerColor,
                transform: [{ rotate: `${((timeLeft / TURN_SECONDS) * 360) - 90}deg` }],
              },
            ]}>
              <View style={styles.clockProgressKnob} />
            </View>
            <View style={styles.clockInner}>
              <Ionicons name="time-outline" size={20} color={timerColor} />
              <Text style={[styles.clockTime, { color: timerColor }]}>
                {timeLeft}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Marcador */}
      <View style={styles.scoreBar}>
        <View style={[styles.playerTag, isMyTurn && styles.playerTagActiveMe]}>
          <View style={styles.playerTagRow}>
            <Ionicons name="person-circle-outline" size={14} color={isMyTurn ? COLORS.primary : COLORS.textMuted} />
            <Text style={styles.playerTagName}>{myName || `J${playerNumber}`}</Text>
          </View>
          <Text style={[styles.playerTagScore, { color: COLORS.primary }]}>{myScore}</Text>
          {isMyTurn && <View style={[styles.turnDot, { backgroundColor: COLORS.primary }]} />}
        </View>

        <View style={styles.roundInfo}>
          <Text style={styles.roundText}>{gameState.roundsPlayed + 1}/{gameState.maxRounds}</Text>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={[styles.playerTag, !isMyTurn && styles.playerTagActiveOpp, { alignItems: "flex-end" }]}>
          <View style={[styles.playerTagRow, { justifyContent: "flex-end" }]}>
            <Text style={styles.playerTagName}>{opponentName || `J${playerNumber === 1 ? 2 : 1}`}</Text>
            <Ionicons name="person-circle-outline" size={14} color={!isMyTurn ? COLORS.accent : COLORS.textMuted} />
          </View>
          <Text style={[styles.playerTagScore, { color: COLORS.accent }]}>{opponentScore}</Text>
          {!isMyTurn && <View style={[styles.turnDot, { backgroundColor: COLORS.accent }]} />}
        </View>
      </View>

      {/* Banner de turno */}
      <View style={[styles.turnBanner, isMyTurn ? styles.turnBannerMe : styles.turnBannerOpp]}>
        <Ionicons
          name={isMyTurn ? "search-outline" : "hourglass-outline"}
          size={15}
          color={isMyTurn ? COLORS.primaryDark : COLORS.accent}
          style={{ marginRight: 6 }}
        />
        <Text style={[styles.turnBannerText, { color: isMyTurn ? COLORS.primaryDark : COLORS.accent }]}>
          {isMyTurn ? "TU TURNO — Adivina una letra" : `Turno de ${opponentName || "rival"}...`}
        </Text>
      </View>

      {/* Hangman */}
      <View style={styles.hangmanWrapper}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <HangmanDrawing wrongAttempts={gameState.wrongAttempts} size={150} />
        </Animated.View>
      </View>

      {/* Intentos */}
      <View style={styles.attemptsRow}>
        {Array.from({ length: gameState.maxAttempts }).map((_, i) => (
          <View key={i} style={[
            styles.attemptDot,
            i < gameState.wrongAttempts ? styles.attemptDotWrong : styles.attemptDotOk,
          ]} />
        ))}
        <Text style={styles.attemptsText}>{attemptsLeft} intento{attemptsLeft !== 1 ? "s" : ""}</Text>
      </View>

      {/* Palabra */}
      <View style={styles.wordContainer}>
        {maskedLetters.map((letter, i) => (
          <View key={i} style={[styles.letterBox, letter !== "_" && styles.letterBoxFilled]}>
            <Text style={[styles.letter, letter !== "_" && styles.letterRevealed]}>
              {letter === "_" ? " " : letter}
            </Text>
          </View>
        ))}
      </View>

      {/* 💡 Botón de pista (solo modo solo) */}
      {singlePlayer && (
        <View style={styles.hintRow}>
          <TouchableOpacity
            style={[styles.hintBtn, hintsUsed >= MAX_HINTS && styles.hintBtnDisabled]}
            onPress={handleHint}
            disabled={hintsUsed >= MAX_HINTS}
          >
            <Ionicons name="bulb-outline" size={16} color={hintsUsed >= MAX_HINTS ? COLORS.textMuted : COLORS.warning} />
            <Text style={[styles.hintBtnText, hintsUsed >= MAX_HINTS && { color: COLORS.textMuted }]}>
              Pista ({MAX_HINTS - hintsUsed} restantes)
            </Text>
          </TouchableOpacity>

          {/* 📊 mini-stats inline */}
          <View style={styles.miniStats}>
            <Ionicons name="checkmark-circle-outline" size={13} color={COLORS.mint} />
            <Text style={styles.miniStatText}>{stats.correctGuesses}</Text>
            <Ionicons name="close-circle-outline" size={13} color={COLORS.accent} />
            <Text style={styles.miniStatText}>{stats.wrongGuesses}</Text>
            {stats.bestStreak >= 3 && (
              <>
                <Ionicons name="flame-outline" size={13} color={COLORS.peach} />
                <Text style={styles.miniStatText}>{stats.bestStreak}</Text>
              </>
            )}
          </View>
        </View>
      )}

      {/* Teclado */}
      <Keyboard
        guessedLetters={gameState.guessedLetters || []}
        onGuess={handleGuess}
        disabled={!isMyTurn}
        currentWord={null}
      />

      {/* Modal de fin de ronda / partida */}
      <Modal visible={!!roundModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {roundModal?.isFinished ? (
              <>
                {/* Icono de resultado */}
                <View style={[styles.modalIconCircle, {
                  backgroundColor: roundModal.gameWinner === playerNumber
                    ? "#FEF9C3"
                    : roundModal.gameWinner === 0 ? COLORS.primarySoft : COLORS.dangerSoft,
                }]}>
                  <Ionicons
                    name={roundModal.gameWinner === playerNumber
                      ? "trophy-outline"
                      : roundModal.gameWinner === 0 ? "handshake-outline" : "skull-outline"}
                    size={48}
                    color={roundModal.gameWinner === playerNumber
                      ? "#B45309"
                      : roundModal.gameWinner === 0 ? COLORS.primary : COLORS.accent}
                  />
                </View>

                <Text style={styles.modalTitle}>
                  {roundModal.gameWinner === playerNumber
                    ? "🎉 GANASTE EL DUELO"
                    : roundModal.gameWinner === 0 ? "🤝 EMPATE" : "💀 PERDISTE EL DUELO"}
                </Text>

                {/* Palabra */}
                <View style={styles.wordRevealBox}>
                  <Text style={styles.wordRevealLabel}>La palabra era</Text>
                  <Text style={styles.wordRevealText}>{roundModal.word}</Text>
                </View>

                {/* Marcador final */}
                <View style={styles.finalScores}>
                  <View style={styles.finalScoreItem}>
                    <Text style={styles.finalScoreName}>{roundModal.p1Name}</Text>
                    <Text style={[styles.finalScoreNum, { color: COLORS.primary }]}>{roundModal.p1Score}</Text>
                  </View>
                  <Text style={styles.finalVs}>VS</Text>
                  <View style={styles.finalScoreItem}>
                    <Text style={styles.finalScoreName}>{roundModal.p2Name}</Text>
                    <Text style={[styles.finalScoreNum, { color: COLORS.accent }]}>{roundModal.p2Score}</Text>
                  </View>
                </View>

                {/* 📊 Estadísticas detalladas */}
                <View style={styles.statsBox}>
                  <Text style={styles.statsTitle}>📊 Tus estadísticas</Text>
                  <View style={styles.statsGrid}>
                    <StatCell icon="checkmark-circle-outline" color={COLORS.mint}   label="Aciertos"  value={stats.correctGuesses} />
                    <StatCell icon="close-circle-outline"    color={COLORS.accent}  label="Errores"   value={stats.wrongGuesses} />
                    <StatCell icon="bulb-outline"            color={COLORS.warning}  label="Pistas"    value={stats.hintsUsed} />
                    <StatCell icon="flash-outline"           color={COLORS.peach}   label="Precisión" value={`${accuracy}%`} />
                    <StatCell icon="flame-outline"           color={COLORS.peach}   label="Racha"     value={stats.bestStreak} />
                    <StatCell icon="star-outline"            color={COLORS.lavender} label="Palabras"  value={`${stats.wordsWon}/${stats.wordsWon + stats.wordsLost}`} />
                  </View>
                </View>

                <TouchableOpacity style={styles.modalBtn} onPress={handleNewGame}>
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                  <Text style={styles.modalBtnText}>NUEVO JUEGO</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.modalIconCircle, {
                  backgroundColor: roundModal?.won ? COLORS.mintSoft : COLORS.dangerSoft,
                }]}>
                  <Ionicons
                    name={roundModal?.won ? "checkmark-circle-outline" : "close-circle-outline"}
                    size={48}
                    color={roundModal?.won ? COLORS.success : COLORS.accent}
                  />
                </View>
                <Text style={styles.modalTitle}>{roundModal?.won ? "RONDA GANADA" : "RONDA PERDIDA"}</Text>
                <View style={styles.wordRevealBox}>
                  <Text style={styles.wordRevealLabel}>La palabra era</Text>
                  <Text style={styles.wordRevealText}>{roundModal?.word}</Text>
                </View>
                <View style={styles.roundScores}>
                  <Text style={styles.roundScoreText}>{roundModal?.p1Name}: {roundModal?.p1Score} pts</Text>
                  <Text style={styles.roundScoreText}>{roundModal?.p2Name}: {roundModal?.p2Score} pts</Text>
                </View>
                <View style={styles.nextRoundRow}>
                  <Ionicons name="hourglass-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.nextRoundText}>Siguiente ronda en unos segundos...</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de pausa */}
      <Modal visible={pauseModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.pauseModalCard}>
            <View style={styles.pauseIconCircle}>
              <Ionicons name="pause-circle-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.pauseModalTitle}>JUEGO PAUSADO</Text>

            <TouchableOpacity
              style={styles.pauseModalBtn}
              onPress={() => {
                setPauseModal(false);
                if (!singlePlayer && gameState?.status === "playing") {
                  startTimer();
                }
              }}
            >
              <Ionicons name="play-outline" size={20} color="#fff" />
              <Text style={styles.pauseModalBtnText}>CONTINUAR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pauseModalBtn, styles.pauseModalBtnSecondary]}
              onPress={() => handleExit(true)}
            >
              <Ionicons name="exit-outline" size={20} color={COLORS.textSecondary} />
              <Text style={[styles.pauseModalBtnText, { color: COLORS.textSecondary }]}>SALIR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

// ─── Componente StatCell ──────────────────────────────────────────────────────
function StatCell({ icon, color, label, value }) {
  return (
    <View style={styles.statCell}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.bg,
    paddingTop: 10, paddingHorizontal: 12, gap: 8,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.dangerSoft,
    zIndex: 50,
    pointerEvents: "none",
  },
  navButtons: {
    position: "absolute", top: 44, left: 12, right: 12, zIndex: 20,
    flexDirection: "row", justifyContent: "space-between",
  },
  navBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  navBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 16 },

  // ── Reloj (Temporizador) ───────────────────────────────────────────────────
  clockContainer: {
    position: "absolute",
    top: 110,
    right: 16,
    zIndex: 15,
  },
  clockRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadowBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  clockProgress: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  clockProgressKnob: {
    position: "absolute",
    top: -6,
    left: "50%",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.bgCard,
    borderWidth: 3,
    marginLeft: -6,
  },
  clockInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  clockTime: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },

  // ── Marcador ──────────────────────────────────────────────────────────────
  scoreBar: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginTop: 40,
  },
  playerTag: {
    flex: 1, padding: 10, borderRadius: 14,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  playerTagActiveMe:  { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  playerTagActiveOpp: { borderColor: COLORS.accent,  backgroundColor: COLORS.accentSoft  },
  playerTagRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  playerTagName: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 11 },
  playerTagScore: { fontWeight: "900", fontSize: 22 },
  turnDot: { width: 8, height: 8, borderRadius: 4, position: "absolute", top: 8, right: 8 },
  roundInfo: { alignItems: "center", paddingHorizontal: 10 },
  roundText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  vsText: { color: COLORS.primaryDark, fontSize: 18, fontWeight: "900", letterSpacing: 2 },

  // ── Banner turno ──────────────────────────────────────────────────────────
  turnBanner: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 12 },
  turnBannerMe:  { backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.border },
  turnBannerOpp: { backgroundColor: COLORS.accentSoft,  borderWidth: 1, borderColor: COLORS.accentLight },
  turnBannerText: { fontWeight: "700", fontSize: 13 },

  // ── Hangman ───────────────────────────────────────────────────────────────
  hangmanWrapper: {
    backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 8,
    alignItems: "center", borderWidth: 1.5, borderColor: COLORS.border,
    shadowColor: COLORS.shadowBlue, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },

  // ── Intentos ──────────────────────────────────────────────────────────────
  attemptsRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  attemptDot: { width: 12, height: 12, borderRadius: 6 },
  attemptDotOk:    { backgroundColor: COLORS.mint  },
  attemptDotWrong: { backgroundColor: COLORS.accent },
  attemptsText: { color: COLORS.textSecondary, fontSize: 11, marginLeft: 4, fontWeight: "600" },

  // ── Palabra ───────────────────────────────────────────────────────────────
  wordContainer: {
    flexDirection: "row", justifyContent: "center",
    flexWrap: "wrap", gap: 5, minHeight: 50,
  },
  letterBox: {
    width: 34, height: 42,
    borderBottomWidth: 2.5, borderBottomColor: COLORS.border,
    alignItems: "center", justifyContent: "flex-end", paddingBottom: 4,
  },
  letterBoxFilled: { borderBottomColor: COLORS.primary },
  letter: { color: "transparent", fontSize: 20, fontWeight: "900" },
  letterRevealed: { color: COLORS.primaryDark },

  // ── Pista ─────────────────────────────────────────────────────────────────
  hintRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 4,
  },
  hintBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FEFCE8",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A",
  },
  hintBtnDisabled: { backgroundColor: COLORS.bgCard, borderColor: COLORS.border },
  hintBtnText: { color: COLORS.warning, fontWeight: "700", fontSize: 13 },

  // ── Mini stats ─────────────────────────────────────────────────────────────
  miniStats: { flexDirection: "row", alignItems: "center", gap: 4 },
  miniStatText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700", marginRight: 4 },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(30,58,95,0.6)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 28, padding: 28,
    width: "100%", alignItems: "center",
    borderWidth: 2, borderColor: COLORS.primaryLight,
    gap: 12,
    shadowColor: COLORS.shadowBlue, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1, shadowRadius: 30, elevation: 12,
  },
  modalIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
  },
  modalTitle: {
    color: COLORS.primaryDark, fontSize: 20, fontWeight: "900",
    letterSpacing: 1.5, textAlign: "center",
  },
  wordRevealBox: {
    backgroundColor: COLORS.primarySoft, borderRadius: 14, padding: 14,
    alignItems: "center", width: "100%",
    borderWidth: 1, borderColor: COLORS.border,
  },
  wordRevealLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
  wordRevealText: { color: COLORS.primaryDark, fontSize: 26, fontWeight: "900", letterSpacing: 5 },

  // Scores
  roundScores: { gap: 4, alignItems: "center" },
  roundScoreText: { color: COLORS.textSecondary, fontSize: 14 },
  nextRoundRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nextRoundText: { color: COLORS.textMuted, fontSize: 12, fontStyle: "italic" },
  finalScores: { flexDirection: "row", alignItems: "center", gap: 20, marginVertical: 4 },
  finalScoreItem: { alignItems: "center" },
  finalScoreName: { color: COLORS.textSecondary, fontSize: 13 },
  finalScoreNum: { fontSize: 38, fontWeight: "900" },
  finalVs: { color: COLORS.textMuted, fontWeight: "900", fontSize: 18 },

  // ── Estadísticas ──────────────────────────────────────────────────────────
  statsBox: {
    backgroundColor: COLORS.bgInput, borderRadius: 16, padding: 14,
    width: "100%", borderWidth: 1, borderColor: COLORS.border,
  },
  statsTitle: {
    color: COLORS.primaryDark, fontWeight: "800", fontSize: 13,
    marginBottom: 10, textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "space-between", gap: 8,
  },
  statCell: {
    alignItems: "center", width: "30%",
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { color: COLORS.primaryDark, fontWeight: "900", fontSize: 18, marginTop: 2 },
  statLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },

  // Botón
  modalBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 14, marginTop: 4,
    shadowColor: "rgba(59,130,246,0.3)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 6,
  },
  modalBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 },

  // ── Modal de pausa ───────────────────────────────────────────────────────────
  pauseModalCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 28, padding: 28,
    width: "100%", alignItems: "center",
    borderWidth: 2, borderColor: COLORS.primaryLight,
    gap: 16,
    shadowColor: COLORS.shadowBlue, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1, shadowRadius: 30, elevation: 12,
  },
  pauseIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  pauseModalTitle: {
    color: COLORS.primaryDark, fontSize: 20, fontWeight: "900",
    letterSpacing: 1.5, textAlign: "center",
  },
  pauseModalBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 14, width: "100%", justifyContent: "center",
    shadowColor: "rgba(59,130,246,0.3)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 6,
  },
  pauseModalBtnSecondary: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0, shadowRadius: 0, elevation: 0,
  },
  pauseModalBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
});