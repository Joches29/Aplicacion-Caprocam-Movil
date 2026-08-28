/**
 * ============================================================
 * HOOK useTrazabilidadList
 * ============================================================
 *
 * Descripción:
 * Hook responsable de obtener, enriquecer y filtrar el listado de registros de trazabilidad.
 *
 * @dependencies TrazabilidadServices, ErrorContext, expo-router
 * @validations Búsqueda por texto y filtros combinados (fincas, estanques, colaboradores, fecha).
 * @navigation Navega a /trazabilidad/agregar y /trazabilidad/:id.
 */

import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";

import {
  getRegistros,
  obtenerFincas,
  obtenerColaboradores,
  obtenerUsuarios,
  obtenerTodosLosEstanques,
  construirMapas,
  enriquecerRegistros,
  filtrarRegistrosTrazabilidad,
} from "../services/TrazabilidadServices";
import { useError } from "../../../shared/context/ErrorContext";
import { formatDate } from "../../../shared/utils/dateUtils";
import TrazabilidadSyncService from "../services/TrazabilidadSync.service";

export function useTrazabilidadList() {
  const router = useRouter();
  const { mostrarError } = useError();

  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState({
    fincas: [],
    estanques: [],
    colaboradores: [],
    fecha: "",
  });

  const [registros, setRegistros] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [colaboradoresCat, setColaboradoresCat] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [usuariosCat, setUsuariosCat] = useState([]);
// Errores fuera de un formulario (cargar catálogos o el listado):
  // se muestran con el mismo Alert que ya usa la pantalla, no en
  // console.error ni en silencio. 401 = token vencido.
  const [errorCarga, setErrorCarga] = useState("");
  const [sesionExpirada, setSesionExpirada] = useState(false);

  function mostrarErrorCarga(mensaje, error) {
    if (error?.response?.status === 401) {
      setSesionExpirada(true);
      setErrorCarga("Tu sesión expiró. Debes iniciar sesión de nuevo.");
      return;
    }
    setSesionExpirada(false);
    setErrorCarga(mensaje);
    if (error) mostrarError(error);
  }

  function cerrarErrorCarga() {
    setErrorCarga("");
    setSesionExpirada(false);
  }

  function irALogin() {
    cerrarErrorCarga();
    router.replace("/login");
  }

  /*
  Los catalogos se recargan cada vez que la pantalla toma foco, NO
  solo al montarse.

  Motivo: los catalogos se descargan desde Configuracion, en otra
  pantalla. Si se cargaban una sola vez con useEffect([], ...) y el
  usuario sincronizaba con la app ya abierta, la pantalla se quedaba
  con las listas vacias de antes de sincronizar. Los registros si se
  veian, pero sin finca ni estanques porque el cruce no encontraba
  nada contra un catalogo vacio.

  Con useFocusEffect basta con volver a entrar a Trazabilidad
  despues de sincronizar para que los nombres aparezcan.
  */
  const cargarCatalogos = useCallback(() => {
    obtenerFincas().then(setFincas).catch((error) => {
      setFincas([]);
      mostrarErrorCarga("No se pudieron cargar las fincas.", error);
    });

    obtenerColaboradores().then(setColaboradoresCat).catch((error) => {
      setColaboradoresCat([]);
      mostrarErrorCarga("No se pudieron cargar los colaboradores.", error);
    });

    obtenerTodosLosEstanques().then(setEstanques).catch((error) => {
      setEstanques([]);
      mostrarErrorCarga("No se pudieron cargar los estanques.", error);
    });

    /*
    Los usuarios se leen de SQLite igual que el resto. Hacen falta
    para los registros creados desde web, que guardan
    creado_por_usuario_id en vez de un colaborador.

    Si falla no se muestra error al usuario: es un catalogo
    secundario y la pantalla funciona igual mostrando el id.
    */
    obtenerUsuarios()
      .then(setUsuariosCat)
      .catch(() => setUsuariosCat([]));
  }, []);

  useFocusEffect(cargarCatalogos);

  useFocusEffect(
    useCallback(() => {
      /*
      Intenta primero refrescar el historial desde el backend
      (GET /registrosTrazabilidad) y despues lee de SQLite.

      Por que aqui y no en el sync general de Configuracion:
      - MAPEO_DESCARGA de configSync.service.js NO incluye
        trazabilidad, y el backend tampoco la devuelve en
        GET /sync/sincronizar (solo la recibe al subir). Ambos
        archivos son de otros modulos, asi que Trazabilidad
        resuelve su propia descarga sin tocarlos.

      La descarga es "mejor esfuerzo": si falla (sin internet,
      sesion vencida, backend caido) se ignora el error a
      proposito y se muestra igual lo que haya en local. El
      modulo es offline-first, no debe romperse por no tener
      conexion.
      */
      let cancelado = false;

      const refrescarYCargar = async () => {
        try {
          await TrazabilidadSyncService.descargarHistorialTrazabilidad();
        } catch (error) {
          // Silencioso a proposito: ver nota de arriba.
        }

        if (cancelado) return;

        try {
          const locales = await getRegistros();
          if (!cancelado) setRegistros(locales);
        } catch (error) {
          if (cancelado) return;
          setRegistros([]);
          mostrarErrorCarga("No se pudo cargar el listado de trazabilidad.", error);
        }
      };

      refrescarYCargar();

      return () => {
        cancelado = true;
      };
    }, []),
  );

  const mapas = useMemo(
    () => construirMapas({
      fincas,
      colaboradores: colaboradoresCat,
      estanques,
      usuarios: usuariosCat,
    }),
    [fincas, colaboradoresCat, estanques, usuariosCat],
  );

  const registrosEnriquecidos = useMemo(
    () => enriquecerRegistros(registros, mapas),
    [registros, mapas],
  );

  // Extrae unicamente los responsables (usuarios o colaboradores) que
  // poseen al menos 1 registro en el listado de trazabilidad.
  const colaboradores = useMemo(() => {
    const map = new Map();
    (registrosEnriquecidos || []).forEach((reg) => {
      const key = reg.colaboradorId ?? (reg.creadoPorUsuarioId ? `user_${reg.creadoPorUsuarioId}` : reg.colaboradorNombre);
      const label = reg.colaboradorNombre || "Sin asignar";

      if (key && label && !map.has(key)) {
        map.set(key, {
          label,
          value: key,
        });
      }
    });
    return Array.from(map.values());
  }, [registrosEnriquecidos]);

  const registrosFiltrados = useMemo(
    () => filtrarRegistrosTrazabilidad(registrosEnriquecidos, busqueda, filtros),
    [registrosEnriquecidos, busqueda, filtros],
  );

  const hayFiltrosActivos =
    String(busqueda).trim() !== "" ||
    filtros.fincas.length > 0 ||
    filtros.estanques.length > 0 ||
    filtros.colaboradores.length > 0 ||
    filtros.fecha !== "";

  function nuevoRegistro() {
    router.push("/trazabilidad/agregar");
  }

  function limpiarBusqueda() {
    setBusqueda("");
    setFiltros({ fincas: [], estanques: [], colaboradores: [], fecha: "" });
  }

  function abrirDetalle(id) {
    router.push(`/trazabilidad/${id}`);
  }

  return {
    busqueda,
    setBusqueda,
    filtros,
    setFiltros,
    registrosFiltrados,
    fincas,
    colaboradores,
    hayFiltrosActivos,
    nuevoRegistro,
    limpiarBusqueda,
    abrirDetalle,
    errorCarga,
    sesionExpirada,
    cerrarErrorCarga,
    irALogin,
  };
}

// Helper to prepare a registro for presentation in the UI.
// Keeps formatting logic out of the screen component.
export function formatRegistroForView(registro) {
  const plNumber = Number(registro.pl ?? 0);
  const plFormatted = plNumber.toLocaleString();
  // "tamano" sin ñ: así lo confirmó el equipo de API en la respuesta real.
  const tamanoFormatted = registro.tamano ? `${registro.tamano}g` : "";
  const fechaFormatted = formatDate(registro.fecha) || registro.fecha;

  return {
    ...registro,
    plFormatted,
    tamanoFormatted,
    fechaFormatted,
  };
}