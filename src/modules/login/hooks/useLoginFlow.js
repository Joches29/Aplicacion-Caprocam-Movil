/**
 * HOOK: useLoginFlow
 * Orquesta el flujo de inicio de sesión de colaboradores: carga trabajadores,
 * filtra por nombre, controla la ventana modal de PIN, sincroniza datos locales
 * y valida credenciales contra la base SQLite local.
 *
 * @dependencies - useWorkers, formatDateInSpanish, getLoginValidationMessage, isLoginFormValid,
 *                 validarPinOffline (database/local/offlineAuth.service),
 *                 descargarDatosInicialesLocal (database/local/sync.service), api (api/api.js)
 * @validations  - Filtra lista por nombre y requiere PIN exacto de 4 dígitos.
 * @navigation   - N/A (ejecuta el callback onLoginSuccess al autenticar PIN).
 */

import { useState } from 'react';

import { useWorkers } from './useWorkers';
import { formatDateInSpanish } from '../utils/dateFormatter';
import { getLoginValidationMessage, isLoginFormValid } from '../utils/loginValidator';
import { validarPinOffline } from '../../../database/local/offlineAuth.service';
import { descargarDatosInicialesLocal } from '../../../database/local/sync.service';
import api from '../../../api/api';

/**
 * useLoginFlow
 *
 * Agrupa estado y acciones del login para mantener la pantalla delgada.
 */
export function useLoginFlow({ onLoginSuccess }) {
  const { workers, loading, error, refetch } = useWorkers();
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerSearchText, setWorkerSearchText] = useState('');
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const formattedDate = formatDateInSpanish();
  const isFormValid = isLoginFormValid(!!selectedWorker);
  const validationMessage = getLoginValidationMessage(!!selectedWorker);
  const normalizedSearchText = workerSearchText.trim().toLowerCase();
  const filteredWorkers = normalizedSearchText === ''
    ? workers
    : workers.filter((worker) => String(worker.name ?? '').toLowerCase().includes(normalizedSearchText));

  /**
   * openPinModal()
   * Abre el modal de PIN solo si ya hay un colaborador seleccionado.
   */
  const openPinModal = () => {
    if (!isFormValid) return;
    setPinCode('');
    setPinError('');
    setIsPinModalVisible(true);
  };

  /**
   * handleSyncData()
   * Dispara la descarga inicial de datos (incluye colaboradores) desde el
   * backend hacia SQLite local, y refresca la lista de trabajadores en pantalla.
   *
   * @returns {Promise<{success: boolean, message: string}>} Resultado real de la sincronización.
   */
  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const resultado = await descargarDatosInicialesLocal(api);

      if (!resultado.success) {
        return { success: false, message: resultado.message };
      }

      await refetch();
      return { success: true, message: 'Sincronización completada correctamente.' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de sincronización. Verifica tu conexión.' };
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * closePinModal()
   * Cierra el modal de PIN, salvo que se esté autenticando.
   */
  const closePinModal = () => {
    if (!isAuthenticating) {
      setIsPinModalVisible(false);
      setPinError('');
    }
  };

  /**
   * handlePinChange(value)
   * Limpia caracteres no numéricos y limita el PIN a 4 dígitos.
   *
   * @param {string} value - Valor crudo del input.
   */
  const handlePinChange = (value) => {
    setPinCode(value.replace(/\D/g, '').slice(0, 4));
    if (pinError !== '') setPinError('');
  };

  /**
   * submitPin()
   * Valida el PIN del colaborador seleccionado contra el pin_hash guardado
   * localmente en SQLite (bcrypt), sin depender del backend ni del token.
   */
  const submitPin = async () => {
    if (pinCode.length !== 4 || selectedWorker == null) {
      setPinError('El PIN debe tener 4 dígitos.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const resultado = await validarPinOffline(selectedWorker, pinCode);
      console.log('colaborador autenticado:', resultado.data);

      if (!resultado.success) {
        setPinError(resultado.message);
        return;
      }

      setIsPinModalVisible(false);
      onLoginSuccess(resultado.data); // colaborador de sesión (sin pin_hash)
    } finally {
      setIsAuthenticating(false);
    }
  };

return {
    workers,
    filteredWorkers,
    loading,
    error,
    refetch,              // ← agregar esta línea
    selectedWorker,
    setSelectedWorker,
    workerSearchText,
    setWorkerSearchText,
    formattedDate,
    isFormValid,
    validationMessage,
    isPinModalVisible,
    pinCode,
    pinError,
    isAuthenticating,
    isSyncing,
    openPinModal,
    handleSyncData,
    closePinModal,
    handlePinChange,
    submitPin,
  };
}