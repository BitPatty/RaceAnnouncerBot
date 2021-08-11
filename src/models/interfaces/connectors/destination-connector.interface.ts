import { DestinationConnectorIdentifier, DestinationEvent } from '../../enums';
import DestinationEventListenerMap from './destination-event-listener-map.interface';

import {
  ChatChannel,
  ChatMessage,
  RaceInformation,
  TextReply,
  TrackerListReply,
} from '..';

interface DestinationConnector<T extends DestinationConnectorIdentifier> {
  get connectorType(): T;

  get isReady(): boolean;

  reply(to: ChatMessage, content: TextReply | TrackerListReply): Promise<void>;

  postRaceMessage(
    channel: ChatChannel,
    race: RaceInformation,
  ): Promise<ChatMessage | null>;

  updateRaceMessage(
    originalMessage: ChatMessage,
    race: RaceInformation,
  ): Promise<ChatMessage | null>;

  getListeners<TEvent extends DestinationEvent>(
    type: TEvent,
  ): DestinationEventListenerMap[TEvent][];

  addEventListener<TEvent extends DestinationEvent>(
    type: TEvent,
    listener: DestinationEventListenerMap[TEvent],
  ): void;

  removeEventListener<TEvent extends DestinationEvent>(
    type: TEvent,
    listener?: DestinationEventListenerMap[TEvent],
  ): void;

  findChannel(channelIdentifier: string): Promise<ChatChannel | null>;

  postHelpMessage(originalMessage: ChatMessage): Promise<void>;

  botHasRequiredPermissions(channel: ChatChannel): Promise<boolean>;

  connect(): Promise<void>;

  dispose(): Promise<void>;
}

export default DestinationConnector;