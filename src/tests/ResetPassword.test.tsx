import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ResetPassword from '../pages/ResetPassword'
import { resetPassword } from '../api/authService'

// Mock API
vi.mock('../api/authService', () => ({
    resetPassword: vi.fn(),
}))

// Mock useNavigate i useLocation
const mockNavigate = vi.fn()
let mockLocationState: { email?: string; token?: string } | null = {
    email: 'test@test.com',
    token: 'reset-token-123',
}

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
            <ResetPassword />
        </MemoryRouter>
    )
}

function fillForm(password: string, confirmPassword: string) {
    fireEvent.change(screen.getByPlaceholderText('Nowe hasło'), { target: { value: password } })
    fireEvent.change(screen.getByPlaceholderText('Powtórz nowe hasło'), { target: { value: confirmPassword } })
}

describe('ResetPassword', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockLocationState = { email: 'test@test.com', token: 'reset-token-123' }
    })

    it('renderuje formularz', () => {
        renderComponent()

        expect(screen.getByText('Nowe hasło')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Nowe hasło')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Powtórz nowe hasło')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Zmień hasło' })).toBeInTheDocument()
    })

    it('pozwala wpisywać hasła', () => {
        renderComponent()

        const newPasswordInput = screen.getByPlaceholderText('Nowe hasło') as HTMLInputElement
        const confirmInput = screen.getByPlaceholderText('Powtórz nowe hasło') as HTMLInputElement

        fillForm('abc12345', 'abc12345')

        expect(newPasswordInput.value).toBe('abc12345')
        expect(confirmInput.value).toBe('abc12345')
    })

    it('pokazuje błąd, gdy hasła się różnią', async () => {
        renderComponent()

        fillForm('abc12345', 'xyz99999')
        fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }))

        expect(await screen.findByText('Hasła nie są takie same')).toBeInTheDocument()
        expect(resetPassword).not.toHaveBeenCalled()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('wywołuje resetPassword z email, tokenem i nowym hasłem', async () => {
        ;(resetPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        renderComponent()
        fillForm('newpass123', 'newpass123')
        fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }))

        await waitFor(() => {
            expect(resetPassword).toHaveBeenCalledWith('test@test.com', 'reset-token-123', 'newpass123')
        })
    })

    it('przekierowuje do /login po sukcesie', async () => {
        ;(resetPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        renderComponent()
        fillForm('newpass123', 'newpass123')
        fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login')
        })
    })

    it('pokazuje błąd, gdy resetPassword zwróci wyjątek (np. token wygasł)', async () => {
        ;(resetPassword as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('expired'))

        renderComponent()
        fillForm('newpass123', 'newpass123')
        fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }))

        expect(
            await screen.findByText('Błąd resetowania hasła. Token mógł wygasnąć.')
        ).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('działa (nie wywala się) gdy state z location jest pusty', async () => {
        mockLocationState = null
        ;(resetPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        renderComponent()
        fillForm('newpass123', 'newpass123')
        fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }))

        await waitFor(() => {
            expect(resetPassword).toHaveBeenCalledWith(undefined, undefined, 'newpass123')
        })
    })
})