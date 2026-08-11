/**
 * ============================================================
 * HOOK DE VALIDACIÓN DE CAMPOS OBLIGATORIOS - MÓDULO SIEMBRA
 * ============================================================
 *
 * FUNCIONALIDAD:
 *
 * Contrato único required/submitted/error usado por los
 * formularios del módulo de Siembra 
 *
 * - El asterisco se muestra siempre (requiredLabel).
 * - El borde rojo (hasError) solo aparece cuando "submitted"
 *   es true Y el campo sigue inválido/vacío.
 *
 * Este archivo no conoce la lista de campos obligatorios de
 * Siembra/Pre-Cría (esa lógica de negocio vive en
 * siembraValidationRules.js); solo resuelve el mecanismo de
 * estado (submitted/errors/hasError/requiredLabel), para que
 * "Crear" y "Editar" se comporten exactamente igual.
 *
 * USO TÍPICO:
 *
 *   const { submitted, setSubmitted, errors, setErrors,
 *           hasError, requiredLabel } = useFieldValidation();
 *
 *   const nuevosErrores = validarCamposObligatorios(
 *     formData,
 *     camposObligatoriosDelModulo,
 *   );
 */
import { useCallback, useState } from "react";

export function useFieldValidation() {
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const hasError = useCallback(
    (field) => submitted && Boolean(errors[field]),
    [submitted, errors],
  );

  const requiredLabel = useCallback((label) => `${label} *`, []);

  return {
    submitted,
    setSubmitted,
    errors,
    setErrors,
    hasError,
    requiredLabel,
  };
}

export function esNumeroValidoPositivo(valor, permitirCero = false) {
  if (valor === undefined || valor === null || String(valor).trim() === "") return false;
  const num = Number(valor);
  if (Number.isNaN(num)) return false;
  return permitirCero ? num >= 0 : num > 0;
}

export function esAlfanumericoMax14(valor) {
  if (!valor) return true;
  const str = String(valor).trim();
  if (str.length > 14) return false;
  return /^[a-zA-Z0-9]+$/.test(str);
}

/**
 * Valida una lista de campos obligatorios contra un formData.
 * Reutilizable por cualquier módulo, independientemente de cuáles
 * campos exija (esa lista la define cada módulo).
 */
export function validarCamposObligatorios(formData, camposObligatorios) {
  const errores = {};

  const camposNumericosPositivos = [
    "cantidadSembrada",
    "densidadPoblacional",
    "duracionCiclo",
    "cantidadInicial",
    "duracionDias",
    "cantidadSobrevivientePrecria",
    "areaHectareas",
  ];

  const camposNumericosPermiteCero = ["cantidadFinal"];

  const camposAlfanumericos14 = ["codigoLoteLarva", "certificadoLarva"];

  camposObligatorios.forEach((campo) => {
    const valor = formData[campo];
    const strValor = String(valor ?? "").trim();

    if (strValor === "") {
      errores[campo] = "Campo obligatorio";
      return;
    }

    if (camposAlfanumericos14.includes(campo)) {
      if (!esAlfanumericoMax14(strValor)) {
        errores[campo] = "Solo letras y números, máximo 14 caracteres.";
        return;
      }
    }

    if (camposNumericosPositivos.includes(campo)) {
      if (!esNumeroValidoPositivo(strValor, false)) {
        errores[campo] = "Debe ser un número mayor a 0";
        return;
      }
    }

    if (camposNumericosPermiteCero.includes(campo)) {
      if (!esNumeroValidoPositivo(strValor, true)) {
        errores[campo] = "Debe ser un número entero o decimal válido";
        return;
      }
    }
  });

  return errores;
}