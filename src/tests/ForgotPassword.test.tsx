import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ForgotPassword from '../pages/ForgotPassword'
import { forgotPassword } from '../api/authService'

// Mock API
vi.mock('../api/authService', () => ({
    forgotPassword: vi.fn(),
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
            <ForgotPassword />
        </MemoryRouter>
    )
}

function fillEmail(email: string) {
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: email } })
}

describe('ForgotPassword', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renderuje formularz', () => {
        renderComponent()

        expect(screen.getByText('Resetowanie hasła')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Wyślij link resetujący' })).toBeInTheDocument()
    })

    it('pozwala wpisać email', () => {
        renderComponent()

        const input = screen.getByPlaceholderText('Email') as HTMLInputElement
        fillEmail('test@test.com')

        expect(input.value).toBe('test@test.com')
    })

    it('pokazuje komunikat ogólny, gdy backend nie zwraca tokenu (konto nie istnieje)', async () => {
        ;(forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        renderComponent()
        fillEmail('nieistnieje@test.com')
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij link resetujący' }))

        expect(
            await screen.findByText('Jeśli konto istnieje, wysłaliśmy link resetujący.')
        ).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('przekierowuje do /reset-password, gdy backend zwróci token i userId', async () => {
        ;(forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            token: 'reset-token-123',
            userId: 'user-1',
        })

        renderComponent()
        fillEmail('test@test.com')
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij link resetujący' }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/reset-password', {
                state: { email: 'test@test.com', token: 'reset-token-123' },
            })
        })
    })

    it('nie przekierowuje, gdy backend zwróci tylko token bez userId', async () => {
        ;(forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            token: 'reset-token-123',
            // brak userId
        })

        renderComponent()
        fillEmail('test@test.com')
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij link resetujący' }))

        expect(
            await screen.findByText('Jeśli konto istnieje, wysłaliśmy link resetujący.')
        ).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('pokazuje błąd, gdy forgotPassword zwróci wyjątek', async () => {
        ;(forgotPassword as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network error'))

        renderComponent()
        fillEmail('test@test.com')
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij link resetujący' }))

        expect(await screen.findByText('Wystąpił błąd. Spróbuj ponownie.')).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('wywołuje forgotPassword z poprawnym emailem', async () => {
        ;(forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        renderComponent()
        fillEmail('test@test.com')
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij link resetujący' }))

        await waitFor(() => {
            expect(forgotPassword).toHaveBeenCalledWith('test@test.com')
        })
    })

    it('nie pokazuje jednocześnie message i error', async () => {
        ;(forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        renderComponent()
        fillEmail('test@test.com')
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij link resetujący' }))

        await screen.findByText('Jeśli konto istnieje, wysłaliśmy link resetujący.')
        expect(screen.queryByText('Wystąpił błąd. Spróbuj ponownie.')).not.toBeInTheDocument()
    })
})