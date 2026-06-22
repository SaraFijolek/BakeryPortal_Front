import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login2FA from '../pages/Login2FA'
import { login2FA } from '../api/authService'

// Mock API
vi.mock('../api/authService', () => ({
    login2FA: vi.fn(),
}))

// Mock useNavigate i useLocation
const mockNavigate = vi.fn()
let mockLocationState: { email?: string } | null = { email: 'test@test.com' }

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ state: mockLocationState }),
    }
})

function renderComponent() {
    render(
        <MemoryRouter>
            <Login2FA />
        </MemoryRouter>
    )
}

describe('Login2FA', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        mockLocationState = { email: 'test@test.com' }
    })

    it('renderuje formularz z emailem przekazanym w state', () => {
        renderComponent()

        expect(screen.getByText('Weryfikacja dwuetapowa')).toBeInTheDocument()
        expect(screen.getByText('test@test.com')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Kod 2FA')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Potwierdź' })).toBeInTheDocument()
    })

    it('wyświetla pusty email, gdy state nie zostało przekazane', () => {
        mockLocationState = null

        renderComponent()

        // sprawdzamy, że tekst "Kod został wysłany..." istnieje, ale bez konkretnego adresu
        expect(screen.getByText(/Kod został wysłany na adres/)).toBeInTheDocument()
    })

    it('pozwala wpisać kod 2FA', () => {
        renderComponent()

        const input = screen.getByPlaceholderText('Kod 2FA') as HTMLInputElement
        fireEvent.change(input, { target: { value: '123456' } })

        expect(input.value).toBe('123456')
    })

    it('pokazuje błąd, gdy kod jest nieprawidłowy', async () => {
        ;(login2FA as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('fail'))

        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Kod 2FA'), { target: { value: '000000' } })
        fireEvent.click(screen.getByRole('button', { name: 'Potwierdź' }))

        expect(await screen.findByText('Nieprawidłowy kod lub brak uprawnień')).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('zapisuje token i przekierowuje do / po sukcesie', async () => {
        ;(login2FA as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            access_token: 'fake-2fa-token',
        })

        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Kod 2FA'), { target: { value: '123456' } })
        fireEvent.click(screen.getByRole('button', { name: 'Potwierdź' }))

        await waitFor(() => {
            expect(localStorage.getItem('token')).toBe('fake-2fa-token')
        })

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/')
        })
    })

    it('wywołuje login2FA z poprawnym emailem i kodem', async () => {
        ;(login2FA as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            access_token: 'fake-token',
        })

        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Kod 2FA'), { target: { value: '999888' } })
        fireEvent.click(screen.getByRole('button', { name: 'Potwierdź' }))

        await waitFor(() => {
            expect(login2FA).toHaveBeenCalledWith('test@test.com', '999888')
        })
    })
})