// Rejestr fokusu pola szybkiego dodawania — odporny na kolejność montażu.
// Jeśli pole jest zamontowane, fokus następuje od razu; jeśli nie,
// czeka i odpala się, gdy pole się zarejestruje.

let handler: (() => void) | null = null
let pending = false

/** Wywołaj, by ustawić fokus na polu „Nowe zadanie" (np. ze skrótu Dodaj). */
export function requestQuickAddFocus(): void {
  if (handler) handler()
  else pending = true
}

/** QuickAdd rejestruje się przy montażu; zwraca funkcję wyrejestrowującą. */
export function registerQuickAddFocus(fn: () => void): () => void {
  handler = fn
  if (pending) {
    pending = false
    fn()
  }
  return () => {
    if (handler === fn) handler = null
  }
}
