import { NextRequest, NextResponse } from "next/server";
import { confirmDoorstepCount } from "../../../../../lib/engine/transit";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const transferId = params?.id;

    if (!transferId) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const receivedQty = body.receivedQty;
    const damagedQty = body.damagedQty;

    if (typeof receivedQty !== "number" || typeof damagedQty !== "number") {
      return NextResponse.json(
        { error: "Both receivedQty and damagedQty must be numbers" },
        { status: 400 }
      );
    }

    const transfer = await confirmDoorstepCount({
      transferId,
      receivedQty,
      damagedQty,
      clockTime: body.clockTime,
      asOfTime: body.asOfTime,
    });

    return NextResponse.json({
      success: true,
      transfer,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
