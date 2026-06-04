// app/GameScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  Modal,
  TouchableOpacity,
} from "react-native";
import { io } from "socket.io-client";
import HangmanDrawing from "../components/HangmanDrawing";
import Keyboard from "../components/Keyboard";
import { SERVER_URL, COLORS, MAX_WRONG } from "../config";

export default function GameScreen({ route, navigation }) {
  const { code, playerName, playerNumber, initialState } = route.params;
  const socketRef = useRef(null);

  const [gameState, setGameState] = useState(initialState || null);
  const [roundModal, setRoundModal] = useState(null); // { won, word, winner }
  const [shakeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  const isMyTurn =
    gameState && gameState.currentPlayer === playerNumber;

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { code, playerName });
    });

    socket.on("room_state", (state) => {
      setGameState(state);
    });

    socket.on("new_round", (state) => {
      setRoundModal(null);
      setGameState(state);
    });

    socket.on("round_end", (state) => {
      setGameState(state);
      const iWon = state.roundWinner === playerNumber;
      setRoundModal({
        won: iWon,
        word: state.revealedWord,
        winner: state.roundWinner,
        p1Name: state.player1Name,
        p2Name: state.player2Name,
        p1Score: state.player1Score,
        p2Score: state.player2Score,
        isFinished: state.status === "finished",
        gameWinner: state.winner,
        status: state.status,
      });
    });

    socket.on("error", ({ message }) => {
      shakeScreen();
    });

    return () => socket.disconnect();
  }, []);

  const shakeScreen = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleGuess = (letter) => {
    if (!isMyTurn || !socketRef.current) return;
    socketRef.current.emit("guess_letter", {
      code,
      letter,
      playerNumber,
    });
    // Pulse animation on guess
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  if (!gameState) {
    return (
      <View style={[styles.container, styles.center]}>
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
    <Animated.View
      style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}
    >
      {/* Score bar */}
      <View style={styles.scoreBar}>
        <View style={[styles.playerTag, isMyTurn && styles.playerTagActive]}>
          <Text style={styles.playerTagName}>
            {playerNumber === 1 ? "🟣" : "🔴"} {myName || `J${playerNumber}`}
          </Text>
          <Text style={styles.playerTagScore}>{myScore}</Text>
          {isMyTurn && <View style={styles.turnDot} />}
        </View>

        <View style={styles.roundInfo}>
          <Text style={styles.roundText}>
            {gameState.roundsPlayed + 1}/{gameState.maxRounds}
          </Text>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={[styles.playerTag, !isMyTurn && styles.playerTagActive, { alignItems: "flex-end" }]}>
          <Text style={styles.playerTagName}>
            {opponentName || `J${playerNumber === 1 ? 2 : 1}`} {playerNumber === 2 ? "🟣" : "🔴"}
          </Text>
          <Text style={styles.playerTagScore}>{opponentScore}</Text>
          {!isMyTurn && <View style={[styles.turnDot, styles.turnDotOpponent]} />}
        </View>
      </View>

      {/* Turn indicator */}
      <View
        style={[
          styles.turnBanner,
          isMyTurn ? styles.turnBannerMe : styles.turnBannerOpponent,
        ]}
      >
        <Text style={styles.turnBannerText}>
          {isMyTurn
            ? "🎯 TU TURNO — ¡Adivina una letra!"
            : `⏳ Turno de ${opponentName || "rival"}...`}
        </Text>
      </View>

      {/* Hangman drawing */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <HangmanDrawing wrongAttempts={gameState.wrongAttempts} size={170} />
      </Animated.View>

      {/* Attempts indicator */}
      <View style={styles.attemptsRow}>
        {Array.from({ length: gameState.maxAttempts }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.attemptDot,
              i < gameState.wrongAttempts
                ? styles.attemptDotWrong
                : styles.attemptDotOk,
            ]}
          />
        ))}
        <Text style={styles.attemptsText}>
          {attemptsLeft} intento{attemptsLeft !== 1 ? "s" : ""} restante{attemptsLeft !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Word display */}
      <View style={styles.wordContainer}>
        {maskedLetters.map((letter, i) => (
          <View
            key={i}
            style={[
              styles.letterBox,
              letter !== "_" && styles.letterBoxFilled,
            ]}
          >
            <Text
              style={[
                styles.letter,
                letter !== "_" && styles.letterRevealed,
              ]}
            >
              {letter === "_" ? " " : letter}
            </Text>
          </View>
        ))}
      </View>

      {/* Keyboard */}
      <Keyboard
        guessedLetters={gameState.guessedLetters || []}
        onGuess={handleGuess}
        disabled={!isMyTurn}
        currentWord={isMyTurn ? null : null} // no revelamos la palabra al rival
      />

      {/* Round End Modal */}
      <Modal
        visible={!!roundModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {roundModal?.isFinished ? (
              // GAME OVER
              <>
                <Text style={styles.modalBigEmoji}>
                  {roundModal.gameWinner === playerNumber
                    ? "🏆"
                    : roundModal.gameWinner === 0
                    ? "🤝"
                    : "💀"}
                </Text>
                <Text style={styles.modalTitle}>
                  {roundModal.gameWinner === playerNumber
                    ? "¡GANASTE EL DUELO!"
                    : roundModal.gameWinner === 0
                    ? "¡EMPATE!"
                    : "¡PERDISTE EL DUELO!"}
                </Text>
                <Text style={styles.modalWord}>
                  Última palabra: {roundModal.word}
                </Text>
                <View style={styles.finalScores}>
                  <View style={styles.finalScoreItem}>
                    <Text style={styles.finalScoreName}>
                      {roundModal.p1Name}
                    </Text>
                    <Text style={styles.finalScoreNum}>
                      {roundModal.p1Score}
                    </Text>
                  </View>
                  <Text style={styles.finalVs}>VS</Text>
                  <View style={styles.finalScoreItem}>
                    <Text style={styles.finalScoreName}>
                      {roundModal.p2Name}
                    </Text>
                    <Text style={styles.finalScoreNum}>
                      {roundModal.p2Score}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => navigation.replace("Home")}
                >
                  <Text style={styles.modalBtnText}>NUEVO JUEGO</Text>
                </TouchableOpacity>
              </>
            ) : (
              // ROUND END
              <>
                <Text style={styles.modalBigEmoji}>
                  {roundModal?.won ? "✅" : "❌"}
                </Text>
                <Text style={styles.modalTitle}>
                  {roundModal?.won ? "¡RONDA GANADA!" : "RONDA PERDIDA"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  La palabra era:
                </Text>
                <Text style={styles.modalRevealWord}>{roundModal?.word}</Text>
                <View style={styles.roundScores}>
                  <Text style={styles.roundScoreText}>
                    {roundModal?.p1Name}: {roundModal?.p1Score} pts
                  </Text>
                  <Text style={styles.roundScoreText}>
                    {roundModal?.p2Name}: {roundModal?.p2Score} pts
                  </Text>
                </View>
                <Text style={styles.nextRoundText}>
                  Siguiente ronda en unos segundos...
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  center: { alignItems: "center", justifyContent: "center" },
  loadingText: { color: COLORS.textSecondary, fontSize: 16 },

  // Score bar
  scoreBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerTag: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playerTagActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(124,77,255,0.15)",
  },
  playerTagName: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  playerTagScore: {
    color: COLORS.primaryLight,
    fontWeight: "900",
    fontSize: 22,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    position: "absolute",
    top: 8,
    right: 8,
  },
  turnDotOpponent: { backgroundColor: COLORS.accent },
  roundInfo: { alignItems: "center", paddingHorizontal: 12 },
  roundText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "700" },
  vsText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },

  // Turn banner
  turnBanner: {
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  turnBannerMe: { backgroundColor: "rgba(124,77,255,0.2)" },
  turnBannerOpponent: { backgroundColor: "rgba(255,64,129,0.1)" },
  turnBannerText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 13,
  },

  // Attempts
  attemptsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  attemptDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  attemptDotOk: { backgroundColor: COLORS.success },
  attemptDotWrong: { backgroundColor: COLORS.accent },
  attemptsText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginLeft: 6,
  },

  // Word
  wordContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    minHeight: 50,
  },
  letterBox: {
    width: 36,
    height: 44,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  letterBoxFilled: {
    borderBottomColor: COLORS.primaryLight,
  },
  letter: {
    color: "transparent",
    fontSize: 22,
    fontWeight: "900",
  },
  letterRevealed: {
    color: COLORS.textPrimary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    padding: 32,
    width: "100%",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
    gap: 12,
  },
  modalBigEmoji: { fontSize: 64 },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },
  modalSubtitle: { color: COLORS.textSecondary, fontSize: 13 },
  modalWord: { color: COLORS.textSecondary, fontSize: 14 },
  modalRevealWord: {
    color: COLORS.primaryLight,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 6,
  },
  roundScores: { gap: 4, alignItems: "center" },
  roundScoreText: { color: COLORS.textSecondary, fontSize: 14 },
  nextRoundText: { color: COLORS.textSecondary, fontSize: 12, fontStyle: "italic" },
  finalScores: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 8,
  },
  finalScoreItem: { alignItems: "center" },
  finalScoreName: { color: COLORS.textSecondary, fontSize: 13 },
  finalScoreNum: {
    color: COLORS.textPrimary,
    fontSize: 40,
    fontWeight: "900",
  },
  finalVs: {
    color: COLORS.primary,
    fontWeight: "900",
    fontSize: 18,
  },
  modalBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 2,
  },
});
