import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Register from "../pages/Register"
import { register } from "../api/authService"

vi.mock('../api/authService', () => ({
    register: vi.fn(),
}))

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
            <Register />
        </MemoryRouter>
    )
}

describe('Register', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renderuje formularz', () => {
        renderComponent()
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Zarejestruj' })).toBeInTheDocument()
    })

    it('błąd gdy hasła się różnią', async () => {
        renderComponent()
        fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'abc123' } })
        fireEvent.change(screen.getByPlaceholderText('Powtórz hasło'), { target: { value: 'xyz999' } })
        fireEvent.click(screen.getByRole('button', { name: 'Zarejestruj' }))

        expect(await screen.findByText('Hasła nie są takie same')).toBeInTheDocument()
        expect(register).not.toHaveBeenCalled()
    })

    it('sukces -> przekierowanie do /login', async () => {
        ;(register as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})
        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@a.com' } })
        fireEvent.change(screen.getByPlaceholderText('Nazwa użytkownika'), { target: { value: 'user' } })
        fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'pass123' } })
        fireEvent.change(screen.getByPlaceholderText('Powtórz hasło'), { target: { value: 'pass123' } })
        fireEvent.click(screen.getByRole('button', { name: 'Zarejestruj' }))

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'))
    })
})