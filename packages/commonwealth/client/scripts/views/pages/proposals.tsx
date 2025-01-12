import { ChainBase, ChainNetwork } from 'common-common/src/types';
import type Cosmos from 'controllers/chain/cosmos/adapter';
import type Aave from 'controllers/chain/ethereum/aave/adapter';
import type Compound from 'controllers/chain/ethereum/compound/adapter';
import type NearSputnik from 'controllers/chain/near/sputnik/adapter';
import type Substrate from 'controllers/chain/substrate/adapter';
import { useInitChainIfNeeded } from 'hooks/useInitChainIfNeeded';
import 'pages/proposals.scss';
import React, { useEffect, useState } from 'react';
import app from 'state';
import { loadSubstrateModules } from 'views/components/load_substrate_modules';
import { ProposalCard } from 'views/components/ProposalCard';
import { PageNotFound } from 'views/pages/404';
import ErrorPage from 'views/pages/error';
import { PageLoading } from 'views/pages/loading';
import type ProposalModule from '../../models/ProposalModule';
import { CardsCollection } from '../components/cards_collection';
import { CWSpinner } from '../components/component_kit/cw_spinner';
import { getStatusText } from '../components/ProposalCard/helpers';
import { AaveProposalCardDetail } from '../components/proposals/aave_proposal_card_detail';
import {
  CompoundProposalStats,
  SubstrateProposalStats,
} from '../components/proposals/proposals_explainers';
import {
  useActiveCosmosProposalsQuery,
  useCompletedCosmosProposalsQuery,
  useAaveProposalsQuery,
} from 'state/api/proposals';
import AaveProposal from 'controllers/chain/ethereum/aave/proposal';
import useManageDocumentTitle from '../../hooks/useManageDocumentTitle';
import {
  useDepositParamsQuery,
  usePoolParamsQuery,
  useStakingParamsQuery,
} from 'state/api/chainParams';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModules(): ProposalModule<any, any, any>[] {
  if (!app || !app.chain || !app.chain.loaded) {
    throw new Error('secondary loading cmd called before chain load');
  }
  if (app.chain.base === ChainBase.Substrate) {
    const chain = app.chain as Substrate;
    return [chain.treasury, chain.democracyProposals, chain.democracy];
  } else if (app.chain.base === ChainBase.CosmosSDK) {
    const chain = app.chain as Cosmos;
    return [chain.governance];
  } else {
    throw new Error('invalid chain');
  }
}

