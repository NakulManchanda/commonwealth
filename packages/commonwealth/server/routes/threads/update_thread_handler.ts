import { TypedRequest, TypedResponse, success } from '../../types';
import { ServerControllers } from '../../routing/router';
import { ThreadAttributes } from '../../models/thread';
import { AppError } from '../../../../common-common/src/errors';

export const Errors = {
  InvalidThreadID: 'Invalid thread ID',
  MissingText: 'Must provide text',
};

type UpdateThreadRequestBody = {
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
  discord_meta?: any; // Only comes from the discord bot
};
type UpdateThreadResponse = ThreadAttributes;

export const updateThreadHandler = async (
  controllers: ServerControllers,
  req: TypedRequest<UpdateThreadRequestBody, null, { id: string }>,
  res: TypedResponse<UpdateThreadResponse>
) => {
  const { user, address, chain } = req;
  const { id } = req.params;
  const {
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
    discord_meta: discordMeta,
  } = req.body;

  const threadId = parseInt(id, 10) || null;

  // this is a patch update, so properties should be
  // `undefined` if they are not intended to be updated
  const [updatedThread, notificationOptions, analyticsOptions] =
    await controllers.threads.updateThread({
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
    });

  for (const n of notificationOptions) {
    controllers.notifications.emit(n).catch(console.error);
  }

  for (const a of analyticsOptions) {
    controllers.analytics.track(a).catch(console.error);
  }

  return success(res, updatedThread);
};
