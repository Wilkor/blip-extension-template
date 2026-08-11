import { useState, type FC } from 'react';
import type { DiscoveredMCPToolItem } from '../../types/mcp';

interface MCPToolSchemaViewProps {
  tools: DiscoveredMCPToolItem[];
}

interface ParsedProperty {
  keyPath: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

export const MCPToolSchemaView: FC<MCPToolSchemaViewProps> = ({ tools }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [rawSchemaTool, setRawSchemaTool] = useState<string | null>(null);

  if (!Array.isArray(tools) || tools.length === 0) {
    return (
      <p className="text-[11px] italic text-slate-500">
        Nenhuma ferramenta listada. Clique em &quot;Obter Tools / Instruções&quot; para consultar via JSON-RPC (`tools/list`).
      </p>
    );
  }

  /**
   * Constrói recursivamente o exemplo de argumentos a partir do inputSchema genérico
   */
  const buildGenericSampleArguments = (schema: unknown): unknown => {
    if (!schema || typeof schema !== 'object') {
      return {};
    }

    const sch = schema as Record<string, unknown>;

    if (sch.default !== undefined) {
      return sch.default;
    }

    if (Array.isArray(sch.enum) && sch.enum.length > 0) {
      return sch.enum[0];
    }

    const typeStr = typeof sch.type === 'string' ? sch.type : 'object';

    if (typeStr === 'string') {
      if (sch.format === 'email') return 'usuario@exemplo.com';
      if (sch.format === 'date' || sch.format === 'date-time') return new Date().toISOString();
      if (sch.format === 'uri' || sch.format === 'url') return 'https://exemplo.com';
      return sch.title ? `exemplo_${String(sch.title).toLowerCase()}` : 'exemplo_texto';
    }

    if (typeStr === 'number' || typeStr === 'integer') {
      return typeof sch.minimum === 'number' ? sch.minimum : 123;
    }

    if (typeStr === 'boolean') {
      return true;
    }

    if (typeStr === 'array') {
      const itemsSchema = sch.items;
      if (itemsSchema) {
        return [buildGenericSampleArguments(itemsSchema)];
      }
      return ['item_1', 'item_2'];
    }

    // Se for objeto ou contiver 'properties'
    const props = sch.properties && typeof sch.properties === 'object'
      ? (sch.properties as Record<string, unknown>)
      : null;

    if (props) {
      const objResult: Record<string, unknown> = {};
      Object.entries(props).forEach(([key, subSch]) => {
        objResult[key] = buildGenericSampleArguments(subSch);
      });
      return objResult;
    }

    return {};
  };

  /**
   * Extrai propriedades em formato plano de forma genérica (incluindo objetos aninhados)
   */
  const parseGenericProperties = (
    schema: unknown,
    prefix = '',
    requiredFields: string[] = []
  ): ParsedProperty[] => {
    if (!schema || typeof schema !== 'object') return [];

    const sch = schema as Record<string, unknown>;
    const currentRequired = Array.isArray(sch.required) ? (sch.required as string[]) : requiredFields;
    const props = sch.properties && typeof sch.properties === 'object'
      ? (sch.properties as Record<string, Record<string, unknown>>)
      : null;

    if (!props) return [];

    const list: ParsedProperty[] = [];

    Object.entries(props).forEach(([key, val]) => {
      const fieldPath = prefix ? `${prefix}.${key}` : key;

      let valType = 'any';
      if (typeof val.type === 'string') {
        valType = val.type;
      } else if (Array.isArray(val.enum)) {
        valType = 'enum';
      }

      const valDesc = typeof val.description === 'string' ? val.description : '';
      const isRequired = currentRequired.includes(key);

      const typeLabel = Array.isArray(val.enum)
        ? `enum (${(val.enum as unknown[]).join(' | ')})`
        : valType;

      list.push({
        keyPath: fieldPath,
        type: typeLabel,
        description: valDesc || (val.default !== undefined ? `Padrão: ${JSON.stringify(val.default)}` : 'Sem descrição'),
        required: isRequired,
        defaultValue: val.default,
      });

      // Se houver sub-propriedades (objeto aninhado)
      if (val.properties && typeof val.properties === 'object') {
        const subRequired = Array.isArray(val.required) ? (val.required as string[]) : [];
        const subList = parseGenericProperties(val, fieldPath, subRequired);
        list.push(...subList);
      }
    });

    return list;
  };

  const handleCopyPayload = (text: string, index: number) => {
    void navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
      {(tools as { name: string; description?: string; inputSchema?: Record<string, unknown> }[]).map((rawToolItem, index: number) => {
        const toolName = rawToolItem.name;
        const toolDescription = rawToolItem.description;
        const toolInputSchema = rawToolItem.inputSchema;

        const properties = parseGenericProperties(toolInputSchema);
        const sampleArgs = buildGenericSampleArguments(toolInputSchema);

        const sampleJsonRPC = JSON.stringify(
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: toolName,
              arguments: sampleArgs,
            },
          },
          null,
          2
        );

        const rawSchemaJson = toolInputSchema
          ? JSON.stringify(toolInputSchema, null, 2)
          : '{}';

        const isShowingRaw = rawSchemaTool === toolName;

        return (
          <div
            key={`tool-item-${toolName}`}
            className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm"
          >
            {/* Nome e Descrição da Ferramenta */}
            <div>
              <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
                <span className="font-mono text-xs text-[#0096EB]">
                  &gt; {toolName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-500">
                    {properties.length} parâmetro(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => setRawSchemaTool(isShowingRaw ? null : toolName)}
                    className="cursor-pointer rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-slate-900"
                  >
                    {isShowingRaw ? 'Ver Payload' : 'Ver Schema Raw'}
                  </button>
                </div>
              </div>
              {Boolean(toolDescription) && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                  {toolDescription}
                </p>
              )}
            </div>

            {/* Renderização do Schema Raw (se selecionado) */}
            {isShowingRaw ? (
              <div className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  JSON Schema Original (Retorno do Servidor MCP):
                </span>
                <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900 p-2.5 font-mono text-[10px] leading-tight text-emerald-400">
                  {rawSchemaJson}
                </pre>
              </div>
            ) : (
              <>
                {/* Tabela de Propriedades Parsed */}
                {properties.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Parâmetros Identificados (inputSchema):
                    </span>
                    <div className="divide-y divide-slate-100 rounded-md border border-slate-100 bg-slate-50/50">
                      {properties.map((prop) => (
                        <div
                          key={`prop-${toolName}-${prop.keyPath}`}
                          className="flex flex-col justify-between gap-1 p-2 text-[11px] sm:flex-row sm:items-center"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-slate-800">
                              {prop.keyPath}
                            </span>
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[9px] text-slate-700">
                              {prop.type}
                            </span>
                            {prop.required ? (
                              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                                Obrigatório
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">
                                Opcional
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] italic text-slate-500 sm:text-right">
                            {prop.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="rounded border border-slate-100 bg-slate-50 p-2 text-[10px] italic text-slate-500">
                    Nenhum parâmetro declarado no `inputSchema`.
                  </p>
                )}

                {/* Exemplo de Chamada JSON-RPC (tools/call) */}
                <div className="pt-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Exemplo de Payload (`tools/call`):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPayload(sampleJsonRPC, index)}
                      className="cursor-pointer rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-[#0096EB] transition-all hover:bg-sky-100"
                    >
                      {copiedIndex === index ? '✓ Copiado!' : 'Copiar Payload'}
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900 p-2.5 font-mono text-[10px] leading-tight text-slate-100">
                    {sampleJsonRPC}
                  </pre>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
