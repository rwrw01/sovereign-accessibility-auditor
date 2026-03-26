import pg from "pg";

console.log("Testing with pg driver...");

const client = new pg.Client({
  host: "127.0.0.1",
  port: 5432,
  user: "saa",
  password: "saa_dev_password",
  database: "saa",
});

try {
  await client.connect();
  const result = await client.query("SELECT 1 as ok");
  console.log("DB OK:", result.rows);
  await client.end();
} catch (e) {
  console.error("DB FAIL:", (e as Error).message);
  process.exit(1);
}
