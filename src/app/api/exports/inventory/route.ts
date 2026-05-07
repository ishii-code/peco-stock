import { exportInventoryCSV } from "@/lib/csv";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const clinicId = request.nextUrl.searchParams.get("clinicId");
    if (!clinicId) {
      return Response.json({ error: "clinicId is required" }, { status: 400 });
    }
    const csv = await exportInventoryCSV(clinicId);
    const today = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="inventory_${clinicId}_${today}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/exports/inventory failed", error);
    return Response.json({ error: "Failed to export" }, { status: 500 });
  }
}
