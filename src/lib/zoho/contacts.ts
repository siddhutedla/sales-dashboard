import { Lead } from "@prisma/client";
import { zohoClient } from "./client";
import { ZohoContactResponse, ZohoSearchResponse } from "@/types/zoho";

// Zoho Contacts requires Last_Name; there's no single "full name" field, so
// split on the last space - "Jane Q Public" -> First: "Jane Q", Last: "Public".
function splitName(name: string): { firstName?: string; lastName: string } {
  const trimmed = name.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return { lastName: trimmed };
  return {
    firstName: trimmed.slice(0, lastSpace).trim(),
    lastName: trimmed.slice(lastSpace + 1).trim(),
  };
}

function contactPayload(lead: Lead) {
  const { firstName, lastName } = splitName(lead.name);
  return {
    First_Name: firstName,
    Last_Name: lastName || lead.name,
    Email: lead.email || undefined,
    Phone: lead.phone || undefined,
    Mobile: lead.mobile || undefined,
    Business_Org: lead.company,
    Mailing_Street: lead.address || undefined,
    Mailing_City: lead.city || undefined,
    Mailing_State: lead.state || undefined,
    Mailing_Zip: lead.zipCode || undefined,
    Mailing_Country: lead.country || undefined,
    Website: lead.website || undefined,
  };
}

// Searches Zoho Contacts by email first (Zoho returns 204 No Content, not
// an empty array, when nothing matches) and creates one only if there's no
// match - avoids piling up duplicate Contact records for repeat customers.
export async function findOrCreateContact(lead: Lead): Promise<string> {
  if (lead.email) {
    const res = await zohoClient.get<ZohoSearchResponse<ZohoContactResponse>>(
      "/crm/v2/Contacts/search",
      { params: { email: lead.email }, validateStatus: (s) => s === 200 || s === 204 }
    );
    const existing = res.data?.data?.[0];
    if (existing) return existing.id;
  }

  const createRes = await zohoClient.post<{ data: { id: string }[] }>("/crm/v2/Contacts", {
    data: [contactPayload(lead)],
  });

  const contactId = createRes.data.data[0]?.id;
  if (!contactId) throw new Error("Zoho did not return a Contact id");
  return contactId;
}

export async function getContact(contactId: string): Promise<ZohoContactResponse> {
  const res = await zohoClient.get<{ data: ZohoContactResponse[] }>(
    `/crm/v2/Contacts/${contactId}`
  );
  const contact = res.data.data[0];
  if (!contact) throw new Error("Contact not found in Zoho");
  return contact;
}
