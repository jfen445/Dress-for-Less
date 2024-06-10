import { dbConnect, disconnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { createUser, findUser } from "../../lib/db/user-dao";
import { IUser } from "../../common/interfaces/user";
import { UserType } from "../../common/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  if (req.method === "GET") {
    const email = req.query.email as string;
    console.log("efafgeaf", email, req.query);

    const users = await findUser(email);
    if (users.length === 0) {
      res.status(404).json({
        message: "Account not found",
      });
    }

    const userInfo = users[0] as UserType;

    res.status(200).json(userInfo);
  } else {
    // Handle any other HTTP method
  }

  //   return NextResponse.json({ messsage: "Hello World" });
}
