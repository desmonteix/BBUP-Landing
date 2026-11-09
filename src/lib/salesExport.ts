import type { AdminRegistrantRow, PaymentStatus } from "@/lib/types";

const headers = [
  "Evento", "ID de inscripción", "Nombre", "Acompañante", "Entradas", "Email",
  "Teléfono", "Nacionalidad", "Tipo", "Importe (PEN)", "Referencia (EUR)",
  "Tipo de cambio aplicado", "Estado de pago", "Método de pago", "ID del evento",
  "ID de pago Mercado Pago", "Fecha de inscripción (UTC)",
];
const paymentLabels: Record<PaymentStatus, string> = {
  paid: "Pagado", pending: "Pendiente", failed: "Rechazado / cancelado", "n/a": "No requiere pago",
};

function salesRows(registrants: AdminRegistrantRow[], eventTitle: string) {
  return registrants.map(row => [
    eventTitle, row.id, row.name,
    [row.companion_first_name, row.companion_last_name].filter(Boolean).join(" "),
    row.ticket_quantity, row.email, row.phone, row.nationality,
    row.kind === "ticket" ? "Entrada" : "Inscripción gratuita",
    row.amount_pen, row.display_price_eur, row.exchange_rate_applied,
    paymentLabels[row.payment_status],
    row.payment_method === "transfer" ? "Transferencia"
      : row.payment_method === "mercadopago" ? "Mercado Pago" : "",
    row.event_id, row.mercadopago_payment_id, row.created_at,
  ]);
}

export function createSalesCsv(registrants: AdminRegistrantRow[], eventTitle: string): string {
  const escape = (value: string | number | null) => {
    let text = String(value ?? "");
    // Quoting alone does not prevent spreadsheet software from executing formulas.
    if (typeof value === "string" && /^\s*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  // BOM lets Excel detect accented names correctly when opening the CSV directly.
  return "\uFEFF" + [headers, ...salesRows(registrants, eventTitle)]
    .map(row => row.map(escape).join(",")).join("\r\n");
}

export async function createSalesWorkbook(registrants: AdminRegistrantRow[], eventTitle: string): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ventas");
  sheet.addRow(headers);
  sheet.addRows(salesRows(registrants, eventTitle));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  sheet.columns.forEach(column => { column.width = 24; });
  [10, 11].forEach(index => { sheet.getColumn(index).numFmt = "0.00"; });
  sheet.getColumn(12).numFmt = "0.000";
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
