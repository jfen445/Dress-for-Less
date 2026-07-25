import { CartType } from "../../common/types";
import { CartSchema } from "./schema";

export async function addToCart(cart: CartType) {
  const newCartItem = await CartSchema.create({
    dressId: cart.dressId,
    userId: cart.userId,
    dateBooked: cart.dateBooked,
    size: cart.size,
    deliveryType: cart.deliveryType,
  });

  return newCartItem;
}

export async function getCart(userId: String) {
  return CartSchema.find(
    { userId },
    "dressId userId dateBooked size deliveryType",
  );
}

export async function getCartItem(
  userId: String,
  dressId: string,
  size: string,
  dateBooked: string
) {
  return CartSchema.findOne(
    { userId, dressId, size, dateBooked },
    "dressId userId dateBooked size deliveryType"
  );
}

export async function removeItemFromCart(cartId: String) {
  return CartSchema.findByIdAndDelete(cartId);
}

// Scoped delete: only removes the item if it belongs to the given user.
// Returns null when the item doesn't exist or isn't owned by that user.
export async function removeItemFromCartForUser(cartId: String, userId: String) {
  return CartSchema.findOneAndDelete({ _id: cartId, userId });
}

export async function removeItemFromCartByFields(
  userId: String,
  dressId: String,
  dateBooked: String,
  size: String
) {
  return CartSchema.findOneAndDelete({ userId, dressId, dateBooked, size });
}
