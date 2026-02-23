import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { confirmAccount } from "../api/authService";

export default function ConfirmAccount() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"pending" | "success" | "error">("pending");

    useEffect(() => {
        async function verify() {
            const userId = searchParams.get("userId");
            const token = searchParams.get("token");

            if (!userId || !token) {
                setStatus("error");
                return;
            }

            try {
                await confirmAccount(userId, token);
                setStatus("success");
            } catch {
                setStatus("error");
            }
        }

        verify();
    }, []);

    return (
        <div>
            <h2>Potwierdzenie konta</h2>
            {status === "pending" && <p>Trwa weryfikacja...</p>}
            {status === "success" && (
                <>
                    <p style={{ color: "green" }}>Konto zostało potwierdzone!</p>
                    <button onClick={() => navigate("/login")}>Przejdź do logowania</button>
                </>
            )}
            {status === "error" && (
                <p style={{ color: "red" }}>Weryfikacja nie powiodła się. Link mógł wygasnąć.</p>
            )}
        </div>
    );
}