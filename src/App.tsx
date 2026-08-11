import React, { useEffect, useState } from 'react';
import type { MainTabType } from './components/Navigation/SubTabsNav';
import { SidebarNav } from './components/Navigation/SidebarNav';
import { MCPRegistrationCard } from './components/MCPManager/MCPRegistrationCard';
import { MCPList } from './components/MCPManager/MCPList';
import { MCPPentestSuite } from './components/PentestSuite/MCPPentestSuite';
import { MCPLoadTestSuite } from './components/PentestSuite/MCPLoadTestSuite';
import type { BlipContext } from './types/blip';
import type { MCPTool } from './types/mcp';
import { createAuthorizationKey, getApplication, getLoggedUser, setHeight } from './services/blipService';
import { addTool, deleteTool, getStoredTools, toggleToolEnabled } from './services/mcpService';

export const App: React.FC = () => {
  const [blipContext, setBlipContext] = useState<BlipContext>({
    application: null,
    user: null,
    authorizationKey: null,
    loading: true,
  });

  const [activeTab, setActiveTab] = useState<MainTabType>('manager');
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loadingTools, setLoadingTools] = useState<boolean>(true);

  const loadBlipData = async () => {
    setBlipContext((prev) => ({ ...prev, loading: true }));
    try {
      const app = await getApplication();
      const user = await getLoggedUser();
      const authKey = app ? createAuthorizationKey(app.shortName, app.accessKey) : '';

      setBlipContext({
        application: app,
        user,
        authorizationKey: authKey,
        loading: false,
      });
    } catch (err) {
      console.warn('Erro ao carregar contexto Blip:', err);
      setBlipContext((prev) => ({ ...prev, loading: false }));
    }
  };

  const loadTools = () => {
    setLoadingTools(true);
    const stored = getStoredTools();
    setTools(stored);
    setLoadingTools(false);
  };

  useEffect(() => {
    loadBlipData();
    loadTools();
  }, []);

  useEffect(() => {
    const updateIframeHeight = () => {
      const scrollHeight = document.body.scrollHeight || document.documentElement.scrollHeight;
      setHeight(Math.max(scrollHeight + 40, 850));
    };

    updateIframeHeight();
    const observer = new ResizeObserver(updateIframeHeight);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [activeTab, tools]);

  const handleToolAdded = (toolData: Omit<MCPTool, 'id' | 'createdAt'>): MCPTool => {
    const created = addTool(toolData);
    setTools(getStoredTools());
    return created;
  };

  const handleToggleTool = (id: string) => {
    const updated = toggleToolEnabled(id);
    setTools(updated);
  };

  const handleDeleteTool = (id: string) => {
    const updated = deleteTool(id);
    setTools(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 md:p-6 font-sans">
      <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-12">
        {/* Coluna Esquerda: Sidebar com Header, Status do Bot & Navegação Vertical */}
        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-4">
          <SidebarNav
            blipContext={blipContext}
            onRefresh={loadTools}
            loading={loadingTools}
            toolCount={tools.length}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Coluna Direita: Workspace Principal */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {activeTab === 'manager' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <MCPRegistrationCard onToolAdded={handleToolAdded} />
              <MCPList
                tools={tools}
                onToggleEnabled={handleToggleTool}
                onDelete={handleDeleteTool}
              />
            </div>
          )}

          {activeTab === 'pentest' && <MCPPentestSuite tools={tools} />}

          {activeTab === 'stress' && <MCPLoadTestSuite tools={tools} />}
        </div>
      </div>
    </div>
  );
};

export default App;
