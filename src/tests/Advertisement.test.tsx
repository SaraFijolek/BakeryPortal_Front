import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Advertisement from '../pages/Advertisement'

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
            <Advertisement />
        </MemoryRouter>
    )
}

const mockAds = [
    {
        adId: 1,
        userId: 'user-1',
        subcategoryId: 10,
        title: 'Rower górski',
        description: 'Sprzedam rower',
        price: 500,
        location: 'Warszawa',
        createdAt: '2026-01-01T00:00:00Z',
        status: 'active',
        user: { userId: 'user-1', name: 'Jan Kowalski', email: 'jan@test.com' },
        subcategory: { subcategoryId: 10, name: 'Sprzęt cukierniczy' },
    },
]

const mockSubcategories = [
    { subcategoryId: 10, name: 'Sprzęt cukierniczy' },
    { subcategoryId: 11, name: 'Praca' },
]

// Helper: ustawia fetch tak, by zwracał dane dla Ads/Subcategories/AdMedia
function mockSuccessfulFetch(ads = mockAds, subs = mockSubcategories, media: any[] = []) {
    global.fetch = vi.fn((url: string) => {
        if (url.includes('/Ads') && !url.includes('/AdMedia')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(ads),
            } as Response)
        }
        if (url.includes('/Subcategories')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(subs),
            } as Response)
        }
        if (url.includes('/AdMedia')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(media),
            } as Response)
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as Response)
    }) as any
}

