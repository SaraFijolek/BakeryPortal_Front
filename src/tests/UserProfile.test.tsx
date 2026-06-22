

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import UserProfile from "../pages/UserProfile";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
    Link: ({ children }: any) => <div>{children}</div>,
    useNavigate: () => mockNavigate,
}));

const mockUser = {
    userId: "user-1",
    name: "Jan Kowalski",
    email: "jan@test.com",
    phone: "123456789",
    avatarUrl: "",
    createdAt: "2026-01-01T00:00:00Z",
    isActive: true,
};

const mockAds = [
    {
        id: "ad-1",
        title: "Laptop Dell",
        description: "Sprzedam laptop",
        price: 2500,
        category: "Elektronika",
        createdAt: "2026-01-02T00:00:00Z",
        isActive: true,
    },
];

function mockApi(overrides: Partial<Record<string, any>> = {}) {
    global.fetch = vi.fn((url: string, opts?: any) => {
        const method = opts?.method ?? "GET";

        const respond = (data: any, ok = true) =>
            Promise.resolve({
                ok,
                status: ok ? 200 : 500,
                json: () => Promise.resolve(data),
            } as Response);

        if (url.includes("/api/Users/") && method === "GET") {
            return respond(overrides.user ?? mockUser);
        }

        if (url.includes("/api/Advertisements")) {
            return respond(overrides.ads ?? mockAds);
        }

        if (
            method === "PUT" ||
            method === "PATCH" ||
            method === "POST" ||
            method === "DELETE"
        ) {
            return respond({});
        }

        return respond(null, false);
    }) as any;
}

describe("UserProfile", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        localStorage.setItem("token", "fake-token");
        localStorage.setItem("userId", "user-1");
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renderuje dane użytkownika", async () => {
        mockApi();

        render(<UserProfile />);

        expect(await screen.findByText("Jan Kowalski")).toBeInTheDocument();
        expect(screen.getByText("jan@test.com")).toBeInTheDocument();
        expect(screen.getByText("123456789")).toBeInTheDocument();
    });

    it("wyświetla ogłoszenia użytkownika", async () => {
        mockApi();

        render(<UserProfile />);

        expect(await screen.findByText("Laptop Dell")).toBeInTheDocument();
        expect(screen.getByText("Sprzedam laptop")).toBeInTheDocument();
        expect(screen.getByText(/2500/)).toBeInTheDocument();
    });

    it("pokazuje komunikat gdy brak ogłoszeń", async () => {
        mockApi({ ads: [] });

        render(<UserProfile />);

        expect(
            await screen.findByText("Nie masz jeszcze żadnych ogłoszeń.")
        ).toBeInTheDocument();
    });

    it("przechodzi do trybu edycji po kliknięciu Edytuj dane", async () => {
        mockApi();

        render(<UserProfile />);

        await screen.findByText("Jan Kowalski");

        fireEvent.click(screen.getByRole("button", { name: "Edytuj dane" }));

        expect(screen.getByDisplayValue("Jan Kowalski")).toBeInTheDocument();
        expect(screen.getByDisplayValue("jan@test.com")).toBeInTheDocument();
    });

    it("anuluje edycję danych", async () => {
        mockApi();

        render(<UserProfile />);

        await screen.findByText("Jan Kowalski");

        fireEvent.click(screen.getByRole("button", { name: "Edytuj dane" }));

        fireEvent.change(screen.getByDisplayValue("Jan Kowalski"), {
            target: { value: "Nowe Imię" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

        expect(
            screen.queryByRole("button", { name: "Zapisz zmiany" })
        ).not.toBeInTheDocument();
    });

    it("zapisuje zmienione dane użytkownika", async () => {
        mockApi();

        render(<UserProfile />);

        await screen.findByText("Jan Kowalski");

        fireEvent.click(screen.getByRole("button", { name: "Edytuj dane" }));

        fireEvent.change(screen.getByDisplayValue("Jan Kowalski"), {
            target: { value: "Nowe Imię" },
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Zapisz zmiany" })
        );

        await waitFor(() => {
            const putCall = (
                global.fetch as ReturnType<typeof vi.fn>
            ).mock.calls.find(
                (c) =>
                    c[1]?.method === "PUT" &&
                    c[0].includes("/api/Users/")
            );

            expect(putCall).toBeDefined();
        });
    });

    it("zmienia status konta", async () => {
        mockApi();

        render(<UserProfile />);

        await screen.findByText("Jan Kowalski");

        fireEvent.click(
            screen.getByRole("button", {
                name: "Dezaktywuj konto",
            })
        );

        await waitFor(() => {
            const patchCall = (
                global.fetch as ReturnType<typeof vi.fn>
            ).mock.calls.find(
                (c) => c[1]?.method === "PATCH"
            );

            expect(patchCall).toBeDefined();
        });
    });

    it("wylogowuje użytkownika", async () => {
        mockApi();

        render(<UserProfile />);

        await screen.findByText("Jan Kowalski");

        fireEvent.click(
            screen.getByRole("button", { name: "Wyloguj" })
        );

        expect(localStorage.getItem("token")).toBeNull();
        expect(localStorage.getItem("userId")).toBeNull();

        expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    it("otwiera modal usuwania konta", async () => {
        mockApi();

        render(<UserProfile />);

        await screen.findByText("Jan Kowalski");

        fireEvent.click(
            screen.getByRole("button", {
                name: /Usuń konto/i,
            })
        );

        expect(
            screen.getByText("Czy na pewno chcesz usunąć swoje konto?")
        ).toBeInTheDocument();
    });

    it("usuwa konto po potwierdzeniu", async () => {
        mockApi();

        render(<UserProfile />);

        await screen.findByText("Jan Kowalski");

        fireEvent.click(
            screen.getByRole("button", {
                name: /Usuń konto/i,
            })
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: /Tak, usuń konto/i,
            })
        );

        await waitFor(() => {
            const deleteCall = (
                global.fetch as ReturnType<typeof vi.fn>
            ).mock.calls.find(
                (c) => c[1]?.method === "DELETE"
            );

            expect(deleteCall).toBeDefined();
        });
    });

    it("przekierowuje na login gdy brak tokena", () => {
        localStorage.clear();

        mockApi();

        render(<UserProfile />);

        expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
});
