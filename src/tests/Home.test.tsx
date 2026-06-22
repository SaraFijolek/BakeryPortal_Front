import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Home from '../pages/Home'

function renderComponent() {
    render(
        <MemoryRouter>
            <Home />
        </MemoryRouter>
    )
}

describe('Home', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renderuje tytuł strony', () => {
        renderComponent()
        expect(screen.getByText('Platforma ogłoszeń cukierniczych')).toBeInTheDocument()
    })

    it('renderuje sekcję wyszukiwania', () => {
        renderComponent()

        expect(screen.getByText('Wyszukaj ogłoszenia')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Szukaj...')).toBeInTheDocument()
        expect(screen.getByRole('combobox')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Szukaj' })).toBeInTheDocument()
    })

    it('renderuje opcje w select', () => {
        renderComponent()

        expect(screen.getByText('Kategoria')).toBeInTheDocument()
        expect(screen.getByText('Sprzęt cukierniczy')).toBeInTheDocument()
        expect(screen.getByText('Praca')).toBeInTheDocument()
        expect(screen.getByText('Szkolenia')).toBeInTheDocument()
    })

    it('renderuje sekcję najnowszych ogłoszeń', () => {
        renderComponent()

        expect(screen.getByText('Najnowsze ogłoszenia')).toBeInTheDocument()
        expect(screen.getByText('Brak ogłoszeń (API w kolejnym etapie)')).toBeInTheDocument()
    })

    describe('gdy użytkownik niezalogowany', () => {
        it('pokazuje linki Zaloguj i Zarejestruj', () => {
            renderComponent()

            expect(screen.getByText('Zaloguj')).toBeInTheDocument()
            expect(screen.getByText('Zarejestruj')).toBeInTheDocument()
        })

        it('nie pokazuje linków dla zalogowanych', () => {
            renderComponent()

            expect(screen.queryByText('Dodaj ogłoszenie')).not.toBeInTheDocument()
            expect(screen.queryByText('Moje konto')).not.toBeInTheDocument()
            expect(screen.queryByText('Wyloguj')).not.toBeInTheDocument()
        })

        it('link Zaloguj wskazuje na /login', () => {
            renderComponent()

            const link = screen.getByText('Zaloguj') as HTMLAnchorElement
            expect(link.getAttribute('href')).toBe('/login')
        })

        it('link Zarejestruj wskazuje na /register', () => {
            renderComponent()

            const link = screen.getByText('Zarejestruj') as HTMLAnchorElement
            expect(link.getAttribute('href')).toBe('/register')
        })
    })

    describe('gdy użytkownik zalogowany', () => {
        beforeEach(() => {
            localStorage.setItem('token', 'fake-token')
        })

        it('pokazuje linki Dodaj ogłoszenie, Moje konto i przycisk Wyloguj', () => {
            renderComponent()

            expect(screen.getByText('Dodaj ogłoszenie')).toBeInTheDocument()
            expect(screen.getByText('Moje konto')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Wyloguj' })).toBeInTheDocument()
        })

        it('nie pokazuje linków dla niezalogowanych', () => {
            renderComponent()

            expect(screen.queryByText('Zaloguj')).not.toBeInTheDocument()
            expect(screen.queryByText('Zarejestruj')).not.toBeInTheDocument()
        })

        it('link Dodaj ogłoszenie wskazuje na /add-ad', () => {
            renderComponent()

            const link = screen.getByText('Dodaj ogłoszenie') as HTMLAnchorElement
            expect(link.getAttribute('href')).toBe('/add-ad')
        })

        it('link Moje konto wskazuje na /profile', () => {
            renderComponent()

            const link = screen.getByText('Moje konto') as HTMLAnchorElement
            expect(link.getAttribute('href')).toBe('/profile')
        })

        it('usuwa token z localStorage po kliknięciu Wyloguj', () => {
            // mockujemy window.location.reload, bo jsdom nie implementuje prawdziwego przeładowania
            const reloadMock = vi.fn()
            Object.defineProperty(window, 'location', {
                value: { ...window.location, reload: reloadMock },
                writable: true,
            })

            renderComponent()
            fireEvent.click(screen.getByRole('button', { name: 'Wyloguj' }))

            expect(localStorage.getItem('token')).toBeNull()
        })

        it('wywołuje window.location.reload po kliknięciu Wyloguj', () => {
            const reloadMock = vi.fn()
            Object.defineProperty(window, 'location', {
                value: { ...window.location, reload: reloadMock },
                writable: true,
            })

            renderComponent()
            fireEvent.click(screen.getByRole('button', { name: 'Wyloguj' }))

            expect(reloadMock).toHaveBeenCalledTimes(1)
        })
    })
})