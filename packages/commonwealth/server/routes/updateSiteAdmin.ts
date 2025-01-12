import { AppError } from 'common-common/src/errors';
import type { Response } from 'express';
import type { DB } from '../models';
import type { TypedRequestBody } from '../types';
import { success } from '../types';
import { Op } from 'sequelize';

enum PromoteUserErrors {
  NoUser = 'Must supply a user address',
  NotAdmin = 'You do not have permission to promote users',
}

type PromoteUserReq = {
  address: string;
  siteAdmin: boolean;
};

const updateSiteAdmin = async (
  models: DB,
  req: TypedRequestBody<PromoteUserReq>,
  res: Response
) => {
  const { address, siteAdmin } = req.body;

  if (!req.user.isAdmin) {
    throw new AppError(PromoteUserErrors.NotAdmin);
  }

  const userAddress = await models.Address.findOne({
    where: {
      address,
      user_id: {
        [Op.ne]: null,
      },
    },
  });

  if (!userAddress) {
    throw new AppError(PromoteUserErrors.NoUser);
  }

  const user = await models.User.findOne({
    where: {
      id: userAddress.user_id,
    },
  });

  if (!user) {
    throw new AppError(PromoteUserErrors.NoUser);
  }

  user.isAdmin = siteAdmin;
  await user.save();

  return success(res, { message: 'Updated succesfully' });
};

export default updateSiteAdmin;
