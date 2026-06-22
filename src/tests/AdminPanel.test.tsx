// src/frontedtests/AdminPanel.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AdminPanel from '../pages/AdminPanel'

const mockAdmins = [
    {
        adminId: 'admin-1',
        name: 'Jan Kowalski',
        email: 'jan@test.com',
        role: 'admin',
        isActive: true,
        twoFactorEnabled: false,
        createdAt: '2026-01-01T00:00:00Z',
        failedLoginAttempts: 0,
    },
]

const mockSessions = [
    {
        sessionId: 1,
        adminId: 'admin-1',
        sessionToken: 'tok',
        ipAddress: '127.0.0.1',
        createdAt: '2026-01-01T00:00:00Z',
        expiresAt: '2026-12-31T00:00:00Z',
        isActive: true,
        adminEmail: 'jan@test.com',
    },
]

const mockAuditLogs = [
    {
        logId: 1,
        adminId: 'admin-1',
        action: 'LOGIN',
        createdAt: '2026-01-01T00:00:00Z',
        adminEmail: 'jan@test.com',
    },
]

const mockPermissions = [
    { permissionId: 1, name: 'manage_users', category: 'users' },
]

const mockRolePermissions = [
    { rolePermissionId: 1, role: 'admin', permissionId: 1, permissionName: 'manage_users' },
]

/* Helper: mockuje fetch dla wszystkich endpointów używanych w AdminPanel */
function mockApi(overrides: Partial<Record<string, any>> = {}) {
    global.fetch = vi.fn((url: string, opts?: any) => {
        const method = opts?.method ?? 'GET'

        const respond = (data: any, ok = true) =>
            Promise.resolve({
                ok,
                status: ok ? 200 : 500,
                text: () => Promise.resolve(JSON.stringify(data)),
            } as Response)

        if (url.includes('/Admins') && !url.includes('Sessions') && method === 'GET') {
            return respond(overrides.admins ?? mockAdmins)
        }
        if (url.includes('/AdminsSessions/list')) {
            return respond(overrides.sessions ?? mockSessions)
        }
        if (url.includes('/AdminAuditLogs')) {
            return respond(overrides.auditLogs ?? mockAuditLogs)
        }
        if (url.includes('/AdminPermissions') && method === 'GET') {
            return respond(overrides.permissions ?? mockPermissions)
        }
        if (url.includes('/AdminRolePermissions') && method === 'GET') {
            return respond(overrides.rolePermissions ?? mockRolePermissions)
        }
        if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
            return respond(overrides.mutationResponse ?? {})
        }
        return respond(null, false)
    }) as any
}

