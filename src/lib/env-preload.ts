/**
 * Env preload for scripts (tsx/prisma seed) and tests: loads .env into process.env before any
 * module that reads env is evaluated. Import this FIRST in those entry points.
 */
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

try {
  const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
} catch {
  /* .env is optional when the environment already provides the variables */
}