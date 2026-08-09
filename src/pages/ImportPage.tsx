import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { auth, getOrCreateUserId, signInWithGoogle } from '@/lib/firebase';
import { parseImportCsv, type ParsedImportRow } from '@/lib/csvImport';
import { buildImportedTracks } from '@/services/importService';
import { bulkAddLikedItems, subscribeUserCollections } from '@/services/collectionService';
import {
  ArrowLeft,
  Upload,
  FileText,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Music,
  Heart,
} from 'lucide-react';

interface ServiceOption {
  name: string;
  color: string;
  instructions: string;
  exportUrl: string;
}

const SERVICES: ServiceOption[] = [
  {
    name: 'SPOTIFY',
    color: '#1DB954',
    instructions: 'Sign in with Spotify on Exportify, open "Liked Songs", export as CSV.',
    exportUrl: 'https://exportify.net/',
  },
  {
    name: 'YOUTUBE MUSIC',
    color: '#FF0000',
    instructions: 'Sign in with Google on TuneMyMusic, pick your library, export as CSV.',
    exportUrl: 'https://www.tunemymusic.com/transfer/youtube-music-to-file',
  },
  {
    name: 'DEEZER',
    color: '#A238FF',
    instructions: 'Sign in with Deezer on TuneMyMusic, pick your library, export as CSV.',
    exportUrl: 'https://www.tunemymusic.com/transfer/deezer-to-file',
  },
  {
    name: 'SOUNDCLOUD',
    color: '#FF5500',
    instructions: 'Sign in with SoundCloud on TuneMyMusic, pick your likes, export as CSV.',
    exportUrl: 'https://www.tunemymusic.com/transfer/soundcloud-to-file',
  },
];

