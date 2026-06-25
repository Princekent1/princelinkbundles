import { cookies } from "next/headers";

export const POST = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  return Response.json({ message: "success" });
};
