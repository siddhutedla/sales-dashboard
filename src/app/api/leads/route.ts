import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireUser } from "@/lib/auth";
import { syncLeadToZoho } from "@/lib/zoho/sync";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const status = request.nextUrl.searchParams.get("status");
    const repId = request.nextUrl.searchParams.get("repId");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

    const where: any = {};
    if (user.role === "SALES_REP") {
      where.assignedRepId = user.id;
    } else if (repId) {
      where.assignedRepId = repId;
    }
    if (status) where.status = status;

    const leads = await prisma.lead.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { assignedRep: true },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.lead.count({ where });

    return NextResponse.json({
      // @ts-ignore
      leads: leads.map((l) => ({
        ...l,
        value: l.value.toNumber(),
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Get leads error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        company: body.company,
        email: body.email,
        phone: body.phone,
        mobile: body.mobile,
        website: body.website,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        country: body.country,
        industry: body.industry,
        value: body.value || 0,
        status: body.status || "NEW",
        source: body.source,
        notes: body.notes,
        assignedRepId: user.role === "ADMIN" ? body.assignedRepId || user.id : user.id,
      },
      include: { assignedRep: true },
    });

    // Fire-and-forget Zoho sync
    syncLeadToZoho(lead).catch((err) => console.error("Async Zoho sync failed:", err));

    return NextResponse.json({
      ...lead,
      value: lead.value.toNumber(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Create lead error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
