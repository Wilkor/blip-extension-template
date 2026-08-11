export type MCPTransportType = 'streamable' | 'sse';

export interface HttpHeaderItem {
  id: string;
  key: string;
  value: string;
}

export interface DiscoveredMCPToolItem {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPTool {
  id: string;
  name: string;
  serverUrl: string;
  transportType: MCPTransportType;
  headers: Record<string, string>;
  keywords: string[];
  description: string;
  enabled: boolean;
  createdAt: string;
  instructions?: string;
  discoveredTools?: DiscoveredMCPToolItem[];
}

export interface PentestVectorDef {
  id: string;
  name: string;
  category: string;
  riskLevel: 'CRÍTICO' | 'ALTO' | 'MÉDIO';
  description: string;
  expectedResult: string;
  iconName: 'prompt' | 'sqli' | 'cmd' | 'dos' | 'schema';
}

export interface PentestExecutionResult {
  vectorId: string;
  toolId: string;
  status: 'SAFE' | 'VULNERABLE' | 'ERROR';
  responseTimeMs: number;
  details: string;
  payloadUsed: string;
  responseSnippet?: string;
  timestamp: string;
}

export interface StressTestConfig {
  concurrentRequests: number;
  totalRequests: number;
}

export interface StressTestResult {
  totalExecuted: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  rps: number;
  isExecuting: boolean;
}
