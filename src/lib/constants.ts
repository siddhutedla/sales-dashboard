// Suggested commission = this % of Order.subtotalPreRush (synced from
// Zoho's Subtotal_Pre_Rush). Admins still have to click Add to actually
// create the payout, and can override the prefilled amount either then or
// afterward via updatePayoutAmountAction.
//
// Not defined in payout-actions.ts: a "use server" module may only export
// async functions - a plain const export there breaks the whole module
// (Turbopack reports it as having no exports at all, cascading into every
// other export from that file failing too).
export const COMMISSION_RATE = 0.08;
