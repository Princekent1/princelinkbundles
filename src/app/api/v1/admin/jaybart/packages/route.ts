import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { fetchPackages } from "@/lib/jaybart";

export const GET = async () => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const packages = await fetchPackages();
    return Response.json({ packages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch Jaybart packages";
    return Response.json({ message }, { status: 502 });
  }
};
