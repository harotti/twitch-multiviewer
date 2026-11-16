# 🎮 Twitch Multi Viewer & Time Tracker (Pro + xayo.pl Analytics)

> **Nowoczesna platforma do jednoczesnego oglądania wielu transmisji Twitch, analizy rzeczywistego czasu oglądania streamerów (zintegrowana z bazą xayo.pl), monitorowania stażu obserwowania kanałów oraz błyskawicznego zarządzania czatem dzięki Panelowi Moderatora (Twitch Mod View).**

---

## 🌟 Główne Możliwości i Funkcje

### 📺 1. Zaawansowany Multi-Stream Grid
* **Dynamiczne układy siatki:**
  * **Auto-fit**: automatyczne dopasowywanie rozmiarów w zależności od liczby włączonych streamów.
  * **1x1**: pełny ekran jednego twórcy.
  * **1x2**: podział ekranu na dwa okna (side-by-side).
  * **2x2**: klasyczny układ quad (cztery streamy jednocześnie).
  * **3x2**: podgląd do sześciu transmisji na jednym ekranie.
* **Tryb kinowy (Theater Mode):** powiększ dowolną transmisję na cały ekran bez zamykania pozostałych.
* **Wbudowany czat Twitch:** wysuwany panel czatu na żywo (`darkpopout`) dla każdego odtwarzacza z osobna.
* **Działa bez logowania:** wystarczy wpisać nick streamera lub wkleić link `twitch.tv/nazwa_kanalu`.

---

### 📊 2. Statystyki Czasu Oglądania z xayo.pl
* **Prawdziwy historyczny czas:** aplikacja nie liczy minut od zera przy każdym odświeżeniu — pobiera autentyczne dane z publicznego API serwisu **xayo.pl**.
* **Domyślny profil `hattoripol`:** lub Twoje własne konto Twitch po zalogowaniu.
* **Wyszukiwarka dowolnego widza:** natychmiastowe sprawdzanie statystyk dowolnego użytkownika na polskim Twitchu.
* **Filtry okresów:**
  * **Cały czas (`all`)** — pełna historia oglądania.
  * **Ostatni rok (`365d`)** — podsumowanie minionych 12 miesięcy.
  * **Ostatnie 30 dni (`30d`)** — bieżące preferencje.
* **Szacunek dni ciągłego oglądania:** np. `894h = ~37 dni ciągłego oglądania`.
* **Względny czas ostatniej aktywności:** np. `4 dni temu`, `wczoraj`, `przed chwilą`.
* **Eksport danych:** możliwość pobrania raportu statystyk do formatu **CSV** lub **JSON**.

---

### 💜 3. Czas Obserwowania Kanału (Twitch Helix API)
* Po zalogowaniu przez Twitch aplikacja odczytuje znacznik czasu `followed_at` dla każdego obserwowanego twórcy.
* Wylicza dokładny staż: np. `💜 Obserwujesz od: 2 lata 3 mies. (14.03.2024)`.
* Dostępne sortowanie listy twórców wg kryterium **„Najdłużej obserwowany”**.

---

### 🔥 4. Wizualna Sekcja „Trending & Piki Platformy” (XayoModal)
* **Karta Główna (Spotlight Hero):** wyróżnia twórcę z największym aktualnym skokiem oglądalności.
* **Wskaźniki skoku (Spike Factor):** kolorowe plakietki np. `🔥 +245% PIK`, `VIRAL SURGE`, `+120%`.
* **Paski dynamiki platformy:** wizualizacja natężenia ruchu i liczby widzów na żywo z pulsującym wskaźnikiem LIVE.
* **Filtry:**
  * *Wszystkie kanały*
  * *🔥 Skoki > +100%*
  * *🛡️ Tylko moderowane*
  * *🔴 Tylko transmisje LIVE*
* **1-kliknięcie:** przycisk `[+ Oglądaj w siatce]` natychmiast dodaje kanał do Twojego widoku.

---

