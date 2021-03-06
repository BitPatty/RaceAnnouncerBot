import { Connection, In } from 'typeorm';
import { CronJob } from 'cron';
import { Entrant, SourceConnector } from '../../domain/interfaces';
import {
  EntrantEntity,
  GameEntity,
  RaceEntity,
  RacerEntity,
} from '../../domain/models';
import { SourceConnectorIdentifier } from '../../domain/enums';
import ConfigService from '../config/config.service';
import DatabaseService from '../database/database.service';
import RaceTimeGGConnector from '../../connectors/source-connectors/racetimegg/racetimegg.connector';
import SpeedRunsLiveConnector from '../../connectors/source-connectors/speedrunslive/speedrunslive.connector';
import Worker from './worker.interface';

class SourceWorker<T extends SourceConnectorIdentifier> implements Worker {
  private readonly connector: SourceConnector<T>;
  private databaseConnection: Connection;

  private gameSyncJob: CronJob;
  private raceSyncJob: CronJob;

  public constructor(connector: SourceConnectorIdentifier) {
    switch (connector) {
      case SourceConnectorIdentifier.RACETIME_GG:
        this.connector =
          new RaceTimeGGConnector() as unknown as SourceConnector<T>;
        break;
      case SourceConnectorIdentifier.SPEEDRUNSLIVE:
        this.connector =
          new SpeedRunsLiveConnector() as unknown as SourceConnector<T>;
        break;
      default:
        throw new Error(`Invalid source connector ${connector}`);
    }

    this.initRaceSyncJob();
    this.initGameSyncJob();
  }

  private initRaceSyncJob = (): void => {
    this.raceSyncJob = new CronJob(ConfigService.raceSyncInterval, async () => {
      console.log('Synchronizing races');
      const syncTimeStamp = new Date();

      const raceList = await this.connector.getActiveRaces();
      const raceRepository = this.databaseConnection.getRepository(RaceEntity);
      const gameRepository = this.databaseConnection.getRepository(GameEntity);
      const entrantRepository =
        this.databaseConnection.getRepository(EntrantEntity);
      const racerRepository =
        this.databaseConnection.getRepository(RacerEntity);

      console.log(`Found ${raceList.length} races to sync`);
      for (const race of raceList) {
        try {
          const game = await gameRepository.findOne({
            where: {
              identifier: race.game.identifier,
              connector: this.connector.connectorType,
            },
          });

          if (!game) continue;

          const racers: RacerEntity[] = [];

          // Update racer entities
          for (const entrant of race.entrants) {
            const existingRacer = await racerRepository.findOne({
              where: {
                identifier: entrant.displayName.toLowerCase(),
                connector: this.connector.connectorType,
              },
            });

            const updatePayload: RacerEntity = {
              ...(existingRacer ?? {}),
              ...new RacerEntity({
                identifier: entrant.displayName.toLowerCase(),
                displayName: entrant.displayName,
                connector: this.connector.connectorType,
              }),
            };

            const updatedRacer = await racerRepository.save(updatePayload);
            racers.push(updatedRacer);
          }

          // Update the race itself
          const existingRace = await raceRepository.findOne({
            where: {
              identifier: race.identifier,
              connector: this.connector.connectorType,
            },
          });

          const updatedRace = await raceRepository.save({
            ...(existingRace ?? {}),
            ...new RaceEntity({
              identifier: race.identifier,
              goal: race.goal ?? '-',
              connector: this.connector.connectorType,
              status: race.status,
              game,
            }),
          });

          // Update the entrant list
          const existingEntrants = await entrantRepository.find({
            relations: [
              nameof<EntrantEntity>((e) => e.racer),
              nameof<EntrantEntity>((e) => e.race),
            ],
            where: {
              race: updatedRace,
            },
          });

          const updatedEntrants: EntrantEntity[] = [];

          // Add / Update entrants
          for (const racer of racers) {
            const existingEntrant = existingEntrants.find(
              (e) => e.racer.id === racer.id,
            );

            const entrantData = race.entrants.find(
              (e) => e.displayName === racer.displayName,
            ) as Entrant;

            const updatedEntrant = await entrantRepository.save({
              ...(existingEntrant ?? {}),
              ...new EntrantEntity({
                race: updatedRace,
                racer,
                status: entrantData.status,
                finalTime: entrantData.finalTime,
              }),
            });

            updatedEntrants.push(updatedEntrant);
          }

          // Remove entrants that have left
          const removedEntrantIds = existingEntrants
            .filter((e) => !updatedEntrants.some((u) => u.id === e.id))
            .map((e) => e.id);

          if (removedEntrantIds.length > 0)
            await entrantRepository.delete({
              race: updatedRace,
              id: In(removedEntrantIds),
            });

          // Update the tracker timestamps
          const hasEntrantChanges =
            removedEntrantIds.length > 0 ||
            existingEntrants.length !== race.entrants.length ||
            updatedEntrants.some(
              (e) =>
                existingEntrants.find((x) => x.id === e.id)?.updatedAt !==
                e.updatedAt,
            );

          const hasRaceChanges =
            updatedRace.updatedAt !== existingRace?.updatedAt;

          if (hasRaceChanges)
            console.log(`Race change detected: ${race.identifier}`);

          await raceRepository.save({
            ...updatedRace,
            lastSyncAt: syncTimeStamp,
            lastChangeAt:
              hasEntrantChanges || hasRaceChanges
                ? new Date()
                : updatedRace.lastChangeAt,
          });
        } catch (err) {
          console.error(err);
        }
      }

      console.log('Synchronization finished');
    });
  };

  private initGameSyncJob(): void {
    this.gameSyncJob = new CronJob(
      ConfigService.gameSyncInterval,
      async () => {
        try {
          console.log('Fetching game list');
          const gamelist = await this.connector.listGames();

          console.log(`Updating games in database (${gamelist.length} total)`);
          const gameRepository =
            this.databaseConnection.getRepository(GameEntity);

          for (const game of gamelist) {
            console.log(`Updating ${game.name}`);
            const existingGame = await gameRepository.find({
              where: {
                identifier: game.identifier,
                connector: this.connector.connectorType,
              },
            });

            await gameRepository.save({
              ...(existingGame ?? {}),
              ...game,
            });
          }
        } catch (err) {
          console.error(err);
        }
      },
      undefined,
      false,
      undefined,
      null,
      true,
    );
  }

  public async start(): Promise<void> {
    this.databaseConnection = await DatabaseService.getConnection();
    this.gameSyncJob.start();
    this.raceSyncJob.start();
  }

  public async dispose(): Promise<void> {
    this.gameSyncJob.stop();
    this.raceSyncJob.stop();
    await this.databaseConnection.close();
  }
}

export default SourceWorker;
