import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────────
   DTOs
───────────────────────────────────────────── */
interface SubcategoryDto {
    subcategoryId: number;
    name: string;
}

interface UserDto {
    userId: string;
    name: string;
    email: string;
}

interface AdMediaResponseDto {
    mediaId: number;
    adId: number;
    url: string;
    mediaType?: string;
}

interface AdResponseDto {
    adId: number;
    userId: string;
    subcategoryId: number;
    title: string;
    description?: string;
    price?: number;
    location?: string;
    createdAt: string;
    expiresAt?: string;
    status?: string;
    user?: UserDto;
    subcategory?: SubcategoryDto;
    media?: AdMediaResponseDto[];
}

interface AdCreateDto {
    userId: string;
    subcategoryId: number;
    title: string;
    description?: string;
    price?: number;
    location?: string;
    expiresAt?: string;
    status?: string;
}

interface AdUpdateDto extends AdCreateDto {
    adId: number;
}

type AdFormData = Omit<AdUpdateDto, "adId" | "userId">;

/* Lokalny podgląd pliku przed uploadem */
interface PendingFile {
    id: string;          // tymczasowe ID (Math.random)
    file: File;
    previewUrl: string;  // URL.createObjectURL
    mediaType: "image" | "video";
}

const API = "https://localhost:7183/api";

