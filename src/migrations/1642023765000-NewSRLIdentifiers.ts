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

/* eslint-disable */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class NewSRLIdentifiers1642023765000 implements MigrationInterface {
  name = 'NewSRLIdentifiers1642023765000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE game set identifier=abbreviation where connector='SRL'`,
    );
  }

  public async down(_: QueryRunner): Promise<void> {
    // Left empty intentionally
  }
}
