import { prisma } from "../../db";

export const propertiesRepository = {
  async search(filtros: any) {
    const whereClause: any = {};

    if (filtros.categoria) {
      const categorias = Array.isArray(filtros.categoria)
        ? filtros.categoria
        : [filtros.categoria];

      const categoriasValidas = categorias
        .filter((categoria: string) =>
          ["CASA", "DEPARTAMENTO", "TERRENO", "OFICINA"].includes(
            categoria.toUpperCase(),
          ),
        )
        .map((categoria: string) => categoria.toUpperCase());

      if (categoriasValidas.length > 0) {
        whereClause.categoria = {
          in: categoriasValidas,
        };
      }
    }

    if (filtros.tipoAccion) {
      const tipoUpper = filtros.tipoAccion.toUpperCase();

      if (["VENTA", "ALQUILER", "ANTICRETO"].includes(tipoUpper)) {
        whereClause.tipoAccion = tipoUpper;
      }
    }

    whereClause.estado = "ACTIVO";

    console.log("🔍 Buscando propiedades con filtros:", whereClause);

    const properties = await prisma.inmueble.findMany({
      where: whereClause,
      include: {
        ubicacion: true,
      },
      orderBy: {
        fechaPublicacion: "desc",
      },
    });

    console.log(`✓ Se encontraron ${properties.length} propiedades`);
    return properties;
  },
};
