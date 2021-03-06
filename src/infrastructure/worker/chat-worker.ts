import { DestinationConnector } from '../../domain/interfaces';
import { DestinationConnectorIdentifier } from '../../domain/enums';
import DiscordConnector from '../../connectors/destination-connectors/discord.connector';
import Worker from './worker.interface';

class ChatWorker<T extends DestinationConnectorIdentifier> implements Worker {
  private readonly connector: DestinationConnector<T>;
  public constructor(connector: T) {
    switch (connector) {
      case DestinationConnectorIdentifier.DISCORD:
        this.connector =
          new DiscordConnector() as unknown as DestinationConnector<T>;
        return;
      default:
        throw new Error(`Invalid destination connector ${connector}`);
    }
  }

  public start(): Promise<void> {
    return this.connector.connect();
  }

  public dispose(): Promise<void> {
    return this.connector.dispose();
  }
}

export default ChatWorker;
