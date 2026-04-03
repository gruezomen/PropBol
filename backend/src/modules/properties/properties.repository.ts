import { Categoria, TipoAccion } from "@prisma/client";
import { prisma } from "../../db";

type OrdenFecha = "mas-recientes" | "mas-populares" | "mas-antiguos";
type OrdenDireccion = "menor-a-mayor" | "mayor-a-menor";

interface FiltrosBusqueda {
  categoria?: string | string[];
  tipoAccion?: string;
  fecha?: OrdenFecha;
  precio?: OrdenDireccion;
  superficie?: OrdenDireccion;
}

export const propertiesRepository = {
  async getAll(filtros: FiltrosBusqueda = {}) {
    const where: any = { estado: "ACTIVO" };

    if (filtros.categoria) {
      const categoriasValidas: Categoria[] = [
        "CASA",
        "DEPARTAMENTO",
        "TERRENO",
        "OFICINA",
      ];
      const entrada = Array.isArray(filtros.categoria)
        ? filtros.categoria
        : [filtros.categoria];
      const validas = entrada
        .map((categoria) => categoria.toUpperCase() as Categoria)
        .filter((categoria) => categoriasValidas.includes(categoria));

      if (validas.length > 0) {
        where.categoria = { in: validas };
      }
    }

    if (filtros.tipoAccion) {
      const tipoUpper = filtros.tipoAccion.toUpperCase() as TipoAccion;
      const tiposValidos: TipoAccion[] = ["VENTA", "ALQUILER", "ANTICRETO"];

      if (tiposValidos.includes(tipoUpper)) {
        where.tipoAccion = tipoUpper;
      }
    }

    let orderBy: any[];

    if (filtros.fecha === "mas-populares") {
      orderBy = [
        {
          ubicacion: {
            ubicacion_maestra: {
              popularidad: "desc",
            },
          },
        },
        { fechaPublicacion: "desc" },
      ];
    } else if (filtros.fecha === "mas-antiguos") {
      orderBy = [{ fechaPublicacion: "asc" }];
    } else {
      orderBy = [{ fechaPublicacion: "desc" }];
    }

    console.log("WHERE clause:", JSON.stringify(where));
    console.log("ORDER BY:", JSON.stringify(orderBy));

    return prisma.inmueble.findMany({
      where,
      orderBy,
      include: {
        ubicacion: {
          include: {
            ubicacion_maestra: true,
          },
        },
      },
    });
  },
};
