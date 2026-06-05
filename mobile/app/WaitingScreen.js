// app/WaitingScreen.js
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Share, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { SERVER_URL, COLORS } from "../config";

export default function WaitingScreen({ route, navigation }) {
  const { code, playerName, playerNumber } = route.params;
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("join_room", { code, playerName }));
    socket.on("new_round", (state) => navigation.replace("Game", { code, playerName, playerNumber, initialState: state }));
    socket.on("room_state", (state) => { if (state.status === "playing") navigation.replace("Game", { code, playerName, playerNumber, initialState: state }); });
    socket.on("error", ({ message }) => Alert.alert("Error", message));
    return () => socket.disconnect();
  }, []);

  const shareCode = async () => {
    await Share.share({ message: `Únete a mi duelo de Hangman!\nCódigo de sala: ${code}\nDescarga la app Hangman Duel` });
  };

  return (
    <View style={styles.container}>
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.replace("Home")}>
        <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
        <Text style={styles.backBtnText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.headerIcon}>
        <Ionicons name="time-outline" size={38} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>SALA CREADA</Text>
      <Text style={styles.titleSub}>Comparte el código con tu rival</Text>

      <View style={styles.codeCard}>
        <View style={styles.codeLabelRow}>
          <Ionicons name="key-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.codeLabel}>CÓDIGO DE SALA</Text>
        </View>
        <Text style={styles.code}>{code}</Text>
        <View style={styles.codeHintRow}>
          <View style={styles.codeHintDot} />
          <Text style={styles.codeHint}>Válido por 10 minutos</Text>
        </View>
      </View>

      <View style={styles.playerCard}>
        <Text style={styles.playerLabel}>JUGADOR 1</Text>
        <Text style={styles.playerName}>{playerName}</Text>
        <View style={styles.readyBadge}>
          <Ionicons name="checkmark" size={12} color={COLORS.success} />
          <Text style={styles.readyText}>LISTO</Text>
        </View>
      </View>

      <View style={styles.waitingBox}>
        <ActivityIndicator color={COLORS.primary} size="small" />
        <Text style={styles.waitingText}>Esperando al rival...</Text>
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={shareCode} activeOpacity={0.85}>
        <Ionicons name="share-outline" size={18} color="#fff" />
        <Text style={styles.shareBtnText}>Compartir código</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 16, overflow: "hidden" },
  decorCircle1: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: COLORS.primarySoft, top: -80, left: -60 },
  decorCircle2: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: COLORS.accentSoft, bottom: 40, right: -50 },
  backBtn: { position: "absolute", top: 52, left: 20, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, zIndex: 10 },
  backBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: "600" },
  headerIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.bgCard, alignItems: "center", justifyContent: "center", shadowColor: COLORS.shadowBlue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 6 },
  title: { color: COLORS.primaryDark, fontSize: 28, fontWeight: "900", letterSpacing: 4 },
  titleSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: -8 },
  codeCard: { backgroundColor: COLORS.bgCard, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 20, padding: 24, alignItems: "center", width: "100%", shadowColor: "rgba(59,130,246,0.2)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8 },
  codeLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  codeLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  code: { color: COLORS.primary, fontSize: 48, fontWeight: "900", letterSpacing: 12 },
  codeHintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  codeHintDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.mint },
  codeHint: { color: COLORS.textMuted, fontSize: 12 },
  playerCard: { backgroundColor: COLORS.primarySoft, borderWidth: 1.5, borderColor: COLORS.primaryLight, borderRadius: 16, padding: 16, width: "100%", alignItems: "center", gap: 4 },
  playerLabel: { color: COLORS.primary, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  playerName: { color: COLORS.primaryDark, fontSize: 22, fontWeight: "800" },
  readyBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.mintSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.mint },
  readyText: { color: COLORS.success, fontSize: 12, fontWeight: "700" },
  waitingBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14, width: "100%", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  waitingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: "600" },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, width: "100%", justifyContent: "center", shadowColor: "rgba(59,130,246,0.3)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 5 },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});