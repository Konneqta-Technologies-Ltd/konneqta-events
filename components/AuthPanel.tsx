"use client";

import Joi from "joi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

import SignInWithGoogle from "@/components/SignInWithGoogle";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";
type Role = "attendee" | "organizer";

/* ── Validation (same rules as the Konneqta reference project) ────────── */

const loginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            "string.empty": "Email is required",
            "string.email": "Please enter a valid email address",
        }),
    password: Joi.string()
        .min(6)
        .required()
        .messages({
            "string.empty": "Password is required",
            "string.min": "Password must be at least 6 characters",
        }),
});

const signupSchema = Joi.object({
    firstName: Joi.string()
        .required()
        .messages({
            "string.empty": "First name is required",
        }),
    lastName: Joi.string()
        .required()
        .messages({
            "string.empty": "Last name is required",
        }),
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            "string.empty": "Email is required",
            "string.email": "Please enter a valid email address",
        }),
    password: Joi.string()
        .min(6)
        .required()
        .messages({
            "string.empty": "Password is required",
            "string.min": "Password must be at least 6 characters",
        }),
    confirmPassword: Joi.string()
        .valid(Joi.ref("password"))
        .required()
        .messages({
            "string.empty": "Please confirm your password",
            "any.only": "Passwords do not match",
        }),
});

/* ── Shared input styling (ported from the Konneqta auth forms) ───────── */

const INPUT_CLASSES =
    "border pl-2 border-zinc-700 dark:border-white/50 w-full h-13 rounded-xl focus:border-(--main-orange) focus:outline-none";
const PASSWORD_INPUT_CLASSES =
    "border border-zinc-700 pl-2 pr-10 dark:border-white/50 w-full h-13 rounded-xl focus:border-(--main-orange) focus:outline-none";

/* ── Password visibility toggles (same icons as Konneqta) ─────────────── */

function EyeOffIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
    );
}

function EyeOnIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function PasswordField({
    id,
    label,
    value,
    onChange,
    show,
    onToggle,
    placeholder,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
}) {
    return (
        <div className="pb-4 flex flex-col mx-auto gap-1 w-full">
            <label htmlFor={id}>{label}</label>
            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    className={PASSWORD_INPUT_CLASSES}
                    id={id}
                    name={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                    {show ? <EyeOffIcon /> : <EyeOnIcon />}
                </button>
            </div>
        </div>
    );
}

/**
 * Inline auth card for the Create events page. No separate /auth pages —
 * the card toggles between Login and Sign up in place, with the same
 * fields, validation, styling and Google button as the Konneqta reference
 * project's auth forms. Flips into a signed-in view via onAuthStateChange.
 *
 * `redirectTo` (e.g. "/e/<id>") sends the user back where they came from
 * after signing in — /create?next=… passes it through for flows like
 * "Sign in to register".
 */
export default function AuthPanel({ redirectTo }: { redirectTo?: string }) {
    const router = useRouter();

    const [mode, setMode] = useState<Mode>("login");
    const [role, setRole] = useState<Role>("attendee");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Session state — the panel flips between the auth card and the
    // signed-in view as the user signs in / out.
    const [session, setSession] = useState<Session | null>(null);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        // Browser-only setup runs inside the timer callback, not the
        // effect body (lint rule: react-hooks/set-state-in-effect). The
        // Supabase client is created here — not at render time — so
        // prerendering never needs the env vars, and createBrowserClient
        // memoizes, so all callers share one client.
        const timer = setTimeout(() => {
            let supabase: ReturnType<typeof createClient>;
            try {
                supabase = createClient();
            } catch {
                // .env.local not filled in yet — say so instead of
                // spinning on the session check forever.
                toast.error(
                    "Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server."
                );
                setCheckingSession(false);
                return;
            }

            // Bootstrap the current session, then keep it in sync with any
            // auth change (login, signup, Google callback, sign out).
            supabase.auth.getSession().then(({ data }) => {
                setSession(data.session);
                setCheckingSession(false);
            });

            const {
                data: { subscription },
            } = supabase.auth.onAuthStateChange((_event, newSession) => {
                setSession(newSession);
                setCheckingSession(false);
            });
            unsubscribe = () => subscription.unsubscribe();
        }, 0);

        return () => {
            clearTimeout(timer);
            unsubscribe?.();
        };
    }, []);

    // Signed in on /create? Straight into the dashboard (or back to the
    // page that sent the user here to sign in).
    useEffect(() => {
        if (session?.user) {
            router.replace(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/events");
        }
    }, [session, router, redirectTo]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate with Joi before submitting
        const { error: validationError } = loginSchema.validate(
            { email, password },
            { abortEarly: false }
        );

        if (validationError) {
            validationError.details.forEach((detail) => {
                toast.error(detail.message);
            });
            return;
        }

        setIsLoading(true);

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            toast.error(error.message);
            setIsLoading(false);
            return;
        }

        // No navigation needed — onAuthStateChange flips this panel into
        // its signed-in view in place (same page, no separate destination).
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate with Joi before submitting
        const { error: validationError } = signupSchema.validate(
            { firstName, lastName, email, password, confirmPassword },
            { abortEarly: false }
        );

        if (validationError) {
            validationError.details.forEach((detail) => {
                toast.error(detail.message);
            });
            return;
        }

        setIsLoading(true);

        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    display_name: `${firstName} ${lastName}`,
                    role,
                },
            },
        });
        if (error) {
            toast.error(error.message);
            setIsLoading(false);
            return;
        }
        // Supabase returns empty identities when email is already registered
        if (!data.user?.identities?.length) {
            toast.error("This email is already registered. Please log in instead.");
            setIsLoading(false);
            return;
        }

        if (data.session) {
            // Email confirmation disabled in Supabase — signed in straight away.
            toast.success("Account created successfully!");
        } else {
            // Email confirmation enabled — same flow as the Konneqta app:
            // prompt the user to verify, then switch to the login form.
            toast.success("Account created successfully! Please check your email to verify your account.");
            setMode("login");
        }
        setIsLoading(false);
    };

    // 1. Still checking for an existing session — keep the layout stable.
    if (checkingSession) {
        return (
            <div className="flex w-full max-w-md items-center justify-center rounded-2xl border border-border bg-background p-10 dark:border-zinc-700">
                <Spinner size="md" className="text-zinc-400" />
            </div>
        );
    }

    const user = session?.user;

    // 2. Signed in — hand off to the dashboard. The redirect effect above
    //    navigates to /events; this card keeps the layout stable meanwhile.
    if (user) {
        return (
            <div className="flex w-full max-w-md items-center justify-center gap-3 rounded-2xl border border-border bg-background p-10 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                <Spinner size="sm" />
                Signed in — taking you to your events…
            </div>
        );
    }

    // 3. Signed out — the switchable login / signup card.
    return (
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 sm:p-8 dark:border-zinc-700">
            {/* Login ⇄ Sign up switch */}
            <div
                className="mb-8 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
                role="tablist"
                aria-label="Sign in or create an account"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "login"}
                    onClick={() => setMode("login")}
                    className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                        mode === "login"
                            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                >
                    Login
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "signup"}
                    onClick={() => setMode("signup")}
                    className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                        mode === "signup"
                            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                >
                    Sign up
                </button>
            </div>

            <div className="text-center pb-8">
                <h2 className="text-2xl font-extrabold">
                    {mode === "login" ? "Login your account" : "Create your account"}
                </h2>
                <p className="dark:text-[#737373]">Create and share events in minutes</p>
            </div>

            {mode === "login" ? (
                <form onSubmit={handleLogin} className="max-w-full mx-auto flex flex-col">
                    <div className="pb-4 flex flex-col mx-auto gap-1 w-full">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            className={INPUT_CLASSES}
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@email.com"
                        />
                    </div>
                    <PasswordField
                        id="password"
                        label="Password"
                        value={password}
                        onChange={setPassword}
                        show={showPassword}
                        onToggle={() => setShowPassword(!showPassword)}
                        placeholder="Enter password"
                    />

                    <button
                        className="mt-4 bg-(--main-orange) text-white w-full cursor-pointer font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading && <Spinner size="sm" className="text-white" />}
                        {isLoading ? "Logging in..." : "Continue"}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleSignUp} className="max-w-full mx-auto flex flex-col">
                    {/* Account type — attendees register for events; organizers create them. */}
                    <div className="pb-4 flex flex-col gap-1 w-full" role="radiogroup" aria-label="Account type">
                        <span className="text-sm font-medium">I want to…</span>
                        <div className="grid grid-cols-2 gap-2">
                            <label
                                className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                                    role === "attendee"
                                        ? "border-(--main-orange) bg-orange-50/60 dark:bg-orange-500/10"
                                        : "border-zinc-700 dark:border-white/50"
                                }`}
                            >
                                <span className="flex items-center gap-2 font-medium">
                                    <input
                                        type="radio"
                                        name="signup-role"
                                        checked={role === "attendee"}
                                        onChange={() => setRole("attendee")}
                                        className="h-4 w-4 accent-(--main-orange)"
                                    />
                                    Attend events
                                </span>
                                <span className="text-xs text-secondary-text dark:text-zinc-400">
                                    Discover &amp; register — no event creation
                                </span>
                            </label>
                            <label
                                className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                                    role === "organizer"
                                        ? "border-(--main-orange) bg-orange-50/60 dark:bg-orange-500/10"
                                        : "border-zinc-700 dark:border-white/50"
                                }`}
                            >
                                <span className="flex items-center gap-2 font-medium">
                                    <input
                                        type="radio"
                                        name="signup-role"
                                        checked={role === "organizer"}
                                        onChange={() => setRole("organizer")}
                                        className="h-4 w-4 accent-(--main-orange)"
                                    />
                                    Create events
                                </span>
                                <span className="text-xs text-secondary-text dark:text-zinc-400">
                                    Organize, publish &amp; manage
                                </span>
                            </label>
                        </div>
                    </div>
                    <div className="pb-4 flex flex-col mx-auto gap-1 w-full">
                        <label htmlFor="firstName">First Name</label>
                        <input
                            type="text"
                            className={INPUT_CLASSES}
                            id="firstName"
                            name="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="John"
                        />
                    </div>
                    <div className="pb-4 flex flex-col mx-auto gap-1 w-full">
                        <label htmlFor="lastName">Last Name</label>
                        <input
                            type="text"
                            className={INPUT_CLASSES}
                            id="lastName"
                            name="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Doe"
                        />
                    </div>
                    <div className="pb-4 flex flex-col mx-auto gap-1 w-full">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            className={INPUT_CLASSES}
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@email.com"
                        />
                    </div>
                    <PasswordField
                        id="password"
                        label="Password"
                        value={password}
                        onChange={setPassword}
                        show={showPassword}
                        onToggle={() => setShowPassword(!showPassword)}
                        placeholder="Enter password"
                    />
                    <PasswordField
                        id="confirmPassword"
                        label="Confirm Password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        show={showConfirmPassword}
                        onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                        placeholder="Confirm password"
                    />

                    <button
                        className="bg-(--main-orange) text-white w-full cursor-pointer font-semibold mt-4 py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading && <Spinner size="sm" className="text-white" />}
                        {isLoading ? "Creating account..." : "Register"}
                    </button>
                </form>
            )}

            {/* Divider + Google OAuth — same look as the Konneqta auth forms */}
            <div className="flex items-center gap-3 pt-4" aria-hidden="true">
                <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
                <span className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">or</span>
                <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
            </div>

            <div className="pt-4">
                <SignInWithGoogle
                    label={mode === "login" ? "Sign in with Google" : "Sign up with Google"}
                    next={redirectTo}
                />
            </div>
        </div>
    );
}

