// app/HomeScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SERVER_URL, COLORS } from "../config";

export default function HomeScreen({ route, navigation }) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null);
  const [difficulty, setDifficulty] = useState("normal");

  React.useEffect(() => {
    const params = route?.params;
    if (!params) return;
    if (params.playerName) setPlayerName(params.playerName);
    if (params.mode === "solo") setMode("solo");
    if (params.difficulty) setDifficulty(params.difficulty);
  }, [route?.params]);

  const createRoom = async () => {
    if (!playerName.trim()) { Alert.alert("¡Espera!", "Ingresa tu nombre primero"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });
      const text = await res.text();
      if (!text || text.trim() === "") {
        throw new Error("El servidor no respondió correctamente. El backend en Render puede estar caído o teniendo problemas de conexión.");
      }
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error || "Error creando sala");
      navigation.navigate("Waiting", { code: data.code, playerName: playerName.trim(), playerNumber: 1 });
    } catch (e) {
      if (e.message.includes("JSON")) {
        Alert.alert("Error", "El servidor devolvió una respuesta inválida. Verifica que el backend esté corriendo correctamente.");
      } else {
        Alert.alert("Error", e.message);
      }
    }
    finally { setLoading(false); }
  };

  const joinRoom = async () => {
    if (!playerName.trim()) { Alert.alert("¡Espera!", "Ingresa tu nombre primero"); return; }
    if (roomCode.trim().length < 6) { Alert.alert("¡Espera!", "Ingresa el código de 6 caracteres"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/rooms/${roomCode.trim().toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });
      const text = await res.text();
      if (!text || text.trim() === "") {
        throw new Error("El servidor no respondió correctamente. El backend en Render puede estar caído o teniendo problemas de conexión.");
      }
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error || "Error uniéndose a sala");
      navigation.navigate("Game", { code: data.code, playerName: playerName.trim(), playerNumber: 2 });
    } catch (e) {
      if (e.message.includes("JSON")) {
        Alert.alert("Error", "El servidor devolvió una respuesta inválida. Verifica que el backend esté corriendo correctamente.");
      } else {
        Alert.alert("Error", e.message);
      }
    }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.decorCircle3} />

        {/* Title */}
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Ionicons name="skull-outline" size={42} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>HANGMAN</Text>
          <View style={styles.subtitleRow}>
            <View style={styles.subtitleLine} />
            <Text style={styles.subtitle}>DUEL</Text>
            <View style={styles.subtitleLine} />
          </View>
          <Text style={styles.tagline}>Adivina antes de que sea tarde</Text>
        </View>

        {/* Name input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>TU NOMBRE</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Escribe tu nombre..."
              placeholderTextColor={COLORS.textMuted}
              value={playerName}
              onChangeText={setPlayerName}
              maxLength={20}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Mode selector */}
        {!mode && (
          <View style={styles.modeSelector}>
            <TouchableOpacity style={[styles.modeBtn, styles.modeBtnCreate]} onPress={() => setMode("create")} activeOpacity={0.8}>
              <View style={[styles.modeBtnIcon, { backgroundColor: COLORS.primarySoft }]}>
                <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
              </View>
              <Text style={[styles.modeBtnText, { color: COLORS.primaryDark }]}>CREAR SALA</Text>
              <Text style={styles.modeBtnSub}>Invita a un amigo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modeBtn, styles.modeBtnJoin]} onPress={() => setMode("join")} activeOpacity={0.8}>
              <View style={[styles.modeBtnIcon, { backgroundColor: COLORS.accentSoft }]}>
                <Ionicons name="enter-outline" size={28} color={COLORS.accent} />
              </View>
              <Text style={[styles.modeBtnText, { color: "#C2185B" }]}>UNIRSE</Text>
              <Text style={styles.modeBtnSub}>Con código</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modeBtn, styles.modeBtnSolo]} onPress={() => setMode("solo")} activeOpacity={0.8}>
              <View style={[styles.modeBtnIcon, { backgroundColor: "#EDE9FE" }]}>
                <Ionicons name="game-controller-outline" size={28} color="#6D28D9" />
              </View>
              <Text style={[styles.modeBtnText, { color: "#6D28D9" }]}>SOLO</Text>
              <Text style={styles.modeBtnSub}>Un jugador</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Create room */}
        {mode === "create" && (
          <View style={styles.actionSection}>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primaryDark} style={{ marginRight: 6 }} />
              <Text style={styles.infoText}>Crea la sala y comparte el código con tu amigo</Text>
            </View>
            <TouchableOpacity style={[styles.btnPrimary, loading && styles.btnDisabled]} onPress={createRoom} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <View style={styles.btnInner}>
                  <Text style={styles.btnText}>CREAR SALA</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnBack} onPress={() => setMode(null)}>
              <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
              <Text style={styles.btnBackText}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Join room */}
        {mode === "join" && (
          <View style={styles.actionSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CÓDIGO DE SALA</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="XXXXXX"
                  placeholderTextColor={COLORS.textMuted}
                  value={roomCode}
                  onChangeText={(t) => setRoomCode(t.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                />
              </View>
            </View>
            <TouchableOpacity style={[styles.btnAccent, loading && styles.btnDisabled]} onPress={joinRoom} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <View style={styles.btnInner}>
                  <Text style={styles.btnText}>UNIRSE AL DUELO</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnBack} onPress={() => setMode(null)}>
              <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
              <Text style={styles.btnBackText}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Solo mode */}
        {mode === "solo" && (
          <View style={styles.actionSection}>
            <View style={styles.infoBox}>
              <Ionicons name="trophy-outline" size={16} color={COLORS.primaryDark} style={{ marginRight: 6 }} />
              <Text style={styles.infoText}>Elige tu dificultad</Text>
            </View>
            <View style={styles.difficultyRow}>
              {[
                { key: "easy",   label: "FÁCIL",   sub: "7 intentos", icon: "happy-outline",     color: COLORS.mint,    soft: COLORS.mintSoft },
                { key: "normal", label: "NORMAL",  sub: "5 intentos", icon: "remove-circle-outline", color: COLORS.primary, soft: COLORS.primarySoft },
                { key: "hard",   label: "DIFÍCIL", sub: "3 intentos", icon: "skull-outline",     color: COLORS.accent,  soft: COLORS.accentSoft },
              ].map(({ key, label, sub, icon, color, soft }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.diffBtn, difficulty === key && { backgroundColor: soft, borderColor: color, borderWidth: 2 }]}
                  onPress={() => setDifficulty(key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={icon} size={22} color={difficulty === key ? color : COLORS.textMuted} />
                  <Text style={[styles.diffText, difficulty === key && { color }]}>{label}</Text>
                  <Text style={styles.diffSub}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={() => {
                if (!playerName.trim()) { Alert.alert("¡Espera!", "Ingresa tu nombre primero"); return; }
                navigation.replace("Game", { singlePlayer: true, difficulty, playerName: playerName.trim(), playerNumber: 1 });
              }}
              activeOpacity={0.85}
            >
              <View style={styles.btnInner}>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.btnText}>JUGAR</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnBack} onPress={() => setMode(null)}>
              <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
              <Text style={styles.btnBackText}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60, justifyContent: "center", overflow: "hidden" },
  decorCircle1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: COLORS.primarySoft, top: -60, right: -60 },
  decorCircle2: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.accentSoft, bottom: 80, left: -50 },
  decorCircle3: { position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.skySoft, top: 200, right: 20 },
  header: { alignItems: "center", marginBottom: 36 },
  iconWrapper: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.bgCard, alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: COLORS.shadowBlue, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8 },
  title: { color: COLORS.primaryDark, fontSize: 42, fontWeight: "900", letterSpacing: 8 },
  subtitleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: -4, marginBottom: 10 },
  subtitleLine: { height: 2, width: 28, backgroundColor: COLORS.accent, borderRadius: 1 },
  subtitle: { color: COLORS.accent, fontSize: 20, fontWeight: "900", letterSpacing: 14 },
  tagline: { color: COLORS.textSecondary, fontSize: 13, letterSpacing: 0.5 },
  inputGroup: { marginBottom: 20 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1.5, marginBottom: 8 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bgCard, borderWidth: 2, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, shadowColor: COLORS.shadowBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 16 },
  codeInput: { textAlign: "center", fontSize: 28, fontWeight: "900", letterSpacing: 12, color: COLORS.accent },
  modeSelector: { flexDirection: "row", gap: 10, marginBottom: 20 },
  modeBtn: { flex: 1, padding: 16, borderRadius: 18, alignItems: "center", borderWidth: 1.5, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  modeBtnCreate: { backgroundColor: COLORS.bgCard, borderColor: COLORS.borderStrong, shadowColor: COLORS.shadowBlue },
  modeBtnJoin:   { backgroundColor: COLORS.bgCard, borderColor: COLORS.accentLight,   shadowColor: COLORS.shadowPink },
  modeBtnSolo:   { backgroundColor: COLORS.bgCard, borderColor: "#C4B5FD",             shadowColor: "rgba(167,139,250,0.2)" },
  modeBtnIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  modeBtnText: { fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  modeBtnSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  actionSection: { gap: 12 },
  infoBox: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.primarySoft, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  infoText: { color: COLORS.primaryDark, fontSize: 13, fontWeight: "600", flex: 1 },
  difficultyRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  diffBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.bgCard, borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center", gap: 4, shadowColor: COLORS.shadowBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  diffText: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 11, letterSpacing: 0.5 },
  diffSub: { color: COLORS.textMuted, fontSize: 10 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: "center", shadowColor: "rgba(59,130,246,0.35)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 14, elevation: 6 },
  btnAccent:  { backgroundColor: COLORS.accent,  padding: 16, borderRadius: 14, alignItems: "center", shadowColor: "rgba(244,114,182,0.35)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 14, elevation: 6 },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  btnBack: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12 },
  btnBackText: { color: COLORS.textSecondary, fontSize: 14 },
});