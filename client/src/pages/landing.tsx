import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
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
import worldMapImg from "@assets/image_1763709456060.png";

const COUNTRY_DATA = {
  philippines: {
    name: "Philippines",
    coords: { x: 750, y: 220 },
    pilot: "Healthcare & Community Development",
    description: "Partnering with local NGOs to deliver medical missions and sustainable community health programs.",
  },
  usa: {
    name: "United States",
    coords: { x: 220, y: 200 },
    pilot: "Skills Matching & Training",
    description: "Advanced volunteer skill assessment and professional development programs.",
  },
  mexico: {
    name: "Mexico",
    coords: { x: 200, y: 270 },
    pilot: "Education & Environmental",
    description: "Focused on environmental conservation and education initiatives across rural communities.",
  },
  haiti: {
    name: "Haiti",
    coords: { x: 300, y: 270 },
    pilot: "Infrastructure & Relief",
    description: "Disaster relief and infrastructure development programs supporting vulnerable populations.",
  },
  zimbabwe: {
    name: "Zimbabwe",
    coords: { x: 600, y: 420 },
    pilot: "Women's Empowerment",
    description: "Supporting women entrepreneurs and community leaders through mentorship and resource access.",
  },
  zambia: {
    name: "Zambia",
    coords: { x: 580, y: 390 },
    pilot: "Water, Sanitation & Health",
    description: "Implementing WASH initiatives and health education programs across rural areas.",
  },
};

const PROFILE_STATS = {
  community: {
    title: "Community Volunteers",
    stats: [
      { label: "Active Volunteers", value: "15,234" },
      { label: "Hours Contributed", value: "487,621" },
      { label: "Communities Served", value: "542" },
    ],
  },
  doctors: {
    title: "Healthcare Impact",
    stats: [
      { label: "Medical Professionals", value: "3,847" },
      { label: "People Treated", value: "128,542" },
      { label: "Health Projects", value: "216" },
    ],
  },
  village: {
    title: "Corporate CSR & NGO Partnerships",
    stats: [
      { label: "Corporate Partners", value: "287" },
      { label: "NGO Networks", value: "451" },
      { label: "CSR Initiatives", value: "1,203" },
    ],
  },
};

interface WorldMapHeaderProps {
  selectedCountry: string | null;
  setSelectedCountry: (country: string | null) => void;
}

