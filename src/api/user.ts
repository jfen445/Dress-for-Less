import api from "./client";
import { UserType } from "../../common/types";

export async function signUp(user: UserType) {
  return api.post(`/api/auth/signup`, user);
}

export async function getUser(email: string) {
  return api.get(`/api/user?email=${email}`);
}

export async function getAllUsers() {
  return api.get(`/api/user`);
}

export async function updateUserAccount(userAccountDetails: UserType) {
  return api.post(`/api/user`, { user: userAccountDetails });
}
