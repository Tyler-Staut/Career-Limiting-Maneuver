export type Location = [latitude: number, longitude: number];

export type GlobeMessage = {
  globe: Record<string, Location>;
  id: string;
};
