import { dbConnect, disconnect } from "../../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const con = await dbConnect();
  console.log("hit db connect", new Date().getSeconds(), con);
  // return new NextResponse("connected and disconnected");
  res.status(200).json({ message: "Successfully set cookie!" });

  //   return NextResponse.json({ messsage: "Hello World" });
}
