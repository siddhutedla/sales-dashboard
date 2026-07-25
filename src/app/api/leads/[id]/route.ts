import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncLeadToZoho } from "@/lib/zoho/sync";
import { zohoClient } from "@/lib/zoho/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const user = await getCurrentUser(userId);
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { assignedRep: true },
    });

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (user.role === "SALES_REP" && lead.assignedRepId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      ...lead,
      value: lead.value.toNumber(),
    });
  } catch (error) {
    console.error("Get lead error:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const user = await getCurrentUser(userId);
    const existingLead = await prisma.lead.findUnique({ where: { id } });

    if (!existingLead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (user.role === "SALES_REP" && existingLead.assignedRepId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        name: body.name || undefined,
        company: body.company || undefined,
        email: body.email || undefined,
        phone: body.phone || undefined,
        mobile: body.mobile || undefined,
        website: body.website || undefined,
        address: body.address || undefined,
        city: body.city || undefined,
        state: body.state || undefined,
        zipCode: body.zipCode || undefined,
        country: body.country || undefined,
        industry: body.industry || undefined,
        value: body.value !== undefined ? body.value : undefined,
        status: body.status || undefined,
        source: body.source || undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        assignedRepId: user.role === "ADMIN" && body.assignedRepId ? body.assignedRepId : undefined,
      },
      include: { assignedRep: true },
    });

    syncLeadToZoho(lead).catch((err) => console.error("Async Zoho sync failed:", err));

    return NextResponse.json({
      ...lead,
      value: lead.value.toNumber(),
    });
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const user = await getCurrentUser(userId);
    const lead = await prisma.lead.findUnique({ where: { id } });

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (user.role === "SALES_REP" && lead.assignedRepId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from Zoho if synced
    if (lead.zohoLeadId) {
      try {
        await zohoClient.delete(`/crm/v2/Leads/${lead.zohoLeadId}`);
      } catch (err) {
        console.error("Failed to delete from Zoho:", err);
      }
    }

    await prisma.lead.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete lead error:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
