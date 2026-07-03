import { useEffect, useMemo, useState } from 'react';
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
import { formatTimeSlotOption, formatTimeSlotSummary } from '../../utils/timeSlot.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

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
    () => (settings.service_addons || []).filter((a) => a.enabled !== false),
    [settings.service_addons]
  );

  const minDeliveryDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    storeApi.getDeliveryLocations().then((res) => setDeliveryLocations(res.data.data || [])).catch(() => setDeliveryLocations([]));
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

  useEffect(() => {
    if (!timeSlotId) return;
    if (!timeSlots.length || !timeSlots.find((s) => s.id === timeSlotId)) {
      setTimeSlotId('');
    }
  }, [deliveryLocationId, timeSlots, timeSlotId]);

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

  const deliveryWarnings = totalsNpr.deliveryWarnings || [];

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
      const url = resolveMediaUrl(data.data?.url) || data.data?.url;
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
    if (!sender.email.trim()) return 'Sender email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.email.trim())) return 'Enter a valid sender email';
    if (!sender.phone.trim()) return 'Sender mobile number is required';
    if (!receiver.fullName.trim()) return 'Receiver name is required';
    const receiverPhoneErr = validatePhoneForCountry(receiver.phone, receiver.countryCode);
    if (receiverPhoneErr) return receiverPhoneErr;
    if (!deliveryLocationId) return 'Select delivery district / city';
    if (!receiver.address.trim()) return 'Delivery address is required';
    if (!paymentMethod) return 'Select a payment method';

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

    return null;
  };

  const placeOrder = async () => {
    if (!items.length) return toast.error('Your cart is empty');
    const err = validateForm();
    if (err) return toast.error(err);

    setPlacing(true);
    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.price,
          personalization: i.personalization || undefined,
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
      toast.success(data.message || 'Order created');
      clearCart();
      navigate('/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">Checkout</h1>
          <p className="text-sm text-slate-500 mt-1">Enter sender & receiver details, choose add-ons and payment.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            {/* Sender */}
            <div className="card space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Sender details</h2>
              <input
                className="input-field"
                placeholder="Sender full name *"
                value={sender.fullName}
                onChange={(e) => setSenderField('fullName', e.target.value)}
              />
              <input
                className="input-field"
                type="email"
                placeholder="Sender email id *"
                value={sender.email}
                onChange={(e) => setSenderField('email', e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className="input-field w-44 sm:w-52 shrink-0 text-sm"
                  value={sender.countryCode}
                  onChange={(e) => setSenderField('countryCode', e.target.value)}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={`${c.code}-${c.country}`} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  className="input-field flex-1"
                  type="tel"
                  placeholder="Sender mobile number *"
                  maxLength={phoneMaxLength(sender.countryCode)}
                  value={sender.phone}
                  onChange={(e) => setSenderField('phone', e.target.value.replace(/\D/g, '').slice(0, phoneMaxLength(sender.countryCode)))}
                />
              </div>
            </div>

            {/* Receiver */}
            <div className="card space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Receiver details</h2>
              <input
                className="input-field"
                placeholder="Receiver name *"
                value={receiver.fullName}
                onChange={(e) => setReceiverField('fullName', e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className="input-field w-44 sm:w-52 shrink-0 text-sm"
                  value={receiver.countryCode}
                  onChange={(e) => setReceiverField('countryCode', e.target.value)}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={`recv-${c.code}-${c.country}`} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  className="input-field flex-1"
                  type="tel"
                  placeholder={receiver.countryCode === DEFAULT_COUNTRY_CODE ? 'Receiver contact (10 digits) *' : 'Receiver contact number *'}
                  maxLength={phoneMaxLength(receiver.countryCode)}
                  value={receiver.phone}
                  onChange={(e) => setReceiverField('phone', e.target.value.replace(/\D/g, '').slice(0, phoneMaxLength(receiver.countryCode)))}
                />
              </div>
              <select
                className="input-field"
                value={deliveryLocationId}
                onChange={(e) => setDeliveryLocationId(e.target.value)}
              >
                <option value="">Delivery district / city *</option>
                {deliveryLocations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <input
                className="input-field"
                placeholder="Address *"
                value={receiver.address}
                onChange={(e) => setReceiverField('address', e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Preferred delivery date</label>
                  <input
                    type="date"
                    className="input-field"
                    min={minDeliveryDate}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </div>
                {timeSlots.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Preferred time slot (optional)</label>
                    <select className="input-field" value={timeSlotId} onChange={(e) => setTimeSlotId(e.target.value)}>
                      <option value="">Any Time on Selected Date</option>
                      {timeSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {formatTimeSlotOption(slot, (npr) => fmt(npr))}
                        </option>
                      ))}
                    </select>
                    {timeSlotId && (
                      <p className="text-xs text-slate-500 mt-1.5">
                        {(() => {
                          const slot = timeSlots.find((s) => s.id === timeSlotId);
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
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selected}
                            onChange={() => toggleAddon(addon.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{addon.name}</p>
                            {addon.description && <p className="text-xs text-slate-500 mt-0.5">{addon.description}</p>}
                          </div>
                          <span className="text-sm font-bold text-slate-800 shrink-0">
                            Rs. {Number(addon.price || 0).toLocaleString('en-NP')}
                          </span>
                        </label>

                        {selected && (showText || showPhoto) && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 pl-7">
                            {showText && (
                              <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                                  {addon.inputType === 'both' ? 'Text details *' : 'Text *'}
                                </label>
                                <input
                                  className="input-field"
                                  placeholder="Enter details for this add-on"
                                  value={input.text || ''}
                                  onChange={(e) => setAddonInput(addon.id, 'text', e.target.value)}
                                />
                              </div>
                            )}
                            {showPhoto && (
                              <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                                  {addon.inputType === 'both' ? 'Upload photo *' : 'Photo *'}
                                </label>
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
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Display currency & payment — reference layout */}
            <div className="space-y-4">
              <CheckoutCurrencyToggle
                currencies={enabledCurrencies}
                value={payoutCurrency}
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

          {/* Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card space-y-4 lg:sticky lg:top-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Payment summary</h2>

              <div className="space-y-3 max-h-48 overflow-y-auto">
                {items.map((i) => (
                  <div key={i.cartItemId} className="flex gap-3">
                    {i.image ? (
                      <img src={i.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{i.name}</p>
                      <p className="text-xs text-slate-500">Qty: {i.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 shrink-0">{fmt(i.price * i.quantity)}</p>
                  </div>
                ))}
              </div>

              {selectedAddonIds.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-1">
                  {selectedAddonIds.map((id) => {
                    const addon = serviceAddons.find((a) => a.id === id);
                    if (!addon) return null;
                    return (
                      <div key={id} className="flex justify-between text-sm">
                        <span className="text-slate-500">{addon.name}</span>
                        <span className="font-semibold">{fmt(addon.price)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <form onSubmit={applyCoupon} className="pt-3 border-t border-gray-100 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Apply discount coupon</label>
                <div className="flex gap-2">
                  <input
                    className="input-field uppercase flex-1"
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                  <button type="submit" className="btn-secondary shrink-0" disabled={couponApplying}>
                    {couponApplying ? '...' : 'Apply'}
                  </button>
                </div>
                {(quote?.coupon?.code || coupon?.coupon?.code) && (
                  <div className="flex items-center justify-between text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <span className="text-green-700 font-medium">{quote?.coupon?.code || coupon?.coupon?.code} applied</span>
                    <button type="button" onClick={removeCoupon} className="text-red-500">Remove</button>
                  </div>
                )}
              </form>

              <div className="pt-3 border-t border-gray-100 space-y-1.5 text-sm">
                {quoteLoading && <p className="text-xs text-slate-400">Updating totals...</p>}
                {deliveryWarnings.length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-900 space-y-1 mb-2">
                    {deliveryWarnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                    <p className="font-medium">You can still proceed — we will confirm delivery details with you.</p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold">{fmt(totalsNpr.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Base delivery</span>
                  <span className="font-semibold">
                    {deliveryLocationId ? fmt(totalsNpr.baseDeliveryFee) : '—'}
                  </span>
                </div>
                {deliveryLocationId && totalsNpr.timeSlot?.id && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="max-w-[70%]">
                      Time slot — {formatTimeSlotSummary(
                        timeSlots.find((s) => s.id === totalsNpr.timeSlot.id) || totalsNpr.timeSlot,
                        (npr) => fmt(npr)
                      )}
                    </span>
                    <span className="font-semibold">
                      {Number(totalsNpr.slotFee || 0) > 0 ? fmt(totalsNpr.slotFee) : 'No extra fee'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Total delivery</span>
                  <span className="font-semibold">
                    {deliveryLocationId ? fmt(totalsNpr.shippingFee) : '—'}
                  </span>
                </div>
                {totalsNpr.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-bold">- {fmt(totalsNpr.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-lg font-extrabold text-slate-900">
                  <span>Total</span>
                  <span>{fmt(totalsNpr.total)}</span>
                </div>
                {showNprDisclaimer && (
                  <p className="text-xs text-slate-500 pt-1">
                    NPR equivalent: Rs. {Number(totalsNpr.total).toLocaleString('en-NP')}
                  </p>
                )}
              </div>

              {showNprDisclaimer && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-900 leading-relaxed">
                  Our final settlement will be in NPR and may slightly vary at your end due to currency conversion by your bank and the bank in Nepal.
                </div>
              )}

              <button type="button" onClick={placeOrder} disabled={placing || !gateways.length} className="btn-primary w-full">
                {placing ? 'Processing...' : 'Proceed to pay'}
              </button>
              <p className="text-xs text-slate-400 text-center">
                By proceeding you agree to our terms and delivery policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
