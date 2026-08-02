export function formatTin(digits: string, classification: string, truncate = false): string {
  if (truncate) return `XXX-XX-${digits.slice(-4)}`;
  if (classification === "Individual/Sole Proprietor") {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function formatEin(ein: string): string {
  const digits = ein.replace(/\D/g, "");
  if (digits.length !== 9) return ein;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}
