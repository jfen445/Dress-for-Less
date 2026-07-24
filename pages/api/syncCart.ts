import { dbConnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { CartType } from "../../common/types";
import { addToCart, getCartItem } from "../../lib/db/cart-dao";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { findUser } from "../../lib/db/user-dao";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  if (req.method == "POST") {
    const cart: CartType[] = req.body.cart;

    if (cart.length == 0) {
      return res.status(404).json({
        message: "Invalid cart item",
      });
    }

    const invalidCartItem = cart.some((item) => {
      return (
        !item.dressId ||
        !item.userId ||
        !item.dateBooked ||
        !item.size ||
        !item.deliveryType
      );
    });

    if (invalidCartItem) {
      return res.status(404).json({
        message: "Invalid cart item",
      });
    }

    // Only let a user sync items into their own cart, never someone else's.
    const [sessionUser] = await findUser(session.user.email ?? "");
    if (!sessionUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const sessionUserId = String(sessionUser._id);
    if (cart.some((item) => String(item.userId) !== sessionUserId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await Promise.all(
      cart.map(async (item) => {
        if (item.userId == null) return;
        const cartItem = await getCartItem(
          item.userId,
          item.dressId,
          item.size,
          item.dateBooked
        );
        if (!cartItem) await addToCart(item);
      })
    );

    return res.status(200).json({ message: "Remote cart synced with local cart" });
  }

  return res.end();
}
