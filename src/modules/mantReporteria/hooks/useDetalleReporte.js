/**
 * ============================================================
 * HOOK: useDetalleReporte (LOCAL / SQLite)
 * ============================================================
 * Carga catálogos y filtros desde localApi,(inicializar DB,
 * mapear ids y nombres de finca/estanque).
 */

import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

import { localApi } from "../../../database/local/localApi.service";
import { obtenerDetalleReporte } from "../services/detalleReporte.service";
import { TIPOS_AUTOGESTIONADOS } from "../constants/tipoReporte.js";

/*
============================================================
HELPERS
============================================================
*/

const obtenerDataRespuesta = (respuesta) =>
  respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;

function obtenerValor(objeto, llaves, valorDefecto = null) {
  if (!objeto) return valorDefecto;

  for (let i = 0; i < llaves.length; i += 1) {
    const llave = llaves[i];
    if (
      Object.prototype.hasOwnProperty.call(objeto, llave) &&
      objeto[llave] !== undefined &&
      objeto[llave] !== null
    ) {
      return objeto[llave];
    }
  }

  return valorDefecto;
}

async function obtenerRegistrosLocales(seccion) {
  const apiSeccion = localApi[seccion];

  if (!apiSeccion || typeof apiSeccion.obtenerTodos !== "function") {
    throw new Error(`localApi.${seccion}.obtenerTodos no está disponible.`);
  }

  const respuesta = await apiSeccion.obtenerTodos();
  const data = obtenerDataRespuesta(respuesta);

  return Array.isArray(data) ? data : [];
}

const obtenerIdFinca = (finca) =>
  Number(
    obtenerValor(
      finca,
      ["id", "fincaId", "idFinca", "finca_id", "servidor_id", "servidorId"],
      0
    )
  );

const obtenerIdEstanque = (estanque) =>
  Number(
    obtenerValor(
      estanque,
      [
        "id",
        "estanqueId",
        "idEstanque",
        "estanque_id",
        "servidor_id",
        "servidorId",
      ],
      0
    )
  );

const obtenerFincaIdEstanque = (estanque) =>
  Number(obtenerValor(estanque, ["finca_id", "fincaId", "idFinca"], 0));

const obtenerNombreFinca = (item, id) =>
  obtenerValor(
    item,
    ["nombreFinca", "nombre_finca", "nombre", "codigoCBO", "codigo_cbo"],
    ""
  ) || `Finca ${id}`;

const obtenerNombreEstanque = (item, id) =>
  obtenerValor(item, ["codigo", "nombre", "codigoEstanque"], "") ||
  `Estanque ${id}`;

