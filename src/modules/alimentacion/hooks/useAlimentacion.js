/**
 * ============================================================
 * HOOK USEALIMENTACION
 * ============================================================
 *
 * Maneja el fetch y el estado de los registros de alimentación
 * ya guardados. No contiene ninguna lógica de UI ni de
 * validación de formularios: solo carga/recarga datos.
 *
 * RECONECTADO: usa AlimentacionLocal.service (SQLite) en vez de
 * Alimentacion.service (HTTP). Lo usa únicamente
 * HistorialAlimentacionScreen.jsx; AlimentacionScreen.jsx (la
 * pantalla de registro) ya NO depende de este hook, para no traer
 * el listado completo solo para mostrarlo en un formulario de
 * creación (esa era la causa real de la sobrecarga, más allá del
 * componente visual AlimentacionStats que se retiró).
 *
 * Estado que maneja:
 * - alimentaciones: lista de registros obtenidos del service, con
 *   alias finca/estanque agregados (AlimentacionList.jsx lee
 *   item.finca/item.estanque, el service local expone
 *   fincaId/estanqueId).
 * - loading: true mientras se están cargando los datos.
 * - error: mensaje de error si la carga falla, si no null.
 *
 * Retorna:
 * - { alimentaciones, loading, error, recargar }
 *
 * Ejemplo:
 * const { alimentaciones, loading, error, recargar } = useAlimentacion();
 */

import { useState, useEffect } from "react";
import alimentacionLocalService from "../services/AlimentacionLocal.service";

function conAliasFincaEstanque(registro) {
    if (!registro) return registro;
    return {
        ...registro,
        finca: registro.fincaId,
        estanque: registro.estanqueId,
    };
}

const useAlimentacion = () => {
    const [alimentaciones, setAlimentaciones] = useState([]);
    const [loading, setLoading]               = useState(false);
    const [error, setError]                   = useState(null);

    const recargar = async () => {
        setLoading(true);
        setError(null);
        try {
            const datos = await alimentacionLocalService.getAll();
            setAlimentaciones((datos || []).map(conAliasFincaEstanque));
        } catch (error) {
            setError(error.message || "No se pudieron cargar los registros.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { recargar(); }, []);

    return { alimentaciones, loading, error, recargar };
};

export default useAlimentacion;