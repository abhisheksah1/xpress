export const allowsBackorder = (product) => product?.allowBackorder === true;

export const isPurchasableStock = (product, quantity = 1) => {
  if (!product) return false;
  if (allowsBackorder(product)) return true;
  return (product.stock ?? 0) >= quantity;
};
