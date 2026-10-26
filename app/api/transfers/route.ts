import { NextResponse } from "next/server";
import { getAllTransfers } from "../../../lib/engine/transit";

export async function GET() {
  try {
    const transfers = await getAllTransfers();
    return NextResponse.json({
      transfers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
