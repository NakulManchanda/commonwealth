import { AppError } from 'common-common/src/errors';
import type { NextFunction } from 'express';
import type { DB } from '../models';
import type { TypedRequestBody, TypedResponse } from '../types';
import { success } from '../types';

export const Errors = {
  NotLoggedIn: 'Not logged in',
  NotAdmin: 'Must be a site admin',
  CannotExportMembersList: 'Cannot export members list',
  NoChain: 'Chain not found',
};

type exportMembersListReq = {
  chainId: string;
};

type exportMembersListResp = {
  data: any;
};

const exportMembersList = async (
  models: DB,
  req: TypedRequestBody<exportMembersListReq>,
  res: TypedResponse<exportMembersListResp>,
  next: NextFunction
) => {
  if (!req.user.isAdmin) {
    return next(new AppError(Errors.NotAdmin));
  }

  const { chainId } = req.body;

  const chain = await models.Chain.findOne({
    where: {
      id: chainId,
    },
  });

  if (!chain) {
    return next(new AppError(Errors.NoChain));
  }

  try {
    const data = await models.sequelize.query(
      `
      SELECT 
          "a"."address", 
          "p"."profile_name", 
          COUNT(DISTINCT "t"."id") AS thread_count, 
          COUNT(DISTINCT "c"."id") AS comment_count, 
          COUNT(DISTINCT "r"."id") AS reaction_count
      FROM 
          "Addresses" "a"
      LEFT JOIN 
          "Profiles" "p" ON "a"."profile_id" = "p"."id"
      LEFT JOIN 
          "Threads" "t" ON "a"."id" = "t"."address_id" AND "t"."chain" = :chainId
      LEFT JOIN 
          "Comments" "c" ON "a"."id" = "c"."address_id" AND "c"."chain" = :chainId
      LEFT JOIN 
          "Reactions" "r" ON "a"."id" = "r"."address_id" AND "r"."chain" = :chainId
      WHERE 
          "a"."chain" = :chainId
      GROUP BY 
          "a"."address", "p"."profile_name"
    `,
      {
        replacements: { chainId },
      }
    );

    return success(res, { data });
  } catch (e) {
    console.log(e);
    return next(new AppError(Errors.CannotExportMembersList));
  }
};

export default exportMembersList;
