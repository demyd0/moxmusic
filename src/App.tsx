import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelloPage } from '@/pages/Hello';
import { AlbumDetailsPage } from '@/pages/AlbumDetailsPage';
import { ArtistDiscographyPage } from '@/pages/ArtistDiscographyPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { SharedCollectionPage } from '@/pages/SharedCollectionPage';
import { ImportPage } from '@/pages/ImportPage';
import { ProfileEditPage } from '@/pages/ProfileEditPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { useCursorSpotlight } from '@/hooks/useCursorSpotlight';
import { ChatProvider } from '@/contexts/ChatContext';
import { ChatPanel } from '@/components/ChatPanel';

export function App() {
  useCursorSpotlight();
  return (
    <Router>
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
        </Routes>
        <ChatPanel />
      </ChatProvider>
    </Router>
  );
}

export default App;
