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

  const loadTools = async (contractId?: string | null, authKey?: string | null) => {
    setLoadingTools(true);
    const stored = await getStoredTools(contractId, authKey);
    setTools(stored);
    setLoadingTools(false);
  };

  const loadBlipDataAndTools = async () => {
    setBlipContext((prev) => ({ ...prev, loading: true }));
    let contractId: string | null = null;
    let authKey: string | null = null;

    try {
      const app = await getApplication();
      const user = await getLoggedUser();
      if (app) {
        authKey = createAuthorizationKey(app.shortName, app.accessKey);
        contractId = app.tenantId || app.shortName;
      }

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

    await loadTools(contractId, authKey);
  };

  useEffect(() => {
    void loadBlipDataAndTools();
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

  const handleToolAdded = async (toolData: Omit<MCPTool, 'id' | 'createdAt'>): Promise<MCPTool> => {
    const contractId = blipContext.application?.tenantId || blipContext.application?.shortName;
    const created = await addTool(toolData, tools, contractId, blipContext.authorizationKey);
    setTools((prev) => [created, ...prev]);
    return created;
  };

  const handleToggleTool = async (id: string) => {
    const contractId = blipContext.application?.tenantId || blipContext.application?.shortName;
    const updated = await toggleToolEnabled(id, tools, contractId, blipContext.authorizationKey);
    setTools(updated);
  };

  const handleDeleteTool = async (id: string) => {
    const contractId = blipContext.application?.tenantId || blipContext.application?.shortName;
    const updated = await deleteTool(id, tools, contractId, blipContext.authorizationKey);
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
