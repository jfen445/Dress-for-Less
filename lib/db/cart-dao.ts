import { CartType } from "../../common/types";
import { CartSchema } from "./schema";

export async function addToCart(cart: CartType) {
  // const hashedPassword = await bcrypt.hash(user.password, 10);

  const newCartItem = await CartSchema.create({
    dressId: cart.dressId,
    userId: cart.userId,
    dateBooked: cart.dateBooked,
    size: cart.size,
  });

  return newCartItem;
}

export async function getCart(userId: String) {
  return CartSchema.find({ userId }, "dressId userId dateBooked size");
}

export async function getCartItem(
  userId: String,
  dressId: string,
  size: string,
  dateBooked: string
) {
  return CartSchema.findOne(
    { userId, dressId, size, dateBooked },
    "dressId userId dateBooked size"
  );
}

export async function removeItemFromCart(cartId: String) {
  return CartSchema.findByIdAndDelete(cartId);
}
