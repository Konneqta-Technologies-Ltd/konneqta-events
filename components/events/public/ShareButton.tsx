"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Link icon — matches the inline SVG style used across the app. */
function LinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/**
 * Copy-link share button for the public event page — copies the current
 * URL to the clipboard and confirms with a toast. Degrades to a hint when
 * the clipboard API isn't available.
 */
export default function ShareButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied — share it anywhere");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — copy the link from the address bar instead");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 ${className ?? ""}`}
    >
      <LinkIcon />
      {copied ? "Copied" : "Share"}
    </button>
  );
}
