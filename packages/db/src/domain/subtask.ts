export function canNestUnder(parent: { parentId: string | null }): boolean {
  return parent.parentId === null;
}
