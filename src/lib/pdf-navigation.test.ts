import { describe, expect, it, vi } from "vitest";

import { navigateToPdf } from "@/lib/pdf-navigation";

describe("navigateToPdf", () => {
  it("navigates directly to the PDF URL", () => {
    const navigate = vi.fn();
    navigateToPdf("https://arxiv.org/pdf/2608.10001v1", navigate);
    expect(navigate).toHaveBeenCalledWith("https://arxiv.org/pdf/2608.10001v1");
  });
});
