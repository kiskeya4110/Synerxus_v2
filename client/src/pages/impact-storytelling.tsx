import ImpactStorytelling from "@/components/impact/impact-storytelling";

// Sample project impact data for the storytelling component
const projectImpactData = [
  {
    id: "1",
    name: "Clean Water Initiative",
    description: "Installation of water filters and sanitation facilities in rural communities",
    metrics: [
      { label: "People with clean water access", before: 250, after: 2500, unit: "people" },
      { label: "Water-borne disease cases", before: 120, after: 18, unit: "cases/month" },
      { label: "Average water collection time", before: 3.5, after: 0.5, unit: "hours/day" }
    ],
    location: "Kibera, Kenya",
    date: "2023-01-15"
  },
  {
    id: "2",
    name: "Education Access Program",
    description: "Providing educational resources and teacher training in underserved areas",
    metrics: [
      { label: "Student enrollment", before: 450, after: 850, unit: "students" },
      { label: "Teacher-student ratio", before: 1/45, after: 1/25, unit: "ratio" },
      { label: "Reading proficiency", before: 35, after: 72, unit: "% of students" },
      { label: "School attendance", before: 68, after: 92, unit: "% rate" }
    ],
    location: "Bogotá, Colombia",
    date: "2023-03-10"
  },
  {
    id: "3",
    name: "Community Garden Project",
    description: "Transforming abandoned lots into productive community gardens",
    metrics: [
      { label: "Green space", before: 0, after: 5000, unit: "sq meters" },
      { label: "Food production", before: 0, after: 1200, unit: "kg/year" },
      { label: "Community involvement", before: 0, after: 75, unit: "participants" },
      { label: "Local biodiversity", before: 8, after: 46, unit: "species" }
    ],
    location: "Detroit, USA",
    date: "2023-04-22"
  },
  {
    id: "4",
    name: "Medical Outreach",
    description: "Mobile health clinics providing essential care to remote communities",
    metrics: [
      { label: "Patients treated", before: 0, after: 1250, unit: "patients" },
      { label: "Vaccinations administered", before: 120, after: 780, unit: "vaccinations" },
      { label: "Health workshops conducted", before: 5, after: 35, unit: "workshops" },
      { label: "Community health workers trained", before: 12, after: 48, unit: "workers" }
    ],
    location: "Rural Maharashtra, India",
    date: "2023-02-18"
  },
  {
    id: "5",
    name: "Youth Empowerment Program",
    description: "Skills training and entrepreneurship support for at-risk youth",
    metrics: [
      { label: "Youth enrolled", before: 45, after: 220, unit: "participants" },
      { label: "Employment rate", before: 18, after: 72, unit: "% of participants" },
      { label: "Business startups", before: 0, after: 15, unit: "businesses" },
      { label: "Reported self-efficacy", before: 35, after: 85, unit: "% positive responses" }
    ],
    location: "Kingston, Jamaica",
    date: "2023-05-05"
  }
];

// Sample saved stories
const savedStories = [
  {
    id: "story1",
    title: "Clean Water Initiative Impact Story",
    project: "Clean Water Initiative",
    rawData: JSON.stringify([
      { label: "People with clean water access", before: 250, after: 2500, unit: "people" },
      { label: "Water-borne disease cases", before: 120, after: 18, unit: "cases/month" },
      { label: "Average water collection time", before: 3.5, after: 0.5, unit: "hours/day" }
    ]),
    generatedStory: "Thanks to your generous support, we've made inspiring progress in changing lives through the Clean Water Initiative project in Kibera, Kenya.\n\nIn just six months, we've achieved significant impact: People with clean water access increased by 2250 people (900%), Water-borne disease cases decreased by 102 cases/month (85%), Average water collection time decreased by 3 hours/day (86%).\n\nThese numbers represent real people whose lives have been transformed through this initiative.\n\nWith your continued partnership, we can expand these successes to more communities in need.",
    date: "2023-07-10",
    audience: "donors",
    tone: "inspirational",
    focus: "people"
  },
  {
    id: "story2",
    title: "Community Garden Impact Update",
    project: "Community Garden Project",
    rawData: JSON.stringify([
      { label: "Green space", before: 0, after: 5000, unit: "sq meters" },
      { label: "Food production", before: 0, after: 1200, unit: "kg/year" },
      { label: "Community involvement", before: 0, after: 75, unit: "participants" },
      { label: "Local biodiversity", before: 8, after: 46, unit: "species" }
    ]),
    generatedStory: "Through our community efforts, we've made remarkable progress in protecting our planet through the Community Garden Project in Detroit, USA.\n\nIn just four months, we've achieved significant impact: Green space increased by 5000 sq meters, Food production increased by 1200 kg/year, Community involvement increased by 75 participants, Local biodiversity increased by 38 species (475%).\n\nThis progress demonstrates our commitment to sustainable environmental practices and conservation efforts.\n\nJoin us in celebrating these achievements and help us continue this important work.",
    date: "2023-07-15",
    audience: "general",
    tone: "celebratory",
    focus: "environment"
  }
];

export default function ImpactStorytellingPage() {
  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI Impact Storytelling</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Transform raw impact data into compelling narratives for different audiences
        </p>
      </div>

      {/* Main Content */}
      <ImpactStorytelling 
        projectImpacts={projectImpactData}
        savedStories={savedStories}
      />
    </>
  );
}