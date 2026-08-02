export default function EmailPage() {
  return (
    <div className="p-8 text-center">
      <div className="gp-card p-10 max-w-md mx-auto">
        <p className="text-4xl mb-2">📧</p>
        <h1 className="text-2xl font-extrabold">Outlook Email Integration</h1>
        <p className="text-ink-muted mt-2">
          Coming soon. Connect your Outlook account to log emails to leads automatically.
        </p>
        <button disabled className="gp-btn gp-btn-secondary mt-6 opacity-50 cursor-not-allowed">
          Connect Outlook
        </button>
      </div>
    </div>
  );
}
