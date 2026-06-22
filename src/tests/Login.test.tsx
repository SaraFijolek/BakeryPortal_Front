
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from '../pages/Login'
import { login } from '../api/authService'
import { jwtDecode } from 'jwt-decode'

// Mock API logowania
vi.mock('../api/authService', () => ({
    login: vi.fn(),
}))

// Mock jwt-decode
vi.mock('jwt-decode', () => ({
    jwtDecode: vi.fn(),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

function renderComponent() {
    render(
        <MemoryRouter>
            <Login />
        </MemoryRouter>
    )
}

function fillForm(email: string, password: string) {
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: email } })
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: password } })
}

describe('Login', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
    })

    it('renderuje formularz logowania', () => {
        renderComponent()

        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Hasło')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Zaloguj' })).toBeInTheDocument()
        expect(screen.getByText('Zapomniałem hasła')).toBeInTheDocument()
    })

    it('nie pokazuje linku do 2FA domyślnie', () => {
        renderComponent()
        expect(screen.queryByText('Mam już kod 2FA')).not.toBeInTheDocument()
    })

    it('pokazuje błąd przy nieprawidłowych danych logowania', async () => {
        ;(login as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('fail'))

        renderComponent()
        fillForm('test@test.com', 'wrongpass')
        fireEvent.click(screen.getByRole('button', { name: 'Zaloguj' }))

        expect(await screen.findByText('Nieprawidłowy email lub hasło')).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('pokazuje link do 2FA, gdy backend wymaga drugiego czynnika', async () => {
        ;(login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ requires2FA: true })

        renderComponent()
        fillForm('test@test.com', 'pass123')
        fireEvent.click(screen.getByRole('button', { name: 'Zaloguj' }))

        expect(await screen.findByText('Mam już kod 2FA')).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('zapisuje token i userId w localStorage po sukcesie', async () => {
        ;(login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            access_token: 'fake-token',
            userId: 'user-123',
        })
        ;(jwtDecode as ReturnType<typeof vi.fn>).mockReturnValueOnce({ role: 'User' })

        renderComponent()
        fillForm('test@test.com', 'pass123')
        fireEvent.click(screen.getByRole('button', { name: 'Zaloguj' }))

        await waitFor(() => {
            expect(localStorage.getItem('token')).toBe('fake-token')
            expect(localStorage.getItem('userId')).toBe('user-123')
        })
    })

    it('przekierowuje do /admin gdy rola to Admin', async () => {
        ;(login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            access_token: 'fake-token',
            userId: 'user-123',
        })
        ;(jwtDecode as ReturnType<typeof vi.fn>).mockReturnValueOnce({ role: 'Admin' })

        renderComponent()
        fillForm('admin@test.com', 'pass123')
        fireEvent.click(screen.getByRole('button', { name: 'Zaloguj' }))

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'))
    })

    it('przekierowuje do /profile gdy rola to zwykły użytkownik', async () => {
        ;(login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            access_token: 'fake-token',
            userId: 'user-123',
        })
        ;(jwtDecode as ReturnType<typeof vi.fn>).mockReturnValueOnce({ role: 'User' })

        renderComponent()
        fillForm('test@test.com', 'pass123')
        fireEvent.click(screen.getByRole('button', { name: 'Zaloguj' }))

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/profile'))
    })

    it('nie zapisuje danych, gdy brak access_token w odpowiedzi', async () => {
        ;(login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        renderComponent()
        fillForm('test@test.com', 'pass123')
        fireEvent.click(screen.getByRole('button', { name: 'Zaloguj' }))

        await waitFor(() => {
            expect(localStorage.getItem('token')).toBeNull()
            expect(mockNavigate).not.toHaveBeenCalled()
        })
    })
})