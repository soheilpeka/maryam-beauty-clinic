// Loaded before scripts that may otherwise fall back to the local .env database.
const stagingUrl = process.env.DATABASE_URL?.trim();
const stagingToken = process.env.DATABASE_AUTH_TOKEN?.trim();

if (!stagingUrl?.startsWith("libsql://") || !stagingToken) {
  console.error("Staging requires a remote libsql:// DATABASE_URL and DATABASE_AUTH_TOKEN in .env.staging. No database changes were made.");
  process.exit(1);
}
