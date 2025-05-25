import { dbConnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { CartType } from "../../common/types";
import { addToCart, getCartItem } from "../../lib/db/cart-dao";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method == "POST") {
    const cart: CartType[] = req.body.cart;

    if (cart.length == 0) {
      return res.status(404).json({
        message: "Invalid cart item",
      });
    }

    const invalidCartItem = cart.some((item) => {
      return !item.dressId || !item.userId || !item.dateBooked || !item.size;
    });

    if (invalidCartItem) {
      return res.status(404).json({
        message: "Invalid cart item",
      });
    }

    cart.forEach(async (item) => {
      if (item.userId == null) {
        return;
      }
      const cartItem = await getCartItem(
        item.userId,
        item.dressId,
        item.size,
        item.dateBooked
      );

      if (!cartItem) {
        await addToCart(item);
      }
    });

    res.status(200).json({ message: "Remote cart synced with local cart" });
  }

  res.end();
}
