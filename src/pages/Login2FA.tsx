import { useState } from "react";
import { login2FA } from "../api/authService";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login2FA() {
    const location = useLocation();
    const email = (location.state as { email: string })?.email ?? "";
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const result = await login2FA(email, code);
            localStorage.setItem("token", result.access_token);
            navigate("/");
        } catch {
            setError("Nieprawidłowy kod lub brak uprawnień");
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>Weryfikacja dwuetapowa</h2>
            <p>Kod został wysłany na adres: <strong>{email}</strong></p>
            <input
                placeholder="Kod 2FA"
                value={code}
                onChange={e => setCode(e.target.value)}
            />
            <button>Potwierdź</button>
            {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
    );
}