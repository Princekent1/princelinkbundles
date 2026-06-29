"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import type { PublicAnnouncementItem } from "@/api";

const SLIDE_INTERVAL = 5000;

interface AnnouncementsCarouselProps {
  queryKey: unknown[];
  queryFn: () => Promise<{ announcements: PublicAnnouncementItem[] }>;
}

export function AnnouncementsCarousel({ queryKey, queryFn }: AnnouncementsCarouselProps) {
  const { data } = useQuery({
    queryKey,
    queryFn,
    staleTime: 60_000,
  });

  const items = data?.announcements ?? [];

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (items.length > 0 && !open) {
      setOpen(true);
      setIndex(0);
    }
  }, [items.length]);

  useEffect(() => {
    if (!open || items.length <= 1 || paused) return;

    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, SLIDE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, items.length, paused]);

  function go(dir: -1 | 1) {
    setPaused(true);
    setIndex((i) => (i + dir + items.length) % items.length);
  }

  if (!open || items.length === 0) return null;

  const current = items[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="relative w-full max-w-[420px] mx-4 rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "var(--ink-50)", border: "1px solid var(--ink-200)" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Close X */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--ink-500)] hover:text-[var(--ink-900)] hover:bg-[var(--ink-100)] transition-colors"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
          aria-label="Close"
        >
          <Icon name="x" size={16} />
        </button>

        <div className="px-7 pt-7 pb-2 flex-1">
          {/* Slide counter hint */}
          {items.length > 1 && (
            <p className="text-[11px] font-semibold text-[var(--ink-400)] uppercase tracking-widest mb-4">
              {index + 1} of {items.length}
            </p>
          )}

          <h2
            className="bh-display font-bold text-[var(--ink-900)] leading-tight"
            style={{ fontSize: 20, marginBottom: current.body ? 10 : 0 }}
          >
            {current.title}
          </h2>

          {current.body && (
            <p className="text-sm text-[var(--ink-600)] leading-relaxed mt-2">
              {current.body}
            </p>
          )}

          {current.ctaLabel && current.ctaUrl && (
            <a
              href={current.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-[var(--brand-500)] hover:text-[var(--brand-600)] transition-colors"
            >
              {current.ctaLabel}
              <Icon name="ext" size={13} />
            </a>
          )}
        </div>

        {/* Dots */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-4 pb-1">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setPaused(true); setIndex(i); }}
                className="transition-all rounded-full"
                style={{
                  width: i === index ? 20 : 6,
                  height: 6,
                  background: i === index ? "var(--brand-500)" : "var(--ink-300)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 px-7 py-5">
          {items.length > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--ink-200)] text-[var(--ink-600)] hover:text-[var(--ink-900)] hover:bg-[var(--ink-100)] transition-colors"
                style={{ background: "transparent", cursor: "pointer" }}
                aria-label="Previous"
              >
                <Icon name="arrow-left" size={14} />
              </button>
              <button
                onClick={() => go(1)}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--ink-200)] text-[var(--ink-600)] hover:text-[var(--ink-900)] hover:bg-[var(--ink-100)] transition-colors"
                style={{ background: "transparent", cursor: "pointer" }}
                aria-label="Next"
              >
                <Icon name="arrow-right" size={14} />
              </button>
            </>
          )}
          <div style={{ flex: 1 }} />
          <Button
            onClick={() => setOpen(false)}
            className="rounded-full bg-[var(--ink-200)] hover:bg-[var(--ink-300)] text-[var(--ink-900)] text-sm font-semibold px-5"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
