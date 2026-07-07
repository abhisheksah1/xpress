import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { personalizationKey, resolveCartItemPersonalization, clearProductPrintUpload, clearAllProductPrintUploads, persistProductPrintUpload } from '../utils/personalization.js';

const makeCartItemId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const resolvePersonalization = (productId, personalization, productUploads) => {
  const pending = productUploads?.[productId];
  return resolveCartItemPersonalization(
    { productId, personalization },
    { [productId]: pending }
  );
};

const printFieldsFromPersonalization = (personalization) => ({
  printImageUrl: personalization?.printImageUrl,
  printImageName: personalization?.printImageName,
});

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      productUploads: {},
      setProductUpload: (productId, upload) => {
        if (!productId || !upload?.printImageUrl) return;
        persistProductPrintUpload(productId, upload);
        set((state) => ({
          productUploads: {
            ...state.productUploads,
            [productId]: {
              printImageUrl: upload.printImageUrl,
              printImageName: upload.printImageName || '',
            },
          },
        }));
      },
      clearProductUpload: (productId) => {
        if (!productId) return;
        set((state) => {
          const next = { ...state.productUploads };
          delete next[productId];
          return { productUploads: next };
        });
      },
      addItem: (product, quantity = 1, personalization = null) => {
        const items = get().items;
        const normalizedPersonalization = resolvePersonalization(
          product._id,
          personalization,
          get().productUploads
        );
        const pKey = personalizationKey(normalizedPersonalization);
        const oKey = product.optionsKey || '';
        const existing = items.find(
          (i) =>
            i.productId === product._id &&
            i.personalizationKey === pKey &&
            (i.optionsKey || '') === oKey
        );

        if (existing) {
          set((state) => ({
            items: state.items.map((i) =>
              i.cartItemId === existing.cartItemId
                ? {
                    ...i,
                    quantity: i.quantity + quantity,
                    personalization: normalizedPersonalization ?? i.personalization,
                    personalizationKey: pKey,
                    ...printFieldsFromPersonalization(normalizedPersonalization ?? i.personalization),
                  }
                : i
            ),
            productUploads: (() => {
              const next = { ...state.productUploads };
              delete next[product._id];
              return next;
            })(),
          }));
          clearProductPrintUpload(product._id);
        } else {
          set((state) => ({
            items: [
              ...state.items,
              {
                cartItemId: makeCartItemId(),
                productId: product._id,
                name: product.name,
                price: product.price,
                image: product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url,
                quantity,
                personalization: normalizedPersonalization,
                personalizationKey: pKey,
                ...printFieldsFromPersonalization(normalizedPersonalization),
                selectedOptions: product.selectedOptions || [],
                optionsKey: oKey,
              },
            ],
            productUploads: (() => {
              const next = { ...state.productUploads };
              delete next[product._id];
              return next;
            })(),
          }));
          clearProductPrintUpload(product._id);
        }
      },
      removeItem: (cartItemId) =>
        set({ items: get().items.filter((i) => i.cartItemId !== cartItemId) }),
      updateQuantity: (cartItemId, quantity) =>
        set({
          items: get().items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        }),
      clearCart: () => {
        clearAllProductPrintUploads();
        set({ items: [], coupon: null, productUploads: {} });
      },
      coupon: null,
      setCoupon: (coupon) => set({ coupon }),
      clearCoupon: () => set({ coupon: null }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      grandTotal: () => {
        const subtotal = get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const discount = get().coupon?.discount || 0;
        return Math.max(0, subtotal - (get().coupon?.subtotalDiscount || discount));
      },
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'koseli-cart-v3' }
  )
);
