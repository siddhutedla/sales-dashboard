import { Lead } from "@prisma/client";
import { ZohoLeadResponse } from "@/types/zoho";

export function mapPrismaLeadToZoho(lead: Lead) {
  return {
    Last_Name: lead.name,
    Company: lead.company,
    Email: lead.email || "",
    Phone: lead.phone || "",
    Mobile: lead.mobile || "",
    Website: lead.website || "",
    Street: lead.address || "",
    City: lead.city || "",
    State: lead.state || "",
    Zip_Code: lead.zipCode || "",
    Country: lead.country || "",
    Industry: lead.industry || "",
    Annual_Revenue: lead.value.toString(),
    Lead_Status: lead.status,
    Lead_Source: lead.source || "",
    Description: lead.notes || "",
  };
}

export function mapZohoLeadToPrisma(zohoLead: ZohoLeadResponse) {
  return {
    name: zohoLead.Last_Name || "",
    company: zohoLead.Company || "",
    email: zohoLead.Email,
    phone: zohoLead.Phone,
    mobile: (zohoLead as any).Mobile,
    website: (zohoLead as any).Website,
    address: (zohoLead as any).Street,
    city: (zohoLead as any).City,
    state: (zohoLead as any).State,
    zipCode: (zohoLead as any).Zip_Code,
    country: (zohoLead as any).Country,
    industry: (zohoLead as any).Industry,
    value: zohoLead.Annual_Revenue ? parseFloat(zohoLead.Annual_Revenue.toString()) : 0,
    status: (zohoLead.Lead_Status || "NEW") as any,
    source: (zohoLead as any).Lead_Source,
    notes: zohoLead.Description,
    zohoLeadId: zohoLead.id,
    zohoSyncedAt: new Date(),
  };
}
