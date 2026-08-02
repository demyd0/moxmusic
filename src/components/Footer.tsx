import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t-2 border-black bg-white py-8">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-6 font-mono text-xs text-neutral-600 uppercase tracking-wider">
        <div>
          Data sources:{' '}
          <a
            href="https://www.apple.com/itunes/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black font-bold hover:underline"
          >
            iTunes Search API
          </a>{' '}
          ·{' '}
          <a
            href="https://musicbrainz.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black font-bold hover:underline"
          >
            MusicBrainz
          </a>{' '}
          ·{' '}
          <a
            href="https://coverartarchive.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black font-bold hover:underline"
          >
            Cover Art Archive
          </a>{' '}
          ·{' '}
          <a
            href="https://www.last.fm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black font-bold hover:underline"
          >
            Last.fm
          </a>
          . Personal non-commercial project.
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/privacy"
            className="border border-black bg-neutral-100 px-2.5 py-1 font-bold text-black hover:bg-black hover:text-white transition-all"
          >
            PRIVACY POLICY
          </Link>
          <span className="font-bold text-black">MOX MUSIC © 2026</span>
        </div>
      </div>
    </footer>
  );
};
