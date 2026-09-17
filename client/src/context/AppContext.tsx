import type { AxiosInstance } from "axios";
import axios from "axios";
import { createContext, type ReactNode, useContext, useState, useEffect } from "react";

interface User {
    id: string;
    name: string;
    email: string;
    plan: string;
    analysisCount?: number;
}
interface AppContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    api: AxiosInstance;
    login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState<boolean>(true);

    //axios instance with auth header
    const api = axios.create({
        baseURL: BACKEND_URL,
    })

    //update axios headers when token changes
    api.interceptors.request.use((config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    })

    const loadUser = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await api.get('/api/auth/user');
            if (data.success) {
                setUser(data.user);
            }
        } catch (error) {
            setToken(null);
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUser();
    }, [])

    const login = async (email: string, password: string) => {
        try {
            const res = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password });
            if (res.data.success) {
                localStorage.setItem('token', res.data.token);
                setToken(res.data.token);
                setUser(res.data.user);
                return { success: true };
            }
            return { success: false, message: res.data.message };
        } catch (error: any) {
            const msg = error.response?.data?.message || "Login failed";
            return { success: false, message: msg };
        }
    }

    const register = async (name: string, email: string, password: string) => {
        try {
            const res = await axios.post(`${BACKEND_URL}/api/auth/register`, { name, email, password });
            if (res.data.success) {
                localStorage.setItem('token', res.data.token);
                setToken(res.data.token);
                setUser(res.data.user);
                return { success: true };
            }
            return { success: false, message: res.data.message };
        } catch (error: any) {
            const msg = error.response?.data?.message || "Registration failed";
            return { success: false, message: msg };
        }
    }

    const logout = async () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    }

    const value = { user, token, loading, api, login, register, logout };
    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}