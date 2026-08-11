import { useEffect, useState, type FC } from 'react';
import type { DiscoveredMCPToolItem, MCPTool } from '../../types/mcp';
import { fetchMCPToolsAndInstructions } from '../../services/mcpService';
import { MCPToolSchemaView } from './MCPToolSchemaView';

interface MCPToolCardProps {
  tool: MCPTool;
  onToggleEnabled: (id: string) => void;
  onDelete: (id: string) => void;
}

export const MCPToolCard: FC<MCPToolCardProps> = ({
  tool,
  onToggleEnabled,
  onDelete,
}) => {
  const rawDiscoveredTools: DiscoveredMCPToolItem[] = Array.isArray(tool.discoveredTools)
    ? (tool.discoveredTools as unknown as DiscoveredMCPToolItem[])
    : [];
  const rawInstructions: string = typeof tool.instructions === 'string'
    ? (tool.instructions as unknown as string)
    : '';

  const [expanded, setExpanded] = useState(false);
  const [loadingTools, setLoadingTools] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [discoveredTools, setDiscoveredTools] = useState<DiscoveredMCPToolItem[]>(rawDiscoveredTools);
  const [instructions, setInstructions] = useState<string>(rawInstructions);
  const headerKeys = Object.keys(tool.headers);

  const handleFetchServerDetails = async () => {
    setLoadingTools(true);
    const res = await fetchMCPToolsAndInstructions(
      tool.serverUrl,
      tool.transportType,
      tool.headers
    );
    setLoadingTools(false);
    if (res.ok) {
      setDiscoveredTools(res.tools);
      if (res.instructions) {
        setInstructions(res.instructions);
      }
    }
  };

  useEffect(() => {
    const toolsArr: DiscoveredMCPToolItem[] = Array.isArray(tool.discoveredTools)
      ? (tool.discoveredTools as unknown as DiscoveredMCPToolItem[])
      : [];
    const instStr: string = typeof tool.instructions === 'string'
      ? (tool.instructions as unknown as string)
      : '';
    if (toolsArr.length === 0 && instStr.length === 0) {
      void handleFetchServerDetails();
    }
  }, [tool.id]);

  return (
    <bds-card bg-color="surface-0" class="p-5 border border-slate-200 rounded-xl space-y-4 shadow-sm hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#0096EB]/10 p-2.5 rounded-xl text-[#0096EB] border border-[#0096EB]/20">
            <bds-icon name="plugin" size="medium" theme="outline" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">{tool.name}</h3>
              <bds-chip variant="default" class="text-[10px]">
                {tool.transportType === 'streamable' ? 'Streamable HTTP' : 'SSE'}
              </bds-chip>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 break-all">
              <bds-icon name="link" size="small" theme="outline" />
              <span>{tool.serverUrl}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <bds-button
            variant={tool.enabled ? 'secondary' : 'tertiary'}
            size="short"
            onClick={() => onToggleEnabled(tool.id)}
            icon="toggle"
          >
            {tool.enabled ? 'Ativo' : 'Inativo'}
          </bds-button>

          <bds-button
            variant="delete"
            size="short"
            onClick={() => setShowDeleteAlert(true)}
            icon="trash"
          />
        </div>
      </div>

      {/* Confirmação de exclusão */}
      {showDeleteAlert && (
        <bds-alert open={true}>
          <bds-alert-header variant="delete" icon="trash">
            Excluir servidor MCP?
          </bds-alert-header>
          <bds-alert-body>
            Tem certeza que deseja remover o servidor <strong>{tool.name}</strong>? Esta ação não pode ser desfeita.
          </bds-alert-body>
          <bds-alert-actions>
            <bds-button variant="tertiary" onClick={() => setShowDeleteAlert(false)}>
              Cancelar
            </bds-button>
            <bds-button
              variant="delete"
              onClick={() => {
                setShowDeleteAlert(false);
                onDelete(tool.id);
              }}
            >
              Excluir
            </bds-button>
          </bds-alert-actions>
        </bds-alert>
      )}

      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
        {tool.description || 'Sem descrição cadastrada.'}
      </p>

      {/* Instructions if available */}
      {instructions && (
        <div className="bg-sky-50 p-3 rounded-lg border border-sky-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-sky-900">
            <bds-icon name="info" size="small" theme="solid" />
            <span>Instruções do Servidor MCP:</span>
          </div>
          <p className="text-[11px] text-sky-800 leading-relaxed">{instructions}</p>
        </div>
      )}

      {/* Keywords & Expand Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <bds-icon name="tag" size="small" theme="outline" />
          {tool.keywords.map((kw) => (
            <bds-chip key={`${tool.id}-kw-${kw}`} variant="default">
              {kw}
            </bds-chip>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <bds-button
            variant="secondary"
            size="short"
            onClick={handleFetchServerDetails}
            disabled={loadingTools}
            icon="refresh"
          >
            {loadingTools ? 'Carregando...' : 'Obter Tools / Instruções'}
          </bds-button>

          <bds-button
            variant="tertiary"
            size="short"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Ocultar Detalhes' : 'Ver Detalhes'}
          </bds-button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-3 mt-2">
          {/* Header section */}
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
              <bds-icon name="lock" size="small" theme="outline" />
              <span>Cabeçalhos de Autenticação ({headerKeys.length}):</span>
            </div>
            {headerKeys.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">Nenhum cabeçalho HTTP configurado.</p>
            ) : (
              <div className="space-y-1">
                {headerKeys.map((key) => (
                  <div key={`${tool.id}-header-${key}`} className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1 rounded border border-slate-200">
                    <span className="font-mono text-[#0096EB]">{key}</span>
                    <span className="font-mono text-slate-600 truncate max-w-[250px]">
                      {tool.headers[key]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discovered Tools List */}
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-2">
              <bds-icon name="plugin" size="small" theme="outline" />
              <span>Ferramentas & Payloads Encontrados ({discoveredTools.length}):</span>
            </div>
            <MCPToolSchemaView tools={discoveredTools} />
          </div>
        </div>
      )}
    </bds-card>
  );
};
