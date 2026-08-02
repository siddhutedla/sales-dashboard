import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireUser } from "@/lib/auth";
import { decryptTin } from "@/lib/tax/crypto";
import { formatEin, formatTin } from "@/lib/tax/format";
import { generate1099Pdf } from "@/lib/tax/generate1099";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; year: string }> }
) {
  const { userId, year: yearStr } = await params;
  try {
    const requester = await requireUser();
    const year = parseInt(yearStr, 10);
    if (!Number.isInteger(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    const isSelf = requester.id === userId;
    if (!isSelf && requester.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [recipientUser, w9, company, payouts] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.w9Form.findUnique({ where: { userId } }),
      prisma.companySettings.findUnique({ where: { id: 1 } }),
      prisma.payout.findMany({
        where: {
          repId: userId,
          date: {
            gte: new Date(`${year}-01-01T00:00:00Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00Z`),
          },
        },
        select: { amount: true },
      }),
    ]);

    if (!recipientUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!w9) return NextResponse.json({ error: "No W-9 on file for this user" }, { status: 404 });
    if (!company?.ein) {
      return NextResponse.json(
        {
          error:
            "Company EIN is not set - an admin must fill it in under Admin: Tax Settings first",
        },
        { status: 409 }
      );
    }

    const nonemployeeCompensation = payouts.reduce((sum, p) => sum + p.amount.toNumber(), 0);

    // An admin pulling someone else's copy gets the full TIN (needed to actually
    // file); a rep pulling their own gets it truncated - they already know it.
    const isAdminPayerCopy = requester.role === "ADMIN" && !isSelf;
    const tinDigits = decryptTin(w9.tinEncrypted);

    const pdfBytes = await generate1099Pdf({
      year,
      payer: {
        name: company.legalName,
        tin: formatEin(company.ein),
        address: company.address ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        zipCode: company.zipCode ?? "",
      },
      recipient: {
        name: w9.legalName,
        businessName: w9.businessName,
        tin: formatTin(tinDigits, w9.taxClassification, !isAdminPayerCopy),
        address: w9.address,
        city: w9.city,
        state: w9.state,
        zipCode: w9.zipCode,
      },
      nonemployeeCompensation,
      copyLabel: isAdminPayerCopy ? "Copy C — For Payer" : "Copy B — For Recipient",
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="1099-NEC-${year}-${recipientUser.name.replace(/\s+/g, "-")}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Generate 1099 error:", error);
    return NextResponse.json({ error: "Failed to generate 1099" }, { status: 500 });
  }
}
