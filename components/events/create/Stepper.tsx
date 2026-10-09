"use client";

import { WIZARD_STEPS } from "@/lib/events/constants";

/** Check mark shown in place of the number on completed steps. */
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

/**
 * Wizard progress header — numbered steps with done / current / locked
 * states. Steps up to `maxVisited` are clickable (the wizard lenient-saves
 * a draft before jumping so no edits are lost); future steps stay locked
 * until reached. Labels collapse to numbers below lg so all six fit.
 */
export default function Stepper({
  current,
  maxVisited,
  onSelect,
  disabled = false,
}: {
  current: number;
  maxVisited: number;
  onSelect: (step: number) => void;
  disabled?: boolean;
}) {
  return (
    <nav aria-label="Create event progress">
      <ol className="flex items-center gap-1 sm:gap-2">
        {WIZARD_STEPS.map(({ step, label }, index) => {
          const isDone = step < current;
          const isCurrent = step === current;
          const isLocked = step > maxVisited;
          const clickable = !isCurrent && !isLocked && !disabled;

          return (
            <li key={step} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`h-px flex-1 ${
                    step <= current ? "bg-main-orange" : "bg-border dark:bg-zinc-700"
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => clickable && onSelect(step)}
                disabled={!clickable}
                aria-current={isCurrent ? "step" : undefined}
                title={`Step ${step}: ${label}`}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-1 py-1 sm:pr-2 ${
                  clickable ? "cursor-pointer hover:opacity-75" : "cursor-default"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                    isCurrent
                      ? "border-(--main-orange) bg-main-orange text-main-text"
                      : isDone
                        ? "border-(--main-orange) bg-main-orange/10 text-(--main-orange)"
                        : isLocked
                          ? "border-border bg-background text-zinc-400 opacity-70 dark:border-zinc-700 dark:text-zinc-500"
                          : "border-border bg-background text-secondary-text dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {isDone ? <CheckIcon /> : step}
                </span>
                <span
                  className={`hidden whitespace-nowrap text-xs font-medium lg:block ${
                    isCurrent ? "text-foreground" : "text-secondary-text dark:text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
