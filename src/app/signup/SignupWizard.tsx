"use client";

import { useState } from "react";
import { signUpAction } from "@/lib/auth-actions";

export function SignupWizard({ error }: { error?: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [isIndependent, setIsIndependent] = useState(false);

  function goToStep2() {
    if (!firstName.trim() || !lastName.trim()) {
      setStepError("Enter your first and last name.");
      return;
    }
    if (!email.includes("@")) {
      setStepError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setStepError("Password needs to be at least 6 characters.");
      return;
    }
    setStepError(null);
    setStep(2);
  }

  return (
    <form
      action={signUpAction}
      onSubmit={(e) => {
        if (step !== 2) e.preventDefault();
      }}
      className="space-y-5"
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-gold" : "bg-ink/10"} border border-ink`}
        />
        <span
          className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-gold" : "bg-ink/10"} border border-ink`}
        />
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="gp-label">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="gp-input"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="gp-label">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="gp-input"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="gp-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="gp-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="gp-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="gp-input"
            />
          </div>

          {stepError && <p className="text-sm font-medium text-coral-dark">{stepError}</p>}

          <button type="button" onClick={goToStep2} className="gp-btn gp-btn-primary w-full">
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <input type="hidden" name="firstName" value={firstName} />
          <input type="hidden" name="lastName" value={lastName} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="password" value={password} />
          <input type="hidden" name="isIndependent" value={isIndependent ? "true" : "false"} />

          <div>
            <p className="font-bold text-lg">One more thing 👋</p>
            <p className="text-sm text-ink-muted mt-1">
              What university or organization are you selling for?
            </p>
          </div>

          <div>
            <label htmlFor="organization" className="gp-label">
              University / organization
            </label>
            <input
              id="organization"
              name="organization"
              type="text"
              placeholder="e.g. Arizona State University"
              required={!isIndependent}
              disabled={isIndependent}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="gp-input disabled:opacity-50"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isIndependent}
              onChange={(e) => {
                setIsIndependent(e.target.checked);
                if (e.target.checked) setOrganization("");
              }}
              className="w-4 h-4 accent-violet"
            />
            I&apos;m an independent sales rep (not with a university/org)
          </label>

          {error && <p className="text-sm font-medium text-coral-dark">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="gp-btn gp-btn-secondary"
            >
              ← Back
            </button>
            <button type="submit" className="gp-btn gp-btn-primary flex-1">
              Create account
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
