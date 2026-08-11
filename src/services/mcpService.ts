import type { DiscoveredMCPToolItem, MCPTool, MCPTransportType } from '../types/mcp';

const STORAGE_KEY = 'mcp_analyzer_tools_v1';

const DEFAULT_TOOLS: MCPTool[] = [
  {
    id: 'tia_bete_users',
    name: 'tia-bete-users',
    serverUrl: 'https://gw-wconsulting-vgj5s.5sc6y6-1.usa-e2.cloudhub.io/tia-bete/users/mcp',
    transportType: 'streamable',
    headers: {
      Authorization: 'Bearer demo-token-tia-bete',
    },
    keywords: ['usuario', 'clientes', 'contas', 'auth', 'perfil'],
    description: 'Servidor MCP de consulta e gestão de usuários Tia Bete',
    instructions: 'Instruções do Servidor: Permite consultar usuários, perfis e disparar notificações WhatsApp via endpoint post_api_v1_tia_bete_reminders_wpp.',
    discoveredTools: [
      {
        name: 'post_api_v1_tia_bete_reminders_wpp',
        description: 'Envia notificações/lembretes de mensagem WhatsApp para os usuários do sistema Tia Bete.',
        inputSchema: {
          type: 'object',
          properties: {
            phone: {
              type: 'string',
              description: 'Número do telefone WhatsApp do destinatário (ex: 5531999999999)',
            },
            message: {
              type: 'string',
              description: 'Texto/conteúdo da mensagem de lembrete a ser enviada',
            },
          },
          required: ['phone', 'message'],
        },
      },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

export const getStoredTools = (): MCPTool[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TOOLS));
      return DEFAULT_TOOLS;
    }
    return JSON.parse(raw) as MCPTool[];
  } catch (err) {
    console.error('Erro ao ler ferramentas MCP do localStorage:', err);
    return DEFAULT_TOOLS;
  }
};

export const saveTools = (tools: MCPTool[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
  } catch (err) {
    console.error('Erro ao salvar ferramentas MCP no localStorage:', err);
  }
};

export const addTool = (newToolData: Omit<MCPTool, 'id' | 'createdAt'>): MCPTool => {
  const tools = getStoredTools();
  const newTool: MCPTool = {
    ...newToolData,
    id: `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newTool, ...tools];
  saveTools(updated);
  return newTool;
};

export const toggleToolEnabled = (id: string): MCPTool[] => {
  const tools = getStoredTools();
  const updated = tools.map((tool) =>
    tool.id === id ? { ...tool, enabled: !tool.enabled } : tool
  );
  saveTools(updated);
  return updated;
};

export const deleteTool = (id: string): MCPTool[] => {
  const tools = getStoredTools();
  const updated = tools.filter((tool) => tool.id !== id);
  saveTools(updated);
  return updated;
};

export const testMCPConnection = async (
  serverUrl: string,
  transportType: MCPTransportType,
  headers: Record<string, string>,
  isRetryViaProxy = false
): Promise<{ ok: boolean; message: string; responseTimeMs: number }> => {
  const startTime = Date.now();
  const targetUrl = isRetryViaProxy
    ? `https://corsproxy.io/?${encodeURIComponent(serverUrl)}`
    : serverUrl;

  try {
    const res = await fetch(targetUrl, {
      method: transportType === 'streamable' ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body:
        transportType === 'streamable'
          ? JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 })
          : undefined,
    });

    const responseTimeMs = Date.now() - startTime;
    if (res.ok || res.status === 405 || res.status === 400 || res.status === 200) {
      return {
        ok: true,
        message: `Conexão bem sucedida${isRetryViaProxy ? ' (via CORS Proxy)' : ''} (${res.status} ${res.statusText}) em ${responseTimeMs}ms.`,
        responseTimeMs,
      };
    }
    return {
      ok: false,
      message: `Servidor respondeu com status ${res.status}: ${res.statusText}`,
      responseTimeMs,
    };
  } catch (err: unknown) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Servidor inacessível';

    // Se falhou diretamente por erro de rede/CORS ("Failed to fetch"), tenta via CORS Proxy automaticamente
    if (!isRetryViaProxy && (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError'))) {
      try {
        const proxyResult = await testMCPConnection(serverUrl, transportType, headers, true);
        if (proxyResult.ok) {
          return proxyResult;
        }
      } catch (proxyErr) {
        // Se o proxy falhar, prossegue com diagnóstico de CORS
      }
    }

    const isCors = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError');
    const diagnosticMessage = isCors
      ? `Erro de CORS / Conexão: O navegador bloqueou a requisição para "${serverUrl}". O servidor MCP remoto precisa aceitar requisições cross-origin retornando os cabeçalhos 'Access-Control-Allow-Origin: *' e 'Access-Control-Allow-Headers: Content-Type, Authorization'.`
      : `Erro de conexão: ${errorMessage}`;

    return {
      ok: false,
      message: diagnosticMessage,
      responseTimeMs,
    };
  }
};

