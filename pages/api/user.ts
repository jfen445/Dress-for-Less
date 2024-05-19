import { dbConnect, disconnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { createUser } from "../../lib/db/user-dao";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const con = await dbConnect();
  console.log("hit db connect", new Date().getSeconds(), con);
  // return new NextResponse("connected and disconnected");

  const user = await createUser();

  res.status(200).json(user);

  await disconnect();
  //   return NextResponse.json({ messsage: "Hello World" });
}
