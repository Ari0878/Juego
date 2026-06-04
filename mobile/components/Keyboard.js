// components/Keyboard.js
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { COLORS } from "../config";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export default function Keyboard({ guessedLetters, onGuess, disabled, currentWord }) {
  const getLetterStatus = (letter) => {
    if (!guessedLetters.includes(letter)) return "unused";
    if (currentWord && currentWord.includes(letter)) return "correct";
    return "wrong";
  };

  return (
    <View style={styles.container}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((letter) => {
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
                <Text
                  style={[
                    styles.keyText,
                    status === "correct" && styles.keyTextCorrect,
                    status === "wrong" && styles.keyTextWrong,
                  ]}
                >
                  {letter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  key: {
    width: 30,
    height: 38,
    borderRadius: 6,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  keyCorrect: {
    backgroundColor: "rgba(0,230,118,0.2)",
    borderColor: COLORS.success,
  },
  keyWrong: {
    backgroundColor: "rgba(255,64,129,0.1)",
    borderColor: "rgba(255,64,129,0.3)",
  },
  keyDisabled: {
    opacity: 0.5,
  },
  keyText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  keyTextCorrect: {
    color: COLORS.success,
  },
  keyTextWrong: {
    color: "rgba(255,255,255,0.3)",
  },
});
