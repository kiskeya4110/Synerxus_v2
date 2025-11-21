import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { SDGWheel } from "@/components/sdg/sdg-wheel";
import { ArrowRight } from "lucide-react";
import communityVolunteersImg from "@assets/Community Volunteers_1763707388972.png";
import doctorsVolunteeringImg from "@assets/Doctors Volunteering_1763707388972.png";
import villageVolunteersImg from "@assets/Village Volunteers_1763707388973.png";

const WorldMapCTA = () => {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <style>{`
        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(251, 146, 60, 0.4)); }
          50% { filter: drop-shadow(0 0 20px rgba(251, 146, 60, 0.8)); }
        }
        @keyframes pulse-ring {
          0% { r: 8; opacity: 1; }
          100% { r: 20; opacity: 0; }
        }
        .world-map-glow { animation: glow 3s ease-in-out infinite; }
        .pulse-ring { animation: pulse-ring 2s ease-out infinite; }
      `}</style>

      {/* Glowing world map background */}
      <div className="relative w-full aspect-square bg-gradient-radial from-blue-100 to-blue-50 rounded-full flex items-center justify-center world-map-glow">
        {/* SVG World Map */}
        <svg viewBox="0 0 1000 600" className="w-full h-full max-w-sm" preserveAspectRatio="xMidYMid meet">
          {/* Simplified world map outlines */}
          <g fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.3">
            {/* Africa outline - containing Zimbabwe and Zambia */}
            <path d="M 600 200 L 620 180 L 640 190 L 650 210 L 640 240 L 620 250 L 600 240 Z" />
            {/* South America outline - containing area for Haiti */}
            <path d="M 200 300 L 220 280 L 240 290 L 250 320 L 240 350 L 220 340 L 200 330 Z" />
            {/* Asia outline - containing Philippines */}
            <path d="M 750 280 L 770 270 L 780 290 L 770 310 L 760 300 Z" />
          </g>

          {/* Connection lines between countries */}
          <g stroke="#f97316" strokeWidth="2" opacity="0.6">
            {/* Zimbabwe to Haiti */}
            <line x1="620" y1="220" x2="230" y2="310" vectorEffect="non-scaling-stroke" />
            {/* Zimbabwe to Philippines */}
            <line x1="620" y1="220" x2="765" y2="290" vectorEffect="non-scaling-stroke" />
            {/* Haiti to Philippines */}
            <line x1="230" y1="310" x2="765" y2="290" vectorEffect="non-scaling-stroke" />
            {/* Zambia to all */}
            <line x1="610" y1="240" x2="230" y2="310" vectorEffect="non-scaling-stroke" />
          </g>

          {/* Country markers */}
          {/* Zimbabwe */}
          <circle cx="620" cy="220" r="8" fill="#b45309" />
          <circle cx="620" cy="220" r="8" fill="none" stroke="#b45309" strokeWidth="2" className="pulse-ring" />
          
          {/* Haiti */}
          <circle cx="230" cy="310" r="8" fill="#b45309" />
          <circle cx="230" cy="310" r="8" fill="none" stroke="#b45309" strokeWidth="2" className="pulse-ring" style={{ animationDelay: '0.5s' }} />
          
          {/* Philippines */}
          <circle cx="765" cy="290" r="8" fill="#b45309" />
          <circle cx="765" cy="290" r="8" fill="none" stroke="#b45309" strokeWidth="2" className="pulse-ring" style={{ animationDelay: '1s' }} />
          
          {/* Zambia */}
          <circle cx="610" cy="240" r="8" fill="#b45309" />
          <circle cx="610" cy="240" r="8" fill="none" stroke="#b45309" strokeWidth="2" className="pulse-ring" style={{ animationDelay: '1.5s' }} />

          {/* Country labels */}
          <text x="620" y="250" fontSize="12" fill="#1e3a8a" textAnchor="middle" fontWeight="bold">Zimbabwe</text>
          <text x="230" y="340" fontSize="12" fill="#1e3a8a" textAnchor="middle" fontWeight="bold">Haiti</text>
          <text x="765" y="320" fontSize="12" fill="#1e3a8a" textAnchor="middle" fontWeight="bold">Philippines</text>
          <text x="610" y="270" fontSize="12" fill="#1e3a8a" textAnchor="middle" fontWeight="bold">Zambia</text>
        </svg>
      </div>

      {/* Centered Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-24 w-24 sm:h-32 sm:w-32 pointer-events-auto">
          <Logo size="lg" />
        </div>
      </div>
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

      {/* Global Impact CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-24 text-center mb-12">
        <div className="max-w-3xl mx-auto">
          {/* World Map with Logo */}
          <div className="mb-12">
            <WorldMapCTA />
          </div>

          {/* Subheading */}
          <p className="text-lg sm:text-xl md:text-2xl text-slate-700 mb-8 leading-relaxed font-medium" data-testid="text-cta-description">
            Synerxus empowers NGOs and volunteers to track their collective impact across the world through intelligent connection and seamless management.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-blue-900 hover:bg-blue-950 text-white font-semibold text-lg px-8 min-h-[48px] rounded-lg" data-testid="button-join-volunteer">
                Join as Volunteer
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-lg px-8 min-h-[48px] rounded-lg" data-testid="button-get-started-cta">
                Get Started
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
