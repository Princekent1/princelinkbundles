import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import { UserModel } from "@/lib/models/user";
import { WalletTransactionModel } from "@/lib/models/wallet-transaction";
import connectMongo from "@/lib/mongo";
import mongoose from "mongoose";

export const GET = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    await connectMongo();

    const vendorId = new mongoose.Types.ObjectId(id);

    const [vendor, recentTxns, recentOrders] = await Promise.all([
      UserModel.findOne({ _id: vendorId, role: "vendor" })
        .select("businessName email phone walletBalance status createdAt approvedAt suspendedAt")
        .lean(),
      WalletTransactionModel.find({ vendorId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      OrderModel.find({ placedBy: vendorId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("reference networkSnapshot bundleNameSnapshot amountGhs status createdAt")
        .lean(),
    ]);

    if (!vendor) return createErrorResponse("NotFound");

    return Response.json({
      vendor: {
        _id: vendor._id.toString(),
        businessName: vendor.businessName ?? "",
        email: vendor.email,
        phone: vendor.phone,
        walletBalance: vendor.walletBalance ?? 0,
        status: vendor.status,
        createdAt: vendor.createdAt,
        approvedAt: vendor.approvedAt ?? null,
        suspendedAt: vendor.suspendedAt ?? null,
      },
      recentTxns: recentTxns.map((t) => ({
        _id: t._id.toString(),
        type: t.type,
        amountGhs: t.amountGhs,
        balanceAfter: t.balanceAfter,
        note: t.note ?? null,
        createdAt: t.createdAt,
      })),
      recentOrders: recentOrders.map((o) => ({
        _id: o._id.toString(),
        reference: o.reference,
        networkSnapshot: o.networkSnapshot,
        bundleNameSnapshot: o.bundleNameSnapshot,
        amountGhs: o.amountGhs,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};

export const PATCH = async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action: string = body?.action;

    if (!["approve", "suspend", "reactivate"].includes(action)) {
      return createErrorResponse("ValidationError", "action must be approve, suspend, or reactivate");
    }

    await connectMongo();

    const adminId = new mongoose.Types.ObjectId(authUser._id);
    const now = new Date();

    const update =
      action === "suspend"
        ? { status: "suspended", suspendedAt: now, suspendedBy: adminId }
        : { status: "approved", approvedAt: now, approvedBy: adminId };

    const vendor = await UserModel.findOneAndUpdate(
      { _id: id, role: "vendor" },
      update,
      { new: true, select: "businessName status approvedAt suspendedAt" }
    );

    if (!vendor) return createErrorResponse("NotFound");

    return Response.json({
      _id: vendor._id.toString(),
      status: vendor.status,
      approvedAt: vendor.approvedAt ?? null,
      suspendedAt: vendor.suspendedAt ?? null,
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
