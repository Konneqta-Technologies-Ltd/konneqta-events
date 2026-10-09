import Link from "next/link";

/**
 * "Create event" CTA — used in the My Events page header (default) and in
 * the empty state ("Create events", size lg). Enters the create-event
 * wizard at step 1 (Basic Information).
 */
export default function CreateEventButton({
  label = "Create event",
  size = "md",
}: {
  label?: string;
  size?: "md" | "lg";
}) {
  return (
    <Link
      href="/events/create/1"
      className={
        size === "lg"
          ? "rounded-lg bg-main-orange px-6 py-3 text-base font-medium text-main-text transition-opacity hover:opacity-90"
          : "rounded-lg bg-main-orange px-4 py-2.5 text-sm font-semibold text-main-text transition-opacity hover:opacity-90"
      }
    >
      {label}
    </Link>
  );
}
