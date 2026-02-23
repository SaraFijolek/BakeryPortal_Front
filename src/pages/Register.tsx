import { useState } from "react";
import { register } from "../api/authService";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Hasła nie są takie same");
            return;
        }

        try {
            await register(email, username, password, confirmPassword);
            navigate("/login");
        } catch {
            setError("Błąd rejestracji");
        }
    }

    return (
        <form onSubmit={handleRegister}>
            <h2>Rejestracja</h2>

            <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input placeholder="Nazwa użytkownika" value={username} onChange={e => setUsername(e.target.value)} />
            <input type="password" placeholder="Hasło" value={password} onChange={e => setPassword(e.target.value)} />
            <input type="password" placeholder="Powtórz hasło" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />

            <button>Zarejestruj</button>
            {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
    );
}
