import { DataTypes, Sequelize } from 'sequelize';
import { DATABASE_URI } from './config';

import type { DB, Models } from './models';
import AddressFactory from './models/address';
import BanFactory from './models/ban';
import ChainFactory from './models/chain';
import ChainNodeFactory from './models/chain_node';
import CollaborationFactory from './models/collaboration';
import CommentFactory from './models/comment';
import CommunityBannerFactory from './models/community_banner';
import CommunityContractFactory from './models/community_contract';
import CommunitySnapshotSpaceFactory from './models/community_snapshot_spaces';
import ContractFactory from './models/contract';
import ContractAbiFactory from './models/contract_abi';
import DiscordBotConfigFactory from './models/discord_bot_config';
import LoginTokenFactory from './models/login_token';
import NotificationFactory from './models/notification';
import NotificationCategoryFactory from './models/notification_category';
import NotificationsReadFactory from './models/notifications_read';
import PollFactory from './models/poll';
import ProfileFactory from './models/profile';
import ReactionFactory from './models/reaction';
import SnapshotProposalFactory from './models/snapshot_proposal';
import SnapshotSpaceFactory from './models/snapshot_spaces';
import SocialAccountFactory from './models/social_account';
import SsoTokenFactory from './models/sso_token';
import StarredCommunityFactory from './models/starred_community';
import SubscriptionFactory from './models/subscription';
import TaggedThreadFactory from './models/tagged_threads';
import ThreadFactory from './models/thread';
import TokenFactory from './models/token';
import TopicFactory from './models/topic';
import UserModelFactory from './models/user';
import VoteFactory from './models/vote';
import WebhookFactory from './models/webhook';
import CommunityContractTemplateFactory from './models/community_contract_template';
import CommunityContractTemplateMetadataFactory from './models/community_contract_metadata';
import TemplateFactory from './models/template';
import { factory, formatFilename } from 'common-common/src/logging';

const log = factory.getLogger(formatFilename(__filename));

export const sequelize = new Sequelize(DATABASE_URI, {
  // disable string operators (https://github.com/sequelize/sequelize/issues/8417)
  // operatorsAliases: false,
  logging:
    process.env.NODE_ENV === 'test'
      ? false
      : (msg) => {
          log.trace(msg);
        },
  dialectOptions:
    process.env.NODE_ENV !== 'production' || process.env.NO_SSL
      ? { requestTimeout: 40000 }
      : DATABASE_URI ===
        'postgresql://commonwealth:edgeware@localhost/commonwealth'
      ? { requestTimeout: 40000, ssl: false }
      : { requestTimeout: 40000, ssl: { rejectUnauthorized: false } },
  pool: {
    max: 10,
    min: 0,
    acquire: 40000,
    idle: 40000,
  },
});

const models: Models = {
  Address: AddressFactory(sequelize, DataTypes),
  Ban: BanFactory(sequelize, DataTypes),
  Chain: ChainFactory(sequelize, DataTypes),
  ChainNode: ChainNodeFactory(sequelize, DataTypes),
  Collaboration: CollaborationFactory(sequelize, DataTypes),
  Contract: ContractFactory(sequelize, DataTypes),
  ContractAbi: ContractAbiFactory(sequelize, DataTypes),
  CommunityContract: CommunityContractFactory(sequelize, DataTypes),
  CommunityContractTemplate: CommunityContractTemplateFactory(
    sequelize,
    DataTypes
  ),
  CommunityContractTemplateMetadata: CommunityContractTemplateMetadataFactory(
    sequelize,
    DataTypes
  ),
  Template: TemplateFactory(sequelize, DataTypes),
  CommunityBanner: CommunityBannerFactory(sequelize, DataTypes),
  CommunitySnapshotSpaces: CommunitySnapshotSpaceFactory(sequelize, DataTypes),
  DiscordBotConfig: DiscordBotConfigFactory(sequelize, DataTypes),
  LoginToken: LoginTokenFactory(sequelize, DataTypes),
  Notification: NotificationFactory(sequelize, DataTypes),
  NotificationCategory: NotificationCategoryFactory(sequelize, DataTypes),
  NotificationsRead: NotificationsReadFactory(sequelize, DataTypes),
  Comment: CommentFactory(sequelize, DataTypes),
  Poll: PollFactory(sequelize, DataTypes),
  Reaction: ReactionFactory(sequelize, DataTypes),
  Thread: ThreadFactory(sequelize, DataTypes),
  Topic: TopicFactory(sequelize, DataTypes),
  Vote: VoteFactory(sequelize, DataTypes),
  Profile: ProfileFactory(sequelize, DataTypes),
  SocialAccount: SocialAccountFactory(sequelize, DataTypes),
  SsoToken: SsoTokenFactory(sequelize, DataTypes),
  StarredCommunity: StarredCommunityFactory(sequelize, DataTypes),
  SnapshotProposal: SnapshotProposalFactory(sequelize, DataTypes),
  SnapshotSpace: SnapshotSpaceFactory(sequelize, DataTypes),
  Subscription: SubscriptionFactory(sequelize, DataTypes),
  Token: TokenFactory(sequelize, DataTypes),
  TaggedThread: TaggedThreadFactory(sequelize, DataTypes),
  User: UserModelFactory(sequelize, DataTypes),
  Webhook: WebhookFactory(sequelize, DataTypes),
};

const db: DB = {
  sequelize,
  Sequelize,
  ...models,
};

// setup associations
Object.keys(models).forEach((modelName) => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

export default db;
