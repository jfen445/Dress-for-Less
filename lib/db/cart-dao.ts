import { CartType } from "../../common/types";
import { CartSchema } from "./schema";

export async function addToCart(cart: CartType) {
  // const hashedPassword = await bcrypt.hash(user.password, 10);

  const newCartItem = await CartSchema.create({
    dressId: cart.dressId,
    userId: cart.userId,
    dateBooked: cart.dateBooked,
  });

  return newCartItem;
}

export async function getCart(userId: String) {
  return CartSchema.find({ userId }, "dressId userId dateBooked");
}

export async function getCartItem(userId: String, dressId: string) {
  return CartSchema.find({ userId, dressId }, "dressId userId dateBooked");
}

export async function removeItemFromCart(cartId: String) {
  return CartSchema.findByIdAndDelete(cartId);
}