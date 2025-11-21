import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { ArrowRight } from "lucide-react";

export default function Landing() {
  const countries = [
    {
      flag: "🇿🇼",
      name: "Zimbabwe",
      description: "Achieving the SDGs takes more than good intentions—it takes strategic action."
    },
    {
      flag: "🇭🇹",
      name: "Haiti",
      description: "Changing projects."
    },
    {
      flag: "🇵🇭",
      name: "Philippines",
      description: "Community Nutrition Support"
    },
    {
      flag: "🇿🇲",
      name: "Zambia",
      description: "Water Sanitation Outreach"
    }
  ];

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
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo centered in hero */}
          <div className="mb-8 flex justify-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20">
              <Logo size="lg" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 text-white leading-tight" data-testid="text-hero-title">
            Reaching the Nexus Together
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-300 mb-8 sm:mb-10 font-medium" data-testid="text-hero-description">
            Empowering all to implement SDGs and ignite impact.
          </p>

          {/* Single CTA Button */}
          <Link href="/login" className="inline-block">
            <Button size="lg" className="gap-2 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg px-8" data-testid="button-join-nexus">
              Join the Nexus
            </Button>
          </Link>
        </div>
      </section>

      {/* Profile Cards Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-6xl shadow-lg">
              👨‍💼
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-6xl shadow-lg">
              👨‍⚕️
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-6xl shadow-lg">
              👩‍🌾
            </div>
          </div>
        </div>
      </section>

      {/* 2030 Targets Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6" data-testid="text-targets-title">
              How Can You Meet the 2030 Targets?
            </h2>
            <p className="text-slate-300 text-lg mb-6 leading-relaxed" data-testid="text-targets-description">
              Achieving the SDGs takes more than good intentions—it takes strategic action. You need dedicated volunteers and NGO partners who understand your target outcomes.
            </p>
          </div>

          {/* Right visual - Colored bubbles */}
          <div className="relative h-80 flex items-center justify-center">
            <div className="relative w-full h-full">
              {/* Central elements positioned absolutely */}
              <div className="absolute top-8 left-12 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                🤝 Volunteers
              </div>
              <div className="absolute top-8 right-8 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                💎 Value
              </div>
              <div className="absolute top-1/3 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                ⚡ Skills
              </div>
              <div className="absolute top-1/3 right-4 bg-blue-700 text-white px-3 py-1 rounded-full text-sm font-semibold">
                🏢 NGOs
              </div>
              <div className="absolute bottom-20 left-8 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                📚 Course
              </div>
              <div className="absolute bottom-20 right-8 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                📁 Galleries
              </div>
              <div className="absolute bottom-4 left-1/4 bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                📍 Locations
              </div>
              <div className="absolute bottom-4 right-1/4 bg-cyan-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                💰 Finance
              </div>

              {/* Decorative center glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-3xl opacity-30"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 bg-slate-800/50 rounded-lg">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 text-center" data-testid="text-welcome-title">
            Welcome to Your Nexus
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed text-center mb-8" data-testid="text-welcome-description">
            Synerxus is an AI-powered platform that aligns volunteers and organizations to shared goals, dreads of service, and locations. Achieve your SDG targets with a trusted nexus of impact.
          </p>

          {/* Decorative glow */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-3xl opacity-20"></div>
          </div>
        </div>
      </section>

      {/* Countries Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {countries.map((country, index) => (
            <div key={index} className="text-center" data-testid={`country-card-${index}`}>
              <div className="text-6xl mb-4 flex justify-center">{country.flag}</div>
              <h3 className="text-xl font-bold text-white mb-2">{country.name}</h3>
              <p className="text-slate-400 text-sm">{country.description}</p>
            </div>
          ))}
        </div>

        {/* View Projects Button */}
        <div className="text-center mt-12">
          <Link href="/dashboard">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg px-8 min-h-[48px]" data-testid="button-view-projects">
              View Projects
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
