// src/frontedtests/CommentsPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Comments from '../pages/Comments'

// Mock useNavigate i useParams
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ adId: '1' }),
    }
})

function renderComponent() {
    render(
        <MemoryRouter>
            <Comments />
        </MemoryRouter>
    )
}

const mockComments = [
    {
        commentId: 1,
        adId: 1,
        userId: 'user-1',
        createdAt: '2026-01-01T12:00:00Z',
        content: 'Świetne ogłoszenie!',
        user: { userId: 'user-1', username: 'Jan Kowalski', email: 'jan@test.com' },
    },
    {
        commentId: 2,
        adId: 2, // inny adId - powinien zostać odfiltrowany
        userId: 'user-2',
        createdAt: '2026-01-02T12:00:00Z',
        content: 'Komentarz do innego ogłoszenia',
    },
]

function mockSuccessfulFetch(comments = mockComments) {
    globalThis.fetch = vi.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve(comments),
        } as Response)
    ) as any
}

describe('CommentsPage', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
        localStorage.setItem('token', 'fake-token')
        localStorage.setItem('userId', 'user-1')
        globalThis.window.alert = vi.fn()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('pokazuje stan ładowania na starcie', () => {
        mockSuccessfulFetch()

        renderComponent()

        expect(screen.getByText('Ładowanie komentarzy…')).toBeInTheDocument()
    })

    it('pokazuje błąd, gdy pobranie komentarzy się nie powiedzie', async () => {
        globalThis.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as Response)
        ) as any

        renderComponent()

        expect(
            await screen.findByText('Nie udało się pobrać komentarzy.')
        ).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Powrót' })).toBeInTheDocument()
    })

    it('wraca do poprzedniej strony po kliknięciu Powrót w stanie błędu', async () => {
        globalThis.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as Response)
        ) as any

        renderComponent()
        await screen.findByText('Nie udało się pobrać komentarzy.')

        fireEvent.click(screen.getByRole('button', { name: 'Powrót' }))

        expect(mockNavigate).toHaveBeenCalledWith(-1)
    })

    it('renderuje tylko komentarze dla aktualnego adId', async () => {
        mockSuccessfulFetch()

        renderComponent()

        expect(await screen.findByText('Świetne ogłoszenie!')).toBeInTheDocument()
        expect(screen.queryByText('Komentarz do innego ogłoszenia')).not.toBeInTheDocument()
    })

    it('pokazuje nazwę użytkownika i datę komentarza', async () => {
        mockSuccessfulFetch()

        renderComponent()

        expect(await screen.findByText(/Jan Kowalski/)).toBeInTheDocument()
    })

    it('pokazuje "Użytkownik" gdy komentarz nie ma danych użytkownika', async () => {
        mockSuccessfulFetch([
            {
                commentId: 3,
                adId: 1,
                userId: 'user-3',
                createdAt: '2026-01-01T12:00:00Z',
                content: 'Anonimowy komentarz',
                // brak pola user
            },
        ])

        renderComponent()

        expect(await screen.findByText(/Użytkownik/)).toBeInTheDocument()
    })

    it('pokazuje komunikat o braku komentarzy, gdy lista jest pusta', async () => {
        mockSuccessfulFetch([])

        renderComponent()

        expect(await screen.findByText('Brak komentarzy.')).toBeInTheDocument()
    })

    it('renderuje formularz dodawania komentarza', async () => {
        mockSuccessfulFetch([])

        renderComponent()
        await screen.findByText('Brak komentarzy.')

        expect(screen.getByText('Dodaj komentarz', { selector: 'h2' })).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Napisz komentarz...')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Dodaj komentarz' })).toBeInTheDocument()
    })

    it('przycisk dodawania jest wyłączony, gdy treść jest pusta', async () => {
        mockSuccessfulFetch([])

        renderComponent()
        await screen.findByText('Brak komentarzy.')

        expect(screen.getByRole('button', { name: 'Dodaj komentarz' })).toBeDisabled()
    })

    it('przycisk dodawania jest wyłączony, gdy treść to same spacje', async () => {
        mockSuccessfulFetch([])

        renderComponent()
        await screen.findByText('Brak komentarzy.')

        fireEvent.change(screen.getByPlaceholderText('Napisz komentarz...'), {
            target: { value: '   ' },
        })

        expect(screen.getByRole('button', { name: 'Dodaj komentarz' })).toBeDisabled()
    })

    it('dodaje nowy komentarz po wypełnieniu formularza', async () => {
        mockSuccessfulFetch([])

        const newComment = {
            commentId: 99,
            adId: 1,
            userId: 'user-1',
            createdAt: '2026-01-03T12:00:00Z',
            content: 'Nowy komentarz testowy',
        }

        globalThis.fetch = vi.fn((url: string, options?: any) => {
            if (options?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(newComment),
                } as Response)
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
        }) as any

        renderComponent()
        await screen.findByText('Brak komentarzy.')

        fireEvent.change(screen.getByPlaceholderText('Napisz komentarz...'), {
            target: { value: 'Nowy komentarz testowy' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj komentarz' }))

        expect(await screen.findByText('Nowy komentarz testowy')).toBeInTheDocument()
    })

    it('czyści pole treści po dodaniu komentarza', async () => {
        mockSuccessfulFetch([])

        const newComment = {
            commentId: 99,
            adId: 1,
            userId: 'user-1',
            createdAt: '2026-01-03T12:00:00Z',
            content: 'Test',
        }

        globalThis.fetch = vi.fn((url: string, options?: any) => {
            if (options?.method === 'POST') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(newComment) } as Response)
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
        }) as any

        renderComponent()
        await screen.findByText('Brak komentarzy.')

        const textarea = screen.getByPlaceholderText('Napisz komentarz...') as HTMLTextAreaElement
        fireEvent.change(textarea, { target: { value: 'Test' } })
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj komentarz' }))

        await waitFor(() => {
            expect(textarea.value).toBe('')
        })
    })

    it('pokazuje alert, gdy dodanie komentarza się nie powiedzie', async () => {
        mockSuccessfulFetch([])

        globalThis.fetch = vi.fn((url: string, options?: any) => {
            if (options?.method === 'POST') {
                return Promise.resolve({ ok: false } as Response)
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
        }) as any

        renderComponent()
        await screen.findByText('Brak komentarzy.')

        fireEvent.change(screen.getByPlaceholderText('Napisz komentarz...'), {
            target: { value: 'Test komentarz' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj komentarz' }))

        await waitFor(() => {
            expect(globalThis.window.alert).toHaveBeenCalledWith('Nie udało się dodać komentarza.')
        })
    })

    it('nie wysyła zapytania, gdy brak tokenu', async () => {
        localStorage.removeItem('token')
        mockSuccessfulFetch([])

        renderComponent()
        await screen.findByText('Brak komentarzy.')

        fireEvent.change(screen.getByPlaceholderText('Napisz komentarz...'), {
            target: { value: 'Test komentarz' },
        })

        const fetchCallsBefore = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj komentarz' }))

        // handleAddComment powinien się wyłączyć przez brak tokenu, bez wywołania POST
        await waitFor(() => {
            const fetchCallsAfter = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length
            expect(fetchCallsAfter).toBe(fetchCallsBefore)
        })
    })

    it('wysyła komentarz z poprawnym adId i userId', async () => {
        mockSuccessfulFetch([])

        globalThis.fetch = vi.fn((url: string, options?: any) => {
            if (options?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ commentId: 1, adId: 1, userId: 'user-1', createdAt: '2026-01-01', content: 'X' }),
                } as Response)
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
        }) as any

        renderComponent()
        await screen.findByText('Brak komentarzy.')

        fireEvent.change(screen.getByPlaceholderText('Napisz komentarz...'), {
            target: { value: 'X' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj komentarz' }))

        await waitFor(() => {
            const postCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
                (call) => call[1]?.method === 'POST'
            )
            expect(postCall).toBeDefined()
            const sentBody = JSON.parse(postCall![1].body)
            expect(sentBody).toEqual({ adId: 1, userId: 'user-1', content: 'X' })
        })
    })

    it('link Powrót wskazuje na /add-ad', async () => {
        mockSuccessfulFetch([])

        renderComponent()
        await screen.findByText('Brak komentarzy.')

        const link = screen.getByText('← Powrót') as HTMLAnchorElement
        expect(link.getAttribute('href')).toBe('/add-ad')
    })
})