import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Search, Heart, Headphones } from 'lucide-react';

interface HeaderProps {
  activeTab?: 'search' | 'liked' | 'toListen';
  setActiveTab?: (tab: 'search' | 'liked' | 'toListen') => void;
  likedCount?: number;
  toListenCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'search',
  setActiveTab,
  likedCount = 0,
  toListenCount = 0,
}) => {
  const navigate = useNavigate();

  const handleTabClick = (tab: 'search' | 'liked' | 'toListen') => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
    if (tab === 'search') {
      navigate('/');
    } else {
      navigate(`/?tab=${tab}`);
    }
  };

  const handleLogoClick = () => {
    if (setActiveTab) {
      setActiveTab('search');
    }
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-black bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand Logo - Navigates to Main Page */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none hover:opacity-80 transition-opacity" 
          onClick={handleLogoClick}
          title="Go to main page"
        >
          <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <span className="font-header text-2xl font-extrabold tracking-tight text-black">
            mox music <span className="text-[11px] font-mono font-bold tracking-wider text-neutral-500 uppercase ml-1">[v0.2]</span>
          </span>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabClick('search')}
            className={`flex items-center gap-2 border-2 border-black px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
              activeTab === 'search'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('liked')}
            className={`flex items-center gap-2 border-2 border-black px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
              activeTab === 'liked'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${activeTab === 'liked' ? 'fill-white' : ''}`} />
            <span>Liked</span>
            {likedCount > 0 && (
              <span className={`ml-1 font-mono text-[10px] px-1.5 py-0.2 border border-current ${
                activeTab === 'liked' ? 'bg-white text-black' : 'bg-black text-white'
              }`}>
                {likedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('toListen')}
            className={`flex items-center gap-2 border-2 border-black px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
              activeTab === 'toListen'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Headphones className="h-3.5 w-3.5" />
            <span>To Listen</span>
            {toListenCount > 0 && (
              <span className={`ml-1 font-mono text-[10px] px-1.5 py-0.2 border border-current ${
                activeTab === 'toListen' ? 'bg-white text-black' : 'bg-black text-white'
              }`}>
                {toListenCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Status Badge */}
        <div className="hidden sm:flex items-center gap-2 border-2 border-black bg-white px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-black hard-shadow-sm">
          <span className="h-2 w-2 bg-emerald-500 rounded-full" />
          <span>IN DEVELOPMENT</span>
        </div>
      </div>
    </header>
  );
};
