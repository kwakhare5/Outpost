import { NextResponse } from "next/server";
import { getTimeClock } from "../../../lib/engine/clock";

export async function GET() {
  try {
    const clock = await getTimeClock();
    return NextResponse.json(clock);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch time clock";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
