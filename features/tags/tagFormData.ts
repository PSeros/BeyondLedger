// Reads the tag ids an entry form posts. TagMultiSelect mirrors each selected tag into a hidden
// <input name="tagId">, so the server action collects them with getAll. Shared by every entry
// mutation (bill/contract/income). Invalid/blank values are dropped.
export function parseTagIds(formData: FormData): number[] {
  return formData
    .getAll("tagId")
    .map((value) => Number(value))
    .filter((n) => Number.isInteger(n) && n > 0);
}
