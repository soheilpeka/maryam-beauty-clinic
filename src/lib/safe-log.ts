/** Never send exception messages, stacks, SQL parameters or request data to logs. */
export function logServerError(event: string, error: unknown): void {
  const candidate = error && typeof error === "object" && "code" in error ? error.code : null;
  // Prisma codes identify the failure without retaining its parameter-bearing message.
  const code = typeof candidate === "string" && /^P\d{4}$/.test(candidate) ? candidate : "INTERNAL";
  console.error(event, { code });
}
