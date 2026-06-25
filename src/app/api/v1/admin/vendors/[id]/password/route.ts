import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { UserModel } from "@/lib/models/user";
import connectMongo from "@/lib/mongo";
import bcrypt from "bcryptjs";
import z from "zod";

const schema = z.object({
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
});

export const PATCH = async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { success, data, error } = schema.safeParse(body);

    if (!success) return createErrorResponse("ValidationError", error.issues);
    if (data.newPassword !== data.confirmPassword) {
      return createErrorResponse("ValidationError", "Passwords do not match");
    }

    await connectMongo();

    const hashed = await bcrypt.hash(data.newPassword, 8);
    const vendor = await UserModel.findOneAndUpdate(
      { _id: id, role: "vendor" },
      { password: hashed },
    );

    if (!vendor) return createErrorResponse("NotFound");

    return Response.json({ message: "Password updated" });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
