"use client";

import { deletePayoutAction } from "@/lib/payout-actions";

export function DeletePayoutButton({
  payoutId,
  description,
  redirectTo,
}: {
  payoutId: string;
  description: string;
  redirectTo?: string;
}) {
  return (
    <form
      action={deletePayoutAction.bind(null, payoutId, redirectTo)}
      onSubmit={(e) => {
        if (!confirm(`Delete the payout "${description}"? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-xs font-semibold text-coral-dark hover:underline">
        Delete
      </button>
    </form>
  );
}
