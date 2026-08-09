import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Users } from 'lucide-react';
import type { FollowUser } from '@/services/followService';

interface FollowListModalProps {
  title: string;
  users: FollowUser[];
  isLoading: boolean;
  onClose: () => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({ title, users, isLoading, onClose }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-none p-4 animate-fadeIn">
      <div className="w-full max-w-sm border-2 border-black bg-white hard-shadow-lg relative max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b-2 border-black p-4 shrink-0">
          <h3 className="font-header text-lg font-extrabold uppercase text-black">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-black" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Users className="h-8 w-8 text-neutral-300 mb-2" />
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">NOBODY HERE YET</p>
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user.uid}
                onClick={() => {
                  onClose();
                  navigate(`/share/${user.username}`);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-100 transition-all"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-black text-white font-mono text-xs font-bold overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.username} className="h-full w-full object-cover" />
                  ) : (
                    user.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="font-mono text-sm font-bold text-black truncate">@{user.username}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
