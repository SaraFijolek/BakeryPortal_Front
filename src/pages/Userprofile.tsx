import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface UserDto {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    createdAt?: string;
    isActive?: boolean;
}

interface UserUpdateDto {
    name: string;
    email: string;
    phone?: string;
}

interface Advertisement {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    createdAt: string;
    isActive: boolean;
}

export default function UserProfile() {
    const [user, setUser] = useState<UserDto | null>(null);
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Stan edycji ---
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<UserUpdateDto>({ name: "", email: "", phone: "" });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);

    // --- Usuwanie konta ---
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // --- Avatar upload ---
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    useEffect(() => {
        if (!token || !userId) { navigate("/login"); return; }

        fetch(`https://localhost:7183/api/Users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
            .then((data: UserDto) => {
                setUser(data);
                setFormData({ name: data.name, email: data.email, phone: data.phone ?? "" });
                setLoading(false);
            })
            .catch(() => { setError("Nie udało się pobrać danych użytkownika."); setLoading(false); });

        fetch(`https://localhost:7183/api/Advertisements?userId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
            .then((data: Advertisement[]) => setAds(data))
            .catch(() => setAds([]));
    }, [token, userId, navigate]);

    const handleSave = async () => {
        if (!userId || !token) return;
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            const res = await fetch(`https://localhost:7183/api/Users/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.message ?? `Błąd ${res.status}`);
            }

            setUser((prev) => prev ? { ...prev, ...formData } : prev);
            setIsEditing(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            setSaveError(err.message ?? "Nie udało się zapisać zmian.");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!userId || !token || !user) return;
        setTogglingStatus(true);

        try {
            const res = await fetch(`https://localhost:7183/api/Users/${userId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(!user.isActive),
            });

            if (!res.ok) throw new Error(`Błąd ${res.status}`);
            setUser((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
        } catch {
            alert("Nie udało się zmienić statusu.");
        } finally {
            setTogglingStatus(false);
        }
    };

    // --- Usuwanie konta ---
    const handleDeleteAccount = async () => {
        if (!userId || !token) return;
        setDeleting(true);

        try {
            const res = await fetch(`https://localhost:7183/api/Users/${userId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error(`Błąd ${res.status}`);

            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            navigate("/login");
        } catch {
            alert("Nie udało się usunąć konta. Spróbuj ponownie.");
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // --- Avatar upload ---
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId || !token) return;

        // Podgląd lokalny
        const reader = new FileReader();
        reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        setUploadingAvatar(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append("avatar", file);

            const res = await fetch(`https://localhost:7183/api/Users/${userId}/avatar`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formDataUpload,
            });

            if (!res.ok) throw new Error(`Błąd ${res.status}`);
            const data = await res.json();
            // Zakładamy, że API zwraca { avatarUrl: "..." }
            setUser((prev) => prev ? { ...prev, avatarUrl: data.avatarUrl ?? prev.avatarUrl } : prev);
        } catch {
            alert("Nie udało się przesłać zdjęcia profilowego.");
            setAvatarPreview(null);
        } finally {
            setUploadingAvatar(false);
            // Reset input, by móc ponownie wybrać ten sam plik
            if (avatarInputRef.current) avatarInputRef.current.value = "";
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        navigate("/login");
    };

    const getInitials = (name: string) =>
        name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    const handleCancel = () => {
        if (user) setFormData({ name: user.name, email: user.email, phone: user.phone ?? "" });
        setSaveError(null);
        setIsEditing(false);
    };

    const currentAvatar = avatarPreview ?? user?.avatarUrl;

    if (loading) return <div className="up-loading"><div className="up-spinner" /><p>Ładowanie profilu…</p></div>;
    if (error) return (
        <div className="up-error-screen">
            <div className="up-error-icon">⚠</div>
            <p>{error}</p>
            <Link to="/home" className="up-btn up-btn--primary">Wróć do strony głównej</Link>
        </div>
    );
    if (!user) return null;

    return (
        <div className="up-root">
            {/* ── MODAL POTWIERDZENIA USUNIĘCIA ── */}
            {showDeleteModal && (
                <div className="up-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
                    <div className="up-modal">
                        <div className="up-modal-icon">🗑️</div>
                        <h2 id="delete-modal-title" className="up-modal-title">Usuń konto</h2>
                        <p className="up-modal-desc">
                            Czy na pewno chcesz usunąć swoje konto? Tej operacji <strong>nie można cofnąć</strong>.
                            Wszystkie Twoje dane i ogłoszenia zostaną trwale usunięte.
                        </p>
                        <div className="up-modal-actions">
                            <button
                                className="up-btn up-btn--danger"
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                            >
                                {deleting ? "Usuwanie…" : "Tak, usuń konto"}
                            </button>
                            <button
                                className="up-btn up-btn--ghost"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                            >
                                Nie, anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="up-card">
                {/* Górny pasek */}
                <div className="up-actions">
                    <Link to="/home" className="up-btn up-btn--ghost">← Powrót</Link>
                    <button className="up-btn up-btn--danger" onClick={handleLogout}>Wyloguj</button>
                </div>

                {/* Avatar z overlayem uploadu */}
                <div className="up-avatar-wrapper">
                    {currentAvatar
                        ? <img src={currentAvatar} alt={`Zdjęcie profilowe ${user.name}`} className="up-avatar" />
                        : <div className="up-avatar up-avatar--initials">{getInitials(user.name)}</div>
                    }
                    <span className={`up-status-dot ${user.isActive ? "active" : "inactive"}`} />

                    {/* Overlay „Dodaj zdjęcie" */}
                    <button
                        className="up-avatar-upload-overlay"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        aria-label="Dodaj zdjęcie profilowe"
                        title="Dodaj zdjęcie profilowe"
                    >
                        {uploadingAvatar ? (
                            <span className="up-avatar-upload-spinner" />
                        ) : (
                            <>
                                <span className="up-avatar-upload-icon">📷</span>
                                <span className="up-avatar-upload-label">Dodaj zdjęcie</span>
                            </>
                        )}
                    </button>

                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: "none" }}
                        onChange={handleAvatarChange}
                    />
                </div>

                <h1 className="up-name">{user.name}</h1>

                {/* Powiadomienie o sukcesie */}
                {saveSuccess && (
                    <p className="up-success-msg">Dane zostały zapisane!</p>
                )}

                {/* ── TRYB PODGLĄDU ── */}
                {!isEditing && (
                    <>
                        <div className="up-info-grid">
                            <div className="up-info-item">
                                <span className="up-info-label">E-mail</span>
                                <span className="up-info-value">{user.email}</span>
                            </div>
                            <div className="up-info-item">
                                <span className="up-info-label">Telefon</span>
                                <span className="up-info-value">{user.phone ?? "—"}</span>
                            </div>
                            <div className="up-info-item">
                                <span className="up-info-label">Status konta</span>
                                <span className={`up-badge ${user.isActive ? "up-badge--active" : "up-badge--inactive"}`}>
                                    {user.isActive ? "Aktywne" : "Nieaktywne"}
                                </span>
                            </div>
                            {user.createdAt && (
                                <div className="up-info-item">
                                    <span className="up-info-label">Członek od</span>
                                    <span className="up-info-value">
                                        {new Date(user.createdAt).toLocaleDateString("pl-PL", {
                                            year: "numeric", month: "long", day: "numeric",
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="up-edit-actions">
                            <button className="up-btn up-btn--primary" onClick={() => setIsEditing(true)}>
                                Edytuj dane
                            </button>
                            <button
                                className={`up-btn ${user.isActive ? "up-btn--warning" : "up-btn--success"}`}
                                onClick={handleToggleStatus}
                                disabled={togglingStatus}
                            >
                                {togglingStatus ? "…" : user.isActive ? "Dezaktywuj konto" : "Aktywuj konto"}
                            </button>
                            {/* Przycisk usunięcia konta */}
                            <button
                                className="up-btn up-btn--danger-outline"
                                onClick={() => setShowDeleteModal(true)}
                            >
                                🗑 Usuń konto
                            </button>
                        </div>
                    </>
                )}

                {/* ── TRYB EDYCJI ── */}
                {isEditing && (
                    <div className="up-edit-form">
                        <div className="up-field">
                            <label htmlFor="edit-name" className="up-info-label">Imię i nazwisko</label>
                            <input
                                id="edit-name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                                className="up-input"
                                placeholder="Jan Kowalski"
                            />
                        </div>

                        <div className="up-field">
                            <label htmlFor="edit-email" className="up-info-label">E-mail</label>
                            <input
                                id="edit-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                                className="up-input"
                                placeholder="tom@example.com"
                            />
                        </div>

                        <div className="up-field">
                            <label htmlFor="edit-phone" className="up-info-label">Telefon</label>
                            <input
                                id="edit-phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                                className="up-input"
                                placeholder="+48 123 456 789"
                            />
                        </div>

                        {saveError && <p className="up-error-msg">{saveError}</p>}

                        <div className="up-form-actions">
                            <button
                                className="up-btn up-btn--primary"
                                onClick={handleSave}
                                disabled={saving || !formData.name || !formData.email}
                            >
                                {saving ? "Zapisywanie…" : "Zapisz zmiany"}
                            </button>
                            <button className="up-btn up-btn--ghost" onClick={handleCancel} disabled={saving}>
                                Anuluj
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Ogłoszenia */}
            <div className="up-ads-section">
                <h2 className="up-section-title">
                    Moje ogłoszenia
                    <span className="up-ads-count">{ads.length}</span>
                </h2>
                {ads.length === 0 ? (
                    <div className="up-empty">
                        <div className="up-empty-icon">📋</div>
                        <p>Nie masz jeszcze żadnych ogłoszeń.</p>
                    </div>
                ) : (
                    <ul className="up-ads-list">
                        {ads.map((ad) => (
                            <li key={ad.id} className="up-ad-card">
                                <div className="up-ad-header">
                                    <span className="up-ad-category">{ad.category}</span>
                                    <span className={`up-badge ${ad.isActive ? "up-badge--active" : "up-badge--inactive"}`}>
                                        {ad.isActive ? "Aktywne" : "Nieaktywne"}
                                    </span>
                                </div>
                                <h3 className="up-ad-title">{ad.title}</h3>
                                <p className="up-ad-desc">{ad.description}</p>
                                <div className="up-ad-footer">
                                    <span className="up-ad-price">{ad.price.toLocaleString("pl-PL")} zł</span>
                                    <span className="up-ad-date">{new Date(ad.createdAt).toLocaleDateString("pl-PL")}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}