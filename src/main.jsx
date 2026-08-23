import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EngineProvider } from './context/EngineContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EngineProvider>
      <App />
    </EngineProvider>
  </StrictMode>
);
