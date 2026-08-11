import type { MCPTool } from '../types/mcp';
import { getBucketData, setBucketData } from './blipService';

const STORAGE_KEY = 'mcp_analyzer_tools_v1';
const BUCKET_KEY = 'mcp_servers';

export const DEFAULT_TOOLS: MCPTool[] = [
  {
    id: 'tia_bete_users',
    name: 'tia-bete-users',
    serverUrl:
      'https://gw-wconsulting-vgj5s.5sc6y6-1.usa-e2.cloudhub.io/tia-bete/users/mcp',
    transportType: 'streamable',
    headers: {
      Authorization: 'Bearer demo-token-tia-bete',
    },
    keywords: ['usuario', 'clientes', 'contas', 'auth', 'perfil'],
    description: 'Servidor MCP de consulta e gestão de usuários Tia Bete',
    instructions:
      'Instruções do Servidor: Permite consultar usuários, perfis e disparar notificações WhatsApp via endpoint post_api_v1_tia_bete_reminders_wpp.',
    discoveredTools: [
      {
        name: 'post_api_v1_tia_bete_reminders_wpp',
        description:
          'Envia notificações/lembretes de mensagem WhatsApp para os usuários do sistema Tia Bete.',
        inputSchema: {
          type: 'object',
          properties: {
            phone: {
              type: 'string',
              description:
                'Número do telefone WhatsApp do destinatário (ex: 5531999999999)',
            },
            message: {
              type: 'string',
              description:
                'Texto/conteúdo da mensagem de lembrete a ser enviada',
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
  authorizationKey?: string | null,
): Promise<MCPTool[]> => {
  // 1. Tenta buscar prioritariamente no Bucket do Blip (/buckets/mcp_servers)
  try {
    const bucketTools = await getBucketData<MCPTool[]>(
      BUCKET_KEY,
      contractId,
      authorizationKey,
    );
    if (bucketTools && Array.isArray(bucketTools)) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bucketTools));
      } catch (err) {
        console.warn('Erro ao atualizar cache de localStorage:', err);
      }
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
      void setBucketData(
        BUCKET_KEY,
        DEFAULT_TOOLS,
        contractId,
        authorizationKey,
      );
      return DEFAULT_TOOLS;
    }
    const parsed = JSON.parse(raw) as MCPTool[];
    void setBucketData(BUCKET_KEY, parsed, contractId, authorizationKey);
    return parsed;
  } catch (err) {
    console.error('Erro ao ler ferramentas MCP do localStorage:', err);
    return DEFAULT_TOOLS;
  }
};

export const saveTools = async (
  tools: MCPTool[],
  contractId?: string | null,
  authorizationKey?: string | null,
): Promise<void> => {
  // 1. Salva no Bucket do Blip (/buckets/mcp_servers)
  try {
    await setBucketData(BUCKET_KEY, tools, contractId, authorizationKey);
  } catch (err) {
    console.warn('Erro ao salvar ferramentas MCP no Bucket do Blip:', err);
  }

  // 2. Salva no localStorage como cache local / fallback
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
  } catch (err) {
    console.error('Erro ao salvar ferramentas MCP no localStorage:', err);
  }
};

export const addTool = async (
  newToolData: Omit<MCPTool, 'id' | 'createdAt'>,
  currentTools?: MCPTool[],
  contractId?: string | null,
  authorizationKey?: string | null,
): Promise<MCPTool> => {
  const tools =
    currentTools && currentTools.length >= 0
      ? currentTools
      : await getStoredTools(contractId, authorizationKey);
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
  currentTools?: MCPTool[],
  contractId?: string | null,
  authorizationKey?: string | null,
): Promise<MCPTool[]> => {
  const tools =
    currentTools && currentTools.length >= 0
      ? currentTools
      : await getStoredTools(contractId, authorizationKey);
  const updated = tools.map((tool) =>
    tool.id === id ? { ...tool, enabled: !tool.enabled } : tool,
  );
  await saveTools(updated, contractId, authorizationKey);
  return updated;
};

export const deleteTool = async (
  id: string,
  currentTools?: MCPTool[],
  contractId?: string | null,
  authorizationKey?: string | null,
): Promise<MCPTool[]> => {
  const tools =
    currentTools && currentTools.length >= 0
      ? currentTools
      : await getStoredTools(contractId, authorizationKey);
  const updated = tools.filter((tool) => tool.id !== id);
  await saveTools(updated, contractId, authorizationKey);
  return updated;
};