### 🛡️ 5. Zintegrowany Panel Moderatora (Twitch Mod View)
* Dla kanałów, na których posiadasz uprawnienia moderatorskie (`moderated_channels`):
  * **W Panelu Bocznym (Sidebar):** przycisk `[🛡️ Panel mod.]` przy każdym moderowanym kanale.
  * **W Odtwarzaczu Streamu (StreamPlayer):** przycisk `[🛡️ Mod View]` w belce odtwarzacza — moderujesz bez przełączania kart!
  * **W Tabeli Statystyk i Trendach:** plakietka moderatora i bezpośredni dostęp do narzędzi.
* Otwiera oficjalną konsolę Twitch Mod View w dedykowanym, dopasowanym oknie popup.

---

### 💾 6. Zestawy Kanałów (Presets)
* Zapisuj ulubione konfiguracje streamów (np. *„Turniej CS”*, *„Wieczorny chill”*, *„Ulubieni streamerzy”*).
* Uruchamiaj całe zestawy jednym kliknięciem.

---

### ⌨️ 7. Globalne Skróty Klawiszowe (Dostępność i Szybka Nawigacja)
Steruj całą aplikacją bezpośrednio z klawiatury bez konieczności sięgania po myszkę:
| Klawisz | Akcja |
| :--- | :--- |
| <kbd>Spacja</kbd> | **Wstrzymaj / Wznów** odtwarzanie (w trybie kinowym lub aktywnym streamie) |
| <kbd>M</kbd> | **Włącz / Wyłącz Panel Moderatora** (Mod View) dla wybranego kanału |
| <kbd>G</kbd> / <kbd>Shift+G</kbd> | **Przełączaj układy siatki** (Auto → 1x1 → 1x2 → 2x2 → 3x2) |
| <kbd>T</kbd> | **Włącz / Wyłącz Tryb Kinowy** (Theater Mode) |
| <kbd>B</kbd> lub <kbd>[</kbd> | **Schowaj / Pokaż panel boczny** (Sidebar) |
| <kbd>1</kbd> – <kbd>9</kbd> | **Szybki wybór streamu** #1 do #9 w trybie kinowym |
| <kbd>X</kbd> | **Otwórz / Zamknij statystyki xayo.pl** & piki platformy |
| <kbd>S</kbd> | **Otwórz ustawienia aplikacji** |
| <kbd>?</kbd> lub <kbd>F1</kbd> | **Wyświetl ściągę skrótów klawiszowych** (okno dialogowe) |
| <kbd>Esc</kbd> | **Zamknij otwarte okno / szufladę** lub wyjdź z trybu kinowego |

*Uwaga: Skróty są automatycznie wstrzymywane podczas wpisywania tekstu w polach wyszukiwania i formularzach.*

---

### ⚡ 8. Globalne Automatyczne Odtwarzanie (Global Auto-Play)
* **Bezproblemowe wznawianie:** w oknie `Ustawienia` dostępny jest przełącznik **Global Auto-Play**.
* Gdy opcja jest włączona, każdy stream dodany do siatki lub odświeżony przyciskiem `[Odśwież stream]` natychmiast rozpoczyna i wznawia odtwarzanie bez konieczności klikania w player przez użytkownika.
* Działa w pełnej zgodności z polityką przeglądarek (streamy startują wyciszone, gotowe do natychmiastowego oglądania).

---

## 🛠️ Technologie

* **Frontend:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Stylowanie:** [Tailwind CSS v4](https://tailwindcss.com/)
* **Narzędzie budowania:** [Vite 6/8](https://vitejs.dev/)
* **Ikony:** [Lucide React](https://lucide.dev/)
* **Zewnętrzne API:**
  * [Twitch Helix API](https://dev.twitch.tv/docs/api/) (użytkownicy, obserwowane, moderowane, statusy live)
  * [Twitch Interactive Embed SDK](https://dev.twitch.tv/docs/embed/everything/) (odtwarzacz wideo i czat)
  * [xayo.pl API](https://xayo.pl/) (chatter watch time & platform spikes)

---

## 🚀 Jak uruchomić aplikację u siebie (Instrukcja krok po kroku)

### Wymagania wstępne
Upewnij się, że masz zainstalowane:
* [Node.js](https://nodejs.org/) w wersji **18.0.0 lub nowszej** (zalecana wersja 20 LTS)
* Menedżer pakietów: `npm`, `pnpm` lub `bun`

---

### 1. Klonowanie lub rozpakowanie projektu
Jeśli posiadasz repozytorium git:
```bash
git clone <URL_REPOZYTORIUM>
cd <KATALOG_PROJEKTU>
```
Lub rozpakuj pobrane archiwum `.zip` i wejdź do katalogu w terminalu.

---

### 2. Instalacja zależności
Uruchom w katalogu projektu:
```bash
npm install
```
*(lub `pnpm install` / `bun install`)*

---

### 3. Konfiguracja zmiennych środowiskowych (opcjonalnie)
Skopiuj plik `.env.example` do `.env`:
```bash
cp .env.example .env
```
Domyślna konfiguracja działa od razu po instalacji — aplikacja posiada wbudowany domyślny Client ID Twitcha oraz automatyczną walidację tokenów przez `https://id.twitch.tv/oauth2/validate`.

---

### 4. Uruchomienie serwera deweloperskiego
```bash
npm run dev
```

Aplikacja uruchomi się lokalnie pod adresem:
👉 **`http://localhost:3000`** (lub portem wskazanym przez Vite w terminalu).

Otwórz ten adres w przeglądarce i ciesz się oglądaniem!

---

### 5. Budowanie wersji produkcyjnej
Aby zbudować zoptymalizowaną paczkę produkcyjną:
```bash
npm run build
```
Wynikowe pliki pojawią się w folderze `dist/`. Możesz je przetestować lokalnie za pomocą:
```bash
npm run preview
```

---

## 🔑 Jak działa logowanie z Twitchem?

Aplikacja udostępnia dwa wygodne sposoby autoryzacji w oknie logowania:

1. **Metoda 1: Token Twitch (Zalecana, błyskawiczna — 10 sekund)**
   * Kliknij **„Zaloguj z Twitch”** w panelu bocznym.
   * Kliknij przycisk **„Wygeneruj Token Twitch”** (przekierowuje do bezpiecznego generatora z wymaganymi uprawnieniami `user:read:follows` oraz `user:read:moderated_channels`).
   * Skopiuj token i wklej go w aplikacji.
   * Gotowe! Aplikacja automatycznie dopasuje identyfikator `Client-Id` powiązany z Twoim tokenem i załaduje listę kanałów.

2. **Metoda 2: Logowanie przez okno OAuth Popup**
   * Otwiera okno autoryzacji Twitch.
   * Jeśli używasz własnej aplikacji z [Twitch Developer Console](https://dev.twitch.tv/console), upewnij się, że w sekcji *OAuth Redirect URLs* dodałeś adres swojej instancji (np. `http://localhost:3000/`).

> 🔒 **Bezpieczeństwo i prywatność:** Twój token Twitch oraz historia oglądania są zapisywane **wyłącznie w pamięci lokalnej Twojej przeglądarki (`localStorage`)**. Żadne dane logowania nie są wysyłane na zewnętrzne serwery.

---

## ❓ Najczęściej Zadawane Pytania (FAQ)

### Dlaczego po dodaniu nowego streamu dźwięk jest początkowo wyciszony?
Wszystkie nowoczesne przeglądarki (Chrome, Firefox, Safari, Edge) blokują automatyczne odtwarzanie multimediów z dźwiękiem (tzw. polityka *Autoplay Policy*). Wyciszenie przy starcie pozwala na natychmiastowe uruchomienie obrazu bez blokady przeglądarki — wystarczy jedno kliknięcie na ikonie głośnika na danym streamie, aby włączyć dźwięk.

### Czy muszę się logować, aby korzystać z aplikacji?
**Nie.** Możesz korzystać z Multi Viewera w pełni anonimowo! Wpisz dowolny kanał w górnym pasku wyszukiwania lub kliknij w jeden z polecanych kafelków szybkiego startu (*ESL CS, shroud, xmerghani, izakooo*). Możesz również przeglądać statystyki xayo.pl dowolnego użytkownika bez logowania.

### Jak zresetować lokalne dane?
W panelu bocznym w zakładce ustawień (ikona zębatki ⚙️) lub przy statystykach możesz w każdej chwili usunąć zapisany token, zresetować historię sesji lub wyczyścić zestawy presetów.

---

## 📄 Licencja

Projekt udostępniany na licencji **Apache-2.0**.
Darmowe, otwarte oprogramowanie dla społeczności Twitcha. Miłego oglądania! 🍿
