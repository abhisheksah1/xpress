import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/cartStore.js';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import { convertFromNpr, formatMoney, getCheckoutDisplayCurrencies } from '../../utils/currency.js';
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
  validatePhoneForCountry,
  phoneMaxLength,
} from '../../utils/countryCodes.js';
import { CheckoutCurrencyToggle, CheckoutPaymentGrid } from '../../components/store/CheckoutPaymentOptions.jsx';
import ImageSizeGuide from '../../components/ImageSizeGuide.jsx';
import { clearPendingPayment, redirectToPayment, savePendingPayment } from '../../utils/checkoutPayment.js';
import { formatTimeSlotOption, formatTimeSlotSummary } from '../../utils/timeSlot.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { resolveCartItemPersonalization } from '../../utils/personalization.js';
import {
  filterAvailableTimeSlots,
  getMinPreferredDeliveryDate,
  validatePreferredDeliverySelection,
} from '../../utils/deliveryScheduling.js';

function FormField({ id, label, required, optional, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-slate-600 mb-1.5 block">
        {label}
        {required && (
          <span className="text-rose-600" aria-hidden>
            {' '}
            *
          </span>
        )}
        {optional && <span className="font-normal text-slate-400"> (optional)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function SummaryMoney({ amount, className = '' }) {
  return (
    <span className={`shrink-0 max-w-[48%] text-right tabular-nums leading-snug break-words sm:max-w-none sm:whitespace-nowrap ${className}`}>
      {amount}
    </span>
  );
}

function SummaryRow({ label, amount, labelClassName = 'text-slate-500', amountClassName = 'font-semibold' }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className={`min-w-0 text-xs sm:text-sm ${labelClassName}`}>{label}</span>
      <SummaryMoney amount={amount} className={`text-xs sm:text-sm ${amountClassName}`} />
    </div>
  );
}

const defaultSender = () => ({
  fullName: '',
  email: '',
  phone: '',
  countryCode: DEFAULT_COUNTRY_CODE,
});

const defaultReceiver = () => ({
  fullName: '',
  phone: '',
  countryCode: DEFAULT_COUNTRY_CODE,
  address: '',
});

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { settings, displayCurrencyCode, setDisplayCurrencyCode, currencies: storeCurrencies } = useStore();
  const { items, coupon, clearCart, setCoupon, clearCoupon } = useCartStore();

  const [sender, setSender] = useState(defaultSender());
  const [receiver, setReceiver] = useState(defaultReceiver());
  const [note, setNote] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [timeSlotId, setTimeSlotId] = useState('');
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [addonInputs, setAddonInputs] = useState({});
  const [addonUploading, setAddonUploading] = useState({});

  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [deliveryLocationId, setDeliveryLocationId] = useState('');
  const [gateways, setGateways] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');

  const [couponCode, setCouponCode] = useState(coupon?.coupon?.code || '');
  const [couponApplying, setCouponApplying] = useState(false);

  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [mobileSummaryCollapsed, setMobileSummaryCollapsed] = useState(true);
  const leavingForPaymentRef = useRef(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncSheetState = () => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (!isMobile) {
        root.removeAttribute('data-checkout-sheet');
        return;
      }
      root.dataset.checkoutSheet = mobileSummaryCollapsed ? 'collapsed' : 'open';
    };

    syncSheetState();
    const mq = window.matchMedia('(max-width: 767px)');
    mq.addEventListener('change', syncSheetState);
    return () => {
      root.removeAttribute('data-checkout-sheet');
      mq.removeEventListener('change', syncSheetState);
    };
  }, [mobileSummaryCollapsed]);

  const enabledCurrencies = useMemo(
    () => (storeCurrencies?.length ? storeCurrencies : getCheckoutDisplayCurrencies(settings)),
    [storeCurrencies, settings]
  );
  const [payoutCurrency, setPayoutCurrency] = useState(displayCurrencyCode || 'NPR');

  useEffect(() => {
    setPayoutCurrency(displayCurrencyCode);
  }, [displayCurrencyCode]);
  const selectedCurrency = useMemo(
    () => enabledCurrencies.find((c) => c.code === payoutCurrency) || enabledCurrencies[0],
    [enabledCurrencies, payoutCurrency]
  );

  const serviceAddons = useMemo(
    () => (settings?.service_addons || []).filter((a) => a.enabled !== false),
    [settings?.service_addons]
  );

  const minDeliveryDate = useMemo(
    () => getMinPreferredDeliveryDate({ nowMs }),
    [nowMs]
  );

  useEffect(() => {
    storeApi
      .getDeliveryLocations()
      .then((res) => {
        const locations = res.data.data || [];
        setDeliveryLocations(locations);
        setDeliveryLocationId((current) => {
          if (current) return current;
          const kathmandu = locations.find(
            (loc) => String(loc.name || '').trim().toLowerCase() === 'kathmandu valley'
          );
          return kathmandu?._id ? String(kathmandu._id) : '';
        });
      })
      .catch(() => setDeliveryLocations([]));
  }, []);

  const selectedDeliveryLocation = useMemo(
    () => deliveryLocations.find((l) => String(l._id) === String(deliveryLocationId)),
    [deliveryLocations, deliveryLocationId]
  );

  const timeSlots = useMemo(() => {
    if (!selectedDeliveryLocation?.timeSlotsEnabled) return [];
    return (selectedDeliveryLocation.timeSlots || [])
      .filter((s) => s.enabled !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [selectedDeliveryLocation]);

  const availableTimeSlots = useMemo(
    () => filterAvailableTimeSlots(timeSlots, preferredDate, { nowMs }),
    [timeSlots, preferredDate, nowMs]
  );

  useEffect(() => {
    if (!timeSlotId) return;
    if (!availableTimeSlots.length || !availableTimeSlots.find((s) => s.id === timeSlotId)) {
      setTimeSlotId('');
    }
  }, [deliveryLocationId, availableTimeSlots, timeSlotId, preferredDate]);

  useEffect(() => {
    if (!preferredDate) return;
    if (preferredDate < minDeliveryDate) {
      setPreferredDate('');
    }
  }, [preferredDate, minDeliveryDate]);

  useEffect(() => {
    setTimeSlotId('');
  }, [deliveryLocationId]);

  useEffect(() => {
    const code = payoutCurrency || 'NPR';
    storeApi.getPaymentGateways(code)
      .then((res) => {
        const list = (res.data.data || []).filter((g) => g.enabled !== false);
        setGateways(list);
        if (list.length && !list.find((g) => g.id === paymentMethod)) {
          setPaymentMethod(list[0].id);
        }
      })
      .catch(() => setGateways([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutCurrency]);

  const itemsSubtotalNpr = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const addonsSubtotalNpr = useMemo(() => {
    return selectedAddonIds.reduce((sum, id) => {
      const addon = serviceAddons.find((a) => a.id === id);
      return sum + (Number(addon?.price) || 0);
    }, 0);
  }, [selectedAddonIds, serviceAddons]);

  const buildQuotePayload = () => ({
    code: couponCode.trim() || undefined,
    items: items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.price,
    })),
    paymentMethod: paymentMethod || undefined,
    deliveryLocationId: deliveryLocationId || undefined,
    serviceAddonIds: selectedAddonIds.length ? selectedAddonIds : undefined,
    timeSlotId: timeSlotId || undefined,
  });

  const refreshQuote = async () => {
    if (!items.length) return;
    setQuoteLoading(true);
    try {
      const { data } = await storeApi.checkoutQuote(buildQuotePayload());
      setQuote(data.data);
      if (data.data?.coupon) setCoupon(data.data);
      else if (!couponCode.trim()) clearCoupon();
    } catch (err) {
      if (couponCode.trim()) {
        setQuote(null);
        clearCoupon();
      }
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryLocationId, paymentMethod, selectedAddonIds, timeSlotId, items.length]);

  const applyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return toast.error('Enter a coupon code');
    setCouponApplying(true);
    try {
      const { data } = await storeApi.validateCoupon({ ...buildQuotePayload(), code: couponCode.trim() });
      setQuote(data.data);
      setCoupon(data.data);
      toast.success(data.data.message || 'Coupon applied');
    } catch (err) {
      setQuote(null);
      clearCoupon();
      toast.error(err.response?.data?.message || 'Invalid coupon');
    } finally {
      setCouponApplying(false);
    }
  };

  const removeCoupon = () => {
    clearCoupon();
    setCouponCode('');
    toast.success('Coupon removed');
    refreshQuote();
  };

  const totalsNpr = useMemo(() => {
    if (quote) {
      return {
        itemsSubtotal: quote.itemsSubtotal ?? itemsSubtotalNpr,
        addonsTotal: quote.addonsTotal ?? addonsSubtotalNpr,
        subtotal: quote.subtotal ?? itemsSubtotalNpr + addonsSubtotalNpr,
        baseDeliveryFee: quote.baseDeliveryFee ?? 0,
        slotFee: quote.slotFee ?? quote.timeSlot?.fee ?? 0,
        shippingFee: quote.shippingFee ?? 0,
        discount: quote.discount || 0,
        total: quote.total ?? 0,
        timeSlot: quote.timeSlot || null,
        deliveryWarnings: quote.deliveryWarnings || [],
      };
    }

    const loc = selectedDeliveryLocation;
    const baseDeliveryFee = loc ? Number(loc.deliveryFee) || 0 : 0;
    const slot = timeSlots.find((s) => s.id === timeSlotId);
    const slotFee = slot ? Number(slot.fee) || 0 : 0;
    const shippingFee = baseDeliveryFee + slotFee;
    const subtotal = itemsSubtotalNpr + addonsSubtotalNpr;
    const discount = coupon?.discount || 0;

    return {
      itemsSubtotal: itemsSubtotalNpr,
      addonsTotal: addonsSubtotalNpr,
      subtotal,
      baseDeliveryFee: deliveryLocationId ? baseDeliveryFee : 0,
      slotFee,
      shippingFee: deliveryLocationId ? shippingFee : 0,
      discount,
      total: Math.max(0, subtotal + (deliveryLocationId ? shippingFee : 0) - discount),
      timeSlot: slot ? { id: slot.id, label: slot.label, fee: slotFee } : null,
      deliveryWarnings: [],
    };
  }, [quote, itemsSubtotalNpr, addonsSubtotalNpr, deliveryLocationId, selectedDeliveryLocation, coupon, timeSlots, timeSlotId]);

  const display = (nprAmount) => convertFromNpr(nprAmount, selectedCurrency);
  const fmt = (nprAmount) => formatMoney(display(nprAmount), selectedCurrency);

  const setSenderField = (k, v) => setSender((s) => ({ ...s, [k]: v }));
  const setReceiverField = (k, v) => setReceiver((r) => ({ ...r, [k]: v }));

  const toggleAddon = (id) => {
    setSelectedAddonIds((prev) => {
      if (prev.includes(id)) {
        setAddonInputs((inputs) => {
          const next = { ...inputs };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const setAddonInput = (id, field, value) => {
    setAddonInputs((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const setAddonInputsBatch = (id, patch) => {
    setAddonInputs((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));
  };

  const uploadAddonPhoto = async (addonId, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');

    setAddonUploading((prev) => ({ ...prev, [addonId]: true }));
    setAddonInput(addonId, 'photoError', '');
    try {
      const { data } = await storeApi.uploadPersonalizationImage(file);
      const url = data.data?.url || '';
      if (!url) throw new Error('No image URL returned');
      setAddonInputsBatch(addonId, { photoUrl: url, photoName: file.name, photoError: '' });
      toast.success('Photo uploaded');
    } catch (err) {
      setAddonInput(addonId, 'photoError', err.response?.data?.message || 'Photo upload failed');
      toast.error(err.response?.data?.message || 'Photo upload failed. Please try again.');
    } finally {
      setAddonUploading((prev) => ({ ...prev, [addonId]: false }));
    }
  };

  const needsAddonText = (addon) => ['text', 'both'].includes(addon?.inputType || 'none');
  const needsAddonPhoto = (addon) => ['photo', 'both'].includes(addon?.inputType || 'none');

  const buildServiceAddonsPayload = () =>
    selectedAddonIds.map((id) => {
      const input = addonInputs[id] || {};
      return {
        id,
        text: input.text?.trim() || undefined,
        photoUrl: input.photoUrl || undefined,
        photoName: input.photoName || undefined,
      };
    });

  const validateForm = () => {
    if (!sender.fullName.trim()) return 'Sender full name is required';
    if (!sender.email.trim()) return 'Sender email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.email.trim())) return 'Enter a valid email address';
    if (!sender.phone.trim()) return 'Sender mobile number is required';
    if (!receiver.fullName.trim()) return 'Recipient full name is required';
    const receiverPhoneErr = validatePhoneForCountry(receiver.phone, receiver.countryCode);
    if (receiverPhoneErr) return receiverPhoneErr;
    if (!deliveryLocationId) return 'Please select a delivery district or city';
    if (!receiver.address.trim()) return 'Delivery address is required';
    if (!paymentMethod) return 'Please select a payment method';

    for (const id of selectedAddonIds) {
      const addon = serviceAddons.find((a) => a.id === id);
      const input = addonInputs[id] || {};
      if (needsAddonText(addon) && !input.text?.trim()) {
        return `Please enter text for "${addon?.name || 'add-on'}"`;
      }
      if (needsAddonPhoto(addon) && !input.photoUrl) {
        return `Please upload a photo for "${addon?.name || 'add-on'}"`;
      }
      if (addonUploading[id]) return 'Please wait for photo upload to finish';
    }

    const deliveryErrors = validatePreferredDeliverySelection({
      preferredDeliveryDate: preferredDate,
      timeSlotId,
      timeSlots,
      nowMs,
    });
    if (deliveryErrors.length) return deliveryErrors[0];

    return null;
  };

  const placeOrder = async () => {
    if (!items.length) return toast.error('Your cart is empty');
    const err = validateForm();
    if (err) return toast.error(err);

    for (const item of items) {
      const p = resolveCartItemPersonalization(item, useCartStore.getState().productUploads);
      if (p?.printImageName && !p?.printImageUrl) {
        return toast.error(`Custom image for "${item.name}" did not save correctly. Remove the item and add it again from the product page.`);
      }
    }

    const productUploads = useCartStore.getState().productUploads;

    setPlacing(true);
    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          selectedOptions: i.selectedOptions || [],
          personalization: resolveCartItemPersonalization(i, productUploads),
        })),
        sender: {
          fullName: sender.fullName.trim(),
          email: sender.email.trim(),
          phone: sender.phone.trim(),
          countryCode: sender.countryCode,
        },
        receiver: {
          fullName: receiver.fullName.trim(),
          phone: receiver.phone.trim(),
          countryCode: receiver.countryCode,
          address: receiver.address.trim(),
        },
        deliveryLocationId,
        paymentMethod,
        couponCode: couponCode.trim() || undefined,
        notes: note.trim() || undefined,
        preferredDeliveryDate: preferredDate || undefined,
        timeSlotId: timeSlotId || undefined,
        serviceAddons: selectedAddonIds.length ? buildServiceAddonsPayload() : undefined,
        checkoutCurrency: payoutCurrency,
      };

      const { data } = await storeApi.createOrder(payload);
      const order = data.data?.order;
      const payment = data.data?.payment;
      const method = paymentMethod;

      if (method === 'cod' || method === 'manual_bank') {
        toast.success(data.message || 'Order placed');
        clearCart();
        clearPendingPayment();
        navigate('/orders');
        return;
      }

      if (!order?._id) {
        throw new Error('Order was created but no order reference was returned');
      }

      savePendingPayment({
        orderId: order._id,
        method,
        orderNumber: order.orderNumber,
        total: order.total,
      });

      // Hard-navigate to the gateway BEFORE any React state updates.
      // Updating cart/UI first paints checkout/cart empty screens for a few frames.
      const redirected = redirectToPayment(method, payment);
      if (redirected) {
        leavingForPaymentRef.current = true;
        window.setTimeout(() => {
          try {
            useCartStore.getState().clearCart();
          } catch {
            /* page may already be unloading */
          }
        }, 1000);
        return;
      }

      clearCart();
      setPlacing(false);
      toast.success('Order created — complete payment to confirm.');
      navigate('/orders');
    } catch (err) {
      leavingForPaymentRef.current = false;
      setPlacing(false);
      toast.error(err.response?.data?.message || 'Failed to place order');
    }
  };

  if (leavingForPaymentRef.current) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Redirecting to payment</h1>
        <p className="text-slate-600 mb-2">Please wait — opening your selected payment method…</p>
        <p className="text-xs text-slate-400">Do not refresh or press back.</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Checkout</h1>
        <p className="text-gray-400">Your cart is empty.</p>
      </div>
    );
  }

  const showNprDisclaimer = selectedCurrency?.code && selectedCurrency.code !== 'NPR';

  return (
    <div className="bg-[#FCF9F9] min-h-screen">
      <div className="max-w-7xl mx-auto w-full min-w-0 px-3 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Checkout</h1>
          <p className="text-sm text-slate-500 mt-1">Enter sender & receiver details, choose add-ons and payment.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 md:items-start">
          <div
            className={`md:col-span-7 space-y-5 sm:space-y-6 min-w-0 transition-[padding] duration-300 ${
              mobileSummaryCollapsed ? 'max-md:pb-28' : 'max-md:pb-4'
            }`}
          >
            {/* Sender */}
            <div className="card space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Sender details</h2>
              <FormField id="sender-full-name" label="Full name" required>
                <input
                  id="sender-full-name"
                  className="input-field"
                  autoComplete="name"
                  placeholder="e.g. John Doe"
                  value={sender.fullName}
                  onChange={(e) => setSenderField('fullName', e.target.value)}
                />
              </FormField>
              <FormField id="sender-email" label="Email address" required>
                <input
                  id="sender-email"
                  className="input-field"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. john@example.com"
                  value={sender.email}
                  onChange={(e) => setSenderField('email', e.target.value)}
                />
              </FormField>
              <FormField id="sender-phone" label="Mobile number" required>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    id="sender-country-code"
                    className="input-field w-full sm:w-36 md:w-44 shrink-0 text-sm"
                    aria-label="Country calling code"
                    value={sender.countryCode}
                    onChange={(e) => setSenderField('countryCode', e.target.value)}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={`${c.code}-${c.country}`} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    id="sender-phone"
                    className="input-field w-full flex-1 min-w-0"
                    type="tel"
                    autoComplete="tel-national"
                    placeholder={
                      sender.countryCode === DEFAULT_COUNTRY_CODE
                        ? 'e.g. 98XXXXXXXX'
                        : 'Enter mobile number'
                    }
                    maxLength={phoneMaxLength(sender.countryCode)}
                    value={sender.phone}
                    onChange={(e) =>
                      setSenderField(
                        'phone',
                        e.target.value.replace(/\D/g, '').slice(0, phoneMaxLength(sender.countryCode))
                      )
                    }
                  />
                </div>
              </FormField>
            </div>

            {/* Receiver */}
            <div className="card space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Receiver details</h2>
              <FormField id="receiver-full-name" label="Recipient full name" required>
                <input
                  id="receiver-full-name"
                  className="input-field"
                  autoComplete="name"
                  placeholder="e.g. Jane Doe"
                  value={receiver.fullName}
                  onChange={(e) => setReceiverField('fullName', e.target.value)}
                />
              </FormField>
              <FormField id="receiver-phone" label="Contact number" required>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    id="receiver-country-code"
                    className="input-field w-full sm:w-36 md:w-44 shrink-0 text-sm"
                    aria-label="Country calling code"
                    value={receiver.countryCode}
                    onChange={(e) => setReceiverField('countryCode', e.target.value)}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={`recv-${c.code}-${c.country}`} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    id="receiver-phone"
                    className="input-field w-full flex-1 min-w-0"
                    type="tel"
                    autoComplete="tel-national"
                    placeholder={
                      receiver.countryCode === DEFAULT_COUNTRY_CODE
                        ? '10-digit mobile number'
                        : 'Enter contact number'
                    }
                    maxLength={phoneMaxLength(receiver.countryCode)}
                    value={receiver.phone}
                    onChange={(e) =>
                      setReceiverField(
                        'phone',
                        e.target.value.replace(/\D/g, '').slice(0, phoneMaxLength(receiver.countryCode))
                      )
                    }
                  />
                </div>
              </FormField>
              <FormField id="delivery-location" label="Delivery district / city" required>
                <select
                  id="delivery-location"
                  className="input-field"
                  value={deliveryLocationId}
                  onChange={(e) => setDeliveryLocationId(e.target.value)}
                >
                  <option value="">Select delivery district or city</option>
                  {deliveryLocations.map((loc) => (
                    <option key={loc._id} value={loc._id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="delivery-address" label="Delivery address" required>
                <input
                  id="delivery-address"
                  className="input-field"
                  autoComplete="street-address"
                  placeholder="House number, street, area, landmark"
                  value={receiver.address}
                  onChange={(e) => setReceiverField('address', e.target.value)}
                />
              </FormField>
              <FormField id="order-note" label="Order note" optional>
                <input
                  id="order-note"
                  className="input-field"
                  placeholder="Special instructions for delivery"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </FormField>
              <div className="grid sm:grid-cols-2 gap-3">
                <FormField
                  id="preferred-date"
                  label="Preferred delivery date"
                  optional
                >
                  <input
                    id="preferred-date"
                    type="date"
                    className="input-field"
                    min={minDeliveryDate}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </FormField>
                {timeSlots.length > 0 && (
                  <div className="sm:col-span-2">
                    <FormField
                      id="time-slot"
                      label="Preferred time slot"
                      optional
                    >
                      <select
                        id="time-slot"
                        className="input-field"
                        value={timeSlotId}
                        onChange={(e) => setTimeSlotId(e.target.value)}
                      >
                        <option value="">Any time on selected date</option>
                        {availableTimeSlots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {formatTimeSlotOption(slot, (npr) => fmt(npr))}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    {timeSlotId && (
                      <p className="text-xs text-slate-500 mt-1.5">
                        {(() => {
                          const slot = availableTimeSlots.find((s) => s.id === timeSlotId);
                          if (!slot) return null;
                          const fee = Number(slot.fee || 0);
                          const summary = formatTimeSlotSummary(slot, (npr) => fmt(npr));
                          return fee > 0
                            ? `Selected: ${summary}. This fee is added to delivery.`
                            : `Selected: ${summary}. No extra delivery charge.`;
                        })()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Service add-ons */}
            {serviceAddons.length > 0 && (
              <div className="card space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Service add-ons</h2>
                <div className="space-y-3">
                  {serviceAddons.map((addon) => {
                    const selected = selectedAddonIds.includes(addon.id);
                    const input = addonInputs[addon.id] || {};
                    const showText = selected && needsAddonText(addon);
                    const showPhoto = selected && needsAddonPhoto(addon);

                    return (
                      <div
                        key={addon.id}
                        className={`p-3 border rounded-xl bg-white ${selected ? 'border-primary-400 ring-2 ring-primary-500/20' : 'border-gray-200'}`}
                      >
                        <label className="flex flex-wrap items-start gap-x-3 gap-y-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1 shrink-0"
                            checked={selected}
                            onChange={() => toggleAddon(addon.id)}
                          />
                          <div className="flex-1 min-w-0 basis-[calc(100%-2rem)] sm:basis-auto">
                            <p className="text-sm font-semibold text-slate-900">{addon.name}</p>
                            {addon.description && <p className="text-xs text-slate-500 mt-0.5">{addon.description}</p>}
                          </div>
                          <span className="text-sm font-bold text-slate-800 shrink-0 ml-auto sm:ml-0">
                            Rs. {Number(addon.price || 0).toLocaleString('en-NP')}
                          </span>
                        </label>

                        {selected && (showText || showPhoto) && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 pl-7">
                            {showText && (
                              <FormField
                                id={`addon-text-${addon.id}`}
                                label={addon.inputType === 'both' ? 'Add-on text details' : 'Add-on text'}
                                required
                              >
                                <input
                                  id={`addon-text-${addon.id}`}
                                  className="input-field"
                                  placeholder={`Enter details for ${addon.name}`}
                                  value={input.text || ''}
                                  onChange={(e) => setAddonInput(addon.id, 'text', e.target.value)}
                                />
                              </FormField>
                            )}
                            {showPhoto && (
                              <FormField
                                id={`addon-photo-${addon.id}`}
                                label={addon.inputType === 'both' ? 'Add-on photo' : 'Upload photo'}
                                required
                              >
                                <ImageSizeGuide guide="customerPhoto" variant="store" className="mb-2" />
                                <div className="flex flex-wrap items-center gap-3">
                                  <label className="inline-flex items-center px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                                    {addonUploading[addon.id] ? 'Uploading...' : input.photoUrl ? 'Change photo' : 'Choose photo'}
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/jpg,image/webp"
                                      className="hidden"
                                      disabled={addonUploading[addon.id]}
                                      onChange={(e) => {
                                        uploadAddonPhoto(addon.id, e.target.files?.[0]);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                  {input.photoName && !addonUploading[addon.id] && (
                                    <span className="text-xs text-slate-500 truncate max-w-[180px]">{input.photoName}</span>
                                  )}
                                </div>
                                {addonUploading[addon.id] && (
                                  <p className="text-xs text-slate-400 mt-1">Uploading photo...</p>
                                )}
                                {input.photoError && (
                                  <p className="text-xs text-red-600 mt-1">{input.photoError}</p>
                                )}
                                {input.photoUrl && (
                                  <div className="mt-2">
                                    <img
                                      src={resolveMediaUrl(input.photoUrl)}
                                      alt="Add-on upload preview"
                                      className="h-20 w-auto max-w-full object-contain border border-slate-200 rounded-lg bg-white p-1"
                                    />
                                    <p className="text-xs text-emerald-600 mt-1">Photo ready</p>
                                  </div>
                                )}
                              </FormField>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Currency & payment methods */}
            <div className="space-y-4">
              <CheckoutCurrencyToggle
                currencies={enabledCurrencies}
                value={payoutCurrency}
                selectedCurrency={selectedCurrency}
                onChange={(code) => {
                  setPayoutCurrency(code);
                  setDisplayCurrencyCode(code);
                }}
              />
              <CheckoutPaymentGrid
                gateways={gateways}
                value={paymentMethod}
                onChange={setPaymentMethod}
              />
              {quote?.coupon?.appliesTo === 'payment_gateway' && (
                <p className="text-xs text-amber-600 px-1">This coupon requires an eligible payment method.</p>
              )}
            </div>
          </div>

          {/* Mobile backdrop — dims page above content-sized sheet */}
          {!mobileSummaryCollapsed && (
            <button
              type="button"
              className="md:hidden fixed inset-0 z-[54] bg-slate-900/40"
              aria-label="Close payment summary"
              onClick={() => setMobileSummaryCollapsed(true)}
            />
          )}

          {/* Summary — sticky under header on tablet/desktop, collapsible bottom sheet on mobile */}
          <aside
            className={`md:col-span-5 min-w-0 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-[55] max-md:flex max-md:flex-col max-md:max-h-[min(85dvh,40rem)] max-md:border-t max-md:border-slate-200 max-md:bg-[#FCF9F9] max-md:shadow-[0_-8px_24px_rgba(15,23,42,0.12)] max-md:transition-transform max-md:duration-300 max-md:ease-in-out md:sticky md:self-start md:overflow-y-auto md:top-[calc(var(--store-header-h,9.5rem)+0.75rem)] md:max-h-[calc(100dvh-var(--store-header-h,9.5rem)-1.5rem)] md:translate-y-0 md:z-auto ${
              mobileSummaryCollapsed
                ? 'max-md:translate-y-[calc(100%-5.25rem)] max-md:overflow-hidden'
                : 'max-md:translate-y-0 max-md:overflow-hidden'
            }`}
          >
            <div className="md:hidden sticky top-0 z-10 shrink-0 flex items-center gap-2 bg-[#FCF9F9] px-3 pt-1 pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setMobileSummaryCollapsed((v) => !v)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                aria-expanded={!mobileSummaryCollapsed}
                aria-label={mobileSummaryCollapsed ? 'Expand payment summary' : 'Collapse payment summary'}
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${mobileSummaryCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setMobileSummaryCollapsed((v) => !v)}
                className="flex-1 min-w-0 text-left py-1"
                aria-expanded={!mobileSummaryCollapsed}
              >
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">Payment summary</p>
                <p className="text-sm font-extrabold text-slate-900 truncate">{fmt(totalsNpr.total)}</p>
              </button>
            </div>

            <div className="max-md:min-h-0 max-md:overflow-y-auto max-md:overscroll-contain max-md:px-3 max-md:pt-3 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] md:contents">
            <div className="card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 max-md:sr-only">
                  Payment summary
                </h2>
                {selectedCurrency && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] sm:text-xs font-bold text-slate-700 max-md:ml-auto">
                    {selectedCurrency.code}
                  </span>
                )}
              </div>

              <div className="space-y-3 max-h-48 overflow-y-auto">
                {items.map((i) => (
                  <div key={i.cartItemId} className="flex gap-2 sm:gap-3">
                    {i.image ? (
                      <img
                        src={resolveMediaUrl(i.image)}
                        alt=""
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-gray-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2">{i.name}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500">Qty: {i.quantity}</p>
                    </div>
                    <SummaryMoney amount={fmt(i.price * i.quantity)} className="text-xs sm:text-sm font-bold text-slate-900" />
                  </div>
                ))}
              </div>

              {selectedAddonIds.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-1">
                  {selectedAddonIds.map((id) => {
                    const addon = serviceAddons.find((a) => a.id === id);
                    if (!addon) return null;
                    return (
                      <div key={id} className="flex justify-between items-start gap-3 text-xs sm:text-sm">
                        <span className="text-slate-500 min-w-0 truncate">{addon.name}</span>
                        <SummaryMoney amount={fmt(addon.price)} className="font-semibold" />
                      </div>
                    );
                  })}
                </div>
              )}

              <form onSubmit={applyCoupon} className="pt-3 border-t border-gray-100 space-y-2">
                <FormField id="coupon-code" label="Coupon code">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="coupon-code"
                      className="input-field uppercase w-full min-w-0 flex-1"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <button type="submit" className="btn-secondary w-full sm:w-auto shrink-0" disabled={couponApplying}>
                      {couponApplying ? '...' : 'Apply'}
                    </button>
                  </div>
                </FormField>
                {(quote?.coupon?.code || coupon?.coupon?.code) && (
                  <div className="flex items-center justify-between text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <span className="text-green-700 font-medium">{quote?.coupon?.code || coupon?.coupon?.code} applied</span>
                    <button type="button" onClick={removeCoupon} className="text-red-500">Remove</button>
                  </div>
                )}
              </form>

              <div className="pt-3 border-t border-gray-100 space-y-1.5">
                {quoteLoading && <p className="text-xs text-slate-400">Updating totals...</p>}
                <SummaryRow label="Subtotal" amount={fmt(totalsNpr.subtotal)} />
                <SummaryRow
                  label="Base delivery"
                  amount={deliveryLocationId ? fmt(totalsNpr.baseDeliveryFee) : '—'}
                />
                {deliveryLocationId && totalsNpr.timeSlot?.id && (
                  <div className="flex justify-between items-start gap-3 text-[11px] sm:text-xs text-slate-500">
                    <span className="min-w-0 max-w-[65%] sm:max-w-[70%] leading-snug">
                      Time slot — {formatTimeSlotSummary(
                        timeSlots.find((s) => s.id === totalsNpr.timeSlot.id) || totalsNpr.timeSlot,
                        (npr) => fmt(npr)
                      )}
                    </span>
                    <SummaryMoney
                      amount={Number(totalsNpr.slotFee || 0) > 0 ? fmt(totalsNpr.slotFee) : 'No extra fee'}
                      className="font-semibold"
                    />
                  </div>
                )}
                <SummaryRow
                  label="Total delivery"
                  amount={deliveryLocationId ? fmt(totalsNpr.shippingFee) : '—'}
                />
                {totalsNpr.discount > 0 && (
                  <SummaryRow
                    label="Discount"
                    amount={`- ${fmt(totalsNpr.discount)}`}
                    labelClassName="text-emerald-700"
                    amountClassName="font-bold text-emerald-700"
                  />
                )}
                <div className="flex justify-between items-baseline gap-3 pt-2 border-t border-gray-100">
                  <span className="text-base sm:text-lg font-extrabold text-slate-900">Total</span>
                  <SummaryMoney
                    amount={fmt(totalsNpr.total)}
                    className="text-base sm:text-xl font-extrabold text-slate-900"
                  />
                </div>
                {showNprDisclaimer && (
                  <p className="text-[11px] sm:text-xs text-slate-500 pt-1 leading-relaxed">
                    NPR equivalent: Rs. {Number(totalsNpr.total).toLocaleString('en-NP')}
                  </p>
                )}
              </div>

              {showNprDisclaimer && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-900 leading-relaxed">
                  Our final settlement will be in NPR and may slightly vary at your end due to currency conversion by your bank and the bank in Nepal.
                </div>
              )}

              <button
                type="button"
                onClick={placeOrder}
                disabled={placing || !gateways.length}
                className="w-full min-h-[48px] rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-base font-bold disabled:opacity-50 transition-colors inline-flex items-center justify-center"
              >
                {placing ? 'Processing...' : 'Place Order'}
              </button>
              <p className="text-xs text-slate-400 text-center">
                By placing your order you agree to our terms and delivery policy.
              </p>
            </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
