"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/shell";
import { NetMark } from "@/components/ui/network-mark";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ghsp } from "@/lib/data";
import {
  getAdminBundles,
  createBundle,
  updateBundle,
  archiveBundle,
  restoreBundle,
  getJaybartPackages,
  syncJaybartBundles,
  getFulfillmentSettings,
  updateFulfillmentSettings,
  type AdminBundleItem,
  type CreateBundleInput,
  type JaybartPackage,
} from "@/api";
import toast from "react-hot-toast";

const NETWORKS = [
  { id: "mtn",        label: "MTN" },
  { id: "telecel",    label: "Telecel" },
  { id: "airteltigo", label: "AirtelTigo" },
] as const;

function formatValidity(days: number): string {
  if (days === 1) return "24 hours";
  if (days < 7) return `${days} days`;
  if (days % 7 === 0) return `${days / 7} week${days / 7 > 1 ? "s" : ""}`;
  if (days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? "s" : ""}`;
  return `${days} days`;
}

type CreateForm = {
  network: string;
  volumeMb: string;
  validityDays: string;
  priceGhs: string;
  vendorPriceGhs: string;
  sortOrder: string;
  jaybartPackageId: string;
  jaybartNetworkId: number | null;
};

const EMPTY_FORM: CreateForm = {
  network: "mtn",
  volumeMb: "",
  validityDays: "",
  priceGhs: "",
  vendorPriceGhs: "",
  sortOrder: "",
  jaybartPackageId: "",
  jaybartNetworkId: null,
};

function filterByNetwork(packages: JaybartPackage[], network: string): JaybartPackage[] {
  const n = network.toLowerCase();
  return packages.filter(p => {
    const pn = p.network.toLowerCase();
    if (n === "airteltigo") return pn.includes("at") || pn.includes("airtel") || pn.includes("tigo");
    return pn.includes(n);
  });
}

export default function AdminBundlesPage() {
  const queryClient = useQueryClient();
  const [net, setNet] = useState("mtn");
  const [view, setView] = useState<"active" | "archived">("active");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_FORM);

  const [editBundle, setEditBundle] = useState<AdminBundleItem | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editVendorPrice, setEditVendorPrice] = useState("");
  const [editValidityDays, setEditValidityDays] = useState("");
  const [editJaybartId, setEditJaybartId] = useState("");
  const [editJaybartNetworkId, setEditJaybartNetworkId] = useState<number | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<AdminBundleItem | null>(null);
  const [archiveText, setArchiveText] = useState("");

  const [networkToggleTarget, setNetworkToggleTarget] = useState<{ id: string; label: string; action: "disable" | "enable" } | null>(null);

  const { data: settingsData } = useQuery({
    queryKey: getFulfillmentSettings.key,
    queryFn: getFulfillmentSettings.fn,
  });

  const disabledNetworks: string[] = settingsData?.disabledNetworks ?? [];

  const { mutate: doNetworkToggle, isPending: isTogglingNetwork } = useMutation({
    mutationFn: (next: string[]) => updateFulfillmentSettings.fn({ disabledNetworks: next }),
    onSuccess: () => {
      const action = networkToggleTarget?.action;
      toast.success(action === "disable" ? `${networkToggleTarget?.label} disabled` : `${networkToggleTarget?.label} enabled`);
      setNetworkToggleTarget(null);
      queryClient.invalidateQueries({ queryKey: getFulfillmentSettings.key });
    },
    onError: () => toast.error("Failed to update network status"),
  });

  const { data, isLoading } = useQuery({
    queryKey: getAdminBundles.key(undefined, view),
    queryFn: () => getAdminBundles.fn(undefined, view),
  });

  const { data: jaybartData } = useQuery({
    queryKey: getJaybartPackages.key,
    queryFn: getJaybartPackages.fn,
    enabled: createOpen || editBundle !== null,
    staleTime: 5 * 60 * 1000,
  });

  const jaybartPackages: JaybartPackage[] = jaybartData?.packages ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "bundles"] });

  const { mutate: doCreate, isPending: isCreating } = useMutation({
    mutationFn: (input: CreateBundleInput) => createBundle.fn(input),
    onSuccess: () => {
      toast.success("Bundle created");
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      invalidate();
    },
    onError: () => toast.error("Failed to create bundle"),
  });

  const { mutate: doEdit, isPending: isEditing } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { displayName?: string; priceGhs?: number; vendorPriceGhs?: number | null; validityDays?: number; jaybartPackageId?: number | null; jaybartNetworkId?: number | null } }) =>
      updateBundle.fn(id, data),
    onSuccess: () => {
      toast.success("Bundle updated");
      setEditBundle(null);
      setEditPrice("");
      setEditVendorPrice("");
      setEditValidityDays("");
      setEditJaybartId("");
      setEditJaybartNetworkId(null);
      invalidate();
    },
    onError: () => toast.error("Failed to update bundle"),
  });

  const { mutate: doArchive, isPending: isArchiving } = useMutation({
    mutationFn: (id: string) => archiveBundle.fn(id),
    onSuccess: () => {
      toast.success("Bundle archived");
      setArchiveTarget(null);
      setArchiveText("");
      invalidate();
    },
    onError: () => toast.error("Failed to archive bundle"),
  });

  const [restoreTarget, setRestoreTarget] = useState<AdminBundleItem | null>(null);

  const { mutate: doRestore, isPending: isRestoring } = useMutation({
    mutationFn: (id: string) => restoreBundle.fn(id),
    onSuccess: () => {
      toast.success("Bundle restored");
      setRestoreTarget(null);
      invalidate();
    },
    onError: () => toast.error("Failed to restore bundle"),
  });

  const [syncOpen, setSyncOpen] = useState(false);

  const { mutate: doSync, isPending: isSyncing } = useMutation({
    mutationFn: syncJaybartBundles.fn,
    onSuccess: (res) => {
      setSyncOpen(false);
      invalidate();
      toast.success(`Updated ${res.updated} bundle${res.updated !== 1 ? "s" : ""} — ${res.unchanged} unchanged, ${res.unresolved} unresolved`);
    },
    onError: () => toast.error("Jaybart sync failed"),
  });

  const counts = data?.counts ?? {
    active: { mtn: 0, telecel: 0, airteltigo: 0 },
    archived: { mtn: 0, telecel: 0, airteltigo: 0 },
  };
  const bundles = (data?.bundles ?? []).filter(b => b.network === net);
  const visibleCounts = counts[view];
  const activeTotal = Object.values(counts.active).reduce((a, b) => a + b, 0);
  const archivedTotal = Object.values(counts.archived).reduce((a, b) => a + b, 0);

  const volumeNum = parseFloat(createForm.volumeMb);
  const liveName = !isNaN(volumeNum) && volumeNum > 0 ? `${volumeNum} GB` : null;

  const createJaybartOptions = filterByNetwork(jaybartPackages, createForm.network);
  const editJaybartOptions = filterByNetwork(jaybartPackages, editBundle?.network ?? "");

  function submitCreate() {
    const volumeGb = parseFloat(createForm.volumeMb);
    const volumeMb = Math.round(volumeGb * 1024);
    const validityDays = parseInt(createForm.validityDays, 10);
    const priceGhs = Math.round(parseFloat(createForm.priceGhs) * 100);
    const vendorPriceGhs = createForm.vendorPriceGhs
      ? Math.round(parseFloat(createForm.vendorPriceGhs) * 100)
      : null;
    const sortOrder = createForm.sortOrder ? parseInt(createForm.sortOrder, 10) : undefined;
    const jaybartPackageId = createForm.jaybartPackageId ? parseInt(createForm.jaybartPackageId, 10) : null;

    if (isNaN(volumeGb) || volumeGb <= 0) return toast.error("Enter a valid volume in GB");
    if (isNaN(validityDays) || validityDays <= 0) return toast.error("Enter valid validity days");
    if (isNaN(priceGhs) || priceGhs <= 0) return toast.error("Enter a valid public price");
    if (vendorPriceGhs !== null) {
      if (isNaN(vendorPriceGhs) || vendorPriceGhs <= 0) return toast.error("Enter a valid vendor price");
      if (vendorPriceGhs >= priceGhs) return toast.error("Vendor price must be less than public price");
    }

    const jaybartNetworkId = jaybartPackageId
      ? createJaybartOptions.find(p => p.id === jaybartPackageId)?.network_id ?? null
      : null;

    doCreate({ network: createForm.network, volumeMb, validityDays, priceGhs, vendorPriceGhs, sortOrder, jaybartPackageId, jaybartNetworkId });
  }

  function submitEdit() {
    if (!editBundle) return;
    const priceGhs = Math.round(parseFloat(editPrice) * 100);
    if (isNaN(priceGhs) || priceGhs <= 0) return toast.error("Enter a valid public price");

    const vendorPriceGhs = editVendorPrice
      ? Math.round(parseFloat(editVendorPrice) * 100)
      : null;
    if (vendorPriceGhs !== null) {
      if (isNaN(vendorPriceGhs) || vendorPriceGhs <= 0) return toast.error("Enter a valid vendor price");
      if (vendorPriceGhs >= priceGhs) return toast.error("Vendor price must be less than public price");
    }

    const validityDays = parseInt(editValidityDays, 10);
    if (isNaN(validityDays) || validityDays <= 0) return toast.error("Enter valid validity days");

    const jaybartPackageId = editJaybartId === "__none__"
      ? null
      : editJaybartId
        ? parseInt(editJaybartId, 10)
        : undefined;

    const resolvedNetworkId = jaybartPackageId === null
      ? null
      : editJaybartOptions.find(p => p.id === jaybartPackageId)?.network_id ?? null;

    doEdit({
      id: editBundle._id,
      data: {
        displayName: editDisplayName,
        priceGhs,
        vendorPriceGhs,
        validityDays,
        ...(jaybartPackageId !== undefined ? { jaybartPackageId, jaybartNetworkId: resolvedNetworkId } : {}),
      },
    });
  }

  function confirmNetworkToggle() {
    if (!networkToggleTarget) return;
    const next = networkToggleTarget.action === "disable"
      ? [...disabledNetworks, networkToggleTarget.id]
      : disabledNetworks.filter(n => n !== networkToggleTarget.id);
    doNetworkToggle(next);
  }

  function openEdit(b: AdminBundleItem) {
    setEditBundle(b);
    setEditDisplayName(b.displayName ?? "");
    setEditPrice(String(b.priceGhs / 100));
    setEditVendorPrice(b.vendorPriceGhs != null ? String(b.vendorPriceGhs / 100) : "");
    setEditValidityDays(String(b.validityDays));
    setEditJaybartId(b.jaybartPackageId != null ? String(b.jaybartPackageId) : "");
    setEditJaybartNetworkId(b.jaybartNetworkId ?? null);
  }

  return (
    <AdminShell>
      <div className="p-4 md:p-8">
        <div className="flex flex-wrap gap-3 justify-between items-start mb-6">
          <div>
            <h1 className="bh-display text-[28px] md:text-[32px] m-0 tracking-[-0.03em]">Bundle catalog</h1>
            <p className="text-[var(--ink-500)] mt-1 mb-0">Add, edit, or archive what&apos;s for sale.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setSyncOpen(true)}
              variant="outline"
              className="rounded-full gap-1.5"
              disabled={isSyncing}
            >
              <Icon name="refresh" size={14} /> Sync from Jaybart
            </Button>
            {view === "active" && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="rounded-full gap-1.5 bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
              >
                <Icon name="plus" size={14} /> New bundle
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-0.5 p-1 border border-[var(--ink-200)] rounded-full w-fit mb-4">
          {[
            { id: "active" as const, label: "Active", count: activeTotal },
            { id: "archived" as const, label: "Archived", count: archivedTotal },
          ].map(tab => (
            <Button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`rounded-full px-3.5 py-1.5 h-auto text-xs font-semibold gap-1 whitespace-nowrap ${
                view === tab.id
                  ? "bg-[var(--ink-200)] text-[var(--ink-900)]"
                  : "bg-transparent text-[var(--ink-500)] hover:text-[var(--ink-700)] hover:bg-transparent"
              }`}
            >
              {tab.label} <span className={view === tab.id ? "text-white/60" : "text-[var(--ink-400)]"}>{tab.count}</span>
            </Button>
          ))}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {NETWORKS.map(n => {
            const isNetDisabled = disabledNetworks.includes(n.id);
            const isSelected = net === n.id;
            return (
              <div
                key={n.id}
                className={`inline-flex items-center rounded-full border overflow-hidden ${
                  isSelected
                    ? "bg-[var(--brand-500)] border-[var(--brand-500)]"
                    : "bg-[var(--ink-100)] border-[var(--ink-200)]"
                }`}
              >
                <button
                  onClick={() => setNet(n.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold bg-transparent border-none cursor-pointer ${
                    isSelected ? "text-white" : "text-[var(--ink-700)]"
                  }`}
                >
                  <span className={`size-1.5 rounded-full flex-shrink-0 ${isNetDisabled ? "bg-[var(--err)]" : "bg-[var(--ok)]"}`} />
                  <span className={isNetDisabled ? "opacity-50" : ""}>
                    <NetMark network={n.id.toUpperCase()} size="xs" />
                  </span>
                  {n.label}
                  <span className={isSelected ? "text-white/60" : "text-[var(--ink-500)]"}>
                    {visibleCounts[n.id] ?? 0}
                  </span>
                </button>
                <span className={`h-3.5 w-px flex-shrink-0 ${isSelected ? "bg-white/30" : "bg-[var(--ink-300)]"}`} />
                <button
                  onClick={() => setNetworkToggleTarget({ id: n.id, label: n.label, action: isNetDisabled ? "enable" : "disable" })}
                  className={`bg-transparent border-none cursor-pointer px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide ${
                    isSelected ? "text-white/80 hover:text-white" : "text-[var(--ink-500)] hover:text-[var(--ink-700)]"
                  }`}
                >
                  {isNetDisabled ? "Enable" : "Disable"}
                </button>
              </div>
            );
          })}
        </div>

        <Card className="gap-0 rounded-2xl border-[var(--ink-200)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Volume", "Validity", "Public Price", "Vendor Price", "Jaybart Cost", "Sort", "Fulfillment", "Status", ""].map(h => (
                    <TableHead key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-500)] border-b border-[var(--ink-200)] h-auto whitespace-nowrap">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-[var(--ink-100)]">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j} className="px-4 py-4">
                          <div className="h-4 bg-[var(--ink-100)] rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : bundles.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="px-4 py-12 text-center text-[var(--ink-500)] text-sm">
                      No {view} bundles for this network.
                    </TableCell>
                  </TableRow>
                ) : bundles.map(b => (
                  <TableRow key={b._id} className="border-b border-[var(--ink-100)] hover:bg-[var(--ink-50)]/50">
                    <TableCell className="px-4 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <NetMark network={b.network.toUpperCase()} size="sm" />
                        <div>
                          <div className="font-bold whitespace-nowrap">{b.name}</div>
                          <div className="text-xs text-[var(--ink-500)]">{b.volumeMb / 1024} GB</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm whitespace-nowrap">{formatValidity(b.validityDays)}</TableCell>
                    <TableCell className="bh-mono px-4 py-4 font-bold text-sm whitespace-nowrap">{ghsp(b.priceGhs)}</TableCell>
                    <TableCell className="bh-mono px-4 py-4 text-sm whitespace-nowrap">
                      {b.vendorPriceGhs != null
                        ? <span className="font-bold text-[var(--brand-600)]">{ghsp(b.vendorPriceGhs)}</span>
                        : <span className="text-[var(--ink-400)]">—</span>}
                    </TableCell>
                    <TableCell className="bh-mono px-4 py-4 text-sm whitespace-nowrap">
                      {b.jaybartCostGhs != null
                        ? <span className="text-[var(--ink-600)]">{ghsp(b.jaybartCostGhs)}</span>
                        : <span className="text-[var(--ink-400)]">—</span>}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-[var(--ink-500)] text-sm">{b.sortOrder}</TableCell>
                    <TableCell className="px-4 py-4">
                      {b.jaybartPackageId != null ? (
                        <Badge className="rounded-full px-2.5 py-1 h-auto text-xs font-semibold border-transparent bg-[var(--ok-bg)] text-[oklch(0.40_0.18_150)] gap-1 whitespace-nowrap">
                          <span className="size-1.5 rounded-full bg-[var(--ok)]" />
                          ID {b.jaybartPackageId}
                        </Badge>
                      ) : (
                        <Badge className="rounded-full px-2.5 py-1 h-auto text-xs font-semibold border-transparent bg-[var(--warn-bg)] text-[var(--warn)] gap-1 whitespace-nowrap">
                          <span className="size-1.5 rounded-full bg-[var(--warn)]" />
                          Not mapped
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      {b.archivedAt ? (
                        <Badge className="rounded-full px-2.5 py-1 h-auto text-xs font-semibold border-transparent bg-[var(--ink-100)] text-[var(--ink-600)] gap-1.5">
                          <span className="size-1.5 rounded-full bg-[var(--ink-400)]" />
                          Archived
                        </Badge>
                      ) : disabledNetworks.includes(b.network) ? (
                        <Badge className="rounded-full px-2.5 py-1 h-auto text-xs font-semibold border-transparent bg-[var(--err-bg)] text-[oklch(0.40_0.20_25)] gap-1.5">
                          <span className="size-1.5 rounded-full bg-[var(--err)]" />
                          Network off
                        </Badge>
                      ) : (
                        <Badge className="rounded-full px-2.5 py-1 h-auto text-xs font-semibold border-transparent bg-[var(--ok-bg)] text-[oklch(0.40_0.18_150)] gap-1.5">
                          <span className="size-1.5 rounded-full bg-[var(--ok)]" />
                          Live
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right whitespace-nowrap">
                      {b.archivedAt ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-[var(--ink-400)]">
                            {new Date(b.archivedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <Button
                            variant="ghost" size="sm"
                            className="rounded-full text-[var(--brand-400)]"
                            onClick={() => setRestoreTarget(b)}
                          >
                            Restore
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="ghost" size="sm"
                            className="rounded-full text-[var(--ink-700)] mr-1"
                            onClick={() => openEdit(b)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="rounded-full text-[var(--ink-700)]"
                            onClick={() => setArchiveTarget(b)}
                          >
                            Archive
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setCreateForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-[460px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="bh-display text-[20px]">New bundle</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold">Network</Label>
              <Select value={createForm.network} onValueChange={v => setCreateForm(f => ({ ...f, network: v, jaybartPackageId: "", jaybartNetworkId: null }))}>
                <SelectTrigger className="h-auto rounded-xl border-[var(--ink-200)] px-3.5 py-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map(n => (
                    <SelectItem key={n.id} value={n.id}>
                      <span className="flex items-center gap-2">
                        <NetMark network={n.id.toUpperCase()} size="xs" />
                        {n.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold">Volume (GB)</Label>
              <Input
                type="number" step="0.5" placeholder="e.g. 5"
                value={createForm.volumeMb}
                onChange={e => setCreateForm(f => ({ ...f, volumeMb: e.target.value }))}
                className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-sm"
              />
              {liveName && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--ink-500)]">
                  <span className="size-1.5 rounded-full bg-[var(--brand-500)]" />
                  Bundle will be named <strong className="text-[var(--ink-700)]">{liveName}</strong>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold">Validity (days)</Label>
                <Input
                  type="number" placeholder="e.g. 7"
                  value={createForm.validityDays}
                  onChange={e => setCreateForm(f => ({ ...f, validityDays: e.target.value }))}
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-sm"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold">Public price (GHS)</Label>
                <Input
                  type="number" step="0.01" placeholder="e.g. 7.00"
                  value={createForm.priceGhs}
                  onChange={e => setCreateForm(f => ({ ...f, priceGhs: e.target.value }))}
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-600)]">
                Vendor price (GHS) <span className="font-normal">(optional — leave blank to match public)</span>
              </Label>
              <Input
                type="number" step="0.01" placeholder="e.g. 6.00"
                value={createForm.vendorPriceGhs}
                onChange={e => setCreateForm(f => ({ ...f, vendorPriceGhs: e.target.value }))}
                className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-600)]">Sort order <span className="font-normal">(optional)</span></Label>
              <Input
                type="number" placeholder="e.g. 1 — lower = first"
                value={createForm.sortOrder}
                onChange={e => setCreateForm(f => ({ ...f, sortOrder: e.target.value }))}
                className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-600)]">
                Jaybart package <span className="font-normal">(optional)</span>
              </Label>
              <Select
                value={createForm.jaybartPackageId}
                onValueChange={v => {
                  const pkg = createJaybartOptions.find(p => String(p.id) === v);
                  setCreateForm(f => ({ ...f, jaybartPackageId: v, jaybartNetworkId: pkg?.network_id ?? null }));
                }}
              >
                <SelectTrigger className="h-auto rounded-xl border-[var(--ink-200)] px-3.5 py-3 text-sm">
                  <SelectValue placeholder={createJaybartOptions.length ? "Select package" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  {createJaybartOptions.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.volumeGB} GB — GHS {p.console_price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="rounded-full bg-[var(--brand-500)] hover:bg-[var(--brand-600)]" disabled={isCreating} onClick={submitCreate}>
              {isCreating ? "Creating…" : "Create bundle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editBundle !== null} onOpenChange={open => { if (!open) { setEditBundle(null); setEditDisplayName(""); setEditPrice(""); setEditValidityDays(""); setEditJaybartId(""); } }}>
        <DialogContent className="max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="bh-display text-[20px]">Edit bundle</DialogTitle>
          </DialogHeader>
          {editBundle && (
            <div className="flex flex-col gap-4 py-1">
              <div className="flex items-center gap-3 p-3.5 bg-[var(--ink-50)] rounded-xl">
                <NetMark network={editBundle.network.toUpperCase()} size="sm" />
                <div>
                  <div className="font-semibold text-sm">{editBundle.name}</div>
                  <div className="text-xs text-[var(--ink-500)]">
                    {formatValidity(editBundle.validityDays)} · {editBundle.network.toUpperCase()}
                  </div>
                </div>
                <div className="ml-auto bh-mono text-sm font-bold text-[var(--ink-500)]">
                  {ghsp(editBundle.priceGhs)}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold">Display name</Label>
                <Input
                  placeholder={editBundle.name}
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px]"
                />
                <p className="text-[12px] text-[var(--ink-500)] m-0">Leave blank to use the auto-generated name.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <Label className="text-[13px] font-semibold">Public price (GHS)</Label>
                  <Input
                    type="number" step="0.01" placeholder="e.g. 8.50"
                    value={editPrice} autoFocus
                    onChange={e => setEditPrice(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submitEdit()}
                    className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px]"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <Label className="text-[13px] font-semibold text-[var(--ink-600)]">Vendor price <span className="font-normal">(optional)</span></Label>
                  <Input
                    type="number" step="0.01" placeholder="e.g. 7.00"
                    value={editVendorPrice}
                    onChange={e => setEditVendorPrice(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submitEdit()}
                    className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold">Validity (days)</Label>
                <Input
                  type="number" step="1" placeholder="e.g. 30"
                  value={editValidityDays}
                  onChange={e => setEditValidityDays(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitEdit()}
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold">Jaybart package</Label>
                <Select
                  value={editJaybartId}
                  onValueChange={v => {
                    setEditJaybartId(v);
                    if (v === "__none__") {
                      setEditJaybartNetworkId(null);
                    } else {
                      const pkg = editJaybartOptions.find(p => String(p.id) === v);
                      setEditJaybartNetworkId(pkg?.network_id ?? null);
                    }
                  }}
                >
                  <SelectTrigger className="h-auto rounded-xl border-[var(--ink-200)] px-3.5 py-3 text-sm">
                    <SelectValue placeholder={editJaybartOptions.length ? "Select package" : "Loading…"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-[var(--ink-500)]">— No mapping</span>
                    </SelectItem>
                    {editJaybartOptions.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.volumeGB} GB — GHS {p.console_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setEditBundle(null)}>Cancel</Button>
            <Button
              className="rounded-full bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
              disabled={isEditing || !editPrice || isNaN(parseFloat(editPrice))}
              onClick={submitEdit}
            >
              {isEditing ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={syncOpen}
        onOpenChange={open => { if (!open) setSyncOpen(false); }}
        title="Sync bundles from Jaybart?"
        description="This will update jaybartPackageId and Jaybart cost on any active bundle that matches by network + volume. It will not create or delete bundles, and will not touch bundles that are already up to date."
        confirmLabel={isSyncing ? "Syncing…" : "Run sync"}
        confirmDisabled={isSyncing}
        onConfirm={() => doSync()}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={open => { if (!open) { setArchiveTarget(null); setArchiveText(""); } }}
        title={`Archive ${archiveTarget?.name ?? "bundle"}?`}
        description="This bundle will no longer appear for buyers or vendors. You can still inspect it in the archived catalog."
        confirmLabel="Archive"
        variant="destructive"
        confirmDisabled={isArchiving || archiveText !== "ARCHIVE"}
        onConfirm={() => archiveTarget && doArchive(archiveTarget._id)}
      >
        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px] font-semibold text-[var(--ink-700)]">
            Type ARCHIVE to confirm
          </Label>
          <Input
            value={archiveText}
            onChange={e => setArchiveText(e.target.value)}
            placeholder="ARCHIVE"
            className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-[15px]"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={restoreTarget !== null}
        onOpenChange={open => { if (!open) setRestoreTarget(null); }}
        title={`Restore ${restoreTarget?.name ?? "bundle"}?`}
        description="This bundle will become live again and visible to buyers and vendors."
        confirmLabel={isRestoring ? "Restoring…" : "Restore"}
        confirmDisabled={isRestoring}
        onConfirm={() => restoreTarget && doRestore(restoreTarget._id)}
      />

      <Dialog open={networkToggleTarget !== null} onOpenChange={open => { if (!open) setNetworkToggleTarget(null); }}>
        <DialogContent className="max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="bh-display text-[20px]">
              {networkToggleTarget?.action === "disable"
                ? `Disable ${networkToggleTarget.label}?`
                : `Enable ${networkToggleTarget?.label}?`}
            </DialogTitle>
          </DialogHeader>
          {networkToggleTarget && (
            <div className="flex flex-col gap-4 py-1">
              <div className="flex items-center gap-3 p-3.5 bg-[var(--ink-50)] rounded-xl">
                <NetMark network={networkToggleTarget.id.toUpperCase()} size="sm" />
                <div>
                  <div className="font-semibold text-sm">{networkToggleTarget.label}</div>
                  <div className="text-xs text-[var(--ink-500)]">
                    {counts.active[networkToggleTarget.id] ?? 0} active bundle{(counts.active[networkToggleTarget.id] ?? 0) !== 1 ? "s" : ""} affected
                  </div>
                </div>
                <span className={`ml-auto size-2 rounded-full flex-shrink-0 ${networkToggleTarget.action === "disable" ? "bg-[var(--err)]" : "bg-[var(--ok)]"}`} />
              </div>
              <p className={`text-[13px] rounded-xl px-3.5 py-3 leading-relaxed m-0 ${
                networkToggleTarget.action === "disable"
                  ? "bg-[var(--err-bg)] text-[oklch(0.40_0.20_25)]"
                  : "bg-[var(--ok-bg)] text-[oklch(0.40_0.18_150)]"
              }`}>
                {networkToggleTarget.action === "disable"
                  ? `All ${networkToggleTarget.label} bundles will be removed from the public listing and vendor catalog. Any order attempt will be rejected before payment.`
                  : `${networkToggleTarget.label} bundles will reappear for buyers and vendors immediately. Orders will be accepted and fulfilled as normal.`}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setNetworkToggleTarget(null)}>
              Cancel
            </Button>
            <Button
              className={`rounded-full ${
                networkToggleTarget?.action === "disable"
                  ? "bg-[var(--err)] hover:bg-[var(--err)]/90 text-white"
                  : "bg-[var(--ok)] hover:bg-[var(--ok)]/90 text-white"
              }`}
              disabled={isTogglingNetwork}
              onClick={confirmNetworkToggle}
            >
              {isTogglingNetwork
                ? (networkToggleTarget?.action === "disable" ? "Disabling…" : "Enabling…")
                : (networkToggleTarget?.action === "disable" ? `Disable ${networkToggleTarget?.label}` : `Enable ${networkToggleTarget?.label}`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
