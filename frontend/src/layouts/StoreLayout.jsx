import { Outlet } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import StoreHeader from '../components/store/StoreHeader.jsx';
import StoreFooter from '../components/store/StoreFooter.jsx';
import CookieConsent from '../components/store/CookieConsent.jsx';
import WhatsAppFloatingButton from '../components/store/WhatsAppFloatingButton.jsx';
import MaintenancePage from '../components/store/MaintenancePage.jsx';
import { buildWhatsAppChatUrl, isWhatsAppChatEnabled, resolveWhatsAppNumber } from '../utils/whatsapp.js';

const URGENT_MESSAGE =
  'Hi KoseliXpress CSR, I need urgent order / support help while the website is under maintenance.';

export default function StoreLayout() {
  const { settings = {} } = useStore();

  const whatsappNumber = resolveWhatsAppNumber(settings);
  const maintenanceEnabled = settings?.maintenance_enabled === true || settings?.maintenance_enabled === 'true';
  const maintenanceMessage =
    settings?.maintenance_message || 'We are under maintenance. Please check back soon.';

  // During maintenance, still show WhatsApp for urgent CSR contact
  const showWhatsApp = Boolean(
    whatsappNumber
    && (maintenanceEnabled || isWhatsAppChatEnabled(settings))
  );
  const floatingHref = maintenanceEnabled
    ? buildWhatsAppChatUrl(whatsappNumber, URGENT_MESSAGE)
    : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      {showWhatsApp && (
        <WhatsAppFloatingButton
          number={whatsappNumber}
          href={floatingHref || undefined}
          title={maintenanceEnabled ? 'Urgent order / support on WhatsApp' : undefined}
        />
      )}

      {!maintenanceEnabled && <StoreHeader />}

      <main className="flex-1">
        {maintenanceEnabled ? (
          <MaintenancePage settings={settings} message={maintenanceMessage} />
        ) : (
          <Outlet />
        )}
      </main>

      {!maintenanceEnabled && <StoreFooter />}
      {!maintenanceEnabled && <CookieConsent />}
    </div>
  );
}
