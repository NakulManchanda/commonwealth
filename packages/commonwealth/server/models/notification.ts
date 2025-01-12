import type * as Sequelize from 'sequelize';
import type { DataTypes } from 'sequelize';
import type {
  NotificationsReadAttributes,
  NotificationsReadInstance,
} from './notifications_read';
import type { ModelInstance, ModelStatic } from './types';
import { StatsDController } from 'common-common/src/statsd';

import { factory, formatFilename } from 'common-common/src/logging';
const log = factory.getLogger(formatFilename(__filename));

export type NotificationAttributes = {
  id: number;
  notification_data: string;
  chain_id?: string;
  category_id: string;
  chain_event_id?: number;
  entity_id: number;
  created_at?: Date;
  updated_at?: Date;
  thread_id?: number;
  NotificationsRead?: NotificationsReadAttributes[];
};

export type NotificationInstance = ModelInstance<NotificationAttributes> & {
  getNotificationsRead: Sequelize.HasManyGetAssociationsMixin<NotificationsReadInstance>;
};

export type NotificationModelStatic = ModelStatic<NotificationInstance>;

export default (
  sequelize: Sequelize.Sequelize,
  dataTypes: typeof DataTypes
): NotificationModelStatic => {
  const Notification = <NotificationModelStatic>sequelize.define(
    'Notification',
    {
      id: { type: dataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      notification_data: { type: dataTypes.TEXT, allowNull: false },
      chain_event_id: { type: dataTypes.INTEGER, allowNull: true },
      entity_id: { type: dataTypes.INTEGER, allowNull: true },
      chain_id: { type: dataTypes.STRING, allowNull: true }, // for backwards compatibility of threads associated with OffchainCommunities rather than a proper chain
      category_id: { type: dataTypes.STRING, allowNull: false },
      thread_id: { type: dataTypes.INTEGER, allowNull: true },
    },
    {
      hooks: {
        afterCreate: async (notification) => {
          let id, category_id, thread_id;
          const { Thread } = sequelize.models;
          try {
            ({ id, category_id, thread_id } = notification);
            if (
              ['new-thread-creation', 'new-comment-creation'].includes(
                category_id
              ) &&
              thread_id
            ) {
              await Thread.update(
                { max_notif_id: id },
                { where: { id: thread_id } }
              );
              StatsDController.get().increment('cw.hook.thread-notif-update', {
                thread_id: String(thread_id),
              });
            }
          } catch (error) {
            log.error(
              `incrementing thread notif for thread ${thread_id} afterCreate: ${error}`
            );
            StatsDController.get().increment('cw.hook.thread-notif-error', {
              thread_id: String(thread_id),
            });
          }
        },
      },
      tableName: 'Notifications',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['chain_event_id'], prefix: 'new' }],
    }
  );

  Notification.associate = (models) => {
    models.Notification.hasMany(models.NotificationsRead, {
      foreignKey: 'notification_id',
      onDelete: 'cascade',
      hooks: true,
    });
    models.Notification.belongsTo(models.NotificationCategory, {
      foreignKey: 'category_id',
      targetKey: 'name',
    });
    models.Notification.belongsTo(models.Chain, {
      foreignKey: 'chain_id',
      targetKey: 'id',
    });
    models.Notification.belongsTo(models.Thread, {
      foreignKey: 'thread_id',
      targetKey: 'id',
    });
  };

  return Notification;
};
