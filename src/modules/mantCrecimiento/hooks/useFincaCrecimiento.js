/**
 * ============================================================
 * HOOK DE FINCA DE CRECIMIENTO
 * ============================================================
 */

import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import FincaLocalService from "../../finca/services/fincaLocal.service.js";
import EstanqueLocalService from "../../estanques/services/EstanqueLocal.service.js";
import CrecimientosLocalService from "../services/mantCrecimientoLocal.service.js";
import { mantCrecmientoDTO } from "../dtos/mantCrecmiento.dto.js";
import { useError } from "../../../shared/context/ErrorContext.js";
import { localApi } from "../../../database/local/localApi.service";

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

function calcularPromedio(cantidad, pesoTotal) {
  const c = Number(cantidad);
  const p = Number(pesoTotal);

  if (!c || c <= 0 || Number.isNaN(c) || Number.isNaN(p)) return null;

  return p / c;
}

function formatearPeso(valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "-";

  return Number(valor).toFixed(2);
}

function obtenerValor(objeto, llaves, valorDefecto = null) {
  if (!objeto) return valorDefecto;

  for (let i = 0; i < llaves.length; i += 1) {
    const llave = llaves[i];

    if (
      Object.prototype.hasOwnProperty.call(objeto, llave) &&
      objeto[llave] !== undefined &&
      objeto[llave] !== null &&
      String(objeto[llave]).trim() !== ""
    ) {
      return objeto[llave];
    }
  }

  return valorDefecto;
}

function obtenerNumero(valor, valorDefecto = 0) {
  const numero = Number(String(valor ?? "").replace(",", "."));

  return Number.isNaN(numero) ? valorDefecto : numero;
}

function obtenerTexto(valor, valorDefecto = "") {
  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === ""
  ) {
    return valorDefecto;
  }

  return String(valor).trim();
}

function obtenerIdLocalFinca(finca) {
  return obtenerNumero(
    obtenerValor(
      finca,
      ["id", "idLocal", "id_local"],
      0
    )
  );
}

function obtenerServidorIdFinca(finca) {
  return obtenerNumero(
    obtenerValor(
      finca,
      ["servidor_id", "servidorId", "idServidor"],
      0
    )
  );
}

function obtenerIdFinca(finca) {
  const idLocal = obtenerIdLocalFinca(finca);
  const servidorId = obtenerServidorIdFinca(finca);

  if (idLocal > 0) {
    return idLocal;
  }

  return servidorId;
}

function obtenerIdsValidosFinca(finca, fincaSeleccionada = null) {
  const ids = [
    obtenerNumero(fincaSeleccionada),
    obtenerIdLocalFinca(finca),
    obtenerServidorIdFinca(finca),
  ];

  return ids.filter(function (id, index, arreglo) {
    return id > 0 && arreglo.indexOf(id) === index;
  });
}

function fincaCoincideConSeleccion(finca, fincaSeleccionada) {
  const idsValidos = obtenerIdsValidosFinca(finca, fincaSeleccionada);

  return idsValidos.includes(obtenerNumero(fincaSeleccionada));
}

function obtenerIdsValidosDeFincaSeleccionada(fincas, fincaSeleccionada) {
  const fincaActual = fincas.find(function (finca) {
    return fincaCoincideConSeleccion(finca, fincaSeleccionada);
  });

  return obtenerIdsValidosFinca(fincaActual, fincaSeleccionada);
}

function obtenerNombreFinca(finca, id) {
  return obtenerTexto(
    obtenerValor(
      finca,
      [
        "nombreFinca",
        "nombre_finca",
        "nombre",
        "codigoCBO",
        "codigoCbo",
        "codigo_cbo",
      ],
      ""
    ),
    `Finca ${id}`
  );
}

function obtenerIdLocalEstanque(estanque) {
  return obtenerNumero(
    obtenerValor(
      estanque,
      ["id", "idLocal", "id_local"],
      0
    )
  );
}

function obtenerServidorIdEstanque(estanque) {
  return obtenerNumero(
    obtenerValor(
      estanque,
      ["servidor_id", "servidorId", "idServidor"],
      0
    )
  );
}

function obtenerIdEstanque(estanque) {
  const idLocal = obtenerIdLocalEstanque(estanque);
  const servidorId = obtenerServidorIdEstanque(estanque);

  if (idLocal > 0) {
    return idLocal;
  }

  return servidorId;
}

function obtenerIdsValidosEstanque(estanque, estanqueSeleccionado = null) {
  const ids = [
    obtenerNumero(estanqueSeleccionado),
    obtenerIdLocalEstanque(estanque),
    obtenerServidorIdEstanque(estanque),
  ];

  return ids.filter(function (id, index, arreglo) {
    return id > 0 && arreglo.indexOf(id) === index;
  });
}

