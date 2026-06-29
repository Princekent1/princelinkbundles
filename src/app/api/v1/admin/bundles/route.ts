import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { BundleModel } from "@/lib/models/bundle";
import { effectiveBundleName } from "@/lib/bundle-name";
import connectMongo from "@/lib/mongo";
import { type NextRequest } from "next/server";

const VALID_NETWORKS = ["mtn", "telecel", "airteltigo"] as const;

export const GET = async (req: NextRequest) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    await connectMongo();

    const networkParam = req.nextUrl.searchParams.get("network")?.toLowerCase();
    const statusParam = req.nextUrl.searchParams.get("status")?.toLowerCase();
    const showArchived = statusParam === "archived";
    const filter: Record<string, unknown> = showArchived
      ? { archivedAt: { $ne: null } }
      : { archivedAt: null };
    if (networkParam && VALID_NETWORKS.includes(networkParam as any)) {
      filter.network = networkParam;
    }

    const [bundles, counts] = await Promise.all([
      BundleModel.find(filter).sort({ network: 1, sortOrder: 1 }).lean(),
      BundleModel.aggregate([
        {
          $group: {
            _id: {
              network: "$network",
              status: { $cond: [{ $ifNull: ["$archivedAt", false] }, "archived", "active"] },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const countsMap: Record<string, Record<string, number>> = {
      active: { mtn: 0, telecel: 0, airteltigo: 0 },
      archived: { mtn: 0, telecel: 0, airteltigo: 0 },
    };
    for (const c of counts) countsMap[c._id.status][c._id.network] = c.count;

    return Response.json({
      bundles: bundles.map((b) => ({
        _id: b._id.toString(),
        network: b.network,
        name: effectiveBundleName(b),
        displayName: b.displayName ?? "",
        volumeMb: b.volumeMb,
        validityDays: b.validityDays,
        priceGhs: b.priceGhs,
        vendorPriceGhs: b.vendorPriceGhs ?? null,
        sortOrder: b.sortOrder,
        jaybartPackageId: b.jaybartPackageId ?? null,
        jaybartNetworkId: b.jaybartNetworkId ?? null,
        jaybartCostGhs: b.jaybartCostGhs ?? null,
        archivedAt: b.archivedAt ?? null,
        createdAt: b.createdAt,
      })),
      counts: countsMap,
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};

export const POST = async (req: Request) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const body = await req.json().catch(() => ({}));
    const { network, volumeMb, validityDays, priceGhs, vendorPriceGhs, sortOrder, jaybartPackageId, jaybartNetworkId } = body;

    if (!VALID_NETWORKS.includes(network)) {
      return createErrorResponse("ValidationError", "network must be mtn, telecel, or airteltigo");
    }
    if (!Number.isInteger(volumeMb) || volumeMb <= 0) {
      return createErrorResponse("ValidationError", "volumeMb must be a positive integer");
    }
    if (!Number.isInteger(validityDays) || validityDays <= 0) {
      return createErrorResponse("ValidationError", "validityDays must be a positive integer");
    }
    if (typeof priceGhs !== "number" || priceGhs <= 0) {
      return createErrorResponse("ValidationError", "priceGhs must be a positive number (pesewas)");
    }
    if (vendorPriceGhs !== undefined && vendorPriceGhs !== null) {
      if (typeof vendorPriceGhs !== "number" || vendorPriceGhs <= 0) {
        return createErrorResponse("ValidationError", "vendorPriceGhs must be a positive number (pesewas)");
      }
      if (vendorPriceGhs >= priceGhs) {
        return createErrorResponse("ValidationError", "vendorPriceGhs must be less than priceGhs");
      }
    }
    if (jaybartPackageId !== undefined && jaybartPackageId !== null && !Number.isInteger(jaybartPackageId)) {
      return createErrorResponse("ValidationError", "jaybartPackageId must be an integer");
    }
    if (jaybartNetworkId !== undefined && jaybartNetworkId !== null && !Number.isInteger(jaybartNetworkId)) {
      return createErrorResponse("ValidationError", "jaybartNetworkId must be an integer");
    }

    await connectMongo();

    const bundle = await BundleModel.create({
      network,
      name: effectiveBundleName({ volumeMb }),
      volumeMb,
      validityDays,
      priceGhs,
      vendorPriceGhs: vendorPriceGhs ?? null,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      jaybartPackageId: jaybartPackageId ?? null,
      jaybartNetworkId: jaybartNetworkId ?? null,
    });

    return Response.json(
      {
        _id: bundle._id.toString(),
        network: bundle.network,
        name: effectiveBundleName(bundle),
        displayName: bundle.displayName ?? "",
        volumeMb: bundle.volumeMb,
        validityDays: bundle.validityDays,
        priceGhs: bundle.priceGhs,
        vendorPriceGhs: bundle.vendorPriceGhs ?? null,
        sortOrder: bundle.sortOrder,
        jaybartPackageId: bundle.jaybartPackageId ?? null,
        jaybartNetworkId: bundle.jaybartNetworkId ?? null,
        jaybartCostGhs: bundle.jaybartCostGhs ?? null,
      },
      { status: 201 }
    );
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
