import axios from "axios";
import { UserType } from "../../common/types";

export async function signUp(user: UserType) {
  try {
    const response = await axios.post(`"/api/auth/signup"`, user, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (error) {
    // throw error;
  }
}

export async function logUserIn(email: string, password: string) {
  try {
    const response = await axios.post(
      `"/api/auth/login"`,
      { email: email, password: password },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response;
  } catch (error) {
    // throw error;
  }
}
