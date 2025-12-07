import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, Activity, User, MessageCircle, Menu, ChevronDown, MapPin, Clock, Users, Briefcase, Compass, TrendingUp, MoreHorizontal, Settings, Lightbulb, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import { getSDGColor } from "@shared/sdg-goals";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoUrl from "@assets/Synerxus Modern Logo  NBG_1763706841211.png";

interface MobilePWAViewProps {
  userId: string;
  user: any;
  dashboardData: any;
}

type TabType = 'dashboard' | 'projects' | 'unlock' | 'impacts' | 'more' | 'profile' | 'messages';
type FilterTab = 'recommended' | 'nearby' | 'saved';

export default function MobilePWAView({ userId, user, dashboardData }: MobilePWAViewProps) {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('recommended');
  const [selectedSDGs, setSelectedSDGs] = useState<number[]>([]);
  const [timeCommitment, setTimeCommitment] = useState<string>('all');
  const [locationType, setLocationType] = useState<string>('all');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showSDGFilter, setShowSDGFilter] = useState(false);
  const [showTimeFilter, setShowTimeFilter] = useState(false);
  const [showLocationFilter, setShowLocationFilter] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const projects = dashboardData?.projects || [];
  const volunteerProfile = dashboardData?.volunteerProfile;

  // Calculate match score based on skills and interests
  const calculateMatchScore = (project: any) => {
    if (!volunteerProfile) return 75; // Default match

    let score = 60; // Base score

    // Check skill alignment
    const volunteerSkills = volunteerProfile.skills || [];
    const projectSkills = project.skillsRequired || [];
    const skillMatches = volunteerSkills.filter((skill: string) =>
      projectSkills.some((ps: string) => ps.toLowerCase().includes(skill.toLowerCase()))
    ).length;
    score += skillMatches * 10;

    // Check SDG alignment
    const volunteerSDGs = volunteerProfile.sdgGoals || [];
    const projectSDGs = project.sdgGoals || [];
    const sdgMatches = volunteerSDGs.filter((sdg: number) => projectSDGs.includes(sdg)).length;
    score += sdgMatches * 5;

    return Math.min(score, 99);
  };

  const sdgList = [5, 10, 11, 13, 14, 15, 16, 17];

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[428px] mx-auto">
      {/* Top App Bar */}
      <header
        className="text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #40916C 100%)' }}
      >
        <button
          onClick={() => navigate("/landing")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src={logoUrl} alt="Synerxus Logo" className="h-8 w-auto" />
          <div className="flex gap-0 font-bold text-base tracking-wide">
            <span className="text-white">SYNER</span>
            <span className="text-[#FFB84D]">XUS</span>
          </div>
        </button>
        <Avatar className="w-9 h-9 border-2 border-[#D4AF37]">
          <AvatarImage src={user?.profilePicture} />
          <AvatarFallback className="bg-white/20 text-white text-sm">
            {user?.displayName?.charAt(0) || 'V'}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-[#FFC107] text-gray-900 px-4 py-2 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>Offline Mode - Data may be outdated. Syncs when online.</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'dashboard' && (
          <>
            {/* Dashboard Stats */}
            <div
              className="px-4 py-6"
              style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #40916C 100%)' }}
            >
              <h2 className="text-white text-lg font-bold mb-4">Your Impact Dashboard</h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab('impacts')}
                  className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-white hover:bg-white/30 transition-all transform hover:scale-105 active:scale-95"
                >
                  <div className="text-2xl font-bold mb-1">
                    {dashboardData?.totalHours || 0}
                  </div>
                  <div className="text-xs opacity-90">Hours</div>
                </button>
                <button
                  onClick={() => setActiveTab('impacts')}
                  className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-white hover:bg-white/30 transition-all transform hover:scale-105 active:scale-95"
                >
                  <div className="text-2xl font-bold mb-1">
                    {dashboardData?.totalPeopleImpacted || 0}
                  </div>
                  <div className="text-xs opacity-90">Lives</div>
                </button>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-white hover:bg-white/30 transition-all transform hover:scale-105 active:scale-95"
                >
                  <div className="text-2xl font-bold mb-1">
                    {projects?.length || 0}
                  </div>
                  <div className="text-xs opacity-90">Projects</div>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-4 bg-white border-b border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('impacts')}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg font-medium text-sm transition-all transform hover:scale-105 active:scale-95 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
                >
                  <Clock className="w-4 h-4" />
                  Log Hours
                </button>
                <button
                  onClick={() => setActiveTab('unlock')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 rounded-lg font-medium text-sm transition-all transform hover:scale-105 active:scale-95 shadow-md"
                  style={{ color: '#2D6A4F', borderColor: '#2D6A4F', borderWidth: '2px' }}
                >
                  <Search className="w-4 h-4" />
                  Find Projects
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
              {(['recommended', 'nearby', 'saved'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilterTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                    activeFilterTab === tab
                      ? 'border-b-2'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={activeFilterTab === tab ? { color: '#2D6A4F', borderColor: '#2D6A4F' } : {}}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Filter Chips */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide bg-gray-50">
              <button
                onClick={() => setShowSDGFilter(!showSDGFilter)}
                className="px-4 py-2 bg-white rounded-full border-2 text-sm font-medium whitespace-nowrap flex items-center gap-2 hover:bg-gray-50 transition-all"
                style={{
                  color: selectedSDGs.length > 0 ? '#2D6A4F' : '#6B7280',
                  borderColor: selectedSDGs.length > 0 ? '#2D6A4F' : '#D1D5DB'
                }}
              >
                <span>🎯</span>
                {selectedSDGs.length > 0 ? `SDG (${selectedSDGs.length})` : 'SDG'}
                <ChevronDown className={`w-4 h-4 transition-transform ${showSDGFilter ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setShowTimeFilter(!showTimeFilter)}
                className="px-4 py-2 bg-white rounded-full border-2 text-sm font-medium whitespace-nowrap flex items-center gap-2 hover:bg-gray-50 transition-all"
                style={{
                  color: timeCommitment !== 'all' ? '#2D6A4F' : '#6B7280',
                  borderColor: timeCommitment !== 'all' ? '#2D6A4F' : '#D1D5DB'
                }}
              >
                <Clock className="w-4 h-4" />
                {timeCommitment !== 'all' ? timeCommitment : 'Time'}
                <ChevronDown className={`w-4 h-4 transition-transform ${showTimeFilter ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setShowLocationFilter(!showLocationFilter)}
                className="px-4 py-2 bg-white rounded-full border-2 text-sm font-medium whitespace-nowrap flex items-center gap-2 hover:bg-gray-50 transition-all"
                style={{
                  color: locationType !== 'all' ? '#2D6A4F' : '#6B7280',
                  borderColor: locationType !== 'all' ? '#2D6A4F' : '#D1D5DB'
                }}
              >
                <MapPin className="w-4 h-4" />
                {locationType !== 'all' ? locationType : 'Location'}
                <ChevronDown className={`w-4 h-4 transition-transform ${showLocationFilter ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Time Commitment Filter Dropdown */}
            {showTimeFilter && (
              <div className="px-4 py-3 bg-white border-b border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {['all', '1-5 hrs/week', '5-10 hrs/week', '10-20 hrs/week', '20+ hrs/week'].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setTimeCommitment(option);
                        setShowTimeFilter(false);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: timeCommitment === option ? 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' : '#F3F4F6',
                        color: timeCommitment === option ? '#FFFFFF' : '#374151'
                      }}
                    >
                      {option === 'all' ? 'All' : option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Location Filter Dropdown */}
            {showLocationFilter && (
              <div className="px-4 py-3 bg-white border-b border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {['all', 'Remote', 'On-site', 'Hybrid'].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setLocationType(option);
                        setShowLocationFilter(false);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: locationType === option ? 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' : '#F3F4F6',
                        color: locationType === option ? '#FFFFFF' : '#374151'
                      }}
                    >
                      {option === 'all' ? 'All' : option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SDG Icons Row */}
            {showSDGFilter && (
              <div className="px-4 py-3 flex gap-3 overflow-x-auto scrollbar-hide bg-white border-b border-gray-200">
                <div className="flex gap-3 pb-2">
                  {sdgList.map((sdg) => {
                    const iconUrl = getSDGIcon(sdg);
                    return (
                      <button
                        key={sdg}
                        onClick={() => {
                          setSelectedSDGs(prev =>
                            prev.includes(sdg) ? prev.filter(s => s !== sdg) : [...prev, sdg]
                          );
                        }}
                        className={`flex-shrink-0 transition-all hover:scale-110 active:scale-95 ${
                          selectedSDGs.includes(sdg) ? 'ring-[3px] ring-offset-2 rounded-full' : ''
                        }`}
                      >
                        <img
                          src={iconUrl}
                          alt={`SDG ${sdg}`}
                          className="w-14 h-14 rounded-lg"
                          style={selectedSDGs.includes(sdg) ? { boxShadow: '0 0 0 3px #2D6A4F' } : {}}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Project Cards */}
            <div className="px-4 py-2 space-y-4">
              {projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No projects available</p>
                  <p className="text-sm mt-2">Check back soon for new opportunities!</p>
                </div>
              ) : (
                projects
                  .filter((project: any) => {
                    // Filter by SDGs
                    if (selectedSDGs.length > 0) {
                      if (!project.sdgGoals?.some((sdg: number) => selectedSDGs.includes(sdg))) {
                        return false;
                      }
                    }
                    // Filter by time commitment
                    if (timeCommitment !== 'all') {
                      // This is a simple check - could be enhanced with actual project time data
                      if (project.timeCommitment && !project.timeCommitment.includes(timeCommitment.split(' ')[0])) {
                        return false;
                      }
                    }
                    // Filter by location type
                    if (locationType !== 'all') {
                      const projectLocation = project.location?.toLowerCase() || '';
                      const filterLocation = locationType.toLowerCase();
                      if (!projectLocation.includes(filterLocation) && project.isRemote !== (filterLocation === 'remote')) {
                        return false;
                      }
                    }
                    return true;
                  })
                  .map((project: any) => {
                    const matchScore = calculateMatchScore(project);
                    const projectSDGs = project.sdgGoals || [];

                    return (
                      <div
                        key={project.id}
                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 overflow-hidden w-full text-left active:scale-[0.98] cursor-pointer"
                        onClick={() => navigate(`/projects/${project.id}/pwa`)}
                      >
                        <div className="p-4">
                          {/* Match Badge */}
                          <div className="flex items-start justify-between mb-3">
                            <div
                              className="text-white rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-lg"
                              style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
                            >
                              <span className="text-xl font-bold">{matchScore}%</span>
                              <span className="text-[10px]">Match</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Save project:', project.id);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              style={{ color: '#D4AF37' }}
                            >
                              <span className="text-xl">+</span>
                            </button>
                          </div>

                          {/* Project Info */}
                          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                            {project.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {project.description}
                          </p>

                          {/* SDG Icons */}
                          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                            {projectSDGs.slice(0, 4).map((sdg: number) => {
                              const iconUrl = getSDGIcon(sdg);
                              return (
                                <div key={sdg} className="flex-shrink-0">
                                  <img src={iconUrl} alt={`SDG ${sdg}`} className="w-8 h-8 rounded" />
                                </div>
                              );
                            })}
                            {projectSDGs.length > 4 && (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                +{projectSDGs.length - 4}
                              </div>
                            )}
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{project.location || 'Remote'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{project.timeCommitment || '10 hrs/week'}</span>
                            </div>
                          </div>

                          {/* Apply Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${project.id}/pwa`);
                            }}
                            className="w-full text-white font-medium rounded-lg h-11 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
                            style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </>
        )}

        {activeTab === 'unlock' && (
          <div className="flex flex-col h-full">
            {/* Search Bar */}
            <div className="px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects, skills, or SDGs..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none text-sm"
                  onFocus={(e) => e.target.style.borderColor = '#2D6A4F'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    // This could be enhanced with actual search state management
                  }}
                />
              </div>
            </div>

            {/* Filter Tags */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide bg-gray-50">
              <button
                className="px-4 py-2 text-white rounded-full text-sm font-medium whitespace-nowrap shadow-md"
                style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
              >
                All Projects
              </button>
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-gray-700 whitespace-nowrap hover:bg-gray-50">
                Remote
              </button>
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-gray-700 whitespace-nowrap hover:bg-gray-50">
                On-site
              </button>
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-gray-700 whitespace-nowrap hover:bg-gray-50">
                Part-time
              </button>
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-gray-700 whitespace-nowrap hover:bg-gray-50">
                Full-time
              </button>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="mb-3 text-sm text-gray-600">
                {projects.length} project{projects.length !== 1 ? 's' : ''} found
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No projects found</p>
                  <p className="text-sm mt-2">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {projects.map((project: any) => {
                    const matchScore = calculateMatchScore(project);
                    const projectSDGs = project.sdgGoals || [];

                    return (
                      <div
                        key={project.id}
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden w-full text-left active:scale-[0.98] cursor-pointer"
                        onClick={() => navigate(`/projects/${project.id}/pwa`)}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div
                              className="text-white rounded-full w-12 h-12 flex flex-col items-center justify-center flex-shrink-0 shadow-md"
                              style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
                            >
                              <span className="text-lg font-bold">{matchScore}%</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-1">
                                {project.name}
                              </h3>
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {project.description}
                              </p>
                            </div>
                          </div>

                          {/* SDG Icons */}
                          <div className="flex gap-1.5 mb-3">
                            {projectSDGs.slice(0, 5).map((sdg: number) => {
                              const iconUrl = getSDGIcon(sdg);
                              return (
                                <img key={sdg} src={iconUrl} alt={`SDG ${sdg}`} className="w-6 h-6 rounded" />
                              );
                            })}
                            {projectSDGs.length > 5 && (
                              <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                                +{projectSDGs.length - 5}
                              </div>
                            )}
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{project.location || 'Remote'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{project.timeCommitment || '10 hrs/week'}</span>
                            </div>
                          </div>

                          {/* Apply Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${project.id}/pwa`);
                            }}
                            className="w-full text-white font-medium rounded-lg h-9 text-sm shadow-md transition-all transform hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div className="px-4 py-6 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-xl p-4 text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
              >
                <div className="text-3xl font-bold mb-1">
                  {dashboardData?.totalHours || 0}
                </div>
                <div className="text-xs opacity-90">Total Hours</div>
              </div>
              <div
                className="rounded-xl p-4 text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #40916C 0%, #52B788 100%)' }}
              >
                <div className="text-3xl font-bold mb-1">
                  {dashboardData?.totalPeopleImpacted || 0}
                </div>
                <div className="text-xs opacity-90">Lives Touched</div>
              </div>
            </div>

            {/* Quick Log Hours */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2" style={{ color: '#2D6A4F' }}>
                <Clock className="w-5 h-5" />
                Log Hours
              </h3>
              <button
                className="w-full text-white font-medium rounded-lg h-11 shadow-md transition-all transform hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
              >
                + Log Volunteer Hours
              </button>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ color: '#2D6A4F' }}>
                <Activity className="w-5 h-5" />
                Recent Activity
              </h3>
              {dashboardData?.activities && dashboardData.activities.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.activities.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#40916C' }}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {activity.projectName || activity.description || 'Volunteer Activity'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.hours || 0} hrs
                          </span>
                          <span>
                            {activity.date ? new Date(activity.date).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No activities yet</p>
                  <p className="text-xs mt-1">Start volunteering to see your impact!</p>
                </div>
              )}
            </div>

            {/* Impact Breakdown */}
            {dashboardData?.impactBySDG && dashboardData.impactBySDG.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🎯</span>
                  Impact by SDG
                </h3>
                <div className="space-y-3">
                  {dashboardData.impactBySDG.slice(0, 5).map((impact: any) => {
                    const iconUrl = getSDGIcon(impact.sdg);
                    return (
                      <div key={impact.sdg} className="flex items-center gap-3">
                        <img src={iconUrl} alt={`SDG ${impact.sdg}`} className="w-10 h-10 rounded flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">SDG {impact.sdg}</span>
                            <span className="text-sm font-bold" style={{ color: '#2D6A4F' }}>{impact.hours || 0} hrs</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                background: 'linear-gradient(to right, #2D6A4F 0%, #40916C 100%)',
                                width: `${Math.min((impact.hours / (dashboardData.totalHours || 1)) * 100, 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="px-4 py-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
              <button
                className="px-4 py-2 text-white rounded-lg font-medium text-sm shadow-md transition-all transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
              >
                New Project
              </button>
            </div>

            {/* Active Projects */}
            <div className="space-y-4">
              {projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No active projects</p>
                  <p className="text-sm mt-2">Start volunteering to see your projects here!</p>
                  <button
                    onClick={() => setActiveTab('unlock')}
                    className="mt-6 px-6 py-3 text-white rounded-lg font-medium shadow-md transition-all transform hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
                  >
                    Unlock Potentials
                  </button>
                </div>
              ) : (
                projects.slice(0, 5).map((project: any) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl shadow-md border border-gray-100 p-4 w-full text-left hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}/pwa`)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md"
                        style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
                      >
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{project.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{project.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {project.timeCommitment || '10 hrs/week'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {project.location || 'Remote'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'more' && (
          <div className="px-4 py-6 space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-16 h-16 border-2" style={{ borderColor: '#D4AF37' }}>
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback className="text-white text-lg" style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}>
                  {user?.displayName?.charAt(0) || 'V'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{user?.displayName || 'Volunteer'}</h2>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>

            {/* Menu Options */}
            <div className="space-y-2">
              <button
                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all text-left"
                onClick={() => setActiveTab('profile')}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0F9F4' }}>
                  <User className="w-5 h-5" style={{ color: '#2D6A4F' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Profile</h3>
                  <p className="text-xs text-gray-500">View and edit your profile</p>
                </div>
              </button>

              <button
                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all text-left"
                onClick={() => navigate('/volunteer-profile-settings')}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0F9F4' }}>
                  <Settings className="w-5 h-5" style={{ color: '#2D6A4F' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Settings</h3>
                  <p className="text-xs text-gray-500">Manage your preferences</p>
                </div>
              </button>

              <button
                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all text-left"
                onClick={() => setActiveTab('messages')}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0F9F4' }}>
                  <MessageCircle className="w-5 h-5" style={{ color: '#2D6A4F' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Messages</h3>
                  <p className="text-xs text-gray-500">Chat with organizations</p>
                </div>
              </button>

              <div className="pt-4 mt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xl font-bold" style={{ color: '#2D6A4F' }}>
                      {dashboardData?.totalHours || 0}
                    </div>
                    <div className="text-xs text-gray-600">Hours</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xl font-bold" style={{ color: '#40916C' }}>
                      {projects?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Projects</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xl font-bold" style={{ color: '#D4AF37' }}>
                      {dashboardData?.totalPeopleImpacted || 0}
                    </div>
                    <div className="text-xs text-gray-600">Lives</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="px-4 py-6 space-y-6">
            {/* Profile Header */}
            <div className="bg-gradient-to-br from-[#4A9FDE] to-[#3B82DE] rounded-xl p-6 text-white shadow-md">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                  <AvatarImage src={user?.profilePicture} />
                  <AvatarFallback className="bg-white/20 text-white text-2xl">
                    {user?.displayName?.charAt(0) || 'V'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">{user?.displayName || 'Volunteer'}</h2>
                  <p className="text-sm opacity-90">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 text-center">
                <div className="text-2xl font-bold text-[#4A9FDE] mb-1">
                  {dashboardData?.totalHours || 0}
                </div>
                <div className="text-xs text-gray-600">Hours</div>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 text-center">
                <div className="text-2xl font-bold text-[#4CAF50] mb-1">
                  {dashboardData?.projects?.length || 0}
                </div>
                <div className="text-xs text-gray-600">Projects</div>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 text-center">
                <div className="text-2xl font-bold text-[#FF9800] mb-1">
                  {dashboardData?.totalPeopleImpacted || 0}
                </div>
                <div className="text-xs text-gray-600">Impact</div>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>💼</span>
                Skills
              </h3>
              {volunteerProfile?.skills && volunteerProfile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {volunteerProfile.skills.map((skill: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-[#4A9FDE]/10 text-[#4A9FDE] rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No skills added yet</p>
              )}
              <Button className="w-full mt-3 bg-white hover:bg-gray-50 text-[#4A9FDE] border border-[#4A9FDE] font-medium rounded-lg h-10">
                + Add Skills
              </Button>
            </div>

            {/* Interests (SDGs) */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>🎯</span>
                SDG Interests
              </h3>
              {volunteerProfile?.sdgGoals && volunteerProfile.sdgGoals.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {volunteerProfile.sdgGoals.map((sdg: number) => {
                    const iconUrl = getSDGIcon(sdg);
                    return (
                      <div key={sdg} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                        <img src={iconUrl} alt={`SDG ${sdg}`} className="w-6 h-6 rounded" />
                        <span className="text-sm font-medium text-gray-700">SDG {sdg}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No SDG interests selected</p>
              )}
              <Button className="w-full mt-3 bg-white hover:bg-gray-50 text-[#4A9FDE] border border-[#4A9FDE] font-medium rounded-lg h-10">
                + Update Interests
              </Button>
            </div>

            {/* Availability */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#4A9FDE]" />
                Availability
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Hours per week</span>
                  <span className="text-sm font-medium text-gray-900">
                    {volunteerProfile?.availableHours || '5-10 hrs'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Preferred time</span>
                  <span className="text-sm font-medium text-gray-900">
                    {volunteerProfile?.preferredTime || 'Flexible'}
                  </span>
                </div>
              </div>
              <Button className="w-full mt-3 bg-white hover:bg-gray-50 text-[#4A9FDE] border border-[#4A9FDE] font-medium rounded-lg h-10">
                Edit Availability
              </Button>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium rounded-lg h-11 flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                Edit Profile
              </Button>
              <Button className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium rounded-lg h-11">
                Settings
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="flex flex-col h-full">
            {/* Messages Header */}
            <div className="px-4 py-4 bg-white border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-600 mt-1">Connect with organizations</p>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {/* Sample Conversations */}
              <div className="divide-y divide-gray-100">
                {/* Active Project Conversation */}
                {projects.slice(0, 3).map((project: any) => (
                  <div
                    key={project.id}
                    className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4A9FDE] to-[#3B82DE] flex items-center justify-center text-white font-bold flex-shrink-0">
                        {project.organizationName?.charAt(0) || project.name?.charAt(0) || 'O'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                            {project.organizationName || project.name}
                          </h3>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">2h ago</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                          Thank you for your interest in {project.name}! We'd love to discuss...
                        </p>
                        <div className="flex items-center gap-2">
                          {project.sdgGoals?.slice(0, 3).map((sdg: number) => {
                            const iconUrl = getSDGIcon(sdg);
                            return (
                              <img key={sdg} src={iconUrl} alt={`SDG ${sdg}`} className="w-4 h-4 rounded" />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Welcome Message */}
                <div className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#45a049] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xl">💬</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">Synerxus Team</h3>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">1d ago</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        Welcome to Synerxus! 🎉 Start making an impact today by browsing projects...
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Empty State (if no projects) */}
              {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-sm text-gray-600 mb-6 max-w-sm">
                    Apply to projects to start conversations with organizations and coordinate your volunteer work
                  </p>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="text-white font-medium rounded-lg px-6 h-11 shadow-md transition-all transform hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>

            {/* Compose Button */}
            {projects.length > 0 && (
              <div className="p-4 bg-white border-t border-gray-200">
                <Button className="w-full bg-[#4A9FDE] hover:bg-[#3B82DE] text-white font-medium rounded-lg h-11 flex items-center justify-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  New Message
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg max-w-[428px] mx-auto">
        <div className="flex justify-around items-center h-16">
          {[
            { id: 'dashboard' as TabType, icon: BarChart3, label: 'Dashboard' },
            { id: 'projects' as TabType, icon: Briefcase, label: 'Projects' },
            { id: 'unlock' as TabType, icon: Lightbulb, label: 'Unlock' },
            { id: 'impacts' as TabType, icon: TrendingUp, label: 'Impacts' },
            { id: 'more' as TabType, icon: MoreHorizontal, label: 'More' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? '' : 'text-gray-500'
                }`}
                style={isActive ? { color: '#2D6A4F' } : {}}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
