import type { DiscoveredMCPToolItem, MCPTransportType } from '../types/mcp';

const getProxyUrl = (serverUrl: string, proxyAttempt: number): string => {
  const encoded = encodeURIComponent(serverUrl);
  if (proxyAttempt === 1) {
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
  proxyAttempt = 0,
): Promise<{ ok: boolean; message: string; responseTimeMs: number }> => {
  const startTime = Date.now();
  const targetUrl =
    proxyAttempt === 0 ? serverUrl : getProxyUrl(serverUrl, proxyAttempt);

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
    if (
      res.ok ||
      res.status === 405 ||
      res.status === 400 ||
      res.status === 200
    ) {
      const mode = proxyAttempt > 0 ? ` (via Proxy #${proxyAttempt})` : '';
      return {
        ok: true,
        message: `Conexão bem sucedida${mode} (${res.status} ${res.statusText}) em ${responseTimeMs}ms.`,
        responseTimeMs,
      };
    }

    if (proxyAttempt > 0 && proxyAttempt < 3 && res.status === 404) {
      return await testMCPConnection(
        serverUrl,
        transportType,
        headers,
        proxyAttempt + 1,
      );
    }

    return {
      ok: false,
      message: `Servidor respondeu com status ${res.status}: ${res.statusText}`,
      responseTimeMs,
    };
  } catch (err: unknown) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage =
      err instanceof Error ? err.message : 'Servidor inacessível';
    const isCors =
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError');

    if (isCors && proxyAttempt < 3) {
      try {
        const proxyResult = await testMCPConnection(
          serverUrl,
          transportType,
          headers,
          proxyAttempt + 1,
        );
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
  proxyAttempt = 0,
): Promise<{
  ok: boolean;
  message: string;
  tools: DiscoveredMCPToolItem[];
  instructions?: string;
}> => {
  const targetUrl =
    proxyAttempt === 0 ? serverUrl : getProxyUrl(serverUrl, proxyAttempt);

  try {
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
              serverInfo?: {
                name?: string;
                version?: string;
                description?: string;
              };
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
      return await fetchMCPToolsAndInstructions(
        serverUrl,
        transportType,
        headers,
        proxyAttempt + 1,
      );
    }

    return {
      ok: false,
      message: `Status ${toolsRes.status}: ${toolsRes.statusText}`,
      tools: [],
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Erro ao consultar ferramentas';
    const isCors =
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError');

    if (isCors && proxyAttempt < 3) {
      try {
        return await fetchMCPToolsAndInstructions(
          serverUrl,
          transportType,
          headers,
          proxyAttempt + 1,
        );
      } catch {
        // Ignora erro de proxy e segue
      }
    }

    return {
      ok: false,
      message: `Erro ao obter ferramentas MCP: ${errorMessage}`,
      tools: [],
    };
  }
};
