import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createSalesCsv, createSalesWorkbook } from "./salesExport";
import type { AdminRegistrantRow } from "./types";

const registration: AdminRegistrantRow = {
  id: "registration-1", event_id: "event-1", profile_id: null,
  name: 'María, "López"\nGarcía', email: "maria@example.com", phone: "+51900123456",
  nationality: "Peruvian", kind: "ticket", ticket_quantity: 2,
  companion_first_name: "José", companion_last_name: "Pérez",
  amount_pen: 100.5, display_price_eur: 25.25, exchange_rate_applied: 3.98,
  payment_status: "paid", payment_method: "mercadopago", mercadopago_payment_id: "001234",
  pricing_snapshot: null, terms_accepted_at: null, terms_text_snapshot: null,
  terms_url_snapshot: null, created_at: "2026-11-08T12:00:00Z",
};

describe("event sales export", () => {
  it("writes UTF-8 CSV with escaped commas, quotes and newlines", () => {
    const csv = createSalesCsv([registration], "Fiesta");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"María, ""López""\nGarcía"');
    expect(csv).toContain('"José Pérez"');
    expect(csv).toContain('"100.5","25.25","3.98","Pagado"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });

  it.each(["=1+1", "+1+1", "-1+1", "@SUM(A1)", " \t=1+1", "\r=1+1"])(
    "exports formula-like text safely: %j", name => {
      expect(createSalesCsv([{ ...registration, name }], "Fiesta")).toContain(`"'${name}"`);
    }
  );

  it("handles empty exports, missing values and zero amounts", () => {
    expect(createSalesCsv([], "Fiesta").split("\r\n")).toHaveLength(1);
    const csv = createSalesCsv([{ ...registration, amount_pen: 0, display_price_eur: null,
      exchange_rate_applied: null, companion_first_name: null, companion_last_name: null,
      payment_status: "n/a", payment_method: undefined }], "Fiesta");
    expect(csv).toContain('"0","","","No requiere pago"');
    expect(csv).not.toMatch(/undefined|null/);
  });

  it("creates a readable XLSX with numeric amounts and literal text identifiers", async () => {
    const blob = await createSalesWorkbook([{ ...registration, name: "=1+1" }], "Fiesta");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    const sheet = workbook.getWorksheet("Ventas")!;
    expect(sheet.rowCount).toBe(2);
    expect(sheet.getCell("A2").value).toBe("Fiesta");
    expect(sheet.getCell("C2").value).toBe("=1+1");
    expect(sheet.getCell("G2").value).toBe("+51900123456");
    expect(sheet.getCell("J2").value).toBe(100.5);
    expect(sheet.getCell("K2").value).toBe(25.25);
    expect(sheet.getCell("P2").value).toBe("001234");
    expect(sheet.getCell("Q2").value).toBe(registration.created_at);
  });
});
