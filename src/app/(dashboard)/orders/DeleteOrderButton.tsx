"use client";

import { deleteOrderAction } from "@/lib/order-actions";

export function DeleteOrderButton({ orderId, orderName }: { orderId: string; orderName: string }) {
  return (
    <form
      action={deleteOrderAction.bind(null, orderId)}
      onSubmit={(e) => {
        if (!confirm(`Delete "${orderName}"? This also removes it from Zoho if it's synced.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-xs font-semibold text-coral-dark hover:underline">
        Delete order
      </button>
    </form>
  );
}
