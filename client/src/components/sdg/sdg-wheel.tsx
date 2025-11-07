import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";

const SDG_DATA = [
  {
    id: 1,
    title: "No Poverty",
    description: "End poverty in all its forms everywhere",
    color: "#E5243B",
    details: "Goal 1 calls for an end to poverty in all its manifestations by 2030. It also aims to ensure social protection for the poor and vulnerable, increase access to basic services and support people harmed by climate-related extreme events and other economic, social and environmental shocks and disasters.",
    targets: ["Eradicate extreme poverty", "Reduce poverty by half", "Implement social protection systems", "Equal rights to economic resources"]
  },
  {
    id: 2,
    title: "Zero Hunger",
    description: "End hunger, achieve food security and improved nutrition and promote sustainable agriculture",
    color: "#DDA63A",
    details: "Goal 2 seeks to end hunger and all forms of malnutrition by 2030. It also commits to universal access to safe, nutritious and sufficient food at all times of the year. This will require sustainable food production systems and resilient agricultural practices, equal access to land, technology and markets and international cooperation on investments in infrastructure and technology to boost agricultural productivity.",
    targets: ["End hunger", "End malnutrition", "Double agricultural productivity", "Ensure sustainable food production systems"]
  },
  {
    id: 3,
    title: "Good Health and Well-being",
    description: "Ensure healthy lives and promote well-being for all at all ages",
    color: "#4C9F38",
    details: "Goal 3 aims to ensure health and well-being for all at all ages by improving reproductive and maternal and child health; ending the epidemics of major communicable diseases; reducing non-communicable and environmental diseases; achieving universal health coverage; and ensuring access to safe, affordable and effective medicines and vaccines for all.",
    targets: ["Reduce maternal mortality", "End preventable deaths of children", "Combat communicable diseases", "Achieve universal health coverage"]
  },
  {
    id: 4,
    title: "Quality Education",
    description: "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all",
    color: "#C5192D",
    details: "Goal 4 focuses on the acquisition of foundational and higher-order skills; greater and more equitable access to technical and vocational education and training and higher education; training throughout life; and the knowledge, skills and values needed to function well and contribute to society.",
    targets: ["Free primary and secondary education", "Equal access to quality pre-primary education", "Equal access to affordable technical and vocational education", "Increase literacy and numeracy"]
  },
  {
    id: 5,
    title: "Gender Equality",
    description: "Achieve gender equality and empower all women and girls",
    color: "#FF3A21",
    details: "Goal 5 aims to grant women and girls equal rights, opportunities to live free without violence and discrimination, and to be valued and empowered. It calls for gender equality in decision-making; access to sexual and reproductive health services; equal rights to economic resources, land and property; and more value for unpaid care and domestic work.",
    targets: ["End discrimination against women", "Eliminate violence against women", "Eliminate harmful practices", "Ensure universal access to sexual and reproductive health"]
  },
  {
    id: 6,
    title: "Clean Water and Sanitation",
    description: "Ensure availability and sustainable management of water and sanitation for all",
    color: "#26BDE2",
    details: "Goal 6 not only addresses the issues relating to drinking water, sanitation and hygiene, but also the quality and sustainability of water resources worldwide. Achieving this goal, which is critical to the survival of people and the planet, means expanding international cooperation and garnering the support of local communities in improving water and sanitation management.",
    targets: ["Achieve universal access to safe drinking water", "Access to adequate sanitation and hygiene", "Improve water quality", "Protect and restore water-related ecosystems"]
  },
  {
    id: 7,
    title: "Affordable and Clean Energy",
    description: "Ensure access to affordable, reliable, sustainable and modern energy for all",
    color: "#FCC30B",
    details: "Goal 7 seeks to promote broader energy access and increased use of renewable energy, including through enhanced international cooperation and expanded infrastructure and technology for clean energy.",
    targets: ["Universal access to modern energy", "Increase share of renewable energy", "Double the global rate of improvement in energy efficiency", "Enhance international cooperation"]
  },
  {
    id: 8,
    title: "Decent Work and Economic Growth",
    description: "Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all",
    color: "#A21942",
    details: "Goal 8 aims to provide opportunities for full and productive employment and decent work for all while eradicating forced labor, human trafficking and child labor.",
    targets: ["Sustain per capita economic growth", "Achieve higher economic productivity", "Promote development-oriented policies", "Eradicate forced labor and child labor"]
  },
  {
    id: 9,
    title: "Industry, Innovation and Infrastructure",
    description: "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation",
    color: "#FD6925",
    details: "Goal 9 focuses on promoting sustainable infrastructure, inclusive and sustainable industrialization, and innovation to drive economic growth and development while ensuring environmental sustainability.",
    targets: ["Develop quality, reliable infrastructure", "Promote inclusive and sustainable industrialization", "Increase access to financial services", "Upgrade infrastructure and retrofit industries"]
  },
  {
    id: 10,
    title: "Reduced Inequalities",
    description: "Reduce inequality within and among countries",
    color: "#DD1367",
    details: "Goal 10 calls for reducing inequalities in income, as well as those based on sex, age, disability, race, class, ethnicity, religion and opportunity—both within and among countries. It also aims to ensure safe, orderly and regular migration and addresses issues related to representation of developing countries in global decision-making.",
    targets: ["Progressively achieve income growth", "Promote social, economic and political inclusion", "Ensure equal opportunity", "Adopt policies for greater equality"]
  },
  {
    id: 11,
    title: "Sustainable Cities and Communities",
    description: "Make cities and human settlements inclusive, safe, resilient and sustainable",
    color: "#FD9D24",
    details: "Goal 11 aims to renew and plan cities and other human settlements in a way that offers opportunities for all, with access to basic services, energy, housing, transportation and green public spaces, while reducing resource use and environmental impact.",
    targets: ["Access to adequate housing", "Access to safe transport systems", "Enhance inclusive urbanization", "Protect cultural and natural heritage"]
  },
  {
    id: 12,
    title: "Responsible Consumption and Production",
    description: "Ensure sustainable consumption and production patterns",
    color: "#BF8B2E",
    details: "Goal 12 aims to promote resource and energy efficiency, sustainable infrastructure, and provide access to basic services, green and decent jobs and a better quality of life for all. It seeks to do more and better with less, creating net welfare gains from economic activities by reducing resource use.",
    targets: ["Implement sustainable consumption and production", "Achieve sustainable management of natural resources", "Halve per capita global food waste", "Achieve environmentally sound management of chemicals"]
  },
  {
    id: 13,
    title: "Climate Action",
    description: "Take urgent action to combat climate change and its impacts",
    color: "#3F7E44",
    details: "Goal 13 calls for urgent action to combat climate change and its impacts. It aims to strengthen resilience and adaptive capacity to climate-related disasters, integrate climate change measures into policies and planning, and improve education and awareness on climate change.",
    targets: ["Strengthen resilience to climate-related hazards", "Integrate climate measures into policies", "Improve education and awareness on climate change", "Implement commitments to the UN Framework Convention"]
  },
  {
    id: 14,
    title: "Life Below Water",
    description: "Conserve and sustainably use the oceans, seas and marine resources for sustainable development",
    color: "#0A97D9",
    details: "Goal 14 seeks to promote the conservation and sustainable use of marine and coastal ecosystems, prevent marine pollution and increase the economic benefits to small island developing States and least developed countries from the sustainable use of marine resources.",
    targets: ["Prevent and reduce marine pollution", "Protect and restore ecosystems", "Minimize ocean acidification", "Regulate harvesting and end overfishing"]
  },
  {
    id: 15,
    title: "Life on Land",
    description: "Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss",
    color: "#56C02B",
    details: "Goal 15 focuses on managing forests sustainably, restoring degraded lands and successfully combating desertification, reducing degraded natural habitats and ending biodiversity loss. All of these efforts in combination will help protect and prevent the extinction of threatened species.",
    targets: ["Ensure conservation of terrestrial ecosystems", "Promote sustainable forest management", "Combat desertification", "Ensure conservation of mountain ecosystems"]
  },
  {
    id: 16,
    title: "Peace, Justice and Strong Institutions",
    description: "Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels",
    color: "#00689D",
    details: "Goal 16 envisages peaceful and inclusive societies based on respect for human rights, the rule of law, good governance at all levels, and transparent, effective and accountable institutions. Many countries still face protracted violence and armed conflict, and far too many people are not well-supported by weak institutions and lack access to justice, information and other fundamental freedoms.",
    targets: ["Reduce violence everywhere", "End abuse, exploitation and trafficking", "Promote the rule of law", "Reduce corruption and bribery"]
  },
  {
    id: 17,
    title: "Partnerships for the Goals",
    description: "Strengthen the means of implementation and revitalize the global partnership for sustainable development",
    color: "#19486A",
    details: "Goal 17 aims to strengthen global partnerships to support and achieve the ambitious targets of the 2030 Agenda, bringing together national governments, the international community, civil society, the private sector and other actors.",
    targets: ["Strengthen domestic resource mobilization", "Mobilize financial resources for developing countries", "Promote sustainable and resilient infrastructure", "Enhance global partnership for sustainable development"]
  }
];

