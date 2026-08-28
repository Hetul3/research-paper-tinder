import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { DiscoveryApp } from "@/components/discovery-app";
import type { Paper } from "@/lib/arxiv";

const papers: Paper[] = [
  {
    id: "2608.10001",
    versionedId: "2608.10001v1",
    version: 1,
    title: "Quiet Machines: Designing AI for Attention",
    abstract:
      "Modern feeds optimize for uninterrupted attention. We present a deliberately finite research discovery interface that instead optimizes for useful stopping points and durable learning. Our evaluation shows that readers retain more when sessions have a clear end.",
    authors: ["Mina Park", "Jules Okafor"],
    publishedAt: "2026-08-26T10:00:00Z",
    updatedAt: "2026-08-26T10:00:00Z",
    primaryCategory: "cs.HC",
    categories: ["cs.HC", "cs.AI"],
    abstractUrl: "https://arxiv.org/abs/2608.10001v1",
    pdfUrl: "https://arxiv.org/pdf/2608.10001v1",
    comment: "18 pages",
    doi: null,
    journalReference: null,
  },
  {
    id: "2608.10002",
    versionedId: "2608.10002v1",
    version: 1,
    title: "Vision Without Noise",
    abstract:
      "A compact vision model learns robust representations with less training data.",
    authors: ["Noor Singh"],
    publishedAt: "2026-08-25T10:00:00Z",
    updatedAt: "2026-08-25T10:00:00Z",
    primaryCategory: "cs.CV",
    categories: ["cs.CV"],
    abstractUrl: "https://arxiv.org/abs/2608.10002v1",
    pdfUrl: "https://arxiv.org/pdf/2608.10002v1",
    comment: null,
    doi: null,
    journalReference: null,
  },
];

describe("DiscoveryApp", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("lets a reader save, skip, undo, and browse the saved library", async () => {
    const user = userEvent.setup();
    render(<DiscoveryApp generatedAt="2026-08-27T12:00:00Z" papers={papers} />);

    expect(
      screen.getByRole("heading", { name: papers[0].title }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save paper" }));
    expect(
      screen.getByRole("heading", { name: papers[1].title }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saved papers, 1" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Skip paper" }));
    expect(screen.getByText("You’re all caught up")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo last choice" }));
    expect(
      screen.getByRole("heading", { name: papers[1].title }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Saved papers, 1" }));
    expect(
      screen.getByRole("heading", { name: papers[0].title }),
    ).toBeInTheDocument();
  });

  it("reveals the full abstract and canonical reading links", async () => {
    const user = userEvent.setup();
    render(<DiscoveryApp generatedAt="2026-08-27T12:00:00Z" papers={papers} />);

    expect(screen.queryByText(/Our evaluation shows/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Read full abstract" }));

    expect(screen.getByText(/Our evaluation shows/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open PDF" })).toHaveAttribute(
      "href",
      papers[0].pdfUrl,
    );
    expect(screen.getByRole("link", { name: "Open on arXiv" })).toHaveAttribute(
      "href",
      papers[0].abstractUrl,
    );
  });

  it("supports swipe-equivalent keyboard controls and restores local choices", () => {
    const firstRender = render(
      <DiscoveryApp generatedAt="2026-08-27T12:00:00Z" papers={papers} />,
    );

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(
      screen.getByRole("heading", { name: papers[1].title }),
    ).toBeInTheDocument();

    firstRender.unmount();
    render(<DiscoveryApp generatedAt="2026-08-27T12:00:00Z" papers={papers} />);

    expect(
      screen.getByRole("heading", { name: papers[1].title }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saved papers, 1" })).toBeInTheDocument();
  });
});
