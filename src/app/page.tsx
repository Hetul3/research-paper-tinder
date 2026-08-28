import { DiscoveryApp } from "@/components/discovery-app";
import { getPaperSnapshot } from "@/lib/papers";

export const revalidate = 3600;

export default async function Home() {
  const snapshot = await getPaperSnapshot();

  return <DiscoveryApp {...snapshot} />;
}
