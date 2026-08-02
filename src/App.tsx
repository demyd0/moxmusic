import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelloPage } from '@/pages/Hello';
import { AlbumDetailsPage } from '@/pages/AlbumDetailsPage';
import { ArtistDiscographyPage } from '@/pages/ArtistDiscographyPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { SharedCollectionPage } from '@/pages/SharedCollectionPage';

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HelloPage />} />
        <Route path="/album/:id" element={<AlbumDetailsPage />} />
        <Route path="/artist/:id" element={<ArtistDiscographyPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/share/:uid" element={<SharedCollectionPage />} />
      </Routes>
    </Router>
  );
}

export default App;
