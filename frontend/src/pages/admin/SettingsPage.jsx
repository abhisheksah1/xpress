import { useState } from 'react';
import { useStoreSettings } from '../../hooks/useStoreSettings.js';
import {
  StoreRegistrySection,
  MaintenanceSection,
  MultiCurrenciesSection,
  ServiceAddonsSection,
  DeliveryPricingSection,
  PaymentGatewaysSection,
  PluginsSection,
  BrandingSection,
  ComplianceSection,
  TimeSlotsSection,
  AdminCredentialsSection,
  SmtpSection,
  CustomerAuthSection,
} from '../../components/admin/settings/sections.jsx';

const TABS = [
  { id: 'registry', label: 'Store Registry Identities', icon: '🏪' },
  { id: 'maintenance', label: 'Maintenance Mode', icon: '🛠️' },
  { id: 'currency', label: 'Multi-Currencies', icon: '💱' },
  { id: 'addons', label: 'Service Add-ons', icon: '➕' },
  { id: 'delivery', label: 'Delivery Pricing', icon: '🚚' },
  { id: 'payment', label: 'Payment Gateways', icon: '💳' },
  { id: 'plugins', label: 'Plugins Config', icon: '🔌' },
  { id: 'branding', label: 'Branding & Layout', icon: '🎨' },
  { id: 'compliance', label: 'Compliance & Footer', icon: '🏢' },
  { id: 'timeslots', label: 'Delivery Time Slots', icon: '🕒' },
  { id: 'admin', label: 'Admin Credentials', icon: '🔒' },
  { id: 'smtp', label: 'SMTP & Email Templates', icon: '✉️' },
  { id: 'auth', label: 'Customer Authentication', icon: '👤' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('registry');
  const { values, set, loading } = useStoreSettings();

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading settings...</div>;
  }

  const renderSection = () => {
    const props = { values, set };
    switch (activeTab) {
      case 'registry': return <StoreRegistrySection {...props} />;
      case 'maintenance': return <MaintenanceSection {...props} />;
      case 'currency': return <MultiCurrenciesSection {...props} />;
      case 'addons': return <ServiceAddonsSection {...props} />;
      case 'delivery': return <DeliveryPricingSection {...props} />;
      case 'payment': return <PaymentGatewaysSection {...props} />;
      case 'plugins': return <PluginsSection {...props} />;
      case 'branding': return <BrandingSection {...props} />;
      case 'compliance': return <ComplianceSection {...props} />;
      case 'timeslots': return <TimeSlotsSection {...props} />;
      case 'admin': return <AdminCredentialsSection />;
      case 'smtp': return <SmtpSection {...props} />;
      case 'auth': return <CustomerAuthSection {...props} />;
      default: return null;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Store Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Fully configure your store — currencies, payments, delivery, branding, email, and authentication.
      </p>
      <div className="grid lg:grid-cols-4 gap-6">
        <nav className="space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.id ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="lg:col-span-3">{renderSection()}</div>
      </div>
    </div>
  );
}
