import connectMongo from "@/lib/mongo";
import { BundleModel } from "@/lib/models/bundle";
import { effectiveBundleName, formatValidity } from "@/lib/bundle-name";
import { getAuthUser } from "@/lib/get-auth-user";
import { getSettings } from "@/lib/models/settings";
import { type NextRequest } from "next/server";

const VALID_NETWORKS = ["mtn", "telecel", "airteltigo"] as const;

export const GET = async (req: NextRequest) => {
  try {
    await connectMongo();

    const networkParam = req.nextUrl.searchParams.get("network")?.toLowerCase();
    const settings = await getSettings();
    const filter: Record<string, unknown> = { archivedAt: null };
    if (networkParam && VALID_NETWORKS.includes(networkParam as (typeof VALID_NETWORKS)[number])) {
      if (settings.disabledNetworks.includes(networkParam)) {
        return Response.json({ bundles: [] });
      }
      filter.network = networkParam;
    } else if (settings.disabledNetworks.length > 0) {
      filter.network = { $nin: settings.disabledNetworks };
    }

    const authUser = await getAuthUser().catch(() => null);
    const isVendor = authUser?.role === "vendor" && authUser?.status === "approved";

    const bundles = await BundleModel.find(filter).sort({ network: 1, sortOrder: 1 }).lean();

    return Response.json({
      bundles: bundles.map((b) => ({
        _id: b._id.toString(),
        network: b.network,
        name: effectiveBundleName(b),
        validity: formatValidity(b.validityDays),
        validityDays: b.validityDays,
        priceGhs: b.priceGhs,
        sortOrder: b.sortOrder,
        ...(isVendor && b.vendorPriceGhs != null && { vendorPriceGhs: b.vendorPriceGhs }),
      })),
    });
  } catch {
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
};
