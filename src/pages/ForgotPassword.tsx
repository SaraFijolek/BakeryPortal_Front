import { useState } from "react";
import { forgotPassword } from "../api/authService";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const result = await forgotPassword(email);

            if (result?.token && result?.userId) {
                navigate("/reset-password", {
                    state: { email, token: result.token }
                });
            } else {
                setMessage("Jeśli konto istnieje, wysłaliśmy link resetujący.");
            }
        } catch {
            setError("Wystąpił błąd. Spróbuj ponownie.");
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>Resetowanie hasła</h2>
            <input
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
            />
            <button>Wyślij link resetujący</button>
            {message && <p style={{ color: "green" }}>{message}</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
    );
}