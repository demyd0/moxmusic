import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelloPage } from '@/pages/Hello';
import { AlbumDetailsPage } from '@/pages/AlbumDetailsPage';
import { ArtistDiscographyPage } from '@/pages/ArtistDiscographyPage';

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HelloPage />} />
        <Route path="/album/:id" element={<AlbumDetailsPage />} />
        <Route path="/artist/:id" element={<ArtistDiscographyPage />} />
      </Routes>
    </Router>
  );
}

export default App;
