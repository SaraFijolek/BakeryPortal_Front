import { useState } from "react";
import { resetPassword } from "../api/authService";
import { useNavigate, useLocation } from "react-router-dom";

export default function ResetPassword() {
    const location = useLocation();
    const { email, token } = (location.state as { email: string; token: string }) ?? {};
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError("Hasła nie są takie same");
            return;
        }

        try {
            await resetPassword(email, token, newPassword);
            navigate("/login");
        } catch {
            setError("Błąd resetowania hasła. Token mógł wygasnąć.");
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>Nowe hasło</h2>
            <input
                type="password"
                placeholder="Nowe hasło"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
            />
            <input
                type="password"
                placeholder="Powtórz nowe hasło"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
            />
            <button>Zmień hasło</button>
            {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
    );
}