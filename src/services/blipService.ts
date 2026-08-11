import { IframeMessageProxy } from 'iframe-message-proxy';
import type { BlipApplication, BlipLoggedUser } from '../types/blip';

let initialized = false;

export const initBlipProxy = (): void => {
  if (!initialized) {
    try {
      IframeMessageProxy.listen();
      initialized = true;
    } catch (err) {
      console.warn('IframeMessageProxy listen error:', err);
    }
  }
};

export const getApplication = async (): Promise<BlipApplication | null> => {
  try {
    initBlipProxy();
    const { response: application } = await IframeMessageProxy.sendMessage({
      action: 'getApplication',
    });

    console.log(application)
    return application as BlipApplication;
  } catch (err) {
    console.warn('Falha ao obter dados da aplicação Blip via iframe proxy:', err);
    return null;
  }
};

export const getLoggedUser = async (): Promise<BlipLoggedUser | null> => {
  try {
    initBlipProxy();
    const { response } = await IframeMessageProxy.sendMessage({
      action: 'sendCommand',
      content: {
        command: {
          method: 'get',
          uri: '/account',
        },
        destination: 'MessagingHubService',
      },
    });
    return response as BlipLoggedUser;
  } catch (err) {
    console.warn('Falha ao obter usuário logado no Blip:', err);
    return null;
  }
};

export const createAuthorizationKey = (shortName: string, accessKey: string): string => {
  if (!shortName || !accessKey) return '';
  try {
    const decodedAccessKey = atob(accessKey);
    const encoded = btoa(`${shortName}:${decodedAccessKey}`);
    return `Key ${encoded}`;
  } catch (err) {
    console.error('Erro ao computar Authorization Key:', err);
    return '';
  }
};

export const setHeight = async (height: number): Promise<void> => {
  try {
    initBlipProxy();
    await IframeMessageProxy.sendMessage({
      action: 'height',
      content: height,
    });
  } catch (err) {
    // Ignora em desenvolvimento fora do iframe Blip
  }
};

export const getBucketData = async <T>(
  bucketKey: string,
  contractId?: string | null,
  authorizationKey?: string | null
): Promise<T | null> => {
  const uri = `/buckets/${encodeURIComponent(bucketKey)}`;
  const guid = `bkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Tenta via IframeMessageProxy (padrão Blip Extension)
  try {
    initBlipProxy();
    const { response } = await IframeMessageProxy.sendMessage({
      action: 'sendCommand',
      content: {
        command: {
          id: guid,
          method: 'get',
          uri,
        },
      },
    });

    if (response && response.status === 'success' && response.resource) {
      return response.resource as T;
    }
  } catch (iframeErr) {
    console.warn('IframeMessageProxy getBucket error, tentando HTTP direto...', iframeErr);
  }

  // 2. Tenta via HTTP Direct se tiver contractId e authorizationKey
  if (contractId && authorizationKey) {
    try {
      const url = `https://${contractId}.http.msging.net/commands`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorizationKey,
        },
        body: JSON.stringify({
          id: guid,
          method: 'get',
          uri,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { status?: string; resource?: unknown };
        if (data.status === 'success' && data.resource) {
          return data.resource as T;
        }
      }
    } catch (httpErr) {
      console.warn('HTTP Direct getBucket error:', httpErr);
    }
  }

  return null;
};

export const setBucketData = async <T>(
  bucketKey: string,
  data: T,
  contractId?: string | null,
  authorizationKey?: string | null
): Promise<boolean> => {
  const uri = `/buckets/${encodeURIComponent(bucketKey)}`;
  const guid = `bkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Tenta via IframeMessageProxy
  try {
    initBlipProxy();
    const { response } = await IframeMessageProxy.sendMessage({
      action: 'sendCommand',
      content: {
        command: {
          id: guid,
          method: 'set',
          uri,
          type: 'application/json',
          resource: data,
        },
      },
    });

    if (response && response.status === 'success') {
      return true;
    }
  } catch (iframeErr) {
    console.warn('IframeMessageProxy setBucket error, tentando HTTP direto...', iframeErr);
  }

  // 2. Tenta via HTTP Direct se tiver contractId e authorizationKey
  if (contractId && authorizationKey) {
    try {
      const url = `https://${contractId}.http.msging.net/commands`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorizationKey,
        },
        body: JSON.stringify({
          id: guid,
          method: 'set',
          uri,
          type: 'application/json',
          resource: data,
        }),
      });

      if (res.ok) {
        const resData = (await res.json()) as { status?: string };
        return resData.status === 'success';
      }
    } catch (httpErr) {
      console.warn('HTTP Direct setBucket error:', httpErr);
    }
  }

  return false;
};
