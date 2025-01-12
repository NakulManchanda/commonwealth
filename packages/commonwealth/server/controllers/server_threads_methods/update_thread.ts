import moment from 'moment';
import { UserInstance } from '../../models/user';
import { ServerThreadsController } from '../server_threads_controller';
import { AddressInstance } from '../../models/address';
import { ChainInstance } from '../../models/chain';
import { Op, Sequelize, Transaction } from 'sequelize';
import { renderQuillDeltaToText, validURL } from '../../../shared/utils';
import { EmitOptions } from '../server_notifications_methods/emit';
import {
  NotificationCategories,
  ProposalType,
} from '../../../../common-common/src/types';
import { parseUserMentions } from '../../util/parseUserMentions';
import { ThreadAttributes, ThreadInstance } from '../../models/thread';
import { AppError, ServerError } from '../../../../common-common/src/errors';
import { DB } from '../../models';
import { findAllRoles } from '../../util/roles';
import { TrackOptions } from '../server_analytics_methods/track';
import { MixpanelCommunityInteractionEvent } from '../../../shared/analytics/types';
import { uniq } from 'lodash';

export const Errors = {
  ThreadNotFound: 'Thread not found',
  BanError: 'Ban error',
  NoTitle: 'Must provide title',
  NoBody: 'Must provide body',
  InvalidLink: 'Invalid thread URL',
  ParseMentionsFailed: 'Failed to parse mentions',
  Unauthorized: 'Unauthorized',
  InvalidStage: 'Please Select a Stage',
  FailedToParse: 'Failed to parse custom stages',
  InvalidTopic: 'Invalid topic',
  MissingCollaborators: 'Failed to find all provided collaborators',
  CollaboratorsOverlap:
    'Cannot overlap addresses when adding/removing collaborators',
};

export type UpdateThreadOptions = {
  user: UserInstance;
  address: AddressInstance;
  chain: ChainInstance;
  threadId?: number;
  title?: string;
  body?: string;
  stage?: string;
  url?: string;
  locked?: boolean;
  pinned?: boolean;
  archived?: boolean;
  spam?: boolean;
  topicId?: number;
  topicName?: string;
  collaborators?: {
    toAdd?: number[];
    toRemove?: number[];
  };
  canvasSession?: any;
  canvasAction?: any;
  canvasHash?: any;
  discordMeta?: any;
};

export type UpdateThreadResult = [
  ThreadAttributes,
  EmitOptions[],
  TrackOptions[]
];

