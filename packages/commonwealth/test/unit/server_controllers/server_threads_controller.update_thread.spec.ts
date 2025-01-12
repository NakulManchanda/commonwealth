import { expect } from 'chai';
import { ServerThreadsController } from 'server/controllers/server_threads_controller';
import {
  UpdateThreadOptions,
  UpdateThreadPermissions,
  validatePermissions,
} from 'server/controllers/server_threads_methods/update_thread';
import { ChainInstance } from 'server/models/chain';
import { BAN_CACHE_MOCK_FN } from 'test/util/banCacheMock';

describe('ServerThreadsController', () => {
  describe('#validatePermissions', () => {
    it('should fail if no permissions satisfied', () => {
      const permissions: UpdateThreadPermissions = {
        isThreadOwner: false,
        isMod: false,
        isAdmin: false,
        isSuperAdmin: false,
      };
      expect(() =>
        validatePermissions(permissions, {
          isThreadOwner: true,
          isMod: true,
          isAdmin: true,
          isSuperAdmin: true,
        })
      ).to.throw('Unauthorized');
    });

    it('should fail for all flags except for isAdmin', () => {
      const permissions: UpdateThreadPermissions = {
        isThreadOwner: false,
        isMod: false,
        isAdmin: true,
        isSuperAdmin: false,
      };

      // throws
      expect(() =>
        validatePermissions(permissions, {
          isThreadOwner: true,
        })
      ).to.throw('Unauthorized');

      // throws
      expect(() =>
        validatePermissions(permissions, {
          isMod: true,
        })
      ).to.throw('Unauthorized');

      // does NOT throw
      expect(() =>
        validatePermissions(permissions, {
          isAdmin: true,
        })
      ).to.not.throw();

      // throws
      expect(() =>
        validatePermissions(permissions, {
          isSuperAdmin: true,
        })
      ).to.throw('Unauthorized');

      // does NOT throw
      expect(() =>
        validatePermissions(permissions, {
          isThreadOwner: true,
          isMod: true,
          isAdmin: true,
          isSuperAdmin: true,
        })
      ).to.not.throw();
    });
  });

  describe('#updateThread', () => {
    it('should patch update thread attributes', async () => {
      const address = {
        id: 1,
        address: '0x1234',
        role: 'admin',
        chain: 'ethereum',
        verified: true,
        update: async () => null,
      };
      const attributes: UpdateThreadOptions = {
        user: {
          getAddresses: async () => [address],
        } as any,
        address: address as any,
        chain: {
          id: 'ethereum',
        } as ChainInstance,
        threadId: 1,
        title: 'hello',
        body: 'wasup',
        url: 'https://example.com',
      };

      const db: any = {
        Thread: {
          findByPk: async () => ({
            version_history: ['{"body": ""}'],
            update: async () => null,
          }),
          findOne: async () => ({
            Address: address,
            toJSON: () => ({}),
          }),
        },
        // for findAllRoles
        Address: {
          findAll: async () => [address],
        },
        sequelize: {
          transaction: async () => ({
            rollback: async () => ({}),
            commit: async () => ({}),
          }),
        },
      };
      const tokenBalanceCache: any = {};
      const banCache: any = BAN_CACHE_MOCK_FN('ethereum');

      const serverThreadsController = new ServerThreadsController(
        db,
        tokenBalanceCache,
        banCache
      );
      const [updatedThread, notificationOptions, analyticsOptions] =
        await serverThreadsController.updateThread(attributes);

      expect(
        serverThreadsController.updateThread({
          ...(attributes as any),
          address: {
            ...attributes.address,
            address: '0xbanned',
          },
        })
      ).to.be.rejectedWith('Ban error: banned');

      expect(updatedThread).to.be.ok;
      expect(notificationOptions).to.have.length(1);
      expect(analyticsOptions).to.have.length(0);
    });
  });
});
