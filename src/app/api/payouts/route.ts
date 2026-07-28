import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireRole, requireUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const repId = request.nextUrl.searchParams.get("repId");

    const where: any = {};
    if (user.role === "SALES_REP") {
      where.repId = user.id;
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Get payouts error:", error);
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN"]);

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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Create payout error:", error);
    return NextResponse.json({ error: "Failed to create payout" }, { status: 500 });
  }
}
