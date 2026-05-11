
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
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-64 xl:w-72 bg-[#14110f] border-r border-stone-800/50 z-40 transition-transform duration-500 ease-in-out ${hideNav ? '-translate-x-full' : 'translate-x-0'}`}>
        <div className="p-8 pb-4">
          <div className="flex items-center space-x-3 mb-10 pl-2">
            <div className="w-10 h-10 bg-orange-700 rounded-xl flex items-center justify-center shadow-lg shadow-orange-950/20 border-2 border-orange-600/20">
              <MicIcon className="w-5 h-5 text-stone-100" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-stone-50">Studio <span className="text-orange-600">Flow</span></h1>
          </div>

          <nav className="space-y-2">
            <NavItem 
              active={activeTab === 'home'} 
              onClick={() => setActiveTab('home')} 
              icon={<HomeIcon className="w-5 h-5" />} 
              label="Overview" 
            />
            <NavItem 
              active={activeTab === 'projects'} 
              onClick={() => setActiveTab('projects')} 
              icon={<FolderIcon className="w-5 h-5" />} 
              label="Projects" 
            />
            <NavItem 
              active={activeTab === 'commitments'} 
              onClick={() => setActiveTab('commitments')} 
              icon={<CalendarIcon className="w-5 h-5" />} 
              label="Commitments" 
            />
            <NavItem 
              active={activeTab === 'flow'} 
              onClick={() => setActiveTab('flow')} 
              icon={<BoltIcon className="w-5 h-5" />} 
              label="Flow State" 
            />
          </nav>
        </div>

        <div className="mt-auto p-8 space-y-6">
          <button 
            onClick={onLogClick}
            className="w-full bg-orange-700 p-4 rounded-2xl flex items-center justify-center space-x-3 shadow-xl shadow-orange-950/40 hover:bg-orange-600 transition-all active:scale-95 border-2 border-orange-600/40"
          >
            <MicIcon className="w-5 h-5 text-stone-100" />
            <span className="font-black text-[10px] uppercase tracking-[0.2em] text-stone-100">Capture Log</span>
          </button>
          
          <div className="flex items-center space-x-4 px-2 pt-4 border-t border-stone-800/50 opacity-40 hover:opacity-100 transition-opacity cursor-default group" onClick={() => setActiveTab('artist')}>
            <div className={`w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center group-hover:bg-stone-700 transition-colors ${activeTab === 'artist' ? 'ring-2 ring-orange-500/50' : ''}`}>
               <svg className="w-4 h-4 text-stone-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Artist Profile</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 safe-area-top transition-all duration-500 ${hideNav ? 'lg:pl-0' : 'lg:pl-64 xl:pl-72'} ${hideNav ? '' : 'pb-32 lg:pb-0'}`}>
        <div className="max-w-[1600px] mx-auto px-5 lg:px-12 lg:py-12">
          {children}
        </div>
      </main>

      {/* Bottom Nav Bar (Mobile Only) */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 bg-[#14110f]/90 backdrop-blur-2xl border-t border-stone-800/50 safe-area-bottom z-50 transition-transform duration-700 ease-in-out ${hideNav ? 'translate-y-[150%]' : 'translate-y-0'}`}>
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
          
          {/* Central Action Button */}
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

const NavItem = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-stone-900 text-orange-400 shadow-lg border border-stone-800/50' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/30'}`}
  >
    <div className={`transition-colors ${active ? 'text-orange-500' : 'text-stone-600 group-hover:text-stone-400'}`}>
      {icon}
    </div>
    <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${active ? 'text-stone-100' : 'text-stone-500 group-hover:text-stone-300'}`}>
      {label}
    </span>
    {active && (
      <div className="ml-auto w-1 h-4 bg-orange-600 rounded-full shadow-[0_0_10px_rgba(234,88,12,0.5)]"></div>
    )}
  </button>
);

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

export default Layout;
