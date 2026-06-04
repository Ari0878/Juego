require("dotenv").config();

const { Client } = require("pg");

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    await client.connect();
    console.log("✅ Conectado a PostgreSQL");

    const result = await client.query("SELECT NOW()");
    console.log("Hora del servidor:", result.rows[0]);

    await client.end();
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testConnection();