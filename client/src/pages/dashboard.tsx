import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { NewProjectModal } from "@/components/new-project-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Project, User, UserRole } from "@shared/schema";
import { TeamTab } from "@/components/team-tab";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const { user } = useAuth();
  
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  
  const { data: users = [], isLoading: isUsersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const openNewProjectModal = () => {
    setNewProjectModalOpen(true);
  };
  
  const closeNewProjectModal = () => {
    setNewProjectModalOpen(false);
  };
  
  return (
    <div className="bg-neutral-100 h-screen flex flex-col overflow-hidden text-neutral-900">
      <Header onSidebarToggle={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <Sidebar 
            projects={projects} 
            isOpen={sidebarOpen} 
            onToggle={toggleSidebar} 
            onNewProject={openNewProjectModal}
          />
        )}
        
        <main className="flex-1 flex flex-col overflow-hidden bg-neutral-50">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Welcome, {user?.displayName}</h1>
                <p className="text-neutral-500 mt-1">Manage your content, projects and team</p>
              </div>
              <button 
                onClick={openNewProjectModal}
                className="mt-4 md:mt-0 bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-md flex items-center justify-center transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>New Project</span>
              </button>
            </div>
            
            <Tabs defaultValue="projects" className="mb-6">
              <TabsList className="mb-4">
                <TabsTrigger value="projects">Projects</TabsTrigger>
                {/* Only show Team tab for admins and producers */}
                {user?.role === UserRole.ADMIN || user?.role === UserRole.PRODUCER ? (
                  <TabsTrigger value="team">Team</TabsTrigger>
                ) : null}
              </TabsList>
              
              <TabsContent value="projects">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {isProjectsLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <Card key={i} className="shadow-sm">
                        <CardContent className="p-6">
                          <div className="h-5 w-24 bg-neutral-200 rounded-md animate-pulse mb-4"></div>
                          <div className="h-4 w-full bg-neutral-200 rounded-md animate-pulse mb-2"></div>
                          <div className="h-4 w-2/3 bg-neutral-200 rounded-md animate-pulse"></div>
                        </CardContent>
                      </Card>
                    ))
                  ) : projects.length > 0 ? (
                    projects.map(project => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <a className="block">
                          <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardContent className="p-6 flex flex-col h-full">
                              <div className="flex-1">
                                <div className="flex items-center mb-4">
                                  {project.type.includes("YouTube") ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                                  )}
                                  <h3 className="text-lg font-semibold text-neutral-900">{project.name}</h3>
                                </div>
                                <p className="text-sm text-neutral-600 mb-4">{project.description}</p>
                                <div className="text-xs text-neutral-500">{project.type}</div>
                              </div>
                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
                                <div className="flex -space-x-2">
                                  {project.members?.slice(0, 3).map(member => (
                                    <div 
                                      key={member.id}
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs border-2 border-white"
                                      style={{ backgroundColor: member.avatarColor || "#3B82F6" }}
                                    >
                                      {member.avatarInitials}
                                    </div>
                                  ))}
                                  {project.members && project.members.length > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs border-2 border-white text-neutral-600">
                                      +{project.members.length - 3}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  {new Date(project.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </a>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4 text-neutral-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.48-8.48l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                      </div>
                      <h3 className="text-lg font-medium text-neutral-800 mb-2">No projects yet</h3>
                      <p className="text-neutral-500 max-w-md mb-6">Create your first project to start organizing your content for YouTube videos or video pitches.</p>
                      <button 
                        onClick={openNewProjectModal}
                        className="bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-md flex items-center justify-center transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Create Your First Project</span>
                      </button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {user?.role === UserRole.ADMIN || user?.role === UserRole.PRODUCER ? (
                <TabsContent value="team">
                  <TeamTab />
                </TabsContent>
              ) : null}
            </Tabs>
          </div>
        </main>
      </div>
      
      <NewProjectModal 
        isOpen={newProjectModalOpen} 
        onClose={closeNewProjectModal}
        users={users}
      />
    </div>
  );
}
