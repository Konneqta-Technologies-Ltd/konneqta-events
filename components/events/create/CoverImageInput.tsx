"use client";

/* eslint-disable @next/next/no-img-element */
// Blob object URLs can't go through next/image optimization — a plain
// <img> is the right tool for local File previews.

import { useEffect, useRef, useState } from "react";

import { COVER_IMAGE_RULES } from "@/lib/events/constants";

/** Upload icon inside the empty dropzone. */
function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-8 w-8"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 7.5L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Cover image picker — click or drag & drop. Type and size are hard
 * errors (rejected immediately); the aspect ratio vs the 1200×630
 * recommendation is only a soft warning. The selected File travels in
 * wizard state and is uploaded to the "event-covers" bucket on the next
 * save; coverImageUrl is what a previous save already stored.
 */
export default function CoverImageInput({
  coverImage,
  coverImageUrl,
  error,
  onChange,
}: {
  coverImage: File | null;
  coverImageUrl: string | null;
  error?: string;
  onChange: (patch: { coverImage: File | null; coverImageUrl: string | null }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Revoke the last object URL on change/unmount so blobs don't leak.
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  /** Preview the file and softly warn when the aspect ratio is far off. */
  const showPreview = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const target =
      COVER_IMAGE_RULES.recommendedWidth / COVER_IMAGE_RULES.recommendedHeight;
    const probe = new Image();
    probe.onload = () => {
      const actual = probe.naturalWidth / probe.naturalHeight;
      if (Math.abs(actual - target) / target > 0.15) {
        setWarning(
          `Heads up: this image is ${probe.naturalWidth}×${probe.naturalHeight} — ` +
            `${COVER_IMAGE_RULES.recommendedWidth}×${COVER_IMAGE_RULES.recommendedHeight} looks best.`
        );
      }
    };
    probe.src = url;
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setWarning(null);
    setLocalError(null);
  };

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    setLocalError(null);
    setWarning(null);
    if (!(COVER_IMAGE_RULES.acceptedTypes as readonly string[]).includes(file.type)) {
      setLocalError("Please choose a JPG, PNG or WebP image");
      return;
    }
    if (file.size > COVER_IMAGE_RULES.maxSizeMb * 1024 * 1024) {
      setLocalError(`Image must be ${COVER_IMAGE_RULES.maxSizeMb}MB or smaller`);
      return;
    }
    showPreview(file);
    onChange({ coverImage: file, coverImageUrl: null });
  };

  const remove = () => {
    clearPreview();
    onChange({ coverImage: null, coverImageUrl: null });
  };

  const hasImage = Boolean(previewUrl ?? coverImageUrl);

  return (
    <div>
      {/* Hidden input — the dropzone and Replace button trigger it. */}
      <input
        ref={inputRef}
        type="file"
        accept={COVER_IMAGE_RULES.acceptedExtensions}
        className="sr-only"
        onChange={(e) => {
          acceptFile(e.target.files?.[0]);
          e.target.value = ""; // re-picking the same file must re-fire
        }}
      />

      {!hasImage ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${
            dragging
              ? "border-(--main-orange) bg-main-orange/5"
              : "border-border hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
          }`}
        >
          <span className="text-zinc-400">
            <UploadIcon />
          </span>
          <span className="mt-3 text-sm font-medium">Click or drag to upload</span>
          <span className="mt-1 text-xs text-secondary-text dark:text-zinc-500">
            {COVER_IMAGE_RULES.recommendedWidth}×{COVER_IMAGE_RULES.recommendedHeight}{" "}
            recommended · JPG, PNG or WebP · max {COVER_IMAGE_RULES.maxSizeMb}MB
          </span>
        </button>
      ) : (
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-border dark:border-zinc-700">
            <img
              src={previewUrl ?? coverImageUrl ?? ""}
              alt="Event cover preview"
              className="aspect-video w-full object-cover"
            />
            <button
              type="button"
              onClick={remove}
              aria-label="Remove cover image"
              className="absolute right-3 top-3 cursor-pointer rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-red-500/80"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-xs text-secondary-text dark:text-zinc-500">
              {coverImage
                ? `${coverImage.name} · ${formatBytes(coverImage.size)}`
                : "Saved cover"}
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="shrink-0 cursor-pointer text-xs font-medium text-(--main-orange) hover:underline"
            >
              Replace
            </button>
          </div>
        </div>
      )}

      {(error || localError) && (
        <p data-field-error={error ? "true" : undefined} className="mt-1.5 text-xs text-red-500">
          {error ?? localError}
        </p>
      )}
      {!error && !localError && warning && (
        <p className="mt-1.5 text-xs text-amber-500">{warning}</p>
      )}
    </div>
  );
}
