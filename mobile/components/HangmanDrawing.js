// components/HangmanDrawing.js
import React from "react";
import Svg, {
  Circle,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from "react-native-svg";
import { COLORS } from "../config";

export default function HangmanDrawing({ wrongAttempts, size = 200 }) {
  // Structure color: blue-gray light
  const structureColor = COLORS.primaryLight;
  const bodyColor = COLORS.primary;
  const headColor = COLORS.primaryDark;
  const limbColor = COLORS.sky;
  const deathColor = COLORS.accent;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ alignSelf: "center" }}
    >
      <Defs>
        <LinearGradient id="gallowGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={COLORS.primaryLight} />
          <Stop offset="1" stopColor={COLORS.border} />
        </LinearGradient>
        <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={COLORS.primary} />
          <Stop offset="1" stopColor={COLORS.sky} />
        </LinearGradient>
      </Defs>

      {/* BASE */}
      <Line x1="20" y1="190" x2="180" y2="190"
        stroke={structureColor} strokeWidth={5} strokeLinecap="round" />
      {/* POSTE VERTICAL */}
      <Line x1="60" y1="190" x2="60" y2="20"
        stroke="url(#gallowGrad)" strokeWidth={5} strokeLinecap="round" />
      {/* POSTE HORIZONTAL */}
      <Line x1="60" y1="20" x2="130" y2="20"
        stroke={structureColor} strokeWidth={4} strokeLinecap="round" />
      {/* SOPORTE DIAGONAL */}
      <Line x1="60" y1="52" x2="90" y2="20"
        stroke={structureColor} strokeWidth={3} strokeLinecap="round" />
      {/* CUERDA */}
      <Line x1="130" y1="20" x2="130" y2="44"
        stroke={COLORS.textMuted} strokeWidth={3} strokeLinecap="round" />

      {/* CABEZA */}
      {wrongAttempts >= 1 && (
        <Circle
          cx="130" cy="57" r="13"
          stroke={wrongAttempts >= 6 ? deathColor : headColor}
          strokeWidth={3}
          fill={wrongAttempts >= 6 ? COLORS.dangerSoft : COLORS.primarySoft}
        />
      )}

      {/* CUERPO */}
      {wrongAttempts >= 2 && (
        <Line x1="130" y1="70" x2="130" y2="120"
          stroke="url(#bodyGrad)" strokeWidth={3} strokeLinecap="round" />
      )}

      {/* BRAZO IZQUIERDO */}
      {wrongAttempts >= 3 && (
        <Line x1="130" y1="82" x2="110" y2="102"
          stroke={limbColor} strokeWidth={3} strokeLinecap="round" />
      )}

      {/* BRAZO DERECHO */}
      {wrongAttempts >= 4 && (
        <Line x1="130" y1="82" x2="150" y2="102"
          stroke={limbColor} strokeWidth={3} strokeLinecap="round" />
      )}

      {/* PIERNA IZQUIERDA */}
      {wrongAttempts >= 5 && (
        <Line x1="130" y1="120" x2="112" y2="148"
          stroke={COLORS.sky} strokeWidth={3} strokeLinecap="round" />
      )}

      {/* PIERNA DERECHA */}
      {wrongAttempts >= 6 && (
        <Line x1="130" y1="120" x2="148" y2="148"
          stroke={deathColor} strokeWidth={3} strokeLinecap="round" />
      )}

      {/* Cara triste cuando muere */}
      {wrongAttempts >= 6 && (
        <G>
          <Line x1="124" y1="52" x2="127" y2="56" stroke={deathColor} strokeWidth={2} strokeLinecap="round" />
          <Line x1="127" y1="52" x2="124" y2="56" stroke={deathColor} strokeWidth={2} strokeLinecap="round" />
          <Line x1="133" y1="52" x2="136" y2="56" stroke={deathColor} strokeWidth={2} strokeLinecap="round" />
          <Line x1="136" y1="52" x2="133" y2="56" stroke={deathColor} strokeWidth={2} strokeLinecap="round" />
          {/* boca triste */}
          <Line x1="125" y1="64" x2="135" y2="62" stroke={deathColor} strokeWidth={2} strokeLinecap="round" />
        </G>
      )}

      {/* Cara feliz / neutral cuando vive */}
      {wrongAttempts >= 1 && wrongAttempts < 6 && (
        <G>
          <Circle cx="126" cy="55" r="1.5" fill={headColor} />
          <Circle cx="134" cy="55" r="1.5" fill={headColor} />
          <Line x1="126" y1="63" x2="134" y2="63" stroke={headColor} strokeWidth={1.5} strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}