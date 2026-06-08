import { MainLayout } from './components/layout/MainLayout';
import { useWebSocket } from './hooks/useWebSocket';
import { useProject } from './hooks/useProject';
import { healthApi } from './api/client';
import { useEffect } from 'react';

export default function App() {
  // Establish WebSocket connection
  useWebSocket();
  const { refreshMemory } = useProject();

  useEffect(() => {
    // On mount, check health and load memory
    healthApi.check().then(({ data }) => {
      if (!data.ollama.ok) {
        console.warn('[Health] Ollama not available:', data.ollama.error);
      } else {
        console.log('[Health] Ollama OK, model:', data.ollama.model);
      }
    }).catch(() => {
      console.warn('[Health] Backend not reachable');
    });

    refreshMemory().catch(() => {});
  }, []);

  return <MainLayout />;
}
