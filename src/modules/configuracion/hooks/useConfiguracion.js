/**
 * ============================================================
 * CUSTOM HOOK: useConfiguracion.js
 * ============================================================
 *
 * Módulo: Configuración
 * Descripción:
 * Hook que maneja la lógica completa de sincronización:
 * - Nube -> Móvil (descarga de catálogos)
 * - Móvil -> Nube (subida de registros pendientes)
 * - Sincronización completa (subir + bajar)
 */

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { configSyncService } from "../services/configSync.service";

export function useConfiguracion() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  // ─── Manejo de errores centralizado ─────────────────────────
  const manejarError = useCallback((err) => {
    const is401 =
      err?.status === 401 ||
      err?.response?.status === 401 ||
      err?.message?.includes("401") ||
      err?.message?.toLowerCase().includes("autoriza");

    const mensajeError = is401
      ? "Sesión no autorizada o token expirado. Debe iniciar sesión de nuevo."
      : (err?.message || "Ocurrió un error inesperado.");

    setError(mensajeError);
    setIsLoading(false);
    setLoadingMsg("");

    if (is401) {
      Alert.alert(
        "Sesión Expirada",
        "Tu sesión ha caducado. Por favor inicia sesión nuevamente.",
        [
          { text: "Ir a Login", onPress: () => router.replace("/login") },
          { text: "Cancelar", style: "cancel" },
        ]
      );
    } else {
      Alert.alert("Error de Sincronización", mensajeError, [
        { text: "Aceptar" },
      ]);
    }
  }, [router]);

  // ─── Nube -> Móvil ──────────────────────────────────────────
  const handleDescargar = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingMsg("Descargando catálogos desde el servidor...");
    setError(null);

    try {
      const resultado = await configSyncService.sincronizarCatalogos();
      setSyncResult(resultado);
      setIsLoading(false);
      setLoadingMsg("");

      Alert.alert(
        "Descarga Exitosa",
        `Se han descargado correctamente ${resultado.totalGuardados} registros en total.\n\n` +
        `Fincas: ${resultado.fincasCount}  |  Estanques: ${resultado.estanquesCount}\n` +
        `Proveedores: ${resultado.proveedoresCount}  |  Productos: ${resultado.productosCount}\n` +
        `Compradores: ${resultado.compradoresCount}  |  Equipos: ${resultado.equiposCount}\n` +
        `Tareas: ${resultado.tareasCount}  |  Siembras: ${resultado.siembrasCount}`,
        [{ text: "Aceptar" }]
      );
    } catch (err) {
      manejarError(err);
    }
  }, [isLoading, manejarError]);

  // ─── Móvil -> Nube ──────────────────────────────────────────
  const handleSubir = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingMsg("Subiendo registros pendientes al servidor...");
    setError(null);

    try {
      const resultado = await configSyncService.subirCambiosPendientes();
      setUploadResult(resultado);
      setIsLoading(false);
      setLoadingMsg("");

      Alert.alert(
        "Subida Exitosa",
        resultado.subidos === 0
          ? "No había registros pendientes de sincronizar."
          : `Se subieron ${resultado.subidos} registros al servidor correctamente.`,
        [{ text: "Aceptar" }]
      );
    } catch (err) {
      manejarError(err);
    }
  }, [isLoading, manejarError]);

  // ─── Sincronización completa ─────────────────────────────────
  const handleSync = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingMsg("Sincronizando con el servidor...");
    setError(null);

    try {
      setLoadingMsg("Subiendo cambios pendientes...");
      const subida = await configSyncService.subirCambiosPendientes();
      setUploadResult(subida);

      setLoadingMsg("Descargando catálogos actualizados...");
      const descarga = await configSyncService.sincronizarCatalogos();
      setSyncResult(descarga);

      setIsLoading(false);
      setLoadingMsg("");

      Alert.alert(
        "Sincronización Completa",
        `✅ Subidos: ${subida.subidos ?? 0} registros\n` +
        `✅ Descargados: ${descarga.totalGuardados ?? 0} registros`,
        [{ text: "Aceptar" }]
      );
    } catch (err) {
      manejarError(err);
    }
  }, [isLoading, manejarError]);

  const resetSyncState = useCallback(() => {
    setError(null);
    setSyncResult(null);
    setUploadResult(null);
  }, []);

  return {
    isLoading,
    loadingMsg,
    error,
    syncResult,
    uploadResult,
    handleSync,
    handleDescargar,
    handleSubir,
    resetSyncState,
  };
}

export default useConfiguracion;