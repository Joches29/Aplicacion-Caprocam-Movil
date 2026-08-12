/**
 * ============================================================
 * HOOK DE NUEVA SIEMBRA
 * ============================================================
 *
 * Centraliza el estado y la lógica del formulario para
 * registrar una nueva siembra.
 *
 * FUNCIONALIDAD:
 * - Administra los datos del formulario.
 * - Maneja cambios de finca y estanque.
 * - Obtiene estanques disponibles.
 * - Calcula automáticamente la cantidad sembrada.
 * - Valida campos obligatorios antes de guardar.
 * - Expone "mensaje"/"mensajeVariant" para el Alert global del estándar
 *   (ya no se usa un Modal): la screen lo muestra centrado y arriba del
 *   botón de guardar. Usa "danger" (no "error") como variant porque es
 *   el nombre que reconoce shared/components/Alert.jsx.
 * - Maneja el flujo "Siembra a partir de Pre-Cría": si el usuario NO
 *   llegó automáticamente desde "Finalizar Pre-Cría", puede elegir
 *   manualmente el origen (Directa / A partir de Pre-Cría) y, en ese
 *   caso, seleccionar una Pre-Cría finalizada y disponible de un
 *   Select (handleSeleccionarPreCria) — esto autocompleta y deja
 *   bloqueados los campos heredados (ver mode="view" en la screen).
 *   En este caso, se reutiliza el mismo Lote de Larva de la
 *   Pre-Cría de origen (formData.loteId) en vez de crear uno nuevo -
 *   crear uno nuevo con el mismo código de lote falla en el backend
 *   ("Ya existe un lote con ese codigo").
 *
 * La pantalla únicamente consume este hook para renderizar
 * la interfaz y ejecutar acciones.
 */

import { useState, useEffect, useMemo } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

import {
  useFieldValidation,
  validarCamposObligatorios,
} from "./useFieldValidation";
import { obtenerCamposObligatorios as obtenerCamposObligatoriosPorTipo } from "./siembraValidationRules";
import { calcularDensidadDesdeCantidad } from "./siembraCalculos";
import { obtenerFechaHoy, formatearFechaDesdeISO } from "./dateUtils";
import EstanqueLocalService from "../../../modules/estanques/services/EstanqueLocal.service";
import FincaLocalService from "../../../modules/finca/services/fincaLocal.service";

// Catalogos de larva - operaciones locales (SQLite), no pegan
// directo al backend, para que "Agregar nuevo" funcione offline.
// Los *.service.js (create/updateProveedorLarva, etc.) solo los
// usa el Sync (ProveedorLarvaSync.service.js y compañía) para
// subir estos registros cuando hay conexión.
import ProveedorLarvaLocalService from "../services/ProveedorLarvaLocal.service";
import LaboratorioLocalService from "../services/LaboratorioLocal.service";
import ProcedenciaLocalService from "../services/ProcedenciaLocal.service";
import PrecriaLocalService from "../services/PrecriaLocal.service";
import SiembraLocalService from "../services/SiembraLocal.services";
import LoteLarvaLocalService from "../services/LoteLarvaLocal.service";
import { localApi } from "../../../database/local/localApi.service";
import { LoteLarvaDTO, PrecriaDTO, SiembraDTO } from "../dtos/siembra.dto";

// El backend devuelve {id, nombre}; los Select del proyecto esperan
// {label, value} - este mapeo se repite igual en useDetalleSiembra.
function mapCatalogo(items) {
  return (items || []).map((item) => ({ label: item.nombre, value: item.id }));
}

const initialFormData = {
  tipoRegistro: "siembra",
  pasoPorPrecria: "no",
  precriaId: "",

  finca: "",
  estanque: "",
  codigoLoteLarva: "",
  estado: "Activa",

  fechaSiembra: "",
  tecnicaCultivo: "",
  densidadPoblacional: "",
  cantidadSembrada: "",
  plSiembra: "",
  duracionCiclo: "90",
  areaHectareas: "",

  fechaInicio: "",
  fechaFin: "",
  duracionDias: "15",
  cantidadInicial: "",
  cantidadFinal: "",
  plInicial: "",
  plFinal: "",

  proveedorLarva: "",
  laboratorioLarva: "",
  procedenciaLarva: "",
  certificadoLarva: "",

  duracionPrecria: "",
  fechaSalidaPrecria: "",
  cantidadSobrevivientePrecria: "",
};

