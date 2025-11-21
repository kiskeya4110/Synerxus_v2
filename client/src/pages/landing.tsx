import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { SDGWheel } from "@/components/sdg/sdg-wheel";
import { ArrowRight, Info } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import communityVolunteersImg from "@assets/Community Volunteers_1763707388972.png";
import doctorsVolunteeringImg from "@assets/Doctors Volunteering_1763707388972.png";
import villageVolunteersImg from "@assets/Village Volunteers_1763707388973.png";

const COUNTRY_DATA = {
  philippines: {
    name: "Philippines",
    coords: { x: 1020, y: 180 },
    pilot: "Healthcare & Community Development",
    description: "Partnering with local NGOs to deliver medical missions and sustainable community health programs.",
  },
  usa: {
    name: "United States",
    coords: { x: 280, y: 160 },
    pilot: "Skills Matching & Training",
    description: "Advanced volunteer skill assessment and professional development programs.",
  },
  mexico: {
    name: "Mexico",
    coords: { x: 200, y: 240 },
    pilot: "Education & Environmental",
    description: "Focused on environmental conservation and education initiatives across rural communities.",
  },
  haiti: {
    name: "Haiti",
    coords: { x: 140, y: 200 },
    pilot: "Infrastructure & Relief",
    description: "Disaster relief and infrastructure development programs supporting vulnerable populations.",
  },
  zimbabwe: {
    name: "Zimbabwe",
    coords: { x: 750, y: 220 },
    pilot: "Women's Empowerment",
    description: "Supporting women entrepreneurs and community leaders through mentorship and resource access.",
  },
  zambia: {
    name: "Zambia",
    coords: { x: 780, y: 280 },
    pilot: "Water, Sanitation & Health",
    description: "Implementing WASH initiatives and health education programs across rural areas.",
  },
};

const WorldMapHeader = () => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const selectedData = selectedCountry ? COUNTRY_DATA[selectedCountry as keyof typeof COUNTRY_DATA] : null;

  return (
    <div className="w-full mb-16 px-4 sm:px-6">
      <style>{`
        @keyframes dash-animation {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulse-marker {
          0%, 100% { r: 8; }
          50% { r: 12; }
        }
        .flight-path {
          stroke-dasharray: 1000;
          animation: dash-animation 8s ease-in-out infinite;
          stroke: #f97316;
          stroke-width: 1.5;
          opacity: 0.6;
        }
        .world-map-bg {
          opacity: 0.08;
        }
        .country-marker-interactive {
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .country-marker-interactive:hover circle:first-child {
          fill: #ea580c;
          filter: drop-shadow(0 0 6px rgba(234, 88, 12, 0.8));
        }
        .country-marker-interactive:hover circle:last-child {
          stroke-width: 2;
          opacity: 0.8;
        }
        .pulse {
          animation: pulse-marker 2s ease-in-out infinite;
        }
      `}</style>

      {/* Interactive SVG Map */}
      <svg viewBox="0 0 1280 720" className="w-full max-w-6xl mx-auto h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Detailed World Map Background */}
        <g className="world-map-bg" fill="none" stroke="#cbd5e1" strokeWidth="0.8">
          {/* North America */}
          <path d="M 100 80 L 180 60 L 220 120 L 200 240 L 120 260 L 80 160 Z" />
          {/* Central America */}
          <path d="M 150 240 L 190 240 L 200 280 L 150 290 Z" />
          {/* South America */}
          <path d="M 150 290 L 220 280 L 250 450 L 180 480 L 140 380 Z" />
          {/* Europe */}
          <path d="M 480 40 L 560 30 L 600 90 L 520 110 L 480 80 Z" />
          {/* Africa */}
          <path d="M 550 140 L 650 120 L 700 200 L 720 350 L 650 380 L 580 300 L 550 220 Z" />
          {/* Middle East */}
          <path d="M 650 120 L 720 100 L 750 180 L 700 200 Z" />
          {/* Asia */}
          <path d="M 720 100 L 900 80 L 950 280 L 850 300 L 750 180 Z" />
          {/* Southeast Asia */}
          <path d="M 850 250 L 920 240 L 940 340 L 880 350 Z" />
        </g>

        {/* Flight path connections */}
        <g className="flight-path">
          <path d="M 1020 180 Q 800 120 280 160" fill="none" strokeLinecap="round" />
          <path d="M 280 160 Q 240 180 200 240" fill="none" strokeLinecap="round" />
          <path d="M 200 240 Q 170 220 140 200" fill="none" strokeLinecap="round" />
          <path d="M 140 200 Q 200 160 280 160" fill="none" strokeLinecap="round" />
          <path d="M 280 160 Q 500 100 750 220" fill="none" strokeLinecap="round" />
          <path d="M 200 240 Q 450 280 780 300" fill="none" strokeLinecap="round" />
          <path d="M 750 220 Q 770 260 780 300" fill="none" strokeLinecap="round" />
          <path d="M 1020 180 Q 880 200 750 220" fill="none" strokeLinecap="round" />
          <path d="M 1020 180 Q 900 240 780 300" fill="none" strokeLinecap="round" />
        </g>

        {/* Interactive Country Markers */}
        {Object.entries(COUNTRY_DATA).map(([key, country]) => (
          <g key={key} className="country-marker-interactive" onClick={() => setSelectedCountry(key)}>
            <circle cx={country.coords.x} cy={country.coords.y} r="8" fill="#b45309" />
            <circle cx={country.coords.x} cy={country.coords.y} r="14" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.4" />
            <text
              x={country.coords.x}
              y={country.coords.y + 45}
              fontSize="12"
              fontWeight="600"
              fill="#1e3a8a"
              textAnchor="middle"
              className="pointer-events-none"
            >
              {country.name}
            </text>
          </g>
        ))}
      </svg>

      {/* Interactive Dialog for Country Details */}
      <Dialog open={!!selectedCountry} onOpenChange={(open) => !open && setSelectedCountry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-900">
              🌍 {selectedData?.name}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Pilot Program Initiative
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2">
                {selectedData?.pilot}
              </h3>
              <p className="text-slate-700 text-sm">
                {selectedData?.description}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Status</h4>
              <p className="text-slate-700 text-sm">
                ✓ Active Pilot Program | Accepting Volunteers
              </p>
            </div>
            <Button className="w-full bg-blue-900 hover:bg-blue-950">
              Learn More About {selectedData?.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Steps Below Map */}
      <div className="mt-16 max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-12">
          Get Involved and See Your Impact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white font-bold text-xl mb-4">
              1
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Create Profile</h3>
            <p className="text-slate-600 leading-relaxed">
              Sign up, get verified, connect with NGOs worldwide and volunteer.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white font-bold text-xl mb-4">
              2
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Match to Project</h3>
            <p className="text-slate-600 leading-relaxed">
              Activate your skills, volunteer, collaborate with global partners.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white font-bold text-xl mb-4">
              3
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Track Impact SDGs</h3>
            <p className="text-slate-600 leading-relaxed">
              Measure and manage the positive changes you create.
            </p>
          </div>
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
