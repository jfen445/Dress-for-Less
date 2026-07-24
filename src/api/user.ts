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

export async function requestPasswordReset(email: string) {
  return api.post(`/api/auth/forgot-password`, { email });
}

export async function resetPassword(token: string, password: string) {
  return api.post(`/api/auth/reset-password`, { token, password });
}
