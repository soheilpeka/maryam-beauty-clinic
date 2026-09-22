// Preload for running tsx scripts (prisma seed / bootstrap-admin) OUTSIDE Next.js.
// Keep this file at the repo root; the package.json prisma:* scripts pass it to node.
//
// 1. "server-only" throws when required outside a React Server Component build (Next
//    resolves it to empty.js via the react-server export condition; plain node cannot).
//    prisma/bootstrap-admin.ts imports src/lib/auth.ts, which is server-only by design.
//    Returning an empty object for that bare specifier makes the script runnable anywhere.
// 2. Sandbox-only extra: os.userInfo() can fail here (uv_os_get_passwd -> ENOMEM) and tsx's
//    temporary-directory module calls os.userInfo().username when process.geteuid is
//    missing - which on Windows it always is. Defining geteuid makes tsx take the euid
//    branch instead. Harmless: these scripts never use the real uid.
const Module = require("module");
if (typeof process.geteuid !== "function") process.geteuid = () => 0;
const origLoad = Module._load;
Module._load = function (request) {
  if (request === "server-only") return {};
  return origLoad.apply(this, arguments);
};