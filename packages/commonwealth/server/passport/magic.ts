import { Magic, MagicUserMetadata, WalletType } from '@magic-sdk/admin';
import { verify } from 'jsonwebtoken';
import passport from 'passport';
import { DoneFunc, Strategy as MagicStrategy, MagicUser } from 'passport-magic';
import { Op, Transaction } from 'sequelize';

import { ServerError } from 'common-common/src/errors';
import { factory, formatFilename } from 'common-common/src/logging';
import {
  ChainBase,
  NotificationCategories,
  WalletId,
} from 'common-common/src/types';
import { JWT_SECRET, MAGIC_API_KEY } from '../config';
import { sequelize } from '../database';
import { validateChain } from '../middleware/validateChain';
import type { DB } from '../models';
import { AddressAttributes, AddressInstance } from '../models/address';
import { ChainInstance } from '../models/chain';
import type { ProfileAttributes, ProfileInstance } from '../models/profile';
import { SsoTokenInstance } from '../models/sso_token';
import { UserAttributes, UserInstance } from '../models/user';
import { TypedRequestBody } from '../types';

const log = factory.getLogger(formatFilename(__filename));

type MagicLoginContext = {
  models: DB;
  decodedMagicToken: MagicUser;
  magicUserMetadata: MagicUserMetadata;
  generatedAddresses: Array<{ address: string; chain: string }>;
  existingUserInstance?: UserInstance;
  loggedInUser?: UserInstance;
  profileMetadata?: { username?: string; avatarUrl?: string };
};

const DEFAULT_ETH_CHAIN = 'ethereum';
const DEFAULT_COSMOS_CHAIN = 'osmosis';

// Creates a trusted address in a community
async function createMagicAddressInstances(
  models: DB,
  generatedAddresses: Array<{ address: string; chain: string }>,
  user: UserAttributes,
  t?: Transaction
): Promise<AddressInstance[]> {
  const addressInstances: AddressInstance[] = [];
  const user_id = user.id;
  const profile_id = (user.Profiles[0] as ProfileAttributes).id;
  for (const { chain, address } of generatedAddresses) {
    const [addressInstance, created] = await models.Address.findOrCreate({
      where: {
        address,
        chain,
        wallet_id: WalletId.Magic,
      },
      defaults: {
        user_id,
        profile_id,
        verification_token: 'MAGIC',
        verification_token_expires: null,
        verified: new Date(), // trust addresses from magic
        last_active: new Date(),
      },
      transaction: t,
    });

    // case should not happen, but if somehow a to-be-created address is owned
    // by another user than the one logging in, we should throw an error, because that is an
    // invalid state (we may have failed to identify the logged in user correctly?)
    if (!created && addressInstance.user_id !== user_id) {
      log.error(
        `Address ${address} owned by ${user_id} found on user ${addressInstance.user_id}!`
      );
      throw new ServerError('Address owned by somebody else!');
    }

    addressInstances.push(addressInstance);
  }
  return addressInstances;
}

