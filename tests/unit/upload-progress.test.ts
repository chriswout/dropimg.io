import { describe, expect, it } from "vitest";
import {
  byteFractionToBar,
  checkingBarAt,
  CHECKING_END,
  CHECKING_START,
  UPLOAD_BYTE_CAP,
} from "../../client/upload-progress";

describe("upload progress phases", () => {
  it("maps bytes onto the first 70%", () => {
    expect(byteFractionToBar(0, 100)).toBe(0);
    expect(byteFractionToBar(50, 100)).toBe(35);
    expect(byteFractionToBar(100, 100)).toBe(UPLOAD_BYTE_CAP);
    expect(byteFractionToBar(10, 0)).toBe(0);
  });

  it("crawls 70 to 95 while checking", () => {
    expect(checkingBarAt(0)).toBe(CHECKING_START);
    expect(checkingBarAt(9_000)).toBe(83);
    expect(checkingBarAt(18_000)).toBe(CHECKING_END);
    expect(checkingBarAt(40_000)).toBe(CHECKING_END);
  });
});
