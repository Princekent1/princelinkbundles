import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { OrderModel } from "@/lib/models/order";
import { UserModel } from "@/lib/models/user";
import connectMongo from "@/lib/mongo";

const REVENUE_STATUSES = ["paid", "fulfilling", "completed"];

function getDayBounds(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return { start: d, end: next };
}

function fillHours(raw: { hour: number; amountGhs: number }[], upToHour: number) {
  const map = new Map(raw.map((r) => [r.hour, r.amountGhs]));
  return Array.from({ length: upToHour + 1 }, (_, h) => ({ hour: h, amountGhs: map.get(h) ?? 0 }));
}

function fillDays(raw: { date: string; amountGhs: number }[], start: Date, end: Date) {
  const map = new Map(raw.map((r) => [r.date, r.amountGhs]));
  const days: { date: string; amountGhs: number }[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ date: key, amountGhs: map.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export const GET = async (req: Request) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    await connectMongo();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? "7d";

    const today = getDayBounds(0);
    const currentHour = new Date().getHours();

    const periodStart = new Date(today.start);
    if (period === "7d") periodStart.setDate(periodStart.getDate() - 6);
    else if (period === "30d") periodStart.setDate(periodStart.getDate() - 29);

    const revenueChartAgg =
      period === "today"
        ? OrderModel.aggregate([
            { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: today.start, $lt: today.end } } },
            { $group: { _id: { $hour: "$createdAt" }, amountGhs: { $sum: "$amountGhs" } } },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, hour: "$_id", amountGhs: 1 } },
          ])
        : OrderModel.aggregate([
            {
              $match: {
                status: { $in: REVENUE_STATUSES },
                createdAt: { $gte: periodStart },
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                amountGhs: { $sum: "$amountGhs" },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", amountGhs: 1 } },
          ]);

    const [
      pendingOrdersCount,
      todayRevenueAgg,
      ordersTodayCount,
      allTimeRevenueAgg,
      revenueChartRaw,
      pendingQueue,
      todayByNetwork,
      pendingVendorsCount,
      profitAgg,
    ] = await Promise.all([
      OrderModel.countDocuments({ status: "paid" }),

      OrderModel.aggregate([
        { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: today.start, $lt: today.end } } },
        { $group: { _id: null, total: { $sum: "$amountGhs" } } },
      ]),

      OrderModel.countDocuments({
        status: { $in: REVENUE_STATUSES },
        createdAt: { $gte: today.start, $lt: today.end },
      }),

      OrderModel.aggregate([
        { $match: { status: { $in: REVENUE_STATUSES } } },
        { $group: { _id: null, total: { $sum: "$amountGhs" } } },
      ]),

      revenueChartAgg,

      OrderModel.find({ status: "paid" })
        .sort({ createdAt: 1 })
        .limit(3)
        .select("reference networkSnapshot bundleNameSnapshot customerPhone amountGhs createdAt")
        .lean(),

      OrderModel.aggregate([
        { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: today.start, $lt: today.end } } },
        { $group: { _id: "$networkSnapshot", revenue: { $sum: "$amountGhs" }, orderCount: { $sum: 1 } } },
        { $project: { _id: 0, network: "$_id", revenue: 1, orderCount: 1 } },
      ]),

      UserModel.countDocuments({ role: "vendor", status: "pending" }),

      OrderModel.aggregate([
        { $match: { status: "completed" } },
        {
          $lookup: {
            from: "bundles",
            localField: "bundleId",
            foreignField: "_id",
            as: "bundle",
          },
        },
        { $unwind: { path: "$bundle", preserveNullAndEmptyArrays: false } },
        { $match: { "bundle.jaybartCostGhs": { $ne: null } } },
        {
          $group: {
            _id: "$paymentMethod",
            revenue: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentMethod", "wallet"] },
                  { $ifNull: ["$bundle.vendorPriceGhs", "$bundle.priceGhs"] },
                  "$bundle.priceGhs",
                ],
              },
            },
            cost: { $sum: "$bundle.jaybartCostGhs" },
          },
        },
      ]),
    ]);

    const revenueChart =
      period === "today"
        ? fillHours(revenueChartRaw as { hour: number; amountGhs: number }[], currentHour)
        : fillDays(revenueChartRaw as { date: string; amountGhs: number }[], periodStart, today.end);

    return Response.json({
      pendingOrdersCount,
      todayRevenue: todayRevenueAgg[0]?.total ?? 0,
      ordersToday: ordersTodayCount,
      allTimeRevenue: allTimeRevenueAgg[0]?.total ?? 0,
      revenueChart,
      pendingQueue: pendingQueue.map((o) => ({
        _id: o._id.toString(),
        reference: o.reference,
        networkSnapshot: o.networkSnapshot,
        bundleNameSnapshot: o.bundleNameSnapshot,
        customerPhone: o.customerPhone,
        amountGhs: o.amountGhs,
        createdAt: o.createdAt,
      })),
      todayByNetwork,
      pendingVendorsCount,
      profit: (() => {
        const rows = profitAgg as { _id: string; revenue: number; cost: number }[];
        if (!rows.length) return null;
        const guest = rows.find(r => r._id === "paystack") ?? { revenue: 0, cost: 0 };
        const vendor = rows.find(r => r._id === "wallet") ?? { revenue: 0, cost: 0 };
        return {
          guest: { revenue: guest.revenue, cost: guest.cost, margin: guest.revenue - guest.cost },
          vendor: { revenue: vendor.revenue, cost: vendor.cost, margin: vendor.revenue - vendor.cost },
        };
      })(),
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
