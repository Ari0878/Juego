// components/Keyboard.js
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../config";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const screenWidth = Dimensions.get("window").width;

export default function Keyboard({ guessedLetters, onGuess, disabled, currentWord }) {
  const getLetterStatus = (letter) => {
    if (!guessedLetters.includes(letter)) return "unused";
    if (currentWord && currentWord.includes(letter)) return "correct";
    return "wrong";
  };

  const renderKey = (letter) => {
    const status = getLetterStatus(letter);
    return (
      <TouchableOpacity
        key={letter}
        style={[
          styles.key,
          status === "correct" && styles.keyCorrect,
          status === "wrong" && styles.keyWrong,
          (disabled || status !== "unused") && styles.keyDisabled,
        ]}
        onPress={() => onGuess(letter)}
        disabled={disabled || status !== "unused"}
        activeOpacity={0.7}
      >
        {status === "correct" ? (
          <Ionicons name="checkmark" size={12} color={COLORS.success} />
        ) : status === "wrong" ? (
          <Ionicons name="close" size={12} color={COLORS.accent} />
        ) : null}
        <Text style={[
          styles.keyText,
          status === "correct" && styles.keyTextCorrect,
          status === "wrong" && styles.keyTextWrong,
        ]}>
          {letter}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {ROWS.map((row, ri) => (
        <ScrollView
          key={ri}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowContent}
          scrollEnabled={false}
        >
          {row.map(renderKey)}
        </ScrollView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 5,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  rowContent: {
    flexDirection: "row",
    justifyContent: "center",
    flexGrow: 1,
    gap: 3,
    paddingHorizontal: 0,
  },
  key: {
    width: screenWidth < 380 ? 28 : screenWidth < 420 ? 30 : 32,
    height: screenWidth < 380 ? 38 : screenWidth < 420 ? 40 : 42,
    borderRadius: 8,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadowBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  keyCorrect:  { backgroundColor: COLORS.mintSoft,   borderColor: COLORS.mint },
  keyWrong:    { backgroundColor: COLORS.dangerSoft, borderColor: COLORS.accentLight },
  keyDisabled: { opacity: 0.55, shadowOpacity: 0, elevation: 0 },
  keyText:        { color: COLORS.textPrimary, fontSize: screenWidth < 380 ? 11 : screenWidth < 420 ? 12 : 13, fontWeight: "800" },
  keyTextCorrect: { color: COLORS.success },
  keyTextWrong:   { color: COLORS.accent },
});