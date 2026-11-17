import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  const { rows } = await client.query("select 1 as ok");
  if (rows[0]?.ok !== 1) {
    console.error("unexpected ping result");
    process.exitCode = 1;
  } else {
    console.log("ok");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
