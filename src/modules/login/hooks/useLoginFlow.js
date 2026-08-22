/**
 * HOOK: useLoginFlow
 * Orquesta el flujo de inicio de sesión de colaboradores: carga trabajadores,
 * filtra por nombre, controla la ventana modal de PIN, sincroniza datos locales
 * y valida credenciales contra la base SQLite local.
 *
 * @dependencies - useWorkers, formatDateInSpanish, getLoginValidationMessage, isLoginFormValid,
 *                 validarPinOffline (database/local/offlineAuth.service),
 *                 descargarColaboradoresLoginLocal (database/local/sync.service), api (api/api.js)
 * @validations   - Filtra lista por nombre y requiere PIN exacto de 4 dígitos.
 * @navigation    - N/A (ejecuta el callback onLoginSuccess al autenticar PIN).
 */

import { useState } from 'react';

import { useWorkers } from './useWorkers';
import { formatDateInSpanish } from '../utils/dateFormatter';
import { getLoginValidationMessage, isLoginFormValid } from '../utils/loginValidator';
import { validarPinOffline } from '../../../database/local/offlineAuth.service';
import { descargarColaboradoresLoginLocal } from '../../../database/local/sync.service';
import api from '../../../api/api';

const SYNC_TIMEOUT_MS = 30000;

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
   * handleSyncData({ cedula, pin })
   * Dispara la descarga EXCLUSIVA de colaboradores desde el backend hacia SQLite local.
   *
   * @param {Object} credentials - Objeto con cédula y PIN ingresados en el modal.
   * @returns {Promise<{success: boolean, message: string}>} Resultado real de la sincronización.
   */
  const handleSyncData = async (credentials = {}) => {
    const { cedula, pin } = credentials;

    // 1. Validación previa de datos requeridos
    if (!cedula || !cedula.trim()) {
      return { success: false, message: 'Debe ingresar una cédula válida.' };
    }

    if (!pin || pin.length !== 4) {
      return { success: false, message: 'El PIN debe ser de 4 dígitos.' };
    }

    setIsSyncing(true);

    try {
      // 2. Solo descargamos la lista de colaboradores
      let timeoutId;
      const resultado = await Promise.race([
        descargarColaboradoresLoginLocal(api, { cedula: cedula.trim(), pin }),
        new Promise((resolve) => {
          timeoutId = setTimeout(() => {
            resolve({
              success: false,
              message: 'La sincronización tardó demasiado. Verifica tu conexión e intenta nuevamente.',
            });
          }, SYNC_TIMEOUT_MS);
        }),
      ]).finally(() => clearTimeout(timeoutId));

      if (!resultado || !resultado.success) {
        return {
          success: false,
          message: resultado?.message || 'No se pudo conectar con el servidor para descargar colaboradores.',
        };
      }

      // 3. Refrescar la lista de colaboradores en SQLite local
      await refetch();

      return {
        success: true,
        message: 'Colaborador sincronizado correctamente.',
      };
    } catch (err) {
      console.error('Error en handleSyncData:', err);
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || 'Error de conexión. Verifica tu red e intenta nuevamente.',
      };
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
      onLoginSuccess(resultado.data);
    } catch (err) {
      console.error('Error al validar PIN offline:', err);
      setPinError('No se pudo verificar el PIN localmente.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    workers,
    filteredWorkers,
    loading,
    error,
    refetch,
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