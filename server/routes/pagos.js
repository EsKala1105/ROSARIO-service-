import express from "express";
import Pagos from "../models/pagos.js";
import Factura from "../models/Factura.js";
import db from "../config/db.js";

const router = express.Router();

export const handleAddPago = async (nuevoPago, session) => {
  try {
    // Crea una instancia del modelo Pagos con los datos del nuevo pago
    const pagoNuevo = new Pagos(nuevoPago);

    // Guarda el nuevo pago en la base de datos
    const pagoGuardado = await pagoNuevo.save({ session });

    // Devuelve el pago guardado
    return pagoGuardado.toObject();
  } catch (error) {
    console.error("Error al agregar pago:", error);
    throw error; // Puedes manejar el error según tus necesidades
  }
};

// Ruta para agregar un nuevo registro de pago
router.post("/add-pago", async (req, res) => {
  const session = await db.startSession();
  session.startTransaction();

  try {
    const { idOrden, date, metodoPago, total, idUser, isCounted } = req.body;
    const nuevoPago = new Pagos({
      idOrden,
      date,
      metodoPago,
      total,
      idUser,
      isCounted,
    });

    const pagoGuardado = await nuevoPago.save({ session }, { _id: 1 });

    await Factura.findByIdAndUpdate(
      idOrden,
      { $addToSet: { listPago: pagoGuardado._id } },
      { session }
    );

    await session.commitTransaction();

    res.json(pagoGuardado.toObject());
  } catch (error) {
    console.error("Error al editar el pago:", error);
    await session.abortTransaction();
    res
      .status(500)
      .json({ mensaje: "Error al editar el pago", error: error.message });
  } finally {
    session.endSession();
  }
});

// Ruta para editar un pago por su ID
router.put("/edit-pago/:idPago", async (req, res) => {
  try {
    // Obtener el ID del pago a editar desde los parámetros de la URL
    const { idPago } = req.params;

    // Obtener los nuevos datos del cuerpo de la solicitud
    const { idOrden, date, metodoPago, total, idUser } = req.body;

    // Buscar el pago por su ID y actualizarlo con los nuevos datos
    const pagoActualizado = await Pagos.findByIdAndUpdate(
      idPago,
      {
        idOrden,
        date,
        metodoPago,
        total,
        idUser,
      },
      { new: true } // Devuelve el pago actualizado después de la edición
    );

    // Verificar si se encontró y actualizó el pago
    if (!pagoActualizado) {
      return res.status(404).json({ mensaje: "Pago no encontrado" });
    }

    // Enviar la respuesta al cliente con el pago actualizado
    res.json(pagoActualizado.toObject());
  } catch (error) {
    console.error("Error al editar el pago:", error);
    res
      .status(500)
      .json({ mensaje: "Error al editar el pago", error: error.message });
  }
});

// Ruta para eliminar un pago por su ID
router.delete("/delete-pago/:idPago", async (req, res) => {
  try {
    // Obtener el ID del pago a eliminar desde los parámetros de la URL
    const { idPago } = req.params;

    // Buscar el pago por su ID y eliminarlo
    const pagoEliminado = await Pagos.findByIdAndDelete(idPago);

    // Verificar si se encontró y eliminó el pago
    if (!pagoEliminado) {
      return res.status(404).json({ mensaje: "Pago no encontrado" });
    }

    // Obtener el ID de la factura asociada al pago eliminado
    const facturaId = pagoEliminado.idOrden;

    // Actualizar la factura asociada eliminando el ID del pago de su lista de pagos
    await Factura.findByIdAndUpdate(facturaId, {
      $pull: { listPago: pagoEliminado._id },
    });

    res.json({
      _id: pagoEliminado._id,
      idOrden: pagoEliminado.idOrden,
      isCounted: pagoEliminado.isCounted,
    });
  } catch (error) {
    console.error("Error al eliminar el pago:", error);
    res
      .status(500)
      .json({ mensaje: "Error al eliminar el pago", error: error.message });
  }
});

export default router;
