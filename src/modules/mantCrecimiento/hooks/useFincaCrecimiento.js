/**
 * ============================================================
 * HOOK DE FINCA DE CRECIMIENTO (SQLite Offline-First)
 * ============================================================
 */

import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { localApi } from "../../../database/local/localApi.service.js";
import CrecimientosLocalService from "../services/mantCrecimientoLocal.service.js";
import { mantCrecmientoDTO } from "../dtos/mantCrecmiento.dto.js";
import { useError } from "../../../shared/context/ErrorContext.js";

function getFechaHoy() {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, "0");
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const anio = hoy.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaParaInput(hoy) {
  if (!hoy) return getFechaHoy();
  const partes = String(hoy).trim().split("/");
  if (partes.length === 3) return hoy;

  const d = new Date(hoy);
  if (Number.isNaN(d.getTime())) return getFechaHoy();

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

function convertirFechaParaBackend(fechaString) {
  if (!fechaString) return new Date().toISOString();
  const partes = String(fechaString).trim().split("/");
  if (partes.length !== 3) return new Date().toISOString();
  const [dia, mes, anio] = partes;
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function calcularPromedio(cantStr, pesoStr) {
  const cant = Number(cantStr);
  const peso = Number(pesoStr);
  if (Number.isNaN(cant) || Number.isNaN(peso) || cant <= 0 || peso <= 0) {
    return null;
  }
  return peso / cant;
}

function formatearPeso(valor) {
  if (valor == null || Number.isNaN(Number(valor))) return "-";
  return Number(valor).toFixed(2);
}

let calcIdSeq = 1;

export function useFincaCrecimiento() {
  const params = useLocalSearchParams();
  const { mostrarError } = useError();

  const [fincaSeleccionada, setFincaSeleccionada] = useState("");
  const [estanqueSeleccionado, setEstanqueSeleccionado] = useState("");
  const [fechaRegistro, setFechaRegistro] = useState(getFechaHoy());

  const [calculos, setCalculos] = useState([]);
  const [cantidadIndividuos, setCantidadIndividuos] = useState("");
  const [pesoTotal, setPesoTotal] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [crecimientos, setCrecimientos] = useState([]);

  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const totalActual = useMemo(() => {
    return calcularPromedio(cantidadIndividuos, pesoTotal);
  }, [cantidadIndividuos, pesoTotal]);

  const pesoPromedioCalculado = useMemo(() => {
    if (calculos.length === 0) {
      const cant = Number(cantidadIndividuos);
      const peso = Number(pesoTotal);
      if (!Number.isNaN(cant) && !Number.isNaN(peso) && cant > 0 && peso > 0) {
        return peso / cant;
      }
      return null;
    }
    const sumaPromedios = calculos.reduce((acc, c) => acc + (c.promedio || 0), 0);
    return sumaPromedios / calculos.length;
  }, [calculos, cantidadIndividuos, pesoTotal]);

  useEffect(() => {
    if (params?.fincaId) setFincaSeleccionada(String(params.fincaId));
    if (params?.estanqueId) setEstanqueSeleccionado(String(params.estanqueId));
  }, [params?.fincaId, params?.estanqueId]);

  useEffect(() => {
    let activo = true;
    async function cargarDatosLocales() {
      try {
        await localApi.inicializar();
        const [resFincas, resEstanques, resCrecimientos] = await Promise.all([
          localApi.fincas?.obtenerTodos?.().then((r) => r.data).catch(() => []),
          localApi.estanques?.obtenerTodos?.().then((r) => r.data).catch(() => []),
          CrecimientosLocalService.getAll().catch(() => []),
        ]);
        if (!activo) return;
        setFincas(Array.isArray(resFincas) ? resFincas : []);
        setEstanques(Array.isArray(resEstanques) ? resEstanques : []);
        setCrecimientos(Array.isArray(resCrecimientos) ? resCrecimientos : []);
      } catch (error) {
        if (activo) mostrarError(error);
      }
    }
    cargarDatosLocales();
    return () => {
      activo = false;
    };
  }, [mostrarError]);

  const opcionesFincas = useMemo(() => {
    return fincas.map((f) => ({
      label: f.nombre_finca || f.nombreFinca || f.nombre || `Finca ${f.id}`,
      value: String(f.id),
    }));
  }, [fincas]);

  const estanquesFiltrados = useMemo(() => {
    if (!fincaSeleccionada) return [];
    return estanques
      .filter(
        (e) =>
          String(e.finca_id ?? e.idFinca ?? e.fincaId ?? e.finca) === String(fincaSeleccionada)
      )
      .map((e) => ({
        label: e.codigo || e.nombre || `Estanque ${e.id}`,
        value: String(e.id),
      }));
  }, [estanques, fincaSeleccionada]);

  const estanqueSeleccionadoObj = useMemo(() => {
    if (!estanqueSeleccionado) return null;
    return estanques.find((e) => String(e.id) === String(estanqueSeleccionado)) || null;
  }, [estanques, estanqueSeleccionado]);

  const estanque = useMemo(() => {
    if (!estanqueSeleccionadoObj) return undefined;
    return {
      id: estanqueSeleccionadoObj.id,
      nombre: estanqueSeleccionadoObj.codigo || estanqueSeleccionadoObj.nombre,
      fincaId: estanqueSeleccionadoObj.finca_id || estanqueSeleccionadoObj.idFinca,
    };
  }, [estanqueSeleccionadoObj]);

  const ultimoCrecimientoEstanque = useMemo(() => {
    if (!estanqueSeleccionado) return null;
    const listaEstanque = crecimientos.filter(
      (c) => String(c.estanque || c.estanqueId) === String(estanqueSeleccionado)
    );
    if (listaEstanque.length === 0) return null;

    return listaEstanque.reduce((masReciente, item) => {
      const fechaActual = new Date(item.fechaRegistro || item.fecha);
      const fechaMasReciente = new Date(masReciente.fechaRegistro || masReciente.fecha);
      return fechaActual > fechaMasReciente ? item : masReciente;
    }, listaEstanque[0]);
  }, [crecimientos, estanqueSeleccionado]);

  const pesoAnteriorLabel = useMemo(() => {
    if (!estanqueSeleccionado) return "Peso anterior: -";
    if (!ultimoCrecimientoEstanque) return "Peso anterior: Sin registros";
    const peso = ultimoCrecimientoEstanque.pesoActual ?? ultimoCrecimientoEstanque.peso;
    return `Peso anterior: ${formatearPeso(peso)} g`;
  }, [estanqueSeleccionado, ultimoCrecimientoEstanque]);

  const limpiarFormCalculo = useCallback(() => {
    setCantidadIndividuos("");
    setPesoTotal("");
    setEditandoId(null);
  }, []);

  const handleFincaChange = useCallback(
    (value) => {
      setFincaSeleccionada(value);
      setEstanqueSeleccionado("");
      setSuccessMessage("");
      setErrorMessage("");
      if (submitted) {
        setErrors((prev) => ({ ...prev, finca: undefined, estanque: undefined }));
      }
    },
    [submitted]
  );

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

  const handleCantidadChange = useCallback((value) => {
    setCantidadIndividuos(value);
    setSuccessMessage("");
    setErrorMessage("");
    setErrors((prev) => ({ ...prev, cantidad: undefined }));
  }, []);

  const handlePesoTotalChange = useCallback((value) => {
    setPesoTotal(value);
    setSuccessMessage("");
    setErrorMessage("");
    setErrors((prev) => ({ ...prev, pesoTotal: undefined }));
  }, []);

  const agregarCalculo = useCallback(() => {
    const cant = Number(cantidadIndividuos);
    const peso = Number(pesoTotal);
    const nextErrors = {};

    if (cantidadIndividuos === "" || Number.isNaN(cant) || cant <= 0) {
      nextErrors.cantidad = "Ingrese una cantidad mayor que cero.";
    }
    if (pesoTotal === "" || Number.isNaN(peso) || peso <= 0) {
      nextErrors.pesoTotal = "Ingrese un peso total mayor que cero.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      setErrorMessage("Cantidad y peso total deben ser mayores que cero.");
      setSubmitted(true);
      return;
    }

    const promedio = calcularPromedio(cantidadIndividuos, pesoTotal);
    if (promedio === null || promedio <= 0) {
      setErrors((prev) => ({
        ...prev,
        cantidad: "Ingrese una cantidad válida.",
        pesoTotal: "Ingrese un peso total válido.",
      }));
      setErrorMessage("Ingrese cantidad y peso total válidos.");
      setSubmitted(true);
      return;
    }

    const item = {
      id: editandoId ?? calcIdSeq++,
      cantidad: Number(cantidadIndividuos),
      pesoTotal: Number(pesoTotal),
      promedio,
    };

    setCalculos((prev) => {
      if (editandoId != null) {
        return prev.map((c) => (c.id === editandoId ? item : c));
      }
      return [...prev, item];
    });

    limpiarFormCalculo();
    setErrorMessage("");
    setErrors((prev) => ({
      ...prev,
      calculos: undefined,
      cantidad: undefined,
      pesoTotal: undefined,
    }));
  }, [cantidadIndividuos, pesoTotal, editandoId, limpiarFormCalculo]);

  const editarCalculo = useCallback((calculo) => {
    setCantidadIndividuos(String(calculo.cantidad));
    setPesoTotal(String(calculo.pesoTotal));
    setEditandoId(calculo.id);
  }, []);

  const eliminarCalculo = useCallback(
    (idCalculo) => {
      setCalculos((prev) => prev.filter((c) => c.id !== idCalculo));
      if (editandoId === idCalculo) {
        limpiarFormCalculo();
      }
    },
    [editandoId, limpiarFormCalculo]
  );

  const validarCampos = useCallback(() => {
    const nextErrors = {};

    if (!fincaSeleccionada) nextErrors.finca = "Seleccione una finca.";
    if (!estanqueSeleccionado) nextErrors.estanque = "Seleccione un estanque.";
    if (!fechaRegistro) nextErrors.fecha = "Seleccione una fecha de registro.";
    if (!calculos.length) {
      const cant = Number(cantidadIndividuos);
      const peso = Number(pesoTotal);
      const formLleno =
        cantidadIndividuos !== "" &&
        pesoTotal !== "" &&
        !Number.isNaN(cant) &&
        !Number.isNaN(peso) &&
        cant > 0 &&
        peso > 0;

      if (formLleno) {
        nextErrors.calculos = "Debe agregar el cálculo para poder guardarlo.";
      } else {
        nextErrors.calculos = "Agregue al menos un cálculo de muestreo.";
        if (cantidadIndividuos === "" || Number.isNaN(cant) || cant <= 0) {
          nextErrors.cantidad = "Ingrese una cantidad mayor que cero.";
        }
        if (pesoTotal === "" || Number.isNaN(peso) || peso <= 0) {
          nextErrors.pesoTotal = "Ingrese un peso total mayor que cero.";
        }
      }
    } else {
      const invalidos = calculos.some(
        (c) =>
          !c.cantidad ||
          Number(c.cantidad) <= 0 ||
          !c.pesoTotal ||
          Number(c.pesoTotal) <= 0
      );
      if (invalidos) {
        nextErrors.calculos = "Todos los cálculos deben tener cantidad y peso mayores que cero.";
      }
    }

    setErrors(nextErrors);
    const keys = Object.keys(nextErrors);
    if (keys.length === 0) return { ok: true, mensaje: "" };

    const mensaje =
      nextErrors.calculos ||
      nextErrors.finca ||
      nextErrors.estanque ||
      nextErrors.fecha ||
      "Rellenar campos obligatorios.";

    return { ok: false, mensaje };
  }, [fincaSeleccionada, estanqueSeleccionado, fechaRegistro, calculos, cantidadIndividuos, pesoTotal]);

  const guardarDatos = useCallback(async () => {
    setSubmitted(true);
    setSuccessMessage("");
    setErrorMessage("");

    const validacion = validarCampos();
    if (!validacion.ok) {
      setErrorMessage(validacion.mensaje);
      return;
    }

    const pesoFinal = pesoPromedioCalculado;
    if (pesoFinal === null || pesoFinal < 0) {
      setErrorMessage("No se pudo calcular el peso promedio.");
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      const crecimientoDTO = new mantCrecmientoDTO({
        finca: Number(fincaSeleccionada),
        estanque: Number(estanqueSeleccionado),
        pesoActual: Number(Number(pesoFinal).toFixed(2)),
        fechaRegistro: convertirFechaParaBackend(fechaRegistro),
        muestreos: calculos.map((c, index) => ({
          cantidad: c.cantidad,
          pesoTotal: c.pesoTotal,
          pesoPromedio: Number(Number(c.promedio).toFixed(2)),
          orden: index + 1,
        })),
      });

      await CrecimientosLocalService.create(crecimientoDTO);
      const actualizados = await CrecimientosLocalService.getAll();
      setCrecimientos(Array.isArray(actualizados) ? actualizados : []);

      setFincaSeleccionada("");
      setEstanqueSeleccionado("");
      setFechaRegistro(getFechaHoy());
      setCalculos([]);
      limpiarFormCalculo();
      setErrors({});
      setSubmitted(false);
      setSuccessMessage("Guardado exitosamente");
    } catch (error) {
      mostrarError(error);
    } finally {
      setIsSaving(false);
    }
  }, [
    validarCampos,
    pesoPromedioCalculado,
    fincaSeleccionada,
    estanqueSeleccionado,
    fechaRegistro,
    calculos,
    limpiarFormCalculo,
    mostrarError,
  ]);

  const mostrarErrorFinca = submitted && Boolean(errors.finca);
  const mostrarErrorEstanque = submitted && Boolean(errors.estanque);
  const mostrarErrorFecha = submitted && Boolean(errors.fecha);
  const mostrarErrorCalculos = submitted && Boolean(errors.calculos);
  const mostrarErrorCantidad = submitted && Boolean(errors.cantidad);
  const mostrarErrorPesoTotal = submitted && Boolean(errors.pesoTotal);

  return {
    fincaSeleccionada,
    estanqueSeleccionado,
    fechaRegistro,
    opcionesFincas,
    estanquesFiltrados,
    estanqueSeleccionadoObj,
    estanque,
    setEstanqueSeleccionado: handleEstanqueChange,
    setFechaRegistro: handleFechaRegistroChange,
    handleFincaChange,

    calculos,
    cantidadIndividuos,
    pesoTotal,
    totalActual,
    pesoPromedioCalculado,
    editandoId,
    handleCantidadChange,
    handlePesoTotalChange,
    agregarCalculo,
    editarCalculo,
    eliminarCalculo,
    formatearPeso,

    guardarDatos,
    isSaving,
    submitted,
    errors,
    successMessage,
    errorMessage,
    pesoAnteriorLabel,
    mostrarErrorFinca,
    mostrarErrorEstanque,
    mostrarErrorFecha,
    mostrarErrorCalculos,
    mostrarErrorCantidad,
    mostrarErrorPesoTotal,
  };
}