import { dbConnect, disconnect } from "../../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { createUser, findUser } from "../../../lib/db/user-dao";
import { IUser } from "../../../common/interfaces/user";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const con = await dbConnect();
  console.log("hit db connect", new Date().getSeconds(), con);
  // return new NextResponse("connected and disconnected");

  if (req.method == "POST") {
    const saltRounds = 10;

    const users = await findUser(req.body.user.email);
    // console.log("here are the users", users);

    if (users.length !== 0) {
      console.log("hereeeeeeeeeeeeeeeee", users);
      res.status(409).json({
        message: "An acount with this email has already been created",
      });
    }

    bcrypt.hash(req.body.user.password, saltRounds, async function (err, hash) {
      // Store hash in your password DB.
      let user: IUser = {
        email: req.body.user.email,
        name: req.body.user.name,
        password: hash,
        mobileNumber: req.body.user.mobileNumber,
        instagramHandle: req.body.user.instagramHandle,
        photo: "",
      };

      await createUser(user);
    });

    // await disconnect();

    res.status(200).json({ message: "Account created" });
  }

  //   return NextResponse.json({ messsage: "Hello World" });
}
