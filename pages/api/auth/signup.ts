import { dbConnect, disconnect } from "../../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { createUser } from "../../../lib/db/user-dao";
import { IUser } from "../../../common/interfaces/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const con = await dbConnect();
  console.log("hit db connect", new Date().getSeconds(), con);
  // return new NextResponse("connected and disconnected");

  let user: IUser = {
    email: req.body.user.email,
    name: req.body.user.name,
    password: req.body.user.password,
    mobileNumber: req.body.user.mobileNumber,
    instagramHandle: req.body.user.instagramHandle,
  };

  const newUser = await createUser(user);

  await disconnect();

  res.status(200).json(newUser);

  //   return NextResponse.json({ messsage: "Hello World" });
}
