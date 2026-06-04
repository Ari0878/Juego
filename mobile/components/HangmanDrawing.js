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

const STROKE = {
  structure: { stroke: "#4A4A7A", strokeWidth: 3, strokeLinecap: "round" },
  body: { stroke: COLORS.accent, strokeWidth: 3, strokeLinecap: "round" },
  head: {
    stroke: COLORS.accent,
    strokeWidth: 3,
    fill: "none",
  },
};

export default function HangmanDrawing({ wrongAttempts, size = 200 }) {
  const s = size / 200; // scale factor

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ alignSelf: "center" }}
    >
      <Defs>
        <LinearGradient id="gallowGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4A4A7A" />
          <Stop offset="1" stopColor="#2A2A50" />
        </LinearGradient>
        <LinearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={COLORS.accent} />
          <Stop offset="1" stopColor={COLORS.primaryLight} />
        </LinearGradient>
      </Defs>

      {/* BASE - siempre visible */}
      <Line x1="20" y1="190" x2="180" y2="190" {...STROKE.structure} strokeWidth={4} />
      {/* POSTE VERTICAL */}
      <Line x1="60" y1="190" x2="60" y2="20" {...STROKE.structure} strokeWidth={4} />
      {/* POSTE HORIZONTAL */}
      <Line x1="60" y1="20" x2="130" y2="20" {...STROKE.structure} strokeWidth={4} />
      {/* SOPORTE DIAGONAL */}
      <Line x1="60" y1="50" x2="90" y2="20" {...STROKE.structure} strokeWidth={3} />
      {/* CUERDA */}
      <Line x1="130" y1="20" x2="130" y2="45" {...STROKE.structure} strokeWidth={3} />

      {/* CABEZA - intento 1 */}
      {wrongAttempts >= 1 && (
        <Circle
          cx="130"
          cy="58"
          r="13"
          {...STROKE.head}
          stroke={
            wrongAttempts >= 6
              ? COLORS.accent
              : `rgba(255,64,129,${0.4 + wrongAttempts * 0.1})`
          }
          strokeWidth={3}
        />
      )}

      {/* CUERPO - intento 2 */}
      {wrongAttempts >= 2 && (
        <Line x1="130" y1="71" x2="130" y2="120" stroke="url(#bodyGrad)" strokeWidth={3} strokeLinecap="round" />
      )}

      {/* BRAZO IZQUIERDO - intento 3 */}
      {wrongAttempts >= 3 && (
        <Line x1="130" y1="82" x2="110" y2="100" stroke={COLORS.primaryLight} strokeWidth={3} strokeLinecap="round" />
      )}

      {/* BRAZO DERECHO - intento 4 */}
      {wrongAttempts >= 4 && (
        <Line x1="130" y1="82" x2="150" y2="100" stroke={COLORS.primaryLight} strokeWidth={3} strokeLinecap="round" />
      )}

      {/* PIERNA IZQUIERDA - intento 5 */}
      {wrongAttempts >= 5 && (
        <Line x1="130" y1="120" x2="112" y2="148" stroke={COLORS.accent} strokeWidth={3} strokeLinecap="round" />
      )}

      {/* PIERNA DERECHA - intento 6 */}
      {wrongAttempts >= 6 && (
        <Line x1="130" y1="120" x2="148" y2="148" stroke={COLORS.accent} strokeWidth={3} strokeLinecap="round" />
      )}

      {/* Ojos tristes cuando muere */}
      {wrongAttempts >= 6 && (
        <G>
          <Line x1="124" y1="53" x2="127" y2="57" stroke={COLORS.accent} strokeWidth={2} strokeLinecap="round" />
          <Line x1="127" y1="53" x2="124" y2="57" stroke={COLORS.accent} strokeWidth={2} strokeLinecap="round" />
          <Line x1="133" y1="53" x2="136" y2="57" stroke={COLORS.accent} strokeWidth={2} strokeLinecap="round" />
          <Line x1="136" y1="53" x2="133" y2="57" stroke={COLORS.accent} strokeWidth={2} strokeLinecap="round" />
          {/* boca triste */}
          <Line x1="125" y1="64" x2="135" y2="62" stroke={COLORS.accent} strokeWidth={2} strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}