export default function useNuevaSiembra() {
  const router = useRouter();

  const [mensaje, setMensaje] = useState("");
  const [mensajeVariant, setMensajeVariant] = useState("info");
  const [guardando, setGuardando] = useState(false);

  const [formData, setFormData] = useState(initialFormData);
  const params = useLocalSearchParams();

  const {
    submitted,
    setSubmitted,
    errors,
    setErrors,
    hasError,
    requiredLabel,
  } = useFieldValidation();

  useEffect(() => {
    const formatted = obtenerFechaHoy();
    setFormData((prev) => ({
      ...prev,
      fechaSiembra: prev.fechaSiembra || formatted,
      fechaInicio: prev.fechaInicio || formatted,
      fechaSalidaPrecria: prev.fechaSalidaPrecria || formatted,
    }));
  }, []);

  const [fincas, setFincas] = useState([]);
  const [todosEstanques, setTodosEstanques] = useState([]);

  const estanques = useMemo(() => {
    if (!formData.finca) return [];

    const fincaObj = fincas.find(
      (f) => String(f.value) === String(formData.finca) || String(f.id) === String(formData.finca)
    );

    const fincaLocalId = fincaObj ? String(fincaObj.id || fincaObj.value) : String(formData.finca);
    const fincaServidorId = fincaObj && fincaObj.servidorId ? String(fincaObj.servidorId) : "";

    return todosEstanques
      .filter((e) => {
        const estanqueFincaId = String(e.fincaId || e.idFinca || e.finca_id || "");
        const estadoEst = String(e.estado || e.estadoEstanque || e.estado_estanque || "").toLowerCase();
        const esActivo = estadoEst === "" || estadoEst === "activo";
        return (
          (estanqueFincaId === fincaLocalId ||
            (fincaServidorId !== "" && estanqueFincaId === fincaServidorId)) &&
          esActivo
        );
      })
      .map((e) => ({
        label: e.codigo
          ? e.codigo.toLowerCase().startsWith("estanque") || e.codigo.toLowerCase().startsWith("tanque")
            ? e.codigo
            : `Estanque ${e.codigo}`
          : e.nombre
          ? e.nombre
          : `Estanque #${e.id}`,
        value: String(e.id),
        ...e,
      }));
  }, [formData.finca, todosEstanques, fincas]);

  const tecnicasCultivo = useMemo(
    () => [
      { label: "Extensiva", value: "extensiva" },
      { label: "Semi-intensiva", value: "semi" },
      { label: "Intensiva", value: "intensiva" },
    ],
    [],
  );
  const plLarva = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        label: `PL${i + 1}`,
        value: `PL${i + 1}`,
      })),
    [],
  );

  // Catálogos de larva y fincas/estanques reales - se cargan de SQLite.
  const [proveedoresLarva, setProveedoresLarva] = useState([]);
  const [laboratoriosLarva, setLaboratoriosLarva] = useState([]);
  const [procedenciasLarva, setProcedenciasLarva] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        setCargandoCatalogos(true);
        const [rProv, rLab, rProc, rFincas, rEstanques] = await Promise.all([
          ProveedorLarvaLocalService.getAll(),
          LaboratorioLocalService.getAll(),
          ProcedenciaLocalService.getAll(),
          FincaLocalService.getFincas(),
          EstanqueLocalService.getEstanques(),
        ]);
        setProveedoresLarva(mapCatalogo(rProv || []));
        setLaboratoriosLarva(mapCatalogo(rLab || []));
        setProcedenciasLarva(mapCatalogo(rProc || []));
        setFincas(
          (rFincas || []).map((f) => ({
            label: f.nombreFinca || f.codigoCBO || `Finca #${f.id}`,
            value: String(f.id),
            id: f.id,
            servidorId: f.servidorId || f.servidor_id,
          }))
        );
        setTodosEstanques(rEstanques || []);
      } catch (err) {
        setMensaje("No fue posible cargar los catálogos.");
        setMensajeVariant("danger");
      } finally {
        setCargandoCatalogos(false);
      }
    }
    cargarCatalogos();
  }, []);

  const vinoAutomaticoDePrecria = Boolean(params.provieneDePrecriaId);
  const [origenSiembra, setOrigenSiembra] = useState("directa");

  // Pre-crías finalizadas disponibles para armar una Siembra a
  // partir de ellas.
  const [preCriasDisponibles, setPreCriasDisponibles] = useState([]);

  useEffect(() => {
    async function cargarPrecriasDisponibles() {
      try {
        await localApi.inicializar();
        const precrias = await PrecriaLocalService.getAll();
        setPreCriasDisponibles(
          precrias
            .filter((p) => p.estado === "Finalizada")
            .map((p) => ({ label: `Pre-Cría #${p.id}`, value: String(p.id) })),
        );
      } catch (err) {
        // No bloquea el formulario si esto falla - la siembra directa
        // sigue funcionando igual.
      }
    }
    cargarPrecriasDisponibles();
  }, []);

  useEffect(() => {
    if (!params.provieneDePrecriaId) return;
    handleSeleccionarPreCria(params.provieneDePrecriaId);
  }, [params.provieneDePrecriaId]);

  function handleChange(field, value) {
    setFormData((previousData) => {
      const updatedData = { ...previousData, [field]: value };
      if (
        updatedData.tipoRegistro === "siembra" &&
        (field === "areaHectareas" || field === "cantidadSembrada")
      ) {
        updatedData.densidadPoblacional = calcularDensidadDesdeCantidad(
          updatedData.areaHectareas,
          updatedData.cantidadSembrada,
        );
      }
      return updatedData;
    });
  }

  function handleChangeFinca(value) {
    setFormData((previousData) => ({
      ...previousData,
      finca: value,
      estanque: "",
      areaHectareas: "",
      cantidadSembrada: "",
    }));
  }

  function handleChangeEstanque(value) {
    const estanqueObj = todosEstanques.find(
      (e) => String(e.id) === String(value) || String(e.servidorId) === String(value)
    );
    let area = estanqueObj?.areaHectareas;
    if (area == null && estanqueObj?.largo && estanqueObj?.ancho) {
      area = (Number(estanqueObj.largo) * Number(estanqueObj.ancho)) / 10000;
    }
    const areaStr = area != null && area !== "" ? String(area) : "";

    setFormData((previousData) => {
      const updatedData = { ...previousData, estanque: value };
      if (previousData.tipoRegistro === "siembra") {
        updatedData.areaHectareas = areaStr;
        updatedData.densidadPoblacional = calcularDensidadDesdeCantidad(
          areaStr,
          previousData.cantidadSembrada,
        );
      }
      return updatedData;
    });
  }

  const camposHeredadosDePrecria = [
    "duracionPrecria",
    "fechaSalidaPrecria",
    "cantidadSobrevivientePrecria",
    "proveedorLarva",
    "laboratorioLarva",
    "procedenciaLarva",
    "codigoLoteLarva",
    "certificadoLarva",
    "plSiembra",
  ];

  async function handleSeleccionarPreCria(precriaId) {
    if (!precriaId) {
      setFormData((previo) => {
        const limpio = { ...previo, pasoPorPrecria: "no", precriaId: "" };
        camposHeredadosDePrecria.forEach((campo) => {
          limpio[campo] = "";
        });
        return limpio;
      });
      return;
    }

    try {
      const precria = await PrecriaLocalService.getById(precriaId);
      if (!precria) return;

      const lote = precria.loteLarvaId
        ? await LoteLarvaLocalService.getById(precria.loteLarvaId)
        : null;

      setFormData((previo) => {
        const densidad = previo.densidadPoblacional || "8";
        const area = previo.areaHectareas || "";
        const densidadPoblacional = calcularDensidadDesdeCantidad(area, precria.cantidadFinal);
        const actualizado = {
          ...previo,
          finca: precria.fincaId != null ? String(precria.fincaId) : previo.finca,
          estanque: precria.estanqueId != null ? String(precria.estanqueId) : previo.estanque,
          cantidadSobrevivientePrecria: precria.cantidadFinal || "",
          duracionPrecria: precria.duracionDias || "",
          fechaSalidaPrecria: formatearFechaDesdeISO(precria.fechaFin),
          pasoPorPrecria: "si",
          precriaId: String(precriaId),
          densidadPoblacional,
          areaHectareas: area,
          cantidadSembrada: "",
          loteId: precria.loteLarvaId,
          codigoLoteLarva: lote?.codigoLote || "",
          proveedorLarva: lote?.proveedorLarvaId || "",
          laboratorioLarva: lote?.laboratorioId || "",
          procedenciaLarva: lote?.procedenciaId || "",
          certificadoLarva: lote?.certificadoLarva || "",
          plSiembra: precria.plFinal != null ? `PL${precria.plFinal}` : "",
        };
        return actualizado;
      });
    } catch (err) {
      setMensaje("No fue posible cargar la Pre-Cría seleccionada.");
      setMensajeVariant("danger");
    }
  }

  function handleCambiarOrigenSiembra(nuevoOrigen) {
    setOrigenSiembra(nuevoOrigen);
    if (nuevoOrigen === "directa") {
      handleSeleccionarPreCria("");
    }
  }

  async function handleAgregarProveedorLarva(nombre) {
    const nuevo = await ProveedorLarvaLocalService.create(nombre);
    setProveedoresLarva((previo) => [
      ...previo,
      { label: nuevo.nombre, value: nuevo.id },
    ]);
    handleChange("proveedorLarva", nuevo.id);
  }

  async function handleAgregarLaboratorioLarva(nombre) {
    const nuevo = await LaboratorioLocalService.create(nombre);
    setLaboratoriosLarva((previo) => [
      ...previo,
      { label: nuevo.nombre, value: nuevo.id },
    ]);
    handleChange("laboratorioLarva", nuevo.id);
  }

  async function handleAgregarProcedenciaLarva(nombre) {
    const nuevo = await ProcedenciaLocalService.create(nombre);
    setProcedenciasLarva((previo) => [
      ...previo,
      { label: nuevo.nombre, value: nuevo.id },
    ]);
    handleChange("procedenciaLarva", nuevo.id);
  }

  async function handleEditarProveedorLarva(value, nombre) {
    const actualizado = await ProveedorLarvaLocalService.update(value, nombre);
    setProveedoresLarva((previo) =>
      previo.map((item) =>
        item.value === value
          ? { label: actualizado.nombre, value: actualizado.id }
          : item,
      ),
    );
  }

  async function handleEditarLaboratorioLarva(value, nombre) {
    const actualizado = await LaboratorioLocalService.update(value, nombre);
    setLaboratoriosLarva((previo) =>
      previo.map((item) =>
        item.value === value
          ? { label: actualizado.nombre, value: actualizado.id }
          : item,
      ),
    );
  }

  async function handleEditarProcedenciaLarva(value, nombre) {
    const actualizado = await ProcedenciaLocalService.update(value, nombre);
    setProcedenciasLarva((previo) =>
      previo.map((item) =>
        item.value === value
          ? { label: actualizado.nombre, value: actualizado.id }
          : item,
      ),
    );
  }

  async function handleEliminarProveedorLarva(value) {
    await ProveedorLarvaLocalService.deleteById(value);
    setProveedoresLarva((previo) =>
      previo.filter((item) => item.value !== value),
    );
    setFormData((previo) =>
      previo.proveedorLarva === value
        ? { ...previo, proveedorLarva: "" }
        : previo,
    );
  }

  async function handleEliminarLaboratorioLarva(value) {
    await LaboratorioLocalService.deleteById(value);
    setLaboratoriosLarva((previo) =>
      previo.filter((item) => item.value !== value),
    );
    setFormData((previo) =>
      previo.laboratorioLarva === value
        ? { ...previo, laboratorioLarva: "" }
        : previo,
    );
  }

  async function handleEliminarProcedenciaLarva(value) {
    await ProcedenciaLocalService.deleteById(value);
    setProcedenciasLarva((previo) =>
      previo.filter((item) => item.value !== value),
    );
    setFormData((previo) =>
      previo.procedenciaLarva === value
        ? { ...previo, procedenciaLarva: "" }
        : previo,
    );
  }

  function obtenerCamposObligatorios() {
    if (!formData.tipoRegistro) return ["tipoRegistro"];
    const campos = [
      "tipoRegistro",
      ...obtenerCamposObligatoriosPorTipo(formData),
    ];
    if (
      formData.tipoRegistro === "siembra" &&
      !vinoAutomaticoDePrecria &&
      origenSiembra === "precria"
    ) {
      campos.push("precriaId");
    }
    return campos;
  }

  async function handleCrearSiembra() {
    setSubmitted(true);
    const camposAValidar = obtenerCamposObligatorios();
    const nuevosErrores = validarCamposObligatorios(formData, camposAValidar);

    if (formData.tipoRegistro === "siembra" && formData.pasoPorPrecria === "si") {
      const sembrada = Number(formData.cantidadSembrada || 0);
      const sobrevivientes = Number(formData.cantidadSobrevivientePrecria || 0);
      if (sembrada > sobrevivientes) {
        nuevosErrores.cantidadSembrada = "No puede superar los sobrevivientes de Pre-Cría.";
      }
    }

    setErrors(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      const tipo = formData.tipoRegistro === "precria" ? "Pre-Cría" : "Siembra";
      const msj = nuevosErrores.cantidadSembrada === "No puede superar los sobrevivientes de Pre-Cría."
        ? "La cantidad sembrada no puede superar la cantidad de sobrevivientes de la Pre-Cría de origen."
        : `Debe completar y corregir todos los campos obligatorios para registrar esta ${tipo}.`;
      setMensaje(msj);
      setMensajeVariant("danger");
      return;
    }

    setGuardando(true);
    try {
      await localApi.inicializar();

      const estanqueSeleccionado = todosEstanques.find(
        (e) => String(e.id) === String(formData.estanque) || String(e.servidorId) === String(formData.estanque)
      );
      if (estanqueSeleccionado) {
        const estadoEst = String(estanqueSeleccionado.estado || estanqueSeleccionado.estadoEstanque || "").toLowerCase();
        if (estadoEst !== "" && estadoEst !== "activo") {
          setMensaje("El estanque seleccionado no se encuentra en estado 'Activo'.");
          setMensajeVariant("danger");
          setGuardando(false);
          return;
        }
      }

      const [todasSiembras, todasPrecrias] = await Promise.all([
        SiembraLocalService.getAll(),
        PrecriaLocalService.getAll(),
      ]);

      const tieneSiembraActiva = (todasSiembras || []).some(
        (s) => String(s.estanqueId || s.estanque_id) === String(formData.estanque) && String(s.estado || "").toLowerCase() !== "finalizada"
      );
      const tienePrecriaActiva = (todasPrecrias || []).some(
        (p) => String(p.estanqueId || p.estanque_id) === String(formData.estanque) && String(p.estado || "").toLowerCase() !== "finalizada"
      );

      if (tieneSiembraActiva || tienePrecriaActiva) {
        setMensaje("El estanque seleccionado ya cuenta con un ciclo de cultivo (Siembra o Pre-Cría) activo.");
        setMensajeVariant("danger");
        setGuardando(false);
        return;
      }

      let loteId;
      if (formData.pasoPorPrecria === "si" && formData.loteId) {
        loteId = formData.loteId;
      } else {
        const lote = await LoteLarvaLocalService.create(new LoteLarvaDTO(formData));
        loteId = lote.id;
      }

      if (formData.tipoRegistro === "precria") {
        await PrecriaLocalService.create(new PrecriaDTO(formData, loteId));
      } else {
        await SiembraLocalService.create(new SiembraDTO(formData, loteId));
      }

      setSubmitted(false);

      router.replace({
        pathname: "/siembra",
        params: {
          mensajeExito: formData.tipoRegistro === "precria"
            ? "Pre-Cría registrada correctamente."
            : "Siembra registrada correctamente.",
        },
      });
    } catch (err) {
      const mensajeBackend = err.response?.data?.message;
      setMensaje(mensajeBackend || "No fue posible registrar el ciclo.");
      setMensajeVariant("danger");
      setGuardando(false);
    }
  }

  return {
    formData,
    estanques,
    fincas,
    tecnicasCultivo,
    proveedoresLarva,
    laboratoriosLarva,
    procedenciasLarva,
    plLarva,
    vinoAutomaticoDePrecria,
    preCriasDisponibles,
    origenSiembra,
    handleCambiarOrigenSiembra,
    handleSeleccionarPreCria,
    mensaje,
    mensajeVariant,
    cargandoCatalogos,
    guardando,
    handleChange,
    handleChangeFinca,
    handleChangeEstanque,
    handleCrearSiembra,
    handleAgregarProveedorLarva,
    handleAgregarLaboratorioLarva,
    handleAgregarProcedenciaLarva,
    handleEditarProveedorLarva,
    handleEditarLaboratorioLarva,
    handleEditarProcedenciaLarva,
    handleEliminarProveedorLarva,
    handleEliminarLaboratorioLarva,
    handleEliminarProcedenciaLarva,
    fieldHelpers: { hasError, requiredLabel },
  };
}