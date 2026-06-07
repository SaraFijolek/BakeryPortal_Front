import api from "./api";

interface LoginResponse {
    access_token?: string;
    requires2FA?: boolean;
    isAdmin?: boolean;
    userId?: string;
    role: "Admin" | "User";
}

export async function login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>("/account/login", { email, password });
    return response.data;
}

export async function login2FA(email: string, code2FA: string) {
    const response = await api.post<{ access_token: string }>("/account/login2fa", { email, code2FA });
    return response.data;
}

export async function register(
    email: string,
    username: string,
    password: string,
    confirmPassword: string
) {
    await api.post("/account/register", { email, username, password, confirmPassword });
}

export async function forgotPassword(email: string) {
    const response = await api.post("/account/forgot-password", { email });
    return response.data;
}

export async function resetPassword(email: string, token: string, newPassword: string) {
    await api.post("/account/reset-password", { email, token, newPassword });
}

export async function confirmAccount(userId: string, token: string) {
    await api.post(`/account/confirm-account?userId=${userId}&token=${encodeURIComponent(token)}`);
}