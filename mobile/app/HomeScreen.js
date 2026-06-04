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
import { SERVER_URL, COLORS } from "../config";

export default function HomeScreen({ navigation }) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null); // "create" | "join"

  const createRoom = async () => {
    if (!playerName.trim()) {
      Alert.alert("¡Espera!", "Ingresa tu nombre primero");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando sala");
      navigation.navigate("Waiting", {
        code: data.code,
        playerName: playerName.trim(),
        playerNumber: 1,
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim()) {
      Alert.alert("¡Espera!", "Ingresa tu nombre primero");
      return;
    }
    if (roomCode.trim().length < 6) {
      Alert.alert("¡Espera!", "Ingresa el código de 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${SERVER_URL}/rooms/${roomCode.trim().toUpperCase()}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerName: playerName.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error uniéndose a sala");
      navigation.navigate("Game", {
        code: data.code,
        playerName: playerName.trim(),
        playerNumber: 2,
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🪢</Text>
          <Text style={styles.title}>HANGMAN</Text>
          <Text style={styles.subtitle}>DUEL</Text>
          <Text style={styles.tagline}>Adivina antes de que sea tarde</Text>
        </View>

        {/* Name input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>TU NOMBRE</Text>
          <TextInput
            style={styles.input}
            placeholder="Escribe tu nombre..."
            placeholderTextColor={COLORS.textSecondary}
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={20}
            autoCapitalize="words"
          />
        </View>

        {/* Mode selector */}
        {!mode && (
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeBtn, styles.modeBtnCreate]}
              onPress={() => setMode("create")}
            >
              <Text style={styles.modeEmoji}>🏠</Text>
              <Text style={styles.modeBtnText}>CREAR SALA</Text>
              <Text style={styles.modeBtnSub}>Tú decides el código</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, styles.modeBtnJoin]}
              onPress={() => setMode("join")}
            >
              <Text style={styles.modeEmoji}>🔗</Text>
              <Text style={styles.modeBtnText}>UNIRSE</Text>
              <Text style={styles.modeBtnSub}>Con código de sala</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Create room */}
        {mode === "create" && (
          <View style={styles.actionSection}>
            <Text style={styles.infoText}>
              Crea la sala y comparte el código con tu amigo
            </Text>
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={createRoom}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>CREAR SALA →</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnBack} onPress={() => setMode(null)}>
              <Text style={styles.btnBackText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Join room */}
        {mode === "join" && (
          <View style={styles.actionSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CÓDIGO DE SALA</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="XXXXXX"
                placeholderTextColor={COLORS.textSecondary}
                value={roomCode}
                onChangeText={(t) => setRoomCode(t.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                letterSpacing={8}
              />
            </View>
            <TouchableOpacity
              style={[styles.btnSecondary, loading && styles.btnDisabled]}
              onPress={joinRoom}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>UNIRSE AL DUELO →</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnBack} onPress={() => setMode(null)}>
              <Text style={styles.btnBackText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 40 },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 8,
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 16,
    marginTop: -8,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 12,
    letterSpacing: 1,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 12,
    borderColor: COLORS.primary,
  },
  modeSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
  },
  modeBtnCreate: {
    backgroundColor: "rgba(124,77,255,0.15)",
    borderColor: COLORS.primary,
  },
  modeBtnJoin: {
    backgroundColor: "rgba(255,64,129,0.15)",
    borderColor: COLORS.accent,
  },
  modeEmoji: { fontSize: 32, marginBottom: 8 },
  modeBtnText: {
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1,
  },
  modeBtnSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  actionSection: { gap: 12 },
  infoText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 13,
    marginBottom: 8,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnSecondary: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
  },
  btnBack: { alignItems: "center", padding: 12 },
  btnBackText: { color: COLORS.textSecondary, fontSize: 14 },
});
