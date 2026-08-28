/**
 * ============================================================
 * HOOK DE REGISTRO DE VENTAS (SQLite Offline-First)
 * ============================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { useFocusEffect } from "expo-router";

import VentasLocalService from "../services/mantVentasLocal.service.js";
import { MantVentaDTO } from "../dtos/mantVenta.dto.js";
import { localApi } from "../../../database/local/localApi.service.js";
import { styles } from "../styles/VentaStyles.js";
import { COLORS } from "../../../theme/colors.js";
import Text from "../../../shared/components/Text.jsx";
import Icon from "../../../shared/components/Icons.jsx";

export const CLIENTE_GENERICO = {
  id: "cliente-generico",
  nombre: "Cliente genérico",
  telefono: "",
};

/*
============================================================
HELPERS DE FECHA Y NÚMEROS (traídos/mejorados del web)
============================================================
*/

export function obtenerFechaActual() {
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();

  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaParaInput(fecha) {
  if (!fecha) return obtenerFechaActual();

  const [anio, mes, dia] = fecha.split("-");

  if (!anio || !mes || !dia) return obtenerFechaActual();

  return `${dia}/${mes}/${anio}`;
}

export function convertirFechaParaBackend(fechaDDMMYYYY) {
  if (!fechaDDMMYYYY) return new Date().toISOString().slice(0, 10);

  const [dia, mes, anio] = fechaDDMMYYYY.split("/");
  if (!dia || !mes || !anio) return new Date().toISOString().slice(0, 10);

  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function limpiarDecimal(value) {
  const texto = String(value).replace(",", ".");
  const partes = texto.replace(/[^0-9.]/g, "").split(".");

  if (partes.length === 1) {
    return partes[0];
  }

  return `${partes[0]}.${partes.slice(1).join("")}`;
}

export function normalizarDecimal(value, decimales = 1) {
  const numero = Number(limpiarDecimal(value));

  if (Number.isNaN(numero) || numero < 0) {
    return "0";
  }

  return numero.toFixed(decimales).replace(/\.0$/, "");
}

export function formatearMontoColones(value) {
  const numero = Math.round(Number(value) || 0);
  return `₡ ${String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/*
============================================================
HELPERS GENERALES (se mantienen del offline)
============================================================
*/

function obtenerDataRespuesta(respuesta) {
  if (
    respuesta &&
    Object.prototype.hasOwnProperty.call(respuesta, "data")
  ) {
    return respuesta.data;
  }

  return respuesta;
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

/*
============================================================
HELPERS DE FINCAS
============================================================
*/

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

function obtenerIdsValidosDeFincaSeleccionada(
  fincas,
  fincaSeleccionada
) {
  const fincaActual = fincas.find(function (finca) {
    return (
      obtenerIdLocalFinca(finca) ===
      obtenerNumero(fincaSeleccionada)
    );
  });

  if (!fincaActual) {
    return [];
  }

  return [
    obtenerIdLocalFinca(fincaActual),
  ];
}

function obtenerNombreFinca(finca, id) {
  return obtenerTexto(
    obtenerValor(
      finca,
      [
        "nombre_finca",
        "nombreFinca",
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

/*
============================================================
HELPERS DE ESTANQUES
============================================================
*/

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

function obtenerFincaIdEstanque(estanque) {
  return obtenerNumero(
    obtenerValor(
      estanque,
      ["finca_id", "idFinca", "fincaId", "finca", "id_finca"],
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

/*
============================================================
HELPERS DE VALIDACION
============================================================
*/

export function validarVentaFormulario({
  fincaSeleccionada,
  estanqueSeleccionado,
  pesoPromedio,
  kilosVendidos,
  precioKiloNumero,
  colaboradorSeleccionado,
  compradorSeleccionado,
  fechaVenta,
}) {
  const errores = {};

  if (!fincaSeleccionada) errores.finca = true;
  if (!estanqueSeleccionado) errores.estanque = true;

  const peso = Number(pesoPromedio);
  if (!pesoPromedio || Number.isNaN(peso) || peso <= 0 || peso > 50) {
    errores.pesoPromedio = true;
  }

  const kilos = Number(kilosVendidos);
  if (kilosVendidos === "" || Number.isNaN(kilos) || kilos <= 0) {
    errores.kilosVendidos = true;
  }

  if (precioKiloNumero <= 0) {
    errores.precioKilo = true;
  }

  if (!compradorSeleccionado) {
    errores.comprador = true;
  }

  // Validar que la fecha no sea futura
  if (fechaVenta) {
    const [dia, mes, anio] = fechaVenta.split("/");
    if (dia && mes && anio) {
      const fechaSeleccionada = new Date(Number(anio), Number(mes) - 1, Number(dia));
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaSeleccionada > hoy) {
        errores.fecha = true;
      }
    }
  }

  return errores;
}

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export function useVenta() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const [fincaSeleccionada, setFincaSeleccionada] = useState("");
  const [estanqueSeleccionado, setEstanqueSeleccionado] = useState("");
  const [pesoPromedio, setPesoPromedio] = useState("0"); // ← ahora inicia en 0
  const [kilosVendidos, setKilosVendidos] = useState("0");
  const [precioKilo, setPrecioKilo] = useState("0");
  const [fechaVenta, setFechaVenta] = useState(obtenerFechaActual());
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState("");
  const [compradorSeleccionado, setCompradorSeleccionado] = useState("");

  const [colaboradores, setColaboradores] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [compradoresData, setCompradoresData] = useState([]);

  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [ventas, setVentas] = useState([]);

  /*
  ============================================================
  CARGA DE CATALOGOS SQLITE
  ============================================================
  */

  const cargarCatalogos = useCallback(async () => {
    try {
      await localApi.inicializar();

      const [
        resColaboradores,
        resFincas,
        resEstanques,
        resCompradores,
      ] = await Promise.all([
        localApi.colaboradores?.obtenerTodos?.().catch(() => ({ data: [] })),
        localApi.fincas?.obtenerTodos?.().catch(() => ({ data: [] })),
        localApi.estanques?.obtenerTodos?.().catch(() => ({ data: [] })),
        localApi.compradores?.obtenerTodos?.().catch(() => ({ data: [] })),
      ]);

      const colaboradoresData = obtenerDataRespuesta(resColaboradores);
      const fincasData = obtenerDataRespuesta(resFincas);
      const estanquesData = obtenerDataRespuesta(resEstanques);
      const compradores = obtenerDataRespuesta(resCompradores);

      setColaboradores(
        Array.isArray(colaboradoresData) ? colaboradoresData : []
      );

      setFincas(
        Array.isArray(fincasData) ? fincasData : []
      );

      setEstanques(
        Array.isArray(estanquesData) ? estanquesData : []
      );

      setCompradoresData(
        Array.isArray(compradores) ? compradores : []
      );
    } catch (error) {
      setColaboradores([]);
      setFincas([]);
      setEstanques([]);
      setCompradoresData([]);
    }
  }, []);

  /*
  ============================================================
  OPCIONES DE SELECT
  ============================================================
  */

  const opcionesFincas = useMemo(
    () =>
      fincas
        .map(function (finca) {
          const id = obtenerIdFinca(finca);

          return {
            label: obtenerNombreFinca(finca, id),
            value: String(id),
          };
        })
        .filter(function (item) {
          return Number(item.value) > 0;
        }),
    [fincas]
  );

  const estanquesFiltrados = useMemo(() => {
    if (!fincaSeleccionada) {
      return [];
    }

    const idsValidosFinca = obtenerIdsValidosDeFincaSeleccionada(
      fincas,
      fincaSeleccionada
    );

    return estanques
      .filter(function (estanque) {
        return estanquePerteneceAFinca(estanque, idsValidosFinca);
      })
      .map(function (estanque) {
        const id = obtenerIdEstanque(estanque);

        return {
          label: obtenerNombreEstanque(estanque, id),
          value: String(id),
        };
      })
      .filter(function (item) {
        return Number(item.value) > 0;
      });
  }, [fincaSeleccionada, fincas, estanques]);

  const opcionesColaboradores = useMemo(
    () =>
      colaboradores
        .map(function (colaborador) {
          const id = obtenerNumero(
            obtenerValor(
              colaborador,
              ["id", "idLocal", "id_local", "servidor_id", "servidorId"],
              0
            )
          );

          return {
            label: obtenerTexto(
              obtenerValor(
                colaborador,
                ["nombre", "nombreCompleto", "nombre_completo"],
                ""
              ),
              `Colaborador ${id}`
            ),
            value: String(id),
          };
        })
        .filter(function (item) {
          return Number(item.value) > 0;
        }),
    [colaboradores]
  );

  const opcionesCompradores = useMemo(
    () => [
      { label: "Cliente genérico", value: "cliente-generico" },
      ...compradoresData
        .map(function (comprador) {
          const id = obtenerNumero(
            obtenerValor(
              comprador,
              ["id", "idLocal", "id_local", "servidor_id", "servidorId"],
              0
            )
          );

          return {
            label: obtenerTexto(
              obtenerValor(
                comprador,
                ["nombre", "nombreComprador", "nombre_comprador"],
                ""
              ),
              `Comprador ${id}`
            ),
            value: String(id),
          };
        })
        .filter(function (item) {
          return Number(item.value) > 0;
        }),
    ],
    [compradoresData]
  );

  /*
  ============================================================
  CALCULOS Y ESTILOS
  ============================================================
  */

  const precioKiloNumero = Number(precioKilo || 0);
  const totalVenta = Number(kilosVendidos || 0) * precioKiloNumero;

  const gridStyle = useMemo(
    () => (isWide ? styles.inputRow : styles.inputGrid),
    [isWide]
  );

  const errorInputStyle = useMemo(
    () => ({
      borderColor: COLORS.error,
      backgroundColor: COLORS.surface,
    }),
    []
  );

  /*
  ============================================================
  LIMPIEZA DE ESTADO
  ============================================================
  */

  const limpiarError = useCallback((campo) => {
    setErrores((actual) => {
      if (!actual[campo]) return actual;

      return {
        ...actual,
        [campo]: false,
      };
    });
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

  const limpiarMensaje = useCallback(() => {
    setSuccessMessage("");
    setErrorMessage("");
    setSubmitted(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarCatalogos();

      return () => {
        limpiarMensaje();
      };
    }, [cargarCatalogos, limpiarMensaje])
  );

  /*
  ============================================================
  HANDLERS
  ============================================================
  */

  const handlePesoPromedioChange = useCallback(
    (value) => {
      setPesoPromedio(normalizarDecimal(value));
      limpiarError("pesoPromedio");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handleKilosVendidosChange = useCallback(
    (value) => {
      setKilosVendidos(normalizarDecimal(value, 0));
      limpiarError("kilosVendidos");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handleColaboradorChange = useCallback(
    (value) => {
      setColaboradorSeleccionado(value);
      limpiarError("colaborador");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handleFincaChange = useCallback(
    (value) => {
      setFincaSeleccionada(String(value));
      setEstanqueSeleccionado("");
      limpiarError("finca");
      limpiarError("estanque");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handlePrecioChange = useCallback(
    (value) => {
      setPrecioKilo(String(Math.max(0, Math.round(Number(value) || 0))));
      limpiarError("precioKilo");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handleCompradorChange = useCallback(
    (value) => {
      setCompradorSeleccionado(value);
      limpiarError("comprador");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handleFechaChange = useCallback((value) => {
    if (!value) {
      setFechaVenta(obtenerFechaActual());
      return;
    }

    setFechaVenta(value);
    limpiarError("fecha");
  }, [limpiarError]);

  const limpiarFormulario = useCallback(() => {
    setFincaSeleccionada("");
    setEstanqueSeleccionado("");
    setPesoPromedio("0"); // ← también se limpia a 0
    setKilosVendidos("0");
    setPrecioKilo("0");
    setFechaVenta(obtenerFechaActual());
    setColaboradorSeleccionado("");
    setCompradorSeleccionado("");
    setErrores({});
  }, []);

  /*
  ============================================================
  GUARDADO LOCAL
  ============================================================
  */

  const guardarVenta = useCallback(async () => {
    setSubmitted(true);
    setSuccessMessage("");
    setErrorMessage("");

    const nuevosErrores = validarVentaFormulario({
      fincaSeleccionada,
      estanqueSeleccionado,
      pesoPromedio,
      kilosVendidos,
      precioKiloNumero,
      colaboradorSeleccionado,
      compradorSeleccionado,
      fechaVenta,
    });

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      if (nuevosErrores.fecha) {
        setErrorMessage("La fecha no puede ser futura.");
      } else if (Number(pesoPromedio) > 50) {
        setErrorMessage("El peso promedio no puede superar los 50 g.");
      } else {
        setErrorMessage("Rellenar campos obligatorios.");
      }
      return;
    }

    setGuardando(true);

    const ventaDTO = new MantVentaDTO({
      finca: Number(fincaSeleccionada),
      estanque: Number(estanqueSeleccionado),
      colaborador: colaboradorSeleccionado
        ? Number(colaboradorSeleccionado)
        : null,
      comprador:
        compradorSeleccionado === "cliente-generico"
          ? null
          : Number(compradorSeleccionado),
      pesoPromedio: Number(pesoPromedio),
      cantVendida: Number(kilosVendidos),
      precioKilo: precioKiloNumero,
      fecha: convertirFechaParaBackend(fechaVenta),
    });

    try {
      await VentasLocalService.create(ventaDTO);
      setVentas((actual) => [ventaDTO, ...actual]);
      limpiarFormulario();
      setSuccessMessage("Venta guardada correctamente.");
    } catch (error) {
      setSubmitted(true);
      setErrorMessage("No fue posible guardar la venta.");
    } finally {
      setGuardando(false);
    }
  }, [
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoPromedio,
    kilosVendidos,
    precioKiloNumero,
    colaboradorSeleccionado,
    compradorSeleccionado,
    fechaVenta,
    limpiarFormulario,
  ]);

  /*
  ============================================================
  COMPONENTE INTERNO
  ============================================================
  */

  function SectionTitle({ icon, title }) {
    return (
      <View style={styles.sectionTitle}>
        <Icon
          icon={icon}
          size={18}
          color={COLORS.primary}
          style={styles.sectionIcon}
        />

        <Text style={styles.sectionText}>{title}</Text>
      </View>
    );
  }

  /*
  ============================================================
  RETORNO
  ============================================================
  */

  return {
    SectionTitle,
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoPromedio,
    kilosVendidos,
    precioKilo,
    fechaVenta,
    colaboradorSeleccionado,
    compradorSeleccionado,

    submitted,
    successMessage,
    errorMessage,

    errores,
    guardando,
    gridStyle,
    errorInputStyle,
    opcionesFincas,
    estanquesFiltrados,
    opcionesColaboradores,
    opcionesCompradores,
    precioKiloNumero,
    totalVenta,
    ventas,
    setFechaVenta,
    setEstanqueSeleccionado,
    handleFincaChange,
    handlePesoPromedioChange,
    handleKilosVendidosChange,
    handlePrecioChange,
    handleCompradorChange,
    handleColaboradorChange,
    handleFechaChange,
    limpiarError,
    guardarVenta,
  };
}