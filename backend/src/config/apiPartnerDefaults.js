export const API_PARTNER_ORDER_FIELD_KEYS = [
  'senderName',
  'senderEmail',
  'senderMobile',
  'receiverName',
  'receiverMobile',
  'deliveryAddress',
  'giftMessage',
  'deliveryDate',
  'timeSlot',
  'occasion',
  'specialInstructions',
];

export const DEFAULT_API_PARTNER_ORDER_FIELDS = [
  { key: 'senderName', label: 'Sender Name', enabled: true, required: true },
  { key: 'senderEmail', label: 'Sender Email', enabled: true, required: true },
  { key: 'senderMobile', label: 'Sender Mobile', enabled: true, required: true },
  { key: 'receiverName', label: 'Receiver Name', enabled: true, required: true },
  { key: 'receiverMobile', label: 'Receiver Mobile', enabled: true, required: true },
  { key: 'deliveryAddress', label: 'Delivery Address', enabled: true, required: true },
  { key: 'giftMessage', label: 'Gift Message', enabled: true, required: false },
  { key: 'deliveryDate', label: 'Delivery Date', enabled: true, required: false },
  { key: 'timeSlot', label: 'Delivery Time Slot', enabled: true, required: false },
  { key: 'occasion', label: 'Occasion', enabled: false, required: false },
  { key: 'specialInstructions', label: 'Special Instructions', enabled: true, required: false },
];

export const API_PARTNER_FIXED_CURRENCY = 'NPR';
export const API_PARTNER_FIXED_PAYMENT_METHOD = 'manual_bank';
