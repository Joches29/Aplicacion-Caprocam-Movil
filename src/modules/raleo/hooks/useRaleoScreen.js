/**
 * ============================================================
 * HOOK USERALEOSCREEN
 * ============================================================
 *
 * Orquesta la pantalla principal del módulo de Raleo:
 *
 * - Estado del formulario (useRaleo).
 * - Validación.
 * - Cálculo del porcentaje.
 * - Cálculo de la biomasa restante.
 * - Guardado real del registro.
 * - Alerta de feedback tras guardar.
 *
 * El usuario digita:
 *
 * - biomasaEstimada
 * - kgRetirados
 *
 * El sistema calcula:
 *
 * porcentaje = (kgRetirados / biomasaEstimada) * 100
 *
 * biomasaRestante = biomasaEstimada - kgRetirados
 *
 * Ambos valores calculados se persisten en el registro.
 */
import { useEffect, useState } from "react";
import useRaleo from "./useRaleo";
import raleoLocalService from "../services/RaleoLocal.service.js";
import { useError } from "../../../shared/context/ErrorContext.js";
import { useSiembraActivaEstanque } from "../../../shared/hooks/useSiembraActivaEstanque.js";

/*
 * ============================================================
 * CONVERTIR FECHA
 * ============================================================
 */
function convertirFecha(fecha) {
  const [dia, mes, anio] = fecha.split("/");
  return `${anio}-${mes}-${dia}`;
}
/*
 * ============================================================
 * CALCULAR RALEO
 * ============================================================
 */

/**
 * Calcula el porcentaje de raleo y la biomasa restante.
 *
 * Formula porcentaje:
 *
 * porcentaje = (kgRetirados / biomasaEstimada) * 100
 *
 * Formula biomasa restante:
 *
 * biomasaRestante = biomasaEstimada - kgRetirados
 *
 * @param {number|string} biomasaEstimada
 * @param {number|string} kgRetirados
 *
 * @returns {{
 *   porcentaje: string,
 *   biomasaRestante: string
 * }}
 */

export function calcularRaleo(
  biomasaEstimada,
  kgRetirados
) {
  const antes = Number(biomasaEstimada);
  const retirados = Number(kgRetirados);
  /*
   * --------------------------------------------------------
   * VALIDAR DATOS PARA EL CALCULO
   * --------------------------------------------------------
   */
  const datosIncompletos =
    biomasaEstimada === "" ||
    kgRetirados === "" ||
    Number.isNaN(antes) ||
    Number.isNaN(retirados) ||
    antes <= 0 ||
    retirados <= 0;
  if (datosIncompletos) {
    return {
      porcentaje: "",
      biomasaRestante: "",
    };
  }
  /*
   * --------------------------------------------------------
   * CALCULOS
   * --------------------------------------------------------
   */
  return {
    porcentaje: (
      (retirados / antes) * 100
    ).toFixed(2),
    biomasaRestante: (
      antes - retirados
    ).toFixed(2),

  };
}
/*
 * ============================================================
 * HOOK USERALEOSCREEN
 * ============================================================
 */
export default function useRaleoScreen() {
  const {
    form,
    updateField,
    resetForm,
    validarForm,
  } = useRaleo();
  const {
    mostrarError,
  } = useError();


  /*
   * ========================================================
   * ESTADOS
   * ========================================================
   */
  const [submitted, setSubmitted] = useState(false);
  const [errores, setErrores] = useState({});
  const [alerta, setAlerta] = useState({
    visible: false,
    variant: "success",
    mensaje: "",
  });
  /*
   * ========================================================
   * CALCULOS DEL RALEO
   * ========================================================
   */
 const {
    porcentaje: porcentajeRaleo,
    biomasaRestante,
  } = calcularRaleo(
    form.biomasaEstimada,
    form.kgRetirados
  );
  /*
   * ========================================================
   * VALIDAR SIEMBRA ACTIVA DEL ESTANQUE
   * ========================================================
   * Mismo criterio que usa Densidad Poblacional: un estanque sin
   * siembra activa no puede recibir un raleo (no hay biomasa de
   * referencia real). Se avisa apenas se elige el estanque, y se
   * vuelve a validar en handleGuardar para bloquear el guardado.
   */
  const {
    tieneSiembraActiva,
    mensajeErrorSiembra,
  } = useSiembraActivaEstanque(form.estanque, "el raleo");

  useEffect(() => {
    if (mensajeErrorSiembra) {
      setAlerta({
        visible: true,
        variant: "danger",
        mensaje: mensajeErrorSiembra,
      });
    }
  }, [mensajeErrorSiembra]);
  /*
   * ========================================================
   * MANEJO DE ALERTA
   * ========================================================
   */
  useEffect(() => {
    if (!alerta.visible) {
      return;
    }
    const duracion =
      alerta.variant === "success"
        ? 3000
        : 6000;

    const timer = setTimeout(() => {
      /*
       * Si el registro fue exitoso,
       * se limpia el formulario.
       */
      if (alerta.variant === "success") {
        resetForm();
        setSubmitted(false);
        setErrores({});
      }
      setAlerta((prev) => ({
        ...prev,
        visible: false,
      }));
    }, duracion);
    return () => clearTimeout(timer);
  }, [
    alerta.visible,
    alerta.variant,
  ]);
  /*
   * ========================================================
   * GUARDAR RALEO
   * ========================================================
   */
  const handleGuardar = async () => {
    setSubmitted(true);
    /*
     * ----------------------------------------------------
     * VALIDACION
     * ----------------------------------------------------
     */
    const {
      valido,
      errores: erroresValidacion,
    } = validarForm();
    setErrores(erroresValidacion);
    if (!valido) {
      setAlerta({
        visible: true,
        variant: "danger",
        mensaje: "Rellenar campos obligatorios.",
      });
      return;
    }
    /*
     * ----------------------------------------------------
     * VALIDAR SIEMBRA ACTIVA
     * ----------------------------------------------------
     */
    if (!tieneSiembraActiva) {
      setAlerta({
        visible: true,
        variant: "danger",
        mensaje:
          mensajeErrorSiembra ||
          "El estanque seleccionado no tiene una siembra real registrada.",
      });
      return;
    }
    /*
     * ----------------------------------------------------
     * GUARDAR
     * ----------------------------------------------------
     */

    try {
      /*
       * Se preparan los datos utilizando los nombres
       * esperados por el servicio.
       */

      const registro = {
        idFinca: form.finca,
        idEstanque: form.estanque,
        fecha: convertirFecha(form.fecha),
        biomasaEstimada:
          Number(form.biomasaEstimada),
        kgRetirados:
          Number(form.kgRetirados),
        porcentaje:
          Number(porcentajeRaleo),
        biomasaRestante:
          Number(biomasaRestante),
        observaciones:
          form.observaciones?.trim()
            ? form.observaciones
            : "No se realizan observaciones",
      };
      /*
       * Se mantiene el service como punto de entrada
       * para guardar el registro.
       */
      await raleoLocalService.create(registro);
      /*
       * ------------------------------------------------
       * ALERTA DE EXITO
       * ------------------------------------------------
       */
      setAlerta({
        visible: true,
        variant: "success",
        mensaje: "Raleo registrado correctamente",
      });
    } catch (error) {
      mostrarError(error);
    }
  };
  /*
   * ========================================================
   * RETORNO
   * ========================================================
   */

  return {
    form,
    updateField,
    porcentajeRaleo,
    biomasaRestante,
    submitted,
    errores,
    alerta,
    handleGuardar,
  };
}