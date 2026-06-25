import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import RatingsManager from '../pages/Ratingsmanager'
import type { RatingDto } from '../pages/Ratingsmanager'

const mockRatings: RatingDto[] = [
    {
        ratingId: 1,
        fromUserId: 'user-1',
        toUserId: 'user-2',
        score: 4,
        createdAt: '2026-01-10T00:00:00Z',
        fromUserName: 'Alice',
        toUserName: 'Bob',
    },
    {
        ratingId: 2,
        fromUserId: 'user-3',
        toUserId: 'user-4',
        score: 5,
        createdAt: '2026-02-15T00:00:00Z',
        fromUserName: 'Carol',
        toUserName: 'Dave',
    },
]

function jsonResponse(body: unknown, ok = true, status = 200) {
    return Promise.resolve({
        ok,
        status,
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)
}

function renderComponent() {
    render(<RatingsManager />)
}

// ====== Setup ======

describe('RatingsManager', () => {
    beforeEach(() => {
        global.fetch = vi.fn()
        localStorage.clear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('pokazuje stan ładowania, a następnie listę ocen', async () => {
        ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(mockRatings))

        renderComponent()

        expect(screen.getByText(/loading ratings/i)).toBeInTheDocument()

        await waitFor(() =>
            expect(screen.queryByText(/loading ratings/i)).not.toBeInTheDocument()
        )

        expect(screen.getByText('Alice')).toBeInTheDocument()
        expect(screen.getByText('Bob')).toBeInTheDocument()
        expect(screen.getByText('Carol')).toBeInTheDocument()
        expect(screen.getByText('Dave')).toBeInTheDocument()
        expect(screen.getByText('2 ratings recorded')).toBeInTheDocument()

        expect(global.fetch).toHaveBeenCalledWith(
            '/api/Ratings',
            expect.objectContaining({ headers: expect.any(Object) })
        )
    })

    it('pokazuje stan pusty, gdy nie ma ocen', async () => {
        ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse([]))

        renderComponent()

        await waitFor(() =>
            expect(
                screen.getByText(/no ratings yet\. create the first one above/i)
            ).toBeInTheDocument()
        )
        expect(screen.getByText('0 ratings recorded')).toBeInTheDocument()
    })

    it('pokazuje komunikat błędu, gdy ładowanie listy się nie powiedzie', async () => {
        ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            jsonResponse(
                { success: false, message: 'Failed to retrieve ratings', errors: ['boom'] },
                false,
                500
            )
        )

        renderComponent()

        await waitFor(() =>
            expect(screen.getByText(/failed to retrieve ratings/i)).toBeInTheDocument()
        )
    })

    describe('tworzenie oceny', () => {
        it('otwiera formularz, zapisuje nową ocenę i odświeża listę', async () => {
            const user = userEvent.setup()

            ;(global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce(jsonResponse([])) // initial load
                .mockResolvedValueOnce(jsonResponse(mockRatings[0])) // create
                .mockResolvedValueOnce(jsonResponse([mockRatings[0]])) // reload after create

            renderComponent()

            await waitFor(() => expect(screen.getByText(/no ratings yet/i)).toBeInTheDocument())

            await user.click(screen.getByRole('button', { name: /new rating/i }))

            expect(screen.getByText(/new rating/i, { selector: 'h2' })).toBeInTheDocument()

            await user.type(screen.getByLabelText(/from user id/i), 'user-1')
            await user.type(screen.getByLabelText(/to user id/i), 'user-2')

            const scoreInput = screen.getByLabelText(/score/i)
            await user.clear(scoreInput)
            await user.type(scoreInput, '4')

            await user.click(screen.getByRole('button', { name: /save/i }))

            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

            const createCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1]
            expect(createCall[0]).toBe('/api/Ratings')
            expect(createCall[1].method).toBe('POST')
            expect(JSON.parse(createCall[1].body)).toEqual({
                fromUserId: 'user-1',
                toUserId: 'user-2',
                score: 4,
            })

            // formularz zamyka się po udanym zapisie
            expect(screen.queryByText(/new rating/i, { selector: 'h2' })).not.toBeInTheDocument()
        })

        it('pokazuje błąd formularza i nie zamyka go, gdy zapis się nie powiedzie', async () => {
            const user = userEvent.setup()

            ;(global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce(jsonResponse([])) // initial load
                .mockResolvedValueOnce(
                    jsonResponse(
                        { success: false, message: 'Validation failed', errors: ['User cannot rate themselves'] },
                        false,
                        400
                    )
                ) // failed create

            renderComponent()

            await waitFor(() => expect(screen.getByText(/no ratings yet/i)).toBeInTheDocument())

            await user.click(screen.getByRole('button', { name: /new rating/i }))
            await user.type(screen.getByLabelText(/from user id/i), 'user-1')
            await user.type(screen.getByLabelText(/to user id/i), 'user-1')
            await user.click(screen.getByRole('button', { name: /save/i }))

            await waitFor(() =>
                expect(screen.getByText(/user cannot rate themselves/i)).toBeInTheDocument()
            )

            expect(screen.getByText(/new rating/i, { selector: 'h2' })).toBeInTheDocument()
        })
    })

    describe('edycja oceny', () => {
        it('otwiera formularz edycji z wypełnionymi danymi i wysyła aktualizację', async () => {
            const user = userEvent.setup()
            const updated = { ...mockRatings[0], score: 2 }

            ;(global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce(jsonResponse(mockRatings)) // initial load
                .mockResolvedValueOnce(jsonResponse(updated)) // update
                .mockResolvedValueOnce(jsonResponse([updated, mockRatings[1]])) // reload

            renderComponent()

            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

            const row = screen.getByText('Alice').closest('tr') as HTMLElement
            await user.click(within(row).getByRole('button', { name: /edit/i }))

            expect(screen.getByText(/edit rating #1/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/from user id/i)).toHaveValue('user-1')
            expect(screen.getByLabelText(/to user id/i)).toHaveValue('user-2')

            const scoreInput = screen.getByLabelText(/score/i)
            await user.clear(scoreInput)
            await user.type(scoreInput, '2')
            await user.click(screen.getByRole('button', { name: /save/i }))

            await waitFor(() =>
                expect(screen.queryByText(/edit rating #1/i)).not.toBeInTheDocument()
            )

            const updateCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1]
            expect(updateCall[0]).toBe('/api/Ratings/1')
            expect(updateCall[1].method).toBe('PUT')
            expect(JSON.parse(updateCall[1].body)).toEqual({
                fromUserId: 'user-1',
                toUserId: 'user-2',
                score: 2,
            })
        })

        it('przycisk Cancel zamyka formularz bez wysyłania żądania', async () => {
            const user = userEvent.setup()

            ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(mockRatings))

            renderComponent()
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

            await user.click(screen.getByRole('button', { name: /new rating/i }))
            expect(screen.getByText(/new rating/i, { selector: 'h2' })).toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: /cancel/i }))

            expect(screen.queryByText(/new rating/i, { selector: 'h2' })).not.toBeInTheDocument()
            expect(global.fetch).toHaveBeenCalledTimes(1) // tylko początkowe ładowanie
        })
    })

    describe('usuwanie oceny', () => {
        it('usuwa ocenę po potwierdzeniu i usuwa ją z listy', async () => {
            const user = userEvent.setup()
            vi.spyOn(window, 'confirm').mockReturnValue(true)

            ;(global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce(jsonResponse(mockRatings)) // initial load
                .mockResolvedValueOnce(jsonResponse(null)) // delete

            renderComponent()
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

            const row = screen.getByText('Alice').closest('tr') as HTMLElement
            await user.click(within(row).getByRole('button', { name: /delete/i }))

            expect(window.confirm).toHaveBeenCalled()

            await waitFor(() => expect(screen.queryByText('Alice')).not.toBeInTheDocument())
            expect(screen.getByText('Carol')).toBeInTheDocument()

            const deleteCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1]
            expect(deleteCall[0]).toBe('/api/Ratings/1')
            expect(deleteCall[1].method).toBe('DELETE')
        })

        it('nie usuwa oceny, gdy potwierdzenie zostanie odrzucone', async () => {
            const user = userEvent.setup()
            vi.spyOn(window, 'confirm').mockReturnValue(false)

            ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(mockRatings))

            renderComponent()
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

            const row = screen.getByText('Alice').closest('tr') as HTMLElement
            await user.click(within(row).getByRole('button', { name: /delete/i }))

            expect(global.fetch).toHaveBeenCalledTimes(1) // brak żądania usunięcia
            expect(screen.getByText('Alice')).toBeInTheDocument()
        })

        it('pokazuje komunikat błędu, gdy usuwanie się nie powiedzie', async () => {
            const user = userEvent.setup()
            vi.spyOn(window, 'confirm').mockReturnValue(true)

            ;(global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce(jsonResponse(mockRatings)) // initial load
                .mockResolvedValueOnce(
                    jsonResponse({ success: false, message: 'Rating with ID 1 not found' }, false, 404)
                )

            renderComponent()
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

            const row = screen.getByText('Alice').closest('tr') as HTMLElement
            await user.click(within(row).getByRole('button', { name: /delete/i }))

            await waitFor(() =>
                expect(screen.getByText(/rating with id 1 not found/i)).toBeInTheDocument()
            )
            // wiersz zostaje, bo usuwanie się nie powiodło
            expect(screen.getByText('Alice')).toBeInTheDocument()
        })
    })

    describe('autoryzacja', () => {
        it('wysyła token Bearer z localStorage, jeśli jest ustawiony', async () => {
            localStorage.setItem('authToken', 'test-token')
            ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(mockRatings))

            renderComponent()

            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

            const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
            expect(call[1].headers).toMatchObject({ Authorization: 'Bearer test-token' })
        })
    })
})