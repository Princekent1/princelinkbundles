"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type AnnouncementItem,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icons";

const EMPTY_FORM = {
  title: "",
  body: "",
  ctaLabel: "",
  ctaUrl: "",
  audience: [] as ("public" | "vendor")[],
  isActive: true,
};

function AudienceBadge({ a }: { a: "public" | "vendor" }) {
  const isPublic = a === "public";
  return (
    <Badge
      className="rounded-full px-2 py-0.5 h-auto text-xs font-semibold border-transparent gap-1 whitespace-nowrap"
      style={{
        background: isPublic ? "var(--ok-bg)" : "color-mix(in oklch, var(--brand-500) 12%, transparent)",
        color: isPublic ? "oklch(0.40 0.18 150)" : "var(--brand-500)",
      }}
    >
      {isPublic ? "Public" : "Vendor"}
    </Badge>
  );
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"active" | "hidden">("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AnnouncementItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: getAdminAnnouncements.key(view),
    queryFn: () => getAdminAnnouncements.fn(view),
  });

  const announcements = data?.announcements ?? [];
  const counts = data?.counts ?? { active: 0, hidden: 0 };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
  };

  const { mutate: doCreate, isPending: isCreating } = useMutation({
    mutationFn: () =>
      createAnnouncement.fn({
        title: form.title.trim(),
        body: form.body.trim() || undefined,
        ctaLabel: form.ctaLabel.trim() || undefined,
        ctaUrl: form.ctaUrl.trim() || undefined,
        audience: form.audience,
        isActive: form.isActive,
      }),
    onSuccess: () => {
      toast.success("Announcement created");
      closeForm();
      invalidate();
    },
    onError: (err: { message: string }) =>
      toast.error(err.message ?? "Failed to create announcement"),
  });

  const { mutate: doEdit, isPending: isEditing } = useMutation({
    mutationFn: () =>
      updateAnnouncement.fn(editTarget!._id, {
        title: form.title.trim(),
        body: form.body.trim() || undefined,
        ctaLabel: form.ctaLabel.trim() || undefined,
        ctaUrl: form.ctaUrl.trim() || undefined,
        audience: form.audience,
        isActive: form.isActive,
      }),
    onSuccess: () => {
      toast.success("Announcement updated");
      closeForm();
      invalidate();
    },
    onError: (err: { message: string }) =>
      toast.error(err.message ?? "Failed to update announcement"),
  });

  const { mutate: doToggle } = useMutation({
    mutationFn: (a: AnnouncementItem) =>
      updateAnnouncement.fn(a._id, { isActive: !a.isActive }),
    onSuccess: (_, a) => {
      toast.success(a.isActive ? "Hidden" : "Made active");
      invalidate();
    },
    onError: () => toast.error("Failed to update visibility"),
  });

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteAnnouncement.fn(deleteTarget!._id),
    onSuccess: () => {
      toast.success("Announcement deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: () => toast.error("Failed to delete announcement"),
  });

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(a: AnnouncementItem) {
    setEditTarget(a);
    setForm({
      title: a.title,
      body: a.body ?? "",
      ctaLabel: a.ctaLabel ?? "",
      ctaUrl: a.ctaUrl ?? "",
      audience: [...a.audience],
      isActive: a.isActive,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  }

  function toggleAudience(v: "public" | "vendor") {
    setForm((f) => ({
      ...f,
      audience: f.audience.includes(v)
        ? f.audience.filter((a) => a !== v)
        : [...f.audience, v],
    }));
  }

  const submitDisabled =
    !form.title.trim() ||
    form.audience.length === 0 ||
    isCreating ||
    isEditing;

  return (
    <div style={{ padding: "32px 28px", maxWidth: 900, margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="bh-display text-2xl font-bold text-[var(--ink-900)]">
            Announcements
          </h1>
          <p className="text-sm text-[var(--ink-500)] mt-0.5">
            Manage announcements shown to users on the platform
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="rounded-full bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white gap-2"
        >
          <Icon name="plus" size={15} />
          New announcement
        </Button>
      </div>

      <div className="flex gap-0.5 p-1 border border-[var(--ink-200)] rounded-full w-fit mb-4">
        {(
          [
            { id: "active" as const, label: "Active", count: counts.active },
            { id: "hidden" as const, label: "Hidden", count: counts.hidden },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`rounded-full px-3.5 py-1.5 h-auto text-xs font-semibold gap-1 whitespace-nowrap ${
              view === tab.id
                ? "bg-[var(--ink-200)] text-[var(--ink-900)]"
                : "bg-transparent text-[var(--ink-500)] hover:text-[var(--ink-700)] hover:bg-transparent"
            }`}
          >
            {tab.label}{" "}
            <span
              className={
                view === tab.id ? "text-white/60" : "text-[var(--ink-400)]"
              }
            >
              {tab.count}
            </span>
          </Button>
        ))}
      </div>

      <Card className="gap-0 rounded-2xl border-[var(--ink-200)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Body</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-[var(--ink-100)] rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : announcements.length === 0
              ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-[var(--ink-400)] text-sm"
                    >
                      No {view} announcements
                    </TableCell>
                  </TableRow>
                )
              : announcements.map((a) => (
                  <TableRow key={a._id}>
                    <TableCell className="font-semibold text-[var(--ink-900)] max-w-[180px]">
                      <span className="block truncate">{a.title}</span>
                    </TableCell>
                    <TableCell className="text-[var(--ink-600)] text-sm max-w-[220px]">
                      {a.body ? (
                        <span className="block truncate">{a.body}</span>
                      ) : (
                        <span className="text-[var(--ink-300)]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {a.audience.map((aud) => (
                          <AudienceBadge key={aud} a={aud} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--ink-500)] whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg text-[var(--ink-500)] hover:text-[var(--ink-900)]"
                          onClick={() => openEdit(a)}
                          title="Edit"
                        >
                          <Icon name="pencil" size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[var(--ink-500)] hover:text-[var(--ink-900)]"
                          onClick={() => doToggle(a)}
                          title={a.isActive ? "Hide" : "Make active"}
                        >
                          {a.isActive ? "Hide" : "Make active"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg text-[var(--err)] hover:text-[var(--err)] hover:bg-[color-mix(in_oklch,var(--err)_10%,transparent)]"
                          onClick={() => setDeleteTarget(a)}
                          title="Delete"
                        >
                          <Icon name="trash" size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
      >
        <DialogContent className="max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="bh-display text-[20px]">
              {editTarget ? "Edit announcement" : "New announcement"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">
                Title <span className="text-[var(--err)]">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. New bundle packages available"
                className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">
                Body
              </Label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Optional description or details..."
                rows={3}
                className="rounded-xl border border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-sm text-[var(--ink-900)] placeholder:text-[var(--ink-400)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold text-[var(--ink-700)]">
                  CTA label
                </Label>
                <Input
                  value={form.ctaLabel}
                  onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                  placeholder="e.g. Learn more"
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-semibold text-[var(--ink-700)]">
                  CTA URL
                </Label>
                <Input
                  value={form.ctaUrl}
                  onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                  placeholder="https://..."
                  className="h-auto rounded-xl border-[var(--ink-200)] bg-[var(--ink-100)] px-3.5 py-3 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[13px] font-semibold text-[var(--ink-700)]">
                Audience <span className="text-[var(--err)]">*</span>
              </Label>
              <div className="flex gap-3">
                {(["public", "vendor"] as const).map((a) => {
                  const checked = form.audience.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAudience(a)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
                      style={{
                        border: checked
                          ? "2px solid var(--brand-500)"
                          : "1.5px solid var(--ink-200)",
                        background: checked
                          ? "color-mix(in oklch, var(--brand-500) 8%, transparent)"
                          : "var(--ink-100)",
                        color: checked ? "var(--brand-500)" : "var(--ink-600)",
                      }}
                    >
                      <span
                        className="flex items-center justify-center w-4 h-4 rounded border transition-colors"
                        style={{
                          background: checked ? "var(--brand-500)" : "transparent",
                          borderColor: checked ? "var(--brand-500)" : "var(--ink-300)",
                        }}
                      >
                        {checked && (
                          <Icon name="check" size={11} />
                        )}
                      </span>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  );
                })}
              </div>
              {form.audience.length === 0 && (
                <p className="text-xs text-[var(--ink-400)]">
                  Select at least one audience
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={closeForm}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white"
              disabled={submitDisabled}
              onClick={() => (editTarget ? doEdit() : doCreate())}
            >
              {isCreating || isEditing
                ? editTarget
                  ? "Saving…"
                  : "Creating…"
                : editTarget
                ? "Save changes"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete "${deleteTarget?.title ?? "announcement"}"?`}
        description="This cannot be undone. The announcement will be permanently removed."
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        variant="destructive"
        confirmDisabled={isDeleting}
        onConfirm={() => doDelete()}
      />
    </div>
  );
}
