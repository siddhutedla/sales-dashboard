import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireRole } from "@/lib/auth";
import { generateExpenseReportPdf } from "@/lib/tax/generateExpenseReport";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year: yearStr } = await params;
  try {
    await requireRole(["ADMIN"]);
    const year = parseInt(yearStr, 10);
    if (!Number.isInteger(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    const [company, payouts] = await Promise.all([
      prisma.companySettings.findUnique({ where: { id: 1 } }),
      prisma.payout.findMany({
        where: {
          status: "PAID",
          date: {
            gte: new Date(`${year}-01-01T00:00:00Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00Z`),
          },
        },
        include: { rep: { select: { name: true } } },
      }),
    ]);

    type RepTotals = { name: string; salary: number; bonus: number; commission: number; other: number };
    const byRep = new Map<string, RepTotals>();
    for (const p of payouts) {
      const entry = byRep.get(p.repId) ?? {
        name: p.rep.name,
        salary: 0,
        bonus: 0,
        commission: 0,
        other: 0,
      };
      const amount = p.amount.toNumber();
      if (p.type === "SALARY") entry.salary += amount;
      else if (p.type === "BONUS") entry.bonus += amount;
      else if (p.type === "COMMISSION") entry.commission += amount;
      else entry.other += amount;
      byRep.set(p.repId, entry);
    }
    const reps = Array.from(byRep.values()).sort((a, b) => a.name.localeCompare(b.name));

    const pdfBytes = await generateExpenseReportPdf({
      year,
      companyName: company?.legalName ?? "Company",
      reps,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="expense-report-${year}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Generate expense report error:", error);
    return NextResponse.json({ error: "Failed to generate expense report" }, { status: 500 });
  }
}