export function SDGWheel() {
  const [selectedSDG, setSelectedSDG] = useState<typeof SDG_DATA[0] | null>(null);

  const renderSDGGrid = () => {
    // Sort SDG_DATA by ID to ensure numerical order
    const sortedSDGData = [...SDG_DATA].sort((a, b) => a.id - b.id);
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 max-w-6xl mx-auto">
        {sortedSDGData.map((sdg) => {
          const sdgIcon = UN_SDG_ICONS[sdg.id];
          return (
            <button
              key={sdg.id}
              onClick={() => setSelectedSDG(sdg)}
              className="group relative rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              style={{ 
                aspectRatio: '1/1',
                minHeight: '140px'
              }}
              data-testid={`sdg-button-${sdg.id}`}
            >
              {/* UN SDG Official Graphic or Fallback */}
              {sdgIcon ? (
                <img 
                  src={sdgIcon} 
                  alt={`SDG ${sdg.id}: ${sdg.title}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white"
                  style={{ backgroundColor: sdg.color }}
                >
                  <div className="text-4xl font-bold mb-2">{sdg.id}</div>
                  <div className="text-xs sm:text-sm font-semibold text-center leading-tight">
                    {sdg.title}
                  </div>
                </div>
              )}
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-3">
                <div className="text-white text-sm sm:text-base font-semibold text-center">
                  Click to learn more
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="w-full">
        {renderSDGGrid()}
      </div>

      {/* SDG Details Modal */}
      <Dialog open={!!selectedSDG} onOpenChange={() => setSelectedSDG(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                style={{ backgroundColor: selectedSDG?.color }}
              >
                {selectedSDG?.id}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">
                  SDG {selectedSDG?.id}: {selectedSDG?.title}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {selectedSDG?.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* About Section */}
            <div>
              <h3 className="font-semibold text-lg mb-2">About This Goal</h3>
              <p className="text-muted-foreground leading-relaxed">
                {selectedSDG?.details}
              </p>
            </div>

            {/* Key Targets */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Key Targets</h3>
              <div className="grid gap-2">
                {selectedSDG?.targets.map((target, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <Badge 
                      className="mt-0.5 flex-shrink-0"
                      style={{ backgroundColor: selectedSDG?.color }}
                    >
                      {index + 1}
                    </Badge>
                    <span className="text-sm">{target}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Learn More */}
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => window.open(`https://sdgs.un.org/goals/goal${selectedSDG?.id}`, '_blank')}
                data-testid="button-learn-more-sdg"
              >
                <ExternalLink className="h-4 w-4" />
                Learn More on UN Website
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
