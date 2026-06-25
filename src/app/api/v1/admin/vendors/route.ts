import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { UserModel } from "@/lib/models/user";
import connectMongo from "@/lib/mongo";
import { type NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    await connectMongo();

    const { searchParams } = req.nextUrl;
    const statusParam = searchParams.get("status")?.toLowerCase();
    const search = searchParams.get("search")?.trim();

    const VALID_STATUSES = ["pending", "approved", "suspended"];
    const filter: Record<string, unknown> = { role: "vendor" };

    if (statusParam && VALID_STATUSES.includes(statusParam)) {
      filter.status = statusParam;
    }
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const [vendors, counts] = await Promise.all([
      UserModel.find(filter)
        .sort({ createdAt: -1 })
        .select("businessName email phone walletBalance status createdAt")
        .lean(),
      UserModel.aggregate([
        { $match: { role: "vendor" } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const countsMap: Record<string, number> = { pending: 0, approved: 0, suspended: 0 };
    for (const c of counts) countsMap[c._id] = c.count;
    const total = Object.values(countsMap).reduce((a, b) => a + b, 0);

    return Response.json({
      vendors: vendors.map((v) => ({
        _id: v._id.toString(),
        businessName: v.businessName ?? "",
        email: v.email,
        phone: v.phone,
        walletBalance: v.walletBalance ?? 0,
        status: v.status,
        createdAt: v.createdAt,
      })),
      total: vendors.length,
      counts: { ...countsMap, all: total },
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
