import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

interface HeaderProps {
  onSidebarToggle: () => void;
}

export function Header({ onSidebarToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };
  
  const closeUserMenu = () => {
    setUserMenuOpen(false);
  };
  
  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      setLocation("/login");
    }
    closeUserMenu();
  };
  
  return (
    <header className="bg-white border-b border-neutral-200 py-2 px-4 flex justify-between items-center">
      <div className="flex items-center">
        <button 
          onClick={onSidebarToggle}
          className="mr-2 lg:hidden text-neutral-700 hover:text-primary focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z"></path><path d="M12 13v9"></path><path d="M5 13v9"></path><path d="M19 13v9"></path></svg>
          <h1 className="text-xl font-semibold text-neutral-900">ContentFlow</h1>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <button className="text-neutral-600 hover:text-primary focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
        </div>
        
        <div className="relative">
          <button className="text-neutral-600 hover:text-primary focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">2</span>
          </button>
        </div>
        
        <div className="relative">
          <button 
            onClick={toggleUserMenu}
            className="flex items-center text-neutral-600 hover:text-primary focus:outline-none"
          >
            {user && (
              <div 
                className="w-8 h-8 rounded-full text-white flex items-center justify-center mr-2"
                style={{ backgroundColor: user.avatarColor || "#3B82F6" }}
              >
                <span className="text-sm font-medium">{user.avatarInitials}</span>
              </div>
            )}
            <span className="hidden md:block text-sm font-medium">{user?.displayName}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          {userMenuOpen && (
            <div className="absolute bg-white rounded-md shadow-lg mt-2 border border-neutral-200 right-0 min-w-[160px] z-50">
              <div className="py-2">
                <a href="#" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Profile</a>
                <a href="#" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Settings</a>
                <div className="border-t border-neutral-200 my-1"></div>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-neutral-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
