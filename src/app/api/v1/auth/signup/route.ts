import { createErrorResponse } from "@/lib/errors";
import { User, UserModel } from "@/lib/models/user";
import { getSettings } from "@/lib/models/settings";
import connectMongo from "@/lib/mongo";
import { signupLimiter, getIp } from "@/lib/rate-limit";
import { setAuthCookie } from "@/lib/auth-cookie";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import z from "zod";

const schema = z.object({
  email: z.string().email(),
  phone: z.string(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  businessName: z.string(),
});

export const POST = async (request: NextRequest) => {
  try {
    if (!signupLimiter.check(getIp(request))) {
      return createErrorResponse("RateLimited");
    }

    await connectMongo();
    const body = await request.json();

    const { success, data, error } = schema.safeParse(body);

    if (!success) {
      return createErrorResponse("ValidationError", error.issues);
    }

    const { email, phone, password, confirmPassword, businessName } = data;

    let existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      return createErrorResponse("UserAlreadyExists", "Email already exists");
    }

    let parsedPhone = "";
    if (phone) {
      const isAllDigits = /^\d+$/.test(phone);
      if (!isAllDigits) {
        return createErrorResponse(
          "ValidationError",
          "Phone number must contain only digits",
        );
      }
      parsedPhone = `233${phone.slice(-9)}`;
    }


    existingUser = await UserModel.findOne({ phone: parsedPhone });

    if (existingUser) {
      return createErrorResponse("UserAlreadyExists", "Phone number already exists");
    }

    if (password !== confirmPassword) {
      return createErrorResponse("ValidationError", "Passwords do not match");
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const settings = await getSettings();
    const feePaymentRequired = settings.requireVendorSignupFee;

    const payload: User = {
      email,
      phone: parsedPhone,
      businessName,
      password: hashedPassword,
      ...(!feePaymentRequired && settings.autoApproveVendors ? { status: "approved", approvedAt: new Date() } : {}),
    };

    const createdUser = await UserModel.create(payload);
    const autoApproved = !feePaymentRequired && settings.autoApproveVendors;

    await setAuthCookie({
      _id: createdUser._id.toString(),
      email: createdUser.email,
      role: createdUser.role ?? "vendor",
      status: createdUser.status ?? "pending",
      businessName: createdUser.businessName,
    });

    return Response.json({ message: "success", autoApproved, feePaymentRequired });
  } catch (error) {
    return createErrorResponse("SomethingWentWrong");
  }
};
