import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { SDGCircularWheel } from "@/components/sdg/sdg-circular-wheel";
import Footer from "@/components/layout/footer";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Optimized WebP images for better performance (98% smaller than originals)
import communityVolunteersImg from "@assets/community-volunteers.webp";
import doctorsVolunteeringImg from "@assets/doctors-volunteering.webp";
import villageVolunteersImg from "@assets/village-volunteers.webp";
import collageImg from "@assets/hero-volunteer-collage.webp";
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
    "🙋🏽‍♂️ The average value of volunteer time is $34.79/hour (Independent Sector 2025), with over $200 billion contributed annually in the U.S. alone.",
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

// Banner stats fetched from API (real data from your platform)
const DEFAULT_STATS = [
  "📊 Real-time volunteer impact metrics loading...",
  "🌍 Join thousands of volunteers making a global difference",
  "🎯 Connect. Manage. Impact Globally.",
];

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
      // Detect if mobile for responsive zoom
      const isMobile = window.innerWidth < 768;
      const initialZoom = isMobile ? 1 : 2;
      
      map.current = L.map(mapContainer.current, {
        minZoom: isMobile ? 1 : 2,
        maxZoom: 5,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: false,
        boxZoom: true,
      }).setView([20, 0], initialZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        opacity: 0.7,
      }).addTo(map.current);
    }

    // Clear existing markers and polylines
    const currentMap = map.current;
    currentMap.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        currentMap.removeLayer(layer);
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
    const isMobile = window.innerWidth < 768;
    Object.entries(COUNTRY_DATA).forEach(([key, country]) => {
      const coords = countryCoords[key];
      if (!coords) return;

      const markerRadius = isMobile ? 6 : 10;
      
      const marker = L.circleMarker(coords, {
        radius: markerRadius,
        fillColor: '#b45309',
        color: '#b45309',
        weight: isMobile ? 1.5 : 2,
        opacity: 1,
        fillOpacity: 0.8
      });

      marker.bindPopup(`<div class="font-semibold">${country.name}</div><div class="text-sm">${country.pilot}</div>`);
      marker.bindTooltip(country.name, {
        permanent: !isMobile,
        direction: 'top',
        offset: [0, isMobile ? -10 : -15],
        className: 'country-label-tooltip text-xs md:text-sm'
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
    <div className="w-full mb-16 px-[8%] sm:px-[15%]">
      {/* Section Title */}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 text-center mb-6 sm:mb-8">
        Active Pilot Programs
      </h2>
      
      {/* Leaflet Map */}
      <div 
        ref={mapContainer}
        className="w-full max-w-6xl mx-auto rounded-lg overflow-hidden shadow-lg border border-slate-200"
        style={{ 
          height: 'clamp(280px, 60vw, 600px)',
          maxHeight: 'calc(100vh - 300px)'
        }}
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

    </div>
  );
};

const RealTimeStatsBanner = () => {
  const { data, isLoading } = useQuery<{ stats: string[] }>({
    queryKey: ['/api/banner-stats'],
    staleTime: 1000 * 60 * 5, // Refresh every 5 minutes
  });

  const stats = data?.stats || DEFAULT_STATS;

  // Triple the stats for seamless looping
  const displayStats = isLoading ? DEFAULT_STATS : stats;
  const scrollItems = [...displayStats, ...displayStats, ...displayStats];

  return (
    <section className="bg-gradient-to-r from-blue-900/20 via-blue-600/15 to-amber-600/20 py-4 sm:py-6 md:py-8 border-y-2 border-blue-900/30 w-full overflow-hidden shadow-lg">
      <h3 className="text-center text-base sm:text-lg md:text-xl font-bold text-blue-900 mb-3 sm:mb-4 uppercase tracking-wide px-[8%] sm:px-[15%] drop-shadow-sm">
        📊 Live Impact Dashboard
      </h3>
      <div className="relative w-full bg-gradient-to-r from-white/70 via-blue-50/80 to-white/70 py-3 shadow-inner overflow-hidden">
        <div className="animate-scroll whitespace-nowrap">
          {scrollItems.map((stat, index) => (
            <div
              key={index}
              className="inline-block mx-3 sm:mx-5 px-4 sm:px-6 py-2.5 flex-shrink-0 bg-white rounded-xl shadow-lg border-2 border-blue-300 hover:scale-105 hover:shadow-xl transition-all duration-300 hover:border-amber-500"
            >
              <p className="text-sm sm:text-base md:text-lg text-blue-900 font-bold whitespace-nowrap">{stat}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const VolunteerSpotlightSection = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayData, setDisplayData] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery<{ spotlight: any }>({
    queryKey: ['/api/volunteer-spotlight'],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchInterval: 1000 * 60 * 10, // Refetch every 10 minutes to check for new spotlights
  });

  const spotlight = data?.spotlight;

  // Update display data with transition effect
  useEffect(() => {
    if (spotlight && JSON.stringify(spotlight) !== JSON.stringify(displayData)) {
      setIsTransitioning(true);
      const timeout = setTimeout(() => {
        setDisplayData(spotlight);
        setIsTransitioning(false);
      }, 300);
      return () => clearTimeout(timeout);
    } else if (spotlight && !displayData) {
      setDisplayData(spotlight);
    }
  }, [spotlight]);

  const current = displayData || spotlight;
  const isOrganization = current?.type === 'organization';

  // Format impact message from stats (for volunteers)
  const getVolunteerImpactMessage = (stats: any) => {
    if (!stats) return "Making a difference every day!";
    const hours = stats.thisWeekHours || 0;
    const impacts = stats.thisWeekImpacts || 0;
    if (hours > 0 && impacts > 0) {
      return `${hours} hours volunteered across ${impacts} activities this week`;
    } else if (hours > 0) {
      return `${hours} hours volunteered this week`;
    } else if (impacts > 0) {
      return `${impacts} volunteer activities completed this week`;
    }
    return "Dedicated to making a positive impact";
  };

  // Format impact message for organizations
  const getOrganizationImpactMessage = (stats: any, profile: any) => {
    const projects = stats?.projectCount || 0;
    const sdgs = stats?.sdgCount || 0;
    if (projects > 0 && sdgs > 0) {
      return `${projects} active project${projects > 1 ? 's' : ''} aligned with ${sdgs} UN Sustainable Development Goal${sdgs > 1 ? 's' : ''}`;
    } else if (projects > 0) {
      return `${projects} active project${projects > 1 ? 's' : ''} creating community impact`;
    } else if (sdgs > 0) {
      return `Focused on ${sdgs} UN Sustainable Development Goal${sdgs > 1 ? 's' : ''}`;
    }
    return "Creating sustainable community impact";
  };

  // Get skills/needs display
  const getBadges = (profile: any, isOrg: boolean) => {
    if (isOrg) {
      return (profile?.volunteerNeeds || profile?.focusAreas || []).slice(0, 3);
    }
    return (profile?.skills || []).slice(0, 3);
  };

  // SDG names for display
  const sdgNames: { [key: number]: string } = {
    1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
    5: "Gender Equality", 6: "Clean Water", 7: "Clean Energy", 8: "Decent Work",
    9: "Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
    12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
    15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships"
  };

  return (
    <section className={`py-12 sm:py-16 md:py-20 border-y border-slate-200 ${isOrganization
      ? 'bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50'
      : 'bg-gradient-to-br from-blue-50 via-slate-50 to-amber-50'
    }`}>
      <div className="container mx-auto px-[8%] sm:px-[15%]">
        <div className="max-w-4xl mx-auto">
          {/* Section Title - changes based on type */}
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">
              {isOrganization ? '🏢 Organization Spotlight' : '⭐ Volunteer Spotlight'}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              {isOrganization
                ? 'Highlighting organizations making a difference'
                : 'Celebrating the impact of volunteers like you'
              }
            </p>
          </div>

          {/* Spotlight Card */}
          <div className={`bg-white rounded-2xl shadow-lg overflow-hidden border ${isOrganization ? 'border-emerald-200' : 'border-slate-200'} hover:shadow-xl transition-all duration-300 ${isTransitioning ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100'}`}>
            {isLoading && !current ? (
              <div className="p-6 sm:p-8 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : current ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                {/* Spotlight Photo/Logo */}
                <div className={`md:col-span-1 flex items-center justify-center min-h-64 md:min-h-auto relative overflow-hidden ${isOrganization
                  ? 'bg-gradient-to-br from-emerald-900/10 to-teal-600/10'
                  : 'bg-gradient-to-br from-blue-900/10 to-amber-600/10'
                }`}>
                  {current.user?.avatar ? (
                    <img
                      src={current.user.avatar}
                      alt={current.user.displayName}
                      className={`w-full h-full object-cover ${isOrganization ? 'p-8 object-contain' : ''}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-3 p-6">
                      <div className={`w-24 h-24 ${isOrganization ? 'rounded-xl' : 'rounded-full'} flex items-center justify-center shadow-lg ${isOrganization
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                        : 'bg-gradient-to-br from-blue-900 to-amber-600'
                      }`}>
                        <span className="text-white text-4xl font-bold">
                          {current.user?.displayName?.charAt(0).toUpperCase() || (isOrganization ? '🏢' : '✨')}
                        </span>
                      </div>
                      <p className="text-slate-700 font-semibold text-center text-lg">
                        {current.user?.displayName || (isOrganization ? 'Featured Organization' : 'Volunteer Hero')}
                      </p>
                      {/* Type indicator */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOrganization
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isOrganization ? (current.profile?.organizationType || 'Organization') : 'Volunteer'}
                      </span>
                      {/* Skills/Needs badges */}
                      {getBadges(current.profile, isOrganization).length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center mt-2">
                          {getBadges(current.profile, isOrganization).map((item: string, idx: number) => (
                            <span key={idx} className={`text-xs px-2 py-0.5 rounded-full ${isOrganization
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Spotlight Story */}
                <div className="md:col-span-2 p-6 sm:p-8 flex flex-col justify-between">
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                          {current.user?.displayName || (isOrganization ? 'Featured Organization' : 'Featured Volunteer')}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOrganization
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isOrganization ? 'Featured Partner' : "This Week's Star"}
                        </span>
                      </div>

                      {/* Organization-specific info */}
                      {isOrganization && current.profile?.location && (
                        <p className="text-sm text-slate-500 mb-2">📍 {current.profile.location}</p>
                      )}

                      {/* Story/Mission */}
                      <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                        {current.story || (isOrganization
                          ? "Dedicated to creating positive change in communities through sustainable programs."
                          : "Dedicated to making a positive impact in their community through volunteering."
                        )}
                      </p>
                    </div>

                    {/* Impact Stats - Different for volunteers vs organizations */}
                    <div className={`rounded-lg p-4 border ${isOrganization
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                      : 'bg-gradient-to-r from-blue-50 to-amber-50 border-blue-200'
                    }`}>
                      <p className={`text-sm font-semibold mb-1 ${isOrganization ? 'text-emerald-900' : 'text-blue-900'}`}>
                        {isOrganization ? 'Organization Impact' : "This Week's Impact"}
                      </p>
                      <p className={`text-base sm:text-lg font-bold ${isOrganization ? 'text-emerald-900' : 'text-blue-900'}`}>
                        {isOrganization
                          ? getOrganizationImpactMessage(current.stats, current.profile)
                          : getVolunteerImpactMessage(current.stats)
                        }
                      </p>
                    </div>

                    {/* Organization: SDGs and Focus Areas */}
                    {isOrganization && current.profile?.primarySdgs && current.profile.primarySdgs.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-slate-500 font-medium">SDG Focus:</span>
                        {current.profile.primarySdgs.slice(0, 4).map((sdg: number, idx: number) => (
                          <span key={idx} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            SDG {sdg}: {sdgNames[sdg] || 'Goal'}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Organization: Target Beneficiaries */}
                    {isOrganization && current.profile?.targetBeneficiaries && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-slate-500 font-medium">Serving:</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          {current.profile.targetBeneficiaries}
                        </span>
                      </div>
                    )}

                    {/* Volunteer: Interests */}
                    {!isOrganization && current.profile?.interests && current.profile.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-slate-500 font-medium">Interests:</span>
                        {current.profile.interests.slice(0, 4).map((interest: string, idx: number) => (
                          <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Volunteer: Location and Experience */}
                    {!isOrganization && (current.profile?.location || current.profile?.yearsOfExperience) && (
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {current.profile?.location && (
                          <span>📍 {current.profile.location}</span>
                        )}
                        {current.profile?.yearsOfExperience && (
                          <span>🎯 {current.profile.yearsOfExperience}+ years experience</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CTA Button - Different for org vs volunteer */}
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <Link href={isOrganization ? "/organizations" : "/login"} className="block">
                      <Button className={`w-full font-semibold text-sm sm:text-base rounded-lg ${isOrganization
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-blue-900 hover:bg-blue-950 text-white'
                      }`} data-testid="button-spotlight-cta">
                        {isOrganization ? 'Explore Organizations' : 'Start Your Volunteer Journey'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-slate-600 text-base">
                  Be the next spotlight! Join our community and make an impact.
                </p>
                <Link href="/login" className="block mt-6">
                  <Button className="mx-auto bg-blue-900 hover:bg-blue-950 text-white font-semibold">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default function Landing() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [volunteerFact, setVolunteerFact] = useState(() => getRandomFact('volunteers'));
  const [ngoFact, setNgoFact] = useState(() => getRandomFact('ngos'));
  const [csrFact, setCsrFact] = useState(() => getRandomFact('csr'));
  
  // Check localStorage for current user ID to determine login status
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
  
  // Only fetch user if there's a stored user ID (actually logged in)
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      if (!storedUserId) return null;
      const response = await fetch(`/api/users/me?userId=${storedUserId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!storedUserId,
  });
  
  // User is only logged in if they have a stored user ID AND the user data was fetched
  const isLoggedIn = !!storedUserId && !!currentUser?.id;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#faf9f7] flex flex-col overflow-x-hidden w-full max-w-full">
      {/* Navigation - Consistent site-wide header with menu tabs */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-stone-200 shadow-sm safe-area-top">
        <div className="container mx-auto px-[5%] sm:px-[8%] py-3 sm:py-4 flex justify-between items-center gap-3 sm:gap-4">
          {/* Logo */}
          <Link href="/landing">
            <div className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 min-w-0 touch-feedback">
              <Logo size="sm" showMotto={true} />
            </div>
          </Link>

          {/* Center: Navigation Menu - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/landing">
              <Button variant="ghost" size="sm" className="text-indigo-700 font-semibold hover:bg-indigo-50 rounded-lg bg-indigo-50/60">
                Home
              </Button>
            </Link>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-stone-700 font-medium hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">
                Projects
              </Button>
            </Link>
            <Link href="/organizations">
              <Button variant="ghost" size="sm" className="text-stone-700 font-medium hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">
                Organizations
              </Button>
            </Link>
            <Link href="/help">
              <Button variant="ghost" size="sm" className="text-stone-700 font-medium hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">
                Help
              </Button>
            </Link>
          </div>

          {/* Right: Auth Buttons */}
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button size="sm" className="min-h-[44px] sm:min-h-[40px] whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 rounded-xl active:scale-95 transition-transform" data-testid="button-my-dashboard">
                  My Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button size="sm" className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-4 rounded-xl active:scale-95 transition-transform" data-testid="button-login-nav">Log In</Button>
                </Link>
                <Link href="/login?tab=register" className="w-full sm:w-auto">
                  <Button size="sm" className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 rounded-xl active:scale-95 transition-transform" data-testid="button-sign-up-nav">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Scrollable main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full">
      {/* Hero Section */}
      <section className="container mx-auto px-[8%] sm:px-[15%] py-8 sm:py-12 md:py-20 lg:py-28 relative overflow-hidden" data-testid="section-hero">
        {/* Animated Background Elements - Floating SDG Icons - Hidden on mobile to prevent interference */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 md:opacity-[0.15]">
          {/* Animated Floating Items */}
          <div className="absolute top-10 left-20 text-6xl opacity-50 animate-float" style={{ animationDelay: "0s" }}>🎯</div>
          <div className="absolute top-40 right-32 text-5xl opacity-40 animate-float-slow" style={{ animationDelay: "1s" }}>💧</div>
          <div className="absolute bottom-32 left-40 text-5xl opacity-45 animate-float" style={{ animationDelay: "2s" }}>🌍</div>
          <div className="absolute top-60 right-60 text-4xl opacity-35 animate-float-slow" style={{ animationDelay: "0.5s" }}>📚</div>
          <div className="absolute bottom-60 right-20 text-5xl opacity-40 animate-float" style={{ animationDelay: "1.5s" }}>❤️</div>
          <div className="absolute top-32 left-60 text-4xl opacity-50 animate-float-slow" style={{ animationDelay: "3s" }}>⚡</div>
          <div className="absolute bottom-40 left-20 text-5xl opacity-45 animate-float" style={{ animationDelay: "2.5s" }}>🌳</div>
          <div className="absolute top-20 right-40 text-4xl opacity-35 animate-float-slow" style={{ animationDelay: "1.2s" }}>🏭</div>
          <div className="absolute bottom-20 right-60 text-5xl opacity-40 animate-float" style={{ animationDelay: "0.8s" }}>🤝</div>
          <div className="absolute top-1/2 left-10 text-4xl opacity-30 animate-float-slow" style={{ animationDelay: "2.2s" }}>♻️</div>

          {/* Large Faint Globe Background */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] opacity-70">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-green-500 blur-3xl"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-300/30"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center relative z-10">
          {/* Left Content - Text with Globe */}
          <div className="flex flex-col justify-center order-2 md:order-1">
            {/* Header with Small Rotating Globe in front */}
            <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
              {/* Small Rotating Globe */}
              <div className="relative flex-shrink-0 mt-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-600 to-green-500 shadow-2xl animate-spin-slow relative overflow-hidden">
                  {/* Globe continents effect */}
                  <div className="absolute inset-0 opacity-40">
                    <div className="absolute top-1/4 left-1/4 w-5 h-4 bg-green-700 rounded-full blur-sm"></div>
                    <div className="absolute bottom-1/3 right-1/4 w-4 h-5 bg-green-700 rounded-full blur-sm"></div>
                    <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-700 rounded-full blur-sm"></div>
                  </div>
                  {/* Shine effect */}
                  <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full opacity-40 blur-sm"></div>
                </div>
                {/* Orbit ring */}
                <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-pulse"></div>
              </div>

              {/* Header Text */}
              <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold leading-tight flex-1 min-w-0" data-testid="text-hero-title">
                <span className="text-blue-900 block sm:inline">Bridge Action</span>
                <br className="hidden sm:block" />
                <span className="text-amber-600 block sm:inline">Impact, Globally</span>
              </h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-700 mb-6 sm:mb-10 leading-relaxed font-medium" data-testid="text-hero-description">
              Synerxus transforms volunteer action into measurable global impact.
            </p>
            <ul className="text-xs sm:text-sm md:text-base lg:text-lg text-slate-700 mb-6 sm:mb-10 space-y-2 sm:space-y-3 leading-relaxed font-medium">
              <li className="flex items-start">
                <span className="mr-2 flex-shrink-0">•</span>
                <span>Unify nonprofits, volunteers, and CSR teams on one platform.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 flex-shrink-0">•</span>
                <span>Track outcomes in real time, align with SDGs, and automate reporting.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 flex-shrink-0">•</span>
                <span>Show stakeholders the true value of service—without the spreadsheets.</span>
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-fit">
              {isLoggedIn ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" className="min-h-[52px] w-full sm:w-auto bg-blue-900 hover:bg-blue-950 text-white font-bold text-base sm:text-lg px-6 sm:px-8 rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-blue-900/25" data-testid="button-my-dashboard-hero">
                    My Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="w-full sm:w-auto">
                    <Button size="lg" className="min-h-[52px] w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold text-base sm:text-lg px-6 sm:px-8 rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-amber-500/25" data-testid="button-sign-in-hero">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/login?tab=register" className="w-full sm:w-auto">
                    <Button size="lg" className="min-h-[52px] w-full sm:w-auto bg-blue-900 hover:bg-blue-950 text-white font-bold text-base sm:text-lg px-6 sm:px-8 rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-blue-900/25" data-testid="button-join-hero">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Collage Image */}
          <div className="flex flex-col items-center gap-4 sm:gap-6 order-1 md:order-2 w-full max-w-sm sm:max-w-md md:max-w-none mx-auto">
            <Link href={isLoggedIn ? "/dashboard" : "/login"} className="flex justify-center cursor-pointer group w-full">
              <div className="relative w-full rounded-2xl shadow-2xl overflow-hidden group-hover:shadow-3xl transition-shadow bg-slate-100">
                <img
                  src={collageImg}
                  alt="Volunteer Collage"
                  className="w-full h-auto object-contain"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
              </div>
            </Link>
            <p className="text-xs sm:text-sm italic text-slate-600 text-center leading-relaxed px-2 max-w-xs sm:max-w-sm md:max-w-none" data-testid="text-kofi-annan-quote">
              "Knowledge is power. Information is liberating. Education is the premise of progress, in every society, in every family." — Kofi Annan
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-[8%] sm:px-[15%] py-6 sm:py-8 md:py-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center pt-4 sm:pt-6 px-4 relative z-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-3 sm:mb-4">
              <span className="text-blue-900">From Local Service</span><br />
              <span className="text-amber-600">to Global Legacy</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-8 sm:mb-10 max-w-2xl mx-auto">
              Join thousands making measurable impact across all 17 SDGs worldwide.
            </p>

            {/* How It Works - 1 Row, 3 Columns */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 max-w-4xl mx-auto mb-10">
              <Link href={isLoggedIn ? "/volunteer-profile-settings" : "/volunteer-intake"} className="group">
                <div className="bg-white rounded-xl p-3 sm:p-5 md:p-6 shadow-lg border-2 border-blue-200 hover:border-blue-500 transition-all hover:shadow-xl h-full">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm sm:text-lg md:text-xl mx-auto mb-2 sm:mb-3">
                    1
                  </div>
                  <h3 className="font-bold text-blue-900 text-xs sm:text-sm md:text-base mb-1 sm:mb-2">Create Profile</h3>
                  <p className="text-slate-600 text-[10px] sm:text-xs md:text-sm leading-relaxed hidden sm:block">
                    Set up your volunteer profile with skills and interests
                  </p>
                </div>
              </Link>
              
              <Link href={isLoggedIn ? "/discover-opportunities" : "/login"} className="group">
                <div className="bg-white rounded-xl p-3 sm:p-5 md:p-6 shadow-lg border-2 border-amber-200 hover:border-amber-500 transition-all hover:shadow-xl h-full">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm sm:text-lg md:text-xl mx-auto mb-2 sm:mb-3">
                    2
                  </div>
                  <h3 className="font-bold text-amber-600 text-xs sm:text-sm md:text-base mb-1 sm:mb-2">Match to Projects</h3>
                  <p className="text-slate-600 text-[10px] sm:text-xs md:text-sm leading-relaxed hidden sm:block">
                    Get AI-matched to opportunities aligned with your SDGs
                  </p>
                </div>
              </Link>
              
              <Link href={isLoggedIn ? "/dashboard" : "/login"} className="group">
                <div className="bg-white rounded-xl p-3 sm:p-5 md:p-6 shadow-lg border-2 border-green-200 hover:border-green-500 transition-all hover:shadow-xl h-full">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm sm:text-lg md:text-xl mx-auto mb-2 sm:mb-3">
                    3
                  </div>
                  <h3 className="font-bold text-green-600 text-xs sm:text-sm md:text-base mb-1 sm:mb-2">Make Impact</h3>
                  <p className="text-slate-600 text-[10px] sm:text-xs md:text-sm leading-relaxed hidden sm:block">
                    Track your contributions and measure global outcomes
                  </p>
                </div>
              </Link>
            </div>
            
            {/* Main CTA Button */}
            <div>
              <Link href={isLoggedIn ? "/dashboard" : "/volunteer-intake"}>
                <Button size="lg" className="gap-2 min-h-[48px] bg-blue-900 hover:bg-blue-950 text-white font-semibold px-8 rounded-xl relative z-30">
                  {isLoggedIn ? "My Dashboard" : "Get Started Now"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Real-Time Impact Metrics Banner */}
      <RealTimeStatsBanner />

      {/* Volunteer Spotlight Section */}
      <VolunteerSpotlightSection />

      {/* Profile Cards Section */}
      <section className="container mx-auto px-[8%] sm:px-[15%] py-12 sm:py-16">
        <WorldMapHeader selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedCountry("community")}
            onMouseEnter={() => setVolunteerFact(getRandomFact('volunteers'))}
            className="flex justify-center cursor-pointer group relative active:scale-95 transition-transform"
          >
            <div className="w-full h-48 sm:h-64 md:h-72 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-3xl transition-shadow">
              <img 
                src={communityVolunteersImg}
                alt="Community Volunteers"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 sm:bg-black/0 sm:group-hover:bg-black/60 transition-all duration-300 flex items-end p-3 sm:p-4">
                <p className="text-white text-xs sm:text-sm leading-relaxed font-medium opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                  {volunteerFact}
                </p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setSelectedCountry("doctors")}
            onMouseEnter={() => setNgoFact(getRandomFact('ngos'))}
            className="flex justify-center cursor-pointer group relative active:scale-95 transition-transform"
          >
            <div className="w-full h-48 sm:h-64 md:h-72 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-3xl transition-shadow">
              <img 
                src={doctorsVolunteeringImg}
                alt="Doctors Volunteering"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 sm:bg-black/0 sm:group-hover:bg-black/60 transition-all duration-300 flex items-end p-3 sm:p-4">
                <p className="text-white text-xs sm:text-sm leading-relaxed font-medium opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                  {ngoFact}
                </p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setSelectedCountry("village")}
            onMouseEnter={() => setCsrFact(getRandomFact('csr'))}
            className="flex justify-center cursor-pointer group relative active:scale-95 transition-transform"
          >
            <div className="w-full h-48 sm:h-64 md:h-72 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-3xl transition-shadow">
              <img 
                src={villageVolunteersImg}
                alt="Village Volunteers"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 sm:bg-black/0 sm:group-hover:bg-black/60 transition-all duration-300 flex items-end p-3 sm:p-4">
                <p className="text-white text-xs sm:text-sm leading-relaxed font-medium opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                  {csrFact}
                </p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* SDG Wheel Section */}
      <section className="container mx-auto px-[8%] sm:px-[15%] py-16 sm:py-20 md:py-32">
        <div className="max-w-6xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-3 sm:mb-4">
              The UN Sustainable Development Goals
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 px-2 max-w-2xl mx-auto">
              17 interconnected goals to end poverty, protect the planet, and ensure prosperity by 2030
            </p>
          </div>

          {/* SDG Wheel and Compact Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-start lg:items-center">
            {/* SDG Wheel - Responsive */}
            <div className="relative flex justify-center items-center w-full overflow-visible">
              {/* Background glow effect - reduced size on mobile */}
              <div className="absolute flex justify-center items-center pointer-events-none">
                <div className="w-56 sm:w-64 md:w-72 lg:w-80 h-56 sm:h-64 md:h-72 lg:h-80 bg-gradient-to-r from-blue-900/3 to-amber-600/3 rounded-full blur-2xl"></div>
              </div>

              {/* SDG Wheel - Optimized scaling to prevent mobile overlap */}
              <div className="relative z-10 w-full flex items-center justify-center px-2 py-8 sm:py-12 scale-100 sm:scale-110 md:scale-125 lg:scale-150">
                <SDGCircularWheel scale={1.0} />
              </div>
            </div>

            {/* Compact Info Cards */}
            <div className="space-y-3 sm:space-y-4 w-full relative z-20">
              {/* About Card */}
              <div className="bg-white rounded-lg p-3 sm:p-4 shadow-lg border border-slate-200">
                <h3 className="text-base sm:text-lg font-bold text-blue-900 mb-2">About the SDGs</h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  17 interlinked global goals adopted by all UN Member States in 2015. Each addresses critical challenges: poverty, inequality, climate change, environmental protection, peace, and justice. Success in one area affects outcomes in others.
                </p>
              </div>

              {/* History Card */}
              <div className="bg-white rounded-lg p-3 sm:p-4 shadow-lg border border-slate-200">
                <h3 className="text-base sm:text-lg font-bold text-amber-600 mb-2">Brief History</h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  Building on the Millennium Development Goals (2000-2015), the 2030 Agenda was adopted at the UN Summit in September 2015. All 193 member states committed to achieve these goals by 2030 through coordinated global action.
                </p>
              </div>

              {/* Progress Update Card */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-3 sm:p-4 shadow-lg border-2 border-red-200">
                <h3 className="text-base sm:text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
                  <span>⚠️</span> Progress Update
                </h3>
                <ul className="space-y-1 text-xs text-slate-700">
                  <li>• Only <strong>17% of targets on track</strong></li>
                  <li>• <strong>4 years remaining</strong> to achieve 2030 goals</li>
                  <li>• Emissions must be cut <strong>43% by 2030</strong></li>
                  <li>• Volunteer action is critical to closing the gap</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
      </main>
    </div>
  );
}