const ProposalsPage = () => {
  const [isLoading, setLoading] = useState(
    !app.chain || !app.chain.loaded || !app.chain.apiInitialized
  );
  const [isSubstrateLoading, setSubstrateLoading] = useState(false);
  useInitChainIfNeeded(app); // if chain is selected, but data not loaded, initialize it

  const onSubstrate = app.chain?.base === ChainBase.Substrate;
  const onCompound = app.chain?.network === ChainNetwork.Compound;
  const onAave = app.chain?.network === ChainNetwork.Aave;
  const onSputnik = app.chain?.network === ChainNetwork.Sputnik;
  const onCosmos = app.chain?.base === ChainBase.CosmosSDK;

  const { data: cachedAaveProposals, isError } = useAaveProposalsQuery({
    moduleReady: app.chain?.network === ChainNetwork.Aave && !isLoading,
    chainId: app.chain?.id,
  });

  useEffect(() => {
    app.chainAdapterReady.on('ready', () => setLoading(false));

    return () => {
      app.chainAdapterReady.off('ready', () => {
        setLoading(false);
        app.chainAdapterReady.removeAllListeners();
      });
    };
  }, [setLoading]);

  useEffect(() => {
    app.chainModuleReady.on('ready', () => setSubstrateLoading(false));

    return () => {
      app.chainModuleReady.off('ready', () => {
        setSubstrateLoading(false);
        app.chainModuleReady.removeAllListeners();
      });
    };
  }, [setSubstrateLoading]);

  useManageDocumentTitle('Proposals');

  // lazy load Cosmos chain params
  const { data: stakingDenom } = useStakingParamsQuery();
  useDepositParamsQuery(stakingDenom);
  usePoolParamsQuery();

  const {
    data: activeCosmosProposals,
    isLoading: isLoadingCosmosActiveProposalsRQ,
  } = useActiveCosmosProposalsQuery({
    isApiReady: !!app.chain?.apiInitialized,
  });
  const isLoadingCosmosActiveProposals =
    onCosmos && isLoadingCosmosActiveProposalsRQ;

  const {
    data: completedCosmosProposals,
    isLoading: isCosmosCompletedProposalsLoadingRQ,
  } = useCompletedCosmosProposalsQuery({
    isApiReady: !!app.chain?.apiInitialized,
  });
  const isLoadingCosmosCompletedProposals =
    onCosmos && isCosmosCompletedProposalsLoadingRQ;

  if (isLoading) {
    if (
      app.chain?.base === ChainBase.Substrate &&
      (app.chain as Substrate).chain?.timedOut
    ) {
      return <ErrorPage message="Could not connect to chain" />;
    }

    if (app.chain?.failed) {
      return (
        <PageNotFound
          title="Wrong Ethereum Provider Network!"
          message="Change Metamask to point to Ethereum Mainnet"
        />
      );
    }

    return <PageLoading message="Connecting to chain" />;
  }

  if (isError) {
    return <ErrorPage message="Could not connect to chain" />;
  }

  const modLoading = loadSubstrateModules('Proposals', getModules);

  if (isSubstrateLoading) return modLoading;

  let aaveProposals: AaveProposal[];
  if (onAave)
    aaveProposals =
      cachedAaveProposals || (app.chain as Aave).governance.store.getAll();

  // active proposals
  const activeDemocracyProposals =
    onSubstrate &&
    (app.chain as Substrate).democracyProposals.store
      .getAll()
      .filter((p) => !p.completed);

  const activeCompoundProposals =
    onCompound &&
    (app.chain as Compound).governance.store
      .getAll()
      .filter((p) => !p.completed)
      .sort((p1, p2) => +p2.startingPeriod - +p1.startingPeriod);

  const activeAaveProposals =
    onAave &&
    aaveProposals
      .filter((p) => !p.completed)
      .sort((p1, p2) => +p2.startBlock - +p1.startBlock);

  const activeSputnikProposals =
    onSputnik &&
    (app.chain as NearSputnik).dao.store
      .getAll()
      .filter((p) => !p.completed)
      .sort((p1, p2) => p2.data.id - p1.data.id);
  const activeProposalContent = isLoadingCosmosActiveProposals ? (
    <CWSpinner />
  ) : !activeDemocracyProposals?.length &&
    !activeCosmosProposals?.length &&
    !activeCompoundProposals?.length &&
    !activeAaveProposals?.length &&
    !activeSputnikProposals?.length ? (
    [
      <div key="no-active" className="no-proposals">
        No active proposals
      </div>,
    ]
  ) : (
    (activeDemocracyProposals || [])
      .map((proposal, i) => <ProposalCard key={i} proposal={proposal} />)
      .concat(
        (activeCosmosProposals || []).map((proposal) => (
          <ProposalCard key={proposal.identifier} proposal={proposal} />
        ))
      )
      .concat(
        (activeCompoundProposals || []).map((proposal, i) => (
          <ProposalCard key={i} proposal={proposal} />
        ))
      )
      .concat(
        (activeAaveProposals || []).map((proposal, i) => (
          <ProposalCard
            key={i}
            proposal={proposal}
            injectedContent={
              <AaveProposalCardDetail
                proposal={proposal}
                statusText={getStatusText(proposal)}
              />
            }
          />
        ))
      )
      .concat(
        (activeSputnikProposals || []).map((proposal, i) => (
          <ProposalCard key={i} proposal={proposal} />
        ))
      )
  );

  // inactive proposals
  const inactiveDemocracyProposals =
    onSubstrate &&
    (app.chain as Substrate).democracyProposals.store
      .getAll()
      .filter((p) => p.completed);

  // lazy-loaded in useGetCompletedProposals
  const inactiveCosmosProposals = onCosmos && completedCosmosProposals;

  const inactiveCompoundProposals =
    onCompound &&
    (app.chain as Compound).governance.store
      .getAll()
      .filter((p) => p.completed)
      .sort((p1, p2) => +p2.startingPeriod - +p1.startingPeriod);

  const inactiveAaveProposals =
    onAave &&
    aaveProposals
      .filter((p) => p.completed)
      .sort((p1, p2) => +p2.startBlock - +p1.startBlock);

  const inactiveSputnikProposals =
    onSputnik &&
    (app.chain as NearSputnik).dao.store
      .getAll()
      .filter((p) => p.completed)
      .sort((p1, p2) => p2.data.id - p1.data.id);

  const inactiveProposalContent = isLoadingCosmosCompletedProposals ? (
    <CWSpinner />
  ) : !inactiveDemocracyProposals?.length &&
    !inactiveCosmosProposals?.length &&
    !inactiveCompoundProposals?.length &&
    !inactiveAaveProposals?.length &&
    !inactiveSputnikProposals?.length ? (
    [
      <div key="no-inactive" className="no-proposals">
        No past proposals
      </div>,
    ]
  ) : (
    (inactiveDemocracyProposals || [])
      .map((proposal, i) => <ProposalCard key={i} proposal={proposal} />)
      .concat(
        inactiveCosmosProposals?.length
          ? inactiveCosmosProposals.map((proposal) => (
              <ProposalCard key={proposal.identifier} proposal={proposal} />
            ))
          : []
      )
      .concat(
        (inactiveCompoundProposals || []).map((proposal, i) => (
          <ProposalCard key={i} proposal={proposal} />
        ))
      )
      .concat(
        (inactiveAaveProposals || []).map((proposal, i) => (
          <ProposalCard
            key={i}
            proposal={proposal}
            injectedContent={
              <AaveProposalCardDetail
                proposal={proposal}
                statusText={getStatusText(proposal)}
              />
            }
          />
        ))
      )
      .concat(
        (inactiveSputnikProposals || []).map((proposal, i) => (
          <ProposalCard key={i} proposal={proposal} />
        ))
      )
  );

  return (
    <div className="ProposalsPage">
      {onSubstrate && (
        <SubstrateProposalStats
          nextLaunchBlock={
            (app.chain as Substrate).democracyProposals.nextLaunchBlock
          }
        />
      )}
      {onCompound && <CompoundProposalStats chain={app.chain as Compound} />}
      <CardsCollection content={activeProposalContent} header="Active" />
      <CardsCollection content={inactiveProposalContent} header="Inactive" />
    </div>
  );
};

export default ProposalsPage;