describe('Advertisement', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
        // domyślnie zalogowany użytkownik
        localStorage.setItem('token', 'fake-token')
        localStorage.setItem('userId', 'user-1')
        // jsdom nie ma URL.createObjectURL / revokeObjectURL
        global.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
        global.URL.revokeObjectURL = vi.fn()
        global.window.confirm = vi.fn(() => true)
        global.window.alert = vi.fn()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('przekierowuje do /login, gdy brak tokenu', () => {
        localStorage.clear()
        mockSuccessfulFetch()

        renderComponent()

        expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('pokazuje stan ładowania na starcie', () => {
        mockSuccessfulFetch()

        renderComponent()

        expect(screen.getByText('Ładowanie ogłoszeń…')).toBeInTheDocument()
    })

    it('pokazuje błąd, gdy pobranie ogłoszeń się nie powiedzie', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as Response)
        ) as any

        renderComponent()

        expect(
            await screen.findByText('Nie udało się pobrać ogłoszeń.')
        ).toBeInTheDocument()
        expect(screen.getByText('Wróć do strony głównej')).toBeInTheDocument()
    })

    it('renderuje listę ogłoszeń po pobraniu danych', async () => {
        mockSuccessfulFetch()

        renderComponent()

        expect(await screen.findByText('Rower górski')).toBeInTheDocument()
        expect(screen.getByText('Sprzedam rower')).toBeInTheDocument()
        expect(screen.getByText('500 zł')).toBeInTheDocument()
        expect(screen.getByText('📍 Warszawa')).toBeInTheDocument()
    })

    it('pokazuje komunikat o braku ogłoszeń, gdy lista jest pusta', async () => {
        mockSuccessfulFetch([])

        renderComponent()

        expect(await screen.findByText('Brak ogłoszeń. Dodaj pierwsze!')).toBeInTheDocument()
    })

    it('otwiera formularz dodawania ogłoszenia po kliknięciu "+ Dodaj ogłoszenie"', async () => {
        mockSuccessfulFetch([])

        renderComponent()
        await screen.findByText('Brak ogłoszeń. Dodaj pierwsze!')

        fireEvent.click(screen.getByRole('button', { name: '+ Dodaj ogłoszenie' }))

        expect(screen.getByText('Dodaj ogłoszenie', { selector: 'h2' })).toBeInTheDocument()
        expect(screen.getByLabelText('Tytuł *')).toBeInTheDocument()
    })

    it('przycisk Zapisz jest wyłączony, gdy brak tytułu', async () => {
        mockSuccessfulFetch([])

        renderComponent()
        await screen.findByText('Brak ogłoszeń. Dodaj pierwsze!')
        fireEvent.click(screen.getByRole('button', { name: '+ Dodaj ogłoszenie' }))

        const saveButton = screen.getByRole('button', { name: 'Zapisz' })
        expect(saveButton).toBeDisabled()
    })

    it('zamyka formularz po kliknięciu Anuluj', async () => {
        mockSuccessfulFetch([])

        renderComponent()
        await screen.findByText('Brak ogłoszeń. Dodaj pierwsze!')
        fireEvent.click(screen.getByRole('button', { name: '+ Dodaj ogłoszenie' }))

        expect(screen.getByLabelText('Tytuł *')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))

        expect(screen.queryByLabelText('Tytuł *')).not.toBeInTheDocument()
    })

    it('zapisuje nowe ogłoszenie po wypełnieniu formularza', async () => {
        mockSuccessfulFetch([])

        const createdAd = {
            adId: 99,
            userId: 'user-1',
            subcategoryId: 10,
            title: 'Nowe ogłoszenie',
            createdAt: '2026-01-01T00:00:00Z',
            status: 'active',
        }

        // Po początkowym mocku (lista pusta), nadpisujemy fetch by obsłużył POST
        global.fetch = vi.fn((url: string, options?: any) => {
            if (url.includes('/Ads') && !options) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
            }
            if (url.includes('/Subcategories')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSubcategories) } as Response)
            }
            if (url.includes('/AdMedia') && !options) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
            }
            if (url.includes('/Ads') && options?.method === 'POST') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(createdAd) } as Response)
            }
            return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as Response)
        }) as any

        renderComponent()
        await screen.findByText('Brak ogłoszeń. Dodaj pierwsze!')

        fireEvent.click(screen.getByRole('button', { name: '+ Dodaj ogłoszenie' }))

        fireEvent.change(screen.getByLabelText('Tytuł *'), { target: { value: 'Nowe ogłoszenie' } })
        fireEvent.change(screen.getByLabelText('Podkategoria *'), { target: { value: '10' } })

        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

        expect(await screen.findByText('Ogłoszenie zostało zapisane!')).toBeInTheDocument()
        expect(await screen.findByText('Nowe ogłoszenie')).toBeInTheDocument()
    })

    it('pokazuje błąd, gdy zapis ogłoszenia się nie powiedzie', async () => {
        mockSuccessfulFetch([])

        global.fetch = vi.fn((url: string, options?: any) => {
            if (url.includes('/Subcategories')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSubcategories) } as Response)
            }
            if (url.includes('/AdMedia') && !options) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
            }
            if (url.includes('/Ads') && options?.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    status: 400,
                    json: () => Promise.resolve({ message: 'Błąd walidacji' }),
                } as Response)
            }
            if (url.includes('/Ads')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
            }
            return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as Response)
        }) as any

        renderComponent()
        await screen.findByText('Brak ogłoszeń. Dodaj pierwsze!')

        fireEvent.click(screen.getByRole('button', { name: '+ Dodaj ogłoszenie' }))
        fireEvent.change(screen.getByLabelText('Tytuł *'), { target: { value: 'Test' } })
        fireEvent.change(screen.getByLabelText('Podkategoria *'), { target: { value: '10' } })
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

        expect(await screen.findByText('Błąd walidacji')).toBeInTheDocument()
    })

    it('otwiera formularz edycji z wypełnionymi danymi', async () => {
        mockSuccessfulFetch()

        renderComponent()
        await screen.findByText('Rower górski')

        fireEvent.click(screen.getByRole('button', { name: 'Edytuj' }))

        expect(screen.getByText('Edytuj ogłoszenie', { selector: 'h2' })).toBeInTheDocument()
        expect((screen.getByLabelText('Tytuł *') as HTMLInputElement).value).toBe('Rower górski')
    })

    it('usuwa ogłoszenie po potwierdzeniu', async () => {
        mockSuccessfulFetch()

        global.fetch = vi.fn((url: string, options?: any) => {
            if (url.includes('/Ads/1') && options?.method === 'DELETE') {
                return Promise.resolve({ ok: true } as Response)
            }
            if (url.includes('/Subcategories')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSubcategories) } as Response)
            }
            if (url.includes('/AdMedia')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
            }
            if (url.includes('/Ads')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAds) } as Response)
            }
            return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as Response)
        }) as any

        renderComponent()
        await screen.findByText('Rower górski')

        fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))

        await waitFor(() => {
            expect(screen.queryByText('Rower górski')).not.toBeInTheDocument()
        })
    })

    it('nie usuwa ogłoszenia, gdy użytkownik odwoła potwierdzenie', async () => {
        mockSuccessfulFetch()
        global.window.confirm = vi.fn(() => false)

        renderComponent()
        await screen.findByText('Rower górski')

        fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))

        expect(screen.getByText('Rower górski')).toBeInTheDocument()
    })

    it('pokazuje alert, gdy usuwanie ogłoszenia się nie powiedzie', async () => {
        mockSuccessfulFetch()

        global.fetch = vi.fn((url: string, options?: any) => {
            if (url.includes('/Ads/1') && options?.method === 'DELETE') {
                return Promise.resolve({ ok: false } as Response)
            }
            if (url.includes('/Subcategories')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSubcategories) } as Response)
            }
            if (url.includes('/AdMedia')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
            }
            if (url.includes('/Ads')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAds) } as Response)
            }
            return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as Response)
        }) as any

        renderComponent()
        await screen.findByText('Rower górski')

        fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))

        await waitFor(() => {
            expect(global.window.alert).toHaveBeenCalledWith('Nie udało się usunąć ogłoszenia.')
        })
    })

    it('otwiera i zamyka galerię zdjęć po kliknięciu "Zdjęcia"', async () => {
        mockSuccessfulFetch(mockAds, mockSubcategories, [
            { mediaId: 1, adId: 1, url: 'http://test/img.jpg', mediaType: 'image' },
        ])

        renderComponent()
        await screen.findByText('Rower górski')

        const galleryButton = screen.getByRole('button', { name: /Zdjęcia/ })
        fireEvent.click(galleryButton)

        expect(await screen.findByText('Brak plików.')).not.toBeInTheDocument()
        expect(screen.getByAltText('Zdjęcie #1')).toBeInTheDocument()

        fireEvent.click(galleryButton)
        expect(screen.queryByAltText('Zdjęcie #1')).not.toBeInTheDocument()
    })

    it('pokazuje błąd przy wyborze nieobsługiwanego typu pliku w formularzu', async () => {
        mockSuccessfulFetch([])

        renderComponent()
        await screen.findByText('Brak ogłoszeń. Dodaj pierwsze!')
        fireEvent.click(screen.getByRole('button', { name: '+ Dodaj ogłoszenie' }))

        const fileInput = screen.getByLabelText('+ Dodaj pliki').querySelector(
            'input[type="file"]'
        ) as HTMLInputElement

        const badFile = new File(['content'], 'test.txt', { type: 'text/plain' })
        fireEvent.change(fileInput, { target: { files: [badFile] } })

        expect(
            await screen.findByText('Nieobsługiwany typ pliku. Dozwolone: JPG, PNG, MP4, MOV.')
        ).toBeInTheDocument()
    })

    it('nawiguje do /comments/ po kliknięciu Komentarze', async () => {
        mockSuccessfulFetch()

        renderComponent()
        await screen.findByText('Rower górski')

        fireEvent.click(screen.getByRole('button', { name: /Komentarze/ }))

        expect(mockNavigate).toHaveBeenCalledWith('/comments/')
    })

    it('nawiguje do /message/ po kliknięciu Wiadomość', async () => {
        mockSuccessfulFetch()

        renderComponent()
        await screen.findByText('Rower górski')

        fireEvent.click(screen.getByRole('button', { name: /Wiadomość/ }))

        expect(mockNavigate).toHaveBeenCalledWith('/message/')
    })
})