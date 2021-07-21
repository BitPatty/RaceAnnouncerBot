import { Connection, In, Repository } from 'typeorm';

import {
  CommunicationChannelEntity,
  GameEntity,
  TrackerEntity,
} from '../../models/entities';
import LoggerService from '../logger/logger.service';

class TrackerService {
  private readonly trackerRepository: Repository<TrackerEntity>;

  public constructor(private readonly databaseConnection: Connection) {
    this.trackerRepository =
      this.databaseConnection.getRepository(TrackerEntity);
  }

  /**
   * Relations that should always be joined when
   * returning trackers
   */
  private readonly commonRelations = [
    nameof<TrackerEntity>((t) => t.game),
    nameof<TrackerEntity>((t) => t.channel),
  ];

  /**
   * Looks up a tracker mapped to the specified
   * channel and game
   * @param channel The channel
   * @param game The game
   * @returns The first match or null if there is no match
   */
  private async findTracker(
    channel: CommunicationChannelEntity,
    game: GameEntity,
  ): Promise<TrackerEntity | null> {
    const tracker = await this.trackerRepository.findOne({
      relations: this.commonRelations,
      where: {
        channel,
        game,
      },
    });

    LoggerService.log(JSON.stringify(tracker));
    LoggerService.log('CHANNEL');
    LoggerService.log(JSON.stringify(channel.id));
    LoggerService.log('GAME');

    LoggerService.log(JSON.stringify(game.id));

    return tracker ?? null;
  }

  /**
   * Adds a new tracker for the specified game
   * and channel
   * @param channel The target channel
   * @param game The target game
   * @returns The created tracker
   */
  public async addTracker(
    channel: CommunicationChannelEntity,
    game: GameEntity,
  ): Promise<TrackerEntity> {
    // Get an existing tracker on the same server if it exists
    const existingTrackerOnSameServer: TrackerEntity | null =
      await (async () => {
        if (!channel.serverIdentifier) return null;
        const serverTrackers = await this.findTrackersByServer(
          channel.serverIdentifier,
        );

        return serverTrackers.find((t) => t.game.id === game.id) ?? null;
      })();

    LoggerService.log(`${JSON.stringify(existingTrackerOnSameServer)}`);

    // Add/Update the tracker
    const existingTrackerOnSameChannel = await this.findTracker(channel, game);
    LoggerService.log(`${JSON.stringify(existingTrackerOnSameChannel)}`);

    const tracker = (await this.trackerRepository.save({
      ...(existingTrackerOnSameChannel ?? {}),
      channel,
      game,
      isActive: true,
    })) as TrackerEntity;

    // Remove the previous tracker if it exists
    // @TODO: Can still cause the same tracker to be active in multiple channels
    // (deactivate, add, restore)
    if (
      existingTrackerOnSameServer &&
      tracker.id !== existingTrackerOnSameServer.id
    ) {
      await this.trackerRepository.save({
        ...existingTrackerOnSameServer,
        isActive: false,
      });
    }

    return this.trackerRepository.findOne(tracker.id, {
      relations: this.commonRelations,
    }) as Promise<TrackerEntity>;
  }

  /**
   * Finds all trackers mapped to the specified
   * channel
   * @param channelIdentifier The channel identifier
   * @returns The list of trackers mapped to the channel
   */
  public async findTrackersByChannel(
    channelIdentifier: string,
  ): Promise<TrackerEntity[]> {
    const channel = await this.databaseConnection
      .getRepository(CommunicationChannelEntity)
      .findOne({
        where: {
          identifier: channelIdentifier,
        },
      });

    if (!channel) return [];
    return this.trackerRepository.find({
      relations: this.commonRelations,
      where: { channel },
    });
  }

  /**
   * Finds all trackers mapped to the specified server
   * @param serverIdentifier The server identifier
   * @returns The list of trackers mapped to the server
   */
  public async findTrackersByServer(
    serverIdentifier: string,
  ): Promise<TrackerEntity[]> {
    // Since the server identifier is an optional
    // attribute better don't look up all matches
    if (!serverIdentifier) return [];

    const channels = await this.databaseConnection
      .getRepository(CommunicationChannelEntity)
      .find({
        where: {
          serverIdentifier,
        },
      });

    return this.trackerRepository.find({
      relations: this.commonRelations,
      where: {
        channel: In(channels.map((c) => c.id)),
      },
    });
  }

  /**
   * Disables the specified tracker
   * @param tracker The tracker to disable
   */
  public async disableTracker(tracker: TrackerEntity): Promise<void> {
    const existingTracker = await this.trackerRepository.findOne(tracker.id);

    if (existingTracker)
      await this.trackerRepository.save({
        ...existingTracker,
        isActive: false,
      });
  }

  /**
   * Find trackers for the specified game
   * @param game The game
   * @returns The trackers mapped to this game
   */
  public findTrackersByGame(game: GameEntity): Promise<TrackerEntity[]> {
    return this.trackerRepository.find({
      relations: [
        nameof<TrackerEntity>((t) => t.game),
        nameof<TrackerEntity>((t) => t.channel),
      ],
      where: {
        game,
      },
    });
  }
}

export default TrackerService;