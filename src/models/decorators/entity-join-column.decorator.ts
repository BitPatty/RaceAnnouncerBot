/**
 * Race Announcer Bot - A race announcer bot for speedrunners
 * Copyright (C) 2022 Matteias Collet <matteias.collet@bluewin.ch>
 * Official Repository: https://github.com/BitPatty/RaceAnnouncerBot
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { JoinColumn } from 'typeorm';

import TransformerUtils from '../../utils/transformer.utils';

// Allow the type 'Object' to be used
/* eslint-disable @typescript-eslint/ban-types */

/**
 * Decorator override for the typeorm {@link JoinColumn} decorator
 * used to simplify the declaration process
 *
 * @returns  The join-column decorator
 */
const EntityJoinColumn = (): PropertyDecorator => {
  return (target: Object, propertyKey: string | symbol): void => {
    const columnName = TransformerUtils.toAttributeName(propertyKey as string);

    JoinColumn({
      name: columnName,
    })(target, propertyKey);
  };
};

export { EntityJoinColumn };
