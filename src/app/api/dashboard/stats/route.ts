import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// @ts-ignore
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const user = await getCurrentUser(userId);
    const repId = request.nextUrl.searchParams.get("repId");

    const where =
      user.role === "SALES_REP"
        ? { assignedRepId: userId }
        : repId
          ? { assignedRepId: repId }
          : {};

    const leads = await prisma.lead.findMany({
      where,
      select: { status: true, value: true },
    });

    // @ts-ignore
    const leadsByStatus = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // @ts-ignore
    const totalPipelineValue = leads.reduce((sum, lead) => sum + lead.value.toNumber(), 0);

    // @ts-ignore
    const won = leads.filter((l) => l.status === "WON").length;
    // @ts-ignore
    const lost = leads.filter((l) => l.status === "LOST").length;
    const total = won + lost;
    const winRate = total > 0 ? (won / total) * 100 : 0;

    let repBreakdown = null;
    if (user.role === "ADMIN") {
      const reps = await prisma.user.findMany({
        where: { role: "SALES_REP" },
        include: {
          leads: {
            select: { status: true, value: true },
          },
          payouts: {
            select: { amount: true },
          },
        },
      });

      // @ts-ignore
      repBreakdown = reps.map((rep) => {
        // @ts-ignore
        const repWon = rep.leads.filter((l) => l.status === "WON").length;
        // @ts-ignore
        const repLost = rep.leads.filter((l) => l.status === "LOST").length;
        const repTotal = repWon + repLost;
        // @ts-ignore
        const repValue = rep.leads.reduce((sum, l) => sum + l.value.toNumber(), 0);
        // @ts-ignore
        const repPayout = rep.payouts.reduce((sum, p) => sum + p.amount.toNumber(), 0);

        return {
          id: rep.id,
          name: rep.name,
          email: rep.email,
          totalPipeline: repValue,
          leadsCount: rep.leads.length,
          winRate: repTotal > 0 ? (repWon / repTotal) * 100 : 0,
          totalPayout: repPayout,
        };
      });
    }

    return NextResponse.json({
      totalPipelineValue,
      leadsByStatus: {
        NEW: leadsByStatus["NEW"] || 0,
        CONTACTED: leadsByStatus["CONTACTED"] || 0,
        QUALIFIED: leadsByStatus["QUALIFIED"] || 0,
        PROPOSAL: leadsByStatus["PROPOSAL"] || 0,
        WON: leadsByStatus["WON"] || 0,
        LOST: leadsByStatus["LOST"] || 0,
      },
      winRate,
      repBreakdown,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
