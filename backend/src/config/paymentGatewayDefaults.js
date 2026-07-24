export const PAYMENT_CURRENCIES = ['NPR', 'INR', 'AUD', 'USD', 'EUR'];

export const GATEWAY_TYPES = {
  KHALTI: 'khalti',
  ESEWA: 'esewa',
  IMEPAY: 'imepay',
  FONEPAY: 'fonepay',
  CARD: 'card',
  HBL: 'hbl',
  MANUAL_BANK: 'manual_bank',
  COD: 'cod',
};

const base = (overrides) => ({
  enabled: false,
  environment: 'sandbox',
  displayLabel: '',
  logoUrl: '',
  currencies: [],
  credentials: {},
  ...overrides,
});

const npsEnvCredentials = () => ({
  merchantId: process.env.NPS_MERCHANT_ID || '',
  merchantName: process.env.NPS_MERCHANT_NAME || '',
  secretKey: process.env.NPS_SECRET_KEY || '',
  apiUsername: process.env.NPS_API_USERNAME || '',
  apiPassword: process.env.NPS_API_PASSWORD || '',
  instrumentCode: process.env.NPS_INSTRUMENT_CODE || '',
});

const hasNpsEnvCredentials = () => {
  const c = npsEnvCredentials();
  return !!(c.merchantId && c.merchantName && c.secretKey && c.apiUsername && c.apiPassword);
};

export const getNpsEnvCredentials = npsEnvCredentials;
export const hasNpsEnvConfig = hasNpsEnvCredentials;

export const getDefaultPaymentGateways = () => [
  base({
    id: 'khalti',
    type: GATEWAY_TYPES.KHALTI,
    sortOrder: 1,
    enabled: true,
    displayLabel: 'Khalti Wallet Payment',
    currencies: ['NPR'],
    credentials: { merchantCode: '', secretKey: '', publicKey: '' },
  }),
  base({
    id: 'esewa',
    type: GATEWAY_TYPES.ESEWA,
    sortOrder: 2,
    enabled: true,
    displayLabel: 'eSewa Mobile Wallet',
    currencies: ['NPR'],
    credentials: { merchantId: '', secretKey: '' },
  }),
  base({
    id: 'imepay',
    type: GATEWAY_TYPES.IMEPAY,
    sortOrder: 3,
    enabled: false,
    displayLabel: 'IME Pay',
    currencies: ['NPR'],
    credentials: { merchantId: '', password: '' },
  }),
  base({
    id: 'fonepay',
    type: GATEWAY_TYPES.FONEPAY,
    sortOrder: 4,
    enabled: false,
    displayLabel: 'Fonepay',
    currencies: ['NPR'],
    credentials: { merchantId: '', secretKey: '' },
  }),
  base({
    id: 'card',
    type: GATEWAY_TYPES.CARD,
    sortOrder: 5,
    enabled: hasNpsEnvCredentials(),
    environment: process.env.NPS_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
    displayLabel: 'Visa / Mastercard (NPS OnePG)',
    currencies: ['NPR', 'INR', 'AUD', 'USD', 'EUR'],
    credentials: npsEnvCredentials(),
  }),
  base({
    id: 'hbl',
    type: GATEWAY_TYPES.HBL,
    sortOrder: 6,
    enabled: false,
    displayLabel: 'HBL - Himalayan Bank',
    currencies: ['NPR'],
    credentials: { merchantId: '', secretKey: '', accessKey: '' },
  }),
  base({
    id: 'manual_bank',
    type: GATEWAY_TYPES.MANUAL_BANK,
    sortOrder: 7,
    enabled: true,
    displayLabel: 'Manual Bank Transfer / QR Pay',
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
  }),
  base({
    id: 'cod',
    type: GATEWAY_TYPES.COD,
    sortOrder: 8,
    enabled: false,
    displayLabel: 'Cash on Delivery (COD)',
    currencies: ['NPR'],
    credentials: {},
  }),
];

export const GATEWAY_CREDENTIAL_FIELDS = {
  khalti: [
    { key: 'merchantCode', label: 'Khalti Merchant Code', secret: false },
    { key: 'secretKey', label: 'Khalti Secret Key', secret: true },
    { key: 'publicKey', label: 'Khalti Public Key', secret: false },
  ],
  esewa: [
    { key: 'merchantId', label: 'eSewa Merchant ID', secret: false },
    { key: 'secretKey', label: 'eSewa Secret Key', secret: true },
  ],
  imepay: [
    { key: 'merchantId', label: 'IME Pay Merchant ID', secret: false },
    { key: 'password', label: 'IME Pay Password', secret: true },
  ],
  fonepay: [
    { key: 'merchantId', label: 'Fonepay Merchant ID', secret: false },
    { key: 'secretKey', label: 'Fonepay Secret Key', secret: true },
  ],
  card: [
    { key: 'merchantId', label: 'Merchant ID', secret: false },
    { key: 'merchantName', label: 'Merchant Name', secret: false },
    { key: 'apiUsername', label: 'API Username', secret: false },
    { key: 'apiPassword', label: 'API Password', secret: true },
    { key: 'secretKey', label: 'Gateway API Secret Key', secret: true },
    { key: 'instrumentCode', label: 'Instrument Code (optional — leave blank for UAT)', secret: false },
  ],
  hbl: [
    { key: 'merchantId', label: 'HBL Merchant ID', secret: false },
    { key: 'secretKey', label: 'HBL Secret Key', secret: true },
    { key: 'accessKey', label: 'HBL Access Key', secret: false },
  ],
  manual_bank: [
    { key: 'bankName', label: 'Bank / Wallet Name', secret: false },
    { key: 'accountHolder', label: 'Account Holder Name', secret: false },
    { key: 'accountNumber', label: 'Account Number', secret: false },
    { key: 'branchName', label: 'Branch Name', secret: false },
    { key: 'transferType', label: 'Transfer Type', secret: false, kind: 'select', options: [
      { value: 'qr', label: 'QR Code' },
      { value: 'bank_account', label: 'Bank Account' },
    ]},
    { key: 'qrCodeImage', label: 'QR Code Image URL', secret: false, kind: 'image' },
    { key: 'instruction', label: 'Instruction', secret: false, kind: 'textarea' },
  ],
  cod: [],
};
