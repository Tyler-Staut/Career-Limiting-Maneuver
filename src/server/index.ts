import { Server } from "partyserver";

import type { Location, GlobeMessage } from "../shared";
import type { Connection, ConnectionContext } from "partyserver";

type ConnectionState = {
  location: Location;
};

export class Globe extends Server {
  onConnect(conn: Connection<ConnectionState>, ctx: ConnectionContext) {
    const latitude = Number(ctx.request.cf?.latitude ?? Math.random() * 180 - 90);
    const longitude = Number(ctx.request.cf?.longitude ?? Math.random() * 360 - 180);

    conn.setState({
      location: [latitude, longitude],
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
