import { dbConnect, disconnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { createUser, findUser } from "../../lib/db/user-dao";
import { ICart, IUser } from "../../common/interfaces/user";
import { CartType, UserType } from "../../common/types";
import { UserSchema } from "../../lib/db/schema";
import {
  addToCart,
  getCart,
  getCartItem,
  removeItemFromCart,
} from "../../lib/db/cart-dao";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method == "GET") {
    const userId = req.query.userId as string;

    const cart = await getCart(userId);

    if (cart.length === 0) {
      res.status(404).json({
        message: "Cart is empty",
      });
    }

    const cartItems = cart as CartType[];

    res.status(200).json(cartItems);
  } else if (req.method == "POST") {
    const cart: CartType = req.body.cartItem;

    console.log("this is the cart", cart);

    const cartItem = await getCartItem(cart.userId, cart.dressId, cart.size);

    if (cartItem.length > 0) {
      return res.status(404).json({
        message: "Item is already in your cart",
      });
    }

    let newCartItem: ICart = {
      dressId: cart.dressId,
      userId: cart.userId,
      dateBooked: cart.dateBooked,
      size: cart.size,
    };

    await addToCart(newCartItem);

    res.status(200).json({ message: "Dress added to cart" });
  } else if (req.method == "DELETE") {
    const cartItemId = req.query.cartItemId as string;

    if (!cartItemId) {
      return res.status(404).json({
        message: "Invalid cart item to delete",
      });
    }

    await removeItemFromCart(cartItemId);

    res.status(202).json({ message: "Item removed from cart" });
  }

  //   return NextResponse.json({ messsage: "Hello World" });
}
