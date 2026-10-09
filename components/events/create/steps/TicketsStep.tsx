"use client";

import { useEffect, useRef } from "react";

import { TICKET_CURRENCIES, TICKET_LIMITS } from "@/lib/events/constants";
import {
  emptyTicket,
  type TicketData,
  type TicketFieldErrors,
  type TicketsErrors,
} from "@/lib/events/types";

const ERROR_TEXT_CLASSES = "mt-1.5 text-xs text-red-500";

const inputClasses = (hasError?: string) =>
  `w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-zinc-500 ${
    hasError
      ? "border-red-500 focus:border-red-500"
      : "border-border focus:border-(--main-orange) dark:border-zinc-700"
  }`;

const LABEL_CLASSES = "text-sm font-medium";
const OPTIONAL_HINT_CLASSES = "font-normal text-secondary-text dark:text-zinc-400";

/** True when the ticket costs nothing (empty price or 0). */
const isFree = (ticket: TicketData) => {
  const price = ticket.price.trim();
  return price === "" || Number(price) === 0;
};

/**
 * One ticket type card — name, price + currency, quantity, description
 * and an optional sales window (an early bird is a cheaper ticket whose
 * window closes earlier). Remove drops the type from the event.
 */
function TicketCard({
  ticket,
  number,
  error,
  onChange,
  onRemove,
}: {
  ticket: TicketData;
  number: number;
  error?: TicketFieldErrors;
  onChange: (patch: Partial<TicketData>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border p-5 dark:border-zinc-700">
      {/* Card header — ordinal + FREE / priced badge */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Ticket {number}</h3>
        {isFree(ticket) ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            FREE
          </span>
        ) : (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
            {ticket.currency} {ticket.price.trim()}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`ticket-name-${ticket.id}`} className={LABEL_CLASSES}>
            Name
          </label>
          <input
            id={`ticket-name-${ticket.id}`}
            type="text"
            value={ticket.name}
            maxLength={TICKET_LIMITS.nameMax}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={number === 1 ? "General Admission" : "e.g. VIP, Student"}
            className={inputClasses(error?.name)}
          />
          {error?.name && (
            <p data-field-error className={ERROR_TEXT_CLASSES}>
              {error.name}
            </p>
          )}
        </div>

        {/* Price / currency / quantity */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`ticket-price-${ticket.id}`} className={LABEL_CLASSES}>
              Price
            </label>
            <input
              id={`ticket-price-${ticket.id}`}
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={ticket.price}
              onChange={(e) => onChange({ price: e.target.value })}
              placeholder="0 — free"
              className={inputClasses(error?.price)}
            />
            {error?.price && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {error.price}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`ticket-currency-${ticket.id}`} className={LABEL_CLASSES}>
              Currency
            </label>
            <select
              id={`ticket-currency-${ticket.id}`}
              value={ticket.currency}
              onChange={(e) => onChange({ currency: e.target.value })}
              className={`${inputClasses()} cursor-pointer`}
            >
              {TICKET_CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`ticket-quantity-${ticket.id}`} className={LABEL_CLASSES}>
              Quantity
            </label>
            <input
              id={`ticket-quantity-${ticket.id}`}
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={ticket.quantity}
              onChange={(e) => onChange({ quantity: e.target.value })}
              placeholder="e.g. 500"
              className={inputClasses(error?.quantity)}
            />
            {error?.quantity && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {error.quantity}
              </p>
            )}
          </div>
        </div>
        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`ticket-description-${ticket.id}`} className={LABEL_CLASSES}>
            Description <span className={OPTIONAL_HINT_CLASSES}>(optional)</span>
          </label>
          <textarea
            id={`ticket-description-${ticket.id}`}
            value={ticket.description}
            maxLength={TICKET_LIMITS.descriptionMax}
            rows={2}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What this ticket includes — e.g. general access to the event"
            className={`${inputClasses(error?.description)} resize-none`}
          />
          {error?.description && (
            <p data-field-error className={ERROR_TEXT_CLASSES}>
              {error.description}
            </p>
          )}
        </div>

        {/* Sales window — enables early birds by timing cheaper tickets */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`ticket-sales-start-${ticket.id}`} className={LABEL_CLASSES}>
              Sales start <span className={OPTIONAL_HINT_CLASSES}>(optional)</span>
            </label>
            <input
              id={`ticket-sales-start-${ticket.id}`}
              type="date"
              value={ticket.salesStart}
              onChange={(e) => onChange({ salesStart: e.target.value })}
              className={inputClasses(error?.salesStart)}
            />
            {error?.salesStart && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {error.salesStart}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`ticket-sales-end-${ticket.id}`} className={LABEL_CLASSES}>
              Sales end <span className={OPTIONAL_HINT_CLASSES}>(optional)</span>
            </label>
            <input
              id={`ticket-sales-end-${ticket.id}`}
              type="date"
              value={ticket.salesEnd}
              onChange={(e) => onChange({ salesEnd: e.target.value })}
              className={inputClasses(error?.salesEnd)}
            />
            {error?.salesEnd && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {error.salesEnd}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Remove — bottom right */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="cursor-pointer rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

/**
 * Step 4 — Tickets. Every event needs at least one ticket type; the MVP
 * creates free tickets but the model (price / currency / sales window)
 * is payments-ready. Auto-seeds an editable "General Admission" card so
 * the step never starts empty.
 */
export default function TicketsStep({
  tickets,
  errors,
  onChange,
}: {
  tickets: TicketData[];
  errors: TicketsErrors;
  onChange: (tickets: TicketData[]) => void;
}) {
  // Seed one editable "General Admission" card on first mount when the
  // draft has no tickets yet (guarded so it happens exactly once).
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || tickets.length > 0) return;
    seeded.current = true;
    onChange([emptyTicket("General Admission")]);
  }, [tickets, onChange]);

  const patchTicket = (id: string, patch: Partial<TicketData>) =>
    onChange(tickets.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket)));

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Tickets</h2>
        <p className="mt-1 text-sm text-secondary-text dark:text-zinc-400">
          What does an attendee register for? Your event needs at least one
          ticket type — payments are not live yet, so tickets are free for now.
        </p>
      </div>

      {tickets.length === 0 && (
        <p className="text-xs text-secondary-text dark:text-zinc-500">
          No ticket types yet — add one so attendees can register.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {tickets.map((ticket, index) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            number={index + 1}
            error={errors.items?.[ticket.id]}
            onChange={(patch) => patchTicket(ticket.id, patch)}
            onRemove={() => onChange(tickets.filter((entry) => entry.id !== ticket.id))}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...tickets, emptyTicket()])}
        disabled={tickets.length >= TICKET_LIMITS.maxTickets}
        className="self-start cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-secondary-text transition-colors hover:border-zinc-400 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
      >
        + Add ticket
      </button>
      {errors.tickets && (
        <p data-field-error className={ERROR_TEXT_CLASSES}>
          {errors.tickets}
        </p>
      )}
    </section>
  );
}

