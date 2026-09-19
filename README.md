# Tracker

Aplikacja desktopowa (Electron + React + lokalny SQLite) do śledzenia nauki, projektów i ofert.
Wpis z typem: zachowanie opisuje `ENTRY_TYPE` w danych, nie kod. Zasady projektu: [CLAUDE.md](CLAUDE.md).

## Wymagania
- Node 20+ (testowane na 24)
- Windows: narzędzia do budowy modułów natywnych (potrzebne raz, do `better-sqlite3`)

## Start
```bash
npm install
npm run rebuild   # WAŻNE: przebudowa better-sqlite3 pod ABI Electrona (po każdej zmianie wersji Electrona)
npm run dev       # aplikacja w trybie deweloperskim (hot reload renderera)
```

## Komendy
| Komenda | Opis |
|---|---|
| `npm run dev` | Uruchamia aplikację (electron-vite) |
| `npm test` | Testy jednostkowe + integracyjne (Vitest) |
| `npm run test:watch` | Testy w trybie watch |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Build produkcyjny (main + preload + renderer) |
| `npm run db:generate` | Generuje migrację Drizzle ze zmian w `core/db/schema.ts` |

## Struktura
```
core/       czysty Node + SQL (schema, migracje, repozytoria) — przenośne na serwer
shared/     izomorficzne: typy, kontrakt IPC, parser, progress
electron/   klej Electrona: main, preload, ipc, bootstrap bazy
src/        renderer React: components/, screens/, hooks/, lib/, i18n/, api/
```

Baza dev: `./data/dev.sqlite` (gitignore). Produkcja: `%APPDATA%/tracker/tracker.sqlite`.
