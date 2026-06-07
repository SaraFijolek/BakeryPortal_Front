import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

/* ─────────────────────────────────────────────
   DTOs
───────────────────────────────────────────── */
interface MessageCreateDto {
    senderId: string;
    receiverId: string;
    content?: string;
}

const API = "https://localhost:7183/api";

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function MessagesPage() {

    const { receiverId } = useParams();

    const navigate = useNavigate();

    const token = localStorage.getItem("token");

    const senderId = localStorage.getItem("userId");

    const [content, setContent] = useState("");

    const [saving, setSaving] = useState(false);

    /* ─────────────────────────────────────────
       Send message
    ───────────────────────────────────────── */
    const handleSendMessage = async () => {

        if (!token || !senderId || !receiverId || !content.trim()) {
            return;
        }

        setSaving(true);

        try {

            const payload: MessageCreateDto = {
                senderId,
                receiverId,
                content,
            };

            const res = await fetch(`${API}/Messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error("Nie udało się wysłać wiadomości.");
            }

            alert("Wiadomość została wysłana!");

            setContent("");

            navigate("/ads");

        } catch (err: any) {

            alert(err.message);

        } finally {

            setSaving(false);

        }
    };

    /* ─────────────────────────────────────────
       JSX
    ───────────────────────────────────────── */
    return (

        <div className="ap-root">

            {/* TOPBAR */}
            <div className="ap-topbar">

                <Link
                    to="/add-ad"
                    className="ap-btn ap-btn--ghost"
                >
                    ← Powrót
                </Link>

                <h1 className="ap-page-title">
                    Wiadomość
                </h1>

            </div>

            {/* FORM */}
            <div className="ap-card ap-form-card">

                <h2 className="ap-form-title">
                    Napisz wiadomość
                </h2>

                <div className="ap-edit-form">

                    <div className="ap-field">

                        <label className="ap-info-label">
                            Treść wiadomości
                        </label>

                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="ap-input ap-textarea"
                            rows={6}
                            placeholder="Napisz wiadomość..."
                        />

                    </div>

                    <div className="ap-form-actions">

                        <button
                            className="ap-btn ap-btn--primary"
                            onClick={handleSendMessage}
                            disabled={saving || !content.trim()}
                        >
                            {saving ? "Wysyłanie..." : "Wyślij wiadomość"}
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
}