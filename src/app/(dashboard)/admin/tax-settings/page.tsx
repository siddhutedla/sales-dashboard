import { requireRolePage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCompanySettingsAction } from "@/lib/tax-actions";

export default async function TaxSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRolePage(["ADMIN"]);
  const { error } = await searchParams;

  const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-3xl font-extrabold">Company Tax Settings</h1>
      <p className="text-ink-muted mt-2">
        This is the payer information printed on every generated 1099-NEC.
      </p>

      {error && (
        <div className="mt-4 bg-coral/10 border-2 border-coral rounded-xl p-3 text-sm font-medium text-coral-dark">
          {error}
        </div>
      )}

      <form action={updateCompanySettingsAction} className="gp-card mt-8 p-6 space-y-4">
        <div>
          <label className="gp-label">Legal business name</label>
          <input
            name="legalName"
            type="text"
            required
            defaultValue={settings?.legalName}
            className="gp-input"
          />
        </div>
        <div>
          <label className="gp-label">EIN</label>
          <input
            name="ein"
            type="text"
            placeholder="XX-XXXXXXX"
            defaultValue={settings?.ein ?? ""}
            className="gp-input"
          />
        </div>
        <div>
          <label className="gp-label">Address</label>
          <input
            name="address"
            type="text"
            defaultValue={settings?.address ?? ""}
            className="gp-input"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="gp-label">City</label>
            <input
              name="city"
              type="text"
              defaultValue={settings?.city ?? ""}
              className="gp-input"
            />
          </div>
          <div>
            <label className="gp-label">State</label>
            <input
              name="state"
              type="text"
              defaultValue={settings?.state ?? ""}
              className="gp-input"
            />
          </div>
          <div>
            <label className="gp-label">ZIP</label>
            <input
              name="zipCode"
              type="text"
              defaultValue={settings?.zipCode ?? ""}
              className="gp-input"
            />
          </div>
        </div>
        {!settings?.ein && (
          <p className="text-sm font-medium text-gold-dark">
            Set your EIN before generating 1099s - it&apos;s required on the form.
          </p>
        )}
        <button type="submit" className="gp-btn gp-btn-primary">
          Save
        </button>
      </form>
    </div>
  );
}
