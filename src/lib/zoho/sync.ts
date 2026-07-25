import { prisma } from "../prisma";
import { zohoClient } from "./client";
import { mapPrismaLeadToZoho, mapZohoLeadToPrisma } from "./mappers";
import { ZohoApiResponse, ZohoLeadResponse } from "@/types/zoho";
import { Lead } from "@prisma/client";

export async function syncLeadToZoho(lead: Lead): Promise<void> {
  try {
    const payload = mapPrismaLeadToZoho(lead);

    if (lead.zohoLeadId) {
      // Update existing
      await zohoClient.put(`/crm/v2/Leads/${lead.zohoLeadId}`, {
        data: [payload],
      });
    } else {
      // Create new
      const res = await zohoClient.post<ZohoApiResponse<any>>("/crm/v2/Leads", {
        data: [payload],
      });

      const zohoId = res.data.data[0]?.id;
      if (zohoId) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            zohoLeadId: zohoId,
            zohoSyncedAt: new Date(),
            zohoSyncStatus: "synced",
          },
        });
      }
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: { zohoSyncStatus: "synced", zohoSyncedAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to sync lead to Zoho:", error);
    await prisma.lead.update({
      where: { id: lead.id },
      data: { zohoSyncStatus: "error" },
    });
  }
}

export async function pullLeadsFromZoho(repId?: string): Promise<void> {
  try {
    const res = await zohoClient.get<ZohoApiResponse<ZohoLeadResponse>>("/crm/v2/Leads", {
      params: {
        fields: "id,Last_Name,Company,Email,Phone,Mobile,Website,Street,City,State,Zip_Code,Country,Industry,Annual_Revenue,Lead_Status,Lead_Source,Description",
        per_page: 200,
      },
    });

    for (const zohoLead of res.data.data || []) {
      const mapped = mapZohoLeadToPrisma(zohoLead);
      const assignRepId = repId || (await getDefaultRepId());

      await prisma.lead.upsert({
        where: { zohoLeadId: zohoLead.id },
        update: {
          ...mapped,
          zohoSyncStatus: "synced",
        },
        create: {
          ...mapped,
          assignedRepId: assignRepId,
          zohoSyncStatus: "synced",
        },
      });
    }
  } catch (error) {
    console.error("Failed to pull leads from Zoho:", error);
    throw error;
  }
}

async function getDefaultRepId(): Promise<string> {
  const rep = await prisma.user.findFirst({
    where: { role: "SALES_REP" },
  });
  if (!rep) throw new Error("No sales reps found in database");
  return rep.id;
}
