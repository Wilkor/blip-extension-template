import { type FC } from 'react';
import type { BlipContext } from '../../types/blip';
import type { MainTabType } from './SubTabsNav';

interface SidebarNavProps {
  blipContext: BlipContext;
  onRefresh: () => void;
  loading: boolean;
  toolCount: number;
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
}

export const SidebarNav: FC<SidebarNavProps> = ({
  blipContext,
  onRefresh,
  loading,
  toolCount,
  activeTab,
  onTabChange,
}) => {
  const botName = blipContext.application?.shortName || 'Bot Local';
  const userName = blipContext.user?.fullName || blipContext.user?.email || 'Usuário Blip';

  return (
    <bds-card
      bg-color="surface-1"
      class="shadow-xs w-full space-y-4 rounded-xl border border-slate-200 p-4"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="flex shrink-0 items-center justify-center rounded-xl border border-[#0096EB]/20 bg-[#0096EB]/10 p-2.5 text-[#0096EB]">
          <bds-icon name="plugin" size="medium" theme="outline" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="text-sm font-extrabold tracking-tight text-slate-800">
              MCP Analyzer
            </h1>
            {/* <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#0096EB] text-white font-semibold">
              Blip Extension
            </span> */}
          </div>
          <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
            Gestão &amp; Auditoria MCP
          </p>
        </div>
      </div>

      {/* Bot & User Info Card */}
      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 font-medium text-slate-500">
            <bds-icon name="user-default" size="small" theme="outline" />
            Bot:
          </span>
          <span className="max-w-[130px] truncate font-bold text-slate-800">{botName}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 font-medium text-slate-500">
            <bds-icon name="user-default" size="small" theme="outline" />
            Usuário:
          </span>
          <span className="max-w-[130px] truncate font-medium text-slate-700">{userName}</span>
        </div>
      </div>

      {/* Status & Refresh Button */}
      <div className="flex items-center justify-between gap-2 border-y border-slate-200 py-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-[#0096EB]">
          <bds-icon name="checkball" size="small" theme="solid" color="var(--color-[#0096EB])" />
          <span>{toolCount} MCP(s)</span>
        </div>

        <bds-button
          variant="secondary"
          size="short"
          onClick={onRefresh}
          disabled={loading}
          icon="refresh"
        >
          {loading ? '...' : 'Atualizar'}
        </bds-button>
      </div>

      {/* Menu de Navegação Vertical */}
      <div className="space-y-2 pt-1">
        <span className="block px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navegação Principal
        </span>

        <button
          type="button"
          onClick={() => onTabChange('manager')}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left text-xs font-semibold transition-all ${
            activeTab === 'manager'
              ? 'shadow-xs border-[#0096EB] bg-[#0096EB] text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <bds-icon
            name="plugin"
            size="small"
            theme="outline"
          />
          <div className="flex flex-col">
            <span>Conectar &amp; Ferramentas</span>
            <span className={`text-[10px] font-normal ${activeTab === 'manager' ? 'text-sky-100' : 'text-slate-500'}`}>
              Gestão de servidores MCP
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('pentest')}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left text-xs font-semibold transition-all ${
            activeTab === 'pentest'
              ? 'shadow-xs border-[#0096EB] bg-[#0096EB] text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <bds-icon
            name="lock"
            size="small"
            theme="outline"
          />
          <div className="flex flex-col">
            <span>Suíte de Pentest</span>
            <span className={`text-[10px] font-normal ${activeTab === 'pentest' ? 'text-sky-100' : 'text-slate-500'}`}>
              Auditoria de segurança
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('stress')}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left text-xs font-semibold transition-all ${
            activeTab === 'stress'
              ? 'shadow-xs border-[#0096EB] bg-[#0096EB] text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <bds-icon
            name="automation"
            size="small"
            theme={activeTab === 'stress' ? 'solid' : 'outline'}
          />
          <div className="flex flex-col">
            <span>Teste de Carga</span>
            <span className={`text-[10px] font-normal ${activeTab === 'stress' ? 'text-sky-100' : 'text-slate-500'}`}>
              Simulação de requisições
            </span>
          </div>
        </button>
      </div>
    </bds-card>
  );
};
