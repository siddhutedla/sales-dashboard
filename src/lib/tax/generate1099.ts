import "server-only";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { formatCurrency, wrapText } from "./pdf-helpers";

interface Party {
  name: string;
  businessName?: string | null;
  tin: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Generate1099Params {
  year: number;
  payer: Party;
  recipient: Party;
  nonemployeeCompensation: number;
  copyLabel: string;
}

// Draws a substitute Form 1099-NEC (allowed under IRS Pub. 1179 as long as it
// carries the required content and recipient legend). This is not the official
// scannable Copy A - it's meant for the recipient/payer's own records.
export async function generate1099Pdf(params: Generate1099Params): Promise<Uint8Array> {
  const { year, payer, recipient, nonemployeeCompensation, copyLabel } = params;

  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const gray = rgb(0.45, 0.45, 0.45);
  const left = 50;
  const width = 512;

  const draw = (
    text: string,
    x: number,
    y: number,
    opts: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb> } = {}
  ) => {
    page.drawText(text, {
      x,
      y,
      size: opts.size ?? 10,
      font: opts.f ?? font,
      color: opts.color ?? rgb(0, 0, 0),
    });
  };

  let y = 742;
  draw("Form 1099-NEC", left, y, { size: 18, f: bold });
  const copyWidth = bold.widthOfTextAtSize(copyLabel, 11);
  draw(copyLabel, left + width - copyWidth, y + 4, { size: 11, f: bold });
  y -= 20;
  draw(`Nonemployee Compensation — Tax Year ${year}`, left, y, { size: 12 });

  y -= 40;
  draw("PAYER'S name, address, and EIN", left, y, { size: 9, color: gray });
  y -= 15;
  draw(payer.name, left, y, { size: 11, f: bold });
  y -= 14;
  draw(payer.address || "-", left, y);
  y -= 14;
  draw(`${payer.city || ""}, ${payer.state || ""} ${payer.zipCode || ""}`.trim(), left, y);
  y -= 14;
  draw(`EIN: ${payer.tin || "-"}`, left, y);

  y -= 36;
  draw("RECIPIENT'S name, address, and TIN", left, y, { size: 9, color: gray });
  y -= 15;
  draw(recipient.name, left, y, { size: 11, f: bold });
  if (recipient.businessName) {
    y -= 14;
    draw(recipient.businessName, left, y);
  }
  y -= 14;
  draw(recipient.address, left, y);
  y -= 14;
  draw(`${recipient.city}, ${recipient.state} ${recipient.zipCode}`, left, y);
  y -= 14;
  draw(`TIN: ${recipient.tin}`, left, y);

  y -= 40;
  page.drawRectangle({
    x: left,
    y: y - 40,
    width,
    height: 55,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  draw("Box 1 — Nonemployee compensation", left + 10, y - 12, { size: 10, color: gray });
  draw(formatCurrency(nonemployeeCompensation), left + 10, y - 32, { size: 18, f: bold });

  y -= 90;
  const legend =
    "This is important tax information and is being furnished to the IRS. If you are required to file " +
    "a return, a negligence penalty or other sanction may be imposed on you if this income is taxable " +
    "and the IRS determines that it has not been reported.";
  for (const line of wrapText(font, legend, width, 9)) {
    draw(line, left, y, { size: 9 });
    y -= 12;
  }

  y -= 24;
  const disclaimer =
    "Generated for recordkeeping purposes and not automatically filed with the IRS. Confirm these " +
    "figures with your tax professional or filing software before submitting.";
  for (const line of wrapText(font, disclaimer, width, 8)) {
    draw(line, left, y, { size: 8, color: gray });
    y -= 11;
  }

  return doc.save();
}
