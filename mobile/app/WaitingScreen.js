// app/WaitingScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Share,
  TouchableOpacity,
  Alert,
} from "react-native";
import { io } from "socket.io-client";
import { SERVER_URL, COLORS } from "../config";

export default function WaitingScreen({ route, navigation }) {
  const { code, playerName, playerNumber } = route.params;
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { code, playerName });
    });

    socket.on("new_round", (state) => {
      // El juego comenzó, navegar a Game
      navigation.replace("Game", { code, playerName, playerNumber, initialState: state });
    });

    socket.on("room_state", (state) => {
      if (state.status === "playing") {
        navigation.replace("Game", { code, playerName, playerNumber, initialState: state });
      }
    });

    socket.on("error", ({ message }) => {
      Alert.alert("Error", message);
    });

    return () => socket.disconnect();
  }, []);

  const shareCode = async () => {
    await Share.share({
      message: `¡Únete a mi duelo de Hangman! 🪢\nCódigo de sala: ${code}\nDescarga la app Hangman Duel`,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⏳</Text>
      <Text style={styles.title}>SALA CREADA</Text>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>CÓDIGO DE SALA</Text>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.codeHint}>Comparte este código con tu rival</Text>
      </View>

      <View style={styles.playerCard}>
        <Text style={styles.playerLabel}>JUGADOR 1 (TÚ)</Text>
        <Text style={styles.playerName}>{playerName}</Text>
        <View style={styles.readyBadge}>
          <Text style={styles.readyText}>✓ LISTO</Text>
        </View>
      </View>

      <View style={styles.waitingBox}>
        <ActivityIndicator color={COLORS.primary} size="small" />
        <Text style={styles.waitingText}>Esperando a Jugador 2...</Text>
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
        <Text style={styles.shareBtnText}>📤 Compartir código</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  emoji: { fontSize: 60 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
  },
  codeCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
  },
  codeLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  code: {
    color: COLORS.primaryLight,
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 12,
  },
  codeHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  playerCard: {
    backgroundColor: "rgba(124,77,255,0.15)",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    alignItems: "center",
  },
  playerLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  playerName: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginVertical: 4,
  },
  readyBadge: {
    backgroundColor: "rgba(0,230,118,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  readyText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
  },
  waitingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    padding: 14,
    width: "100%",
    justifyContent: "center",
  },
  waitingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  shareBtn: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    width: "100%",
    alignItems: "center",
  },
  shareBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
});
