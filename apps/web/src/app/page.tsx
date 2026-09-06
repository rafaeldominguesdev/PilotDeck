import { canCreateFirstAdmin } from "@pilotdeck/db";
import { redirect } from "next/navigation";
import { getSession } from "../lib/cookies";
import { countUsers } from "../lib/instance";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await getSession();
  if (session) redirect("/home");

  const users = await countUsers();
  redirect(canCreateFirstAdmin(users) ? "/setup" : "/login");
}
