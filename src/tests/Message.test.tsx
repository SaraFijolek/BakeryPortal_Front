// src/frontedtests/MessagesPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Message from '../pages/Message'

// Mock useNavigate i useParams
const mockNavigate = vi.fn()
let mockReceiverId: string | undefined = 'receiver-1'

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ receiverId: mockReceiverId }),
    }
})

function renderComponent() {
    render(
        <MemoryRouter>
            <Message />
        </MemoryRouter>
    )
}

describe('MessagesPage', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
        localStorage.setItem('token', 'fake-token')
        localStorage.setItem('userId', 'sender-1')
        mockReceiverId = 'receiver-1'
        globalThis.window.alert = vi.fn()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renderuje formularz wiadomości', () => {
        renderComponent()

        expect(screen.getByText('Wiadomość', { selector: 'h1' })).toBeInTheDocument()
        expect(screen.getByText('Napisz wiadomość', { selector: 'h2' })).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Napisz wiadomość...')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Wyślij wiadomość' })).toBeInTheDocument()
    })

    it('link Powrót wskazuje na /add-ad', () => {
        renderComponent()

        const link = screen.getByText('← Powrót') as HTMLAnchorElement
        expect(link.getAttribute('href')).toBe('/add-ad')
    })

    it('pozwala wpisać treść wiadomości', () => {
        renderComponent()

        const textarea = screen.getByPlaceholderText('Napisz wiadomość...') as HTMLTextAreaElement
        fireEvent.change(textarea, { target: { value: 'Witam, jestem zainteresowany' } })

        expect(textarea.value).toBe('Witam, jestem zainteresowany')
    })

    it('przycisk wysyłania jest wyłączony, gdy treść jest pusta', () => {
        renderComponent()

        expect(screen.getByRole('button', { name: 'Wyślij wiadomość' })).toBeDisabled()
    })

    it('przycisk wysyłania jest wyłączony, gdy treść to same spacje', () => {
        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Napisz wiadomość...'), {
            target: { value: '   ' },
        })

        expect(screen.getByRole('button', { name: 'Wyślij wiadomość' })).toBeDisabled()
    })

    it('przycisk wysyłania jest aktywny, gdy treść jest wypełniona', () => {
        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Napisz wiadomość...'), {
            target: { value: 'Treść wiadomości' },
        })

        expect(screen.getByRole('button', { name: 'Wyślij wiadomość' })).not.toBeDisabled()
    })

    it('wysyła wiadomość i przekierowuje do /ads po sukcesie', async () => {
        globalThis.fetch = vi.fn(() =>
            Promise.resolve({ ok: true } as Response)
        ) as any

        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Napisz wiadomość...'), {
            target: { value: 'Witam, jestem zainteresowany' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }))

        await waitFor(() => {
            expect(globalThis.window.alert).toHaveBeenCalledWith('Wiadomość została wysłana!')
        })

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/ads')
        })
    })

    it('wysyła zapytanie z poprawnym payloadem', async () => {
        globalThis.fetch = vi.fn(() =>
            Promise.resolve({ ok: true } as Response)
        ) as any

        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Napisz wiadomość...'), {
            target: { value: 'Testowa treść' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }))

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://localhost:7183/api/Messages',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer fake-token',
                    }),
                })
            )

            const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
            const sentBody = JSON.parse(callArgs[1].body)
            expect(sentBody).toEqual({
                senderId: 'sender-1',
                receiverId: 'receiver-1',
                content: 'Testowa treść',
            })
        })
    })

    it('czyści pole treści po wysłaniu wiadomości', async () => {
        globalThis.fetch = vi.fn(() =>
            Promise.resolve({ ok: true } as Response)
        ) as any

        renderComponent()

        const textarea = screen.getByPlaceholderText('Napisz wiadomość...') as HTMLTextAreaElement
        fireEvent.change(textarea, { target: { value: 'Testowa treść' } })
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }))

        await waitFor(() => {
            expect(textarea.value).toBe('')
        })
    })

    it('pokazuje alert i nie przekierowuje, gdy wysyłka się nie powiedzie', async () => {
        globalThis.fetch = vi.fn(() =>
            Promise.resolve({ ok: false } as Response)
        ) as any

        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Napisz wiadomość...'), {
            target: { value: 'Testowa treść' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }))

        await waitFor(() => {
            expect(globalThis.window.alert).toHaveBeenCalledWith('Nie udało się wysłać wiadomości.')
        })

        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('pokazuje przycisk "Wysyłanie..." w trakcie zapisu', async () => {
        let resolveFetch: (value: any) => void
        globalThis.fetch = vi.fn(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve
                })
        ) as any

        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Napisz wiadomość...'), {
            target: { value: 'Testowa treść' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }))

        expect(await screen.findByRole('button', { name: 'Wysyłanie...' })).toBeInTheDocument()

        // domykamy "wisiące" zapytanie, żeby nie zostawić niezamkniętego Promise
        resolveFetch!({ ok: true })
    })

    it('nie wysyła zapytania, gdy brak tokenu', () => {
        localStorage.removeItem('token')
        globalThis.fetch = vi.fn() as any

        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Napisz wiadomość...'), {
            target: { value: 'Testowa treść' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }))

        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('nie wysyła zapytania, gdy brak receiverId w URL', () => {
        mockReceiverId = undefined
        globalThis.fetch = vi.fn() as any

        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Napisz wiadomość...'), {
            target: { value: 'Testowa treść' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }))

        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('nie wysyła zapytania, gdy brak senderId (userId) w localStorage', () => {
        localStorage.removeItem('userId')
        globalThis.fetch = vi.fn() as any

        renderComponent()

        fireEvent.change(screen.getByPlaceholderText('Napisz wiadomość...'), {
            target: { value: 'Testowa treść' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }))

        expect(globalThis.fetch).not.toHaveBeenCalled()
    })
})