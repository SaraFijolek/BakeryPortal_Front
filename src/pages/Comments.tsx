import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

/* ─────────────────────────────────────────────
   DTOs
───────────────────────────────────────────── */
interface UserBasicDto {
    userId: string;
    username?: string;
    email?: string;
}

interface CommentReadDto {
    commentId: number;
    adId: number;
    userId: string;
    createdAt: string;
    content?: string;
    user?: UserBasicDto;
}

interface CommentCreateDto {
    adId: number;
    userId: string;
    content?: string;
}

const API = "https://localhost:7183/api";

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function CommentsPage() {

    const { adId } = useParams();

    const navigate = useNavigate();

    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    const [comments, setComments] = useState<CommentReadDto[]>([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const [content, setContent] = useState("");

    const [saving, setSaving] = useState(false);

    /* ─────────────────────────────────────────
       Fetch comments
    ───────────────────────────────────────── */
    useEffect(() => {

        fetch(`${API}/Comments`)
            .then(async (res) => {

                if (!res.ok) {
                    throw new Error("Nie udało się pobrać komentarzy.");
                }

                const data: CommentReadDto[] = await res.json();

                setComments(
                    data.filter((c) => c.adId === Number(adId))
                );

                setLoading(false);
            })
            .catch((err: Error) => {
                setError(err.message);
                setLoading(false);
            });

    }, [adId]);

    /* ─────────────────────────────────────────
       Add comment
    ───────────────────────────────────────── */
    const handleAddComment = async () => {

        if (!token || !userId || !content.trim()) return;

        setSaving(true);

        try {

            const payload: CommentCreateDto = {
                adId: Number(adId),
                userId,
                content,
            };

            const res = await fetch(`${API}/Comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error("Nie udało się dodać komentarza.");
            }

            const created: CommentReadDto = await res.json();

            setComments((prev) => [...prev, created]);

            setContent("");

        } catch (err: any) {

            alert(err.message);

        } finally {

            setSaving(false);

        }
    };

    /* ─────────────────────────────────────────
       Render states
    ───────────────────────────────────────── */
    if (loading) {
        return (
            <div className="ap-loading">
                <div className="ap-spinner" />
                <p>Ładowanie komentarzy…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ap-error-screen">
                <div className="ap-error-icon">⚠</div>
                <p>{error}</p>

                <button
                    className="ap-btn ap-btn--primary"
                    onClick={() => navigate(-1)}
                >
                    Powrót
                </button>
            </div>
        );
    }

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
                    Komentarze
                </h1>

            </div>

            {/* FORM */}
            <div className="ap-card ap-form-card">

                <h2 className="ap-form-title">
                    Dodaj komentarz
                </h2>

                <div className="ap-edit-form">

                    <div className="ap-field">

                        <label className="ap-info-label">
                            Treść komentarza
                        </label>

                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="ap-input ap-textarea"
                            rows={4}
                            placeholder="Napisz komentarz..."
                        />

                    </div>

                    <div className="ap-form-actions">

                        <button
                            className="ap-btn ap-btn--primary"
                            onClick={handleAddComment}
                            disabled={saving || !content.trim()}
                        >
                            {saving ? "Dodawanie..." : "Dodaj komentarz"}
                        </button>

                    </div>

                </div>

            </div>

            {/* COMMENTS LIST */}
            <div className="ap-ads-section">

                <h2 className="ap-section-title">
                    Wszystkie komentarze
                    <span className="ap-ads-count">
                        {comments.length}
                    </span>
                </h2>

                {comments.length === 0 ? (

                    <div className="ap-empty">

                        <div className="ap-empty-icon">
                            💬
                        </div>

                        <p>
                            Brak komentarzy.
                        </p>

                    </div>

                ) : (

                    <ul className="ap-ads-list">

                        {comments.map((comment) => (

                            <li
                                key={comment.commentId}
                                className="ap-ad-card"
                            >

                                <div className="ap-ad-meta">

                                    <span className="ap-ad-meta-item">
                                        👤 {comment.user?.username ?? "Użytkownik"}
                                    </span>

                                    <span className="ap-ad-meta-item">
                                        🕐 {new Date(comment.createdAt).toLocaleString("pl-PL")}
                                    </span>

                                </div>

                                <p className="ap-ad-desc">
                                    {comment.content}
                                </p>

                            </li>

                        ))}

                    </ul>

                )}

            </div>

        </div>
    );
}