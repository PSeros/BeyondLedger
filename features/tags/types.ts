// A tag as offered to pickers and filters: id/name plus its stored color, so chips render without a
// second lookup. Shared by the Settings CRUD, the entry-form multi-select, and the list filters.
export type TagOption = {id: number; name: string; color: string};
