import { create } from 'zustand'

interface SearchState {
  search: string
  setSearch: (search: string) => void
}

/**
 * The patient-list search term. Kept out of the URL and out of storage on purpose: names are
 * PHI and must not end up in browser history, bookmarks or shared links. It lives in memory, so
 * it survives navigating to a patient and back, but not a reload.
 */
export const useSearchStore = create<SearchState>()((set) => ({
  search: '',
  setSearch: (search) => set({ search }),
}))
