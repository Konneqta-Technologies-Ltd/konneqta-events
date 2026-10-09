"use client";

import { useEffect, useRef, useState } from "react";

import {
  ANSWER_TYPES,
  REGISTRATION_LIMITS,
  answerTypeNeedsOptions,
} from "@/lib/events/constants";
import type { AttendeeQuestion } from "@/lib/events/types";

const INPUT_CLASSES =
  "w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-zinc-400 focus:border-(--main-orange) focus:outline-none dark:border-zinc-700 dark:placeholder:text-zinc-500";

/** Split a "one option per line" textarea into clean, deduped options. */
function parseOptions(raw: string): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const line of raw.split("\n")) {
    const option = line.trim();
    const key = option.toLowerCase();
    if (!option || seen.has(key)) continue;
    seen.add(key);
    options.push(option);
  }
  return options;
}

/**
 * Add / edit dialog for custom attendee questions (Step 3). Picking a
 * choice type (Dropdown / Multiple choice / Checkbox) reveals a
 * one-option-per-line textarea. Escape or the backdrop closes.
 */
export default function QuestionEditorModal({
  question,
  onClose,
  onSubmit,
}: {
  /** null = adding a new question; an object = editing it. */
  question: AttendeeQuestion | null;
  onClose: () => void;
  onSubmit: (question: AttendeeQuestion) => void;
}) {
  const [label, setLabel] = useState(question?.label ?? "");
  const [answerType, setAnswerType] = useState(question?.answerType ?? "short_answer");
  const [required, setRequired] = useState(question?.required ?? false);
  const [optionsText, setOptionsText] = useState((question?.options ?? []).join("\n"));
  const [localError, setLocalError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const needsOptions = answerTypeNeedsOptions(answerType);

  // Escape closes; focus lands on the question input straight away.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = () => {
    const trimmed = label.trim();
    if (trimmed.length < REGISTRATION_LIMITS.questionMin) {
      setLocalError(`Question must be at least ${REGISTRATION_LIMITS.questionMin} characters`);
      return;
    }
    if (trimmed.length > REGISTRATION_LIMITS.questionMax) {
      setLocalError(`Question must be ${REGISTRATION_LIMITS.questionMax} characters or fewer`);
      return;
    }
    const options = needsOptions ? parseOptions(optionsText) : [];
    if (needsOptions && options.length < REGISTRATION_LIMITS.optionMin) {
      setLocalError(`Add at least ${REGISTRATION_LIMITS.optionMin} options — one per line`);
      return;
    }
    onSubmit({
      id: question?.id ?? crypto.randomUUID(),
      label: trimmed,
      answerType,
      required,
      options,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — click to close */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-editor-title"
        className="relative flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-xl dark:border-zinc-700"
      >
        <h2 id="question-editor-title" className="text-lg font-semibold tracking-tight">
          {question ? "Edit question" : "Add question"}
        </h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="question-label" className="text-sm font-medium">
            Question
          </label>
          <input
            ref={inputRef}
            id="question-label"
            type="text"
            value={label}
            maxLength={REGISTRATION_LIMITS.questionMax}
            onChange={(e) => {
              setLabel(e.target.value);
              setLocalError(null);
            }}
            placeholder="e.g. What is your company?"
            className={INPUT_CLASSES}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="question-answer-type" className="text-sm font-medium">
            Answer type
          </label>
          <select
            id="question-answer-type"
            value={answerType}
            onChange={(e) => {
              setAnswerType(e.target.value);
              setLocalError(null);
            }}
            className={`${INPUT_CLASSES} bg-background dark:bg-zinc-900 dark:[color-scheme:dark]`}
          >
            {ANSWER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {needsOptions && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="question-options" className="text-sm font-medium">
              Options
            </label>
            <textarea
              id="question-options"
              rows={4}
              value={optionsText}
              onChange={(e) => {
                setOptionsText(e.target.value);
                setLocalError(null);
              }}
              placeholder={"Startup\nEnterprise\nStudent"}
              className={`${INPUT_CLASSES} resize-y`}
            />
            <p className="text-xs text-secondary-text dark:text-zinc-500">
              One option per line — at least {REGISTRATION_LIMITS.optionMin}, up to{" "}
              {REGISTRATION_LIMITS.optionMax}.
            </p>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-(--main-orange)"
          />
          <span className="text-sm font-medium">Required</span>
        </label>

        {localError && <p className="text-xs text-red-500">{localError}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="cursor-pointer rounded-lg bg-main-orange px-5 py-2.5 text-sm font-semibold text-main-text transition-opacity hover:opacity-90"
          >
            {question ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
