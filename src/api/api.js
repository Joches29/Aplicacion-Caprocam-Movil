import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json"
    }
});

// ── Interceptor: adjunta el JWT en cada petición autenticada ──
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('caprocam_auth_token');
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

// ── Interceptor: limpia el token si el backend responde 401 (Inválido/Expirado) ──
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            try {
                await AsyncStorage.removeItem('caprocam_auth_token');
                await AsyncStorage.removeItem('caprocam_usuario');
            } catch (e) {
                // Ignorar
            }
        }
        return Promise.reject(error);
    }
);

export default api;