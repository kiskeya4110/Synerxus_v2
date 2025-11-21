import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { SDGCircularWheel } from "@/components/sdg/sdg-circular-wheel";
import { useState, useEffect, useRef } from "react";
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
import collageImg from "@assets/Gemini_Generated_Image_n3wsmrn3wsmrn3ws_1763713223121.png";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COUNTRY_DATA = {
  philippines: {
    name: "Philippines",
    coords: { x: 805, y: 257 },
    pilot: "Healthcare & Community Development",
    description: "Partnering with local NGOs to deliver medical missions and sustainable community health programs.",
  },
  usa: {
    name: "United States",
    coords: { x: 225, y: 176 },
    pilot: "Skills Matching & Training",
    description: "Advanced volunteer skill assessment and professional development programs.",
  },
  mexico: {
    name: "Mexico",
    coords: { x: 207, y: 221 },
    pilot: "Education & Environmental",
    description: "Focused on environmental conservation and education initiatives across rural communities.",
  },
  haiti: {
    name: "Haiti",
    coords: { x: 287, y: 237 },
    pilot: "Infrastructure & Relief",
    description: "Disaster relief and infrastructure development programs supporting vulnerable populations.",
  },
  zimbabwe: {
    name: "Zimbabwe",
    coords: { x: 558, y: 363 },
    pilot: "Women's Empowerment",
    description: "Supporting women entrepreneurs and community leaders through mentorship and resource access.",
  },
  zambia: {
    name: "Zambia",
    coords: { x: 554, y: 344 },
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

const IMPACT_FACTS = {
  volunteers: [
    "🙋🏽‍♂️ Over 1 billion people volunteer globally, contributing the equivalent of 109 million full-time workers.",
    "🙋🏽‍♂️ 70% of volunteer work is informal, happening outside of organizations—especially in lower-income regions.",
    "🙋🏽‍♂️ Women perform 57% of global volunteer work, often in community-based, care-driven roles.",
    "🙋🏽‍♂️ Volunteers are 66% more likely to donate financially to the causes they support.",
    "🙋🏽‍♂️ The average value of volunteer time is $28.54/hour, with over $184 billion contributed annually in the U.S. alone.",
  ],
  ngos: [
    "🌍 India has over 3.1 million NGOs, the U.S. over 1.5 million, and the EU employs 11.9 million people in the nonprofit sector.",
    "🌍 NGOs operate in over 190 countries, reaching urban centers and remote villages alike.",
    "🌍 Leading sectors: Health (WHO, Doctors Without Borders), Education (UNICEF, Save the Children), Environment (WWF, Greenpeace).",
    "🌍 Human Rights organizations like Amnesty International and Human Rights Watch drive global accountability.",
    "🌍 Top challenges: funding volatility, operational efficiency, cultural integration, and impact measurement.",
  ],
  csr: [
    "🏢 CSR (Corporate Social Responsibility) focuses on internal values—volunteering, ethics, and community engagement.",
    "🏢 ESG (Environmental, Social, Governance) is investor-facing, with measurable metrics for sustainability and ethical performance.",
    "🏢 71% of consumers consider sustainability when making purchases; 66% of millennials factor ESG into job decisions.",
    "🏢 ESG scores influence investment, talent acquisition, and brand reputation—making it a strategic imperative, not just a moral one.",
    "🏢 CSR boosts morale and retention, while ESG drives transparency and accountability across operations.",
  ],
};

function getRandomFact(category: 'volunteers' | 'ngos' | 'csr'): string {
  const facts = IMPACT_FACTS[category];
  return facts[Math.floor(Math.random() * facts.length)];
}

interface WorldMapHeaderProps {
  selectedCountry: string | null;
  setSelectedCountry: (country: string | null) => void;
}

const WorldMapHeader = ({ selectedCountry, setSelectedCountry }: WorldMapHeaderProps) => {
  const selectedData = selectedCountry ? COUNTRY_DATA[selectedCountry as keyof typeof COUNTRY_DATA] : null;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    if (!map.current) {
      map.current = L.map(mapContainer.current, {
        minZoom: 2,
        maxZoom: 4,
      }).setView([20, 0], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        opacity: 0.7,
      }).addTo(map.current);
    }

    // Clear existing markers and polylines
    map.current.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.current!.removeLayer(layer);
      }
    });

    // Define country coordinates
    const countryCoords: { [key: string]: [number, number] } = {
      philippines: [12.8797, 121.7740],
      usa: [37.0902, -95.7129],
      mexico: [23.6345, -102.5528],
      haiti: [18.9712, -72.2852],
      zimbabwe: [-19.0134, 29.1549],
      zambia: [-13.1339, 27.8493],
    };

    // Helper function to create curved path with bezier interpolation
    const createCurvedPath = (start: [number, number], end: [number, number], curveDirection: number = 1, segments: number = 50): [number, number][] => {
      const path: [number, number][] = [];
      const midLat = (start[0] + end[0]) / 2;
      const midLon = (start[1] + end[1]) / 2;
      
      // Create a control point that curves the path up or down
      const latDiff = end[0] - start[0];
      const lonDiff = end[1] - start[1];
      const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
      
      // Control point is perpendicular to the line, at distance/3
      // Multiply by curveDirection to alternate up/down curves
      const perpLat = -lonDiff / distance * (distance / 3) * curveDirection;
      const perpLon = latDiff / distance * (distance / 3) * curveDirection;
      
      const controlLat = midLat + perpLat;
      const controlLon = midLon + perpLon;
      
      // Quadratic bezier interpolation
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * controlLat + t * t * end[0];
        const lon = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * controlLon + t * t * end[1];
        path.push([lat, lon]);
      }
      
      return path;
    };

    // Add animated polylines connecting countries
    const connections = [
      ['usa', 'mexico'],
      ['usa', 'haiti'],
      ['mexico', 'haiti'],
      ['usa', 'philippines'],
      ['usa', 'zimbabwe'],
      ['mexico', 'zambia'],
      ['haiti', 'zimbabwe'],
      ['zimbabwe', 'zambia'],
      ['philippines', 'zimbabwe'],
      ['philippines', 'zambia'],
    ];

    connections.forEach(([from, to], index) => {
      const fromCoord = countryCoords[from];
      const toCoord = countryCoords[to];
      if (fromCoord && toCoord) {
        // Alternate curve direction: odd indices curve up, even indices curve down
        const curveDirection = index % 2 === 0 ? 1 : -1;
        const curvedPath = createCurvedPath(fromCoord, toCoord, curveDirection);
        const polyline = L.polyline(curvedPath, {
          color: '#f97316',
          weight: 2,
          opacity: 0.6,
          dashArray: '8, 4',
          lineCap: 'round',
          lineJoin: 'round',
          className: `flight-path-${index}`,
        }).addTo(map.current!);
        
        // Add animation delay to each polyline
        const pathElement = polyline.getElement() as SVGPathElement;
        if (pathElement) {
          pathElement.style.animation = `dashFlow 20s linear infinite`;
          pathElement.style.animationDelay = `${index * 1.5}s`;
        }
      }
    });

    // Add country markers
    Object.entries(COUNTRY_DATA).forEach(([key, country]) => {
      const coords = countryCoords[key];
      if (!coords) return;

      const marker = L.circleMarker(coords, {
        radius: 10,
        fillColor: '#b45309',
        color: '#b45309',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      });

      marker.bindPopup(`<div class="font-semibold">${country.name}</div><div class="text-sm">${country.pilot}</div>`);
      marker.bindTooltip(country.name, {
        permanent: true,
        direction: 'top',
        offset: [0, -15],
        className: 'country-label-tooltip'
      });
      marker.on('click', () => {
        setSelectedCountry(key);
        // Navigate to country page after a short delay to allow dialog to close
        setTimeout(() => {
          window.location.href = `/country/${key}`;
        }, 300);
      });
      marker.addTo(map.current!);
    });
  }, [setSelectedCountry]);

  return (
    <div className="w-full mb-16 px-4 sm:px-6">
      {/* Section Title */}
      <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-8">
        Active Pilot Programs
      </h2>
      
      {/* Leaflet Map */}
      <div 
        ref={mapContainer}
        className="w-full max-w-6xl mx-auto rounded-lg overflow-hidden shadow-lg"
        style={{ height: '500px' }}
      />

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
          <Link href="/login">
            <button className="w-full text-center hover:opacity-80 transition-opacity">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Create Profile</h3>
              <p className="text-slate-600 leading-relaxed">
                Sign up, get verified, connect with NGOs worldwide and volunteer.
              </p>
            </button>
          </Link>

          <Link href="/login">
            <button className="w-full text-center hover:opacity-80 transition-opacity">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Match to Project</h3>
              <p className="text-slate-600 leading-relaxed">
                Activate your skills, volunteer, collaborate with global partners.
              </p>
            </button>
          </Link>

          <Link href="/login">
            <button className="w-full text-center hover:opacity-80 transition-opacity">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Track Impact SDGs</h3>
              <p className="text-slate-600 leading-relaxed">
                Measure and manage the positive changes you create.
              </p>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function Landing() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [volunteerFact, setVolunteerFact] = useState(() => getRandomFact('volunteers'));
  const [ngoFact, setNgoFact] = useState(() => getRandomFact('ngos'));
  const [csrFact, setCsrFact] = useState(() => getRandomFact('csr'));

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
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Content */}
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl sm:text-6xl md:text-6xl font-bold mb-6 leading-tight" data-testid="text-hero-title">
              <span className="text-blue-900">Connect. Manage.</span><br />
              <span className="text-amber-600">Impact Globally.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-700 mb-10 leading-relaxed font-medium" data-testid="text-hero-description">
              Implementing the SDGs and reaching the nexus of impact takes collective action. Our platform helps you join the effort, track outcomes, and manage projects.
            </p>

            <Link href="/login" className="inline-block w-fit">
              <Button size="lg" className="gap-2 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg px-8 rounded-xl" data-testid="button-join-nexus">
                Join the Nexus
              </Button>
            </Link>
          </div>

          {/* Right Collage Image */}
          <div className="flex justify-center">
            <img 
              src={collageImg}
              alt="Volunteer Collage"
              className="w-full max-w-md rounded-2xl shadow-2xl object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Profile Cards Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <WorldMapHeader selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedCountry("community")}
            onMouseEnter={() => setVolunteerFact(getRandomFact('volunteers'))}
            className="flex justify-center cursor-pointer group relative"
          >
            <div className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-3xl transition-shadow">
              <img 
                src={communityVolunteersImg}
                alt="Community Volunteers"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-end p-4">
                <p className="text-white text-sm leading-relaxed font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {volunteerFact}
                </p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setSelectedCountry("doctors")}
            onMouseEnter={() => setNgoFact(getRandomFact('ngos'))}
            className="flex justify-center cursor-pointer group relative"
          >
            <div className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-3xl transition-shadow">
              <img 
                src={doctorsVolunteeringImg}
                alt="Doctors Volunteering"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-end p-4">
                <p className="text-white text-sm leading-relaxed font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {ngoFact}
                </p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setSelectedCountry("village")}
            onMouseEnter={() => setCsrFact(getRandomFact('csr'))}
            className="flex justify-center cursor-pointer group relative"
          >
            <div className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-3xl transition-shadow">
              <img 
                src={villageVolunteersImg}
                alt="Village Volunteers"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-end p-4">
                <p className="text-white text-sm leading-relaxed font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {csrFact}
                </p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* SDG Wheel Section */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          {/* SDG Wheel with Logo Center */}
          <div className="relative flex justify-center items-center mb-12">
            {/* Background glow effect */}
            <div className="absolute inset-0 flex justify-center items-center">
              <div className="w-96 h-96 sm:w-full sm:h-96 bg-gradient-to-r from-blue-900/5 to-amber-600/5 rounded-full blur-3xl"></div>
            </div>
            
            {/* SDG Wheel */}
            <div className="relative z-10 w-full">
              <SDGCircularWheel />
            </div>
          </div>

          {/* CTA Text */}
          <div className="text-center mt-16 px-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6">
              <span className="text-blue-900">From Local Service</span><br />
              <span className="text-amber-600">to Global Legacy...</span><br />
              <span className="text-slate-700">Where Purpose Meets Progress</span>
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Every volunteer action contributes to sustainable development. Join thousands making a measurable impact across all 17 SDGs worldwide.
            </p>
            <Link href="/login">
              <Button size="lg" className="gap-2 min-h-[48px] bg-blue-900 hover:bg-blue-950 text-white font-semibold text-lg px-8 rounded-xl">
                Start Your Legacy Today
              </Button>
            </Link>
          </div>
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
