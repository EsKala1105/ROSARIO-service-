import express from "express";
import Donacion from "../models/donacion.js";
import Factura from "../models/Factura.js";
import Almacen from "../models/almacen.js";

import moment from "moment";
import db from "../config/db.js";

const router = express.Router();

router.post("/add-to-donation", async (req, res) => {
  // Iniciar una transacción
  const session = await db.startSession();
  session.startTransaction();

  try {
    const { Ids } = req.body;

    const ordersDonados = [];
    const Fecha = moment().format("YYYY-MM-DD");
    const Hora = moment().format("HH:mm");

    // Actualizar la ubicación y estado de las Ordenes
    for (const facturaId of Ids) {
      const orderUpdate = await Factura.findByIdAndUpdate(
        facturaId,
        {
          location: 3,
          estadoPrenda: "donado",
        },
        {
          new: true,
          session: session,
        }
      ).lean();

      // Eliminar Registro de Almacen
      await Almacen.findOneAndDelete({ idOrden: facturaId }).session(session);

      // Agregar las Orden a Donacion
      const donacion = new Donacion({
        idOrden: facturaId,
        donationDate: {
          fecha: Fecha,
          hora: Hora,
        },
      });

      await donacion.save({ session: session });

      ordersDonados.push(orderUpdate);
    }

    // Devolver una respuesta exitosa
    res.status(201).json(ordersDonados);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    res
      .status(500)
      .json({ mensaje: "Error en la transacción", error: error.message });
  }
});

router.get("/get-donated-orders", async (req, res) => {
  try {
    // Obtén todos los registros de Donacion
    const donaciones = await Donacion.find();

    // Array para almacenar los resultados finales
    const donatedOrders = [];

    // Itera a través de los registros de Donacion
    for (const donated of donaciones) {
      // Encuentra la factura correspondiente a serviceOrderId
      const orden = await Factura.findById(donated.idOrden).lean();
      // Agrega el objeto a los resultados
      donatedOrders.push({ ...orden, donationDate: donated.donationDate });
    }

    res.status(200).json(donatedOrders);
  } catch (error) {
    console.error("Error al obtener datos: ", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/get-donated/:idOrder", async (req, res) => {
  const idOrder = req.params.idOrder;
  try {
    // Obtén todos los registros de Donacion
    const infoDonacion = await Donacion.findOne(
      { idOrden: idOrder },
      { donationDate: 1 }
    );

    if (infoDonacion) {
      res.status(200).json(infoDonacion.donationDate);
    } else {
      res.status(404).json({ mensaje: "Info de Donacion no encontrado" });
    }
  } catch (error) {
    console.error("Error al obtener datos: ", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

export default router;
