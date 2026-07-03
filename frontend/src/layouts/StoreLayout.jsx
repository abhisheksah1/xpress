import { Outlet, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import StoreHeader from '../components/store/StoreHeader.jsx';
import StoreFooter from '../components/store/StoreFooter.jsx';

export default function StoreLayout() {
  const { settings } = useStore();

  const whatsappNumber = settings.registry_helpdesk_whatsapp || settings.plugins_config?.whatsapp_number;

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

      <StoreHeader />

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

      <StoreFooter />
    </div>
  );
}
