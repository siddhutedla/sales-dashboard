type RepOption = { id: string; name: string };

export interface OrderFormValues {
  id?: string;
  orderName?: string;
  name?: string;
  company?: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  industry?: string | null;
  value?: number;
  source?: string | null;
  notes?: string | null;
  assignedRepId?: string;
}

// Captures a new potential order: the contact/company it's for, plus the
// Order Name that becomes the record's Name in Zoho's Orders module (and
// what order managers search by later). No pipeline stage to pick - this
// creates a real order right away, both here and in Zoho.
export function OrderForm({
  action,
  order,
  reps,
  isAdmin,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  order?: OrderFormValues;
  reps?: RepOption[];
  isAdmin: boolean;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6">
      {order?.id && <input type="hidden" name="id" value={order.id} />}

      <div className="gp-card p-6 space-y-4">
        <h2 className="font-extrabold">Order</h2>
        <div>
          <label className="gp-label">Order name *</label>
          <input
            name="orderName"
            defaultValue={order?.orderName}
            required
            placeholder="e.g. Acme Corp - Staff Shirts"
            className="gp-input"
          />
          <p className="text-xs text-ink-muted mt-1">
            This is how order managers will find it in Zoho - make it specific.
          </p>
        </div>
      </div>

      <div className="gp-card p-6 space-y-4">
        <h2 className="font-extrabold">Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="gp-label">Name *</label>
            <input name="name" defaultValue={order?.name} required className="gp-input" />
          </div>
          <div>
            <label className="gp-label">Company *</label>
            <input name="company" defaultValue={order?.company} required className="gp-input" />
          </div>
          <div>
            <label className="gp-label">Email</label>
            <input
              type="email"
              name="email"
              defaultValue={order?.email ?? ""}
              className="gp-input"
            />
          </div>
          <div>
            <label className="gp-label">Phone</label>
            <input name="phone" defaultValue={order?.phone ?? ""} className="gp-input" />
          </div>
          <div>
            <label className="gp-label">Mobile</label>
            <input name="mobile" defaultValue={order?.mobile ?? ""} className="gp-input" />
          </div>
          <div>
            <label className="gp-label">Website</label>
            <input name="website" defaultValue={order?.website ?? ""} className="gp-input" />
          </div>
        </div>
      </div>

      <div className="gp-card p-6 space-y-4">
        <h2 className="font-extrabold">Address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="gp-label">Street address</label>
            <input name="address" defaultValue={order?.address ?? ""} className="gp-input" />
          </div>
          <div>
            <label className="gp-label">City</label>
            <input name="city" defaultValue={order?.city ?? ""} className="gp-input" />
          </div>
          <div>
            <label className="gp-label">State</label>
            <input name="state" defaultValue={order?.state ?? ""} className="gp-input" />
          </div>
          <div>
            <label className="gp-label">ZIP</label>
            <input name="zipCode" defaultValue={order?.zipCode ?? ""} className="gp-input" />
          </div>
          <div>
            <label className="gp-label">Country</label>
            <input name="country" defaultValue={order?.country ?? ""} className="gp-input" />
          </div>
        </div>
      </div>

      <div className="gp-card p-6 space-y-4">
        <h2 className="font-extrabold">Deal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="gp-label">Value ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="value"
              defaultValue={order?.value ?? ""}
              className="gp-input"
            />
          </div>
          <div>
            <label className="gp-label">Industry</label>
            <input name="industry" defaultValue={order?.industry ?? ""} className="gp-input" />
          </div>
          <div>
            <label className="gp-label">Source</label>
            <input name="source" defaultValue={order?.source ?? ""} className="gp-input" />
          </div>
          {isAdmin && (
            <div>
              <label className="gp-label">Assigned rep</label>
              <select
                name="assignedRepId"
                defaultValue={order?.assignedRepId ?? ""}
                className="gp-input"
              >
                {reps?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="gp-label">Notes</label>
            <textarea
              name="notes"
              defaultValue={order?.notes ?? ""}
              rows={3}
              className="gp-input"
            />
          </div>
        </div>
        <p className="text-xs text-ink-muted">
          Submitting this creates the order and pushes it to Zoho right away.
        </p>
      </div>

      <button type="submit" className="gp-btn gp-btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
