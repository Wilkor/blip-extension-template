import React from 'react';
import type { HttpHeaderItem } from '../../types/mcp';

interface MCPHeaderInputGroupProps {
  headers: HttpHeaderItem[];
  onAddHeader: () => void;
  onRemoveHeader: (id: string) => void;
  onHeaderChange: (id: string, field: 'key' | 'value', text: string) => void;
}

export const MCPHeaderInputGroup: React.FC<MCPHeaderInputGroupProps> = ({
  headers,
  onAddHeader,
  onRemoveHeader,
  onHeaderChange,
}) => {
  return (
    <div className="space-y-3">
      <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        Cabeçalhos de Autenticação HTTP
      </span>

      {headers.length === 0 ? (
        <p className="text-xs text-slate-500 italic">
          Nenhum cabeçalho configurado. Adicione se o servidor MCP exigir autenticação.
        </p>
      ) : (
        headers.map((header) => (
          <div key={header.id} className="flex items-center gap-2">
            <div className="flex-1">
              <label htmlFor={`header-key-${header.id}`} className="sr-only">
                Nome do Cabeçalho
              </label>
              <input
                id={`header-key-${header.id}`}
                type="text"
                placeholder="Cabeçalho (Ex: Authorization)"
                value={header.key}
                onChange={(e) => onHeaderChange(header.id, 'key', e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#0096EB]"
              />
            </div>
            <div className="flex-1">
              <label htmlFor={`header-val-${header.id}`} className="sr-only">
                Valor do Cabeçalho
              </label>
              <input
                id={`header-val-${header.id}`}
                type="text"
                placeholder="Valor (Ex: Bearer token...)"
                value={header.value}
                onChange={(e) => onHeaderChange(header.id, 'value', e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#0096EB]"
              />
            </div>
            <bds-button
              variant="tertiary"
              size="short"
              icon="delete"
              onClick={() => onRemoveHeader(header.id)}
            />
          </div>
        ))
      )}

      <bds-button
        variant="secondary"
        size="short"
        icon="add"
        onClick={onAddHeader}
      >
        Adicionar cabeçalho
      </bds-button>
    </div>
  );
};
