import axios from "axios";
import { getToken, removeToken } from "../modules/login/utils/tokenStorage";

const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json"
    }
});

api.interceptors.request.use(
    async (config) => {
        try {
            const token = await getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            // Ignorar en entornos sin AsyncStorage disponible
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const url = error.config?.url ?? "";
        const esRutaValidacion = url.includes("/sync/validate-token");

        if (error.response?.status === 401 && !esRutaValidacion) {
            try {
                await removeToken();
            } catch (e) {
                // Ignorar
            }
        }
        return Promise.reject(error);
    }
);

export default api;