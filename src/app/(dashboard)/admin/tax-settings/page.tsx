import { requireRolePage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCompanySettingsAction } from "@/lib/tax-actions";

export default async function TaxSettingsPage() {
  await requireRolePage(["ADMIN"]);

  const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-3xl font-bold">Company Tax Settings</h1>
      <p className="text-gray-600 mt-2">
        This is the payer information printed on every generated 1099-NEC.
      </p>

      <form action={updateCompanySettingsAction} className="mt-8 bg-white rounded shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Legal business name</label>
          <input
            name="legalName"
            type="text"
            required
            defaultValue={settings?.legalName}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">EIN</label>
          <input
            name="ein"
            type="text"
            placeholder="XX-XXXXXXX"
            defaultValue={settings?.ein ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input
            name="address"
            type="text"
            defaultValue={settings?.address ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input
              name="city"
              type="text"
              defaultValue={settings?.city ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">State</label>
            <input
              name="state"
              type="text"
              defaultValue={settings?.state ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ZIP</label>
            <input
              name="zipCode"
              type="text"
              defaultValue={settings?.zipCode ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        {!settings?.ein && (
          <p className="text-sm text-amber-700">
            Set your EIN before generating 1099s - it's required on the form.
          </p>
        )}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Save
        </button>
      </form>
    </div>
  );
}
