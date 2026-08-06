import "server-only";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { formatCurrency, wrapText } from "./pdf-helpers";

interface RepRow {
  name: string;
  salary: number;
  bonus: number;
  commission: number;
  other: number;
}

export interface GenerateExpenseReportParams {
  year: number;
  companyName: string;
  reps: RepRow[];
}

const COLUMNS = [
  { key: "name", label: "Rep", x: 0, width: 152 },
  { key: "salary", label: "Salary", x: 152, width: 80 },
  { key: "bonus", label: "Bonus", x: 232, width: 80 },
  { key: "commission", label: "Commission", x: 312, width: 90 },
  { key: "other", label: "Other", x: 402, width: 55 },
  { key: "total", label: "Total", x: 457, width: 55 },
] as const;

// Payouts a business has actually paid out (cash basis, matching the 1099
// income basis) - useful to hand to an accountant as this year's deductible
// contractor-payment expense, broken out by rep and payout type.
export async function generateExpenseReportPdf(
  params: GenerateExpenseReportParams
): Promise<Uint8Array> {
  const { year, companyName, reps } = params;

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
    opts: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; right?: boolean } = {}
  ) => {
    const f = opts.f ?? font;
    const size = opts.size ?? 9;
    const drawX = opts.right ? x - f.widthOfTextAtSize(text, size) : x;
    page.drawText(text, { x: drawX, y, size, font: f, color: opts.color ?? rgb(0, 0, 0) });
  };

  let y = 742;
  draw("Payout Expense Report", left, y, { size: 18, f: bold });
  y -= 18;
  draw(`${companyName} — Tax Year ${year}`, left, y, { size: 12 });

  const totals = reps.reduce(
    (acc, r) => ({
      salary: acc.salary + r.salary,
      bonus: acc.bonus + r.bonus,
      commission: acc.commission + r.commission,
      other: acc.other + r.other,
    }),
    { salary: 0, bonus: 0, commission: 0, other: 0 }
  );
  const grandTotal = totals.salary + totals.bonus + totals.commission + totals.other;

  y -= 40;
  page.drawRectangle({
    x: left,
    y: y - 40,
    width,
    height: 55,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  draw("Total paid this year (all types)", left + 10, y - 15, { size: 9, color: gray });
  draw(formatCurrency(grandTotal), left + 10, y - 34, { size: 18, f: bold });
  draw(
    `Salary ${formatCurrency(totals.salary)} · Bonus ${formatCurrency(totals.bonus)} · Commission ${formatCurrency(totals.commission)} · Other ${formatCurrency(totals.other)}`,
    left + 200,
    y - 25,
    { size: 8, color: gray }
  );

  y -= 80;
  draw("By rep", left, y, { size: 11, f: bold });
  y -= 18;

  draw(COLUMNS[0].label, left, y, { size: 8, f: bold, color: gray });
  for (const col of COLUMNS.slice(1)) {
    draw(col.label, left + col.x + col.width, y, { size: 8, f: bold, color: gray, right: true });
  }
  y -= 4;
  page.drawLine({
    start: { x: left, y },
    end: { x: left + width, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 14;

  for (const r of reps) {
    const total = r.salary + r.bonus + r.commission + r.other;
    draw(r.name, left, y, { size: 9 });
    draw(formatCurrency(r.salary), left + 152 + 80, y, { size: 9, right: true });
    draw(formatCurrency(r.bonus), left + 232 + 80, y, { size: 9, right: true });
    draw(formatCurrency(r.commission), left + 312 + 90, y, { size: 9, right: true });
    draw(formatCurrency(r.other), left + 402 + 55, y, { size: 9, right: true });
    draw(formatCurrency(total), left + 457 + 55, y, { size: 9, f: bold, right: true });
    y -= 16;
  }

  y -= 20;
  const disclaimer =
    "Includes only payouts marked Paid (cash basis, matching your 1099-NEC filings). Pending " +
    "payouts aren't included since that money hasn't gone out yet. Prepared for your own records - " +
    "confirm these figures with your tax professional.";
  for (const line of wrapText(font, disclaimer, width, 8)) {
    draw(line, left, y, { size: 8, color: gray });
    y -= 11;
  }

  return doc.save();
}
