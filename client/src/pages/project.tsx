import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { ProjectColumn } from "@/components/project-column";
import { NewProjectModal } from "@/components/new-project-modal";
import { AddContentModal } from "@/components/add-content-modal";
import { YoutubeVideosTab } from "@/components/youtube-videos-tab";
import { FilesTab } from "@/components/files-tab";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuth } from "@/lib/auth";
import { ColumnWithContents, Project, User } from "@shared/schema";

export default function ProjectPage({ id }: { id: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [addContentModalOpen, setAddContentModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("board");
  
  const projectId = parseInt(id);
  
  const { data: project, isLoading: isProjectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });
  
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  
  const { data: columns = [], isLoading: isColumnsLoading } = useQuery<ColumnWithContents[]>({
    queryKey: [`/api/projects/${projectId}/columns`],
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
  
  const handleAddContent = (columnId: number | null = null) => {
    setSelectedColumnId(columnId);
    setAddContentModalOpen(true);
  };
  
  const closeAddContentModal = () => {
    setAddContentModalOpen(false);
    setSelectedColumnId(null);
  };
  
  // Loading state
  if (isProjectLoading || isColumnsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
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
          {/* Project Header */}
          <div className="bg-white border-b border-neutral-200 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-neutral-900">{project?.name}</h1>
                <p className="text-sm text-neutral-500 mt-1">{project?.description}</p>
              </div>
              <div className="flex items-center space-x-2 mt-4 md:mt-0">
                <div className="flex -space-x-2">
                  {project?.members?.slice(0, 3).map(member => (
                    <div 
                      key={member.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs border-2 border-white z-10"
                      style={{ backgroundColor: member.avatarColor || "#3B82F6" }}
                    >
                      {member.avatarInitials}
                    </div>
                  ))}
                  {project?.members && project.members.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs border-2 border-white text-neutral-600 z-0">
                      +{project.members.length - 3}
                    </div>
                  )}
                </div>
                <button className="bg-white hover:bg-neutral-100 text-neutral-700 text-sm py-1 px-3 border border-neutral-300 rounded-md flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                  <span>Share</span>
                </button>
                <button 
                  className="bg-primary hover:bg-primary/90 text-white text-sm py-1 px-3 rounded-md flex items-center"
                  onClick={() => handleAddContent()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span>Add Content</span>
                </button>
              </div>
            </div>
            
            <div className="flex space-x-1 mt-4 border-b border-neutral-200">
              <button 
                className={`px-4 py-2 ${activeTab === "board" ? "text-primary border-b-2 border-primary font-medium" : "text-neutral-500 hover:text-neutral-800"}`}
                onClick={() => setActiveTab("board")}
              >
                Board
              </button>
              <button 
                className={`px-4 py-2 ${activeTab === "timeline" ? "text-primary border-b-2 border-primary font-medium" : "text-neutral-500 hover:text-neutral-800"}`}
                onClick={() => setActiveTab("timeline")}
              >
                Timeline
              </button>
              <button 
                className={`px-4 py-2 ${activeTab === "calendar" ? "text-primary border-b-2 border-primary font-medium" : "text-neutral-500 hover:text-neutral-800"}`}
                onClick={() => setActiveTab("calendar")}
              >
                Calendar
              </button>
              <button 
                className={`px-4 py-2 ${activeTab === "files" ? "text-primary border-b-2 border-primary font-medium" : "text-neutral-500 hover:text-neutral-800"}`}
                onClick={() => setActiveTab("files")}
              >
                Files
              </button>
              <button 
                className={`px-4 py-2 ${activeTab === "youtube" ? "text-primary border-b-2 border-primary font-medium" : "text-neutral-500 hover:text-neutral-800"}`}
                onClick={() => setActiveTab("youtube")}
              >
                YouTube
              </button>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === "board" && (
              <DndProvider backend={HTML5Backend}>
                <div className="flex flex-1 space-x-4 h-full">
                  {columns.map(column => (
                    <ProjectColumn 
                      key={column.id} 
                      column={column} 
                      onAddContent={() => handleAddContent(column.id)}
                    />
                  ))}
                  
                  {/* Add Column Button */}
                  <div className="flex-shrink-0 w-10 flex items-start justify-center">
                    <button className="mt-3 w-8 h-8 bg-neutral-200 hover:bg-neutral-300 rounded-full flex items-center justify-center text-neutral-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                  </div>
                </div>
              </DndProvider>
            )}
            
            {activeTab === "youtube" && (
              <YoutubeVideosTab projectId={projectId} />
            )}
            
            {activeTab === "timeline" && (
              <div className="flex items-center justify-center h-64">
                <p className="text-neutral-500">Timeline view coming soon</p>
              </div>
            )}
            
            {activeTab === "calendar" && (
              <div className="flex items-center justify-center h-64">
                <p className="text-neutral-500">Calendar view coming soon</p>
              </div>
            )}
            
            {activeTab === "files" && (
              <FilesTab projectId={projectId} />
            )}
          </div>
        </main>
      </div>
      
      <NewProjectModal 
        isOpen={newProjectModalOpen} 
        onClose={closeNewProjectModal}
        users={users}
      />
      
      <AddContentModal 
        isOpen={addContentModalOpen} 
        onClose={closeAddContentModal}
        projectId={projectId}
        selectedColumnId={selectedColumnId}
        columns={columns}
        users={users}
      />
    </div>
  );
}
