
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'home' | 'projects' | 'commitments' | 'flow' | 'artist';
  setActiveTab: (tab: 'home' | 'projects' | 'commitments' | 'flow' | 'artist') => void;
  onLogClick: () => void;
  hideNav?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogClick, hideNav = false }) => {
  return (
    <div className="flex flex-col lg:flex-row relative bg-[#0f0d0c] min-h-screen">
      {/* Desktop Side Nav */}
      <nav className={`hidden lg:flex fixed left-0 top-0 bottom-0 w-20 bg-[#14110f]/90 backdrop-blur-2xl border-r border-stone-800/50 flex-col items-center py-10 z-50 transition-transform duration-700 ease-in-out ${hideNav ? '-translate-x-full' : 'translate-x-0'}`}>
        <div className="flex flex-col items-center space-y-10 flex-1 justify-center">
          <button 
            onClick={() => setActiveTab('home')}
            className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'home' ? 'text-orange-400 bg-orange-400/10' : 'text-stone-600 hover:text-stone-400'}`}
            title="Studio"
          >
            <HomeIcon className="w-6 h-6" />
          </button>
          
          <button 
            onClick={() => setActiveTab('projects')}
            className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'projects' ? 'text-orange-400 bg-orange-400/10' : 'text-stone-600 hover:text-stone-400'}`}
            title="Projects"
          >
            <FolderIcon className="w-6 h-6" />
          </button>

          <button 
            onClick={onLogClick}
            className="bg-orange-700 w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-950/50 active:scale-90 transition-all duration-300 border border-orange-600/40 hover:bg-orange-600"
            title="Voice Log"
          >
            <MicIcon className="w-6 h-6 text-stone-100" />
          </button>

          <button 
            onClick={() => setActiveTab('commitments')}
            className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'commitments' ? 'text-orange-400 bg-orange-400/10' : 'text-stone-600 hover:text-stone-400'}`}
            title="Commitments"
          >
            <CalendarIcon className="w-6 h-6" />
          </button>

          <button 
            onClick={() => setActiveTab('flow')}
            className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'flow' ? 'text-purple-500 bg-purple-500/10' : 'text-stone-600 hover:text-stone-400'}`}
            title="Flow"
          >
            <BoltIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-auto">
          <button 
            onClick={() => setActiveTab('artist')}
            className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'artist' ? 'text-orange-400 bg-orange-400/10' : 'text-stone-600 hover:text-stone-400'}`}
            title="Profile"
          >
            <UserIcon className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <main className={`flex-1 safe-area-top lg:pl-20 ${hideNav ? '' : 'pb-32 lg:pb-0'}`}>
        <div className="px-5 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav Bar */}
      <div className={`fixed bottom-0 left-0 right-0 lg:hidden bg-[#14110f]/90 backdrop-blur-2xl border-t border-stone-800/50 safe-area-bottom z-50 transition-transform duration-700 ease-in-out ${hideNav ? 'translate-y-[150%]' : 'translate-y-0'}`}>
        <div className="flex justify-around items-center h-20 relative px-2">

          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center transition-colors duration-300 w-[18%] ${activeTab === 'home' ? 'text-orange-400' : 'text-stone-600'}`}
          >
            <HomeIcon className="w-5 h-5" />
            <span className="text-[9px] mt-1.5 font-bold tracking-tight text-center">Studio</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('projects')}
            className={`flex flex-col items-center justify-center transition-colors duration-300 w-[18%] ${activeTab === 'projects' ? 'text-orange-400' : 'text-stone-600'}`}
          >
            <FolderIcon className="w-5 h-5" />
            <span className="text-[9px] mt-1.5 font-bold tracking-tight text-center">Projects</span>
          </button>

          <div className="w-[18%] flex justify-center -mt-10">
            <button 
              onClick={onLogClick}
              aria-label="Start Voice Log"
              className="bg-orange-700 w-14 h-14 rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-orange-950/50 active:scale-90 transition-all duration-300 border-2 border-orange-600/40 hover:bg-orange-600"
            >
              <MicIcon className="w-6 h-6 text-stone-100" />
            </button>
          </div>

          <button 
            onClick={() => setActiveTab('commitments')}
            className={`flex flex-col items-center justify-center transition-colors duration-300 w-[18%] ${activeTab === 'commitments' ? 'text-orange-400' : 'text-stone-600'}`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span className="text-[9px] mt-1.5 font-bold tracking-tight text-center leading-tight">Commitments</span>
          </button>

          <button 
            onClick={() => setActiveTab('flow')}
            className={`flex flex-col items-center justify-center transition-colors duration-300 w-[18%] ${activeTab === 'flow' ? 'text-purple-500' : 'text-stone-600'}`}
          >
            <BoltIcon className="w-5 h-5" />
            <span className="text-[9px] mt-1.5 font-bold tracking-tight text-center">Flow</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const FolderIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const BoltIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const MicIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 22h8" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default Layout;
