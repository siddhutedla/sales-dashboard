import "server-only";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { formatCurrency, wrapText } from "./pdf-helpers";

interface Filer {
  name: string;
  ein: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface RecipientLine {
  name: string;
  hasW9: boolean;
  amount: number;
}

export interface Generate1096Params {
  year: number;
  filer: Filer;
  recipients: RecipientLine[];
}

// A recordkeeping summary in the spirit of IRS Form 1096 (Annual Summary and
// Transmittal of U.S. Information Returns) - the totals a payer needs when
// transmitting a batch of 1099-NECs. Not the official scannable form; use
// irs.gov's Form 1096 as the actual coversheet if paper-filing (not needed
// at all if e-filing).
export async function generate1096Pdf(params: Generate1096Params): Promise<Uint8Array> {
  const { year, filer, recipients } = params;

  const filed = recipients.filter((r) => r.hasW9);
  const missingW9 = recipients.filter((r) => !r.hasW9);
  const totalAmount = filed.reduce((sum, r) => sum + r.amount, 0);

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
  draw("Annual 1099-NEC Summary", left, y, { size: 18, f: bold });
  y -= 18;
  draw(`Tax Year ${year}`, left, y, { size: 12 });
  y -= 14;
  draw("Prepared in the format of IRS Form 1096 (Annual Summary and Transmittal)", left, y, {
    size: 9,
    color: gray,
  });

  y -= 36;
  draw("FILER'S name, address, and EIN", left, y, { size: 9, color: gray });
  y -= 15;
  draw(filer.name, left, y, { size: 11, f: bold });
  y -= 14;
  draw(filer.address || "-", left, y);
  y -= 14;
  draw(`${filer.city || ""}, ${filer.state || ""} ${filer.zipCode || ""}`.trim(), left, y);
  y -= 14;
  draw(`EIN: ${filer.ein || "-"}`, left, y);

  y -= 40;
  page.drawRectangle({
    x: left,
    y: y - 55,
    width,
    height: 70,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  draw("Box 3 — Total number of forms", left + 10, y - 15, { size: 9, color: gray });
  draw(String(filed.length), left + 10, y - 34, { size: 16, f: bold });
  draw("Box 5 — Total amount reported", left + 260, y - 15, { size: 9, color: gray });
  draw(formatCurrency(totalAmount), left + 260, y - 34, { size: 16, f: bold });
  draw("Form type: 1099-NEC (Nonemployee Compensation)", left + 10, y - 52, {
    size: 9,
    color: gray,
  });

  y -= 90;
  draw("Recipients included in this total", left, y, { size: 11, f: bold });
  y -= 18;
  for (const r of filed) {
    draw(r.name, left, y, { size: 10 });
    const amt = formatCurrency(r.amount);
    draw(amt, left + width - bold.widthOfTextAtSize(amt, 10), y, { size: 10, f: bold });
    y -= 14;
  }

  if (missingW9.length > 0) {
    y -= 16;
    draw("Not included - no W-9 on file yet:", left, y, { size: 10, f: bold, color: gray });
    y -= 14;
    for (const r of missingW9) {
      draw(`${r.name} (${formatCurrency(r.amount)} paid)`, left, y, { size: 9, color: gray });
      y -= 12;
    }
  }

  y -= 20;
  const disclaimer =
    "This summarizes your 1099-NEC filings for your own records. If you're paper-filing 1099s with " +
    "the IRS, use the official Form 1096 from irs.gov as your transmittal coversheet with these totals " +
    "- it isn't needed if you file electronically. Confirm these figures with your tax professional " +
    "before filing.";
  for (const line of wrapText(font, disclaimer, width, 8)) {
    draw(line, left, y, { size: 8, color: gray });
    y -= 11;
  }

  return doc.save();
}
