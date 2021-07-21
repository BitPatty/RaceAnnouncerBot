import {
  ChatChannel,
  ChatServer,
  DestinationConnector,
  Race,
  TextReply,
  TrackerListReply,
} from '../../models/interfaces';
import {
  DestinationConnectorIdentifier,
  DestinationEvent,
  MessageChannelType,
  ReplyType,
  SourceConnectorIdentifier,
} from '../../models/enums';

import * as Discord from 'discord.js';
import * as Joi from 'joi';

import ChatMessage from '../../models/interfaces/chat-message.interface';
import DestinationEventListenerMap from '../../models/interfaces/destination-event-listener-map.interface';

import { TrackerEntity } from '../../models/entities';
import ConfigService from '../../core/config/config.service';
import DiscordCommandKey from './discord-command-key.enum';
import DiscordCommandParser from './discord-command-parser';
import LoggerService from '../../core/logger/logger.service';
import MessageBuilderUtils from '../../utils/message-builder.utils';

class DiscordConnector
  implements DestinationConnector<DestinationConnectorIdentifier.DISCORD>
{
  private client?: Discord.Client;
  private _isReady = false;

  /**
   * The event listeners mapped to this connector
   */
  private _eventListeners: {
    [key in keyof DestinationEventListenerMap]: DestinationEventListenerMap[key][];
  } = this.removeAllEventListeners();

  /**
   * Removes all event listeners from the connector
   * @returns The cleared event listener list
   */
  private removeAllEventListeners(): {
    [key in keyof DestinationEventListenerMap]: DestinationEventListenerMap[key][];
  } {
    this._eventListeners = {
      [DestinationEvent.DISCONNECTED]: [],
      [DestinationEvent.COMMAND_RECEIVED]: [],
      [DestinationEvent.ERROR]: [],
    };

    return this._eventListeners;
  }

  public get isReady(): boolean {
    return this._isReady;
  }

  public get connectorType(): DestinationConnectorIdentifier.DISCORD {
    return DestinationConnectorIdentifier.DISCORD;
  }

  public async botHasRequiredPermissions(
    channel: ChatChannel,
  ): Promise<boolean> {
    if (!this.client?.user) throw new Error('User not set');
    const discordChannel = await this.findTextChannel(channel.identifier);
    if (!discordChannel) return false;

    const permissions = discordChannel.permissionsFor(this.client.user);
    if (!permissions) throw new Error('Failed to load permissions');

    if (!permissions.has('READ_MESSAGE_HISTORY')) return false;
    if (!permissions.has('SEND_MESSAGES')) return false;
    if (!permissions.has('VIEW_CHANNEL')) return false;
    if (!permissions.has('ADD_REACTIONS')) return false;

    return true;
  }

  /**
   * Gets the listeners for the specified event type
   * @param type The event type
   * @returns The listeners mapped to the specified event
   */
  public getListeners<TEvent extends DestinationEvent>(
    type: TEvent,
  ): DestinationEventListenerMap[TEvent][] {
    return this._eventListeners[type] as DestinationEventListenerMap[TEvent][];
  }

  /**
   * Adds the specified listener to for the specified event type
   * @param type The event type
   * @param listener The listener function
   */
  public addEventListener<TEvent extends DestinationEvent>(
    type: TEvent,
    listener: DestinationEventListenerMap[TEvent],
  ): void {
    const listeners = this.getListeners(type);
    if (!listeners.includes(listener)) listeners.push(listener);
  }

  /**
   * Removes the specified event listener
   * @param type The event type the listener is mapped to
   * @param listener The listener function
   */
  public removeEventListener<TEvent extends DestinationEvent>(
    type: TEvent,
    listener?: DestinationEventListenerMap[TEvent],
  ): void {
    if (!listener) {
      this._eventListeners[type] = [];
      return;
    }

    const listeners = this.getListeners(type);
    if (listeners.includes(listener)) {
      listeners.splice(listeners.indexOf(listener), 1);
    }
  }

  /**
   * Attempts to find the specified message
   * @param channelId The channel in which the message is located
   * @param messageId The message identifier
   * @returns The message or null if it fails to load the message
   */
  private async findMessage(
    channelId: string,
    messageId: string,
  ): Promise<Discord.Message | null> {
    if (!this.client) return null;
    const channel = await this.findTextChannel(channelId);
    if (!channel) return null;

    LoggerService.log(channelId);
    LoggerService.log(messageId);

    const matches = await channel.messages.fetch({
      around: messageId,
      limit: 1,
    });

    if (matches.size !== 1) return null;

    const [[, originalMessage]] = matches;

    if (
      !originalMessage ||
      originalMessage.id !== messageId ||
      !(originalMessage instanceof Discord.Message)
    ) {
      return null;
    }

    return originalMessage;
  }

  /**
   * Attempts to find the specified text channel
   * @param channelId The channel identifier
   * @returns The channel or null if it fails to load the channel
   */
  private async findTextChannel(
    channelId: string,
  ): Promise<Discord.TextChannel | null> {
    if (!this.client) return null;
    const channel = await this.client.channels.fetch(channelId);
    if (!channel) return null;

    if (!(channel instanceof Discord.TextChannel)) {
      LoggerService.warn(
        `Found channel ${channelId}, but it is not a text channel`,
      );
      return null;
    }

    return channel;
  }

  /**
   * Finds a channel by its id
   * @param channelIdentifier The channel id
   * @returns The channel with the specified id
   */
  public async findChannel(
    channelIdentifier: string,
  ): Promise<ChatChannel | null> {
    const channel = await this.findTextChannel(channelIdentifier);
    if (!channel) return null;

    return {
      identifier: channel.id,
      serverIdentifier: channel.guild.id,
      name: channel.name,
      type: MessageChannelType.TEXT_CHANNEL,
    };
  }

  /**
   * Builds the embed for race updates on the
   * specified race
   * @param race The race
   * @returns The embed
   */
  private buildRaceEmbed(race: Race): Discord.MessageEmbed {
    let embed = new Discord.MessageEmbed()
      .setTitle(`Race room: ${race.identifier}`)
      .setColor(MessageBuilderUtils.getRaceStatusIndicatorColor(race.status))
      .addField(
        MessageBuilderUtils.getGameTitle(),
        MessageBuilderUtils.getGameText(race),
      )
      .addField(
        MessageBuilderUtils.getGoalTitle(),
        MessageBuilderUtils.getGoalText(race),
      )
      .setFooter(MessageBuilderUtils.getRaceStatusIndicatorText(race.status))
      .setTimestamp();

    // Only add the URL if it's a proper URL
    if (race.url && Joi.string().uri().validate(race.url).error == null)
      embed = embed.setURL(race.url);

    // Set the cover as thumbnail if it exists
    if (
      race.game.imageUrl &&
      Joi.string().uri().validate(race.game.imageUrl).error == null
    )
      embed = embed.setThumbnail(race.game.imageUrl);

    // List the entrants
    const entrantString =
      race.entrants.length === 0
        ? '-'
        : MessageBuilderUtils.sortEntrants(race.entrants ?? [])
            .map((e) =>
              MessageBuilderUtils.getEntrantStatusText(e).replace(
                e.displayName,
                `**${e.displayName}**`,
              ),
            )
            .join('\r\n');

    embed = embed.addField(
      MessageBuilderUtils.getEntrantsTitle(),
      entrantString,
    );

    return embed;
  }

  /**
   * Posts a race update to the specified channel
   * @param channel The channel in which the update should be posted
   * @param race The race
   * @returns The posted message
   */
  public async postRaceMessage(
    _: ChatServer,
    channel: ChatChannel,
    race: Race,
  ): Promise<ChatMessage | null> {
    if (!this.client) return null;

    const discordChannel = await this.findTextChannel(channel.identifier);
    if (!discordChannel) {
      LoggerService.error(`Failed to fetch channel => ${discordChannel}`);
      return null;
    }

    const embed = this.buildRaceEmbed(race);
    const msg = await discordChannel.send(embed);
    return DiscordCommandParser.transformDiscordMessageToChatMessage(
      msg,
      this.client,
    );
  }

  /**
   * Updates the specified race message
   * @param originalPost The original chat message
   * @param race The race
   * @returns The updated chat message
   */
  public async updateRaceMessage(
    originalPost: ChatMessage,
    race: Race,
  ): Promise<ChatMessage | null> {
    if (!this.client) return null;
    const originalMessage = await this.findMessage(
      originalPost.channel.identifier,
      originalPost.identifier,
    );

    if (!originalMessage) {
      LoggerService.error('Failed to fetch original message');
      return null;
    }

    const embed = this.buildRaceEmbed(race);
    const msg = await originalMessage.edit(embed);
    return DiscordCommandParser.transformDiscordMessageToChatMessage(
      msg,
      this.client,
    );
  }

  private buildTrackerListEmbed(items: TrackerEntity[]): Discord.MessageEmbed {
    const embed = new Discord.MessageEmbed();

    if (items.length === 0)
      return embed.addField('Trackers', 'No trackers registered');

    const activeTrackerList = items
      .filter((i) => i.isActive)
      .map((i) => `${i.game.name} in <#${i.channel.identifier}>`)
      .join('\r\n');

    const inactiveTrackerList = items
      .filter((i) => !i.isActive)
      .map((i) => `${i.game.name} in <#${i.channel.identifier}>`)
      .join('\r\n');

    return embed
      .addField('Active Trackers', activeTrackerList || '-')
      .addField('Inactive Trackers', inactiveTrackerList || '-');
  }

  /**
   * Reply to the specified chat message
   * @param to The message to reply to
   * @param msg The message content
   */
  public async reply(
    to: ChatMessage,
    content: Discord.MessageEmbed | TextReply | TrackerListReply,
  ): Promise<void> {
    const originalMessage = await this.findMessage(
      to.channel.identifier,
      to.identifier,
    );

    const message = (() => {
      if (content instanceof Discord.MessageEmbed) return content;

      switch (content.type) {
        case ReplyType.TEXT:
          return content.message;
        case ReplyType.TRACKER_LIST:
          return this.buildTrackerListEmbed(content.items);
      }
    })();

    if (!originalMessage) {
      LoggerService.error(
        'Failed to fetch original message, using mention instead',
      );
      const channel = await this.findTextChannel(to.channel.identifier);
      if (!channel) {
        LoggerService.error('Failed to fetch channel');
        return;
      }

      if (message instanceof Discord.MessageEmbed) {
        await channel.send(`<@${to.author.identifier}>`, {
          embed: message,
        });
        return;
      }

      await channel.send(`<@${to.author.identifier}>\r\n${message}`);
      return;
    }

    await originalMessage.reply(message);
  }

  private hasUserAdministrativePermission(user: Discord.GuildMember): boolean {
    return (
      user.hasPermission('ADMINISTRATOR') ||
      ConfigService.discordGlobalAdmins.includes(user.id)
    );
  }

  private isBotMention(msg: Discord.Message): boolean {
    return this.client?.user != null && msg.mentions.has(this.client.user);
  }

  private async postHelpText(originalMessage: Discord.Message): Promise<void> {
    if (!this.client) return;

    const embed = new Discord.MessageEmbed()
      .setTitle('Race Announcer Help')
      .setColor('#0390fc')
      .addField(
        'General Info',
        `
        Only users with the 'Administrator' permission on the server can use bot commands.

        Available Providers:
        - ${SourceConnectorIdentifier.SPEEDRUNSLIVE} (SpeedRunsLive)
        - ${SourceConnectorIdentifier.RACETIME_GG} (RacetimeGG)
        `,
      )
      .addField(
        'Help',
        `
        \`<@Bot Mention> help\`

        Displays this help message.
        `,
      )
      .addField(
        'Adding a Tracker',
        `
        \`<@Bot Mention> track <provider> <gameid> <#channel mention>\`

        Example usage: 
        <@${this.client.user?.id}> track SRL sms <#${originalMessage.channel.id}>

        This would add a tracker for Super Mario Sunshine on SRL to <#${originalMessage.channel.id}>. Note that you cannot track the same game in multiple channels.
        `,
      )
      .addField(
        'Removing a Tracker',
        `
        \`<@Bot Mention> untrack <provider> <gameid>\`

        Example usage: 
        <@${this.client.user?.id}> untrack racetime oot

        This would remove the racetime OOT tracker 
        `,
      );

    await this.reply(
      DiscordCommandParser.transformDiscordMessageToChatMessage(
        originalMessage,
        this.client,
      ),
      embed,
    );
  }

  /**
   * Connect the bot to the discord chat
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new Discord.Client();
      this.client.on('ready', () => {
        this._isReady = true;
        resolve();
      });

      this.client.on('message', async (msg) => {
        if (
          !this.client ||
          !this.isBotMention(msg) ||
          !msg.member ||
          !this.hasUserAdministrativePermission(msg.member)
        )
          return;

        LoggerService.log(`Received message => ${msg.content}`);

        const commandKey = DiscordCommandParser.parseCommandKey(msg);

        if (!commandKey) {
          LoggerService.error(`Failed to parse command key`);
          return;
        }

        if (commandKey === DiscordCommandKey.HELP) {
          await this.postHelpText(msg);
          return;
        }

        const command = DiscordCommandParser.parseCommand(msg, this.client);
        if (!command) {
          LoggerService.error(`Failed to parse command`);
          return;
        }

        this._eventListeners[DestinationEvent.COMMAND_RECEIVED].forEach((l) =>
          l(command),
        );
      });

      this.client.on('disconnect', () => {
        this._isReady = false;
        this._eventListeners[DestinationEvent.DISCONNECTED].forEach((l) => l());
      });

      this.client.on('error', (err) => {
        LoggerService.log(`[Discord] error: ${err}`);
        reject(err);
      });

      void this.client.login(ConfigService.discordToken);
    });
  }

  /**
   * Destroy the connector and cleanup
   * the resources
   */
  public dispose(): Promise<void> {
    this.removeAllEventListeners();
    if (!this.client) return Promise.resolve();
    this.client.destroy();
    this.client = undefined;
    return Promise.resolve();
  }
}

export default DiscordConnector;