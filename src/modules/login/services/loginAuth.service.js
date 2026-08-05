/**
 * SERVICIO: loginAuth.service (adaptado a SQLite local)
 * Valida el PIN de un colaborador contra el hash guardado en SQLite local,
 * sin depender de conexión ni del backend.
 *
 * @dependencies - offlineAuth.service (database/local)
 * @validations  - Requiere workerId (id LOCAL del colaborador) y PIN numérico de 4 dígitos.
 * @navigation   - N/A
 */

import { validarPinOffline } from "../../../database/local/offlineAuth.service";

export async function verifyPinCredentials({ workerId, pinCode }) {
  if (workerId == null || pinCode.length !== 4) {
    return { isValid: false, message: "Datos inválidos para autenticar." };
  }

  const respuesta = await validarPinOffline(workerId, pinCode);

  if (!respuesta.success) {
    // PIN incorrecto, colaborador no encontrado, o sin pin_hash configurado
    return { isValid: false, message: respuesta.message };
  }

  return {
    isValid: true,
    message: respuesta.message,
    data: respuesta.data, // colaborador de sesión (ya sin pin_hash, lo limpia offlineAuth.service)
  };
}