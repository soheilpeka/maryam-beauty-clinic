import { NextResponse } from "next/server";

// Readiness does not access the database being prepared by test setup.
export function GET() {
  return NextResponse.json({ ready: true });
}
