import { Server } from "partyserver";

import type { Location, GlobeMessage } from "../shared";
import type { Connection, ConnectionContext } from "partyserver";

type ConnectionState = {
  location: Location;
};

export class Globe extends Server {
  onConnect(conn: Connection<ConnectionState>, ctx: ConnectionContext) {
    const parseCoordinate = (value: unknown, fallback: number) => {
      if (typeof value === "string" && value.trim() === "") {
        return fallback;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const randomLatitude = Math.random() * 180 - 90;
    const randomLongitude = Math.random() * 360 - 180;
    const latitude = parseCoordinate(ctx.request.cf?.latitude, randomLatitude);
    const longitude = parseCoordinate(ctx.request.cf?.longitude, randomLongitude);
    const location: Location = [
      Math.max(-90, Math.min(90, latitude)),
      Math.max(-180, Math.min(180, longitude)),
    ];

    conn.setState({
      location,
    });

    this.broadcastGlobe();
  }

  broadcastGlobe(excludedConnectionId?: string) {
    const globe: GlobeMessage["globe"] = {};

    for (const connection of this.getConnections<ConnectionState>()) {
      if (connection.id === excludedConnectionId) {
        continue;
      }

      if (connection.state?.location) {
        globe[connection.id] = connection.state.location;
      }
    }

    for (const connection of this.getConnections<ConnectionState>()) {
      if (connection.id === excludedConnectionId) {
        continue;
      }

      connection.send(
        JSON.stringify({
          globe,
          id: connection.id,
        } satisfies GlobeMessage),
      );
    }
  }

  onCloseOrError(connection: Connection) {
    this.broadcastGlobe(connection.id);
  }

  onClose(connection: Connection): void | Promise<void> {
    this.onCloseOrError(connection);
  }

  onError(connection: Connection): void | Promise<void> {
    this.onCloseOrError(connection);
  }
}
