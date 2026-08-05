/**
 * ============================================================
 * HOOK DE EDICIÓN DE CRECIMIENTO
 * ============================================================
 *
 * Centraliza el estado y las operaciones locales
 * correspondientes al modulo de crecimiento.
 *
 * Trabaja contra SQLite usando CrecimientosLocalService.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { localApi } from "../../../database/local/localApi.service.js";
import CrecimientosLocalService from "../services/mantCrecimientoLocal.service.js";
import { useError } from "../../../shared/context/ErrorContext.js";

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function convertirFechaParaBackend(fechaDDMMYYYY) {
  if (!fechaDDMMYYYY) return "";
  if (fechaDDMMYYYY.includes("-") && !fechaDDMMYYYY.includes("/")) {
    return fechaDDMMYYYY.slice(0, 10);
  }
  const [dia, mes, anio] = fechaDDMMYYYY.split("/");
  return `${anio}-${mes}-${dia}`;
}

function formatearFechaParaUI(fecha) {
  if (!fecha) return "";
  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    const [y, m, d] = fecha.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return fecha;
}

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export default function useEditarCrecimiento(registroId, onGuardado) {
  const { mostrarError } = useError();
  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [fincaSeleccionada, setFincaSeleccionada] = useState("");
  const [estanqueSeleccionado, setEstanqueSeleccionado] = useState("");
  const [pesoActual, setPesoActual] = useState("");
  const [fechaRegistro, setFechaRegistro] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [crecimientos, setCrecimientos] = useState([]);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        await localApi.inicializar();
        const [resFincas, resEstanques] = await Promise.all([
          localApi.fincas.obtenerTodos(),
          localApi.estanques.obtenerTodos(),
        ]);
        if (!activo) return;
        setFincas(resFincas.data || []);
        setEstanques(resEstanques.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!registroId) {
      setCargando(false);
      return;
    }
    let activo = true;
    setCargando(true);

    async function cargarRegistro() {
      try {
        await localApi.inicializar();
        const r = await CrecimientosLocalService.getById(registroId);
        if (!activo || !r) return;
        setFincaSeleccionada(r.finca ? String(r.finca) : "");
        setEstanqueSeleccionado(r.estanque ? String(r.estanque) : "");
        setPesoActual(String(r.pesoActual ?? ""));
        setFechaRegistro(formatearFechaParaUI(r.fechaRegistro));
      } catch (e) {
        if (activo) mostrarError(e);
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarRegistro();
    return () => { activo = false; };
  }, [registroId]);

  const searchEstanqueById = useCallback(
    (targetId) => estanques.find((item) => Number(item.id) === Number(targetId)) ?? null,
    [estanques]
  );

  const estanqueSeleccionadoObj = useMemo(() => {
    if (!estanqueSeleccionado) return null;
    return searchEstanqueById(estanqueSeleccionado);
  }, [estanqueSeleccionado, searchEstanqueById]);

  const opcionesFincas = useMemo(
    () => fincas.map((f) => ({
      label: f.nombre_finca || `Finca ${f.id}`,
      value: String(f.id),
    })),
    [fincas]
  );

  const estanquesFiltrados = useMemo(() => {
    if (!fincaSeleccionada) return [];
    return estanques
      .filter((e) => Number(e.finca_id) === Number(fincaSeleccionada))
      .map((e) => ({
        label: e.codigo || `Estanque ${e.id}`,
        value: String(e.id),
      }));
  }, [fincaSeleccionada, estanques]);

  const handleFincaChange = useCallback((value) => {
    setFincaSeleccionada(value);
    setEstanqueSeleccionado("");
    setErrors((prev) => ({ ...prev, finca: undefined, estanque: undefined }));
    setSuccessMessage("");
    setErrorMessage("");
  }, []);

  const validarCampos = useCallback(() => {
    const next = {};
    if (!fincaSeleccionada) next.finca = "Seleccione una finca.";
    if (!estanqueSeleccionado) next.estanque = "Seleccione un estanque.";
    if (!pesoActual || Number(pesoActual) <= 0) next.peso = "Ingrese un peso actual válido.";
    if (!fechaRegistro) next.fecha = "Seleccione una fecha de registro.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [fincaSeleccionada, estanqueSeleccionado, pesoActual, fechaRegistro]);

  const guardarDatos = useCallback(async () => {
    setSubmitted(true);
    setSuccessMessage("");
    setErrorMessage("");
    if (!validarCampos()) {
      setErrorMessage("Rellenar campos obligatorios.");
      return;
    }
    setIsSaving(true);
    try {
      await CrecimientosLocalService.update(registroId, {
        finca: Number(fincaSeleccionada),
        estanque: Number(estanqueSeleccionado),
        pesoActual: Number(pesoActual),
        fechaRegistro: convertirFechaParaBackend(fechaRegistro),
        colaborador: null,
      });
      setSuccessMessage("Actualizado exitosamente");
      onGuardado?.();
    } catch (e) {
      setErrorMessage(e.message || "Error al actualizar localmente.");
    } finally {
      setIsSaving(false);
    }
  }, [validarCampos, fincaSeleccionada, estanqueSeleccionado, pesoActual, fechaRegistro, registroId, onGuardado]);

  useEffect(() => {
    let activo = true;
    CrecimientosLocalService.getAll()
      .then((data) => {
        if (activo) setCrecimientos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (activo) setCrecimientos([]);
      });
    return () => { activo = false; };
  }, []);

  const pesoAnteriorLabel = useMemo(() => {
    if (!estanqueSeleccionado) return "Peso anterior: -";
    const delEstanque = (crecimientos || []).filter((c) => {
      if (registroId != null && String(c.id) === String(registroId)) return false;
      return Number(c.estanque) === Number(estanqueSeleccionado);
    });
    if (delEstanque.length === 0) return "Peso anterior: -";
    const ordenados = [...delEstanque].sort((a, b) => {
      const fa = String(a.fechaRegistro || "");
      const fb = String(b.fechaRegistro || "");
      return fb.localeCompare(fa);
    });
    const ultimo = ordenados[0];
    const peso = ultimo?.pesoActual;
    return peso !== undefined && peso !== null && peso !== ""
      ? `Peso anterior: ${peso} g`
      : "Peso anterior: -";
  }, [estanqueSeleccionado, crecimientos, registroId]);

  return {
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoActual,
    fechaRegistro,
    opcionesFincas,
    estanquesFiltrados,
    estanqueSeleccionadoObj,
    estanque: estanqueSeleccionadoObj,
    setEstanqueSeleccionado,
    setPesoActual,
    setFechaRegistro,
    handleFincaChange,
    guardarDatos,
    isSaving,
    submitted,
    errors,
    successMessage,
    errorMessage,
    pesoAnteriorLabel,
    mostrarErrorFinca: submitted && Boolean(errors.finca),
    mostrarErrorEstanque: submitted && Boolean(errors.estanque),
    mostrarErrorPeso: submitted && Boolean(errors.peso),
    mostrarErrorFecha: submitted && Boolean(errors.fecha),
    cargando,
  };
}