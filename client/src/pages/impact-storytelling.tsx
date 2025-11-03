import ImpactStorytelling from "@/components/impact/impact-storytelling";

const projectImpactData: any[] = [];
const savedStories: any[] = [];

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