import { describe, expect, it } from "vitest";
import { parseFromAddress } from "../../src/lib/email";

describe("parseFromAddress", () => {
  it("parses display name plus address", () => {
    expect(parseFromAddress("DropIMG <signin@dropimg.io>")).toEqual({
      email: "signin@dropimg.io",
      name: "DropIMG",
    });
  });

  it("accepts a bare address", () => {
    expect(parseFromAddress("signin@dropimg.io")).toEqual({
      email: "signin@dropimg.io",
    });
  });
});
