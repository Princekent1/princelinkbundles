import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { BundleModel } from "@/lib/models/bundle";
import connectMongo from "@/lib/mongo";
import { fetchPackages } from "@/lib/jaybart";

export const POST = async () => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const [jaybartPackages] = await Promise.all([fetchPackages(), connectMongo()]);

    const pkgMap = new Map(jaybartPackages.map(p => [p.id, p]));

    const bundles = await BundleModel.find({ archivedAt: null, jaybartPackageId: { $ne: null } }).lean();

    let updated = 0;
    let unchanged = 0;
    let unresolved = 0;

    for (const bundle of bundles) {
      const pkg = pkgMap.get(bundle.jaybartPackageId!);
      if (!pkg) { unresolved++; continue; }

      const jaybartCostGhs = Math.round(parseFloat(pkg.console_price) * 100);
      if (isNaN(jaybartCostGhs)) { unresolved++; continue; }

      if (bundle.jaybartCostGhs === jaybartCostGhs) { unchanged++; continue; }

      await BundleModel.updateOne({ _id: bundle._id }, { jaybartCostGhs });
      updated++;
    }

    return Response.json({ updated, unchanged, unresolved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return Response.json({ message }, { status: 502 });
  }
};
