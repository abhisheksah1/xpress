import { Outlet, Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useStore } from '../context/StoreContext';

function NavLink({ item }) {
  const isExternal = item.link?.startsWith('http');
  const className = 'text-gray-600 hover:text-primary-600 text-sm';
  if (isExternal) {
    return <a href={item.link} target={item.openInNewTab ? '_blank' : undefined} rel="noreferrer" className={className}>{item.label}</a>;
  }
  return <Link to={item.link} className={className}>{item.label}</Link>;
}

export default function StoreLayout() {
  const count = useCartStore((s) => s.count());
  const { settings, headerNav, footerNav } = useStore();

  const storeName = settings.registry_company_name || settings.store_name || 'KoseliXpress';
  const tagline = settings.store_tagline || 'Gifts delivered across Nepal';
  const logoUrl = settings.logo_url;
  const footerCopyright = settings.footer_copyright || `© ${new Date().getFullYear()} ${storeName}`;
  const supportEmail = settings.registry_support_email || settings.store_email;
  const supportPhone = settings.registry_helpdesk_whatsapp || settings.store_phone;
  const whatsappNumber = settings.registry_helpdesk_whatsapp || settings.plugins_config?.whatsapp_number;
  const headerItems = headerNav?.items?.filter((i) => i.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder) || [];
  const footerItems = footerNav?.items?.filter((i) => i.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder) || [];

  const maintenanceEnabled = settings.maintenance_enabled === true || settings.maintenance_enabled === 'true';
  const maintenanceMessage =
    settings.maintenance_message || 'We are under maintenance. Please check back soon.';

  return (
    <div className="min-h-screen flex flex-col">
      {(settings.plugins_config?.whatsapp_chat_enabled !== false) && whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-green-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-2xl"
          title="Chat on WhatsApp"
        >
          💬
        </a>
      )}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-8" />
              ) : (
                <span className="text-2xl font-bold text-primary-600">{storeName}</span>
              )}
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {headerItems.length > 0 ? (
                headerItems.map((item) => <NavLink key={item._id || item.label} item={item} />)
              ) : (
                <>
                  <Link to="/shop" className="text-gray-600 hover:text-primary-600 text-sm">Shop</Link>
                  <Link to="/blog" className="text-gray-600 hover:text-primary-600 text-sm">Blog</Link>
                </>
              )}
            </nav>
            <div className="flex items-center gap-4">
              <Link to="/orders" className="text-sm text-gray-600 hover:text-primary-600 hidden sm:block">My Orders</Link>
              <Link to="/login" className="text-sm text-gray-600 hover:text-primary-600">Login</Link>
              <Link to="/cart" className="relative btn-primary text-sm">
                Cart
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary-800 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {maintenanceEnabled ? (
          <div className="max-w-2xl mx-auto px-4 py-24 text-center">
            <div className="card">
              <h1 className="text-2xl font-bold mb-3">Maintenance Mode</h1>
              <p className="text-gray-600 whitespace-pre-line">{maintenanceMessage}</p>
              <p className="text-xs text-gray-400 mt-6">If you are an admin, use the Admin Panel to disable maintenance.</p>
              <div className="mt-6">
                <Link to="/login" className="btn-secondary">Admin Login</Link>
              </div>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="text-lg font-semibold text-white mb-2">{storeName}</p>
              <p className="text-sm">{tagline}</p>
              {supportPhone && <p className="text-sm mt-2">WhatsApp: {supportPhone}</p>}
              {supportEmail && <p className="text-sm">Email: {supportEmail}</p>}
            </div>
            {footerItems.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-white mb-3">Quick Links</p>
                <div className="space-y-2">
                  {footerItems.map((item) => (
                    <div key={item._id || item.label}>
                      <NavLink item={item} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white mb-3">Follow Us</p>
              <div className="flex gap-4 text-sm">
                {settings.facebook_url && <a href={settings.facebook_url} target="_blank" rel="noreferrer" className="hover:text-white">Facebook</a>}
                {settings.instagram_url && <a href={settings.instagram_url} target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>}
              </div>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500 border-t border-gray-800 pt-6">
            {footerCopyright}
            {settings.company_registration && ` · Reg: ${settings.company_registration}`}
          </p>
        </div>
      </footer>
    </div>
  );
}
