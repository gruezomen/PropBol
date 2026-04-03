import { prisma } from "../../db";

export class BannersRepository {
  async getActiveBanners() {
    return await prisma.bannerHome.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
    });
  }
}
