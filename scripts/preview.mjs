/** Own an isolated production build so other builds cannot invalidate preview CSS/chunks. */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const port = Number(process.env.PREVIEW_PORT ?? "3050");
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid preview port.");
const probe = createServer();
try {
  await new Promise((yes, no) => { probe.once("error", no); probe.listen(port, "localhost", yes); });
} catch {
  console.error(`Port ${port} is already in use. Stop its existing preview before starting a new one.`);
  process.exit(1);
} finally { probe.close(); }

const environment = { ...process.env, CLINIC_PREVIEW_BUILD: "1", NEXT_PUBLIC_BASE_URL: `http://localhost:${port}` };
let child;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child?.kill(signal));
function run(args) {
  return new Promise((done, fail) => {
    child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), ...args], { env: environment, stdio: "inherit" });
    child.once("error", fail);
    child.once("exit", code => done(code ?? 1));
  });
}
const build = await run(["build", "--webpack"]);
process.exitCode = build || await run(["start", "-p", String(port)]);
