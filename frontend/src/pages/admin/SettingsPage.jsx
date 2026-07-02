export default function SettingsPage() {
  const groups = ['General', 'Store', 'Payment', 'Shipping', 'Appearance', 'SEO', 'Social'];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="grid md:grid-cols-4 gap-6">
        <div className="space-y-1">
          {groups.map((g) => (
            <button key={g} className="block w-full text-left px-4 py-2 rounded-lg text-sm hover:bg-white">
              {g}
            </button>
          ))}
        </div>
        <div className="md:col-span-3 card">
          <p className="text-gray-500">
            Fully customizable store settings — navbar, colors, payment toggles, and more — all controlled from here.
          </p>
        </div>
      </div>
    </div>
  );
}
