import { DB } from '../models';
import BanCache from '../util/banCheckCache';
import { TokenBalanceCache } from '../../../token-balance-cache/src';

import {
  CreateThreadReactionOptions,
  CreateThreadReactionResult,
  __createThreadReaction,
} from './server_threads_methods/create_thread_reaction';
import {
  CreateThreadCommentOptions,
  CreateThreadCommentResult,
  __createThreadComment,
} from './server_threads_methods/create_thread_comment';
import {
  DeleteThreadOptions,
  DeleteThreadResult,
  __deleteThread,
} from './server_threads_methods/delete_thread';
import {
  UpdateThreadOptions,
  UpdateThreadResult,
  __updateThread,
} from './server_threads_methods/update_thread';
import {
  CreateThreadOptions,
  CreateThreadResult,
  __createThread,
} from './server_threads_methods/create_thread';
import {
  GetThreadsByIdOptions,
  GetThreadsByIdResult,
  __getThreadsById,
} from './server_threads_methods/get_threads_by_id';
import {
  GetActiveThreadsOptions,
  GetActiveThreadsResult,
  __getActiveThreads,
} from './server_threads_methods/get_active_threads';
import {
  SearchThreadsOptions,
  SearchThreadsResult,
  __searchThreads,
} from './server_threads_methods/search_threads';
import {
  GetBulkThreadsOptions,
  GetBulkThreadsResult,
  __getBulkThreads,
} from './server_threads_methods/get_bulk_threads';

/**
 * Implements methods related to threads
 */
export class ServerThreadsController {
  constructor(
    public models: DB,
    public tokenBalanceCache: TokenBalanceCache,
    public banCache: BanCache
  ) {}

  async createThreadReaction(
    options: CreateThreadReactionOptions
  ): Promise<CreateThreadReactionResult> {
    return __createThreadReaction.call(this, options);
  }

  async createThreadComment(
    options: CreateThreadCommentOptions
  ): Promise<CreateThreadCommentResult> {
    return __createThreadComment.call(this, options);
  }

  async deleteThread(
    options: DeleteThreadOptions
  ): Promise<DeleteThreadResult> {
    return __deleteThread.call(this, options);
  }

  async updateThread(
    this: ServerThreadsController,
    options: UpdateThreadOptions
  ): Promise<UpdateThreadResult> {
    return __updateThread.call(this, options);
  }

  async createThread(
    this: ServerThreadsController,
    options: CreateThreadOptions
  ): Promise<CreateThreadResult> {
    return __createThread.call(this, options);
  }

  async getThreadsByIds(
    this: ServerThreadsController,
    options: GetThreadsByIdOptions
  ): Promise<GetThreadsByIdResult> {
    return __getThreadsById.call(this, options);
  }

  async getActiveThreads(
    this: ServerThreadsController,
    options: GetActiveThreadsOptions
  ): Promise<GetActiveThreadsResult> {
    return __getActiveThreads.call(this, options);
  }

  async searchThreads(
    this: ServerThreadsController,
    options: SearchThreadsOptions
  ): Promise<SearchThreadsResult> {
    return __searchThreads.call(this, options);
  }

  async getBulkThreads(
    options: GetBulkThreadsOptions
  ): Promise<GetBulkThreadsResult> {
    return __getBulkThreads.call(this, options);
  }
}
