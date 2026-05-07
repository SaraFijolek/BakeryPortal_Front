import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

const api = axios.create({
    baseURL: "https://localhost:7183",
    headers: {
        "Content-Type": "application/json"
    }
});

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("token");

        if (token) {

            config.headers.set("Authorization", `Bearer ${token}`);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default api;