import { NextRequest, NextResponse } from "next/server";
import { advanceClock } from "../../../../lib/engine/clock";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const hours = body.hours !== undefined ? Number(body.hours) : 1;

    if (Number.isNaN(hours) || hours <= 0 || !Number.isInteger(hours)) {
      return NextResponse.json(
        { error: "Hours to advance must be a positive integer" },
        { status: 400 }
      );
    }

    const result = await advanceClock(hours);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to advance clock";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
