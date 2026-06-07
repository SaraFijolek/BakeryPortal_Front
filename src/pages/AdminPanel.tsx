
import { useEffect, useState, type ReactNode } from "react";

interface AdminDto {
    adminId: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    role: string;
    isActive: boolean;
    twoFactorEnabled: boolean;
    createdAt: string;
    lastLogin?: string;
    failedLoginAttempts: number;
    lockedUntil?: string;
}

interface CreateAdminDto {
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    avatarUrl?: string;
    role: string;
    isActive: boolean;
    twoFactorEnabled: boolean;
}

interface UpdateAdminDto {
    name: string;
    email: string;
    passwordHash?: string;
    phone?: string;
    avatarUrl?: string;
    role: string;
    isActive: boolean;
    twoFactorEnabled: boolean;
}

interface AdminSessionListDto {
    sessionId: number;
    adminId: string;
    sessionToken: string;
    ipAddress: string;
    createdAt: string;
    expiresAt: string;
    isActive: boolean;
    adminUsername?: string;
    adminEmail?: string;
}

interface CreateAdminSessionDto {
    adminId: string;
    sessionToken: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: string;
    isActive: boolean;
}

interface AdminAuditLogListItemDto {
    logId: number;
    adminId: string;
    action: string;
    targetType?: string;
    targetId?: number;
    description?: string;
    ipAddress?: string;
    createdAt: string;
    adminUsername?: string;
    adminEmail?: string;
}

interface AdminPermissionListItemDto {
    permissionId: number;
    name: string;
    category?: string;
    description?: string;
}

interface CreateAdminPermissionDto {
    name: string;
    category?: string;
    description?: string;
}

interface AdminRolePermissionListItemDto {
    rolePermissionId: number;
    role: string;
    permissionId: number;
    permissionName?: string;
    permissionCategory?: string;
}

interface CreateAdminRolePermissionDto {
    role: string;
    permissionId: number;
}

type ViewId = "dashboard" | "admins" | "sessions" | "auditlogs" | "permissions" | "rolepermissions";

interface NavItem {
    id: ViewId;
    label: string;
    icon: string;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

const API_BASE = "https://localhost:7183/api";

function getToken(): string | null {
    return localStorage.getItem("token");
}

function authHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    };
}

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: authHeaders(),
        ...opts,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : (null as T);
}

// ─── Shared UI components ────────────────────────────────────────────────────

interface BadgeProps {
    active: boolean;
}

function StatusBadge({ active }: BadgeProps) {
    return (
        <span className={`ap-badge ${active ? "ap-badge--active" : "ap-badge--inactive"}`}>
      {active ? "Aktywny" : "Nieaktywny"}
    </span>
    );
}

function RoleBadge({ role }: { role: string }) {
    const cls =
        role?.toLowerCase() === "admin"
            ? "ap-role-badge--admin"
            : role?.toLowerCase() === "moderator"
                ? "ap-role-badge--moderator"
                : role?.toLowerCase() === "superadmin"
                    ? "ap-role-badge--superadmin"
                    : "ap-role-badge--default";

    return <span className={`ap-role-badge ${cls}`}>{role?.toUpperCase() ?? "—"}</span>;
}

interface StatCardProps {
    label: string;
    value: number | string;
    sub?: string;
    color: "teal" | "blue" | "purple" | "coral";
}

function StatCard({ label, value, sub, color }: StatCardProps) {
    return (
        <div className="ap-stat">
            <div className="ap-stat__label">{label}</div>
            <div className={`ap-stat__value ap-stat__value--${color}`}>{value}</div>
            {sub && <div className="ap-stat__sub">{sub}</div>}
        </div>
    );
}

interface Column<T> {
    key: keyof T | string;
    label: string;
    render?: (value: unknown, row: T) => ReactNode;
}

interface TableProps<T> {
    cols: Column<T>[];
    rows: T[];
    keyFn: (row: T) => string | number;
    actions?: (row: T) => ReactNode;
}

