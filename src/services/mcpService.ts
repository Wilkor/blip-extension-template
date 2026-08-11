import type { DiscoveredMCPToolItem, MCPTool, MCPTransportType } from '../types/mcp';
import { getBucketData, setBucketData } from './blipService';

const STORAGE_KEY = 'mcp_analyzer_tools_v1';
const BUCKET_KEY = 'mcp_servers';

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

export const getStoredTools = async (
  contractId?: string | null,
  authorizationKey?: string | null
): Promise<MCPTool[]> => {
  // 1. Tenta buscar no Bucket do Blip (/buckets/mcp_servers)
  try {
    const bucketTools = await getBucketData<MCPTool[]>(BUCKET_KEY, contractId, authorizationKey);
    if (bucketTools && Array.isArray(bucketTools) && bucketTools.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bucketTools));
      return bucketTools;
    }
  } catch (err) {
    console.warn('Erro ao consultar Bucket do Blip:', err);
  }

  // 2. Fallback para localStorage se o Bucket não tiver dados ou falhar
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TOOLS));
      void setBucketData(BUCKET_KEY, DEFAULT_TOOLS, contractId, authorizationKey);
      return DEFAULT_TOOLS;
    }
    return JSON.parse(raw) as MCPTool[];
  } catch (err) {
    console.error('Erro ao ler ferramentas MCP do localStorage:', err);
    return DEFAULT_TOOLS;
  }
};

export const saveTools = async (
  tools: MCPTool[],
  contractId?: string | null,
  authorizationKey?: string | null
): Promise<void> => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
  } catch (err) {
    console.error('Erro ao salvar ferramentas MCP no localStorage:', err);
  }

  try {
    await setBucketData(BUCKET_KEY, tools, contractId, authorizationKey);
  } catch (err) {
    console.warn('Erro ao salvar ferramentas MCP no Bucket do Blip:', err);
  }
};

export const addTool = async (
  newToolData: Omit<MCPTool, 'id' | 'createdAt'>,
  contractId?: string | null,
  authorizationKey?: string | null
): Promise<MCPTool> => {
  const tools = await getStoredTools(contractId, authorizationKey);
  const newTool: MCPTool = {
    ...newToolData,
    id: `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newTool, ...tools];
  await saveTools(updated, contractId, authorizationKey);
  return newTool;
};

export const toggleToolEnabled = async (
  id: string,
  contractId?: string | null,
  authorizationKey?: string | null
): Promise<MCPTool[]> => {
  const tools = await getStoredTools(contractId, authorizationKey);
  const updated = tools.map((tool) =>
    tool.id === id ? { ...tool, enabled: !tool.enabled } : tool
  );
  await saveTools(updated, contractId, authorizationKey);
  return updated;
};

export const deleteTool = async (
  id: string,
  contractId?: string | null,
  authorizationKey?: string | null
): Promise<MCPTool[]> => {
  const tools = await getStoredTools(contractId, authorizationKey);
  const updated = tools.filter((tool) => tool.id !== id);
  await saveTools(updated, contractId, authorizationKey);
  return updated;
};

const getProxyUrl = (serverUrl: string, proxyAttempt: number): string => {
  const encoded = encodeURIComponent(serverUrl);
  if (proxyAttempt === 1) {
    // Proxy PHP local hospedado na Hostinger
    return `./proxy.php?url=${encoded}`;
  }
  if (proxyAttempt === 2) {
    return `https://api.allorigins.win/raw?url=${encoded}`;
  }
  return `https://corsproxy.io/?${encoded}`;
};

export const testMCPConnection = async (
  serverUrl: string,
  transportType: MCPTransportType,
  headers: Record<string, string>,
  proxyAttempt = 0
): Promise<{ ok: boolean; message: string; responseTimeMs: number }> => {
  const startTime = Date.now();
  const targetUrl = proxyAttempt === 0 ? serverUrl : getProxyUrl(serverUrl, proxyAttempt);

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
      const mode = proxyAttempt > 0 ? ` (via Proxy #${proxyAttempt})` : '';
      return {
        ok: true,
        message: `Conexão bem sucedida${mode} (${res.status} ${res.statusText}) em ${responseTimeMs}ms.`,
        responseTimeMs,
      };
    }

    // Se o proxy PHP não existir ou retornar 404 (rodando em dev local), avança para a próxima estratégia
    if (proxyAttempt > 0 && proxyAttempt < 3 && res.status === 404) {
      return await testMCPConnection(serverUrl, transportType, headers, proxyAttempt + 1);
    }

    return {
      ok: false,
      message: `Servidor respondeu com status ${res.status}: ${res.statusText}`,
      responseTimeMs,
    };
  } catch (err: unknown) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Servidor inacessível';
    const isCors = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError');

    // Tenta sequencialmente os proxies (1: PHP local Hostinger -> 2: allorigins -> 3: corsproxy)
    if (isCors && proxyAttempt < 3) {
      try {
        const proxyResult = await testMCPConnection(serverUrl, transportType, headers, proxyAttempt + 1);
        if (proxyResult.ok) {
          return proxyResult;
        }
      } catch {
        // Prossegue para a próxima tentativa ou exibe diagnóstico
      }
    }

    const diagnosticMessage = isCors
      ? `Erro de CORS / Conexão: O navegador bloqueou a requisição para "${serverUrl}". Suba o arquivo 'proxy.php' na Hostinger ou garanta que o servidor MCP aceite 'Access-Control-Allow-Origin: *'.`
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
  proxyAttempt = 0
): Promise<{
  ok: boolean;
  message: string;
  tools: DiscoveredMCPToolItem[];
  instructions?: string;
}> => {
  const targetUrl = proxyAttempt === 0 ? serverUrl : getProxyUrl(serverUrl, proxyAttempt);

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
      } catch {
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

    if (proxyAttempt > 0 && proxyAttempt < 3 && toolsRes.status === 404) {
      return await fetchMCPToolsAndInstructions(serverUrl, transportType, headers, proxyAttempt + 1);
    }

    return {
      ok: false,
      message: `Status ${toolsRes.status}: ${toolsRes.statusText}`,
      tools: [],
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erro ao consultar ferramentas';
    const isCors = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError');

    if (isCors && proxyAttempt < 3) {
      try {
        return await fetchMCPToolsAndInstructions(serverUrl, transportType, headers, proxyAttempt + 1);
      } catch {
        // Ignora erro do proxy e segue
      }
    }

    return {
      ok: false,
      message: `Erro ao obter ferramentas MCP: ${errorMessage}`,
      tools: [],
    };
  }
};
