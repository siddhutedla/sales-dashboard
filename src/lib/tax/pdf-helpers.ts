import "server-only";
import { PDFFont } from "pdf-lib";

export function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function wrapText(font: PDFFont, text: string, maxWidth: number, size: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
