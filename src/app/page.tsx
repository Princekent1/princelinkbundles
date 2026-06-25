import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { LandingPage } from "./_landing";

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const user = token ? await verifyToken(token) : null;
  return <LandingPage user={user} />;
}
