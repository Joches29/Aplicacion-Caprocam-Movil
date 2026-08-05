/**
 * UTILIDAD: tokenStorage
 * Gestiona el almacenamiento, lectura y eliminación del token JWT y objeto de usuario.
 *
 * En web usa localStorage. En Android/iOS usa SecureStore y una caché en memoria para
 * evitar errores por APIs no disponibles en React Native.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'caprocam_auth_token';
const USUARIO_KEY = 'caprocam_usuario';

const esWeb = Platform.OS === 'web';

let tokenMemoria = null;
let usuarioMemoria = null;
let storageCargado = false;
let cargarStoragePromise = null;

const leerLocalStorageSeguro = (key) => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch (error) {
    console.error('[tokenStorage] Error al leer localStorage:', error);
    return null;
  }
};

const escribirLocalStorageSeguro = (key, value) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.error('[tokenStorage] Error al guardar en localStorage:', error);
  }
};

const eliminarLocalStorageSeguro = (key) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('[tokenStorage] Error al eliminar de localStorage:', error);
  }
};

const serializarUsuario = (user) => {
  try {
    return JSON.stringify(user);
  } catch (error) {
    console.error('[tokenStorage] Error al serializar usuario:', error);
    return null;
  }
};

const deserializarUsuario = (data) => {
  try {
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[tokenStorage] Error al deserializar usuario:', error);
    return null;
  }
};

export const cargarSesionPersistida = async () => {
  if (storageCargado) {
    return {
      token: tokenMemoria,
      usuario: usuarioMemoria,
    };
  }

  if (cargarStoragePromise) {
    return cargarStoragePromise;
  }

  cargarStoragePromise = (async () => {
    try {
      if (esWeb) {
        tokenMemoria = leerLocalStorageSeguro(TOKEN_KEY);
        usuarioMemoria = deserializarUsuario(leerLocalStorageSeguro(USUARIO_KEY));
      } else {
        tokenMemoria = await SecureStore.getItemAsync(TOKEN_KEY);
        console.log('[tokenStorage] Token cargado desde SecureStore:', tokenMemoria);
        const usuarioRaw = await SecureStore.getItemAsync(USUARIO_KEY);
        usuarioMemoria = deserializarUsuario(usuarioRaw);
      }
    } catch (error) {
      console.error('[tokenStorage] Error al cargar sesión persistida:', error);
      tokenMemoria = null;
      usuarioMemoria = null;
    } finally {
      storageCargado = true;
      cargarStoragePromise = null;
    }
    console.log('[tokenStorage] Sesión persistida cargada:', {
      token: tokenMemoria,
      usuario: usuarioMemoria,
    });
    return {
      token: tokenMemoria,
      usuario: usuarioMemoria,
    };
  })();
  console.log('[tokenStorage] Cargando sesión persistida...');
  return cargarStoragePromise;
};

export const saveToken = async (token) => {
  try {
    tokenMemoria = token || null;
    console.log('[tokenStorage] Guardando token:', tokenMemoria);

    if (esWeb) {
      if (token) {
        escribirLocalStorageSeguro(TOKEN_KEY, token);
      } else {
        eliminarLocalStorageSeguro(TOKEN_KEY);
      }
      return;
    }

    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error('[tokenStorage] Error al guardar el token:', error);
  }
};

export const getToken = () => {
  try {
    if (tokenMemoria) {
      return tokenMemoria;
    }

    if (esWeb) {
      return leerLocalStorageSeguro(TOKEN_KEY);
    }

    return null;
  } catch (error) {
    console.error('[tokenStorage] Error al leer el token:', error);
    return null;
  }
};

export const saveUsuario = async (user) => {
  try {
    usuarioMemoria = user || null;
    const payload = user ? serializarUsuario(user) : null;

    if (esWeb) {
      if (payload) {
        escribirLocalStorageSeguro(USUARIO_KEY, payload);
      } else {
        eliminarLocalStorageSeguro(USUARIO_KEY);
      }
      return;
    }

    if (payload) {
      await SecureStore.setItemAsync(USUARIO_KEY, payload);
    } else {
      await SecureStore.deleteItemAsync(USUARIO_KEY);
    }
  } catch (error) {
    console.error('[tokenStorage] Error al guardar usuario:', error);
  }
};

export const getUsuario = () => {
  try {
    if (usuarioMemoria) {
      return usuarioMemoria;
    }

    if (esWeb) {
      return deserializarUsuario(leerLocalStorageSeguro(USUARIO_KEY));
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const removeToken = async () => {
  try {
    tokenMemoria = null;
    usuarioMemoria = null;

    if (esWeb) {
      eliminarLocalStorageSeguro(TOKEN_KEY);
      eliminarLocalStorageSeguro(USUARIO_KEY);
      return;
    }

    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USUARIO_KEY),
    ]);
  } catch (error) {
    console.error('[tokenStorage] Error al eliminar el token:', error);
  }
};

export const hasToken = () => {
  return getToken() !== null;
};