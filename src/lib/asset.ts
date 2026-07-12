/** Resolve public asset paths for both local and GitHub Pages base. */
export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
