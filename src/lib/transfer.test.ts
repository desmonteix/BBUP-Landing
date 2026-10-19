import { expect, it } from "vitest";
import { receiptFormat, transferEuroAmount } from "./transfer";

it("rejects executable or mislabeled receipts and accepts image signatures", () => {
  expect(receiptFormat(Buffer.from('<svg onload="alert(1)">'))).toBeNull();
  expect(receiptFormat(Buffer.from([255, 216, 255, 224]))).toBe("jpg");
  expect(receiptFormat(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe("png");
});
it("never invents a euro amount for a soles-only order", () => {
  expect(transferEuroAmount(null)).toBeNull();
  expect(transferEuroAmount(43.86)).toBe(43.86);
});
it("converts a soles quote only with a valid server rate, preserving existing EUR quotes", () => {
  expect(transferEuroAmount(null, 85, 4)).toBe(21.25);
  expect(transferEuroAmount(30, 85, 4)).toBe(30);
  expect(transferEuroAmount(null, 85, 0)).toBeNull();
  expect(transferEuroAmount(null, 85, NaN)).toBeNull();
});
