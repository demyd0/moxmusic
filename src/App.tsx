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
import { RecapPage } from '@/pages/RecapPage';
import { useCursorSpotlight } from '@/hooks/useCursorSpotlight';
import { ChatProvider } from '@/contexts/ChatContext';
import { AudioEngineProvider } from '@/contexts/AudioEngineContext';
import { ChatPanel } from '@/components/ChatPanel';
import { AeroBackground } from '@/components/AeroBackground';

export function App() {
  useCursorSpotlight();
  return (
    <Router>
      <AeroBackground />
      <AudioEngineProvider>
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
            <Route path="/recap" element={<RecapPage />} />
          </Routes>
          <ChatPanel />
        </ChatProvider>
      </AudioEngineProvider>
    </Router>
  );
}

export default App;
