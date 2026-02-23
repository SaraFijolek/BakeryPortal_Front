import { Link } from "react-router-dom";

export default function Home() {
    const isLogged = !!localStorage.getItem("token");

    return (
        <div>
            <header>
                <h1>Platforma ogłoszeń cukierniczych</h1>

                {isLogged ? (
                    <nav>
                        <Link to="/add-ad">Dodaj ogłoszenie</Link> |{" "}
                        <Link to="/profile">Moje konto</Link> |{" "}
                        <button onClick={() => {
                            localStorage.removeItem("token");
                            window.location.reload();
                        }}>
                            Wyloguj
                        </button>
                    </nav>
                ) : (
                    <nav>
                        <Link to="/login">Zaloguj</Link> |{" "}
                        <Link to="/register">Zarejestruj</Link>
                    </nav>
                )}
            </header>

            <section>
                <h2>Wyszukaj ogłoszenia</h2>


                <input placeholder="Szukaj..." />
                <select>
                    <option>Kategoria</option>
                    <option>Sprzęt cukierniczy</option>
                    <option>Praca</option>
                    <option>Szkolenia</option>
                </select>

                <button>Szukaj</button>
            </section>

            <section>
                <h2>Najnowsze ogłoszenia</h2>


                <p>Brak ogłoszeń (API w kolejnym etapie)</p>
            </section>
        </div>
    );
}
