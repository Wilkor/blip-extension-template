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
