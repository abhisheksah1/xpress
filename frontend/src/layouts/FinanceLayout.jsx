import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/admin/finance/pnl', label: 'Profit & Loss' },
  { to: '/admin/finance/sales', label: 'Sales Ledger' },
  { to: '/admin/finance/purchases', label: 'Purchase Ledger' },
  { to: '/admin/finance/expenses', label: 'Overhead Expenses' },
  { to: '/admin/finance/vendors', label: 'Vendor Registry' },
  { to: '/admin/finance/stock', label: 'Stock Valuation' },
  { to: '/admin/finance/treasury', label: 'Treasury' },
];

export default function FinanceLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance & Accounting</h1>
        <p className="text-sm text-slate-500 mt-1">
          P&amp;L, sales ledger, purchase ledger, overhead, vendors, inventory valuation, and treasury.
        </p>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
