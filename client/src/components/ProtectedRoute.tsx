import { Outlet, Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function ProtectedRoute() {
    const { token, loading } = useApp();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="border-8 border-slate-800 w-20 h-20 animate-spin rounded-full border-t-blue-500"></div>
            </div>
        )
    }
    if (!token) return <Navigate to="/login" replace />;
    return <Outlet />;
}
