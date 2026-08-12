/**
 * ============================================================
 * HOOK USEALIMENTACIONSCREEN
 * ============================================================
 *
 * Orquesta la pantalla principal del módulo de Alimentación:
 * estado del formulario (useAlimentacionForm), validación,
 * guardado real del registro en SQLite y feedback del proceso.
 *
 * RECONECTADO: el guardado usa AlimentacionLocalService.create
 * (SQLite) en vez de alimentacionService.create (HTTP).
 *
 * QUITADO: ya no llama a useAlimentacion() ni expone
 * alimentaciones/loading/errorListado. Esa carga del listado
 * completo solo se usaba para AlimentacionStats (retirado del
 * módulo por sobrecargar la pantalla en móvil) y para un
 * `calcularStats` que ni siquiera se usa en GestionAlimentacion.
 * Esta pantalla es de creación, no de listado, así que no tiene
 * sentido traer todos los registros solo para entrar a registrar
 * uno nuevo.
 *
 * Funcionalidad:
 * - `submitted` se activa dentro de handleGuardar, ANTES de
 *   validar, para que AlimentacionForm sepa cuándo mostrar los
 *   bordes rojos y mensajes de error de validarForm().
 * - `alerta` maneja tanto el mensaje de éxito (top de pantalla,
 *   3s) como el de error de validación/guardado (in-form, junto
 *   al botón, 6s): la duración depende de `alerta.variant`.
 *
 * Retorna:
 * - form, updateField: estado y setter del formulario.
 * - submitted, errores: estado de validación para la UI.
 * - alerta: { visible, variant, mensaje } para el feedback de guardado.
 * - handleGuardar: valida y guarda el registro si es válido.
 *
 * Ejemplo:
 * const { form, updateField, handleGuardar } = useAlimentacionScreen(navigation);
 */

import { useEffect, useState } from "react";

import useAlimentacionForm from "./useAlimentacionForm";
import AlimentacionLocalService from "../services/AlimentacionLocal.service";

export default function useAlimentacionScreen(navigation) {
  const {
    form,
    updateField: updateFormField,
    resetForm,
    validarForm,
  } = useAlimentacionForm();

  const [submitted, setSubmitted] = useState(false);
  const [errores, setErrores] = useState({});

  const [alerta, setAlerta] = useState({
    visible: false,
    variant: "success",
    mensaje: "",
  });

  useEffect(() => {
    if (!alerta.visible) {
      return undefined;
    }

    const duracion =
      alerta.variant === "success" ? 3000 : 6000;

    const timer = setTimeout(() => {
      if (alerta.variant === "success") {
        resetForm();
        setSubmitted(false);
        setErrores({});
      }

      setAlerta((alertaActual) => ({
        ...alertaActual,
        visible: false,
      }));
    }, duracion);

    return () => clearTimeout(timer);
  }, [
    alerta.visible,
    alerta.variant,
    resetForm,
  ]);

  const updateField = (campo, valor) => {
    updateFormField(campo, valor);

    /*
     * Oculta la alerta anterior cuando el usuario
     * comienza a escribir un registro nuevo.
     */
    if (alerta.visible) {
      setAlerta((alertaActual) => ({
        ...alertaActual,
        visible: false,
      }));
    }

    /*
     * Elimina el error solamente del campo modificado.
     */
    if (errores[campo]) {
      setErrores((erroresActuales) => {
        const nuevosErrores = {
          ...erroresActuales,
        };

        delete nuevosErrores[campo];

        return nuevosErrores;
      });
    }
  };

  const handleGuardar = async () => {
    setSubmitted(true);

    setAlerta({
      visible: false,
      variant: "success",
      mensaje: "",
    });

    const resultadoValidacion = validarForm();

    const valido = resultadoValidacion?.valido;
    const erroresValidacion =
      resultadoValidacion?.errores || {};

    setErrores(erroresValidacion);

    if (!valido) {
      setAlerta({
        visible: true,
        variant: "danger",
        mensaje:
          "Por favor complete todos los campos obligatorios.",
      });

      return;
    }

    try {
      const registro = {
        idFinca: form.finca,
        idEstanque: form.estanque,
        fecha: form.fecha,
        hora: form.hora,
        metodo: form.metodo,
        cantidadKg: Number(form.cantidadKg),
        proveedorId: form.idProveedor,
        proveedor: form.proveedor,
        productoId: form.idProducto,
        idColaborador: form.idColaborador,
        tipoAlimento: form.tipoAlimento,
        presentacion: form.presentacion,
        observaciones: form.observaciones?.trim() || "",
      };

      await AlimentacionLocalService.create(registro);

      /*
       * No se utiliza router.back() ni navigation.goBack().
       * El usuario permanece en Alimentación.
       */
      setAlerta({
        visible: true,
        variant: "success",
        mensaje:
          "Alimentación registrada correctamente.",
      });
    } catch (error) {
      setAlerta({
        visible: true,
        variant: "danger",
        mensaje: error?.message || "No se pudo registrar la alimentación.",
      });
    }
  };

  return {
    form,
    updateField,
    submitted,
    errores,
    alerta,
    handleGuardar,
  };
}