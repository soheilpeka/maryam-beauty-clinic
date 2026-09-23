/**
 * Audit logging for admin actions.
 *
 * Every state-changing /api/admin route writes one record so the salon has a
 * tamper-evident trail of who did what, when, and from where. Rows are append-only;
 * nothing in the dashboard deletes them (the only removal path is deleting the admin,
 * which nulls adminId but keeps the record).
 *
 * The write is awaited so the audit entry exists by the time the response is returned
 * (tests assert on it). A database failure must not undo a legitimate action, so errors
 * are logged and swallowed instead of propagated.
 */
import "server-only";
import { prisma } from "@/lib/prisma";

export interface AuditEntry {
  /** AdminUser id of the actor */
  adminId: string;
  /** Machine-readable action key, e.g. "booking.confirm" */
  action: string;
  /** Entity type the action targeted, e.g. "Booking" */
  targetType?: string;
  /** Entity id the action targeted */
  targetId?: string;
  /** Human-readable detail; never secrets or tokens */
  detail?: string;
  /** Client IP of the request, best effort */
  ip?: string;
}

/** Persist one audit record. Never throws: logging must not break the action it records. */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: entry.adminId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        detail: entry.detail,
        ip: entry.ip,
      },
    });
  } catch (e) {
    console.error("audit log write failed", e);
  }
}

/** Count entries matching an action + target (used by tests; also handy for future stats). */
export async function countAuditFor(action: string, targetId: string): Promise<number> {
  return prisma.auditLog.count({ where: { action, targetId } });
}
