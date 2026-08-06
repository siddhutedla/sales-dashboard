import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireRole } from "@/lib/auth";
import { generate1096Pdf } from "@/lib/tax/generate1096";

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
        include: { rep: { select: { name: true, w9Form: { select: { id: true } } } } },
      }),
    ]);

    if (!company?.ein) {
      return NextResponse.json(
        {
          error:
            "Company EIN is not set - an admin must fill it in under Admin: Tax Settings first",
        },
        { status: 409 }
      );
    }

    const byRep = new Map<string, { name: string; hasW9: boolean; amount: number }>();
    for (const p of payouts) {
      const entry = byRep.get(p.repId) ?? {
        name: p.rep.name,
        hasW9: p.rep.w9Form !== null,
        amount: 0,
      };
      entry.amount += p.amount.toNumber();
      byRep.set(p.repId, entry);
    }
    const recipients = Array.from(byRep.values()).sort((a, b) => a.name.localeCompare(b.name));

    const pdfBytes = await generate1096Pdf({
      year,
      filer: {
        name: company.legalName,
        ein: company.ein,
        address: company.address ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        zipCode: company.zipCode ?? "",
      },
      recipients,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="1096-summary-${year}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Generate 1096 summary error:", error);
    return NextResponse.json({ error: "Failed to generate 1096 summary" }, { status: 500 });
  }
}
