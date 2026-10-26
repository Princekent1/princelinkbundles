import { cookies } from "next/headers";
import { generateToken, type TokenPayload } from "@/lib/jwt";

export async function setAuthCookie(payload: TokenPayload) {
  const token = await generateToken(payload);
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}
