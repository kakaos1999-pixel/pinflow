// Rövid, ütközésmentes azonosítók példányokhoz és vezetékekhez.
export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
