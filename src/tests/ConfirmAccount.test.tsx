import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ConfirmAccount from '../pages/ConfirmAccount'
import { confirmAccount } from '../api/authService'

// Mock API
vi.mock('../api/authService', () => ({
    confirmAccount: vi.fn(),
}))

const mockNavigate = vi.fn()

// Mock react-router-dom: useNavigate stałe, useSearchParams kontrolowane zmienną
let mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [mockSearchParams],
    }
})

function renderComponent() {
    render(
        <MemoryRouter>
            <ConfirmAccount />
        </MemoryRouter>
    )
}

describe('ConfirmAccount', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSearchParams = new URLSearchParams()
    })

    it('pokazuje status "pending" na starcie', () => {
        mockSearchParams = new URLSearchParams({ userId: '123', token: 'abc' })
        ;(confirmAccount as ReturnType<typeof vi.fn>).mockImplementation(
            () => new Promise(() => {}) // nigdy się nie rozwiązuje - zostajemy w pending
        )

        renderComponent()

        expect(screen.getByText('Trwa weryfikacja...')).toBeInTheDocument()
    })

    it('pokazuje błąd, gdy brak parametru userId', async () => {
        mockSearchParams = new URLSearchParams({ token: 'abc' }) // brak userId

        renderComponent()

        expect(await screen.findByText(/Weryfikacja nie powiodła się/)).toBeInTheDocument()
        expect(confirmAccount).not.toHaveBeenCalled()
    })

    it('pokazuje błąd, gdy brak parametru token', async () => {
        mockSearchParams = new URLSearchParams({ userId: '123' }) // brak token

        renderComponent()

        expect(await screen.findByText(/Weryfikacja nie powiodła się/)).toBeInTheDocument()
        expect(confirmAccount).not.toHaveBeenCalled()
    })

    it('pokazuje błąd, gdy brak obu parametrów', async () => {
        mockSearchParams = new URLSearchParams() // brak userId i token

        renderComponent()

        expect(await screen.findByText(/Weryfikacja nie powiodła się/)).toBeInTheDocument()
        expect(confirmAccount).not.toHaveBeenCalled()
    })

    it('pokazuje sukces, gdy confirmAccount się powiedzie', async () => {
        mockSearchParams = new URLSearchParams({ userId: '123', token: 'abc' })
        ;(confirmAccount as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        renderComponent()

        expect(await screen.findByText('Konto zostało potwierdzone!')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Przejdź do logowania' })).toBeInTheDocument()
    })

    it('wywołuje confirmAccount z poprawnymi parametrami', async () => {
        mockSearchParams = new URLSearchParams({ userId: '123', token: 'abc' })
        ;(confirmAccount as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        renderComponent()

        await waitFor(() => {
            expect(confirmAccount).toHaveBeenCalledWith('123', 'abc')
        })
    })

    it('pokazuje błąd, gdy confirmAccount zwróci wyjątek', async () => {
        mockSearchParams = new URLSearchParams({ userId: '123', token: 'abc' })
        ;(confirmAccount as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('expired'))

        renderComponent()

        expect(await screen.findByText(/Weryfikacja nie powiodła się/)).toBeInTheDocument()
        expect(screen.queryByText('Konto zostało potwierdzone!')).not.toBeInTheDocument()
    })

    it('przechodzi do /login po kliknięciu przycisku po sukcesie', async () => {
        mockSearchParams = new URLSearchParams({ userId: '123', token: 'abc' })
        ;(confirmAccount as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        renderComponent()

        const button = await screen.findByRole('button', { name: 'Przejdź do logowania' })
        fireEvent.click(button)

        expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('nie pokazuje przycisku logowania w stanie error', async () => {
        mockSearchParams = new URLSearchParams() // brak parametrów -> error

        renderComponent()

        await screen.findByText(/Weryfikacja nie powiodła się/)
        expect(screen.queryByRole('button', { name: 'Przejdź do logowania' })).not.toBeInTheDocument()
    })
})