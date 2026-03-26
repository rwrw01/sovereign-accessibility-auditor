import postgres from "postgres";

console.log("Testing DB on port 15432...");

const sql = postgres("postgresql://saa:saa_dev_password@127.0.0.1:15432/saa", {
  connect_timeout: 5,
  idle_timeout: 5,
});

try {
  const result = await sql`SELECT 1 as ok`;
  console.log("DB OK:", JSON.stringify(result));
} catch (e) {
  console.error("DB FAIL:", (e as Error).message);
} finally {
  await sql.end();
  process.exit(0);
}
