import { useCallback } from 'react';
import { projectApi } from '../api/client';
import { useAgentStore } from '../store/agentStore';

export function useProject() {
  const openProject = useCallback(
    async (path: string) => {
      const { data } = await projectApi.openProject(path);
      useAgentStore.getState().setWorkspacePath(data.path);

      // Refresh files after a short delay for indexing to start
      setTimeout(async () => {
        const { data: filesData } = await projectApi.getFiles();
        useAgentStore.getState().setProjectFiles(filesData.files);
      }, 2000);

      return data;
    },
    [],
  );

  const refreshFiles = useCallback(async () => {
    const { data } = await projectApi.getFiles();
    useAgentStore.getState().setProjectFiles(data.files);
  }, []);

  const refreshMemory = useCallback(async () => {
    const { data } = await projectApi.getMemory();
    useAgentStore.getState().setProjectMemory(data.memory);
  }, []);

  return { openProject, refreshFiles, refreshMemory };
}
