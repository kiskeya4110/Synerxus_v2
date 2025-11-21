import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { SDGWheel } from "@/components/sdg/sdg-wheel";
import { ArrowRight, Check } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-4">
          <Link href="/">
            <div className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
              <Logo size="md" />
            </div>
          </Link>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="min-h-[44px] sm:min-h-auto whitespace-nowrap text-white hover:bg-slate-800" data-testid="button-login">Log In</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="min-h-[44px] sm:min-h-auto whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-white" data-testid="button-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-28 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 text-white leading-tight" data-testid="text-hero-title">
          Connect. Manage.<br />Impact Globally.
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed font-medium" data-testid="text-hero-description">
          Implementing the SDGs and reaching the nexus of impact takes collective action. Our platform helps you join the effort, track outcomes, and manage projects.
        </p>

        {/* Join Button */}
        <Link href="/login" className="inline-block">
          <Button size="lg" className="gap-2 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg px-8 rounded-xl" data-testid="button-join-nexus">
            Join the Nexus
          </Button>
        </Link>
      </section>

      {/* Profile Cards Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
          <div className="flex justify-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-6xl sm:text-7xl shadow-2xl">
              👨‍💼
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-6xl sm:text-7xl shadow-2xl">
              👨‍⚕️
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-6xl sm:text-7xl shadow-2xl">
              👩‍🌾
            </div>
          </div>
        </div>

        {/* Three Step Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">Get Involved and See Your Impact</h3>
            <p className="text-slate-400 text-base leading-relaxed">
              Join a global community of volunteers making tangible change. Track your contributions and visualize the collective impact you're creating.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="inline-block bg-amber-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mb-4">
              1
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">Create Profile</h3>
            <p className="text-slate-400 text-base leading-relaxed">
              Sign up get verified, and join volunteers and NGOs worldwide to collaborate on meaningful projects.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center md:text-right">
            <div className="inline-block bg-amber-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mb-4">
              2
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">Track Impact</h3>
            <p className="text-slate-400 text-base leading-relaxed">
              Activate your skills ad values in collaboration with global partners and track measurable outcomes.
            </p>
          </div>
        </div>
      </section>

      {/* SDG Section - Preserved */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-24 bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg mt-12 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4" data-testid="text-sdg-title">
              The Sustainable Development Goals
            </h2>
            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto" data-testid="text-sdg-description">
              Connect your volunteer projects to the United Nations' 17 Sustainable Development Goals. Click any goal to learn more about its targets and how your organization can contribute.
            </p>
          </div>

          <SDGWheel />

          <div className="text-center mt-12">
            <p className="text-base sm:text-lg text-slate-300 mb-6">
              Synerxus helps you track and report your organization's contribution to these global goals
            </p>
            <Link href="/sdg-mapping">
              <Button variant="outline" size="lg" className="gap-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white" data-testid="button-explore-sdg-mapping">
                Explore SDG Mapping Feature
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center mb-12">
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6" data-testid="text-cta-title">
          Ready to Amplify Your Impact?
        </h2>
        <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl mx-auto" data-testid="text-cta-description">
          Join organizations worldwide using Synerxus to demonstrate the power of volunteer action and achieve the SDGs.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg px-8 min-h-[48px] rounded-lg" data-testid="button-create-account">
              Create Free Account
            </Button>
          </Link>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full border-slate-400 text-white hover:bg-slate-800 font-semibold text-lg px-8 min-h-[48px] rounded-lg" data-testid="button-view-dashboard">
              View Dashboard Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-950">
        <div className="container mx-auto px-4 text-center text-sm text-slate-400">
          <p>© 2025 Synerxus. Intelligent connections for sustainable development worldwide.</p>
        </div>
      </footer>
    </div>
  );
}
