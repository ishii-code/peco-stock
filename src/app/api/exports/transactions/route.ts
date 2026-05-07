import { exportTransactionCSV } from "@/lib/csv";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get("clinicId");
    if (!clinicId) {
      return Response.json({ error: "clinicId is required" }, { status: 400 });
    }
    const startRaw = searchParams.get("startDate");
    const endRaw = searchParams.get("endDate");
    const startDate = startRaw ? new Date(startRaw) : null;
    const endDate = endRaw ? new Date(endRaw) : null;
    const csv = await exportTransactionCSV(clinicId, startDate, endDate);
    const today = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="transactions_${clinicId}_${today}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/exports/transactions failed", error);
    return Response.json({ error: "Failed to export" }, { status: 500 });
  }
}