describe('AdminPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        localStorage.setItem('token', 'fake-token')
        global.window.confirm = vi.fn(() => true)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renderuje sidebar z nawigacją i domyślnie pokazuje Dashboard', async () => {
        mockApi()

        render(<AdminPanel />)

        expect(screen.getByText('⬡ ADMIN')).toBeInTheDocument()
        expect(screen.getByText('Panel zarządzania')).toBeInTheDocument()
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Administratorzy')).toBeInTheDocument()
        expect(screen.getByText('Sesje')).toBeInTheDocument()

        expect(await screen.findByText('Panel główny')).toBeInTheDocument()
    })

    it('pokazuje statystyki na dashboardzie po wczytaniu danych', async () => {
        mockApi()

        render(<AdminPanel />)

        await screen.findByText('Panel główny')

        expect(screen.getByText('Administratorzy', { selector: '.ap-stat__label' }))
            .toBeInTheDocument()
        // liczba adminów (1) powinna się pojawić jako wartość statystyki
        await waitFor(() => {
            expect(screen.getAllByText('1').length).toBeGreaterThan(0)
        })
    })

    it('przełącza widok po kliknięciu w sidebarze na Administratorzy', async () => {
        mockApi()

        render(<AdminPanel />)
        await screen.findByText('Panel główny')

        fireEvent.click(screen.getByRole('button', { name: /Administratorzy/ }))

        expect(await screen.findByText('+ Dodaj admina')).toBeInTheDocument()
    })

    it('zwija i rozwija sidebar po kliknięciu przycisku toggle', async () => {
        mockApi()

        render(<AdminPanel />)
        await screen.findByText('Panel główny')

        const toggleBtn = screen.getByText('«')
        fireEvent.click(toggleBtn)

        expect(screen.getByText('»')).toBeInTheDocument()
    })

    it('wylogowuje i czyści localStorage po kliknięciu Wyloguj', async () => {
        mockApi()

        // mock window.location.href (jsdom nie obsługuje prawdziwej nawigacji)
        const originalLocation = window.location
        // @ts-expect-error - nadpisujemy tylko do testu
        delete window.location
        window.location = { ...originalLocation, href: '' } as any

        render(<AdminPanel />)
        await screen.findByText('Panel główny')

        fireEvent.click(screen.getByRole('button', { name: 'Wyloguj' }))

        expect(localStorage.getItem('token')).toBeNull()
        expect(localStorage.getItem('userId')).toBeNull()
        expect(window.location.href).toBe('/login')

        window.location = originalLocation
    })

    describe('Widok Administratorzy', () => {
        async function goToAdminsView() {
            render(<AdminPanel />)
            await screen.findByText('Panel główny')
            fireEvent.click(screen.getByRole('button', { name: /Administratorzy/ }))
            await screen.findByText('+ Dodaj admina')
        }

        it('renderuje listę administratorów w tabeli', async () => {
            mockApi()
            await goToAdminsView()

            expect(await screen.findByText('Jan Kowalski')).toBeInTheDocument()
            expect(screen.getByText('jan@test.com')).toBeInTheDocument()
        })

        it('pokazuje "Brak danych", gdy lista administratorów jest pusta', async () => {
            mockApi({ admins: [] })
            await goToAdminsView()

            expect(await screen.findByText('Brak danych')).toBeInTheDocument()
        })

        it('pokazuje błąd, gdy pobranie administratorów się nie powiedzie', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('') } as Response)
            ) as any

            render(<AdminPanel />)
            fireEvent.click(screen.getByRole('button', { name: /Administratorzy/ }))

            expect(await screen.findByText('Błąd ładowania administratorów.')).toBeInTheDocument()
        })

        it('otwiera modal dodawania nowego administratora', async () => {
            mockApi()
            await goToAdminsView()
            await screen.findByText('Jan Kowalski')

            fireEvent.click(screen.getByRole('button', { name: '+ Dodaj admina' }))

            expect(screen.getByText('Nowy administrator')).toBeInTheDocument()
            expect(screen.getByText('Imię i nazwisko *')).toBeInTheDocument()
            expect(screen.getByText('Hasło *')).toBeInTheDocument()
        })

        it('zamyka modal po kliknięciu Anuluj', async () => {
            mockApi()
            await goToAdminsView()
            await screen.findByText('Jan Kowalski')

            fireEvent.click(screen.getByRole('button', { name: '+ Dodaj admina' }))
            expect(screen.getByText('Nowy administrator')).toBeInTheDocument()

            fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))

            expect(screen.queryByText('Nowy administrator')).not.toBeInTheDocument()
        })

        it('otwiera modal edycji z wypełnionymi danymi administratora', async () => {
            mockApi()
            await goToAdminsView()
            await screen.findByText('Jan Kowalski')

            fireEvent.click(screen.getByRole('button', { name: 'Edytuj' }))

            expect(screen.getByText('Edytuj administratora')).toBeInTheDocument()
            // w trybie edycji nie ma pola Hasło
            expect(screen.queryByText('Hasło *')).not.toBeInTheDocument()
        })

        it('zapisuje nowego administratora i odświeża listę', async () => {
            mockApi()
            await goToAdminsView()
            await screen.findByText('Jan Kowalski')

            fireEvent.click(screen.getByRole('button', { name: '+ Dodaj admina' }))

            const nameInput = screen.getAllByRole('textbox')[0]
            fireEvent.change(nameInput, { target: { value: 'Nowy Admin' } })

            fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

            await waitFor(() => {
                expect(screen.queryByText('Nowy administrator')).not.toBeInTheDocument()
            })

            // Sprawdzamy, że POST został wywołany na /Admins
            const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
                (c) => c[1]?.method === 'POST' && c[0].includes('/Admins')
            )
            expect(postCall).toBeDefined()
        })

        it('usuwa administratora po potwierdzeniu', async () => {
            mockApi()
            await goToAdminsView()
            await screen.findByText('Jan Kowalski')

            fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))

            await waitFor(() => {
                const deleteCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
                    (c) => c[1]?.method === 'DELETE'
                )
                expect(deleteCall).toBeDefined()
            })
        })

        it('nie usuwa administratora, gdy użytkownik odwoła potwierdzenie', async () => {
            mockApi()
            global.window.confirm = vi.fn(() => false)
            await goToAdminsView()
            await screen.findByText('Jan Kowalski')

            fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))

            const deleteCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
                (c) => c[1]?.method === 'DELETE'
            )
            expect(deleteCall).toBeUndefined()
        })
    })

    describe('Widok Sesje', () => {
        it('renderuje listę sesji', async () => {
            mockApi()

            render(<AdminPanel />)
            await screen.findByText('Panel główny')

            fireEvent.click(screen.getByRole('button', { name: /Sesje/ }))

            expect(await screen.findByText('jan@test.com')).toBeInTheDocument()
            expect(screen.getByText('127.0.0.1')).toBeInTheDocument()
        })

        it('otwiera modal nowej sesji', async () => {
            mockApi()

            render(<AdminPanel />)
            await screen.findByText('Panel główny')
            fireEvent.click(screen.getByRole('button', { name: /Sesje/ }))
            await screen.findByText('jan@test.com')

            fireEvent.click(screen.getByRole('button', { name: '+ Nowa sesja' }))

            expect(screen.getByText('Nowa sesja')).toBeInTheDocument()
            expect(screen.getByText('Admin ID *')).toBeInTheDocument()
        })
    })

    describe('Widok Logi audytu', () => {
        it('renderuje listę logów audytu', async () => {
            mockApi()

            render(<AdminPanel />)
            await screen.findByText('Panel główny')

            fireEvent.click(screen.getByRole('button', { name: /Logi audytu/ }))

            expect(await screen.findByText('LOGIN')).toBeInTheDocument()
        })
    })

    describe('Widok Uprawnienia', () => {
        it('renderuje listę uprawnień', async () => {
            mockApi()

            render(<AdminPanel />)
            await screen.findByText('Panel główny')

            fireEvent.click(screen.getByRole('button', { name: /Uprawnienia/ }))

            expect(await screen.findByText('manage_users')).toBeInTheDocument()
        })

        it('otwiera modal dodawania uprawnienia', async () => {
            mockApi()

            render(<AdminPanel />)
            await screen.findByText('Panel główny')
            fireEvent.click(screen.getByRole('button', { name: /Uprawnienia/ }))
            await screen.findByText('manage_users')

            fireEvent.click(screen.getByRole('button', { name: '+ Dodaj uprawnienie' }))

            expect(screen.getByText('Nowe uprawnienie')).toBeInTheDocument()
        })
    })

    describe('Widok Role & Uprawnienia', () => {
        it('renderuje listę przypisań ról do uprawnień', async () => {
            mockApi()

            render(<AdminPanel />)
            await screen.findByText('Panel główny')

            fireEvent.click(screen.getByRole('button', { name: /Role & Uprawnienia/ }))

            expect(await screen.findByText('manage_users')).toBeInTheDocument()
        })

        it('otwiera modal przypisania uprawnienia', async () => {
            mockApi()

            render(<AdminPanel />)
            await screen.findByText('Panel główny')
            fireEvent.click(screen.getByRole('button', { name: /Role & Uprawnienia/ }))
            await screen.findByText('manage_users')

            fireEvent.click(screen.getByRole('button', { name: '+ Przypisz uprawnienie' }))

            expect(screen.getByText('Przypisz uprawnienie do roli')).toBeInTheDocument()
        })
    })
})