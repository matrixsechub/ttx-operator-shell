import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PublicShell } from "../components/PublicShell";
import { SecurityNewsReel } from "../components/SecurityNewsReel";
import { useObserverInterest } from "../lib/publicObserver";

type SubmissionState = "idle" | "transmitting" | "pending";

export function Register() {
  const { record, save } = useObserverInterest();
  const [callsign, setCallsign] = useState(record?.callsign ?? "");
  const [email, setEmail] = useState(record?.email ?? "");
  const [team, setTeam] = useState(record?.team ?? "");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");

  const statusMessage = useMemo(() => {
    if (submissionState === "transmitting") return "Request Transmitting...";
    if (submissionState === "pending") return "Access Pending - Operator Review Required";
    return record ? "Observer registration recorded locally for readiness updates." : "No registration request stored yet.";
  }, [record, submissionState]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmissionState("transmitting");

    await new Promise((resolve) => window.setTimeout(resolve, 1100));

    save({
      callsign: callsign.trim() || "observer",
      email: email.trim(),
      team: team.trim(),
      createdAt: new Date().toISOString(),
    });

    setSubmissionState("pending");
  }

  return (
    <PublicShell
      eyebrow="MSH OPS // Registration Surface"
      title="Registration is now a cinematic readiness console."
      lead="This surface does not create an account yet. It captures observer interest, marks the request as pending, and makes cockpit rollout updates the explicit reason to register."
      actions={
        <>
          <Link to="/marketplace" className="public-cta public-cta--secondary">
            Return to Marketplace
          </Link>
        </>
      }
    >
      <SecurityNewsReel compact />

      <section className="public-dual-grid">
        <article className="public-panel public-panel--alert">
          <span className="public-chip">Under Construction</span>
          <h2>Cockpit Coming Online Soon</h2>
          <p>
            Registration will provide cockpit readiness updates. Until operator access is activated, this page acts as
            the public-facing readiness signal rather than an account system.
          </p>
          <p className="public-microcopy">{statusMessage}</p>
        </article>

        <form onSubmit={handleSubmit} className="public-form-shell">
          <label className="public-form-field">
            <span>Callsign</span>
            <input value={callsign} onChange={(event) => setCallsign(event.target.value)} required placeholder="observer-01" />
          </label>
          <label className="public-form-field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="observer@mission.net" />
          </label>
          <label className="public-form-field">
            <span>Organization / Team</span>
            <input value={team} onChange={(event) => setTeam(event.target.value)} placeholder="Division, unit, or client team" />
          </label>

          <button type="submit" className="public-cta public-cta--primary" disabled={submissionState === "transmitting"}>
            {submissionState === "transmitting" ? "Request Transmitting..." : "Request Cockpit Updates"}
          </button>
          <p className="public-microcopy">Registration will provide cockpit readiness updates.</p>
        </form>
      </section>
    </PublicShell>
  );
}
