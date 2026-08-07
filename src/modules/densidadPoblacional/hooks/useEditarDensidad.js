/**
 * ============================================================
 * HOOK USEEDITARDENSIDAD
 * ============================================================
 *
 * Hook encargado de editar registros existentes de densidad
 * poblacional almacenados en SQLite.
 *
 * Funcionalidad:
 *
 * - Recibe registroId desde EditarDensidadScreen.
 * - Consulta el registro mediante getById().
 * - Carga finca, estanque, fecha y datos de conteo.
 * - Permite modificar los valores.
 * - Valida igual que el registro nuevo.
 * - Actualiza mediante update().
 *
 */
import { useEffect, useState } from "react";
import { useDatosConteo } from "./useDatosConteo";
import { useFincaEstanqueDensidad } from "./useFincaEstanqueDensidad";
import densidadPoblacionalLocalService from "../services/DensidadPoblacionalLocal.service.js";
import { toMysqlDate } from "../../../shared/utils/dateUtils";

function convertirFechaMostrar(fecha) {
  if (!fecha) return "";
  const partes = fecha.split("-");
  if (partes.length !== 3)
    return fecha;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function extraerMensaje(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Ocurrió un error inesperado."
  );
}

function hoy() {
  const d = new Date();
  const dd = String(
    d.getDate()
  ).padStart(2, "0");
  const mm = String(
    d.getMonth() + 1
  ).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function useEditarDensidad(
  registroId,
  onSuccess
) {
  const [finca, setFincaEstado] = useState(null);
  const [estanque, setEstanqueEstado] = useState(null);
  const [fecha, setFecha] = useState(hoy());
  const [submitted, setSubmitted] = useState(false);
  const [errores, setErrores] = useState({});
  const [alerta, setAlerta] = useState({
    visible: false,
    variant: "success",
    mensaje: ""
  });
  const [cargando, setCargando] = useState(true);
  const datosConteo = useDatosConteo();
  const {
    fincasOptions,
    estanquesOptions
  } = useFincaEstanqueDensidad(finca);
  const fincas = fincasOptions;
  const estanques = estanquesOptions;
  /**
   * Cambiar finca también limpia estanque
   */
  const setFinca = (valor) => {
    setFincaEstado(valor);
    setEstanqueEstado(null);
  };
  const setEstanque = (valor) => {
    setEstanqueEstado(valor);
  };
  /**
   * Cargar registro existente
   */
  useEffect(() => {
    async function cargarRegistro() {
      try {
        const registro =
          await densidadPoblacionalLocalService.getById(
            registroId
          );
        if (!registro)
          return;
        setFincaEstado(
          String(registro.fincaId)
        );
        setEstanqueEstado(
          String(registro.estanqueId)
        );
        setFecha(
          convertirFechaMostrar(
            registro.fecha
          )
        );
        datosConteo.setNumeroCamarones(
          String(registro.numeroCamarones ?? "")
        );
        datosConteo.setTirosAtarraya(
          String(registro.tirosAtarraya ?? "")
        );
        datosConteo.setAreaAtarraya(
          String(registro.areaAtarraya ?? "")
        );
        datosConteo.setPromedioPorTiro(
          String(registro.promedioPorTiro ?? "")
        );
        datosConteo.setSupervivencia(
          String(registro.sobrevivencia ?? "")
        );
        datosConteo.setNotasConteo(
          registro.notasConteo ?? ""
        );
        datosConteo.setSiembraPorM2(
          String(registro.cantidadSiembra ?? "")
        );
        datosConteo.setAreaEstanque(
          String(registro.areaEstanque ?? "")
        );
      } catch (error) {
        console.error(
          "Error cargando densidad:",
          error
        );
        setAlerta({
          visible: true,
          variant: "danger",
          mensaje: extraerMensaje(error)
        });
      } finally {
        setCargando(false);
      }
    }
    if (registroId)
      cargarRegistro();
  }, [registroId]);
  function validarPrincipal() {

    const errores = {};
    if (!finca)
      errores.finca = "La finca es obligatoria";
    if (!estanque)
      errores.estanque = "El estanque es obligatorio";
    if (!fecha)
      errores.fecha = "La fecha es obligatoria";
    return errores;
  }
  const handleGuardar = async () => {

    setSubmitted(true);
    const erroresPrincipal =
      validarPrincipal();
    const {
      valido,
      errores: erroresDatos
    } = datosConteo.validar();
    const erroresFinal = {
      ...erroresPrincipal,
      ...erroresDatos
    };

    setErrores(
      erroresFinal
    );
    if (
      Object.keys(erroresFinal).length > 0 ||
      !valido
    ) {
      setAlerta({
        visible: true,
        variant: "danger",
        mensaje:
          "Por favor complete todos los campos obligatorios."
      });
      return;}
    const dto = {
      fincaId: finca,
      estanqueId: estanque,
      fecha:
        toMysqlDate(fecha),
      numeroCamarones:
        datosConteo.numeroCamarones,
      tirosAtarraya:
        datosConteo.tirosAtarraya,
      areaAtarraya:
        datosConteo.areaAtarraya,
      promedioPorTiro:
        datosConteo.promedioPorTiro,
      sobrevivencia:
        datosConteo.supervivencia,
      notasConteo:
        datosConteo.notasConteo?.trim()
          ?
          datosConteo.notasConteo
          :
          "No hay notas",
      cantidadSiembra:
        datosConteo.siembraPorM2,
      areaEstanque:
        datosConteo.areaEstanque
    };

    try {
      await densidadPoblacionalLocalService.update(
        registroId,
        dto
      );

      setAlerta({
        visible: true,
        variant: "success",
        mensaje:
          "Densidad poblacional actualizada exitosamente."
      });

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 3000);
      }
    } catch (error) {
      setAlerta({
        visible: true,
        variant: "danger",
        mensaje:
          extraerMensaje(error)
      });
    }
  };

  return {
    finca,
    setFinca,
    estanque,
    setEstanque,
    fecha,
    setFecha,
    fincas,
    estanques,
    submitted,
    errores,
    alerta,
    handleGuardar,
    cargando,
    ...datosConteo
  };
}