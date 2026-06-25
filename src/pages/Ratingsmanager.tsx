import React, { useEffect, useState, useCallback } from "react";



export interface RatingDto {
    ratingId: number;
    fromUserId: string;
    toUserId: string;
    score: number; // byte 1-5
    createdAt: string;
    fromUserName: string;
    toUserName: string;
}

export interface CreateRatingDto {
    fromUserId: string;
    toUserId: string;
    score: number;
}

export interface UpdateRatingDto {
    fromUserId: string;
    toUserId: string;
    score: number;
}

interface ApiErrorBody {
    success: false;
    message: string;
    errors?: string[];
}

// ====== API client ======

const API_BASE = "/api/Ratings";

// Provide your auth token however your app stores it (cookie/session/etc).
// This helper reads a bearer token from localStorage if present; adjust to your auth flow.
function authHeaders(): HeadersInit {
    const token = window.localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;

    if (!res.ok) {
        const err = body as ApiErrorBody | null;
        const message = err?.message ?? `Request failed (${res.status})`;
        const errors = err?.errors ?? [];
        throw new Error([message, ...errors].join(" — "));
    }

    return body as T;
}

const RatingsApi = {
    getAll: async (): Promise<RatingDto[]> => {
        const res = await fetch(API_BASE, { headers: authHeaders() });
        return parseResponse<RatingDto[]>(res);
    },

    getById: async (id: number): Promise<RatingDto> => {
        const res = await fetch(`${API_BASE}/${id}`, { headers: authHeaders() });
        return parseResponse<RatingDto>(res);
    },

    create: async (dto: CreateRatingDto): Promise<RatingDto> => {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(dto),
        });
        return parseResponse<RatingDto>(res);
    },

    update: async (id: number, dto: UpdateRatingDto): Promise<RatingDto> => {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(dto),
        });
        return parseResponse<RatingDto>(res);
    },

    remove: async (id: number): Promise<void> => {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: "DELETE",
            headers: authHeaders(),
        });
        await parseResponse<unknown>(res);
    },
};

// ====== Helper UI bits ======

function StarScore({ score }: { score: number }) {
    return (
        <span aria-label={`Score ${score} out of 5`}>
      {"★".repeat(score)}
            {"☆".repeat(5 - score)}
    </span>
    );
}

interface FormState {
    fromUserId: string;
    toUserId: string;
    score: number;
}

const emptyForm: FormState = { fromUserId: "", toUserId: "", score: 5 };

// ====== Main component ======

export default function RatingsManager() {
    const [ratings, setRatings] = useState<RatingDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await RatingsApi.getAll();
            setRatings(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't load ratings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    function startCreate() {
        setEditingId(0); // 0 = creating new
        setForm(emptyForm);
        setFormError(null);
    }

    function startEdit(rating: RatingDto) {
        setEditingId(rating.ratingId);
        setForm({
            fromUserId: rating.fromUserId,
            toUserId: rating.toUserId,
            score: rating.score,
        });
        setFormError(null);
    }

    function cancelEdit() {
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);
        try {
            if (editingId === 0) {
                await RatingsApi.create(form);
            } else if (editingId !== null) {
                await RatingsApi.update(editingId, form);
            }
            cancelEdit();
            await load();
        } catch (e) {
            setFormError(e instanceof Error ? e.message : "Couldn't save the rating.");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: number) {
        if (!window.confirm("Delete this rating? This can't be undone.")) return;
        try {
            await RatingsApi.remove(id);
            setRatings((prev) => prev.filter((r) => r.ratingId !== id));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't delete the rating.");
        }
    }

    const isFormOpen = editingId !== null;

    return (
        <div>
            <div>
                <h1>Ratings</h1>
                <p>
                    {ratings.length} rating{ratings.length === 1 ? "" : "s"} recorded
                </p>
                {!isFormOpen && <button onClick={startCreate}>New rating</button>}
            </div>

            {isFormOpen && (
                <form onSubmit={handleSubmit}>
                    <h2>{editingId === 0 ? "New rating" : `Edit rating #${editingId}`}</h2>

                    <div>
                        <label>
                            From user ID
                            <input
                                value={form.fromUserId}
                                onChange={(e) => setForm((f) => ({ ...f, fromUserId: e.target.value }))}
                                required
                            />
                        </label>
                        <label>
                            To user ID
                            <input
                                value={form.toUserId}
                                onChange={(e) => setForm((f) => ({ ...f, toUserId: e.target.value }))}
                                required
                            />
                        </label>
                        <label>
                            Score (1–5)
                            <input
                                type="number"
                                min={1}
                                max={5}
                                value={form.score}
                                onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))}
                                required
                            />
                        </label>
                    </div>

                    {formError && <div>{formError}</div>}

                    <div>
                        <button type="button" onClick={cancelEdit} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting}>
                            {submitting ? "Saving…" : "Save"}
                        </button>
                    </div>
                </form>
            )}

            {error && <div>{error}</div>}

            {loading ? (
                <p>Loading ratings…</p>
            ) : ratings.length === 0 ? (
                <p>No ratings yet. Create the first one above.</p>
            ) : (
                <table>
                    <thead>
                    <tr>
                        <th>#</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Score</th>
                        <th>Created</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {ratings.map((r) => (
                        <tr key={r.ratingId}>
                            <td>{r.ratingId}</td>
                            <td>{r.fromUserName || r.fromUserId}</td>
                            <td>{r.toUserName || r.toUserId}</td>
                            <td>
                                <StarScore score={r.score} />
                            </td>
                            <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                            <td>
                                <button onClick={() => startEdit(r)}>Edit</button>
                                <button onClick={() => handleDelete(r.ratingId)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}