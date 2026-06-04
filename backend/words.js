// words.js - Banco de palabras local + integración palabras.dev

// Banco local de 25 palabras (3-7 letras, sin acentos, solo letras del español básico)
const LOCAL_WORDS = [
  "GATO", "MESA", "LUNA", "PINO", "ROCA",
  "NUBE", "PUMA", "LENA", "TORO", "MANO",
  "FUEGO", "BRUMA", "SELVA", "TIGRE", "NOCHE",
  "PARED", "LIBRO", "MONTE", "CIELO", "BARCO",
  "CARNE", "HIERBA", "PUENTE", "CABRA", "PALMA"
];

// Verifica que una palabra cumple las reglas
function isValidWord(word) {
  if (!word) return false;
  const upper = word.toUpperCase();
  // Solo letras A-Z (español sin acentos para simplicidad)
  const validChars = /^[A-ZÁÉÍÓÚÜÑH]+$/i;
  if (!validChars.test(upper)) return false;
  const len = upper.length;
  if (len < 3 || len > 7) return false;
  return true;
}

// Normaliza la palabra: quita acentos, mayúsculas
function normalizeWord(word) {
  return word
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z]/g, "");
}

// Intenta obtener palabras de palabras.dev (API pública)
async function fetchFromPalabrasDev() {
  try {
    const fetch = require("node-fetch");
    // palabras.dev endpoint: GET /palabra/random
    const res = await fetch("https://palabras.dev/api/palabra/random", {
      timeout: 3000,
    });
    if (!res.ok) return null;
    const data = await res.json();
    // La API devuelve { palabra: "...", ... }
    if (data && data.palabra) {
      const word = normalizeWord(data.palabra);
      if (isValidWord(word)) return word;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Obtiene múltiples palabras válidas de palabras.dev
async function fetchBatchFromPalabrasDev(count = 5) {
  const words = [];
  const promises = Array.from({ length: count * 2 }, () =>
    fetchFromPalabrasDev()
  );
  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value && !words.includes(r.value)) {
      words.push(r.value);
      if (words.length >= count) break;
    }
  }
  return words;
}

// Obtiene una palabra aleatoria (intenta palabras.dev, cae en local)
async function getRandomWord(usedWords = []) {
  // Primero intenta palabras.dev
  const apiWord = await fetchFromPalabrasDev();
  if (apiWord && !usedWords.includes(apiWord)) {
    return { word: apiWord, source: "palabras.dev" };
  }

  // Cae al banco local
  const available = LOCAL_WORDS.filter((w) => !usedWords.includes(w));
  if (available.length === 0) {
    // Si ya usó todas, reinicia
    const idx = Math.floor(Math.random() * LOCAL_WORDS.length);
    return { word: LOCAL_WORDS[idx], source: "local" };
  }
  const idx = Math.floor(Math.random() * available.length);
  return { word: available[idx], source: "local" };
}

module.exports = { getRandomWord, LOCAL_WORDS, isValidWord, normalizeWord };
