import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { keys } from 'ts-transformer-keys';
import BaseEntity, { EntityInitializer } from './base.entity';
import CommunicationChannelEntity from './communication-channel.entity';
import GameEntity from './game.entity';
import Transformers from '../../utils/transformers';

@Entity(Transformers.toTableName(TrackerEntity))
class TrackerEntity extends BaseEntity<TrackerEntity> {
  public constructor(d?: EntityInitializer<TrackerEntity>) {
    super();

    if (d == null) return;
    const entityKeys: string[] = keys<EntityInitializer<TrackerEntity>>();
    for (const key of entityKeys) this[key] = d[key];
  }

  @Column({
    name: Transformers.toAttributeName(
      nameof<TrackerEntity>((e) => e.isActive),
    ),
    default: false,
  })
  public isActive: boolean;

  @Column({
    name: Transformers.toAttributeName(
      nameof<TrackerEntity>((e) => e.identifier),
    ),
  })
  public identifier: string;

  @ManyToOne(() => CommunicationChannelEntity, {
    nullable: false,
  })
  @JoinColumn({
    name: Transformers.toAttributeName(nameof<TrackerEntity>((e) => e.channel)),
  })
  public channel: CommunicationChannelEntity;

  @ManyToOne(() => GameEntity, {
    nullable: false,
  })
  @JoinColumn({
    name: Transformers.toAttributeName(nameof<TrackerEntity>((e) => e.game)),
  })
  public game: GameEntity;
}

export default TrackerEntity;
