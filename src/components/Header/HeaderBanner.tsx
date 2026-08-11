import React from 'react';
import type { BlipContext } from '../../types/blip';

interface HeaderBannerProps {
  blipContext: BlipContext;
  onRefresh: () => void;
  loading: boolean;
  toolCount: number;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  blipContext,
  onRefresh,
  loading,
  toolCount,
}) => {
  const botName = blipContext.application?.shortName || 'Bot Local';
  const userName = blipContext.user?.fullName || blipContext.user?.email || 'Usuário Blip';

  return (
    <bds-card bg-color="surface-1" class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center rounded-xl border border-[#0096EB]/20 bg-[#0096EB]/10 p-3 text-[#0096EB]">
          <bds-icon name="plugin" size="medium" theme="outline" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800">
              MCP Analyzer
            </h1>
            {/* <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0096EB] text-white font-semibold">
              Blip Extension
            </span> */}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Cadastre, audite resiliência (Pentest) e meça performance (Carga) de servidores MCP.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden flex-col rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-right text-xs text-slate-600 md:flex">
          <span className="flex items-center justify-end gap-1.5 font-semibold text-slate-800">
            <bds-icon name="robot" size="small" theme="outline" />
            <span>{botName}</span>
          </span>
          <span className="flex items-center justify-end gap-1 text-[11px] text-slate-500">
            <bds-icon name="user-default" size="small" theme="outline" />
            <span>{userName}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
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
          {loading ? 'Carregando...' : 'Atualizar'}
        </bds-button>
      </div>
    </bds-card>
  );
};
