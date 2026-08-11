import { useState, type FC } from 'react';
import type { DiscoveredMCPToolItem, HttpHeaderItem, MCPTool, MCPTransportType } from '../../types/mcp';
import { fetchMCPToolsAndInstructions, testMCPConnection } from '../../services/mcpService';
import { MCPHeaderInputGroup } from './MCPHeaderInputGroup';

interface ParsedServerItem {
  serverUrl?: string;
  url?: string;
  headers?: Record<string, string>;
  transportType?: MCPTransportType;
}

interface MCPRegistrationCardProps {
  onToolAdded: (toolData: Omit<MCPTool, 'id' | 'createdAt'>) => MCPTool | Promise<MCPTool>;
}

export const MCPRegistrationCard: FC<MCPRegistrationCardProps> = ({ onToolAdded }) => {
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [transportType, setTransportType] = useState<MCPTransportType>('streamable');
  const [headers, setHeaders] = useState<HttpHeaderItem[]>([]);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleAddHeader = () => {
    setHeaders((prev) => [...prev, { id: Date.now().toString(), key: '', value: '' }]);
  };

  const handleRemoveHeader = (id: string) => {
    setHeaders((prev) => prev.filter((h) => h.id !== id));
  };

  const handleHeaderChange = (id: string, field: 'key' | 'value', text: string) => {
    setHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: text } : h))
    );
  };

  const getHeadersMap = (): Record<string, string> => {
    const map: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim() && h.value.trim()) {
        map[h.key.trim()] = h.value.trim();
      }
    });
    return map;
  };

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) {
      setFeedback({ type: 'error', message: 'Preencha a URL do Servidor MCP para testar.' });
      return;
    }
    setTesting(true);
    setFeedback({ type: 'info', message: 'Testando comunicação e buscando ferramentas (tools/list)...' });
    const res = await testMCPConnection(serverUrl, transportType, getHeadersMap());
    const toolsRes: { ok: boolean; message: string; tools: DiscoveredMCPToolItem[]; instructions?: string } =
      await fetchMCPToolsAndInstructions(serverUrl, transportType, getHeadersMap());
    setTesting(false);

    if (res.ok) {
      const rawTools: unknown[] = Array.isArray(toolsRes.tools) ? toolsRes.tools : [];
      const namesList: string[] = [];
      for (const item of rawTools) {
        if (item && typeof item === 'object' && 'name' in item) {
          const nameVal = (item as { name: unknown }).name;
          if (typeof nameVal === 'string' && nameVal.trim().length > 0) {
            namesList.push(nameVal);
          }
        }
      }
      const toolNames = namesList.join(', ');
      const toolMsg = toolNames ? ` | Ferramentas: [${toolNames}]` : '';
      setFeedback({ type: 'success', message: `[OK] ${res.message}${toolMsg}` });
    } else {
      setFeedback({ type: 'error', message: `[ERRO] ${res.message}` });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !serverUrl.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o Nome e a URL do servidor MCP.' });
      return;
    }

    setFeedback({ type: 'info', message: 'Consultando ferramentas e instruções do servidor MCP...' });

    // Busca automaticamente as ferramentas e instruções do servidor MCP no momento do cadastro
    const serverDetails = await fetchMCPToolsAndInstructions(
      serverUrl.trim(),
      transportType,
      getHeadersMap()
    );

    const keywordList = [name.trim().toLowerCase()];

    const createdTool = await onToolAdded({
      name: name.trim(),
      serverUrl: serverUrl.trim(),
      transportType,
      headers: getHeadersMap(),
      keywords: keywordList,
      description: serverDetails.instructions || 'Servidor MCP conectado no Blip',
      instructions: serverDetails.instructions,
      discoveredTools: serverDetails.tools,
      enabled: true,
    });

    const toolsCount = serverDetails.tools.length;
    setFeedback({
      type: 'success',
      message: `Servidor MCP '${createdTool.name}' conectado! ${toolsCount > 0 ? `${toolsCount} ferramenta(s) identificada(s).` : 'Conexão concluída.'}`,
    });
    setName('');
    setServerUrl('');
  };

  const handleImportJson = () => {
    try {
      const parsed: unknown = JSON.parse(jsonInput);
      if (parsed && typeof parsed === 'object') {
        let serverKey = '';
        let serverData: ParsedServerItem | null = null;

        const obj = parsed as Record<string, unknown>;

        if ('mcpServers' in obj && obj.mcpServers && typeof obj.mcpServers === 'object') {
          const servers = obj.mcpServers as Record<string, unknown>;
          const keys = Object.keys(servers);
          if (keys.length > 0) {
            serverKey = keys[0];
            serverData = servers[serverKey] as ParsedServerItem;
          }
        } else if ('serverUrl' in obj || 'url' in obj) {
          serverKey = typeof obj.name === 'string' ? obj.name : 'servidor_mcp';
          serverData = obj as ParsedServerItem;
        }

        if (serverData) {
          setName(serverKey || 'mcp_server');
          const targetUrl = serverData.serverUrl || serverData.url || '';
          setServerUrl(targetUrl);

          if (serverData.headers && typeof serverData.headers === 'object') {
            const newHeaders: HttpHeaderItem[] = Object.entries(serverData.headers).map(([k, v], idx) => ({
              id: (idx + 1).toString(),
              key: k,
              value: String(v),
            }));
            setHeaders(newHeaders);
          }

          if (serverData.transportType) {
            setTransportType(serverData.transportType);
          }

          setFeedback({
            type: 'success',
            message: `JSON importado com sucesso! Dados preenchidos para '${serverKey}'.`,
          });
          setShowJsonImport(false);
          setJsonInput('');
          return;
        }
      }
      setFeedback({
        type: 'error',
        message: 'Formato JSON não reconhecido. Use o padrão mcpServers ou { name, serverUrl }.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'JSON inválido. Verifique a sintaxe.',
      });
    }
  };

  const renderBannerVariant = (type: 'success' | 'error' | 'info') => {
    if (type === 'success') return 'success';
    if (type === 'error') return 'error';
    return 'info';
  };

  return (
    <bds-card bg-color="surface-0" class="space-y-6 rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#0096EB]/10 p-2 text-[#0096EB]">
            <bds-icon name="add" size="medium" theme="outline" />
          </div>
          <h2 className="text-base font-bold tracking-wide text-slate-800">
            CONECTAR MCP
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <bds-button
            variant="secondary"
            size="short"
            onClick={() => setShowJsonImport(!showJsonImport)}
            icon="code"
          >
            {showJsonImport ? 'Formulário' : 'Importar JSON'}
          </bds-button>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            Model Context Protocol
          </span>
        </div>
      </div>

      {showJsonImport ? <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            IMPORTAR CONFIGURAÇÃO JSON (mcpServers)
          </h3>
          <p className="text-xs text-slate-500">
            Cole abaixo o JSON de configuração do seu servidor MCP (compatível com Cursor, VS Code e Claude Desktop):
          </p>
          <textarea
            rows={5}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`{\n  "mcpServers": {\n    "tia-bete-users": {\n      "serverUrl": "https://gw-wconsulting-vgj5s.5sc6y6-1.usa-e2.cloudhub.io/teste/users/mcp"\n    }\n  }\n}`}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-800 focus:border-[#0096EB] focus:outline-none"
          />
          <div className="flex justify-end">
            <bds-button
              variant="primary"
              size="short"
              onClick={handleImportJson}
              icon="check"
            >
              Carregar Dados do JSON
            </bds-button>
          </div>
        </div> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* DADOS DE CONEXAO */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            DADOS DE CONEXÃO
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="mcp-name-input" className="mb-1 block text-xs font-semibold text-slate-700">
                Nome *
              </label>
              <input
                id="mcp-name-input"
                type="text"
                placeholder="Ex. servidor_principal_mcp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-800 focus:border-[#0096EB] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="mcp-url-input" className="mb-1 block text-xs font-semibold text-slate-700">
                URL *
              </label>
              <input
                id="mcp-url-input"
                type="text"
                placeholder="Ex.: https://gw-wconsulting-vgj5s.5sc6y6-1.usa-e2.cloudhub.io/tia-bete/users/mcp"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-800 focus:border-[#0096EB] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* PROTOCOLO DE TRANSPORTE */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            PROTOCOLO DE TRANSPORTE
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                transportType === 'streamable'
                  ? 'border-[#0096EB] bg-[#0096EB]/10 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <input
                id="transport-streamable"
                type="radio"
                name="transport"
                checked={transportType === 'streamable'}
                onChange={() => setTransportType('streamable')}
                className="mt-1 accent-[#0096EB]"
              />
              <label htmlFor="transport-streamable" className="cursor-pointer text-xs font-bold">
                Streamable HTTP
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                  Transmite dados em blocos contínuos por meio de uma única requisição HTTP.
                </span>
              </label>
            </div>

            <div
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                transportType === 'sse'
                  ? 'border-[#0096EB] bg-[#0096EB]/10 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <input
                id="transport-sse"
                type="radio"
                name="transport"
                checked={transportType === 'sse'}
                onChange={() => setTransportType('sse')}
                className="mt-1 accent-[#0096EB]"
              />
              <label htmlFor="transport-sse" className="cursor-pointer text-xs font-bold">
                SSE (Server-Sent Events)
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                  Envia atualizações automaticamente ao cliente por uma conexão HTTP persistente.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* CABECALHOS DE AUTENTICACAO */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <MCPHeaderInputGroup
            headers={headers}
            onAddHeader={handleAddHeader}
            onRemoveHeader={handleRemoveHeader}
            onHeaderChange={handleHeaderChange}
          />
        </div>

{feedback ? <bds-banner variant={renderBannerVariant(feedback.type)}>
            {feedback.message}
          </bds-banner> : null}
        <div className="flex items-center justify-end gap-3 pt-2">
          <bds-button
            variant="secondary"
            size="standard"
            onClick={() => { void handleTestConnection(); }}
            disabled={testing}
            icon="send"
          >
            {testing ? 'Testando...' : 'Testar Conexão MCP'}
          </bds-button>
          <bds-button
            variant="primary"
            size="standard"
            type="submit"
            icon="add"
          >
            Salvar & Conectar
          </bds-button>
        </div>
      </form>
    </bds-card>
  );
};
