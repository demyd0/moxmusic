import React, { useState } from 'react';
import { Trash2, AlertOctagon, X } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete();
    } catch (error) {
      console.error('Account deletion error:', error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-none p-4 animate-fadeIn">
      <div className="w-full max-w-md border-2 border-black bg-white p-6 hard-shadow relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b-2 border-black pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-red-600 text-white hard-shadow-sm">
            <AlertOctagon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-header text-xl font-extrabold uppercase text-black">
              DELETE ACCOUNT
            </h3>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
              PERMANENT DATA ERASURE
            </p>
          </div>
        </div>

        {/* Body Text */}
        <div className="space-y-3 font-mono text-xs text-neutral-800 leading-relaxed mb-6">
          <div className="border-2 border-red-600 bg-red-50 p-4 font-bold text-red-700">
            ARE YOU SURE? THIS ACTION IS PERMANENT AND CANNOT BE UNDONE.
          </div>
          <p>
            Deleting your account will permanently erase your profile, all saved <strong>Liked</strong> albums, and <strong>To Listen</strong> queues from Cloud Firestore.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 font-mono text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full inline-flex items-center justify-center gap-2 border-2 border-black bg-red-600 py-2.5 text-white hover:bg-red-700 transition-all hard-shadow-sm disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isDeleting ? 'DELETING EVERYTHING...' : 'PERMANENTLY DELETE ACCOUNT'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto border-2 border-black bg-white px-4 py-2.5 text-black hover:bg-neutral-100 transition-all"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};
