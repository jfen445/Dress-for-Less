import axios, { AxiosError } from "axios";
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
      "/api/auth/login",
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
    console.log(";errororroroororo", error);
    const err = error as AxiosError;
    return err.response;
  }
}

export async function getUser(email: string) {
  try {
    const response = await axios.request({
      url: `/api/user?email=${email}`,
      method: "GET",
    });

    return response;
  } catch (error) {
    // throw error;
    console.log(";errororroroororo");
  }
}
