import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLeadAction } from "@/lib/lead-actions";
import { OrderForm } from "../OrderForm";

export default async function NewOrderPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const reps = isAdmin
    ? await prisma.user.findMany({
        where: { role: "SALES_REP" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : undefined;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-extrabold">New Order</h1>
      <p className="text-ink-muted mt-2">
        Enter a new potential order. It's created here and pushed to Zoho right away.
      </p>
      <div className="mt-6">
        <OrderForm
          action={createLeadAction}
          reps={reps}
          isAdmin={isAdmin}
          submitLabel="Create order"
        />
      </div>
    </div>
  );
}
