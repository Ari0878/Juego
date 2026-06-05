// app/GameScreen.js
import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Alert, Animated, Modal, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import HangmanDrawing from "../components/HangmanDrawing";
import Keyboard from "../components/Keyboard";
import { SERVER_URL, COLORS, MAX_WRONG } from "../config";
import { getRandomWord } from "../data/words";

export default function GameScreen({ route, navigation }) {
  const { code, playerName, playerNumber, initialState } = route.params;
  const singlePlayer = route.params?.singlePlayer || false;
  const difficulty = route.params?.difficulty || "normal";
  const socketRef = useRef(null);

  const [gameState, setGameState] = useState(initialState || null);
  const [roundModal, setRoundModal] = useState(null);
  const [shakeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [usedWords, setUsedWords] = useState([]);
  const [playerWins, setPlayerWins] = useState(0);

  const isMyTurn = gameState && gameState.currentPlayer === playerNumber;

  useEffect(() => {
    if (singlePlayer) {
      (async () => {
      const { word } = await getRandomWord(usedWords);
      setUsedWords(prev => [...prev, word]);
      const maxAttempts = difficulty === "easy" ? 7 : difficulty === "hard" ? 3 : 5;
      const hintsCount = difficulty === "easy" ? 2 : difficulty === "hard" ? 0 : 1;
      const letters = Array.from(new Set(word.split("")));
      const availableHints = letters.filter((c) => /[A-ZÑ]/i.test(c));
      const hintLetters = [];
      while (hintLetters.length < hintsCount && availableHints.length > 0) {
        const idx = Math.floor(Math.random() * availableHints.length);
        hintLetters.push(availableHints.splice(idx, 1)[0]);
      }
      const guessedLettersInit = [...hintLetters];
      const masked = word.split("").map((c) => (guessedLettersInit.includes(c) ? c : "_")).join("");
      setGameState({ code: null, status: "playing", currentPlayer: 1, player1Name: playerName, player2Name: null, player1Score: 0, player2Score: 0, maskedWord: masked, wordLength: word.length, guessedLetters: guessedLettersInit, wrongAttempts: 0, maxAttempts, winner: null, roundsPlayed: 0, maxRounds: 1, current_word: word });
      })();
      return;
    }
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("join_room", { code, playerName }));
    socket.on("room_state", (state) => setGameState(state));
    socket.on("new_round", (state) => { setRoundModal(null); setGameState(state); });
    socket.on("round_end", (state) => {
      setGameState(state);
      setRoundModal({ won: state.roundWinner === playerNumber, word: state.revealedWord, winner: state.roundWinner, p1Name: state.player1Name, p2Name: state.player2Name, p1Score: state.player1Score, p2Score: state.player2Score, isFinished: state.status === "finished", gameWinner: state.winner, status: state.status });
    });
    socket.on("error", () => shakeScreen());
    return () => socket.disconnect();
  }, []);

  const handleExit = () => {
    if (singlePlayer) {
      navigation.navigate("Home", { mode: "solo", playerName: gameState?.player1Name || playerName, difficulty });
      return;
    }
    Alert.alert("Salir", "¿Quieres abandonar la partida?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: () => { try { socketRef.current?.disconnect(); } catch (e) {} navigation.replace("Home"); } },
    ]);
  };

  const handleNewGame = async () => {
    setRoundModal(null);
    setUsedWords([]);
    setPlayerWins(0);
    const { word } = await getRandomWord([]);
    setUsedWords([word]);
    const maxAttempts = difficulty === "easy" ? 7 : difficulty === "hard" ? 3 : 5;
    const hintsCount = difficulty === "easy" ? 2 : difficulty === "hard" ? 0 : 1;
    const letters = Array.from(new Set(word.split("")));
    const availableHints = letters.filter((c) => /[A-ZÑ]/i.test(c));
    const hintLetters = [];
    while (hintLetters.length < hintsCount && availableHints.length > 0) {
      const idx = Math.floor(Math.random() * availableHints.length);
      hintLetters.push(availableHints.splice(idx, 1)[0]);
    }
    const guessedLettersInit = [...hintLetters];
    const masked = word.split("").map((c) => (guessedLettersInit.includes(c) ? c : "_")).join("");
    setGameState({ code: null, status: "playing", currentPlayer: 1, player1Name: playerName, player2Name: null, player1Score: 0, player2Score: 0, maskedWord: masked, wordLength: word.length, guessedLetters: guessedLettersInit, wrongAttempts: 0, maxAttempts, winner: null, roundsPlayed: 0, maxRounds: 1, current_word: word });
  };

  const shakeScreen = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleGuess = (letter) => {
    if (singlePlayer) {
      if (!gameState || gameState.status !== "playing") return;
      const L = letter.toUpperCase();
      if (gameState.guessedLetters.includes(L)) return;
      const newGuessed = [...gameState.guessedLetters, L];
      const isCorrect = gameState.current_word.includes(L);
      const newWrong = gameState.wrongAttempts + (isCorrect ? 0 : 1);
      const masked = gameState.current_word.split("").map((c) => (newGuessed.includes(c) ? c : "_")).join("");
      const won = gameState.current_word.split("").every((c) => newGuessed.includes(c));
      const lost = newWrong >= gameState.maxAttempts;
      setGameState({ ...gameState, guessedLetters: newGuessed, wrongAttempts: newWrong, maskedWord: masked });
      if (won || lost) {
        if (won) {
          setPlayerWins(prev => prev + 1);
          setTimeout(async () => {
            const { word: newWord } = await getRandomWord(usedWords);
            setUsedWords(prev => [...prev, newWord]);
            const maxAttempts = difficulty === "easy" ? 7 : difficulty === "hard" ? 3 : 5;
            const hintsCount = difficulty === "easy" ? 2 : difficulty === "hard" ? 0 : 1;
            const letters = Array.from(new Set(newWord.split("")));
            const availableHints = letters.filter((c) => /[A-ZÑ]/i.test(c));
            const hintLetters = [];
            while (hintLetters.length < hintsCount && availableHints.length > 0) {
              const idx = Math.floor(Math.random() * availableHints.length);
              hintLetters.push(availableHints.splice(idx, 1)[0]);
            }
            const guessedLettersInit = [...hintLetters];
            const newMasked = newWord.split("").map((c) => (guessedLettersInit.includes(c) ? c : "_")).join("");
            setGameState({ code: null, status: "playing", currentPlayer: 1, player1Name: playerName, player2Name: null, player1Score: playerWins + 1, player2Score: 0, maskedWord: newMasked, wordLength: newWord.length, guessedLetters: guessedLettersInit, wrongAttempts: 0, maxAttempts, winner: null, roundsPlayed: 0, maxRounds: 1, current_word: newWord });
          }, 1500);
        } else {
          setRoundModal({ won: false, word: gameState.current_word, winner: 2, p1Name: gameState.player1Name, p2Name: "COMPUTADORA", p1Score: playerWins, p2Score: 1, isFinished: true, gameWinner: 2, status: "finished" });
        }
      }
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      return;
    }
    if (!isMyTurn || !socketRef.current) return;
    socketRef.current.emit("guess_letter", { code, letter, playerNumber });
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  if (!gameState) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Conectando al juego...</Text>
      </View>
    );
  }

  const maskedLetters = gameState.maskedWord ? gameState.maskedWord.split("") : [];
  const attemptsLeft = gameState.maxAttempts - gameState.wrongAttempts;
  const myName = playerNumber === 1 ? gameState.player1Name : gameState.player2Name;
  const opponentName = playerNumber === 1 ? gameState.player2Name : gameState.player1Name;
  const myScore = playerNumber === 1 ? gameState.player1Score : gameState.player2Score;
  const opponentScore = playerNumber === 1 ? gameState.player2Score : gameState.player1Score;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>
      <TouchableOpacity style={styles.backBtn} onPress={handleExit}>
        <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
        <Text style={styles.backBtnText}>Salir</Text>
      </TouchableOpacity>

      {/* Score bar */}
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

      {/* Turn banner */}
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

      {/* Attempts */}
      <View style={styles.attemptsRow}>
        {Array.from({ length: gameState.maxAttempts }).map((_, i) => (
          <View key={i} style={[styles.attemptDot, i < gameState.wrongAttempts ? styles.attemptDotWrong : styles.attemptDotOk]} />
        ))}
        <Text style={styles.attemptsText}>{attemptsLeft} intento{attemptsLeft !== 1 ? "s" : ""}</Text>
      </View>

      {/* Word */}
      <View style={styles.wordContainer}>
        {maskedLetters.map((letter, i) => (
          <View key={i} style={[styles.letterBox, letter !== "_" && styles.letterBoxFilled]}>
            <Text style={[styles.letter, letter !== "_" && styles.letterRevealed]}>
              {letter === "_" ? " " : letter}
            </Text>
          </View>
        ))}
      </View>

      {/* Keyboard */}
      <Keyboard guessedLetters={gameState.guessedLetters || []} onGuess={handleGuess} disabled={!isMyTurn} currentWord={null} />

      {/* Modal */}
      <Modal visible={!!roundModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {roundModal?.isFinished ? (
              <>
                <View style={[styles.modalIconCircle, { backgroundColor: roundModal.gameWinner === playerNumber ? "#FEF9C3" : roundModal.gameWinner === 0 ? COLORS.primarySoft : COLORS.dangerSoft }]}>
                  <Ionicons
                    name={roundModal.gameWinner === playerNumber ? "trophy-outline" : roundModal.gameWinner === 0 ? "handshake-outline" : "skull-outline"}
                    size={48}
                    color={roundModal.gameWinner === playerNumber ? "#B45309" : roundModal.gameWinner === 0 ? COLORS.primary : COLORS.accent}
                  />
                </View>
                <Text style={styles.modalTitle}>
                  {roundModal.gameWinner === playerNumber ? "GANASTE EL DUELO" : roundModal.gameWinner === 0 ? "EMPATE" : "PERDISTE EL DUELO"}
                </Text>
                <View style={styles.wordRevealBox}>
                  <Text style={styles.wordRevealLabel}>La palabra era</Text>
                  <Text style={styles.wordRevealText}>{roundModal.word}</Text>
                </View>
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
                <TouchableOpacity style={styles.modalBtn} onPress={handleNewGame}>
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                  <Text style={styles.modalBtnText}>NUEVO JUEGO</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.modalIconCircle, { backgroundColor: roundModal?.won ? COLORS.mintSoft : COLORS.dangerSoft }]}>
                  <Ionicons name={roundModal?.won ? "checkmark-circle-outline" : "close-circle-outline"} size={48} color={roundModal?.won ? COLORS.success : COLORS.accent} />
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 10, paddingHorizontal: 12, gap: 8 },
  backBtn: { position: "absolute", top: 44, left: 12, zIndex: 20, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  backBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 16 },
  scoreBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 40 },
  playerTag: { flex: 1, padding: 10, borderRadius: 14, backgroundColor: COLORS.bgCard, borderWidth: 1.5, borderColor: COLORS.border },
  playerTagActiveMe:  { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  playerTagActiveOpp: { borderColor: COLORS.accent,  backgroundColor: COLORS.accentSoft },
  playerTagRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  playerTagName: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 11 },
  playerTagScore: { fontWeight: "900", fontSize: 22 },
  turnDot: { width: 8, height: 8, borderRadius: 4, position: "absolute", top: 8, right: 8 },
  roundInfo: { alignItems: "center", paddingHorizontal: 10 },
  roundText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  vsText: { color: COLORS.primaryDark, fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  turnBanner: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 12 },
  turnBannerMe:  { backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.border },
  turnBannerOpp: { backgroundColor: COLORS.accentSoft,  borderWidth: 1, borderColor: COLORS.accentLight },
  turnBannerText: { fontWeight: "700", fontSize: 13 },
  hangmanWrapper: { backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 8, alignItems: "center", borderWidth: 1.5, borderColor: COLORS.border, shadowColor: COLORS.shadowBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  attemptsRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  attemptDot: { width: 12, height: 12, borderRadius: 6 },
  attemptDotOk:    { backgroundColor: COLORS.mint },
  attemptDotWrong: { backgroundColor: COLORS.accent },
  attemptsText: { color: COLORS.textSecondary, fontSize: 11, marginLeft: 4, fontWeight: "600" },
  wordContainer: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 5, minHeight: 50 },
  letterBox: { width: 34, height: 42, borderBottomWidth: 2.5, borderBottomColor: COLORS.border, alignItems: "center", justifyContent: "flex-end", paddingBottom: 4 },
  letterBoxFilled: { borderBottomColor: COLORS.primary },
  letter: { color: "transparent", fontSize: 20, fontWeight: "900" },
  letterRevealed: { color: COLORS.primaryDark },
  modalOverlay: { flex: 1, backgroundColor: "rgba(30,58,95,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.bgCard, borderRadius: 28, padding: 32, width: "100%", alignItems: "center", borderWidth: 2, borderColor: COLORS.primaryLight, gap: 12, shadowColor: COLORS.shadowBlue, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 1, shadowRadius: 30, elevation: 12 },
  modalIconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  modalTitle: { color: COLORS.primaryDark, fontSize: 22, fontWeight: "900", letterSpacing: 2, textAlign: "center" },
  wordRevealBox: { backgroundColor: COLORS.primarySoft, borderRadius: 14, padding: 14, alignItems: "center", width: "100%", borderWidth: 1, borderColor: COLORS.border },
  wordRevealLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
  wordRevealText: { color: COLORS.primaryDark, fontSize: 28, fontWeight: "900", letterSpacing: 6 },
  roundScores: { gap: 4, alignItems: "center" },
  roundScoreText: { color: COLORS.textSecondary, fontSize: 14 },
  nextRoundRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nextRoundText: { color: COLORS.textMuted, fontSize: 12, fontStyle: "italic" },
  finalScores: { flexDirection: "row", alignItems: "center", gap: 20, marginVertical: 4 },
  finalScoreItem: { alignItems: "center" },
  finalScoreName: { color: COLORS.textSecondary, fontSize: 13 },
  finalScoreNum: { fontSize: 40, fontWeight: "900" },
  finalVs: { color: COLORS.textMuted, fontWeight: "900", fontSize: 18 },
  modalBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 4, shadowColor: "rgba(59,130,246,0.3)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 14, elevation: 6 },
  modalBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
});