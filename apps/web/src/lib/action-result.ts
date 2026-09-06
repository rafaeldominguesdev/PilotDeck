/** Standard return type of the board's server actions. Lives outside the
 * "use server" files, which may only export async functions. */
export type ActionResult = { ok: true } | { ok: false; error: string };
