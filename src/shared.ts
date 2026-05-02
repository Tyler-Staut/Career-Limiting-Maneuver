export type Location = [latitude: number, longitude: number];

export type GlobeMessage = {
  globe: Record<string, Location>;
  id: string;
};

export type Position = {
  lat: number;
  lng: number;
  id: string;
};

export type OutgoingMessage =
  | {
      type: "add-marker";
      position: Position;
    }
  | {
      type: "remove-marker";
      id: string;
    };
