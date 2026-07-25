import axios from "axios";
import { getValidAccessToken } from "./oauth";

const baseURL = "https://www.zohoapis.com";

export const zohoClient = axios.create({
  baseURL,
  timeout: 10000,
});

zohoClient.interceptors.request.use(async (config) => {
  const token = await getValidAccessToken();
  config.headers.Authorization = `Zoho-oauthtoken ${token}`;
  return config;
});

zohoClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Zoho API error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);