/* ─────────────────────────────────────────────
   Komponent
───────────────────────────────────────────── */
export default function AdsPage() {
    const [ads, setAds] = useState<AdResponseDto[]>([]);
    const [subcategories, setSubcategories] = useState<SubcategoryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /* ── Formularz ogłoszenia ── */
    const [isCreating, setIsCreating] = useState(false);
    const [editingAd, setEditingAd] = useState<AdResponseDto | null>(null);
    const [formData, setFormData] = useState<AdFormData>({
        subcategoryId: 0,
        title: "",
        description: "",
        price: undefined,
        location: "",
        expiresAt: "",
        status: "active",
    });

    /*
     * pendingFiles — pliki wybrane w formularzu, jeszcze NIE wysłane na serwer.
     * Trzymamy je lokalnie, pokazujemy podglądy przez createObjectURL.
     * Upload następuje automatycznie zaraz po zapisaniu ogłoszenia.
     */
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);

    /* ── Usuwanie ogłoszenia ── */
    const [deletingId, setDeletingId] = useState<number | null>(null);

    /* ── Galeria istniejących mediów (edycja) ── */
    const [expandedMediaAdId, setExpandedMediaAdId] = useState<number | null>(null);
    const [uploadingAdId, setUploadingAdId] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [deletingMediaId, setDeletingMediaId] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const existingFileInputRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    /* ─────────────────────────────────────────
       Pobieranie danych
    ───────────────────────────────────────── */
    useEffect(() => {
        if (!token || !userId) { navigate("/login"); return; }
        const headers = { Authorization: `Bearer ${token}` };

        Promise.all([
            fetch(`${API}/Ads`, { headers }),
            fetch(`${API}/Subcategories`, { headers }),
            fetch(`${API}/AdMedia`, { headers }),
        ])
            .then(async ([adsRes, subRes, mediaRes]) => {
                if (!adsRes.ok) throw new Error("Nie udało się pobrać ogłoszeń.");
                const adsData: AdResponseDto[] = await adsRes.json();
                const subData: SubcategoryDto[] = subRes.ok ? await subRes.json() : [];
                const allMedia: AdMediaResponseDto[] = mediaRes.ok ? await mediaRes.json() : [];

                setAds(adsData.map((ad) => ({
                    ...ad,
                    media: allMedia.filter((m) => m.adId === ad.adId),
                })));
                setSubcategories(subData);
                setLoading(false);
            })
            .catch((err: Error) => {
                setError(err.message ?? "Błąd pobierania danych.");
                setLoading(false);
            });
    }, [token, userId, navigate]);

    /* ─────────────────────────────────────────
       Helpers — otwieranie formularza
    ───────────────────────────────────────── */
    const emptyForm = (): AdFormData => ({
        subcategoryId: subcategories[0]?.subcategoryId ?? 0,
        title: "",
        description: "",
        price: undefined,
        location: "",
        expiresAt: "",
        status: "active",
    });

    const openCreate = () => {
        setFormData(emptyForm());
        setPendingFiles([]);
        setSaveError(null);
        setFileError(null);
        setSaveSuccess(false);
        setEditingAd(null);
        setIsCreating(true);
    };

    const openEdit = (ad: AdResponseDto) => {
        setFormData({
            subcategoryId: ad.subcategoryId,
            title: ad.title,
            description: ad.description ?? "",
            price: ad.price,
            location: ad.location ?? "",
            expiresAt: ad.expiresAt ? ad.expiresAt.slice(0, 10) : "",
            status: ad.status ?? "active",
        });
        setPendingFiles([]);
        setSaveError(null);
        setFileError(null);
        setSaveSuccess(false);
        setIsCreating(false);
        setEditingAd(ad);
    };

    const handleCancel = () => {
        /* zwalniamy pamięć objectURL */
        pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.previewUrl));
        setPendingFiles([]);
        setIsCreating(false);
        setEditingAd(null);
        setSaveError(null);
        setFileError(null);
    };

    /* ─────────────────────────────────────────
       Wybór pliku w formularzu (lokalny podgląd)
    ───────────────────────────────────────── */
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "video/mp4", "video/quicktime"];

    const handlePendingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null);
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        const invalid = files.filter((f) => !ALLOWED_TYPES.includes(f.type));
        if (invalid.length > 0) {
            setFileError("Nieobsługiwany typ pliku. Dozwolone: JPG, PNG, MP4, MOV.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const newPending: PendingFile[] = files.map((file) => ({
            id: Math.random().toString(36).slice(2),
            file,
            previewUrl: URL.createObjectURL(file),
            mediaType: file.type.startsWith("image") ? "image" : "video",
        }));

        setPendingFiles((prev) => [...prev, ...newPending]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removePendingFile = (id: string) => {
        setPendingFiles((prev) => {
            const found = prev.find((pf) => pf.id === id);
            if (found) URL.revokeObjectURL(found.previewUrl);
            return prev.filter((pf) => pf.id !== id);
        });
    };

    /* ─────────────────────────────────────────
       Upload jednego pliku na serwer (helper)
    ───────────────────────────────────────── */
    const uploadFile = async (adId: number, file: File): Promise<AdMediaResponseDto | null> => {
        const payload = new FormData();
        payload.append("file", file);
        payload.append("adId", String(adId));

        const res = await fetch(`${API}/AdMedia/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token!}` },
            body: payload,
        });

        if (!res.ok) return null;
        return res.json();
    };

    /* ─────────────────────────────────────────
       Zapis ogłoszenia + upload plików
    ───────────────────────────────────────── */
    const handleSave = async () => {
        if (!userId || !token) return;
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            /* 1. Zapisz ogłoszenie */
            const isEdit = editingAd !== null;
            const url = isEdit ? `${API}/Ads/${editingAd!.adId}` : `${API}/Ads`;
            const body: AdCreateDto | AdUpdateDto = isEdit
                ? { adId: editingAd!.adId, userId, ...formData }
                : { userId, ...formData };

            const res = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const bodyJson = await res.json().catch(() => null);
                throw new Error(bodyJson?.message ?? `Błąd ${res.status}`);
            }

            const saved: AdResponseDto = await res.json();

            /* 2. Upload plików z podglądu (jeśli są) — równolegle */
            let uploadedMedia: AdMediaResponseDto[] = [];
            if (pendingFiles.length > 0) {
                const results = await Promise.all(
                    pendingFiles.map((pf) => uploadFile(saved.adId, pf.file))
                );
                uploadedMedia = results.filter(Boolean) as AdMediaResponseDto[];
                /* zwolnij objectURL */
                pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.previewUrl));
            }

            /* 3. Zaktualizuj stan lokalny */
            if (isEdit) {
                setAds((prev) =>
                    prev.map((a) =>
                        a.adId === saved.adId
                            ? {
                                ...saved,
                                media: [
                                    ...(a.media ?? []),
                                    ...uploadedMedia,
                                ],
                            }
                            : a
                    )
                );
            } else {
                setAds((prev) => [{ ...saved, media: uploadedMedia }, ...prev]);
            }

            setPendingFiles([]);
            setIsCreating(false);
            setEditingAd(null);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            setSaveError(err.message ?? "Nie udało się zapisać ogłoszenia.");
        } finally {
            setSaving(false);
        }
    };

    /* ─────────────────────────────────────────
       Usuwanie ogłoszenia
    ───────────────────────────────────────── */
    const handleDeleteAd = async (adId: number) => {
        if (!token) return;
        if (!window.confirm("Czy na pewno chcesz usunąć to ogłoszenie?")) return;
        setDeletingId(adId);
        try {
            const res = await fetch(`${API}/Ads/${adId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
            setAds((prev) => prev.filter((a) => a.adId !== adId));
        } catch {
            alert("Nie udało się usunąć ogłoszenia.");
        } finally {
            setDeletingId(null);
        }
    };

    /* ─────────────────────────────────────────
       Galeria istniejącego ogłoszenia — toggle
    ───────────────────────────────────────── */
    const toggleMedia = (adId: number) => {
        setUploadError(null);
        setExpandedMediaAdId((prev) => (prev === adId ? null : adId));
    };

    /* ─────────────────────────────────────────
       Dodawanie medium do istniejącego ogłoszenia
    ───────────────────────────────────────── */
    const handleExistingUpload = async (adId: number, file: File) => {
        if (!token) return;
        if (!ALLOWED_TYPES.includes(file.type)) {
            setUploadError("Nieobsługiwany typ pliku. Dozwolone: JPG, PNG, MP4, MOV.");
            return;
        }
        setUploadingAdId(adId);
        setUploadError(null);
        try {
            const media = await uploadFile(adId, file);
            if (!media) throw new Error("Nie udało się przesłać pliku.");
            setAds((prev) =>
                prev.map((a) =>
                    a.adId === adId ? { ...a, media: [...(a.media ?? []), media] } : a
                )
            );
        } catch (err: any) {
            setUploadError(err.message);
        } finally {
            setUploadingAdId(null);
            if (existingFileInputRef.current) existingFileInputRef.current.value = "";
        }
    };

    /* ─────────────────────────────────────────
       Usuwanie medium z istniejącego ogłoszenia
    ───────────────────────────────────────── */
    const handleDeleteMedia = async (adId: number, mediaId: number) => {
        if (!token || !window.confirm("Usunąć to zdjęcie?")) return;
        setDeletingMediaId(mediaId);
        try {
            const res = await fetch(`${API}/AdMedia/${mediaId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
            setAds((prev) =>
                prev.map((a) =>
                    a.adId === adId
                        ? { ...a, media: (a.media ?? []).filter((m) => m.mediaId !== mediaId) }
                        : a
                )
            );
        } catch {
            alert("Nie udało się usunąć zdjęcia.");
        } finally {
            setDeletingMediaId(null);
        }
    };

    /* ─────────────────────────────────────────
       Render states
    ───────────────────────────────────────── */
    if (loading) return (
        <div className="ap-loading">
            <div className="ap-spinner" />
            <p>Ładowanie ogłoszeń…</p>
        </div>
    );

    if (error) return (
        <div className="ap-error-screen">
            <div className="ap-error-icon">⚠</div>
            <p>{error}</p>
            <Link to="/home" className="ap-btn ap-btn--primary">Wróć do strony głównej</Link>
        </div>
    );

    const isFormOpen = isCreating || editingAd !== null;

    /* ─────────────────────────────────────────
       JSX
    ───────────────────────────────────────── */
    return (
        <div className="ads-root">

            {/* ── Górny pasek ── */}
            <div className="ap-topbar">
                <Link to="/home" className="ap-btn ap-btn--ghost">← Powrót</Link>
                <h1 className="ap-page-title">Ogłoszenia</h1>
                <button className="ap-btn ap-btn--primary" onClick={openCreate} disabled={isFormOpen}>
                    + Dodaj ogłoszenie
                </button>
            </div>

            {saveSuccess && (
                <p className="ap-success-msg">Ogłoszenie zostało zapisane!</p>
            )}

            {/* ─────────────────────────────────────────
                FORMULARZ (Create / Edit)
            ───────────────────────────────────────── */}
            {isFormOpen && (
                <div className="ap-card ap-form-card">
                    <h2 className="ap-form-title">
                        {isCreating ? "Dodaj ogłoszenie" : "Edytuj ogłoszenie"}
                    </h2>

                    <div className="ap-edit-form">

                        {/* Tytuł */}
                        <div className="ap-field">
                            <label htmlFor="ad-title" className="ap-info-label">Tytuł *</label>
                            <input
                                id="ad-title"
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                                className="ap-input"
                                placeholder="Np. Sprzedam rower górski"
                                maxLength={255}
                            />
                        </div>

                        {/* Podkategoria */}
                        <div className="ap-field">
                            <label htmlFor="ad-subcategory" className="ap-info-label">Podkategoria *</label>
                            <select
                                id="ad-subcategory"
                                value={formData.subcategoryId}
                                onChange={(e) => setFormData((f) => ({ ...f, subcategoryId: Number(e.target.value) }))}
                                className="ap-input ap-select"
                            >
                                <option value={0} disabled>Wybierz podkategorię</option>
                                {subcategories.map((s) => (
                                    <option key={s.subcategoryId} value={s.subcategoryId}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Opis */}
                        <div className="ap-field">
                            <label htmlFor="ad-description" className="ap-info-label">Opis</label>
                            <textarea
                                id="ad-description"
                                value={formData.description}
                                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                                className="ap-input ap-textarea"
                                placeholder="Szczegółowy opis ogłoszenia…"
                                rows={4}
                            />
                        </div>

                        {/* Cena + Lokalizacja */}
                        <div className="ap-field-row">
                            <div className="ap-field">
                                <label htmlFor="ad-price" className="ap-info-label">Cena (zł)</label>
                                <input
                                    id="ad-price"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={formData.price ?? ""}
                                    onChange={(e) => setFormData((f) => ({
                                        ...f,
                                        price: e.target.value === "" ? undefined : Number(e.target.value),
                                    }))}
                                    className="ap-input"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="ap-field">
                                <label htmlFor="ad-location" className="ap-info-label">Lokalizacja</label>
                                <input
                                    id="ad-location"
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                                    className="ap-input"
                                    placeholder="Np. Warszawa"
                                    maxLength={255}
                                />
                            </div>
                        </div>

                        {/* Wygasa + Status */}
                        <div className="ap-field-row">
                            <div className="ap-field">
                                <label htmlFor="ad-expires" className="ap-info-label">Wygasa</label>
                                <input
                                    id="ad-expires"
                                    type="date"
                                    value={formData.expiresAt ?? ""}
                                    onChange={(e) => setFormData((f) => ({ ...f, expiresAt: e.target.value }))}
                                    className="ap-input"
                                />
                            </div>
                            <div className="ap-field">
                                <label htmlFor="ad-status" className="ap-info-label">Status</label>
                                <select
                                    id="ad-status"
                                    value={formData.status}
                                    onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}
                                    className="ap-input ap-select"
                                >
                                    <option value="active">Aktywne</option>
                                    <option value="inactive">Nieaktywne</option>
                                    <option value="expired">Wygasłe</option>
                                </select>
                            </div>
                        </div>

                        {/* ── SEKCJA ZDJĘĆ W FORMULARZU ── */}
                        <div className="ap-field">
                            <div className="ap-media-section-header">
                                <span className="ap-info-label">Zdjęcia i wideo</span>
                                <label className="ap-btn ap-btn--media ap-btn--sm ap-upload-label">
                                    + Dodaj pliki
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,video/mp4,video/quicktime"
                                        multiple
                                        className="ap-file-input"
                                        onChange={handlePendingFileSelect}
                                    />
                                </label>
                            </div>

                            <p className="ap-media-hint">
                                Zdjęcia zostaną przesłane automatycznie po zapisaniu ogłoszenia.
                                Dozwolone formaty: JPG, PNG, MP4, MOV.
                            </p>

                            {fileError && <p className="ap-error-msg ap-error-msg--sm">{fileError}</p>}

                            {/* Podglądy lokalnych plików */}
                            {pendingFiles.length > 0 && (
                                <div className="ap-media-grid ap-media-grid--pending">
                                    {pendingFiles.map((pf) => (
                                        <div key={pf.id} className="ap-media-item ap-media-item--pending">
                                            {pf.mediaType === "video" ? (
                                                <video
                                                    src={pf.previewUrl}
                                                    className="ap-media-thumb"
                                                    preload="metadata"
                                                />
                                            ) : (
                                                <img
                                                    src={pf.previewUrl}
                                                    alt="Podgląd"
                                                    className="ap-media-thumb"
                                                />
                                            )}
                                            {/* Etykieta "oczekuje" */}
                                            <span className="ap-media-pending-badge">⏳</span>
                                            <button
                                                className="ap-media-delete-btn"
                                                onClick={() => removePendingFile(pf.id)}
                                                title="Usuń"
                                                aria-label="Usuń plik"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Zdjęcia już zapisane (tryb edycji) */}
                            {editingAd && (editingAd.media ?? []).length > 0 && (
                                <>
                                    <p className="ap-info-label" style={{ marginTop: "1rem" }}>
                                        Już dodane
                                    </p>
                                    <div className="ap-media-grid">
                                        {(editingAd.media ?? []).map((m) => (
                                            <div key={m.mediaId} className="ap-media-item">
                                                {m.mediaType === "video" ? (
                                                    <video src={m.url} className="ap-media-thumb" preload="metadata" />
                                                ) : (
                                                    <img src={m.url} alt={`Zdjęcie #${m.mediaId}`} className="ap-media-thumb" />
                                                )}
                                                <button
                                                    className="ap-media-delete-btn"
                                                    onClick={() => handleDeleteMedia(editingAd.adId, m.mediaId)}
                                                    disabled={deletingMediaId === m.mediaId}
                                                    title="Usuń"
                                                    aria-label="Usuń zdjęcie"
                                                >
                                                    {deletingMediaId === m.mediaId ? "…" : "✕"}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {saveError && <p className="ap-error-msg">{saveError}</p>}

                        <div className="ap-form-actions">
                            <button
                                className="ap-btn ap-btn--primary"
                                onClick={handleSave}
                                disabled={saving || !formData.title || !formData.subcategoryId}
                            >
                                {saving
                                    ? pendingFiles.length > 0
                                        ? `Zapisywanie… (0/${pendingFiles.length} zdjęć)`
                                        : "Zapisywanie…"
                                    : "Zapisz"}
                            </button>
                            <button className="ap-btn ap-btn--ghost" onClick={handleCancel} disabled={saving}>
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────
                LISTA OGŁOSZEŃ
            ───────────────────────────────────────── */}
            <div className="ap-ads-section">
                <h2 className="ap-section-title">
                    Wszystkie ogłoszenia
                    <span className="ap-ads-count">{ads.length}</span>
                </h2>

                {ads.length === 0 ? (
                    <div className="ap-empty">
                        <div className="ap-empty-icon">📋</div>
                        <p>Brak ogłoszeń. Dodaj pierwsze!</p>
                    </div>
                ) : (
                    <ul className="ap-ads-list">
                        {ads.map((ad) => {
                            const isMediaOpen = expandedMediaAdId === ad.adId;
                            const mediaCount = ad.media?.length ?? 0;

                            return (
                                <li key={ad.adId} className="ap-ad-card">

                                    <div className="ap-ad-header">
                                        <span className="ap-ad-category">
                                            {ad.subcategory?.name ?? `Podkat. #${ad.subcategoryId}`}
                                        </span>
                                        <span className={`ap-badge ${ad.status === "active" ? "ap-badge--active" : "ap-badge--inactive"}`}>
                                            {ad.status === "active" ? "Aktywne"
                                                : ad.status === "expired" ? "Wygasłe"
                                                    : "Nieaktywne"}
                                        </span>
                                    </div>

                                    {/* Miniaturka głównego zdjęcia na karcie */}
                                    {mediaCount > 0 && !isMediaOpen && (
                                        <div className="ap-ad-thumb-row">
                                            {(ad.media ?? []).slice(0, 3).map((m) =>
                                                m.mediaType === "video" ? (
                                                    <video
                                                        key={m.mediaId}
                                                        src={m.url}
                                                        className="ap-ad-thumb"
                                                        preload="metadata"
                                                    />
                                                ) : (
                                                    <img
                                                        key={m.mediaId}
                                                        src={m.url}
                                                        alt=""
                                                        className="ap-ad-thumb"
                                                    />
                                                )
                                            )}
                                            {mediaCount > 3 && (
                                                <span className="ap-ad-thumb-more">+{mediaCount - 3}</span>
                                            )}
                                        </div>
                                    )}

                                    <h3 className="ap-ad-title">{ad.title}</h3>

                                    {ad.description && (
                                        <p className="ap-ad-desc">{ad.description}</p>
                                    )}

                                    <div className="ap-ad-meta">
                                        {ad.location && <span className="ap-ad-meta-item">📍 {ad.location}</span>}
                                        {ad.expiresAt && (
                                            <span className="ap-ad-meta-item">
                                                🕐 do {new Date(ad.expiresAt).toLocaleDateString("pl-PL")}
                                            </span>
                                        )}
                                        {ad.user && <span className="ap-ad-meta-item">👤 {ad.user.name}</span>}
                                    </div>

                                    <div className="ap-ad-footer">
                                        <span className="ap-ad-price">
                                            {ad.price != null
                                                ? `${ad.price.toLocaleString("pl-PL")} zł`
                                                : "Cena do uzgodnienia"}
                                        </span>
                                        <span className="ap-ad-date">
                                            {new Date(ad.createdAt).toLocaleDateString("pl-PL")}
                                        </span>
                                    </div>

                                    <div className="ap-ad-actions">
                                        <button
                                            className="ap-btn ap-btn--warning ap-btn--sm"
                                            onClick={() => openEdit(ad)}
                                            disabled={isFormOpen || deletingId === ad.adId}
                                        >
                                            Edytuj
                                        </button>
                                        <button
                                            className="ap-btn ap-btn--danger ap-btn--sm"
                                            onClick={() => handleDeleteAd(ad.adId)}
                                            disabled={deletingId === ad.adId}
                                        >
                                            {deletingId === ad.adId ? "Usuwanie…" : "Usuń"}
                                        </button>
                                        <button
                                            className={`ap-btn ap-btn--sm ${isMediaOpen ? "ap-btn--ghost" : "ap-btn--media"}`}
                                            onClick={() => toggleMedia(ad.adId)}
                                        >
                                            🖼 Zdjęcia
                                            {mediaCount > 0 && (
                                                <span className="ap-media-count">{mediaCount}</span>
                                            )}
                                        </button>
                                        <button
                                            className="ap-btn ap-btn--primary ap-btn--sm"
                                            onClick={() => navigate(`/comments/`)}
                                        >
                                            💬 Komentarze
                                        </button>

                                        <button
                                            className="ap-btn ap-btn--media ap-btn--sm"
                                            onClick={() => navigate(`/message/`)}
                                        >
                                            ✉ Wiadomość
                                        </button>
                                    </div>

                                    {/* Galeria istniejących mediów */}
                                    {isMediaOpen && (
                                        <div className="ap-media-section">
                                            <div className="ap-media-section-header">
                                                <span className="ap-info-label">Zdjęcia i wideo</span>
                                                <label className={`ap-btn ap-btn--primary ap-btn--sm ap-upload-label`}>
                                                    {uploadingAdId === ad.adId ? "Przesyłanie…" : "+ Dodaj plik"}
                                                    <input
                                                        ref={existingFileInputRef}
                                                        type="file"
                                                        accept="image/jpeg,image/png,video/mp4,video/quicktime"
                                                        className="ap-file-input"
                                                        disabled={uploadingAdId === ad.adId}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleExistingUpload(ad.adId, file);
                                                        }}
                                                    />
                                                </label>
                                            </div>

                                            {uploadError && (
                                                <p className="ap-error-msg ap-error-msg--sm">{uploadError}</p>
                                            )}

                                            {mediaCount === 0 ? (
                                                <p className="ap-media-empty">Brak plików.</p>
                                            ) : (
                                                <div className="ap-media-grid">
                                                    {(ad.media ?? []).map((m) => (
                                                        <div key={m.mediaId} className="ap-media-item">
                                                            {m.mediaType === "video" ? (
                                                                <video src={m.url} className="ap-media-thumb" controls preload="metadata" />
                                                            ) : (
                                                                <img src={m.url} alt={`Zdjęcie #${m.mediaId}`} className="ap-media-thumb" />
                                                            )}
                                                            <button
                                                                className="ap-media-delete-btn"
                                                                onClick={() => handleDeleteMedia(ad.adId, m.mediaId)}
                                                                disabled={deletingMediaId === m.mediaId}
                                                                title="Usuń"
                                                                aria-label="Usuń zdjęcie"
                                                            >
                                                                {deletingMediaId === m.mediaId ? "…" : "✕"}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}