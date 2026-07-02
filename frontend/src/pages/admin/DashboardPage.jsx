export default function DashboardPage() {
  const stats = [
    { label: 'Total Orders', value: '—' },
    { label: 'Pending Orders', value: '—' },
    { label: 'Products', value: '—' },
    { label: 'Revenue (NPR)', value: '—' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
