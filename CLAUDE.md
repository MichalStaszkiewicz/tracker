# Tracker — zasady projektu

Aplikacja desktopowa dla jednej osoby (Electron + React/Vite + lokalny SQLite).
Wpis z typem: zachowanie opisuje ENTRY_TYPE w danych, nie kod.

## Architektura — reguły twarde
1. `core/` nigdy nie importuje `electron` ani Reacta. Czysty Node + SQL (przenośne na serwer).
2. `shared/` jest izomorficzne i czyste — zero Node/Electron/React/DOM. Tylko typy i funkcje wejście→wyjście.
3. Renderer nie woła IPC wprost — tylko przez `src/api/`. To jedyny szew UI ↔ dane.
4. Zero `if (type.key === 'pwn')`. Zachowanie wynika z właściwości ENTRY_TYPE.
5. Lokalizacja = runtime: SQLite → `core/` · React → `src/` · nic nie dotyka → `shared/` lub `src/lib/`.

## Kod
- TypeScript strict. Bez `any` (używaj `unknown` + zawężanie). Jawne typy zwrotu w `core/` i `api/`.
- Jedno źródło typów: `shared/types.ts`. DTO płyną przez `api/`.
- Komponenty głupie: logika w hookach / `lib/` / `core/`, nie w JSX.
- SQL tylko w `core/repositories/`.
- Błędy: `core/` rzuca typowane, `api/` normalizuje, renderer nie widzi surowego SQL.
- Jedna funkcja = jeden folder po obu stronach.
- Migracje małe, zawsze z kopią pliku bazy przed uruchomieniem.
- JSON na eksperymenty, kolumna na to, co się przyjęło.

## Komponenty / UI
- Trzyma się Core Components (Nocturne): tylko tokeny CSS z `src/styles/theme.css`, zero hardcodowanych kolorów.
- Kolor tylko na: obszar, ocenę, grupę `skill`. Typ przez ikonę. Ghost buttons, hairline, mono na tekst maszynowy.
- Brakuje komponentu → zbuduj reużywalny w `src/components/`, potem używaj. Nigdy jednorazowego UI w ekranie.
- Ekrany (`src/screens/`) komponują komponenty, nie zawierają własnych prymitywów wyglądu.
- Najpierw sprawdź, czy komponent już istnieje — reużyj.

## i18n
- Zero plaintextu w komponentach — zawsze `t('klucz')`.
- Teksty w `src/i18n/strings.ts` jako `{ pl, en }`, klucze typowane (literówka = błąd kompilacji).
- `t()` przez hook + context; język w SETTING, przełączany w locie.

## Testy (Vitest; node dla core/shared, jsdom docblokiem dla src)
- Po KAŻDYM ficzerze musi być pokryty.
- Jednostkowe: serwisy/funkcje, które coś liczą (parser, progress, walidacja, formatery).
- Integracyjne (główny typ w tym projekcie): wszystko, co dodaje/usuwa/zmienia w bazie
  oraz miejsca łączące 2–3 systemy (wyszukiwanie, import+dedup). Na SQLite `:memory:`.
- E2E: na razie pomijamy (appka prosta). Wrócimy, gdy się skomplikuje.
- Każdy bugfix zaczyna się od testu regresji (czerwony → naprawa).

## Flow ficzera (end-to-end)
1. Typ w `shared/types.ts`.
2. Funkcja w `core/repositories/` + test integracyjny na `:memory:`.
3. Kanał IPC w `electron/ipc/` + wpis w `src/api/`.
4. Hook w `src/hooks/`.
5. Ekran/komponenty (`src/screens/`, `src/components/`).
6. Czyste pomocniki → `shared/`/`src/lib/` + testy jednostkowe.
7. Definition of done: `tsc` czysty, Vitest zielony.

## Git
- Branch na ficzer → małe commity → push + PR → merge.
- Commity bardzo małe, jedna myśl na commit.
- Przed każdym commitem i PR: testy integracyjne nowej funkcjonalności (+ jednostkowe).
- Przed mergem: pełny zestaw + `tsc --noEmit`.
- CI/CD: kolejny etap; na razie odpalane ręcznie.
- Commit kończ: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Opis PR: `🤖 Generated with Claude Code`.

## Komendy
- Dev: `npm run test:watch` obok pracy, `npm run dev` dla aplikacji.
- Przed commitem: `npm test` (nowa funkcja) + `npm run typecheck`.
- Przed mergem: pełny `npm test` + `npm run typecheck`.
