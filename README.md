# Race Announcer Bot

> This is a WIP rewrite. For the version currently in production check out the v2 branch: https://github.com/BitPatty/RaceAnnouncerBot/tree/v2

---

![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/bitpatty/raceannouncerbot/develop)
[![Development Build](https://github.com/BitPatty/RaceAnnouncerBot/actions/workflows/workflow.yml/badge.svg?branch=develop)](https://github.com/BitPatty/RaceAnnouncerBot/actions/workflows/workflow.yml)
![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/bitpatty/raceannouncerbot/master)
[![Production Build](https://github.com/BitPatty/RaceAnnouncerBot/actions/workflows/workflow.yml/badge.svg?branch=master)](https://github.com/BitPatty/RaceAnnouncerBot/actions/workflows/workflow.yml)

A speedrun race announcer bot designed for multi-source and multi-destination usage. It currently supports the following data sources:

- [RaceTimeGG](https://racetime.gg/)
- [SpeedRunsLive](https://speedrunslive.com/)

As well as the following platforms for announcements:

- [Discord](https://discord.com/)

## Quickstart (Docker)

To use the prebuilt docker images head over to [Packages](https://github.com/BitPatty?tab=packages&repo_name=RaceAnnouncerBot). The application can be scaled horizontally as long as they're connected to the same database/redis.

### Services

The bot follows a stateless design and and requires the following services to be available on your system:

- A Maria or MySQL database
- Redis >= 5

### Environment variables

The following environment variables must be set in order to run the application:

| Name              | Description                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATABASE_TYPE     | `mariadb` or `mysql`, depending on your installation (defaults to `mysql`)                                                                                           |
| DATABASE_USER     | The user used to connect to the database                                                                                                                             |
| DATABASE_PASSWORD | The password to the database                                                                                                                                         |
| DATABASE_PORT     | The port of the database (defaults to `3306`)                                                                                                                        |
| DATABASE_HOST     | The host address or host name of your database                                                                                                                       |
| DATABASE_NAME     | The name of the database                                                                                                                                             |
| REDIS_HOST        | The host address of your Redis instance                                                                                                                              |
| REDIS_PORT        | The port on which Redis can be accessed                                                                                                                              |
| REDIS_PASSWORD    | The password of your Redis instance                                                                                                                                  |
| DISCORD_BOT_TOKEN | The access token of your Discord bot. You can generate one over at the [Discord Developer Portal](https://discord.com/developers/applications) in the `Bot` section. |

The following environment variables can be set optionally:

| Name                         | Description                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| RACETIME_BASE_URL            | The base url to racetime.gg (defaults to `https://racetime.gg`)                              |
| SRL_BASE_URL                 | The base url to SpeedRunsLive (defaults to `https://speedrunslive.com`)                      |
| SRL_API_BASE_URL             | The base url of the SpeedRunsLive API (defaults to `https://api.speedrunslive.com`)          |
| DISCORD_GLOBAL_ADMINS        | Comma-seperated list of user ids which should be considered bot admins on all guilds         |
| LOG_LEVEL                    | The max log level. Can either be `info` or `debug` (defaults to `info`)                      |
| LOG_PRETTY_PRINT             | Whether to pretty print logs (useful for devs). One of `true`/`false` (defaults to `false`). |
| ANNOUNCEMENT_SYNC_INTERVAL   | The interval for announcement updates in cron format (defaults to `*/10 * * * * *`)          |
| GAME_SYNC_INTERVAL           | The interval for game database synchronization (defaults to `0 0 * * * * `)                  |
| WORKER_HEALTH_CHECK_INTERVAL | The interval for worker health checks (defaults to `*/10 * * * * `)                          |
| ELASTICSEARCH_URL            | The URL to your elasticsearch instance (if any) which logs will be streamed to               |
| ELASTICSEARCH_INDEX          | The elasticsearch index name (defaults to `race-announcer-bot`)                              |

## License

```
Copyright 2021 Matteias Collet (https://github.com/BitPatty)

This project and all source files in this repository are
licensed under the GNU Affero General Public License v3
(see LICENSE).
```
