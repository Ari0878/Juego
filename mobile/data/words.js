// words.js - API para generar palabras aleatorias en español
// Fallback local en caso de falla de red
export const LOCAL_WORDS = [
  "GATO", "MESA", "LUNA", "PINO", "ROCA",
  "NUBE", "PUMA", "TORO", "MANO", "FUEGO",
  "SELVA", "TIGRE", "NOCHE", "PARED", "LIBRO",
  "MONTE", "CIELO", "BARCO", "CARNE", "PUENTE",
  "CABRA", "PALMA", "HIERBA", "BRUMA", "ARBOL",
  "PLAYA", "TIERRA", "VIENTO", "PIEDRA", "FLORES",
  "CIUDAD", "BOSQUE", "CAMINO", "ESPEJO", "LLAMAS",
];

/**
 * Obtiene una palabra aleatoria desde API JSON
 * Si falla, usa el banco local como respaldo.
 *
 * @param {string[]} usedWords - palabras ya usadas en esta sesión
 * @returns {Promise<{ word: string, source: "api" | "local" }>}
 */
export async function getRandomWord(usedWords = []) {
  try {
    // Intentar múltiples APIs para obtener palabras en español
    let word = null;
    
    // Intento 1: Datamuse API con vocabulario español
    try {
      const length = Math.floor(Math.random() * 7) + 4;
      const response = await fetch(`https://api.datamuse.com/words?sp=${"?".repeat(length)}&max=100&v=es`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.length);
          const rawWord = data[randomIndex].word.toUpperCase().normalize("NFD")
            .replace(/([^Nn\u0303\u00D1\u00F1])\u0303/g, "$1")
            .normalize("NFC")
            .replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
          if (rawWord && rawWord.length >= 3 && rawWord.length <= 12 && !usedWords.includes(rawWord)) {
            word = rawWord;
          }
        }
      }
    } catch (e) {
      console.log("Datamuse falló, intentando siguiente API");
    }
    
    // Intento 2: random-word-api si Datamuse falló
    if (!word) {
      try {
        const response = await fetch("https://random-word-api.herokuapp.com/word?lang=es&number=10");
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const validWords = data.filter(w => {
              const w2 = w.toUpperCase().normalize("NFD")
                .replace(/([^Nn\u0303\u00D1\u00F1])\u0303/g, "$1")
                .normalize("NFC")
                .replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
              return w2.length >= 3 && w2.length <= 12 && !usedWords.includes(w2);
            });
            if (validWords.length > 0) {
              const randomIndex = Math.floor(Math.random() * validWords.length);
              word = validWords[randomIndex].toUpperCase().normalize("NFD")
                .replace(/([^Nn\u0303\u00D1\u00F1])\u0303/g, "$1")
                .normalize("NFC")
                .replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
            }
          }
        }
      } catch (e) {
        console.log("random-word-api falló");
      }
    }
    
    if (!word) {
      throw new Error("No se pudo obtener palabra de ninguna API");
    }

    return { word, source: "api" };
  } catch (e) {
    console.warn("Todas las APIs fallaron:", e.message, "— usando banco local");
    return getRandomWordFallback(usedWords);
  }
}

function getRandomWordFallback(usedWords = []) {
  const available = LOCAL_WORDS.filter((w) => !usedWords.includes(w));
  const pool = available.length > 0 ? available : LOCAL_WORDS;
  const idx = Math.floor(Math.random() * pool.length);
  return { word: pool[idx], source: "local" };
}