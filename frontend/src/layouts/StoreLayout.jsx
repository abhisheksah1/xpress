import { Outlet } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import StoreHeader from '../components/store/StoreHeader.jsx';
import StoreFooter from '../components/store/StoreFooter.jsx';
import CookieConsent from '../components/store/CookieConsent.jsx';
import WhatsAppFloatingButton from '../components/store/WhatsAppFloatingButton.jsx';
import { isWhatsAppChatEnabled, resolveWhatsAppNumber } from '../utils/whatsapp.js';

export default function StoreLayout() {
  const { settings } = useStore();

  const whatsappNumber = resolveWhatsAppNumber(settings);
  const showWhatsApp = isWhatsAppChatEnabled(settings) && whatsappNumber;

  const maintenanceEnabled = settings.maintenance_enabled === true || settings.maintenance_enabled === 'true';
  const maintenanceMessage =
    settings.maintenance_message || 'We are under maintenance. Please check back soon.';

  return (
    <div className="min-h-screen flex flex-col">
      {showWhatsApp && <WhatsAppFloatingButton number={whatsappNumber} />}

      {!maintenanceEnabled && <StoreHeader />}

      <main className="flex-1">
        {maintenanceEnabled ? (
          <div className="max-w-2xl mx-auto px-4 py-24 text-center">
            <div className="card">
              <h1 className="text-2xl font-bold mb-3">Maintenance Mode</h1>
              <p className="text-gray-600 whitespace-pre-line">{maintenanceMessage}</p>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {!maintenanceEnabled && <StoreFooter />}
      {!maintenanceEnabled && <CookieConsent />}
    </div>
  );
}
