import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { personalizationKey } from '../utils/personalization.js';

const makeCartItemId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1, personalization = null) => {
        const items = get().items;
        const pKey = personalizationKey(personalization);
        const oKey = product.optionsKey || '';
        const existing = items.find(
          (i) =>
            i.productId === product._id &&
            i.personalizationKey === pKey &&
            (i.optionsKey || '') === oKey
        );

        if (existing) {
          set({
            items: items.map((i) =>
              i.cartItemId === existing.cartItemId
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                cartItemId: makeCartItemId(),
                productId: product._id,
                name: product.name,
                price: product.price,
                image: product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url,
                quantity,
                personalization: personalization || null,
                personalizationKey: pKey,
                selectedOptions: product.selectedOptions || [],
                optionsKey: oKey,
              },
            ],
          });
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
      clearCart: () => set({ items: [], coupon: null }),
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
    { name: 'koseli-cart' }
  )
);
