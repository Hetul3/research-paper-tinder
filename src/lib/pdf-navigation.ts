export function navigateToPdf(
  url: string,
  navigate: (destination: string) => void = (destination) => window.location.assign(destination),
): void {
  navigate(url);
}
