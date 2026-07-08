export const PAYMENT_CURRENCIES = ['NPR', 'INR', 'AUD', 'USD', 'EUR'];

export const DEFAULT_PAYMENT_GATEWAYS = [
  {
    id: 'khalti',
    type: 'khalti',
    sortOrder: 1,
    enabled: true,
    environment: 'sandbox',
    displayLabel: 'Khalti Wallet Payment',
    logoUrl: '',
    currencies: ['NPR'],
    credentials: { merchantCode: '', secretKey: '', publicKey: '' },
  },
  {
    id: 'esewa',
    type: 'esewa',
    sortOrder: 2,
    enabled: true,
    environment: 'sandbox',
    displayLabel: 'eSewa Mobile Wallet',
    logoUrl: '',
    currencies: ['NPR'],
    credentials: { merchantId: '', secretKey: '' },
  },
  {
    id: 'imepay',
    type: 'imepay',
    sortOrder: 3,
    enabled: true,
    environment: 'sandbox',
    displayLabel: 'IME Pay',
    logoUrl: '',
    currencies: ['NPR'],
    credentials: { merchantId: '', password: '' },
  },
  {
    id: 'fonepay',
    type: 'fonepay',
    sortOrder: 4,
    enabled: false,
    environment: 'sandbox',
    displayLabel: 'Fonepay',
    logoUrl: '',
    currencies: ['NPR'],
    credentials: { merchantId: '', secretKey: '' },
  },
  {
    id: 'card',
    type: 'card',
    sortOrder: 5,
    enabled: true,
    environment: 'sandbox',
    displayLabel: 'Visa / Mastercard (NPS OnePG)',
    logoUrl: '',
    currencies: ['NPR', 'INR', 'AUD', 'USD', 'EUR'],
    credentials: {
      merchantName: '',
      merchantId: '',
      secretKey: '',
      apiUsername: '',
      apiPassword: '',
      instrumentCode: '',
    },
  },
  {
    id: 'hbl',
    type: 'hbl',
    sortOrder: 6,
    enabled: false,
    environment: 'sandbox',
    displayLabel: 'HBL - Himalayan Bank',
    logoUrl: '',
    currencies: ['NPR'],
    credentials: { merchantId: '', secretKey: '', accessKey: '' },
  },
  {
    id: 'manual_bank',
    type: 'manual_bank',
    sortOrder: 7,
    enabled: true,
    environment: 'sandbox',
    displayLabel: 'Manual Bank Transfer / QR Pay',
    logoUrl: '',
    currencies: ['NPR'],
    credentials: {
      bankName: '',
      accountHolder: '',
      accountNumber: '',
      branchName: '',
      transferType: 'qr',
      qrCodeImage: '',
      instruction: '',
    },
  },
  {
    id: 'cod',
    type: 'cod',
    sortOrder: 8,
    enabled: false,
    environment: 'sandbox',
    displayLabel: 'Cash on Delivery (COD)',
    logoUrl: '',
    currencies: ['NPR'],
    credentials: {},
  },
];

export const GATEWAY_FIELD_DEFS = {
  khalti: [
    { key: 'merchantCode', label: 'Khalti Merchant Code' },
    { key: 'secretKey', label: 'Khalti Secret Key', secret: true },
    { key: 'publicKey', label: 'Khalti Public Key' },
  ],
  esewa: [
    { key: 'merchantId', label: 'eSewa Merchant ID' },
    { key: 'secretKey', label: 'eSewa Secret Key', secret: true },
  ],
  imepay: [
    { key: 'merchantId', label: 'IME Pay Merchant ID' },
    { key: 'password', label: 'IME Pay Password', secret: true },
  ],
  fonepay: [
    { key: 'merchantId', label: 'Fonepay Merchant ID' },
    { key: 'secretKey', label: 'Fonepay Secret Key', secret: true },
  ],
  card: [
    { key: 'merchantId', label: 'Merchant ID' },
    { key: 'merchantName', label: 'Merchant Name' },
    { key: 'apiUsername', label: 'API Username' },
    { key: 'apiPassword', label: 'API Password', secret: true },
    { key: 'secretKey', label: 'Gateway API Secret Key', secret: true },
    { key: 'instrumentCode', label: 'Instrument Code (optional — leave blank for UAT)' },
  ],
  hbl: [
    { key: 'merchantId', label: 'HBL Merchant ID' },
    { key: 'secretKey', label: 'HBL Secret Key', secret: true },
    { key: 'accessKey', label: 'HBL Access Key' },
  ],
  manual_bank: [
    { key: 'bankName', label: 'Bank / Wallet Name' },
    { key: 'accountHolder', label: 'Account Holder Name' },
    { key: 'accountNumber', label: 'Account Number' },
    { key: 'branchName', label: 'Branch Name' },
    {
      key: 'transferType',
      label: 'Select Type (QR or Bank Account)',
      kind: 'select',
      options: [
        { value: 'qr', label: 'QR Code' },
        { value: 'bank_account', label: 'Bank Account' },
      ],
    },
    { key: 'qrCodeImage', label: 'QR Code Image URL', kind: 'image' },
    { key: 'instruction', label: 'Instruction', kind: 'textarea' },
  ],
  cod: [],
};

export const mergeGatewayDefaults = (stored) => {
  if (!Array.isArray(stored) || !stored.length) return DEFAULT_PAYMENT_GATEWAYS.map((g) => ({ ...g, credentials: { ...g.credentials } }));
  return DEFAULT_PAYMENT_GATEWAYS.map((def) => {
    const saved = stored.find((g) => g.id === def.id);
    if (!saved) return { ...def, credentials: { ...def.credentials } };
    return {
      ...def,
      ...saved,
      credentials: { ...def.credentials, ...(saved.credentials || {}) },
    };
  });
};
