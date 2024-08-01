import express from "express";
import Almacen from "../models/almacen.js";
import Factura from "../models/Factura.js";
import moment from "moment";
import db from "../config/db.js";
import Pagos from "../models/pagos.js";
import Usuario from "../models/usuarios/usuarios.js";
import { mapArrayByKey, mapObjectByKey } from "../utils/utilsFuncion.js";

const router = express.Router();

// Nueva ruta para realizar ambas operaciones
router.post("/add-to-warehouse", async (req, res) => {
  // Iniciar una transacción
  const session = await db.startSession();
  session.startTransaction();
  try {
    const { Ids } = req.body;

    const ordersAlmacenados = [];
    const Fecha = moment().format("YYYY-MM-DD");
    const Hora = moment().format("HH:mm");

    // Actualizar la ubicación de las Ordenes
    for (const facturaId of Ids) {
      const orderUpdate = await Factura.findByIdAndUpdate(
        facturaId,
        {
          location: 2,
        },
        {
          new: true,
          session: session,
        }
      ).lean();

      // Buscar todos los pagos relacionados con los listPagosIds
      const infoPagos = await Pagos.find({
        _id: { $in: orderUpdate.listPago },
      }).lean();

      // Obtener todos los idUser de los pagos sin repeticiones
      const idUsers = [...new Set(infoPagos.map((pago) => pago.idUser))];

      // Buscar la información de los usuarios relacionados con los idUsers
      const usuarios = await Usuario.find(
        { _id: { $in: idUsers } },
        {
          _id: 1,
          name: 1,
          usuario: 1,
          rol: 1,
        }
      ).lean();

      // Crear un mapa de para usuarios  por su _id
      const usuariosMap = mapObjectByKey(usuarios, "_id");

      const ListPago = infoPagos.map((pago) => ({
        _id: pago._id,
        idUser: pago.idUser,
        idOrden: pago.idOrden,
        orden: orderUpdate.codRecibo,
        date: pago.date,
        nombre: orderUpdate.Nombre,
        total: pago.total,
        metodoPago: pago.metodoPago,
        Modalidad: orderUpdate.Modalidad,
        isCounted: pago.isCounted,
        infoUser: usuariosMap[pago.idUser],
      }));

      // Agregar las Orden a Almacen
      const almacen = new Almacen({
        idOrden: facturaId,
        storageDate: {
          fecha: Fecha,
          hora: Hora,
        },
      });

      await almacen.save({ session: session });

      ordersAlmacenados.push({
        ...orderUpdate,
        ListPago,
        dateStorage: almacen.storageDate,
      });
    }

    // Devolver una respuesta exitosa
    res.status(201).json(ordersAlmacenados);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    res
      .status(500)
      .json({ mensaje: "Error en la transacción", error: error.message });
  }
});

router.get("/get-warehouse-order", async (req, res) => {
  try {
    // Obtener todos los documentos de la colección Almacen
    const almacenes = await Almacen.find().lean();

    // Obtener todos los IDs de serviceOrder de todos los documentos de Almacen
    const serviceOrderIds = almacenes.map((almacen) => almacen.idOrden);

    // Buscar todas las facturas relacionadas con los serviceOrderIds
    const facturas = await Factura.find({
      _id: { $in: serviceOrderIds },
    }).lean();

    // Obtener todos los IDs de listPago de todas las facturas
    const listPagosIds = facturas.flatMap((factura) => factura.listPago);

    // Buscar todos los pagos relacionados con los listPagosIds
    const pagos = await Pagos.find({ _id: { $in: listPagosIds } }).lean();

    // Agrupar los pagos por ID de orden en un array
    const pagosMap = mapArrayByKey(pagos, "idOrden");

    // Obtener todos los idUser de los pagos sin repeticiones
    const idUsers = [...new Set(pagos.map((pago) => pago.idUser))];

    // Buscar la información de los usuarios relacionados con los idUsers
    const usuarios = await Usuario.find(
      { _id: { $in: idUsers } },
      {
        _id: 1,
        name: 1,
        usuario: 1,
        rol: 1,
      }
    ).lean();

    // Crear un mapa para usuarios y almacen por su _id
    const usuariosMap = mapObjectByKey(usuarios, "_id");
    const almacenMap = mapObjectByKey(almacenes, "idOrden");

    // Mapear las facturas con sus pagos correspondientes
    const facturasAlmacen = facturas.map((factura) => {
      const ListPago = (pagosMap[factura._id.toString()] || []).map((pago) => ({
        _id: pago._id,
        idUser: pago.idUser,
        idOrden: pago.idOrden,
        orden: factura.codRecibo,
        date: pago.date,
        nombre: factura.Nombre,
        total: pago.total,
        metodoPago: pago.metodoPago,
        Modalidad: factura.Modalidad,
        isCounted: pago.isCounted,
        infoUser: usuariosMap[pago.idUser.toString()],
      }));

      return {
        ...factura,
        ListPago,
        dateStorage: almacenMap[factura._id.toString()].storageDate,
      };
    });

    res.status(200).json(facturasAlmacen);
  } catch (error) {
    console.error("Error al obtener datos: ", error);
    res.status(500).json({ mensaje: "No se pudo obtener las facturas" });
  }
});

export default router;