const WorldMapHeader = ({ selectedCountry, setSelectedCountry }: WorldMapHeaderProps) => {
  const selectedData = selectedCountry ? COUNTRY_DATA[selectedCountry as keyof typeof COUNTRY_DATA] : null;

  return (
    <div className="w-full mb-16 px-4 sm:px-6">
      <style>{`
        @keyframes dash-animation {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        .flight-path {
          stroke-dasharray: 1000;
          animation: dash-animation 8s ease-in-out infinite;
          stroke: #f97316;
          stroke-width: 1.5;
          opacity: 0.6;
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
      `}</style>

      {/* Interactive Map with Image Background */}
      <div className="relative w-full max-w-6xl mx-auto mb-8">
        <img 
          src={worldMapImg}
          alt="World Map"
          className="w-full h-auto rounded-lg"
        />
        
        {/* Overlay SVG for interactive markers and connections */}
        <svg viewBox="0 0 960 600" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Flight path connections */}
          <g className="flight-path">
            <path d="M 750 220 Q 600 200 300 270" fill="none" strokeLinecap="round" />
            <path d="M 220 200 Q 160 220 200 270" fill="none" strokeLinecap="round" />
            <path d="M 200 270 Q 250 270 300 270" fill="none" strokeLinecap="round" />
            <path d="M 300 270 Q 260 230 220 200" fill="none" strokeLinecap="round" />
            <path d="M 220 200 Q 400 250 600 420" fill="none" strokeLinecap="round" />
            <path d="M 200 270 Q 350 330 580 390" fill="none" strokeLinecap="round" />
            <path d="M 600 420 Q 590 410 580 390" fill="none" strokeLinecap="round" />
            <path d="M 750 220 Q 680 300 600 420" fill="none" strokeLinecap="round" />
            <path d="M 750 220 Q 680 290 580 390" fill="none" strokeLinecap="round" />
          </g>

          {/* Interactive Country Markers */}
          {Object.entries(COUNTRY_DATA).map(([key, country]) => (
            <g key={key} className="country-marker-interactive" onClick={() => setSelectedCountry(key)} style={{ cursor: 'pointer' }}>
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
      </div>

      {/* Interactive Dialog for Country or Stats */}
      <Dialog open={!!selectedCountry} onOpenChange={(open) => !open && setSelectedCountry(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedData ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-blue-900">
                  🌍 {selectedData.name}
                </DialogTitle>
                <DialogDescription className="text-base pt-2">
                  Pilot Program Initiative
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">
                    {selectedData.pilot}
                  </h3>
                  <p className="text-slate-700 text-sm">
                    {selectedData.description}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Status</h4>
                  <p className="text-slate-700 text-sm">
                    ✓ Active Pilot Program | Accepting Volunteers
                  </p>
                </div>
                <Button className="w-full bg-blue-900 hover:bg-blue-950">
                  Learn More About {selectedData.name}
                </Button>
              </div>
            </>
          ) : selectedCountry && PROFILE_STATS[selectedCountry as keyof typeof PROFILE_STATS] ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-blue-900">
                  {PROFILE_STATS[selectedCountry as keyof typeof PROFILE_STATS].title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {PROFILE_STATS[selectedCountry as keyof typeof PROFILE_STATS].stats.map((stat, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-blue-50 to-amber-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-slate-600 text-sm font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-blue-900">{stat.value}</p>
                  </div>
                ))}
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white mt-4">
                  Explore Opportunities
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Steps Below Map */}
      <div className="mt-16 max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-12">
          Get Involved and See Your Impact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white font-bold text-xl mb-4">
              1
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Create Profile</h3>
            <p className="text-slate-600 leading-relaxed">
              Sign up, get verified, connect with NGOs worldwide and volunteer.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white font-bold text-xl mb-4">
              2
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Match to Project</h3>
            <p className="text-slate-600 leading-relaxed">
              Activate your skills, volunteer, collaborate with global partners.
            </p>
          </div>

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
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

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

        <Link href="/login" className="inline-block">
          <Button size="lg" className="gap-2 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg px-8 rounded-xl" data-testid="button-join-nexus">
            Join the Nexus
          </Button>
        </Link>
      </section>

      {/* Profile Cards Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <WorldMapHeader selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedCountry("community")}
            className="flex justify-center cursor-pointer group"
          >
            <img 
              src={communityVolunteersImg}
              alt="Community Volunteers"
              className="w-full h-64 sm:h-72 rounded-2xl object-cover shadow-2xl group-hover:shadow-3xl transition-shadow"
              loading="lazy"
            />
          </button>
          <button
            onClick={() => setSelectedCountry("doctors")}
            className="flex justify-center cursor-pointer group"
          >
            <img 
              src={doctorsVolunteeringImg}
              alt="Doctors Volunteering"
              className="w-full h-64 sm:h-72 rounded-2xl object-cover shadow-2xl group-hover:shadow-3xl transition-shadow"
              loading="lazy"
            />
          </button>
          <button
            onClick={() => setSelectedCountry("village")}
            className="flex justify-center cursor-pointer group"
          >
            <img 
              src={villageVolunteersImg}
              alt="Village Volunteers"
              className="w-full h-64 sm:h-72 rounded-2xl object-cover shadow-2xl group-hover:shadow-3xl transition-shadow"
              loading="lazy"
            />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 bg-slate-100 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          <p>© 2025 Synerxus. Intelligent connections for sustainable development worldwide.</p>
        </div>
      </footer>
    </div>
  );
}
