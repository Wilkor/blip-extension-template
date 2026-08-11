import React from 'react';

export type MainTabType = 'manager' | 'pentest' | 'stress';

interface SubTabsNavProps {
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
}

export const SubTabsNav: React.FC<SubTabsNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      <bds-button
        variant={activeTab === 'manager' ? 'primary' : 'secondary'}
        size="standard"
        onClick={() => onTabChange('manager')}
        icon="builder-mcp"
      >
        Conectar & Ferramentas MCP
      </bds-button>

      <bds-button
        variant={activeTab === 'pentest' ? 'primary' : 'secondary'}
        size="standard"
        onClick={() => onTabChange('pentest')}
        icon="data-security"
      >
        Suíte de Pentest & Segurança
      </bds-button>

      <bds-button
        variant={activeTab === 'stress' ? 'primary' : 'secondary'}
        size="standard"
        onClick={() => onTabChange('stress')}
        icon="automation"
      >
        Teste de Carga & Estresse
      </bds-button>
    </div>
  );
};
