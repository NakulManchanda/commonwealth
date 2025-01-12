import app from 'state';
import { useQuery } from '@tanstack/react-query';
import _ from 'lodash';
import type { QueryDepositsResponse } from 'cosmjs-types/cosmos/gov/v1beta1/query';
import type { QueryDepositsResponseSDKType } from 'common-common/src/cosmos-ts/src/codegen/cosmos/gov/v1/query';
import { ChainBase } from 'common-common/src/types';
import { CosmosProposal } from 'controllers/chain/cosmos/gov/v1beta1/proposal-v1beta1';
import { CosmosProposalV1 } from 'controllers/chain/cosmos/gov/v1/proposal-v1';
import { AnyProposal } from 'models/types';

const DEPOSITS_CACHE_TIME = 1000 * 60 * 60;
const DEPOSITS_STALE_TIME = 1000 * 30;

const fetchCosmosDeposits = async (
  proposal: AnyProposal
): Promise<QueryDepositsResponse | QueryDepositsResponseSDKType> => {
  if (
    proposal instanceof CosmosProposalV1 ||
    proposal instanceof CosmosProposal
  ) {
    return proposal.fetchDeposits();
  } else {
    return null;
  }
};

const getCosmosDepositsQueryKey = (
  proposal: AnyProposal,
  poolParams: number
) => {
  return [
    'cosmosDeposits',
    app.activeChainId(),
    proposal?.identifier,
    proposal?.turnout, // using this as a dependency in case proposal is refetched
    poolParams, // turnout depends on chain.staked set by poolParams
  ];
};

const useCosmosProposalDepositsQuery = (
  proposal: AnyProposal,
  poolParams: number
) => {
  return useQuery({
    queryKey: getCosmosDepositsQueryKey(proposal, poolParams),
    queryFn: () => fetchCosmosDeposits(proposal),
    enabled:
      app.chain?.base === ChainBase.CosmosSDK &&
      !_.isEmpty(proposal) &&
      !proposal.completed &&
      proposal.data?.status === 'DepositPeriod' &&
      !!poolParams,
    staleTime: DEPOSITS_STALE_TIME,
    cacheTime: DEPOSITS_CACHE_TIME,
  });
};

export { useCosmosProposalDepositsQuery };
