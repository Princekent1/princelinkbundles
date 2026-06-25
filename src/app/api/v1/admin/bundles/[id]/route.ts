import { createErrorResponse } from "@/lib/errors";
import { getAuthUser } from "@/lib/get-auth-user";
import { BundleModel } from "@/lib/models/bundle";
import { deriveBundleName } from "@/lib/bundle-name";
import connectMongo from "@/lib/mongo";

export const PATCH = async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return createErrorResponse("Unauthorized");
    if (authUser.role !== "admin") return createErrorResponse("Forbidden");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { priceGhs, vendorPriceGhs, jaybartPackageId, jaybartNetworkId } = body;

    const update: Record<string, unknown> = {};

    if (priceGhs !== undefined) {
      if (typeof priceGhs !== "number" || priceGhs <= 0) {
        return createErrorResponse("ValidationError", "priceGhs must be a positive number (pesewas)");
      }
      update.priceGhs = priceGhs;
    }

    if ("vendorPriceGhs" in body) {
      if (vendorPriceGhs !== null) {
        if (typeof vendorPriceGhs !== "number" || vendorPriceGhs <= 0) {
          return createErrorResponse("ValidationError", "vendorPriceGhs must be a positive number (pesewas)");
        }
      }
      update.vendorPriceGhs = vendorPriceGhs;
    }

    if ("jaybartPackageId" in body) {
      if (jaybartPackageId !== null && !Number.isInteger(jaybartPackageId)) {
        return createErrorResponse("ValidationError", "jaybartPackageId must be an integer or null");
      }
      update.jaybartPackageId = jaybartPackageId;
      update.jaybartNetworkId = jaybartPackageId === null ? null : (jaybartNetworkId ?? null);
    }

    if (!Object.keys(update).length) {
      return Response.json({ message: "Nothing to update" }, { status: 400 });
    }

    await connectMongo();

    const existing = await BundleModel.findOne({ _id: id, archivedAt: null }).lean();
    if (!existing) return createErrorResponse("NotFound");

    if ("vendorPriceGhs" in body && vendorPriceGhs !== null) {
      const effectivePublicPrice = typeof update.priceGhs === "number" ? update.priceGhs : existing.priceGhs;
      if (vendorPriceGhs >= effectivePublicPrice) {
        return createErrorResponse("ValidationError", "vendorPriceGhs must be less than priceGhs");
      }
    }

    const bundle = await BundleModel.findByIdAndUpdate(id, update, { new: true });
    if (!bundle) return createErrorResponse("NotFound");

    return Response.json({
      _id: bundle._id.toString(),
      network: bundle.network,
      name: deriveBundleName(bundle.volumeMb),
      volumeMb: bundle.volumeMb,
      validityDays: bundle.validityDays,
      priceGhs: bundle.priceGhs,
      vendorPriceGhs: bundle.vendorPriceGhs ?? null,
      sortOrder: bundle.sortOrder,
      jaybartPackageId: bundle.jaybartPackageId ?? null,
      jaybartNetworkId: bundle.jaybartNetworkId ?? null,
    });
  } catch {
    return createErrorResponse("SomethingWentWrong");
  }
};
