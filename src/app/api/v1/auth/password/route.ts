import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { UserModel } from "@/lib/models/user";
import connectMongo from "@/lib/mongo";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import z from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const PATCH = async (request: NextRequest) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");

    const body = await request.json();
    const { success, data, error } = schema.safeParse(body);
    if (!success) return createErrorResponse("ValidationError", error.issues[0]?.message);

    await connectMongo();

    const user = await UserModel.findById(authUser._id).select("+password").lean();
    if (!user) return createErrorResponse("Unauthorized");

    const valid = await bcrypt.compare(data.currentPassword, user.password!);
    if (!valid) return createErrorResponse("WrongCredentials", "Current password is incorrect");

    const hashed = await bcrypt.hash(data.newPassword, 8);
    await UserModel.findByIdAndUpdate(authUser._id, { password: hashed });

    return Response.json({ message: "Password updated successfully" });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
