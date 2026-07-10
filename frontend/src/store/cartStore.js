import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { personalizationKey, resolveCartItemPersonalization, clearProductPrintUpload, clearAllProductPrintUploads, persistProductPrintUpload } from '../utils/personalization.js';
import { resolveProductImageUrl } from '../utils/mediaUrl.js';
import { allowsBackorder, resolveProductStock } from '../utils/comboItems.js';

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

const stockMetaFromProduct = (product) => {
  const backorder = allowsBackorder(product);
  const stock = resolveProductStock(product);
  return {
    stock: Number.isFinite(Number(stock)) ? Number(stock) : null,
    allowBackorder: backorder,
  };
};

/** How many more units of this product can be added (null = unlimited / unknown). */
export function getRemainingStock(items, productId, stock, allowBackorder, excludeCartItemId = null) {
  if (allowBackorder) return null;
  if (stock == null || !Number.isFinite(Number(stock))) return null;
  const used = (items || [])
    .filter((i) => i.productId === productId && i.cartItemId !== excludeCartItemId)
    .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  return Math.max(0, Number(stock) - used);
}

export function getCartItemMaxQuantity(item, items = []) {
  if (!item) return 1;
  if (item.allowBackorder) return 99;
  if (item.stock == null || !Number.isFinite(Number(item.stock))) return 99;
  const remainingForOthers = getRemainingStock(
    items,
    item.productId,
    item.stock,
    false,
    item.cartItemId
  );
  if (remainingForOthers == null) return Math.max(1, Number(item.stock));
  return Math.max(1, remainingForOthers);
}

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
        const qtyToAdd = Math.max(1, Number(quantity) || 1);
        const { stock, allowBackorder } = stockMetaFromProduct(product);
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

        const remaining = getRemainingStock(
          items,
          product._id,
          stock,
          allowBackorder,
          existing?.cartItemId || null
        );

        if (remaining === 0) {
          return { ok: false, reason: 'out_of_stock', max: 0 };
        }

        let appliedQty = qtyToAdd;
        if (remaining != null && qtyToAdd > remaining) {
          appliedQty = remaining;
        }

        if (existing) {
          const nextQty = existing.quantity + appliedQty;
          set((state) => ({
            items: state.items.map((i) =>
              i.cartItemId === existing.cartItemId
                ? {
                    ...i,
                    quantity: nextQty,
                    stock: stock ?? i.stock,
                    allowBackorder,
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
          return {
            ok: true,
            capped: appliedQty < qtyToAdd,
            quantity: nextQty,
            max: remaining != null ? existing.quantity + remaining : null,
          };
        }

        set((state) => ({
          items: [
            ...state.items,
            {
              cartItemId: makeCartItemId(),
              productId: product._id,
              name: product.name,
              price: product.price,
              image: resolveProductImageUrl(product),
              quantity: appliedQty,
              stock,
              allowBackorder,
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
        return {
          ok: true,
          capped: appliedQty < qtyToAdd,
          quantity: appliedQty,
          max: remaining,
        };
      },
      removeItem: (cartItemId) =>
        set({ items: get().items.filter((i) => i.cartItemId !== cartItemId) }),
      updateQuantity: (cartItemId, quantity) => {
        const items = get().items;
        const item = items.find((i) => i.cartItemId === cartItemId);
        if (!item) return { ok: false, reason: 'not_found' };

        const requested = Math.max(1, Number(quantity) || 1);
        const max = getCartItemMaxQuantity(item, items);
        const nextQty = Math.min(requested, max);

        set({
          items: items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, quantity: nextQty } : i
          ),
        });

        return {
          ok: true,
          capped: nextQty < requested,
          quantity: nextQty,
          max,
        };
      },
      syncItemStock: (stockByProductId = {}) => {
        set((state) => {
          const withMeta = state.items.map((item) => {
            const meta = stockByProductId[String(item.productId)];
            if (!meta) return item;
            return {
              ...item,
              stock: Number.isFinite(Number(meta.stock)) ? Number(meta.stock) : item.stock,
              allowBackorder: meta.allowBackorder === true,
            };
          });

          const remainingByProduct = {};
          withMeta.forEach((item) => {
            const id = String(item.productId);
            if (item.allowBackorder || item.stock == null) return;
            if (remainingByProduct[id] == null) remainingByProduct[id] = Number(item.stock);
          });

          return {
            items: withMeta.map((item) => {
              const id = String(item.productId);
              if (item.allowBackorder || remainingByProduct[id] == null) return item;
              const allowed = remainingByProduct[id];
              if (allowed <= 0) return { ...item, quantity: 1 };
              const nextQty = Math.max(1, Math.min(item.quantity, allowed));
              remainingByProduct[id] = Math.max(0, allowed - nextQty);
              return { ...item, quantity: nextQty };
            }),
          };
        });
      },
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