const obtenerNombreColaborador = (item, id) => {
  const nombre = obtenerValor(item, ["nombre"], "");
  const apellidos = obtenerValor(item, ["apellidos", "apellido"], "");
  const completo = `${nombre} ${apellidos}`.trim();
  return completo || obtenerValor(item, ["nombreUsuario", "nombre_usuario"], "") || `Colaborador ${id}`;
};

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export function useDetalleReporte() {
  const router = useRouter();
  const { alert: alertParam } = useLocalSearchParams();

  const [registroTipo, setRegistroTipo] = useState(null);

  const [finca, setFinca] = useState(null);
  const [estanque, setEstanque] = useState(null);

  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [estanquesFiltrados, setEstanquesFiltrados] = useState([]);

  const [alert, setAlert] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  const filtrosCompletos = !!registroTipo && !!finca && !!estanque;

  useEffect(() => {
    if (alertParam === "edited") {
      setAlert("edited");
      router.setParams({ alert: undefined });
    }
  }, [alertParam, setAlert, router]);

  /*
  ============================================================
  CARGA DE CATÁLOGOS (mismo patrón que enfermedades)
  ============================================================
  */
  useEffect(() => {
    let activo = true;

    async function cargarCatalogos() {
      try {
        setCargandoCatalogos(true);

        // Importante: inicializar SQLite antes de consultar
        if (typeof localApi.inicializar === "function") {
          await localApi.inicializar();
        }

        const [fincasData, estanquesData, colaboradoresData] = await Promise.all([
          obtenerRegistrosLocales("fincas"),
          obtenerRegistrosLocales("estanques"),
          obtenerRegistrosLocales("colaboradores"),
        ]);

        if (!activo) return;

        const fincasOptions = (fincasData || [])
          .map((item) => {
            const id = obtenerIdFinca(item);
            return {
              label: obtenerNombreFinca(item, id),
              value: id,
            };
          })
          .filter((item) => Number(item.value) > 0);

        const estanquesOptions = (estanquesData || [])
          .map((item) => {
            const id = obtenerIdEstanque(item);
            return {
              label: obtenerNombreEstanque(item, id),
              value: id,
              fincaId: obtenerFincaIdEstanque(item),
            };
          })
          .filter((item) => Number(item.value) > 0);

        const colaboradoresOptions = (colaboradoresData || [])
          .map((item) => {
            const id = Number(obtenerValor(item, ["id", "servidor_id", "servidorId"], 0));
            return {
              value: id,
              label: obtenerNombreColaborador(item, id),
            };
          })
          .filter((item) => Number(item.value) > 0);

        setFincas(fincasOptions);
        setEstanques(estanquesOptions);
        setColaboradores(colaboradoresOptions);

        if (__DEV__) {
          console.log("[Reporteria] Catálogos locales:", {
            fincas: fincasOptions.length,
            estanques: estanquesOptions.length,
            colaboradores: colaboradoresOptions.length,
          });
        }
      } catch (error) {
        console.error("Error cargando catálogos locales de reportería:", error);
        if (activo) {
          setFincas([]);
          setEstanques([]);
          setColaboradores([]);
        }
      } finally {
        if (activo) setCargandoCatalogos(false);
      }
    }

    cargarCatalogos();

    return () => {
      activo = false;
    };
  }, []);

  /*
  ============================================================
  FILTRO DE ESTANQUES POR FINCA
  ============================================================
  */
  useEffect(() => {
    if (!finca) {
      setEstanquesFiltrados([]);
      setEstanque(null);
      return;
    }

    const filtrados = estanques.filter(
      (item) => Number(item.fincaId) === Number(finca)
    );

    setEstanquesFiltrados(filtrados);
    setEstanque(null);
  }, [finca, estanques]);

  /*
  ============================================================
  CARGA DE REGISTROS (tipos no autogestionados)
  ============================================================
  */
  useEffect(() => {
    let activo = true;

    async function cargarRegistros() {
      if (!filtrosCompletos) {
        setRegistros([]);
        return;
      }

      if (TIPOS_AUTOGESTIONADOS.includes(registroTipo)) {
        setRegistros([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const registrosData = await obtenerDetalleReporte({
          tipoRegistro: registroTipo,
          fincaId: finca,
          estanqueId: estanque,
        });

        if (activo) {
          const registrosConNombres = (registrosData || []).map((registro) => {
            const fincaEncontrada = fincas.find(
              (f) =>
                Number(f.value) ===
                Number(registro.finca_id || registro.fincaId || registro.idFinca)
            );

            const estanqueEncontrado = estanques.find(
              (e) =>
                Number(e.value) ===
                Number(
                  registro.estanque_id ||
                    registro.estanqueId ||
                    registro.idEstanque
                )
            );

            const colaboradorEncontrado = colaboradores.find(
              (c) =>
                Number(c.value) ===
                Number(
                  registro.colaborador_id ||
                    registro.colaboradorId ||
                    registro.idColaborador
                )
            );

            return {
              ...registro,
              nombreFinca: fincaEncontrada?.label ?? "No encontrada",
              codigoEstanque: estanqueEncontrado?.label ?? "No encontrado",
              nombreColaborador:
                colaboradorEncontrado?.label ?? "No encontrado",
            };
          });

          setRegistros(registrosConNombres);
        }
      } catch (error) {
        console.error("Error cargando registros locales:", error);

        if (activo) {
          setRegistros([]);
        }
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    }

    cargarRegistros();

    return () => {
      activo = false;
    };
  }, [
    registroTipo,
    finca,
    estanque,
    fincas,
    estanques,
    colaboradores,
    filtrosCompletos,
  ]);

  return {
    registroTipo,

    finca,
    estanque,

    fincas,
    estanques,
    colaboradores,
    estanquesFiltrados,

    registros,
    loading,
    cargandoCatalogos,

    filtrosCompletos,

    setRegistroTipo,
    setFinca,
    setEstanque,

    alert,
    setAlert,
  };
}
