export default function OrdersPage() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold">Inksoft Order Tracking</h1>
      <p className="text-gray-600 mt-2">Coming soon. Look up Inksoft order status by Order ID.</p>
      <input
        disabled
        placeholder="Enter Order ID..."
        className="border px-4 py-2 rounded mt-4 text-center w-64 opacity-50"
      />
    </div>
  );
}