export async function __updateThread(
  this: ServerThreadsController,
  {
    user,
    address,
    chain,
    threadId,
    title,
    body,
    stage,
    url,
    locked,
    pinned,
    archived,
    spam,
    topicId,
    topicName,
    collaborators,
    canvasSession,
    canvasAction,
    canvasHash,
    discordMeta,
  }: UpdateThreadOptions
): Promise<UpdateThreadResult> {
  // Discobot handling
  if (!threadId) {
    if (!discordMeta) {
      throw new AppError(Errors.ThreadNotFound);
    }
    const existingThread = await this.models.Thread.findOne({
      where: { discord_meta: discordMeta },
    });
    if (!existingThread) {
      throw new AppError(Errors.ThreadNotFound);
    }
    threadId = existingThread.id;
  }

  // check if banned
  const [canInteract, banError] = await this.banCache.checkBan({
    chain: chain.id,
    address: address.address,
  });
  if (!canInteract) {
    throw new AppError(`Ban error: ${banError}`);
  }

  const thread = await this.models.Thread.findByPk(threadId);
  if (!thread) {
    throw new AppError(`${Errors.ThreadNotFound}: ${threadId}`);
  }

  // get various permissions
  const userOwnedAddressIds = (await user.getAddresses())
    .filter((addr) => !!addr.verified)
    .map((addr) => addr.id);
  const roles = await findAllRoles(
    this.models,
    { where: { address_id: { [Op.in]: userOwnedAddressIds } } },
    chain.id,
    ['moderator', 'admin']
  );

  const isThreadOwner = userOwnedAddressIds.includes(thread.address_id);
  const isMod = !!roles.find(
    (r) => r.chain_id === chain.id && r.permission === 'moderator'
  );
  const isAdmin = !!roles.find(
    (r) => r.chain_id === chain.id && r.permission === 'admin'
  );
  const isSuperAdmin = user.isAdmin;
  if (!isThreadOwner && !isMod && !isAdmin && !isSuperAdmin) {
    throw new AppError(Errors.Unauthorized);
  }
  const permissions = {
    isThreadOwner,
    isMod,
    isAdmin,
    isSuperAdmin,
  };

  const now = new Date();

  // update version history
  let latestVersion;
  try {
    latestVersion = JSON.parse(thread.version_history[0]).body;
  } catch (err) {
    console.log(err);
  }
  if (decodeURIComponent(body) !== latestVersion) {
    const recentEdit: any = {
      timestamp: moment(now),
      author: address.address,
      body: decodeURIComponent(body),
    };
    const versionHistory: string = JSON.stringify(recentEdit);
    const arr = thread.version_history;
    arr.unshift(versionHistory);
    thread.version_history = arr;
  }

  // build analytics
  const allAnalyticsOptions: TrackOptions[] = [];

  //  patch thread properties
  const transaction = await this.models.sequelize.transaction();

  try {
    const toUpdate: Partial<ThreadAttributes> = {};

    await setThreadAttributes(
      permissions,
      thread,
      {
        title,
        body,
        url,
        canvasSession,
        canvasAction,
        canvasHash,
      },
      toUpdate
    );

    await setThreadPinned(permissions, pinned, toUpdate);

    await setThreadSpam(permissions, spam, toUpdate);

    await setThreadLocked(permissions, locked, toUpdate);

    await setThreadArchived(permissions, archived, toUpdate);

    await setThreadStage(
      permissions,
      stage,
      chain,
      allAnalyticsOptions,
      toUpdate
    );

    await setThreadTopic(
      permissions,
      thread,
      topicId,
      topicName,
      this.models,
      toUpdate
    );

    await thread.update(
      {
        ...toUpdate,
        last_edited: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      { transaction }
    );

    await updateThreadCollaborators(
      permissions,
      thread,
      collaborators,
      this.models,
      transaction
    );

    await transaction.commit();
  } catch (err) {
    console.error(err);
    await transaction.rollback();
    if (err instanceof AppError || err instanceof ServerError) {
      throw err;
    }
    throw new ServerError(`transaction failed: ${err.message}`);
  }

  // ---

  address
    .update({
      last_active: Sequelize.literal('CURRENT_TIMESTAMP'),
    })
    .catch(console.error);

  const finalThread = await this.models.Thread.findOne({
    where: { id: thread.id },
    include: [
      { model: this.models.Address, as: 'Address' },
      {
        model: this.models.Address,
        as: 'collaborators',
      },
      { model: this.models.Topic, as: 'topic' },
    ],
  });

  // build notifications
  const allNotificationOptions: EmitOptions[] = [];

  allNotificationOptions.push({
    notification: {
      categoryId: NotificationCategories.ThreadEdit,
      data: {
        created_at: now,
        thread_id: +finalThread.id,
        root_type: ProposalType.Thread,
        root_title: finalThread.title,
        chain_id: finalThread.chain,
        author_address: finalThread.Address.address,
        author_chain: finalThread.Address.chain,
      },
    },
    // don't send webhook notifications for edits
    webhookData: null,
    excludeAddresses: [address.address],
  });

  let mentions;
  try {
    const previousDraftMentions = parseUserMentions(latestVersion);
    const currentDraftMentions = parseUserMentions(decodeURIComponent(body));
    mentions = currentDraftMentions.filter((addrArray) => {
      let alreadyExists = false;
      previousDraftMentions.forEach((addrArray_) => {
        if (addrArray[0] === addrArray_[0] && addrArray[1] === addrArray_[1]) {
          alreadyExists = true;
        }
      });
      return !alreadyExists;
    });
  } catch (e) {
    throw new AppError(Errors.ParseMentionsFailed);
  }

  // grab mentions to notify tagged users
  let mentionedAddresses;
  if (mentions?.length > 0) {
    mentionedAddresses = await Promise.all(
      mentions.map(async (mention) => {
        try {
          const mentionedUser = await this.models.Address.findOne({
            where: {
              chain: mention[0],
              address: mention[1],
            },
            include: [this.models.User],
          });
          return mentionedUser;
        } catch (err) {
          return null;
        }
      })
    );
    // filter null results
    mentionedAddresses = mentionedAddresses.filter((addr) => !!addr);
  }

  // notify mentioned users, given permissions are in place
  if (mentionedAddresses?.length > 0) {
    mentionedAddresses.forEach((mentionedAddress) => {
      if (!mentionedAddress.User) {
        return; // some Addresses may be missing users, e.g. if the user removed the address
      }
      allNotificationOptions.push({
        notification: {
          categoryId: NotificationCategories.NewMention,
          data: {
            mentioned_user_id: mentionedAddress.User.id,
            created_at: now,
            thread_id: +finalThread.id,
            root_type: ProposalType.Thread,
            root_title: finalThread.title,
            comment_text: finalThread.body,
            chain_id: finalThread.chain,
            author_address: finalThread.Address.address,
            author_chain: finalThread.Address.chain,
          },
        },
        webhookData: null,
        excludeAddresses: [finalThread.Address.address],
      });
    });
  }

  return [finalThread.toJSON(), allNotificationOptions, allAnalyticsOptions];
}

// -----

export type UpdateThreadPermissions = {
  isThreadOwner: boolean;
  isMod: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

/**
 * Throws error if none of the permission flags are satisfied
 * (no error is thrown if at least one flag is satisfied)
 */
export function validatePermissions(
  permissions: UpdateThreadPermissions,
  flags: Partial<UpdateThreadPermissions>
) {
  const keys = ['isThreadOwner', 'isMod', 'isAdmin', 'isSuperAdmin'];
  for (const k of keys) {
    if (flags[k] && permissions[k]) {
      // at least one flag is satisfied
      return;
    }
  }
  // no flags were satisfied
  throw new AppError(Errors.Unauthorized);
}

export type UpdatableThreadAttributes = {
  title?: string;
  body?: string;
  url?: string;
  canvasSession?: string;
  canvasAction?: string;
  canvasHash?: string;
};

/**
 * Updates basic properties of the thread
 */
async function setThreadAttributes(
  permissions: UpdateThreadPermissions,
  thread: ThreadInstance,
  {
    title,
    body,
    url,
    canvasSession,
    canvasAction,
    canvasHash,
  }: UpdatableThreadAttributes,
  toUpdate: Partial<ThreadAttributes>
) {
  if (
    typeof title !== 'undefined' ||
    typeof body !== 'undefined' ||
    typeof url !== 'undefined'
  ) {
    validatePermissions(permissions, {
      isThreadOwner: true,
      isMod: true,
      isAdmin: true,
      isSuperAdmin: true,
    });

    // title
    if (typeof title !== 'undefined') {
      if (!title) {
        throw new AppError(Errors.NoTitle);
      }
      toUpdate.title = title;
    }

    // body
    if (typeof body !== 'undefined') {
      if (thread.kind === 'discussion' && (!body || !body.trim())) {
        throw new AppError(Errors.NoBody);
      }
      toUpdate.body = body;
      toUpdate.plaintext = (() => {
        try {
          return renderQuillDeltaToText(JSON.parse(decodeURIComponent(body)));
        } catch (e) {
          return decodeURIComponent(body);
        }
      })();
    }

    // url
    if (typeof url !== 'undefined' && thread.kind === 'link') {
      if (!validURL(url)) {
        throw new AppError(Errors.InvalidLink);
      }
      toUpdate.url = url;
    }

    if (typeof canvasSession !== 'undefined') {
      toUpdate.canvas_session = canvasSession;
      toUpdate.canvas_action = canvasAction;
      toUpdate.canvas_hash = canvasHash;
    }
  }
}

/**
 * Pins and unpins the thread
 */
async function setThreadPinned(
  permissions: UpdateThreadPermissions,
  pinned: boolean | undefined,
  toUpdate: Partial<ThreadAttributes>
) {
  if (typeof pinned !== 'undefined') {
    validatePermissions(permissions, {
      isMod: true,
      isAdmin: true,
      isSuperAdmin: true,
    });

    toUpdate.pinned = pinned;
  }
}

/**
 * Locks and unlocks the thread
 */
async function setThreadLocked(
  permissions: UpdateThreadPermissions,
  locked: boolean | undefined,
  toUpdate: Partial<ThreadAttributes>
) {
  if (typeof locked !== 'undefined') {
    validatePermissions(permissions, {
      isThreadOwner: true,
      isMod: true,
      isAdmin: true,
      isSuperAdmin: true,
    });

    toUpdate.read_only = locked;
    toUpdate.locked_at = locked
      ? (Sequelize.literal('CURRENT_TIMESTAMP') as any)
      : null;
  }
}

/**
 * Archives and unarchives a thread
 */
async function setThreadArchived(
  permissions: UpdateThreadPermissions,
  archive: boolean | undefined,
  toUpdate: Partial<ThreadAttributes>
) {
  if (typeof archive !== 'undefined') {
    validatePermissions(permissions, {
      isThreadOwner: true,
      isMod: true,
      isAdmin: true,
      isSuperAdmin: true,
    });

    toUpdate.archived_at = archive
      ? (Sequelize.literal('CURRENT_TIMESTAMP') as any)
      : null;
  }
}

/**
 * Marks and umarks the thread as spam
 */
async function setThreadSpam(
  permissions: UpdateThreadPermissions,
  spam: boolean | undefined,
  toUpdate: Partial<ThreadAttributes>
) {
  if (typeof spam !== 'undefined') {
    validatePermissions(permissions, {
      isMod: true,
      isAdmin: true,
      isSuperAdmin: true,
    });

    toUpdate.marked_as_spam_at = spam
      ? (Sequelize.literal('CURRENT_TIMESTAMP') as any)
      : null;
  }
}

/**
 * Updates the stage of the thread
 */
async function setThreadStage(
  permissions: UpdateThreadPermissions,
  stage: string | undefined,
  chain: ChainInstance,
  allAnalyticsOptions: TrackOptions[],
  toUpdate: Partial<ThreadAttributes>
) {
  if (typeof stage !== 'undefined') {
    validatePermissions(permissions, {
      isThreadOwner: true,
      isMod: true,
      isAdmin: true,
      isSuperAdmin: true,
    });

    // fetch available stages
    let customStages = [];
    try {
      const chainStages = JSON.parse(chain.custom_stages);
      if (Array.isArray(chainStages)) {
        customStages = Array.from(chainStages)
          .map((s) => s.toString())
          .filter((s) => s);
      }
      if (customStages.length === 0) {
        customStages = [
          'discussion',
          'proposal_in_review',
          'voting',
          'passed',
          'failed',
        ];
      }
    } catch (e) {
      throw new AppError(Errors.FailedToParse);
    }

    // validate stage
    if (!customStages.includes(stage)) {
      throw new AppError(Errors.InvalidStage);
    }

    toUpdate.stage = stage;

    allAnalyticsOptions.push({
      event: MixpanelCommunityInteractionEvent.UPDATE_STAGE,
    });
  }
}

/**
 * Updates the topic for the thread
 */
async function setThreadTopic(
  permissions: UpdateThreadPermissions,
  thread: ThreadInstance,
  topicId: number | undefined,
  topicName: string | undefined,
  models: DB,
  toUpdate: Partial<ThreadAttributes>
) {
  if (typeof topicId !== 'undefined' || typeof topicName !== 'undefined') {
    validatePermissions(permissions, {
      isThreadOwner: true,
      isMod: true,
      isAdmin: true,
      isSuperAdmin: true,
    });

    if (typeof topicId !== 'undefined') {
      const topic = await models.Topic.findByPk(topicId);
      if (!topic) {
        throw new AppError(Errors.InvalidTopic);
      }
      toUpdate.topic_id = topic.id;
    } else if (typeof topicName !== 'undefined') {
      const [topic] = await models.Topic.findOrCreate({
        where: {
          name: topicName,
          chain_id: thread.chain,
        },
      });
      toUpdate.topic_id = topic.id;
    }
  }
}

/**
 * Updates the collaborators of a thread
 */
async function updateThreadCollaborators(
  permissions: UpdateThreadPermissions,
  thread: ThreadInstance,
  collaborators:
    | {
        toAdd?: number[];
        toRemove?: number[];
      }
    | undefined,
  models: DB,
  transaction: Transaction
) {
  const { toAdd, toRemove } = collaborators || {};
  if (Array.isArray(toAdd) || Array.isArray(toRemove)) {
    validatePermissions(permissions, {
      isThreadOwner: true,
      isSuperAdmin: true,
    });

    const toAddUnique = uniq(toAdd || []);
    const toRemoveUnique = uniq(toRemove || []);

    // check for overlap between toAdd and toRemove
    for (const r of toRemoveUnique) {
      if (toAddUnique.includes(r)) {
        throw new AppError(Errors.CollaboratorsOverlap);
      }
    }

    // add collaborators
    if (toAddUnique.length > 0) {
      const collaboratorAddresses = await models.Address.findAll({
        where: {
          chain: thread.chain,
          id: {
            [Op.in]: toAddUnique,
          },
        },
      });
      if (collaboratorAddresses.length !== toAddUnique.length) {
        throw new AppError(Errors.MissingCollaborators);
      }
      await Promise.all(
        collaboratorAddresses.map(async (address) => {
          return models.Collaboration.findOrCreate({
            where: {
              thread_id: thread.id,
              address_id: address.id,
            },
            transaction,
          });
        })
      );
    }

    // remove collaborators
    if (toRemoveUnique.length > 0) {
      await models.Collaboration.destroy({
        where: {
          thread_id: thread.id,
          address_id: {
            [Op.in]: toRemoveUnique,
          },
        },
        transaction,
      });
    }
  }
}
