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

    console.log(application);
    return application as BlipApplication;
  } catch (err) {
    console.warn(
      'Falha ao obter dados da aplicação Blip via iframe proxy:',
      err,
    );
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

export const createAuthorizationKey = (
  shortName: string,
  accessKey: string,
): string => {
  if (!shortName || !accessKey) return '';
  try {
    let plainKey = accessKey;
    try {
      plainKey = atob(accessKey);
    } catch {
      plainKey = accessKey;
    }
    const encoded = btoa(`${shortName}:${plainKey}`);
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

const parseBucketResource = <T>(rawResource: unknown): T | null => {
  if (rawResource === null || rawResource === undefined) return null;

  let parsed = rawResource;
  if (typeof rawResource === 'string') {
    try {
      parsed = JSON.parse(rawResource);
    } catch {
      return rawResource as unknown as T;
    }
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      return obj.items as unknown as T;
    }
    if (Array.isArray(obj.tools)) {
      return obj.tools as unknown as T;
    }
  }

  return parsed as T;
};

export const getBucketData = async <T>(
  bucketKey: string,
  contractId?: string | null,
  authorizationKey?: string | null,
): Promise<T | null> => {
  const uri = `/buckets/${encodeURIComponent(bucketKey)}`;
  const guid = `bkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Tenta via IframeMessageProxy (padrão Blip Extension)
  try {
    initBlipProxy();
    const { response } = await IframeMessageProxy.sendMessage({
      action: 'sendCommand',
      content: {
        destination: 'MessagingHubService',
        command: {
          id: guid,
          to: 'postmaster@msging.net',
          method: 'get',
          uri,
        },
      },
    });

    const resObj = response as
      | { status?: string; resource?: unknown }
      | null
      | undefined;
    if (
      resObj &&
      resObj.status === 'success' &&
      resObj.resource !== undefined
    ) {
      return parseBucketResource<T>(resObj.resource);
    }
  } catch (iframeErr) {
    console.warn(
      'IframeMessageProxy getBucket error, tentando HTTP direto...',
      iframeErr,
    );
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
          to: 'postmaster@msging.net',
          method: 'get',
          uri,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          status?: string;
          resource?: unknown;
        };
        if (data.status === 'success' && data.resource !== undefined) {
          return parseBucketResource<T>(data.resource);
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
  authorizationKey?: string | null,
): Promise<boolean> => {
  const uri = `/buckets/${encodeURIComponent(bucketKey)}`;
  const guid = `bkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  // Se data for um Array, envolve em um objeto JSON { items: data } para o Blip não retornar code: 21 ("The property is not a JSON")
  const resourcePayload = Array.isArray(data) ? { items: data } : data;

  // 1. Tenta via IframeMessageProxy
  try {
    initBlipProxy();
    const { response } = await IframeMessageProxy.sendMessage({
      action: 'sendCommand',
      content: {
        destination: 'MessagingHubService',
        command: {
          id: guid,
          to: 'postmaster@msging.net',
          method: 'set',
          uri,
          type: 'application/json',
          resource: resourcePayload,
        },
      },
    });

    const resObj = response as { status?: string } | null | undefined;
    if (resObj && resObj.status === 'success') {
      return true;
    }
  } catch (iframeErr) {
    console.warn(
      'IframeMessageProxy setBucket error, tentando HTTP direto...',
      iframeErr,
    );
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
          to: 'postmaster@msging.net',
          method: 'set',
          uri,
          type: 'application/json',
          resource: resourcePayload,
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

export const deleteBucketData = async (
  bucketKey: string,
  contractId?: string | null,
  authorizationKey?: string | null,
): Promise<boolean> => {
  const uri = `/buckets/${encodeURIComponent(bucketKey)}`;
  const guid = `bkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Tenta via IframeMessageProxy
  try {
    initBlipProxy();
    const { response } = await IframeMessageProxy.sendMessage({
      action: 'sendCommand',
      content: {
        destination: 'MessagingHubService',
        command: {
          id: guid,
          to: 'postmaster@msging.net',
          method: 'delete',
          uri,
        },
      },
    });

    const resObj = response as { status?: string } | null | undefined;
    if (resObj && resObj.status === 'success') {
      return true;
    }
  } catch (iframeErr) {
    console.warn(
      'IframeMessageProxy deleteBucket error, tentando HTTP direto...',
      iframeErr,
    );
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
          to: 'postmaster@msging.net',
          method: 'delete',
          uri,
        }),
      });

      if (res.ok) {
        const resData = (await res.json()) as { status?: string };
        return resData.status === 'success';
      }
    } catch (httpErr) {
      console.warn('HTTP Direct deleteBucket error:', httpErr);
    }
  }

  return false;
};
