import axios, { AxiosError } from "axios";

export async function getAllDresses() {
  try {
    const response = await axios.request({
      url: `/api/sanity/dresses`,
      method: "GET",
    });

    return response;
  } catch (error) {
    const err = error as AxiosError;
    throw new Error((err?.response?.data as any).message);
  }
}
