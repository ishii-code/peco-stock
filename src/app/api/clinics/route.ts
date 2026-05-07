import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.item.findMany({
      select: { clinicId: true },
      distinct: ["clinicId"],
      orderBy: { clinicId: "asc" },
    });
    return Response.json({ clinics: rows.map((r) => ({ id: r.clinicId })) });
  } catch (error) {
    console.error("GET /api/clinics failed", error);
    return Response.json({ error: "Failed to fetch clinics" }, { status: 500 });
  }
}