function estanqueCoincideConSeleccion(estanque, estanqueSeleccionado) {
  const idsValidos = obtenerIdsValidosEstanque(estanque, estanqueSeleccionado);

  return idsValidos.includes(obtenerNumero(estanqueSeleccionado));
}

function obtenerFincaIdEstanque(estanque) {
  return obtenerNumero(
    obtenerValor(
      estanque,
      ["finca_id", "fincaId", "idFinca", "id_finca"],
      0
    )
  );
}

function estanquePerteneceAFinca(estanque, idsValidosFinca) {
  const fincaIdEstanque = obtenerFincaIdEstanque(estanque);

  return idsValidosFinca.includes(fincaIdEstanque);
}

function obtenerNombreEstanque(estanque, id) {
  return obtenerTexto(
    obtenerValor(
      estanque,
      ["codigo", "nombre", "estanqueCodigo"],
      ""
    ),
    `Estanque ${id}`
  );
}

let calcIdSeq = 1;

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
  const [fechaRegistro, setFechaRegistro] = useState(getFechaHoy());

  const [calculos, setCalculos] = useState([]);
  const [cantidadIndividuos, setCantidadIndividuos] = useState("0");
  const [pesoTotal, setPesoTotal] = useState("0");
  const [editandoId, setEditandoId] = useState(null);

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function cargarDatos() {
    setIsLoading(true);
    setLoadError("");

    try {
      if (typeof localApi.inicializar === "function") {
        await localApi.inicializar();
      }

      const [
        fincasData,
        estanquesData,
        crecimientosData,
      ] = await Promise.all([
        FincaLocalService.getFincas(),
        EstanqueLocalService.getEstanques(),
        CrecimientosLocalService.getAll(),
      ]);

      setFincas(Array.isArray(fincasData) ? fincasData : []);
      setEstanques(Array.isArray(estanquesData) ? estanquesData : []);
      setCrecimientos(
        Array.isArray(crecimientosData)
          ? crecimientosData
          : []
      );
    } catch (error) {
      mostrarError(error);
      setLoadError("Ocurrio un error al cargar fincas y estanques");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return undefined;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
      setSubmitted(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  const searchEstanqueById = useCallback(
    (targetId) =>
      estanques.find(function (item) {
        return estanqueCoincideConSeleccion(item, targetId);
      }) ?? null,
    [estanques]
  );

  const estanque = useMemo(() => {
    if (parsedId !== null) return searchEstanqueById(parsedId);

    return searchEstanqueById(1);
  }, [parsedId, searchEstanqueById]);

  const estanqueSeleccionadoObj = useMemo(() => {
    if (!estanqueSeleccionado) return null;

    const parsed = parseInt(estanqueSeleccionado, 10);

    if (Number.isNaN(parsed)) return null;

    return searchEstanqueById(parsed);
  }, [estanqueSeleccionado, searchEstanqueById]);

  const opcionesFincas = useMemo(
    () =>
      fincas
        .map(function (finca) {
          const id = obtenerIdFinca(finca);

          return {
            label: obtenerNombreFinca(finca, id),
            value: id,
          };
        })
        .filter(function (item) {
          return Number(item.value) > 0;
        }),
    [fincas]
  );

  const estanquesFiltrados = useMemo(
    () => {
      if (!fincaSeleccionada) {
        return [];
      }

      const idsValidosFinca = obtenerIdsValidosDeFincaSeleccionada(
        fincas,
        fincaSeleccionada
      );

      return estanques
        .filter(function (estanqueItem) {
          return estanquePerteneceAFinca(estanqueItem, idsValidosFinca);
        })
        .map(function (estanqueItem) {
          const id = obtenerIdEstanque(estanqueItem);

          return {
            label: obtenerNombreEstanque(estanqueItem, id),
            value: id,
          };
        })
        .filter(function (item) {
          return Number(item.value) > 0;
        });
    },
    [
      fincaSeleccionada,
      fincas,
      estanques,
    ]
  );

  const totalActual = useMemo(
    () => calcularPromedio(cantidadIndividuos, pesoTotal),
    [cantidadIndividuos, pesoTotal]
  );

  const pesoPromedioCalculado = useMemo(() => {
    if (!calculos.length) return null;

    const suma = calculos.reduce((acc, c) => acc + Number(c.promedio), 0);

    return suma / calculos.length;
  }, [calculos]);

  const pesoAnteriorLabel = useMemo(() => {
    if (!estanqueSeleccionado) return "Peso anterior: -";

    const estanqueActual = searchEstanqueById(estanqueSeleccionado);
    const idsValidosEstanque = obtenerIdsValidosEstanque(
      estanqueActual,
      estanqueSeleccionado
    );

    const delEstanque = (crecimientos || []).filter((c) => {
      const idEst = Number(c.estanque ?? c.estanqueId ?? c.estanque_id);

      return idsValidosEstanque.includes(idEst);
    });

    if (delEstanque.length === 0) return "Peso anterior: -";

    const ordenados = [...delEstanque].sort((a, b) => {
      const fa = String(a.fechaRegistro ?? a.fecha_registro ?? a.fecha ?? "");
      const fb = String(b.fechaRegistro ?? b.fecha_registro ?? b.fecha ?? "");
      const porFecha = fb.localeCompare(fa);

      if (porFecha !== 0) return porFecha;

      return Number(b.id ?? 0) - Number(a.id ?? 0);
    });

    const ultimo = ordenados[0];
    const peso = ultimo?.pesoActual ?? ultimo?.peso_actual;

    return peso !== undefined && peso !== null && peso !== ""
      ? `Peso anterior: ${peso} g`
      : "Peso anterior: -";
  }, [
    estanqueSeleccionado,
    crecimientos,
    searchEstanqueById,
  ]);

  const limpiarFormCalculo = useCallback(() => {
    setCantidadIndividuos("0");
    setPesoTotal("0");
    setEditandoId(null);
  }, []);

  const handleFincaChange = useCallback((value) => {
    setFincaSeleccionada(value);
    setEstanqueSeleccionado("");
    setErrors((prev) => ({
      ...prev,
      finca: undefined,
      estanque: undefined,
    }));
    setSuccessMessage("");
    setErrorMessage("");
  }, []);

  const handleEstanqueChange = useCallback(
    (value) => {
      setEstanqueSeleccionado(value);
      setSuccessMessage("");
      setErrorMessage("");

      if (submitted) {
        setErrors((prev) => ({
          ...prev,
          estanque: undefined,
        }));
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
        setErrors((prev) => ({
          ...prev,
          fecha: undefined,
        }));
      }
    },
    [submitted]
  );

  const handleCantidadChange = useCallback((value) => {
    setCantidadIndividuos(value);
    setSuccessMessage("");
    setErrorMessage("");
    setErrors((prev) => ({
      ...prev,
      cantidad: undefined,
    }));
  }, []);

  const handlePesoTotalChange = useCallback((value) => {
    setPesoTotal(value);
    setSuccessMessage("");
    setErrorMessage("");
    setErrors((prev) => ({
      ...prev,
      pesoTotal: undefined,
    }));
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
      setErrors((prev) => ({
        ...prev,
        ...nextErrors,
      }));
      setErrorMessage("Cantidad y peso total deben ser mayores que cero.");
      setSubmitted(true);
      return;
    }

    const promedio = calcularPromedio(cantidadIndividuos, pesoTotal);

    if (promedio === null || promedio <= 0) {
      setErrors((prev) => ({
        ...prev,
        cantidad: "Ingrese una cantidad valida.",
        pesoTotal: "Ingrese un peso total valido.",
      }));
      setErrorMessage("Ingrese cantidad y peso total validos.");
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
  }, [
    cantidadIndividuos,
    pesoTotal,
    editandoId,
    limpiarFormCalculo,
  ]);

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
    [
      editandoId,
      limpiarFormCalculo,
    ]
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
        nextErrors.calculos =
          "Debe agregar el cálculo para poder guardarlo.";
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
        nextErrors.calculos =
          "Todos los cálculos deben tener cantidad y peso mayores que cero.";
      }
    }

    setErrors(nextErrors);

    const keys = Object.keys(nextErrors);

    if (keys.length === 0) {
      return {
        ok: true,
        mensaje: "",
      };
    }

    const mensaje =
      nextErrors.calculos ||
      nextErrors.finca ||
      nextErrors.estanque ||
      nextErrors.fecha ||
      "Rellenar campos obligatorios.";

    return {
      ok: false,
      mensaje,
    };
  }, [
    fincaSeleccionada,
    estanqueSeleccionado,
    fechaRegistro,
    calculos,
    cantidadIndividuos,
    pesoTotal,
  ]);

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
          cantidad: Number(c.cantidad),
          pesoTotal: Number(c.pesoTotal),
          pesoPromedio: Number(Number(c.promedio).toFixed(2)),
          orden: index + 1,
        })),
      });

      await CrecimientosLocalService.create(crecimientoDTO);

      try {
        const actualizados = await CrecimientosLocalService.getAll();

        setCrecimientos(
          Array.isArray(actualizados)
            ? actualizados
            : []
        );
      } catch {
        /* ok */
      }

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