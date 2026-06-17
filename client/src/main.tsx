import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// NOTE: React.StrictMode is intentionally omitted. Its dev-only double-mount
// recreates every WebGL <Canvas> twice, which exhausts WebGL contexts and
// crashes @react-three/postprocessing. Production is unaffected either way.
createRoot(document.getElementById('root')!).render(<App />);
