/**
 * ============================================================
 * HOOK USEEDITARALIMENTACION
 * ============================================================
 *
 * Maneja la edición de registros de alimentación usando SQLite.
 *
 * Funcionalidad:
 *
 * - Carga el registro existente por id.
 * - Convierte la estructura SQLite al formato usado por
 *   AlimentacionForm.
 * - Mantiene validaciones independientes de la pantalla.
 * - Guarda cambios mediante AlimentacionLocalService.update().
 * - No maneja navegación: recibe callback externo.
 *
 * Campos editables:
 * - finca
 * - estanque
 * - fecha
 * - hora
 * - método
 * - cantidadKg
 * - proveedor
 * - producto
 * - tipoAlimento
 * - presentación
 * - observaciones
 *
 * Colaborador:
 * - Eliminado del flujo de edición.
 *
 * Observaciones:
 * - Opcionales.
 * - Si vienen vacías se completa antes de guardar.
 *
 * ============================================================
 */

import { useEffect, useState } from "react";

import AlimentacionLocalService from "../services/AlimentacionLocal.service";


const FORM_INICIAL = {
    finca: "",
    estanque: "",
    fecha: "",
    hora: "",
    metodo: "",

    cantidadKg: "",

    idProveedor: "",
    proveedor: "",

    idProducto: "",

    tipoAlimento: "",
    presentacion: "",

    observaciones: "",
};


/*
============================================================
MAPEAR REGISTRO SQLITE -> FORMULARIO
============================================================
*/

function mapearRegistroFormulario(registro) {

    if (!registro) return FORM_INICIAL;

    return {

        finca:
            registro.fincaId ??
            registro.finca_id ??
            "",


        estanque:
            registro.estanqueId ??
            registro.estanque_id ??
            "",


        fecha:
            registro.fecha ?? "",


        hora:
            registro.hora ?? "",


        metodo:
            registro.metodo ?? "",


        cantidadKg:
            String(
                registro.cantidadKg ??
                registro.cantidad_kg ??
                ""
            ),


        idProveedor:
            registro.proveedorId ??
            registro.proveedor_id ??
            "",


        proveedor:
            registro.proveedor ??
            "",


        idProducto:
            registro.productoId ??
            registro.producto_id ??
            "",


        tipoAlimento:
            registro.tipoAlimento ??
            registro.tipo_alimento ??
            "",


        presentacion:
            registro.presentacion ??
            "",


        observaciones:
            registro.observaciones ??
            "",
    };
}



/*
============================================================
HOOK
============================================================
*/


export default function useEditarAlimentacion(
    registroId,
    onGuardado
) {


    const [form, setForm] =
        useState(FORM_INICIAL);


    const [cargando, setCargando] =
        useState(true);


    const [guardando, setGuardando] =
        useState(false);


    const [submitted, setSubmitted] =
        useState(false);


    const [errores, setErrores] =
        useState({});


    const [alerta, setAlerta] =
        useState({
            visible:false,
            variant:"",
            mensaje:"",
        });



/*
============================================================
CARGAR REGISTRO
============================================================
*/


useEffect(() => {


    async function cargarRegistro(){

        try {

            setCargando(true);


            const registro =
                await AlimentacionLocalService.getById(
                    registroId
                );


            setForm(
                mapearRegistroFormulario(registro)
            );


        } catch(error){

            console.error(
                "Error cargando alimentación:",
                error
            );


            setAlerta({
                visible:true,
                variant:"danger",
                mensaje:
                    "No se pudo cargar el registro."
            });


        } finally {

            setCargando(false);

        }

    }


    if(registroId){
        cargarRegistro();
    }


},[registroId]);



/*
============================================================
UPDATE FIELD
============================================================
*/


function updateField(
    campo,
    valor
){

    setForm(prev => ({
        ...prev,
        [campo]:valor
    }));

}



/*
============================================================
VALIDACIONES
============================================================
*/


function validarForm(){

    const erroresTemp = {};


    if(!form.finca)
        erroresTemp.finca =
            "Finca es obligatoria";


    if(!form.estanque)
        erroresTemp.estanque =
            "Estanque es obligatorio";


    if(!form.fecha)
        erroresTemp.fecha =
            "Fecha es obligatoria";


    if(!form.hora)
        erroresTemp.hora =
            "Hora es obligatoria";


    if(!form.metodo)
        erroresTemp.metodo =
            "Método es obligatorio";


    if(
        !form.cantidadKg ||
        Number(form.cantidadKg)<=0
    ){
        erroresTemp.cantidadKg =
            "La cantidad debe ser mayor a 0";
    }


    if(
        !Number.isInteger(
            Number(form.cantidadKg)
        )
    ){
        erroresTemp.cantidadKg =
            "Solo se permiten números enteros";
    }


    if(!form.tipoAlimento)
        erroresTemp.tipoAlimento =
            "Tipo de alimento es obligatorio";


    if(!form.presentacion)
        erroresTemp.presentacion =
            "Presentación es obligatoria";


    if(!form.idProveedor)
        erroresTemp.proveedor =
            "Proveedor es obligatorio";


    if(!form.idProducto)
        erroresTemp.producto =
            "Producto es obligatorio";



    setErrores(erroresTemp);


    return {
        valido:
            Object.keys(erroresTemp).length === 0,
        errores:
            erroresTemp
    };

}



/*
============================================================
GUARDAR CAMBIOS
============================================================
*/


async function handleGuardar(
    mostrarError
){

    setSubmitted(true);


    const validacion =
        validarForm();


    if(!validacion.valido){

        setAlerta({
            visible:true,
            variant:"danger",
            mensaje:
                "Complete los campos obligatorios."
        });

        return;
    }



    try {


        setGuardando(true);



        const datos = {

            fincaId:
                form.finca,


            estanqueId:
                form.estanque,


            fecha:
                form.fecha,


            hora:
                form.hora,


            metodo:
                form.metodo,


            cantidadKg:
                Number(form.cantidadKg),


            proveedorId:
                form.idProveedor,


            proveedor:
                form.proveedor,


            productoId:
                form.idProducto,


            tipoAlimento:
                form.tipoAlimento,


            presentacion:
                form.presentacion,


            observaciones:
                form.observaciones?.trim()
                    ?
                    form.observaciones.trim()
                    :
                    "No se realizan observaciones",
        };



        await AlimentacionLocalService.update(
            registroId,
            datos
        );



        if(onGuardado){
            onGuardado();
        }



    } catch(error){


        console.error(
            "Error actualizando alimentación:",
            error
        );


        if(mostrarError){

            mostrarError(
                "No se pudo actualizar el registro."
            );

        }else{

            setAlerta({
                visible:true,
                variant:"danger",
                mensaje:
                    "Error al guardar cambios."
            });

        }



    } finally {

        setGuardando(false);

    }

}



/*
============================================================
RETURN
============================================================
*/


return {

    form,

    updateField,

    cargando,

    guardando,

    submitted,

    errores,

    alerta,

    handleGuardar,

};

}