function DataTable<T>({ cols, rows, keyFn, actions }: TableProps<T>) {
    if (!rows.length) return <div className="ap-empty">Brak danych</div>;

    return (
        <div className="ap-table-wrap">
            <table className="ap-table">
                <thead>
                <tr>
                    {cols.map((c) => (
                        <th key={String(c.key)}>{c.label}</th>
                    ))}
                    {actions && <th>Akcje</th>}
                </tr>
                </thead>
                <tbody>
                {rows.map((row) => (
                    <tr key={keyFn(row)}>
                        {cols.map((c) => {
                            const val = (row as Record<string, unknown>)[String(c.key)];
                            return (
                                <td key={String(c.key)}>
                                    {c.render ? c.render(val, row) : (val as ReactNode) ?? "—"}
                                </td>
                            );
                        })}
                        {actions && (
                            <td>
                                <div className="ap-table__actions">{actions(row)}</div>
                            </td>
                        )}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

type BtnVariant = "default" | "primary" | "danger" | "ghost";
type BtnSize = "md" | "sm";

interface BtnProps {
    onClick?: () => void;
    variant?: BtnVariant;
    size?: BtnSize;
    disabled?: boolean;
    children: ReactNode;
    type?: "button" | "submit";
}

function Btn({ onClick, variant = "default", size = "md", disabled, children, type = "button" }: BtnProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`ap-btn ap-btn--${variant} ap-btn--${size}`}
        >
            {children}
        </button>
    );
}

interface ModalProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
    const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };
    return (
        <div className="ap-modal-backdrop" onClick={handleBackdrop}>
            <div className="ap-modal">
                <div className="ap-modal__header">
                    <h2 className="ap-modal__title">{title}</h2>
                    <button className="ap-modal__close" onClick={onClose} type="button">
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

interface FieldProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    required?: boolean;
}

function Field({ label, value, onChange, type = "text", required }: FieldProps) {
    return (
        <div className="ap-field">
            <label className="ap-field__label">
                {label}
                {required && " *"}
            </label>
            <input
                type={type}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="ap-field__input"
            />
        </div>
    );
}

interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
    return (
        <div className="ap-field">
            <label className="ap-field__label">{label}</label>
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                className="ap-field__select"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

interface CheckFieldProps {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
}

function CheckField({ label, value, onChange }: CheckFieldProps) {
    return (
        <label className="ap-check-label">
            <input
                type="checkbox"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
            />
            {label}
        </label>
    );
}

function formatDate(d?: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleString("pl-PL", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

// ─── Views ───────────────────────────────────────────────────────────────────

interface DashboardProps {
    admins: AdminDto[];
    sessions: AdminSessionListDto[];
    auditLogs: AdminAuditLogListItemDto[];
    permissions: AdminPermissionListItemDto[];
}

function DashboardView({ admins, sessions, auditLogs, permissions }: DashboardProps) {
    const activeAdmins = admins.filter((a) => a.isActive).length;
    const activeSessions = sessions.filter((s) => s.isActive).length;

    return (
        <>
            <h1 className="ap-page-title" style={{ marginBottom: "1.75rem" }}>
                Panel główny
            </h1>
            <div className="ap-stats">
                <StatCard label="Administratorzy" value={admins.length} sub={`${activeAdmins} aktywnych`} color="teal" />
                <StatCard label="Aktywne sesje" value={activeSessions} sub="w tej chwili" color="blue" />
                <StatCard label="Logi audytu" value={auditLogs.length} sub="wszystkich wpisów" color="purple" />
                <StatCard label="Uprawnienia" value={permissions.length} sub="zdefiniowanych" color="coral" />
            </div>

            <div className="ap-recent">
                <div className="ap-recent__title">Ostatnio aktywni administratorzy</div>
                {admins.slice(0, 6).map((a) => (
                    <div key={a.adminId} className="ap-recent__row">
                        <div className="ap-recent__info">
                            <div className="ap-avatar">
                                {a.name?.slice(0, 2).toUpperCase() ?? "??"}
                            </div>
                            <div>
                                <div className="ap-recent__name">{a.name}</div>
                                <div className="ap-recent__email">{a.email}</div>
                            </div>
                        </div>
                        <RoleBadge role={a.role} />
                    </div>
                ))}
                {admins.length === 0 && <div className="ap-empty">Brak administratorów</div>}
            </div>
        </>
    );
}

// ─── Admins view ─────────────────────────────────────────────────────────────

type AdminModalMode = "create" | "edit" | null;

type AdminFormState = Partial<AdminDto & { passwordHash: string }>;

function AdminsView() {
    const [data, setData] = useState<AdminDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<AdminModalMode>(null);
    const [form, setForm] = useState<AdminFormState>({});
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFetch<AdminDto[]>("/Admins");
            setData(result ?? []);
        } catch {
            setError("Błąd ładowania administratorów.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const setField = <K extends keyof AdminFormState>(key: K) =>
        (value: AdminFormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

    const openCreate = () => {
        setForm({ role: "moderator", isActive: true, twoFactorEnabled: false });
        setModal("create");
    };

    const openEdit = (row: AdminDto) => {
        setForm({ ...row });
        setModal("edit");
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (modal === "create") {
                const payload: CreateAdminDto = {
                    name: form.name ?? "",
                    email: form.email ?? "",
                    passwordHash: form.passwordHash ?? "",
                    phone: form.phone,
                    avatarUrl: form.avatarUrl,
                    role: form.role ?? "moderator",
                    isActive: form.isActive ?? true,
                    twoFactorEnabled: form.twoFactorEnabled ?? false,
                };
                await apiFetch("/Admins", { method: "POST", body: JSON.stringify(payload) });
            } else {
                const payload: UpdateAdminDto = {
                    name: form.name ?? "",
                    email: form.email ?? "",
                    passwordHash: form.passwordHash,
                    phone: form.phone,
                    avatarUrl: form.avatarUrl,
                    role: form.role ?? "moderator",
                    isActive: form.isActive ?? true,
                    twoFactorEnabled: form.twoFactorEnabled ?? false,
                };
                await apiFetch(`/Admins/${form.adminId}`, { method: "PUT", body: JSON.stringify(payload) });
            }
            setModal(null);
            load();
        } catch {
            setError("Błąd zapisu.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Na pewno usunąć administratora?")) return;
        try {
            await apiFetch(`/Admins/${id}`, { method: "DELETE" });
            load();
        } catch {
            setError("Błąd usuwania.");
        }
    };

    const cols: Column<AdminDto>[] = [
        { key: "name", label: "Imię i nazwisko" },
        { key: "email", label: "E-mail" },
        { key: "role", label: "Rola", render: (v) => <RoleBadge role={String(v)} /> },
        { key: "isActive", label: "Status", render: (v) => <StatusBadge active={Boolean(v)} /> },
        { key: "twoFactorEnabled", label: "2FA", render: (v) => <span className={v ? "ap-tfa-on" : "ap-tfa-off"}>{v ? "✓ Włączone" : "—"}</span> },
        { key: "lastLogin", label: "Ostatnie logowanie", render: (v) => formatDate(v as string) },
    ];

    return (
        <>
            <div className="ap-page-header">
                <h1 className="ap-page-title">Administratorzy</h1>
                <Btn variant="primary" onClick={openCreate}>+ Dodaj admina</Btn>
            </div>
            {error && <div className="ap-error-alert">{error}</div>}
            {loading ? (
                <div className="ap-loading">Ładowanie…</div>
            ) : (
                <DataTable
                    cols={cols}
                    rows={data}
                    keyFn={(r) => r.adminId}
                    actions={(row) => (
                        <>
                            <Btn size="sm" onClick={() => openEdit(row)}>Edytuj</Btn>
                            <Btn size="sm" variant="danger" onClick={() => handleDelete(row.adminId)}>Usuń</Btn>
                        </>
                    )}
                />
            )}

            {modal && (
                <Modal
                    title={modal === "create" ? "Nowy administrator" : "Edytuj administratora"}
                    onClose={() => setModal(null)}
                >
                    <Field label="Imię i nazwisko" value={form.name ?? ""} onChange={setField("name")} required />
                    <Field label="E-mail" value={form.email ?? ""} onChange={setField("email")} type="email" required />
                    {modal === "create" && (
                        <Field label="Hasło" value={form.passwordHash ?? ""} onChange={setField("passwordHash")} type="password" required />
                    )}
                    <Field label="Telefon" value={form.phone ?? ""} onChange={setField("phone")} />
                    <Field label="Avatar URL" value={form.avatarUrl ?? ""} onChange={setField("avatarUrl")} />
                    <SelectField
                        label="Rola"
                        value={form.role ?? "moderator"}
                        onChange={setField("role")}
                        options={[
                            { value: "moderator", label: "Moderator" },
                            { value: "admin", label: "Admin" },
                            { value: "superadmin", label: "Superadmin" },
                        ]}
                    />
                    <CheckField label="Konto aktywne" value={form.isActive ?? true} onChange={setField("isActive")} />
                    <CheckField label="Włącz 2FA" value={form.twoFactorEnabled ?? false} onChange={setField("twoFactorEnabled")} />
                    <div className="ap-modal__footer">
                        <Btn variant="ghost" onClick={() => setModal(null)}>Anuluj</Btn>
                        <Btn variant="primary" onClick={handleSave} disabled={saving}>
                            {saving ? "Zapisywanie…" : "Zapisz"}
                        </Btn>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ─── Sessions view ────────────────────────────────────────────────────────────

function SessionsView() {
    const [data, setData] = useState<AdminSessionListDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<Partial<CreateAdminSessionDto>>({});
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFetch<AdminSessionListDto[]>("/AdminsSessions/list");
            setData(result ?? []);
        } catch {
            setError("Błąd ładowania sesji.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const setField = <K extends keyof CreateAdminSessionDto>(key: K) =>
        (value: CreateAdminSessionDto[K]) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleCreate = async () => {
        setSaving(true);
        try {
            const payload: CreateAdminSessionDto = {
                adminId: form.adminId ?? "",
                sessionToken: form.sessionToken ?? "",
                ipAddress: form.ipAddress,
                userAgent: form.userAgent,
                expiresAt: form.expiresAt ?? "",
                isActive: true,
            };
            await apiFetch("/AdminsSessions", { method: "POST", body: JSON.stringify(payload) });
            setShowModal(false);
            load();
        } catch {
            setError("Błąd zapisu.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Na pewno usunąć sesję?")) return;
        try {
            await apiFetch(`/AdminsSessions/${id}`, { method: "DELETE" });
            load();
        } catch {
            setError("Błąd usuwania.");
        }
    };

    const cols: Column<AdminSessionListDto>[] = [
        { key: "sessionId", label: "ID" },
        { key: "adminEmail", label: "Administrator" },
        { key: "ipAddress", label: "Adres IP" },
        { key: "isActive", label: "Status", render: (v) => <StatusBadge active={Boolean(v)} /> },
        { key: "createdAt", label: "Utworzona", render: (v) => formatDate(v as string) },
        { key: "expiresAt", label: "Wygasa", render: (v) => formatDate(v as string) },
    ];

    return (
        <>
            <div className="ap-page-header">
                <h1 className="ap-page-title">Sesje administratorów</h1>
                <Btn variant="primary" onClick={() => { setForm({}); setShowModal(true); }}>+ Nowa sesja</Btn>
            </div>
            {error && <div className="ap-error-alert">{error}</div>}
            {loading ? (
                <div className="ap-loading">Ładowanie…</div>
            ) : (
                <DataTable
                    cols={cols}
                    rows={data}
                    keyFn={(r) => r.sessionId}
                    actions={(row) => (
                        <Btn size="sm" variant="danger" onClick={() => handleDelete(row.sessionId)}>Usuń</Btn>
                    )}
                />
            )}

            {showModal && (
                <Modal title="Nowa sesja" onClose={() => setShowModal(false)}>
                    <Field label="Admin ID" value={form.adminId ?? ""} onChange={setField("adminId")} required />
                    <Field label="Token sesji" value={form.sessionToken ?? ""} onChange={setField("sessionToken")} required />
                    <Field label="Adres IP" value={form.ipAddress ?? ""} onChange={setField("ipAddress")} />
                    <Field label="User Agent" value={form.userAgent ?? ""} onChange={setField("userAgent")} />
                    <Field label="Wygasa o" value={form.expiresAt ?? ""} onChange={setField("expiresAt")} type="datetime-local" required />
                    <div className="ap-modal__footer">
                        <Btn variant="ghost" onClick={() => setShowModal(false)}>Anuluj</Btn>
                        <Btn variant="primary" onClick={handleCreate} disabled={saving}>
                            {saving ? "Zapisywanie…" : "Zapisz"}
                        </Btn>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ─── Audit logs view ─────────────────────────────────────────────────────────

function AuditLogsView() {
    const [data, setData] = useState<AdminAuditLogListItemDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const result = await apiFetch<AdminAuditLogListItemDto[]>("/AdminAuditLogs");
                setData(result ?? []);
            } catch {
                setError("Błąd ładowania logów.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const cols: Column<AdminAuditLogListItemDto>[] = [
        { key: "logId", label: "ID" },
        { key: "adminId", label: "Admin ID" },
        {
            key: "action",
            label: "Akcja",
            render: (v) => <span className="ap-action-badge">{String(v)}</span>,
        },
        { key: "targetType", label: "Typ zasobu" },
        { key: "targetId", label: "ID zasobu" },
        { key: "ipAddress", label: "IP" },
        { key: "createdAt", label: "Data", render: (v) => formatDate(v as string) },
    ];

    return (
        <>
            <h1 className="ap-page-title" style={{ marginBottom: "1.75rem" }}>Logi audytu</h1>
            {error && <div className="ap-error-alert">{error}</div>}
            {loading ? <div className="ap-loading">Ładowanie…</div> : (
                <DataTable cols={cols} rows={data} keyFn={(r) => r.logId} />
            )}
        </>
    );
}

// ─── Permissions view ────────────────────────────────────────────────────────

type PermModalMode = "create" | "edit" | null;

function PermissionsView() {
    const [data, setData] = useState<AdminPermissionListItemDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<PermModalMode>(null);
    const [form, setForm] = useState<Partial<AdminPermissionListItemDto>>({});
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFetch<AdminPermissionListItemDto[]>("/AdminPermissions");
            setData(result ?? []);
        } catch {
            setError("Błąd ładowania uprawnień.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const setField = <K extends keyof AdminPermissionListItemDto>(key: K) =>
        (value: AdminPermissionListItemDto[K]) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: CreateAdminPermissionDto = {
                name: form.name ?? "",
                category: form.category,
                description: form.description,
            };
            if (modal === "create") {
                await apiFetch("/AdminPermissions", { method: "POST", body: JSON.stringify(payload) });
            } else {
                await apiFetch(`/AdminPermissions/${form.permissionId}`, { method: "PUT", body: JSON.stringify(payload) });
            }
            setModal(null);
            load();
        } catch {
            setError("Błąd zapisu.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Na pewno usunąć uprawnienie?")) return;
        try {
            await apiFetch(`/AdminPermissions/${id}`, { method: "DELETE" });
            load();
        } catch {
            setError("Błąd usuwania.");
        }
    };

    const cols: Column<AdminPermissionListItemDto>[] = [
        { key: "permissionId", label: "ID" },
        { key: "name", label: "Nazwa" },
        {
            key: "category",
            label: "Kategoria",
            render: (v) => v ? <span className="ap-perm-badge">{String(v)}</span> : <>—</>,
        },
        { key: "description", label: "Opis" },
    ];

    return (
        <>
            <div className="ap-page-header">
                <h1 className="ap-page-title">Uprawnienia</h1>
                <Btn variant="primary" onClick={() => { setForm({}); setModal("create"); }}>+ Dodaj uprawnienie</Btn>
            </div>
            {error && <div className="ap-error-alert">{error}</div>}
            {loading ? <div className="ap-loading">Ładowanie…</div> : (
                <DataTable
                    cols={cols}
                    rows={data}
                    keyFn={(r) => r.permissionId}
                    actions={(row) => (
                        <>
                            <Btn size="sm" onClick={() => { setForm({ ...row }); setModal("edit"); }}>Edytuj</Btn>
                            <Btn size="sm" variant="danger" onClick={() => handleDelete(row.permissionId)}>Usuń</Btn>
                        </>
                    )}
                />
            )}

            {modal && (
                <Modal
                    title={modal === "create" ? "Nowe uprawnienie" : "Edytuj uprawnienie"}
                    onClose={() => setModal(null)}
                >
                    <Field label="Nazwa" value={form.name ?? ""} onChange={setField("name")} required />
                    <Field label="Kategoria" value={form.category ?? ""} onChange={setField("category")} />
                    <div className="ap-field">
                        <label className="ap-field__label">Opis</label>
                        <textarea
                            value={form.description ?? ""}
                            onChange={(e) => setField("description")(e.target.value)}
                            rows={3}
                            className="ap-field__textarea"
                        />
                    </div>
                    <div className="ap-modal__footer">
                        <Btn variant="ghost" onClick={() => setModal(null)}>Anuluj</Btn>
                        <Btn variant="primary" onClick={handleSave} disabled={saving}>
                            {saving ? "Zapisywanie…" : "Zapisz"}
                        </Btn>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ─── Role permissions view ────────────────────────────────────────────────────

function RolePermissionsView() {
    const [data, setData] = useState<AdminRolePermissionListItemDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<Partial<CreateAdminRolePermissionDto>>({});
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFetch<AdminRolePermissionListItemDto[]>("/AdminRolePermissions");
            setData(result ?? []);
        } catch {
            setError("Błąd ładowania przypisań ról.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        setSaving(true);
        try {
            const payload: CreateAdminRolePermissionDto = {
                role: form.role ?? "",
                permissionId: Number(form.permissionId),
            };
            await apiFetch("/AdminRolePermissions", { method: "POST", body: JSON.stringify(payload) });
            setShowModal(false);
            load();
        } catch {
            setError("Błąd zapisu.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Na pewno usunąć przypisanie?")) return;
        try {
            await apiFetch(`/AdminRolePermissions/${id}`, { method: "DELETE" });
            load();
        } catch {
            setError("Błąd usuwania.");
        }
    };

    const cols: Column<AdminRolePermissionListItemDto>[] = [
        { key: "rolePermissionId", label: "ID" },
        { key: "role", label: "Rola", render: (v) => <RoleBadge role={String(v)} /> },
        { key: "permissionId", label: "ID uprawnienia" },
        { key: "permissionName", label: "Uprawnienie" },
        {
            key: "permissionCategory",
            label: "Kategoria",
            render: (v) => v ? <span className="ap-perm-badge">{String(v)}</span> : <>—</>,
        },
    ];

    return (
        <>
            <div className="ap-page-header">
                <h1 className="ap-page-title">Role i uprawnienia</h1>
                <Btn variant="primary" onClick={() => { setForm({ role: "moderator" }); setShowModal(true); }}>
                    + Przypisz uprawnienie
                </Btn>
            </div>
            {error && <div className="ap-error-alert">{error}</div>}
            {loading ? <div className="ap-loading">Ładowanie…</div> : (
                <DataTable
                    cols={cols}
                    rows={data}
                    keyFn={(r) => r.rolePermissionId}
                    actions={(row) => (
                        <Btn size="sm" variant="danger" onClick={() => handleDelete(row.rolePermissionId)}>Usuń</Btn>
                    )}
                />
            )}

            {showModal && (
                <Modal title="Przypisz uprawnienie do roli" onClose={() => setShowModal(false)}>
                    <SelectField
                        label="Rola"
                        value={form.role ?? "moderator"}
                        onChange={(v) => setForm((p) => ({ ...p, role: v }))}
                        options={[
                            { value: "moderator", label: "Moderator" },
                            { value: "admin", label: "Admin" },
                            { value: "superadmin", label: "Superadmin" },
                        ]}
                    />
                    <Field
                        label="ID uprawnienia"
                        value={String(form.permissionId ?? "")}
                        onChange={(v) => setForm((p) => ({ ...p, permissionId: Number(v) }))}
                        type="number"
                        required
                    />
                    <div className="ap-modal__footer">
                        <Btn variant="ghost" onClick={() => setShowModal(false)}>Anuluj</Btn>
                        <Btn variant="primary" onClick={handleCreate} disabled={saving}>
                            {saving ? "Zapisywanie…" : "Zapisz"}
                        </Btn>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ─── App shell ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: "⬡" },
    { id: "admins", label: "Administratorzy", icon: "◈" },
    { id: "sessions", label: "Sesje", icon: "◉" },
    { id: "auditlogs", label: "Logi audytu", icon: "◎" },
    { id: "permissions", label: "Uprawnienia", icon: "◆" },
    { id: "rolepermissions", label: "Role & Uprawnienia", icon: "◇" },
];

export default function AdminPanel() {
    const [view, setView] = useState<ViewId>("dashboard");
    const [collapsed, setCollapsed] = useState(false);
    const [admins, setAdmins] = useState<AdminDto[]>([]);
    const [sessions, setSessions] = useState<AdminSessionListDto[]>([]);
    const [auditLogs, setAuditLogs] = useState<AdminAuditLogListItemDto[]>([]);
    const [permissions, setPermissions] = useState<AdminPermissionListItemDto[]>([]);

    useEffect(() => {
        apiFetch<AdminDto[]>("/Admins").then(setAdmins).catch(() => {});
        apiFetch<AdminSessionListDto[]>("/AdminsSessions/list").then(setSessions).catch(() => {});
        apiFetch<AdminAuditLogListItemDto[]>("/AdminAuditLogs").then(setAuditLogs).catch(() => {});
        apiFetch<AdminPermissionListItemDto[]>("/AdminPermissions").then(setPermissions).catch(() => {});
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        window.location.href = "/login";
    };

    const currentLabel = NAV_ITEMS.find((n) => n.id === view)?.label ?? "";

    return (
        <div className="ap-root">
            {/* Sidebar */}
            <aside className={`ap-sidebar${collapsed ? " ap-sidebar--collapsed" : ""}`}>
                <div className="ap-sidebar__brand">
                    <div className="ap-sidebar__logo">
                        <span className="ap-sidebar__logo-full">⬡ ADMIN</span>
                        <span className="ap-sidebar__logo-icon">⬡</span>
                    </div>
                    <div className="ap-sidebar__subtitle">Panel zarządzania</div>
                </div>

                <nav className="ap-nav">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`ap-nav__item${view === item.id ? " ap-nav__item--active" : ""}`}
                            onClick={() => setView(item.id)}
                        >
                            <span className="ap-nav__icon">{item.icon}</span>
                            <span className="ap-nav__label">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="ap-sidebar__toggle">
                    <button
                        type="button"
                        className="ap-sidebar__toggle-btn"
                        onClick={() => setCollapsed((c) => !c)}
                    >
                        {collapsed ? "»" : "«"}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="ap-main">
                <header className="ap-topbar">
                    <span className="ap-topbar__breadcrumb">{currentLabel.toUpperCase()}</span>
                    <div className="ap-topbar__right">
            <span className="ap-topbar__date">
              {new Date().toLocaleDateString("pl-PL", { dateStyle: "long" })}
            </span>
                        <button type="button" className="ap-topbar__logout" onClick={handleLogout}>
                            Wyloguj
                        </button>
                    </div>
                </header>

                <main className="ap-content">
                    {view === "dashboard" && (
                        <DashboardView
                            admins={admins}
                            sessions={sessions}
                            auditLogs={auditLogs}
                            permissions={permissions}
                        />
                    )}
                    {view === "admins" && <AdminsView />}
                    {view === "sessions" && <SessionsView />}
                    {view === "auditlogs" && <AuditLogsView />}
                    {view === "permissions" && <PermissionsView />}
                    {view === "rolepermissions" && <RolePermissionsView />}
                </main>
            </div>
        </div>
    );
}


