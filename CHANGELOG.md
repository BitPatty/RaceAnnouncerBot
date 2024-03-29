# Changelog

## v4.1.0

- Updated dependencies

## v4.0.2

- Updated dependencies

## v4.0.1

- Disable source worker tests for now

## v4.0.0

- Restore old SRL provider since the SSL certificate has been restored and the new API doesn't provide all infos
- Updated dependencies

## v3.0.1

- Fixed SRL race link

## v3.0.0

- Replaced SRL API with the new one since the cert of the old API expired
- Updated dependencies

## v2.4.1

- Set default database connection charset to `utf8mb4_unicode_ci`

## v2.4.0

- Removed "Like" to lookup database values to avoid wildcarding
- Updated dependencies

## v2.3.1

- Fix redis not working if not on localhost

## v2.3.0

- Code Refactoring
- Updated node-redis to 4.0.1
- Updated dependencies

## v2.2.2

- Updated SRL target URL format
- Updated dependencies

## v2.2.1

- Updated response on failure to add tracker
- Updated discord help text
- Minor code cleanup
- Updated dependencies

## v2.2.0

- Added server name to communication channels

## v2.1.0

- Allow using elasticsearch data streams instead of indexes
- Updated dependencies

## v2.0.5

- Updated dependencies

## v2.0.4

- Updated dependencies

## v2.0.3

- Increased timeout for race sync job locks to 30 seconds

## v2.0.2

- Increased max lookup threshold for unfinished races from 24h to 48h
- Updated dependencies

## v2.0.1

- Fixed invitational races not being posted
- Updated dependencies

## v2.0.0

- Switched to Discord Slash commands due to upcoming privilege issues

## v1.3.0

- Added provider name to Discord embeds
- Fixed `&amp;` not decoding in SRL goals
- Fixed configured log level being ignored on multistream logs
- Fixed bot attempting to fetch discord channels it does not have access to
- Updated dependencies

## v1.2.0

- Added Thumbnail to Discord announcements
- Updated identifiers for racetime racers

## v1.1.2

- Updated Discord formatting depending on entrant status

## v1.1.1

- Updated Discord help message

## v1.1.0

- Added missing "Invited" status to entrants
- Refactoring / Cleanup
- Updated dependencies
