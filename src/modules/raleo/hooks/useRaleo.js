/**
 * ============================================================
 * HOOK USERALEO
 * ============================================================
 *
 * Maneja el estado local del formulario de raleo y su
 * validación. No muestra ni renderiza nada en pantalla: la
 * interfaz (la screen) decide cuándo mostrar los errores
 * devueltos, usando su propio estado `submitted`.
 *
 * Estado que maneja:
 *
 * - form: objeto con los valores actuales de todos los campos.
 *
 * Retorna:
 *
 * - form: valores actuales del formulario.
 *
 * - updateField(campo, valor): actualiza un campo del formulario.
 *
 * - resetForm(): restaura el formulario a sus valores iniciales.
 *
 * - validarForm(): retorna { valido, errores } verificando como
 * obligatorios finca, estanque, fecha, biomasaEstimada y
 * kgRetirados.
 *
 * `observaciones` NO se valida aquí porque es opcional.
 *
 * CAMBIO:
 * El registro de raleo ahora captura los kilogramos realmente
 * retirados en vez del porcentaje.
 *
 * El porcentaje y la biomasa restante son calculados por el
 * sistema a partir de la biomasa estimada y los kilogramos
 * retirados.
 *
 * Campos eliminados:
 *
 * - porcentajeRaleo
 * - pesoPromedio
 * - objetivo
 * - metodo
 *
 * `biomasaActual` se renombró a `biomasaEstimada`.
 */

import { useState } from "react";


/*
 * ============================================================
 * FUNCIONES AUXILIARES
 * ============================================================
 */

function hoy() {
  const d = new Date();

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");

  return `${dd}/${mm}/${d.getFullYear()}`;
}


/*
 * ============================================================
 * ESTADO INICIAL
 * ============================================================
 */

const FORM_INICIAL = {
  fecha: hoy(),
  finca: "",
  estanque: "",
  biomasaEstimada: "",
  kgRetirados: "",
  observaciones: "",
};


/*
 * ============================================================
 * HOOK
 * ============================================================
 */

export default function useRaleo() {

  const [form, setForm] = useState(FORM_INICIAL);


  /*
   * ========================================================
   * ACTUALIZAR CAMPO
   * ========================================================
   */

  function updateField(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }


  /*
   * ========================================================
   * REINICIAR FORMULARIO
   * ========================================================
   */

  function resetForm() {
    setForm(FORM_INICIAL);
  }


  /*
   * ========================================================
   * VALIDAR FORMULARIO
   * ========================================================
   */

  function validarForm() {

    const errores = {};


    /*
     * ----------------------------------------------------
     * FINCA
     * ----------------------------------------------------
     */

    if (!form.finca) {
      errores.finca = "La finca es obligatoria";
    }


    /*
     * ----------------------------------------------------
     * ESTANQUE
     * ----------------------------------------------------
     */

    if (!form.estanque) {
      errores.estanque = "El estanque es obligatorio";
    }


    /*
     * ----------------------------------------------------
     * FECHA
     * ----------------------------------------------------
     */

    if (!form.fecha) {
      errores.fecha = "La fecha es obligatoria";
    }


    /*
     * ----------------------------------------------------
     * BIOMASA ESTIMADA
     * ----------------------------------------------------
     */

    const valorBiomasaRaw = form.biomasaEstimada || form.biomasaAntes;
    const biomasaEstimada = Number(valorBiomasaRaw);

    if (
      !valorBiomasaRaw ||
      Number.isNaN(biomasaEstimada)
    ) {

      errores.biomasaEstimada =
        "La biomasa estimada es obligatoria y debe ser numérica";
      errores.biomasaAntes =
        "La biomasa estimada es obligatoria y debe ser numérica";

    } else if (biomasaEstimada <= 0) {

      errores.biomasaEstimada =
        "La biomasa estimada debe ser mayor a 0";
      errores.biomasaAntes =
        "La biomasa estimada debe ser mayor a 0";
    }


    /*
     * ----------------------------------------------------
     * KG RETIRADOS
     * ----------------------------------------------------
     */

    const kgRetirados = Number(form.kgRetirados);

    if (
      !form.kgRetirados ||
      Number.isNaN(kgRetirados)
    ) {

      errores.kgRetirados =
        "La cantidad retirada es obligatoria y debe ser numérica";

    } else if (kgRetirados <= 0) {

      errores.kgRetirados =
        "La cantidad retirada debe ser mayor a 0";

    } else if (
      !errores.biomasaEstimada &&
      kgRetirados > biomasaEstimada
    ) {

      /*
       * No se permite retirar más biomasa de la estimada.
       *
       * Esto evita:
       *
       * - porcentajes superiores al 100 %
       * - biomasa restante negativa
       */

      errores.kgRetirados =
        "La cantidad retirada no puede ser mayor que la biomasa estimada";
    }


    /*
     * ----------------------------------------------------
     * RESULTADO
     * ----------------------------------------------------
     */

    return {
      valido: Object.keys(errores).length === 0,
      errores,
    };
  }


  /*
   * ========================================================
   * RETORNO
   * ========================================================
   */

  return {
    form,
    updateField,
    resetForm,
    validarForm,
  };
}