import { dbConnect, disconnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { createUser } from "../../lib/db/user-dao";
import { IUser } from "../../common/interfaces/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const con = await dbConnect();
  console.log("hit db connect", new Date().getSeconds(), con);
  // return new NextResponse("connected and disconnected");

  let user: IUser = {
    email: req.body.email,
    name: req.body.name,
    password: req.body.password,
    mobileNumber: req.body.mobileNumber,
    instagramHandle: req.body.instagramHandle,
  };

  const newUser = await createUser(user);

  res.status(200).json(user);

  await disconnect();
  //   return NextResponse.json({ messsage: "Hello World" });
}
