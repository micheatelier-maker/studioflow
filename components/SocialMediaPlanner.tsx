
import React from 'react';
import { WorkshopLog, Project } from '../types';

interface SocialMediaPlannerProps {
  logs: WorkshopLog[];
  projects: Project[];
}

const SocialMediaPlanner: React.FC<SocialMediaPlannerProps> = ({ logs, projects }) => {
  const postLogs = logs.filter(log => log.type === 'post');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-3xl p-6 handcrafted-shadow">
        <h3 className="text-indigo-300 font-bold text-lg">Content Lab</h3>
        <p className="text-stone-500 text-sm mt-1 leading-relaxed italic">
          Your word-vomits are here, structured and ready for the world.
        </p>
      </div>

      {postLogs.length === 0 ? (
        <div className="bg-stone-900/30 border-2 border-dashed border-stone-800/60 rounded-[2.5rem] p-12 text-center">
          <p className="text-stone-600 text-sm font-medium">No content drafts yet.<br/>Use 'Social Media' to start planning.</p>
        </div>
      ) : (
        <div className="space-y-5 pb-10">
          {postLogs.map(post => (
            <div key={post.id} className="bg-[#1a1715] border border-stone-800/50 rounded-[2rem] p-6 handcrafted-shadow overflow-hidden relative">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] px-3 py-1 bg-indigo-900/30 text-indigo-400 rounded-full border border-indigo-800/30 font-black uppercase tracking-widest">
                  {post.project_name}
                </span>
                <span className="text-stone-600 text-[10px] font-bold uppercase">
                  {new Date(post.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em] mb-1">The Hook</h4>
                  <p className="text-stone-100 font-bold text-lg leading-tight">
                    {post.post_hook || "No hook extracted."}
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em] mb-1">Caption Preview</h4>
                  <p className="text-stone-400 text-sm line-clamp-3 italic leading-relaxed">
                    {post.post_caption || "Drafting summary..."}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-stone-800/40 pt-4">
                <button className="text-stone-500 hover:text-indigo-400 transition-colors flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-widest">Copy Copy</span>
                </button>
                <div className="flex space-x-2">
                   <div className="w-2 h-2 rounded-full bg-indigo-500/40"></div>
                   <div className="w-2 h-2 rounded-full bg-stone-800"></div>
                   <div className="w-2 h-2 rounded-full bg-stone-800"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialMediaPlanner;
