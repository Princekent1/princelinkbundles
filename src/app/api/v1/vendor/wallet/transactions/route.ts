import connectMongo from "@/lib/mongo";
import { WalletTransactionModel } from "@/lib/models/wallet-transaction";
import { UserModel } from "@/lib/models/user";
import { getAuthUser } from "@/lib/get-auth-user";
import { createErrorResponse } from "@/lib/errors";

export const GET = async (req: Request) => {
  const user = await getAuthUser();
  if (!user) return createErrorResponse("Unauthorized");
  if (user.role !== "vendor" || user.status !== "approved") return createErrorResponse("Forbidden");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  try {
    await connectMongo();

    const dbUser = await UserModel.findById(user._id).lean();
    if (!dbUser) return createErrorResponse("Unauthorized");

    const [txns, total] = await Promise.all([
      WalletTransactionModel.aggregate([
        { $match: { vendorId: dbUser._id } },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: "orders",
            localField: "relatedOrderId",
            foreignField: "_id",
            as: "order",
          },
        },
        {
          $lookup: {
            from: "wallettopups",
            localField: "relatedTopupId",
            foreignField: "_id",
            as: "topup",
          },
        },
        {
          $addFields: {
            relatedOrderReference: { $first: "$order.reference" },
            relatedTopupReference: { $first: "$topup.reference" },
          },
        },
        { $project: { order: 0, topup: 0 } },
      ]),
      WalletTransactionModel.countDocuments({ vendorId: dbUser._id }),
    ]);

    return Response.json({
      walletBalance: dbUser.walletBalance,
      transactions: txns.map(tx => ({
        _id: String(tx._id),
        type: tx.type,
        amountGhs: tx.amountGhs,
        balanceAfter: tx.balanceAfter,
        relatedOrderId: tx.relatedOrderId ? String(tx.relatedOrderId) : null,
        relatedTopupId: tx.relatedTopupId ? String(tx.relatedTopupId) : null,
        relatedOrderReference: tx.relatedOrderReference ?? null,
        relatedTopupReference: tx.relatedTopupReference ?? null,
        note: tx.note ?? null,
        createdAt: tx.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
};
