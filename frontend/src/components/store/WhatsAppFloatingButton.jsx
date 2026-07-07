import WhatsAppIcon from './WhatsAppIcon.jsx';
import { buildWhatsAppChatUrl } from '../../utils/whatsapp.js';

export default function WhatsAppFloatingButton({ number, className = '' }) {
  const href = buildWhatsAppChatUrl(number);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#20BD5A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 ${className}`.trim()}
      title="Chat on WhatsApp"
      aria-label="Chat on WhatsApp"
    >
      <WhatsAppIcon className="h-8 w-8" />
    </a>
  );
}
