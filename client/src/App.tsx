import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import AdminKb from './pages/AdminKb';
import AdminEscalations from './pages/AdminEscalations';
import AdminFeedback from './pages/AdminFeedback';
import { useCursorTracking } from './three/shared/useCursorTracking';
import { usePerfDetect } from './three/shared/usePerfDetect';

export default function App() {
  useCursorTracking();
  usePerfDetect();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/kb" element={<AdminKb />} />
        <Route path="/admin/escalations" element={<AdminEscalations />} />
        <Route path="/admin/feedback" element={<AdminFeedback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
