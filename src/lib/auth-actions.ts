"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "./supabase/server";

// Derived from the actual incoming request rather than NEXT_PUBLIC_APP_URL,
// so this is correct on every environment (prod, each Vercel preview URL,
// local dev) without needing to keep an env var in sync with each one.
// Supabase's dashboard must still allow this origin under Authentication ->
// URL Configuration -> Redirect URLs, or it'll silently fall back to the
// project's default Site URL instead.
async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "https";
  return host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const isIndependent = formData.get("isIndependent") === "true";
  const organization = isIndependent
    ? null
    : String(formData.get("organization") ?? "").trim() || null;

  const name = [firstName, lastName].filter(Boolean).join(" ").trim();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, organization }, emailRedirectTo: `${await getOrigin()}/login` },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent("Check your email to confirm your account, then sign in.")}`
    );
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (email) {
    const supabase = await createClient();
    // The link routes through /auth/confirm first (not straight to
    // /reset-password) - only a Route Handler can persist the session
    // cookie from exchanging the code, a page render can't (same reason
    // as the signup confirmation flow).
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await getOrigin()}/auth/confirm?next=/reset-password`,
    });
  }

  // Same message whether or not the email is registered - otherwise this
  // becomes a way to check which emails have accounts.
  redirect(
    `/login?message=${encodeURIComponent("If that email has an account, a reset link is on its way.")}`
  );
}

export async function resetPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Password must be at least 6 characters")}`
    );
  }
  if (password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords don't match")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
