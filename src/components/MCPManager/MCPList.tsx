import React from 'react';
import type { MCPTool } from '../../types/mcp';
import { MCPToolCard } from './MCPToolCard';

interface MCPListProps {
  tools: MCPTool[];
  onToggleEnabled: (id: string) => void;
  onDelete: (id: string) => void;
}

export const MCPList: React.FC<MCPListProps> = ({
  tools,
  onToggleEnabled,
  onDelete,
}) => {
  const activeCount = tools.filter((t) => t.enabled).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <bds-icon name="plugin" size="medium" theme="outline" />
          <span>Servidores MCP Conectados ({tools.length})</span>
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <bds-icon name="checkball" size="small" theme="solid" color="var(--color-positive)" />
            {activeCount} Ativo(s)
          </span>
          <span className="flex items-center gap-1 text-slate-600 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <bds-icon name="error" size="small" theme="solid" color="var(--color-neutral-medium)" />
            {tools.length - activeCount} Inativo(s)
          </span>
        </div>
      </div>

      {tools.length === 0 ? (
        <bds-card bg-color="surface-0" class="p-8 text-center space-y-2 border border-slate-200 rounded-xl">
          <bds-icon name="plugin" size="large" theme="outline" class="mx-auto text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">
            Nenhum servidor MCP cadastrado.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Use o formulário acima para conectar seu primeiro servidor MCP (Streamable HTTP ou SSE).
          </p>
        </bds-card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tools.map((tool) => (
            <MCPToolCard
              key={tool.id}
              tool={tool}
              onToggleEnabled={onToggleEnabled}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
