/**
 * ============================================================
 * HOOK DE FINCA DE CRECIMIENTO
 * ============================================================
 *
 * Centraliza el estado y las operaciones locales
 * correspondientes al modulo de crecimiento.
 *
 * Trabaja contra SQLite usando CrecimientosLocalService.
 */

import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { localApi } from "../../../database/local/localApi.service.js";
import CrecimientosLocalService from "../services/mantCrecimientoLocal.service.js";
import { mantCrecmientoDTO } from "../dtos/mantCrecmiento.dto.js";
import { useError } from "../../../shared/context/ErrorContext.js";

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getFechaHoy() {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, "0");
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const anio = hoy.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaParaInput(hoy) {
  if (!hoy) return getFechaHoy();
  const [anio, mes, dia] = hoy.split("-");
  if (!anio || !mes || !dia) return getFechaHoy();
  return `${dia}/${mes}/${anio}`;
}

export function convertirFechaParaBackend(fechaDDMMYYYY) {
  const [dia, mes, anio] = fechaDDMMYYYY.split("/");
  return `${anio}-${mes}-${dia}`;
}

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export function useFincaCrecimiento() {
  const { mostrarError } = useError();
  const { id } = useLocalSearchParams();
  const parsedId = useMemo(() => {
    if (!id) return null;
    const parsed = parseInt(id, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [id]);

  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [crecimientos, setCrecimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [fincaSeleccionada, setFincaSeleccionada] = useState("");
  const [estanqueSeleccionado, setEstanqueSeleccionado] = useState("");
  const [pesoActual, setPesoActual] = useState("");
  const [fechaRegistro, setFechaRegistro] = useState(getFechaHoy());

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function cargarDatosLocales() {
    setIsLoading(true);
    setLoadError("");
    try {
      await localApi.inicializar();
      const [resFincas, resEstanques, crecimientosData] = await Promise.all([
        localApi.fincas.obtenerTodos(),
        localApi.estanques.obtenerTodos(),
        CrecimientosLocalService.getAll(),
      ]);

      setFincas(resFincas.data || []);
      setEstanques(resEstanques.data || []);
      setCrecimientos(Array.isArray(crecimientosData) ? crecimientosData : []);
    } catch (error) {
      mostrarError(error);
      setLoadError("Ocurrió un error al cargar los datos locales.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarDatosLocales();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
      setSubmitted(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  const searchEstanqueById = useCallback(
    (targetId) => estanques.find((item) => Number(item.id) === Number(targetId)) ?? null,
    [estanques]
  );

  const estanque = useMemo(() => {
    if (parsedId !== null) {
      return searchEstanqueById(parsedId);
    }
    return searchEstanqueById(1);
  }, [parsedId, searchEstanqueById]);

  const estanqueSeleccionadoObj = useMemo(() => {
    if (!estanqueSeleccionado) return null;
    const parsed = parseInt(estanqueSeleccionado, 10);
    return Number.isNaN(parsed) ? null : searchEstanqueById(parsed);
  }, [estanqueSeleccionado, searchEstanqueById]);

  const opcionesFincas = useMemo(
    () => fincas.map((finca) => ({
      label: finca.nombre_finca || `Finca ${finca.id}`,
      value: String(finca.id),
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

  const validarCampos = useCallback(() => {
    const nextErrors = {};
    if (!fincaSeleccionada) nextErrors.finca = "Seleccione una finca.";
    if (!estanqueSeleccionado) nextErrors.estanque = "Seleccione un estanque.";
    if (!pesoActual || Number(pesoActual) <= 0) nextErrors.peso = "Ingrese un peso actual válido.";
    if (!fechaRegistro) nextErrors.fecha = "Seleccione una fecha de registro.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [fincaSeleccionada, estanqueSeleccionado, pesoActual, fechaRegistro]);

  const handleFincaChange = useCallback((value) => {
    setFincaSeleccionada(value);
    setEstanqueSeleccionado("");
    setErrors((prev) => ({ ...prev, finca: undefined, estanque: undefined }));
    setSuccessMessage("");
    setErrorMessage("");
  }, []);

  const handleEstanqueChange = useCallback(
    (value) => {
      setEstanqueSeleccionado(value);
      setSuccessMessage("");
      setErrorMessage("");
      if (submitted) {
        setErrors((prev) => ({ ...prev, estanque: undefined }));
      }
    },
    [submitted]
  );

  const handlePesoActualChange = useCallback(
    (value) => {
      setPesoActual(value);
      setSuccessMessage("");
      setErrorMessage("");
      if (submitted) {
        setErrors((prev) => ({ ...prev, peso: undefined }));
      }
    },
    [submitted]
  );

  const handleFechaRegistroChange = useCallback(
    (value) => {
      setFechaRegistro(value);
      setSuccessMessage("");
      setErrorMessage("");
      if (submitted) {
        setErrors((prev) => ({ ...prev, fecha: undefined }));
      }
    },
    [submitted]
  );

  const guardarDatos = useCallback(async () => {
    setSubmitted(true);
    setSuccessMessage("");
    setErrorMessage("");
    if (!validarCampos()) {
      setErrorMessage("Rellenar campos obligatorios.");
      return;
    }
    setErrors({});
    setIsSaving(true);
    try {
      const crecimientoDTO = new mantCrecmientoDTO({
        finca: Number(fincaSeleccionada),
        estanque: Number(estanqueSeleccionado),
        pesoActual: Number(pesoActual),
        fechaRegistro: convertirFechaParaBackend(fechaRegistro),
      });

      await CrecimientosLocalService.create(crecimientoDTO);
      try {
        const actualizados = await CrecimientosLocalService.getAll();
        setCrecimientos(Array.isArray(actualizados) ? actualizados : []);
      } catch {
        setCrecimientos((prev) => [
          {
            estanque: Number(estanqueSeleccionado),
            pesoActual: Number(pesoActual),
            fechaRegistro: convertirFechaParaBackend(fechaRegistro),
          },
          ...(Array.isArray(prev) ? prev : []),
        ]);
      }
      setFincaSeleccionada("");
      setEstanqueSeleccionado("");
      setPesoActual("");
      setFechaRegistro(getFechaHoy());
      setErrors({});
      setSuccessMessage("Guardado exitosamente");
    } catch (error) {
      setErrorMessage(error.message || "Error al guardar el registro local.");
    } finally {
      setIsSaving(false);
    }
  }, [
    validarCampos,
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoActual,
    fechaRegistro,
  ]);

  const pesoAnteriorLabel = useMemo(() => {
    if (!estanqueSeleccionado) return "Peso anterior: -";
    const delEstanque = (crecimientos || []).filter((c) => {
      return Number(c.estanque) === Number(estanqueSeleccionado);
    });
    if (delEstanque.length === 0) return "Peso anterior: -";
    const ordenados = [...delEstanque].sort((a, b) => {
      const fa = String(a.fechaRegistro || "");
      const fb = String(b.fechaRegistro || "");
      const porFecha = fb.localeCompare(fa);
      if (porFecha !== 0) return porFecha;
      return Number(b.id ?? 0) - Number(a.id ?? 0);
    });
    const ultimo = ordenados[0];
    const peso = ultimo?.pesoActual;
    return peso !== undefined && peso !== null && peso !== ""
      ? `Peso anterior: ${peso} g`
      : "Peso anterior: -";
  }, [estanqueSeleccionado, crecimientos]);

  const mostrarErrorFinca = submitted && Boolean(errors.finca);
  const mostrarErrorEstanque = submitted && Boolean(errors.estanque);
  const mostrarErrorPeso = submitted && Boolean(errors.peso);
  const mostrarErrorFecha = submitted && Boolean(errors.fecha);

  return {
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoActual,
    fechaRegistro,
    opcionesFincas,
    estanquesFiltrados,
    estanqueSeleccionadoObj,
    estanque,
    setEstanqueSeleccionado: handleEstanqueChange,
    setPesoActual: handlePesoActualChange,
    setFechaRegistro: handleFechaRegistroChange,
    handleFincaChange,
    guardarDatos,
    isSaving,
    submitted,
    errors,
    successMessage,
    errorMessage,
    pesoAnteriorLabel,
    mostrarErrorFinca,
    mostrarErrorEstanque,
    mostrarErrorPeso,
    mostrarErrorFecha,
  };
}