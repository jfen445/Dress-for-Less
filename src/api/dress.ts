import api from "./client";
import { AxiosError } from "axios";

export async function getAllDresses() {
  try {
    const response = await api.request({
      url: `/api/sanity/dresses`,
      method: "GET",
    });

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}
