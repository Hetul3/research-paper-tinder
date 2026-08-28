import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PaperCard } from "@/components/paper-card";
import type { Paper } from "@/lib/arxiv";

const paper: Paper = {
  id: "2608.10001",
  versionedId: "2608.10001v1",
  version: 1,
  title: "A card that follows your hand",
  abstract: "This paper tests direct manipulation. It should feel immediate.",
  authors: ["Mina Park"],
  publishedAt: "2026-08-26T10:00:00Z",
  updatedAt: "2026-08-26T10:00:00Z",
  primaryCategory: "cs.HCI",
  categories: ["cs.AI"],
  abstractUrl: "https://arxiv.org/abs/2608.10001v1",
  pdfUrl: "https://arxiv.org/pdf/2608.10001v1",
  comment: null,
  doi: null,
  journalReference: null,
};

describe("PaperCard gestures", () => {
  it("follows a finger and skips after crossing the left threshold", () => {
    const onDecision = vi.fn();
    render(<PaperCard onDecision={onDecision} paper={paper} />);
    const card = screen.getByRole("article");

    fireEvent.pointerDown(card, { clientX: 260, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 90, pointerId: 1 });

    expect(card).toHaveStyle({ transform: "translateX(-170px) rotate(-6.071428571428571deg)" });
    expect(screen.getByText("Skip", { selector: "div" })).toHaveClass("opacity-100");

    fireEvent.pointerUp(card, { clientX: 90, pointerId: 1 });
    expect(onDecision).toHaveBeenCalledWith("skipped");
  });

  it("saves on a committed right swipe and snaps back below threshold", () => {
    const onDecision = vi.fn();
    const onRightSwipe = vi.fn();
    render(
      <PaperCard
        onDecision={onDecision}
        onRightSwipe={onRightSwipe}
        paper={paper}
      />,
    );
    const card = screen.getByRole("article");

    fireEvent.pointerDown(card, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 230, pointerId: 1 });
    fireEvent.pointerUp(card, { clientX: 230, pointerId: 1 });
    expect(onRightSwipe).toHaveBeenCalledOnce();
    expect(onDecision).not.toHaveBeenCalled();

    onDecision.mockClear();
    fireEvent.pointerDown(card, { clientX: 100, pointerId: 2 });
    fireEvent.pointerMove(card, { clientX: 150, pointerId: 2 });
    fireEvent.pointerUp(card, { clientX: 150, pointerId: 2 });
    expect(onDecision).not.toHaveBeenCalled();
    expect(card).toHaveStyle({ transform: "translateX(0px) rotate(0deg)" });
  });
});
