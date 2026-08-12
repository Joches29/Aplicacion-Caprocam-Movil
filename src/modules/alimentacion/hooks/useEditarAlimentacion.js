/**
 * ============================================================
 * HOOK USEEDITARALIMENTACIONSCREEN
 * ============================================================
 *
 * Carga un registro de alimentación por id, precarga el form
 * de useAlimentacionForm con esos valores, y persiste los
 * cambios en SQLite vía AlimentacionLocalService.update().
 * Reusa la misma validación que la creación (useAlimentacionForm).
 *
 * RECONECTADO: getById/update usaban alimentacionService (HTTP);
 * ahora usan AlimentacionLocalService (SQLite), con
 * localApi.inicializar() antes de leer, igual que el resto del
 * módulo.
 *
 * CORREGIDO: formADto enviaba `idProveedor`/`idProducto` como
 * llaves, pero AlimentacionLocalService.mapearAlimentacionParaLocal
 * solo reconoce `proveedorId`/`proveedor_id` y
 * `productoId`/`producto_id` (no `idProveedor`/`idProducto`), por
 * lo que proveedor_id y producto_id se hubieran guardado siempre
 * en null al editar. Se corrigen los nombres de llave.
 *
 * ELIMINADOS: racionesDia, totalKg, tasaAlimentacion, lecturaAM,
 * lecturaPM (no existen en el schema ni en ningún input del
 * formulario; ver useAlimentacionForm.js).
 *
 * Retorna:
 * - form, updateField: estado y setter del formulario.
 * - cargando: true mientras se trae el registro original.
 * - submitted, errores: estado de validación para AlimentacionForm.
 * - alerta: { visible, variant, mensaje } feedback de guardado.
 * - guardando: true mientras se persiste el cambio.
 * - handleGuardar: valida y actualiza si es válido.
 */

import { useState, useEffect, useCallback } from "react";
import useAlimentacionForm from "./useAlimentacionForm";
import AlimentacionLocalService from "../services/AlimentacionLocal.service";
import { localApi } from "../../../database/local/localApi.service";

function registroAForm(registro) {
  if (!registro) return {};
  return {
    finca: registro.fincaId != null ? String(registro.fincaId) : "",
    estanque: registro.estanqueId != null ? String(registro.estanqueId) : "",
    fecha: registro.fecha ?? "",
    hora: registro.hora ?? "",
    metodo: registro.metodo ?? "",
    cantidadKg: registro.cantidadKg != null ? String(registro.cantidadKg) : "",

    idProveedor: registro.proveedorId != null ? String(registro.proveedorId) : "",
    proveedor: registro.proveedor ?? "",

    idProducto: registro.productoId != null ? String(registro.productoId) : "",
    idColaborador: registro.colaboradorId ?? "",
    observaciones: registro.observaciones ?? "",
    tipoAlimento: registro.tipoAlimento ?? "",
    presentacion: registro.presentacion ?? "",
  };
}

function formADto(form) {
  return {
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
    observaciones: form.observaciones?.trim()
      ? form.observaciones.trim()
      : "No se realizan observaciones",
    tipoAlimento: form.tipoAlimento,
    presentacion: form.presentacion,
  };
}

export default function useEditarAlimentacionScreen(registroId, onGuardado) {
  const [cargando, setCargando] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState({ visible: false, variant: "success", mensaje: "" });

  const { form, updateField, validarForm } = useAlimentacionForm();

  useEffect(() => {
    if (!registroId) {
      setCargando(false);
      return;
    }

    let activo = true;
    setCargando(true);

    (async () => {
      try {
        await localApi.inicializar();
        const registro = await AlimentacionLocalService.getById(registroId);
        if (!activo) return;
        const valores = registroAForm(registro);
        Object.entries(valores).forEach(([campo, valor]) => updateField(campo, valor));
      } catch (error) {
        if (activo) {
          setAlerta({
            visible: true,
            variant: "danger",
            mensaje: error?.message || "No se pudo cargar el registro.",
          });
        }
      } finally {
        if (activo) setCargando(false);
      }
    })();

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registroId]);

  const [errores, setErrores] = useState({});

  const handleGuardar = useCallback(async () => {
    setSubmitted(true);
    const { valido, errores: erroresValidacion } = validarForm();
    setErrores(erroresValidacion);

    if (!valido) {
      setAlerta({ visible: true, variant: "danger", mensaje: "Revisá los campos marcados." });
      return;
    }

    setGuardando(true);
    setAlerta({ visible: false, variant: "success", mensaje: "" });

    try {
      await AlimentacionLocalService.update(registroId, formADto(form));
      setAlerta({ visible: true, variant: "success", mensaje: "Registro actualizado correctamente." });
      onGuardado?.();
    } catch (error) {
      setAlerta({
        visible: true,
        variant: "danger",
        mensaje: error?.message || "No se pudo actualizar el registro.",
      });
    } finally {
      setGuardando(false);
    }
  }, [form, registroId, onGuardado, validarForm]);

  return { form, updateField, cargando, submitted, errores, alerta, guardando, handleGuardar };
}