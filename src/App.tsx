import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelloPage } from '@/pages/Hello';
import { AlbumDetailsPage } from '@/pages/AlbumDetailsPage';
import { ArtistDiscographyPage } from '@/pages/ArtistDiscographyPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { SharedCollectionPage } from '@/pages/SharedCollectionPage';
import { ImportPage } from '@/pages/ImportPage';
import { ProfileEditPage } from '@/pages/ProfileEditPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PeoplePage } from '@/pages/PeoplePage';
import { FollowedArtistsPage } from '@/pages/FollowedArtistsPage';
import { useCursorSpotlight } from '@/hooks/useCursorSpotlight';
import { ChatProvider } from '@/contexts/ChatContext';
import { AudioEngineProvider } from '@/contexts/AudioEngineContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { ChatPanel } from '@/components/ChatPanel';
import { PlayerBar } from '@/components/PlayerBar';

export function App() {
  useCursorSpotlight();
  return (
    <Router>
      <AudioEngineProvider>
        <PlayerProvider>
          <ChatProvider>
            <Routes>
              <Route path="/" element={<HelloPage />} />
              <Route path="/album/:id" element={<AlbumDetailsPage />} />
              <Route path="/artist/:id" element={<ArtistDiscographyPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/share/:username" element={<SharedCollectionPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/profile/edit" element={<ProfileEditPage />} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/artists/following" element={<FollowedArtistsPage />} />
            </Routes>
            <ChatPanel />
            <PlayerBar />
          </ChatProvider>
        </PlayerProvider>
      </AudioEngineProvider>
    </Router>
  );
}

export default App;
