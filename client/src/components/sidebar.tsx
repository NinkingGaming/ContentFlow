import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { Project, UserRole } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamTab } from "@/components/team-tab";
import { ChatTab } from "@/components/chat-tab";

interface SidebarProps {
  projects: Project[];
  isOpen: boolean;
  onToggle: () => void;
  onNewProject: () => void;
}

export function Sidebar({ projects, isOpen, onToggle, onNewProject }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  
  if (!isOpen) return null;

  // Check if user has permissions to see Team tab
  const canAccessTeam = user?.role === UserRole.ADMIN || user?.role === UserRole.PRODUCER;
  
  return (
    <>
      <aside className="w-64 bg-white border-r border-neutral-200 flex-shrink-0 flex flex-col h-full transition-all duration-300 ease-in-out fixed md:relative z-40 shadow-md md:shadow-none">
        <div className="p-4">
          <button 
            onClick={onNewProject}
            className="bg-primary hover:bg-primary/90 text-white w-full py-2 px-4 rounded-md flex items-center justify-center transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>New Project</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-2">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Workspace</h2>
          </div>
          <Link href="/">
            <div className={cn(
              "flex items-center px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/" ? "text-primary border-l-2 border-primary bg-primary/5" : "text-neutral-700 hover:text-primary hover:bg-neutral-100"
            )}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              <span>Dashboard</span>
            </div>
          </Link>
          <a className="flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-primary hover:bg-neutral-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Calendar</span>
          </a>
          
          {/* Team section with submenu */}
          <div className="px-3 mt-4 mb-2">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Team</h2>
          </div>
          
          {/* Team Management Button */}
          {canAccessTeam && (
            <button
              onClick={() => setIsTeamDialogOpen(true)}
              className="w-full text-left flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-primary hover:bg-neutral-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Team Management</span>
            </button>
          )}
          
          {/* Chat Button - Always available */}
          <button
            onClick={() => setIsChatDialogOpen(true)}
            className="w-full text-left flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-primary hover:bg-neutral-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span>Team Chat</span>
          </button>
          
          {projects.length > 0 && (
            <>
              <div className="px-3 mt-6 mb-2">
                <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Projects</h2>
              </div>
              {projects.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium cursor-pointer",
                    location === `/projects/${project.id}` ? "text-primary border-l-2 border-primary bg-primary/5" : "text-neutral-700 hover:text-primary hover:bg-neutral-100"
                  )}>
                    {project.type === "goblinTV" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.743-.953l.093-.778v-.027c.04-.348-.12-.701-.427-.843a11.735 11.735 0 0 0-2.17-.676c-.34-.07-.69.062-.852.358l-.166.344c-.339.665-1.01 1.06-1.724 1.01-.543-.04-1.03-.34-1.318-.806l-1.033-1.665c-.881-1.442-.413-3.937.274-5.175L12 7.053a.98.98 0 0 1 .905-.31c.681.136 1.286-.29 1.36-.984.163-1.397.35-2.351.628-3.094a.98.98 0 0 1 .653-.623l.992-.248c.34-.085.693.037.885.298.713.967 1.715 3.544 1.931 5.42l.085.647Z"></path><path d="M12.734 15.6c-.381-.67-1.376-.795-2.22-.281-.844.514-1.22 1.472-.839 2.142.381.67 1.376.795 2.22.281.844-.514 1.22-1.472.839-2.142Z"></path></svg>
                    )}
                    <span>{project.name}</span>
                  </div>
                </Link>
              ))}
            </>
          )}
          
          <div className="px-3 mt-6 mb-2">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Categories</h2>
          </div>
          <a className="flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-primary hover:bg-neutral-100">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-3"></span>
            <span>YouTube Videos</span>
          </a>
          <a className="flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-primary hover:bg-neutral-100">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-3"></span>
            <span>Video Pitches</span>
          </a>
          <a className="flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-primary hover:bg-neutral-100">
            <span className="w-3 h-3 rounded-full bg-yellow-500 mr-3"></span>
            <span>Ideas</span>
          </a>
        </nav>
        
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center text-neutral-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-700">Settings</p>
              <p className="text-xs text-neutral-500">Preferences & Account</p>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Team Management Dialog */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Team Management</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1">
            <TeamTab />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Chat Dialog */}
      <Dialog open={isChatDialogOpen} onOpenChange={setIsChatDialogOpen}>
        <DialogContent className="max-w-md h-[80vh]">
          <DialogHeader>
            <DialogTitle>Team Chat</DialogTitle>
          </DialogHeader>
          <div className="h-full flex flex-col overflow-hidden">
            <ChatTab />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
