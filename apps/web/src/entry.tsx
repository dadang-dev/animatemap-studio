import { createRoot } from 'react-dom/client';
import { App } from './App';
import './style.css';
import './editor.css';
import './export.css';
import './polish.css';
import '@fontsource/noto-sans/latin-400.css';
import '@fontsource/noto-sans/latin-700.css';
import '@fontsource/noto-sans/vietnamese-400.css';
import '@fontsource/noto-sans/vietnamese-700.css';
import { RenderView } from './RenderView';
createRoot(document.getElementById('root')!).render(
  location.pathname === '/render' ? <RenderView /> : <App />,
);
