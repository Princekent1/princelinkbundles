import { createErrorResponse } from "@/lib/errors";
import { generateToken, TokenPayload } from "@/lib/jwt";
import { UserModel } from "@/lib/models/user";
import connectMongo from "@/lib/mongo";
import { loginLimiter, getIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import z from "zod";

const schema = z.object({
  identifier: z.string(),
  password: z.string().min(8),
});

export const POST = async (request: NextRequest) => {
  try {
    if (!loginLimiter.check(getIp(request))) {
      return createErrorResponse("RateLimited");
    }

    await connectMongo();
    const body = await request.json();

    const { success, data, error } = schema.safeParse(body);

    if (!success) {
      return createErrorResponse("ValidationError", error.issues);
    }

    const { identifier, password } = data;

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^\d+$/.test(identifier);

    if (!isEmail && !isPhone) {
      return createErrorResponse("ValidationError", "Invalid identifier");
    }

    const query = isEmail
      ? { email: identifier }
      : { phone: `233${identifier.slice(-9)}` };

    const existingUser = await UserModel.findOne(query).select("+password").lean();

    if (!existingUser) {
      return createErrorResponse("WrongCredentials", "Email/phone or password is incorrect");
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password!);
    if (!isPasswordValid) {
      return createErrorResponse("WrongCredentials", "Email/phone or password is incorrect");
    }

    const { status } = existingUser;
    if (status === "rejected") return createErrorResponse("AccountRejected");
    if (status === "suspended") return createErrorResponse("AccountSuspended");

    const payload: TokenPayload = {
      _id: existingUser._id.toString(),
      email: existingUser.email,
      role: existingUser.role ?? "vendor",
      status: existingUser.status ?? "pending",
      businessName: existingUser.businessName,
    };

    const token = await generateToken(payload);

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return Response.json({ message: "success", user: payload });
  } catch (error) {
    return createErrorResponse("SomethingWentWrong");
  }
};