type ImportStage = 'idle' | 'parsed' | 'importing' | 'done';

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [likedCount, setLikedCount] = useState(0);
  const [toListenCount, setToListenCount] = useState(0);

  const [stage, setStage] = useState<ImportStage>('idle');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initUser() {
      const uid = await getOrCreateUserId();
      setUserId(uid);
      unsubscribe = subscribeUserCollections(uid, (state) => {
        setLikedCount(state.likedAlbums.length);
        setToListenCount(state.toListenAlbums.length);
      });
    }
    initUser();

    const unsubAuth = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(Boolean(user && !user.isAnonymous));
    });

    return () => {
      if (unsubscribe) unsubscribe();
      unsubAuth();
    };
  }, []);

  const resetImport = () => {
    setStage('idle');
    setFileName('');
    setParsedRows([]);
    setParseError(null);
    setImportedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = (file: File) => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }

    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const rows = parseImportCsv(text);
        if (rows.length === 0) {
          setParseError("No tracks found in this file. Make sure it's a CSV export of your liked songs.");
          return;
        }
        setParsedRows(rows);
        setStage('parsed');
      } catch (err: any) {
        setParseError(err?.message || 'Failed to read this file.');
      }
    };
    reader.onerror = () => setParseError('Failed to read this file.');
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = async () => {
    if (!userId || parsedRows.length === 0) return;
    setStage('importing');
    try {
      const tracks = buildImportedTracks(parsedRows);
      await bulkAddLikedItems(userId, tracks);
      setImportedCount(tracks.length);
      setStage('done');
    } catch (err) {
      console.error('Bulk import failed:', err);
      setParseError('Something went wrong saving these tracks. Please try again.');
      setStage('parsed');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
      <div>
        <Header likedCount={likedCount} toListenCount={toListenCount} />

        <main className="relative z-10 mx-auto max-w-4xl px-6 py-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hard-shadow-sm hover:bg-neutral-100 transition-all mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>BACK</span>
          </button>

          {/* Title */}
          <div className="border-2 border-black bg-white p-6 hard-shadow mb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm shrink-0">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                  BRING YOUR LIBRARY
                </div>
                <h1 className="font-header text-3xl sm:text-4xl font-extrabold uppercase text-black">
                  IMPORT LIKED SONGS
                </h1>
              </div>
            </div>
          </div>

          {/* Step 1: get a CSV from your service */}
          <section className="border-2 border-black bg-white p-6 hard-shadow mb-6">
            <h2 className="font-header text-lg font-extrabold uppercase text-black mb-1">
              1. GET A CSV FROM YOUR SERVICE
            </h2>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-5">
              WE DON'T CONNECT TO THESE ACCOUNTS DIRECTLY — EXPORT A FILE, THEN UPLOAD IT BELOW
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SERVICES.map((service) => (
                <a
                  key={service.name}
                  href={service.exportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 border-2 border-black p-3.5 hard-shadow-sm hover:-translate-y-0.5 transition-all bg-white"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black font-mono text-[10px] font-extrabold text-white"
                    style={{ backgroundColor: service.color }}
                  >
                    {service.name.slice(0, 2)}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black">
                      {service.name}
                      <ExternalLink className="h-3 w-3 shrink-0 text-neutral-400 group-hover:text-black transition-colors" />
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] leading-snug text-neutral-500">
                      {service.instructions}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>

          {/* Step 2: upload */}
          <section className="border-2 border-black bg-white p-6 hard-shadow">
            <h2 className="font-header text-lg font-extrabold uppercase text-black mb-1">
              2. UPLOAD THE CSV
            </h2>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-5">
              WE READ TITLE, ARTIST, ALBUM & COVER FROM THE FILE ITSELF
            </p>

            {stage === 'idle' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-14 text-center cursor-pointer transition-all ${
                  isDragOver ? 'border-black bg-neutral-100' : 'border-black bg-neutral-50 hover:bg-neutral-100'
                }`}
              >
                <FileText className="h-8 w-8 text-black" />
                <div>
                  <div className="font-mono text-sm font-bold uppercase text-black">
                    DROP YOUR CSV HERE
                  </div>
                  <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider mt-1">
                    OR CLICK TO BROWSE
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            )}

            {parseError && (
              <div className="mt-4 flex items-start gap-2.5 border-2 border-red-600 bg-red-50 p-4 font-mono text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {stage === 'parsed' && (
              <div className="mt-4 border-2 border-black bg-neutral-50 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <FileText className="h-4 w-4 text-black shrink-0" />
                  <span className="font-mono text-xs font-bold text-black truncate">{fileName}</span>
                </div>
                <p className="font-mono text-sm text-black mb-4">
                  Found <strong>{parsedRows.length}</strong> track{parsedRows.length === 1 ? '' : 's'} in this file.
                </p>
                <div className="max-h-40 overflow-y-auto border border-black/10 divide-y divide-black/10 mb-4 bg-white">
                  {parsedRows.slice(0, 8).map((row, i) => (
                    <div key={i} className="px-3 py-2 font-mono text-[11px] text-neutral-700 truncate">
                      <span className="text-black font-bold">{row.title}</span> — {row.artist}
                    </div>
                  ))}
                  {parsedRows.length > 8 && (
                    <div className="px-3 py-2 font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                      + {parsedRows.length - 8} more
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="inline-flex items-center gap-2 border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all hard-shadow-sm"
                  >
                    <Heart className="h-4 w-4" />
                    <span>IMPORT {parsedRows.length} TRACKS</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetImport}
                    className="border-2 border-black bg-white px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-all"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            {stage === 'importing' && (
              <div className="mt-4 flex flex-col items-center justify-center gap-3 border-2 border-black bg-neutral-50 py-14 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-black" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                  SAVING {parsedRows.length} TRACKS...
                </span>
              </div>
            )}

            {stage === 'done' && (
              <div className="mt-4 flex flex-col items-center justify-center gap-3 border-2 border-black bg-neutral-50 py-14 text-center">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                <div>
                  <div className="font-mono text-sm font-bold uppercase text-black">
                    IMPORTED {importedCount} TRACK{importedCount === 1 ? '' : 'S'}
                  </div>
                  <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider mt-1">
                    THEY'RE NOW IN YOUR LIKED COLLECTION
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/?tab=liked')}
                    className="inline-flex items-center gap-2 border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all hard-shadow-sm"
                  >
                    <Music className="h-4 w-4" />
                    <span>VIEW LIKED</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetImport}
                    className="border-2 border-black bg-white px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-all"
                  >
                    IMPORT ANOTHER FILE
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      <Footer />

      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
        onSignIn={signInWithGoogle}
      />
    </div>
  );
};
