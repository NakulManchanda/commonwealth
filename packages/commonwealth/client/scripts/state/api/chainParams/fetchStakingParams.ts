import app from 'state';
import { useQuery } from '@tanstack/react-query';

import { ChainBase } from 'common-common/src/types';
import Cosmos from 'controllers/chain/cosmos/adapter';

const STAKING_PARAMS_CACHE_TIME = Infinity;
const STAKING_PARAMS_STALE_TIME = 1000 * 60 * 60;

const fetchStakingParams = async (): Promise<string> => {
  return (app.chain as Cosmos).chain.fetchStakingParams();
};

const useStakingParamsQuery = () => {
  const chainId = app.activeChainId();
  return useQuery({
    queryKey: ['stakingParams', chainId],
    queryFn: fetchStakingParams,
    enabled: app.chain?.base === ChainBase.CosmosSDK,
    cacheTime: STAKING_PARAMS_CACHE_TIME,
    staleTime: STAKING_PARAMS_STALE_TIME,
  });
};

export { useStakingParamsQuery };
