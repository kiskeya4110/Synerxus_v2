import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import {
  Menu, X, User, ShieldCheck, FileCheck, BarChart2, Clock, Lock,
  ChevronRight, AlertTriangle, CheckCircle, TrendingUp, Users,
  Building2, Globe, HardHat, ArrowRight
} from "lucide-react";
import Footer from "@/components/layout/footer";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import doctorsVolunteeringImg from "@assets/doctors-volunteering.webp";

export default function Landing() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const storedUserId = typeof window !== "undefined" ? localStorage.getItem("currentUserId") : null;

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      if (!storedUserId) return null;
      const response = await fetch(`/api/users/me?userId=${storedUserId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!storedUserId,
  });

  const isLoggedIn = !!storedUserId && !!currentUser?.id;

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden w-full">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 md:px-10 py-3 flex justify-between items-center">
          <Link href="/landing">
            <div className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
              <Logo size="sm" showMotto={true} />
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/landing">
              <Button variant="ghost" size="sm" className="text-[#0A1F44] font-semibold hover:bg-blue-50 rounded-lg">Home</Button>
            </Link>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-slate-700 font-medium hover:bg-blue-50 hover:text-[#0A1F44] rounded-lg">Projects</Button>
            </Link>
            <Link href="/organizations">
              <Button variant="ghost" size="sm" className="text-slate-700 font-medium hover:bg-blue-50 hover:text-[#0A1F44] rounded-lg">Organizations</Button>
            </Link>
            <Link href="/help">
              <Button variant="ghost" size="sm" className="text-slate-700 font-medium hover:bg-blue-50 hover:text-[#0A1F44] rounded-lg">Help</Button>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button size="sm" className="whitespace-nowrap bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-semibold text-sm px-4 rounded-xl" data-testid="button-my-dashboard">
                  My Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="outline" className="whitespace-nowrap border-[#0A1F44] text-[#0A1F44] font-semibold text-sm px-4 rounded-xl hover:bg-[#0A1F44] hover:text-white" data-testid="button-login-nav">Log In</Button>
                </Link>
                <Link href="/login?tab=register">
                  <Button size="sm" className="whitespace-nowrap bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-semibold text-sm px-4 rounded-xl" data-testid="button-sign-up-nav">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-colors text-slate-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
            <div className="md:hidden absolute left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-lg">
              <div className="px-4 py-3 space-y-1 border-b border-slate-100">
                {[
                  { href: "/landing", label: "Home" },
                  { href: "/projects", label: "Projects" },
                  { href: "/organizations", label: "Organizations" },
                  { href: "/help", label: "Help" },
                ].map(({ href, label }) => (
                  <button
                    key={href}
                    onClick={() => { setMobileMenuOpen(false); navigate(href); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-[#0A1F44] transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="px-4 py-3 space-y-2">
                {isLoggedIn ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate("/dashboard"); }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0A1F44] text-white font-semibold text-sm text-center"
                    data-testid="button-my-dashboard"
                  >
                    My Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}
                      className="w-full py-2.5 px-4 rounded-xl border border-[#0A1F44] text-[#0A1F44] font-semibold text-sm text-center"
                      data-testid="button-login-nav"
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); navigate("/login?tab=register"); }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0A1F44] text-white font-semibold text-sm text-center"
                      data-testid="button-sign-up-nav"
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </nav>

      <main className="flex-1 overflow-x-hidden w-full">

        {/* ── Section 1: Hero ── */}
        <section
          className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/60 to-blue-100/80 py-16 md:py-24"
          data-testid="section-hero"
        >
          {/* Decorative SVG wave top-right */}
          <svg
            className="absolute top-0 right-0 w-64 md:w-96 opacity-30 pointer-events-none"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="300" cy="80" rx="260" ry="160" fill="#BFDBFE" />
          </svg>
          {/* Decorative SVG arc bottom-left */}
          <svg
            className="absolute bottom-0 left-0 w-48 md:w-72 opacity-20 pointer-events-none"
            viewBox="0 0 300 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="0" cy="200" rx="200" ry="130" fill="#93C5FD" />
          </svg>

          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

            {/* Left column */}
            <div className="flex flex-col order-2 md:order-1">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-[#0A1F44] mb-5"
                data-testid="text-hero-title"
              >
                The Verification Layer<br />
                <span className="text-[#0A1F44]">for </span>
                <span className="text-[#1D4ED8]">ESG, SDG, and<br />Community Impact.</span>
              </h1>

              <p
                className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed"
                data-testid="text-hero-description"
              >
                Real-time, NGO-verified outcomes with immutable audit trails—built for CSRD, ESRS, and enterprise ESG reporting.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                {isLoggedIn ? (
                  <Link href="/dashboard">
                    <Button
                      size="lg"
                      className="bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-bold px-8 rounded-xl shadow-lg"
                      data-testid="button-my-dashboard-hero"
                    >
                      My Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login?tab=register">
                      <Button
                        size="lg"
                        className="bg-[#0A1F44] hover:bg-[#0d2a5e] text-white font-bold px-8 rounded-xl shadow-lg"
                        data-testid="button-join-hero"
                      >
                        Get a Demo
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-2 border-[#0A1F44] text-[#0A1F44] font-bold px-8 rounded-xl hover:bg-[#0A1F44] hover:text-white transition-colors"
                        data-testid="button-sign-in-hero"
                      >
                        See How Verification Works
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Trust badge strip */}
              <div className="flex flex-wrap gap-2 mt-1">
                {["CSRD-Ready", "ESRS S3/S4", "Audit-Defensible", "NGO-Verified"].map((badge) => (
                  <span key={badge} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-[#0A1F44]/15 text-[10px] sm:text-xs font-semibold text-[#0A1F44] shadow-sm">
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Right column — dashboard mockup */}
            <div className="relative order-1 md:order-2 flex justify-center">
              <div className="relative w-full max-w-md">
                {/* Background photo */}
                <img
                  src={doctorsVolunteeringImg}
                  alt="Professionals reviewing ESG data"
                  className="w-full rounded-2xl shadow-2xl object-cover"
                  style={{ maxHeight: "380px", objectPosition: "center" }}
                  loading="eager"
                  decoding="async"
                />

                {/* ESG Dashboard floating card */}
                <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-64 bg-white rounded-xl shadow-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#0A1F44] uppercase tracking-wide">ESG Dashboard</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>

                  {/* Stats */}
                  <div className="space-y-2.5 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs text-slate-500">Emissions Reduction</span>
                      </div>
                      <span className="text-sm font-extrabold text-[#0A1F44]">28%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs text-slate-500">Beneficiaries Reached</span>
                      </div>
                      <span className="text-sm font-extrabold text-[#0A1F44]">125,480</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-xs text-slate-500">Verified Projects</span>
                      </div>
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                  </div>

                  {/* Mini bar chart */}
                  <div className="flex items-end gap-1 h-10 border-t border-slate-100 pt-2">
                    {[40, 60, 45, 75, 55, 80, 65].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{
                          height: `${h}%`,
                          backgroundColor: i === 5 ? "#0A1F44" : "#BFDBFE",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Watermark */}
                <div className="absolute bottom-2 right-2 opacity-25">
                  <Logo size="xs" clickable={false} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pipeline Graphic Section ── */}
        <section className="bg-[#0A1F44] py-10 md:py-14">
          <div className="max-w-7xl mx-auto px-4 md:px-10">
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-1 rounded-full bg-[#E6B800]/20 text-[#E6B800] text-xs font-bold uppercase tracking-wider mb-3">
                How It Works
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
                From Ground-Level Activity to Boardroom ESG Report
              </h2>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <img
                src="/landing-hero.png"
                alt="Synerxus verification pipeline — Volunteer to NGO Verifier to Verified Outcome to ESG Report"
                className="w-full object-cover"
                style={{ maxHeight: "420px", objectPosition: "center bottom" }}
                loading="eager"
              />
            </div>
            <div className="flex justify-center gap-8 mt-6">
              {[
                { label: "Volunteer", color: "text-blue-300" },
                { label: "NGO Verifier", color: "text-[#E6B800]" },
                { label: "Verified Outcome", color: "text-blue-300" },
                { label: "ESG Report", color: "text-[#E6B800]" },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-2 sm:gap-3">
                  <span className={`text-xs sm:text-sm font-bold ${step.color}`}>{step.label}</span>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-white/30 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 2: Problem ── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                The World Runs on Unverified Impact Claims
              </h2>
              <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
                Three broken systems. One verification gap. Synerxus closes it.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Building2 className="h-7 w-7 text-[#0A1F44]" />,
                  segment: "ESG Teams",
                  pain: "70% of disclosures rely on self-reported data.",
                  quote: '"CSRD requires evidence, not narratives."',
                },
                {
                  icon: <Users className="h-7 w-7 text-[#0A1F44]" />,
                  segment: "Corporate Volunteering",
                  pain: "Hours logged ≠ outcomes delivered.",
                  quote: '"No independent confirmation."',
                },
                {
                  icon: <Globe className="h-7 w-7 text-[#0A1F44]" />,
                  segment: "NGOs & Cities",
                  pain: "Fragmented proof and manual reporting.",
                  quote: '"Impact is real, but unverifiable."',
                },
              ].map((card) => (
                <div key={card.segment} className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[#0A1F44] mb-2">{card.segment}</h3>
                  <p className="text-slate-600 text-sm mb-3">{card.pain}</p>
                  <p className="text-slate-400 text-sm italic">{card.quote}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-[#0A1F44] font-bold text-lg mt-10">
              Synerxus closes the verification gap.
            </p>
          </div>
        </section>

        {/* ── Missing Infrastructure Stack ── */}
        <section className="py-16 md:py-20 bg-[#06112B]">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center justify-between">

              {/* Left: layer stack */}
              <div className="flex-1 w-full max-w-xl">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-10">
                  The Missing<br />Infrastructure
                </h2>

                <div className="flex flex-col gap-1.5">
                  {[
                    { id: "L5", label: "Audit / Assurance", sub: "Too slow, cost-prohibitive", highlight: false, dim: true },
                    { id: "L4", label: "Verification", sub: "The Critical Gap", highlight: true, dim: false },
                    { id: "L3", label: "Trackers", sub: "Log hours only — no outcome proof", highlight: false, dim: false },
                    { id: "L2", label: "Aggregators", sub: "Saturated", highlight: false, dim: false },
                    { id: "L1", label: "Reporting Frameworks", sub: "CSRD / GRI / ESRS (saturated)", highlight: false, dim: false },
                  ].map((layer) => (
                    <div
                      key={layer.id}
                      className={`relative flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${
                        layer.highlight
                          ? "border-[#00E35B] bg-[#00B341]/10"
                          : layer.dim
                          ? "border-white/8 bg-[#0A1A3E]/50 opacity-70"
                          : "border-white/12 bg-[#0A1A3E]"
                      }`}
                      style={
                        layer.highlight
                          ? { boxShadow: "0 0 28px rgba(0,227,91,0.35), 0 0 6px rgba(0,227,91,0.2)" }
                          : undefined
                      }
                    >
                      {/* Layer badge */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                          layer.highlight ? "bg-[#00B341] text-white" : "bg-white/10 text-white/50"
                        }`}
                      >
                        {layer.id}
                      </div>

                      {/* Label + sub */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-bold text-sm sm:text-base leading-tight ${
                            layer.highlight ? "text-[#00E35B]" : "text-white/90"
                          }`}
                        >
                          {layer.highlight && <span className="text-white/60 mr-1">← </span>}
                          {layer.label}
                        </div>
                        <div className="text-xs text-white/45 mt-0.5">{layer.sub}</div>
                      </div>

                      {/* Synerxus tag on highlight layer */}
                      {layer.highlight && (
                        <div className="shrink-0 text-[#00E35B] text-[10px] sm:text-xs font-bold px-2.5 py-1 border border-[#00E35B]/40 rounded-full whitespace-nowrap">
                          Synerxus fills this
                        </div>
                      )}

                      {/* Connector line on right edge */}
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-px bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: gold-framed quote panel */}
              <div
                className="w-full lg:w-72 xl:w-80 rounded-2xl p-8 text-white flex-shrink-0"
                style={{
                  border: "2px solid #E6B800",
                  boxShadow: "0 0 48px rgba(230,184,0,0.18), inset 0 0 24px rgba(230,184,0,0.04)",
                  background: "linear-gradient(135deg, #0A1640 0%, #06112B 100%)",
                }}
              >
                {/* Circuit-board corner accents */}
                <div className="flex justify-between mb-6 opacity-40">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-[#E6B800] rounded-tl-md" />
                  <div className="w-8 h-8 border-t-2 border-r-2 border-[#E6B800] rounded-tr-md" />
                </div>

                <p className="text-xl sm:text-2xl font-extrabold leading-tight mb-5">
                  Everyone builds trackers.
                </p>
                <p className="text-xl sm:text-2xl font-extrabold leading-tight text-[#E6B800]">
                  No one built the verification layer.
                </p>

                <div className="flex justify-between mt-6 opacity-40">
                  <div className="w-8 h-8 border-b-2 border-l-2 border-[#E6B800] rounded-bl-md" />
                  <div className="w-8 h-8 border-b-2 border-r-2 border-[#E6B800] rounded-br-md" />
                </div>

                <div className="mt-6 pt-5 border-t border-white/10">
                  <p className="text-sm text-white/55 leading-relaxed">
                    Synerxus is the first platform to close the loop between ground-level activity and audit-ready ESG evidence.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Section 3: Solution ── */}
        <section className="py-16 md:py-24 bg-blue-50">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                Verify What Actually Happened
              </h2>
              <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
                Four capabilities that turn impact claims into defensible evidence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  icon: <Clock className="h-6 w-6 text-blue-600" />,
                  title: "Real-Time Outcome Verification",
                  desc: "NGO staff confirm deliverables within 72 hours — no lag, no backlogs.",
                  bg: "bg-blue-100",
                },
                {
                  icon: <Lock className="h-6 w-6 text-[#0A1F44]" />,
                  title: "Immutable Audit Trails",
                  desc: "Structured Evidence Objects provide defensible sampling for regulators and auditors.",
                  bg: "bg-slate-100",
                },
                {
                  icon: <BarChart2 className="h-6 w-6 text-emerald-600" />,
                  title: "SDG + ESG Alignment",
                  desc: "Automatic mapping to ESRS S3/S4 — reports that compliance officers trust.",
                  bg: "bg-emerald-100",
                },
                {
                  icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
                  title: "Negative Impact Screening",
                  desc: "Mandatory at verification — prevents greenwashing before it enters your reports.",
                  bg: "bg-amber-100",
                },
              ].map((feat) => (
                <div key={feat.title} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow flex gap-4">
                  <div className={`w-12 h-12 rounded-xl ${feat.bg} flex items-center justify-center flex-shrink-0`}>
                    {feat.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0A1F44] mb-1">{feat.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: Workflow ── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-5xl mx-auto px-6 md:px-10">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                A Complete Chain of Custody
              </h2>
              <p className="text-slate-500 text-base md:text-lg">
                Four steps from delivery to disclosure — with verification at every stage.
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-center gap-4 md:gap-0">
              {[
                { icon: <FileCheck className="h-7 w-7 text-white" />, num: "01", label: "Deliverable Completed", color: "bg-[#0A1F44]" },
                { icon: <ShieldCheck className="h-7 w-7 text-white" />, num: "02", label: "NGO Verifies", color: "bg-blue-600" },
                { icon: <Lock className="h-7 w-7 text-white" />, num: "03", label: "Evidence Object Created", color: "bg-[#0A1F44]" },
                { icon: <BarChart2 className="h-7 w-7 text-white" />, num: "04", label: "ESG / SDG Reporting", color: "bg-blue-600" },
              ].map((step, i, arr) => (
                <div key={step.num} className="flex flex-col md:flex-row items-center md:items-start flex-1">
                  <div className="flex flex-col items-center text-center w-32">
                    <div className={`w-14 h-14 rounded-full ${step.color} flex items-center justify-center shadow-lg mb-3`}>
                      {step.icon}
                    </div>
                    <span className="text-xs text-slate-400 font-bold mb-1">{step.num}</span>
                    <span className="text-sm font-bold text-[#0A1F44] leading-tight">{step.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="hidden md:flex items-center justify-center flex-1 mt-6">
                      <div className="w-full h-0.5 bg-slate-200 relative">
                        <ArrowRight className="h-4 w-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  )}
                  {i < arr.length - 1 && (
                    <div className="md:hidden flex flex-col items-center my-2">
                      <div className="w-0.5 h-6 bg-slate-200"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 5: Audience ── */}
        <section className="py-16 md:py-24 bg-blue-50">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                Built for Every Organization<br />That Needs Verified Impact
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: <BarChart2 className="h-6 w-6 text-blue-700" />,
                  audience: "ESG Teams",
                  benefit: "CSRD-ready evidence for S3/S4 disclosures — audit-defensible from day one.",
                  bg: "bg-blue-100",
                },
                {
                  icon: <Users className="h-6 w-6 text-[#0A1F44]" />,
                  audience: "Corporate Volunteering",
                  benefit: "Move beyond hours logged — verify outcomes and show true employee impact.",
                  bg: "bg-slate-100",
                },
                {
                  icon: <ShieldCheck className="h-6 w-6 text-emerald-700" />,
                  audience: "NGOs",
                  benefit: "Show funders verified, timestamped impact — effortlessly and credibly.",
                  bg: "bg-emerald-100",
                },
                {
                  icon: <Globe className="h-6 w-6 text-sky-700" />,
                  audience: "Cities & Multilaterals",
                  benefit: "Comparable, verified data across pilots, programs, and geographies.",
                  bg: "bg-sky-100",
                },
                {
                  icon: <HardHat className="h-6 w-6 text-amber-700" />,
                  audience: "Engineering & Infrastructure Firms",
                  benefit: "Verify local hiring commitments and community impact against project targets.",
                  bg: "bg-amber-100",
                },
                {
                  icon: <Building2 className="h-6 w-6 text-violet-700" />,
                  audience: "Impact Investors",
                  benefit: "Portfolio-wide verification of social outcomes — from commitment to delivery.",
                  bg: "bg-violet-100",
                },
              ].map((card) => (
                <div key={card.audience} className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
                  <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                    {card.icon}
                  </div>
                  <h3 className="font-bold text-[#0A1F44] mb-2">{card.audience}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{card.benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 6: Verification Stack ── */}
        <section className="py-16 md:py-20 bg-[#0A1F44]">
          <div className="max-w-5xl mx-auto px-6 md:px-10 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4">
              Synerxus Completes the Global Impact Stack
            </h2>
            <p className="text-blue-200 text-base md:text-lg mb-12 max-w-2xl mx-auto">
              We verify delivery. Others measure perception or aggregate data. Together, it becomes auditable.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-0">
              {[
                { label: "Inputs", sub: "Activity data, volunteer hours, deliverables", bg: "bg-blue-800" },
                { label: "Synerxus", sub: "Independent verification & audit trails", bg: "bg-[#E6B800]", textColor: "text-[#0A1F44]", subColor: "text-[#0A1F44]/70" },
                { label: "Aggregators", sub: "Sopact, impact platforms & reporting tools", bg: "bg-blue-800" },
                { label: "Longitudinal Validation", sub: "60 Decibels & perception research", bg: "bg-blue-800" },
              ].map((node, i, arr) => (
                <div key={node.label} className="flex flex-col md:flex-row items-center">
                  <div className={`${node.bg} rounded-xl px-5 py-4 w-44 text-center`}>
                    <p className={`font-bold text-sm ${node.textColor || "text-white"} mb-1`}>{node.label}</p>
                    <p className={`text-xs ${node.subColor || "text-blue-300"} leading-snug`}>{node.sub}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-blue-400 my-2 md:my-0 md:mx-2 rotate-90 md:rotate-0 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 7: Impact Metrics ── */}
        <section className="py-16 md:py-20 bg-[#0A1F44] border-t border-blue-800">
          <div className="max-w-6xl mx-auto px-6 md:px-10 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-12">
              Impact, Verified.
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-10">
              {[
                { value: "134", label: "Verified Outcomes" },
                { value: "1,678", label: "Verified Hours" },
                { value: "439,290", label: "Beneficiaries Reached" },
                { value: "85%", label: "Verification Rate" },
                { value: "16h", label: "Avg. Time to Verify" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center">
                  <span className="text-3xl md:text-4xl font-extrabold text-[#E6B800] mb-1">{stat.value}</span>
                  <span className="text-blue-200 text-xs md:text-sm font-medium leading-snug">{stat.label}</span>
                </div>
              ))}
            </div>

            <Link href="/login">
              <Button variant="outline" className="border-[#E6B800] text-[#E6B800] hover:bg-[#E6B800] hover:text-[#0A1F44] font-semibold rounded-xl px-6">
                See a Sample Verified Impact Report
              </Button>
            </Link>
          </div>
        </section>

        {/* ── Section 8: Case Studies ── */}
        <section className="py-16 md:py-24 bg-blue-50">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A1F44] mb-4">
                Verified Impact in Action
              </h2>
              <p className="text-slate-500 text-base md:text-lg max-w-xl mx-auto">
                Real programs. Real verification. Real evidence for ESG reporting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Green Future Alliance",
                  tag: "Environmental",
                  desc: "Watershed restoration verified across 7 active projects — immutable audit trails delivered to corporate ESG teams within 48 hours.",
                  tagColor: "bg-emerald-100 text-emerald-800",
                },
                {
                  title: "Solar Village Initiative",
                  tag: "Energy Access",
                  desc: "Energy access outcomes confirmed with full audit trails, mapped to SDG 7 and ESRS E1 — ready for CSRD disclosure.",
                  tagColor: "bg-amber-100 text-amber-800",
                },
                {
                  title: "Urban Green Corridors",
                  tag: "City-Level",
                  desc: "City-level environmental outcomes verified in real time across 3 municipalities — enabling comparable, cross-pilot ESG reporting.",
                  tagColor: "bg-blue-100 text-blue-800",
                },
              ].map((study) => (
                <div key={study.title} className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-lg transition-shadow">
                  <div className="h-3 bg-[#0A1F44]" />
                  <div className="p-6">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${study.tagColor} mb-3 inline-block`}>
                      {study.tag}
                    </span>
                    <h3 className="font-bold text-[#0A1F44] text-lg mb-2">{study.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{study.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 9: Final CTA ── */}
        <section className="bg-[#0A1F44] overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[380px]">
            {/* Left: CTA text */}
            <div className="flex flex-col justify-center px-8 md:px-14 py-16 md:py-20">
              <span className="inline-block px-3 py-1 rounded-full bg-[#E6B800]/20 text-[#E6B800] text-xs font-bold uppercase tracking-wider mb-5 w-fit">
                Get Started
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-5 leading-tight">
                Ready to Move Beyond<br />Self-Reported Impact?
              </h2>
              <p className="text-blue-200 text-base md:text-lg mb-10 leading-relaxed">
                Join the organizations building audit-ready ESG evidence — not just impact narratives.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login?tab=register">
                  <Button
                    size="lg"
                    className="bg-[#E6B800] hover:bg-[#d4a900] text-[#0A1F44] font-bold px-8 rounded-xl shadow-lg"
                  >
                    Book a Verification Demo
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white text-white font-bold px-8 rounded-xl hover:bg-white hover:text-[#0A1F44] transition-colors"
                  >
                    Download the Methodology
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Corporate photo */}
            <div className="relative hidden md:block">
              <img
                src="/landing-hero.png"
                alt="Corporate ESG presentation with verified impact data"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: "center top" }}
                loading="lazy"
              />
              {/* Gradient fade from navy on the left */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A1F44] via-[#0A1F44]/20 to-transparent" />
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <Footer />
      </main>
    </div>
  );
}
