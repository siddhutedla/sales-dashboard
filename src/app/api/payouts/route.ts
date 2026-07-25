import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const user = await getCurrentUser(userId);
    const repId = request.nextUrl.searchParams.get("repId");

    const where: any = {};
    if (user.role === "SALES_REP") {
      where.repId = userId;
    } else if (repId) {
      where.repId = repId;
    }

    const payouts = await prisma.payout.findMany({
      where,
      include: { rep: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      // @ts-ignore
      payouts: payouts.map((p) => ({
        ...p,
        amount: p.amount.toNumber(),
      })),
    });
  } catch (error) {
    console.error("Get payouts error:", error);
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const user = await getCurrentUser(userId);
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const payout = await prisma.payout.create({
      data: {
        repId: body.repId,
        amount: body.amount,
        date: new Date(body.date),
        description: body.description,
      },
      include: { rep: true },
    });

    return NextResponse.json({
      ...payout,
      amount: payout.amount.toNumber(),
    });
  } catch (error) {
    console.error("Create payout error:", error);
    return NextResponse.json({ error: "Failed to create payout" }, { status: 500 });
  }
}
