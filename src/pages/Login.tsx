import { useState } from "react";
import { login } from "../api/authService";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

type TokenPayload = {
    role: string;
};

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [requires2FA, setRequires2FA] = useState(false);
    const navigate = useNavigate();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();

        try {
            const result = await login(email, password);

            if (result.requires2FA) {
                setRequires2FA(true);
                return;
            }

            if (result.access_token) {
                const token = result.access_token;

                localStorage.setItem("token", token);

                if (result.userId) {
                    localStorage.setItem("userId", result.userId);
                }

                const decoded = jwtDecode<TokenPayload>(token);

                if (decoded.role === "Admin") {
                    navigate("/admin");
                } else {
                    navigate("/profile");
                }
            }
        } catch {
            setError("Nieprawidłowy email lub hasło");
        }
    }

    return (
        <form onSubmit={handleLogin}>
            <h2>Logowanie</h2>

            <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <input
                type="password"
                placeholder="Hasło"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit">Zaloguj</button>

            {error && <p style={{ color: "red" }}>{error}</p>}

            <p>
                <a href="/forgot-password">Zapomniałem hasła</a>
            </p>

            {requires2FA && (
                <p>
                    <a href="/login2fa">Mam już kod 2FA</a>
                </p>
            )}
        </form>
    );
}