export const fetchMCPToolsAndInstructions = async (
  serverUrl: string,
  transportType: MCPTransportType,
  headers: Record<string, string>,
  isRetryViaProxy = false
): Promise<{
  ok: boolean;
  message: string;
  tools: DiscoveredMCPToolItem[];
  instructions?: string;
}> => {
  const targetUrl = isRetryViaProxy
    ? `https://corsproxy.io/?${encodeURIComponent(serverUrl)}`
    : serverUrl;

  try {
    // 1. Consulta lista de ferramentas via tools/list
    const toolsRes = await fetch(targetUrl, {
      method: transportType === 'streamable' ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body:
        transportType === 'streamable'
          ? JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 })
          : undefined,
    });

    let extractedTools: DiscoveredMCPToolItem[] = [];
    let extractedInstructions: string | undefined;

    if (toolsRes.ok) {
      const data = (await toolsRes.json()) as {
        result?: {
          tools?: DiscoveredMCPToolItem[];
          instructions?: string;
        };
        tools?: DiscoveredMCPToolItem[];
        instructions?: string;
      };

      extractedTools = data.result?.tools || data.tools || [];
      extractedInstructions = data.result?.instructions || data.instructions;
    }

    // 2. Se instructions não vieram no tools/list, consulta o método initialize
    if (!extractedInstructions && transportType === 'streamable') {
      try {
        const initRes = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'mcp-analyzer', version: '1.0.0' },
            },
            id: 2,
          }),
        });

        if (initRes.ok) {
          const initData = (await initRes.json()) as {
            result?: {
              instructions?: string;
              serverInfo?: { name?: string; version?: string; description?: string };
            };
            instructions?: string;
          };

          extractedInstructions =
            initData.result?.instructions ||
            initData.instructions ||
            (initData.result?.serverInfo?.description
              ? `Servidor: ${initData.result.serverInfo.name || ''} - ${initData.result.serverInfo.description}`
              : undefined);
        }
      } catch (initErr) {
        // Ignora erro de initialize
      }
    }

    if (extractedTools.length > 0 || extractedInstructions || toolsRes.ok) {
      return {
        ok: true,
        message: `${extractedTools.length} ferramenta(s) obtida(s) com sucesso.`,
        tools: extractedTools,
        instructions: extractedInstructions,
      };
    }

    return {
      ok: false,
      message: `Status ${toolsRes.status}: ${toolsRes.statusText}`,
      tools: [],
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erro ao consultar ferramentas';

    if (!isRetryViaProxy && (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError'))) {
      try {
        return await fetchMCPToolsAndInstructions(serverUrl, transportType, headers, true);
      } catch (proxyErr) {
        // Ignora erro do proxy
      }
    }

    return {
      ok: false,
      message: `Erro ao obter ferramentas MCP: ${errorMessage}`,
      tools: [],
    };
  }
};