// User is logged out + selects magic, and provides a new email. Create a new user for them.
async function createNewMagicUser({
  models,
  decodedMagicToken,
  magicUserMetadata,
  generatedAddresses,
  profileMetadata,
}: MagicLoginContext): Promise<UserInstance> {
  // completely new user: create user, profile, addresses
  return sequelize.transaction(async (transaction) => {
    const newUser = await models.User.createWithProfile(
      models,
      {
        email: magicUserMetadata.email || null,
        emailVerified: true,
      },
      { transaction }
    );

    // update profile with metadata if exists
    const newProfile = newUser.Profiles[0] as ProfileInstance;
    if (profileMetadata?.username) {
      newProfile.profile_name = profileMetadata.username;
    }
    if (profileMetadata?.avatarUrl) {
      newProfile.avatar_url = profileMetadata.avatarUrl;
    }
    if (profileMetadata?.username || profileMetadata?.avatarUrl) {
      await newProfile.save({ transaction });
    }

    const addressInstances: AddressAttributes[] =
      await createMagicAddressInstances(
        models,
        generatedAddresses,
        newUser,
        transaction
      );

    // Automatically create subscription to their own mentions
    await models.Subscription.create(
      {
        subscriber_id: newUser.id,
        category_id: NotificationCategories.NewMention,
        is_active: true,
      },
      { transaction }
    );

    // Automatically create a subscription to collaborations
    await models.Subscription.create(
      {
        subscriber_id: newUser.id,
        category_id: NotificationCategories.NewCollaboration,
        is_active: true,
      },
      { transaction }
    );

    // create token with provided user/address
    const canonicalAddressInstance = addressInstances.find(
      (a) => a.chain === DEFAULT_ETH_CHAIN
    );
    await models.SsoToken.create(
      {
        issuer: decodedMagicToken.issuer,
        issued_at: decodedMagicToken.claim.iat,
        address_id: canonicalAddressInstance.id, // always ethereum address
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    return newUser;
  });
}

// User is logged out + selects magic, and provides an existing email. Log them in.
async function loginExistingMagicUser({
  models,
  existingUserInstance,
  decodedMagicToken,
  generatedAddresses,
}: MagicLoginContext): Promise<UserInstance> {
  if (!existingUserInstance) {
    throw new Error('No user provided to log in');
  }

  return sequelize.transaction(async (transaction) => {
    // verify login token
    const ssoToken = await models.SsoToken.scope('withPrivateData').findOne({
      where: {
        issuer: decodedMagicToken.issuer,
      },
      include: [
        {
          model: models.Address,
          where: { address: decodedMagicToken.publicAddress },
          required: true,
        },
      ],
      transaction,
    });

    let malformedSsoToken: SsoTokenInstance;
    if (ssoToken) {
      // login user if they registered via magic
      if (decodedMagicToken.claim.iat <= ssoToken.issued_at) {
        log.warn('Replay attack detected.');
        throw new Error(
          `Replay attack detected for user ${decodedMagicToken.publicAddress}}.`
        );
      }
      ssoToken.issued_at = decodedMagicToken.claim.iat;
      ssoToken.updated_at = new Date();
      await ssoToken.save({ transaction });
      log.trace('SSO TOKEN HANDLED NORMALLY');
    } else {
      // situation for legacy SsoToken instances:
      // - they only have profile_id set, no issuer or address_id
      // we will locate an existing SsoToken by profile_id, and migrate it to use addresses instead.
      // if none exists, we will create it
      malformedSsoToken = await models.SsoToken.scope(
        'withPrivateData'
      ).findOne({
        where: {
          profile_id: existingUserInstance.Profiles[0].id,
        },
        transaction,
      });
      if (malformedSsoToken) {
        log.trace('DETECTED LEGACY / MALFORMED SSO TOKEN');
        if (decodedMagicToken.claim.iat <= malformedSsoToken.issued_at) {
          log.warn('Replay attack detected.');
          throw new Error(
            `Replay attack detected for user ${decodedMagicToken.publicAddress}}.`
          );
        }
        malformedSsoToken.profile_id = null;
        (malformedSsoToken.issuer = decodedMagicToken.issuer),
          (malformedSsoToken.issued_at = decodedMagicToken.claim.iat);
        malformedSsoToken.updated_at = new Date();
        // do not save until addresses have been added
      }
    }

    // skip replay attack verification if no SsoToken found (legacy / malformed user),
    // as we may need to create additional addresses first (most cases, does nothing, but can
    // function as "join" if landing on a specific community page).
    const addressInstances = await createMagicAddressInstances(
      models,
      generatedAddresses,
      existingUserInstance,
      transaction
    );

    // once addresses have been created and/or located, we finalize the migration of malformed sso
    // tokens, or create a new one if absent entirely
    const canonicalAddressInstance = addressInstances.find(
      (a) => a.chain === DEFAULT_ETH_CHAIN
    );
    if (malformedSsoToken) {
      malformedSsoToken.address_id = canonicalAddressInstance.id;
      await malformedSsoToken.save({ transaction });
      log.info(
        `Finished migration of SsoToken for user ${existingUserInstance.id}!`
      );
    } else if (!ssoToken && !malformedSsoToken) {
      await models.SsoToken.create(
        {
          issuer: decodedMagicToken.issuer,
          issued_at: decodedMagicToken.claim.iat,
          address_id: canonicalAddressInstance.id, // always ethereum address
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );
      log.info(
        `Created SsoToken for invalid state user ${existingUserInstance.id}`
      );
    }

    return existingUserInstance;
  });
}

// User is logged in + selects magic, and provides an existing email different from their current
// authentication. Move their addresses from the provided email to the currently logged in user.
async function mergeLogins(ctx: MagicLoginContext): Promise<UserInstance> {
  // first, verify the existing magic user to ensure they're not performing a replay attack
  await loginExistingMagicUser(ctx);
  const { models, loggedInUser, existingUserInstance } = ctx;

  // update previously-registered magic addresses for incoming magic user
  // to be owned by currently logged in user
  await models.Address.update(
    {
      user_id: loggedInUser.id,
      profile_id: loggedInUser.Profiles[0].id,
    },
    {
      where: {
        wallet_id: WalletId.Magic,
        user_id: existingUserInstance.id,
      },
    }
  );

  // TODO: send move email

  return loggedInUser;
}

// User is logged in + selects magic, and provides a totally new email.
// Add the new Magic address to the existing User.
async function addMagicToUser({
  models,
  generatedAddresses,
  loggedInUser,
  decodedMagicToken,
}: MagicLoginContext): Promise<UserInstance> {
  // create new address on logged-in user
  const addressInstances = await createMagicAddressInstances(
    models,
    generatedAddresses,
    loggedInUser
  );

  // create new token with provided user/address. contract is each address owns an SsoToken.
  const canonicalAddressInstance = addressInstances.find(
    (a) => a.chain === DEFAULT_ETH_CHAIN
  );
  await models.SsoToken.create({
    issuer: decodedMagicToken.issuer,
    issued_at: decodedMagicToken.claim.iat,
    address_id: canonicalAddressInstance.id,
    created_at: new Date(),
    updated_at: new Date(),
  });
  return loggedInUser;
}

// Entrypoint into the magic passport strategy
async function magicLoginRoute(
  magic: Magic,
  models: DB,
  req: TypedRequestBody<{
    chain?: string;
    jwt?: string;
    username?: string;
    avatarUrl?: string;
  }>,
  decodedMagicToken: MagicUser,
  cb: DoneFunc
) {
  log.trace(`MAGIC TOKEN: ${JSON.stringify(decodedMagicToken, null, 2)}`);
  let chainToJoin: ChainInstance, error, loggedInUser: UserInstance;

  const generatedAddresses = [
    {
      address: decodedMagicToken.publicAddress,
      chain: DEFAULT_ETH_CHAIN,
    },
  ];

  // canonical address is always ethereum
  const canonicalAddress = decodedMagicToken.publicAddress;

  // validate chain if provided (i.e. logging in on community page)
  if (req.body.chain) {
    [chainToJoin, error] = await validateChain(models, req.body);
    if (error) return cb(error);
  }

  // check if the user is logged in already (provided valid JWT)
  if (req.body.jwt) {
    try {
      const { id } = verify(req.body.jwt, JWT_SECRET) as {
        id: number;
        email: string | null;
      };
      loggedInUser = await models.User.findOne({
        where: { id },
        include: [
          {
            model: models.Profile,
          },
        ],
      });
      log.trace(
        `DECODED LOGGED IN USER: ${JSON.stringify(loggedInUser, null, 2)}`
      );
      if (!loggedInUser) {
        throw new Error('User not found');
      }
    } catch (e) {
      return cb('Could not verify login');
    }
  }

  // fetch user data from magic backend
  let magicUserMetadata: MagicUserMetadata;
  try {
    // grab cosmos address for registration
    magicUserMetadata = await magic.users.getMetadataByIssuerAndWallet(
      decodedMagicToken.issuer,
      WalletType.COSMOS
    );
    log.trace(
      `MAGIC USER METADATA: ${JSON.stringify(magicUserMetadata, null, 2)}`
    );

    const cosmosAddress = (magicUserMetadata?.wallets[0] as any)
      ?.public_address;
    if (!cosmosAddress) {
      throw new Error('No cosmos address found!');
    }
    generatedAddresses.push({
      address: cosmosAddress,
      chain: DEFAULT_COSMOS_CHAIN,
    });

    // if joining a new chain (by logging in on a community), add to list of addresses
    if (chainToJoin) {
      if (chainToJoin.base === ChainBase.CosmosSDK) {
        generatedAddresses.push({
          address: cosmosAddress,
          chain: chainToJoin.id,
        });
      } else if (chainToJoin.base === ChainBase.Ethereum) {
        generatedAddresses.push({
          address: canonicalAddress,
          chain: chainToJoin.id,
        });
      } else {
        // ignore invalid chain base
        log.warn(
          `Cannot create magic account on chain ${chainToJoin.id}. Ignoring.`
        );
      }
    }
  } catch (e) {
    return cb(
      new ServerError(
        `Magic fetch failed: ${e.message} - ${JSON.stringify(e.data)}`
      )
    );
  }

  // first, attempt to locate an existing magic user by canonical address.
  // this is the properly modern method of identifying users, as it conforms to
  // the DID standard.
  let existingUserInstance = await models.User.scope('withPrivateData').findOne(
    {
      include: [
        {
          model: models.Address,
          where: {
            wallet_id: WalletId.Magic,
            address: canonicalAddress,
            verified: { [Op.ne]: null },
          },
          required: true,
        },
        {
          model: models.Profile,
        },
      ],
    }
  );
  if (!existingUserInstance && magicUserMetadata.email) {
    // if unable to locate a magic user by address, attempt to locate by email.
    // only legacy users (pre-magic or magic but with broken assumptions) should
    // trigger this case, as it was formerly canonical.
    existingUserInstance = await models.User.scope('withPrivateData').findOne({
      where: { email: magicUserMetadata.email },
      include: [
        {
          model: models.Profile,
        },
      ],
    });
  }
  log.trace(
    `EXISTING USER INSTANCE: ${JSON.stringify(existingUserInstance, null, 2)}`
  );

  if (loggedInUser && existingUserInstance?.id === loggedInUser?.id) {
    // already logged in as existing user, do nothing
    log.trace('CASE 0: LOGGING IN USER SAME AS EXISTING USER');
    return cb(null, existingUserInstance);
  }

  let finalUser: UserInstance;
  const magicContext: MagicLoginContext = {
    models,
    decodedMagicToken,
    magicUserMetadata,
    generatedAddresses,
    existingUserInstance,
    loggedInUser,
    profileMetadata: {
      username: req.body.username,
      avatarUrl: req.body.avatarUrl,
    },
  };
  try {
    if (loggedInUser && existingUserInstance) {
      // user is already logged in + has already linked the provided magic address.
      // merge the existing magic user with the logged in user
      log.trace('CASE 1: EXISTING MAGIC INCOMING TO USER, MERGE LOGINS');
      finalUser = await mergeLogins(magicContext);
    } else if (!loggedInUser && existingUserInstance) {
      // user is logging in with an existing magic account
      log.trace('CASE 2: LOGGING INTO EXISTING MAGIC USER');
      finalUser = await loginExistingMagicUser(magicContext);
    } else if (loggedInUser && !existingUserInstance) {
      // user is already logged in and is linking a new magic login to their account
      log.trace('CASE 3: ADDING NEW MAGIC ADDRESSES TO EXISTING USER');
      finalUser = await addMagicToUser(magicContext);
    } else {
      // completely new user: create user, profile, addresses
      log.trace('CASE 4: CREATING NEW MAGIC USER');
      finalUser = await createNewMagicUser(magicContext);
    }
  } catch (e) {
    log.error(`Failed to log in user ${JSON.stringify(e, null, 2)}`);
    return cb(e);
  }

  log.trace(`LOGGING IN FINAL USER: ${JSON.stringify(finalUser, null, 2)}`);
  return cb(null, finalUser);
}

export function initMagicAuth(models: DB) {
  // allow magic login if configured with key
  if (MAGIC_API_KEY) {
    // TODO: verify we are in a community that supports magic login
    const magic = new Magic(MAGIC_API_KEY);
    passport.use(
      new MagicStrategy({ passReqToCallback: true }, async (req, user, cb) => {
        return magicLoginRoute(magic, models, req, user, cb);
      })
    );
  }
}
