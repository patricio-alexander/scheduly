function publicBasePath() {
  return (process.env.NEXT_PUBLIC_BASE_PATH || "/scheduly").replace(/\/$/, "");
}

export function apiUrl(path: string) {
  return `${publicBasePath()}${path}`;
}
