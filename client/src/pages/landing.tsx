import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { SDGWheel } from "@/components/sdg/sdg-wheel";
import { ArrowRight } from "lucide-react";
import communityVolunteersImg from "@assets/Community Volunteers_1763707388972.png";
import doctorsVolunteeringImg from "@assets/Doctors Volunteering_1763707388972.png";
import villageVolunteersImg from "@assets/Village Volunteers_1763707388973.png";

const WorldMapHeader = () => {
  return (
    <div className="w-full mb-12 px-4 sm:px-6">
      <style>{`
        @keyframes dash-animation {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        .flight-path {
          stroke-dasharray: 1000;
          animation: dash-animation 6s ease-in-out infinite;
          stroke: #f97316;
          stroke-width: 2.5;
          opacity: 0.8;
          filter: drop-shadow(0 0 2px rgba(249, 115, 22, 0.5));
        }
        .map-background {
          opacity: 0.15;
        }
        .country-marker {
          filter: drop-shadow(0 0 3px rgba(180, 83, 9, 0.6));
        }
      `}</style>

      <svg viewBox="0 0 1200 500" className="w-full max-w-5xl mx-auto h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Faint world map background */}
        <g className="map-background" fill="none" stroke="#94a3b8" strokeWidth="1">
          {/* Africa outline */}
          <path d="M 700 150 L 750 140 L 800 160 L 820 220 L 800 300 L 750 320 L 700 310 L 680 240 Z" />
          {/* Asia outline */}
          <path d="M 900 120 L 1000 110 L 1050 200 L 1000 250 L 900 240 Z" />
          {/* North America outline */}
          <path d="M 150 100 L 280 90 L 300 220 L 250 260 L 150 200 Z" />
          {/* South America outline */}
          <path d="M 300 280 L 380 270 L 400 420 L 320 450 L 300 380 Z" />
          {/* Europe outline */}
          <path d="M 550 80 L 620 70 L 650 120 L 600 150 L 550 140 Z" />
        </g>

        {/* Flight paths with animation */}
        <g className="flight-path">
          {/* Philippines -> USA */}
          <path d="M 1020 180 Q 800 120 280 160" fill="none" strokeLinecap="round" />
          {/* USA -> Mexico */}
          <path d="M 280 160 Q 240 180 200 240" fill="none" strokeLinecap="round" />
          {/* Mexico -> Haiti */}
          <path d="M 200 240 Q 170 220 140 200" fill="none" strokeLinecap="round" />
          {/* Haiti -> USA */}
          <path d="M 140 200 Q 200 160 280 160" fill="none" strokeLinecap="round" />
          {/* USA -> Zimbabwe */}
          <path d="M 280 160 Q 500 100 750 220" fill="none" strokeLinecap="round" />
          {/* Mexico -> Zambia */}
          <path d="M 200 240 Q 450 280 780 280" fill="none" strokeLinecap="round" />
          {/* Zimbabwe -> Zambia */}
          <path d="M 750 220 Q 760 250 780 280" fill="none" strokeLinecap="round" />
          {/* Philippines -> Zimbabwe */}
          <path d="M 1020 180 Q 880 200 750 220" fill="none" strokeLinecap="round" />
          {/* Philippines -> Zambia */}
          <path d="M 1020 180 Q 900 240 780 280" fill="none" strokeLinecap="round" />
        </g>

        {/* Country markers and labels */}
        {/* Philippines */}
        <g className="country-marker">
          <circle cx="1020" cy="180" r="7" fill="#b45309" />
          <circle cx="1020" cy="180" r="11" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.5" />
        </g>
        <text x="1020" y="220" fontSize="13" fontWeight="600" fill="#1e3a8a" textAnchor="middle">Philippines</text>

        {/* USA */}
        <g className="country-marker">
          <circle cx="280" cy="160" r="7" fill="#b45309" />
          <circle cx="280" cy="160" r="11" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.5" />
        </g>
        <text x="280" y="100" fontSize="13" fontWeight="600" fill="#1e3a8a" textAnchor="middle">United States</text>

        {/* Mexico */}
        <g className="country-marker">
          <circle cx="200" cy="240" r="7" fill="#b45309" />
          <circle cx="200" cy="240" r="11" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.5" />
        </g>
        <text x="200" y="290" fontSize="13" fontWeight="600" fill="#1e3a8a" textAnchor="middle">Mexico</text>

        {/* Haiti */}
        <g className="country-marker">
          <circle cx="140" cy="200" r="7" fill="#b45309" />
          <circle cx="140" cy="200" r="11" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.5" />
        </g>
        <text x="140" y="320" fontSize="13" fontWeight="600" fill="#1e3a8a" textAnchor="middle">Haiti</text>

        {/* Zimbabwe */}
        <g className="country-marker">
          <circle cx="750" cy="220" r="7" fill="#b45309" />
          <circle cx="750" cy="220" r="11" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.5" />
        </g>
        <text x="750" y="260" fontSize="13" fontWeight="600" fill="#1e3a8a" textAnchor="middle">Zimbabwe</text>

        {/* Zambia */}
        <g className="country-marker">
          <circle cx="780" cy="280" r="7" fill="#b45309" />
          <circle cx="780" cy="280" r="11" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.5" />
        </g>
        <text x="780" y="330" fontSize="13" fontWeight="600" fill="#1e3a8a" textAnchor="middle">Zambia</text>
      </svg>
    </div>
  );
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-4">
          <Link href="/">
            <div className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
              <Logo size="md" />
            </div>
          </Link>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="min-h-[44px] sm:min-h-auto whitespace-nowrap text-slate-800 hover:bg-slate-200" data-testid="button-login">Log In</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="min-h-[44px] sm:min-h-auto whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-white" data-testid="button-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-28 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight" data-testid="text-hero-title">
          <span className="text-blue-900">Connect. Manage.</span><br />
          <span className="text-amber-600">Impact Globally.</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-slate-700 mb-10 max-w-3xl mx-auto leading-relaxed font-medium" data-testid="text-hero-description">
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
        {/* World Map with Flight Paths */}
        <WorldMapHeader />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <div className="flex justify-center">
            <img 
              src={communityVolunteersImg}
              alt="Community Volunteers"
              className="w-full h-64 sm:h-72 rounded-2xl object-cover shadow-2xl hover:shadow-3xl transition-shadow"
              loading="lazy"
            />
          </div>
          <div className="flex justify-center">
            <img 
              src={doctorsVolunteeringImg}
              alt="Doctors Volunteering"
              className="w-full h-64 sm:h-72 rounded-2xl object-cover shadow-2xl hover:shadow-3xl transition-shadow"
              loading="lazy"
            />
          </div>
          <div className="flex justify-center">
            <img 
              src={villageVolunteersImg}
              alt="Village Volunteers"
              className="w-full h-64 sm:h-72 rounded-2xl object-cover shadow-2xl hover:shadow-3xl transition-shadow"
              loading="lazy"
            />
          </div>
        </div>

        {/* Three Step Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Get Involved and See Your Impact</h3>
            <p className="text-slate-700 text-base leading-relaxed">
              Join a global community of volunteers making tangible change. Track your contributions and visualize the collective impact you're creating.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="inline-block bg-amber-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mb-4">
              1
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Create Profile</h3>
            <p className="text-slate-700 text-base leading-relaxed">
              Sign up get verified, and join volunteers and NGOs worldwide to collaborate on meaningful projects.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center md:text-right">
            <div className="inline-block bg-amber-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mb-4">
              2
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Track Impact</h3>
            <p className="text-slate-700 text-base leading-relaxed">
              Activate your skills ad values in collaboration with global partners and track measurable outcomes.
            </p>
          </div>
        </div>
      </section>

      {/* SDG Section - Preserved */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-24 bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg mt-12 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4" data-testid="text-sdg-title">
              The Sustainable Development Goals
            </h2>
            <p className="text-lg sm:text-xl text-slate-700 max-w-3xl mx-auto" data-testid="text-sdg-description">
              Connect your volunteer projects to the United Nations' 17 Sustainable Development Goals. Click any goal to learn more about its targets and how your organization can contribute.
            </p>
          </div>

          <SDGWheel />

          <div className="text-center mt-12">
            <p className="text-base sm:text-lg text-slate-700 mb-6">
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


      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 bg-slate-100">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          <p>© 2025 Synerxus. Intelligent connections for sustainable development worldwide.</p>
        </div>
      </footer>
    </div>
  );
}
