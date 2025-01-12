import chai from 'chai';
import { isDeliverTxSuccess } from '@cosmjs/stargate';
import {
  ProposalStatus,
  VoteOption,
} from 'cosmjs-types/cosmos/gov/v1beta1/gov';
import {
  encodeMsgVote,
  encodeMsgSubmitProposal,
  encodeTextProposal,
  getActiveProposalsV1Beta1,
  encodeCommunitySpend,
} from 'controllers/chain/cosmos/gov/v1beta1/utils-v1beta1';
import {
  getRPCClient,
  getTMClient,
} from 'controllers/chain/cosmos/chain.utils';
import { CosmosApiType } from 'controllers/chain/cosmos/chain';
import {
  deposit,
  sendTx,
  setupTestSigner,
  waitOneBlock,
} from './utils/helpers';

const { expect, assert } = chai;

describe('Proposal Transaction Tests - gov v1beta1 chain (csdk-beta-ci)', () => {
  let rpc: CosmosApiType;
  let signer: string;
  // v1beta1 CI devnet
  const betaId = 'csdk-beta-ci';
  const rpcUrlBeta = `http://localhost:8080/cosmosAPI/${betaId}`;

  before(async () => {
    const tm = await getTMClient(rpcUrlBeta);
    rpc = await getRPCClient(tm);
    const { signerAddress } = await setupTestSigner(rpcUrlBeta);
    signer = signerAddress;
  });

  const getActiveVotingProposals = async () => {
    const { proposals: activeProposals } = await rpc.gov.proposals(
      ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD,
      '',
      ''
    );
    return activeProposals;
  };

  const parseVoteValue = (rawLog: string) => {
    const rawObject = JSON.parse(rawLog);
    const optionValue = rawObject[0].events[1].attributes[0].value;
    const vote = JSON.parse(optionValue);
    return vote;
  };

  const proposalTest = async (
    content: any,
    expectedProposalType: string,
    isAmino?: boolean
  ) => {
    const msg = encodeMsgSubmitProposal(signer, deposit, content);
    const resp = await sendTx(rpcUrlBeta, msg, isAmino);

    expect(resp.transactionHash).to.not.be.undefined;
    expect(resp.rawLog).to.not.be.undefined;
    expect(isDeliverTxSuccess(resp), 'TX failed').to.be.true;

    await waitOneBlock(rpcUrlBeta);
    await waitOneBlock(rpcUrlBeta);
    const activeProposals = await getActiveVotingProposals();
    const onchainProposal = activeProposals[activeProposals.length - 1];
    expect(onchainProposal?.content?.typeUrl).to.eql(expectedProposalType);
  };

  const voteTest = async (
    voteOption: number,
    isAmino?: boolean
  ): Promise<void> => {
    await waitOneBlock(rpcUrlBeta);
    const activeProposals = await getActiveVotingProposals();
    assert.isAtLeast(activeProposals.length, 1);
    const proposal = activeProposals[0];
    const msg = encodeMsgVote(signer, proposal.proposalId, voteOption);

    const resp = await sendTx(rpcUrlBeta, msg, isAmino);

    expect(resp.transactionHash).to.not.be.undefined;
    expect(resp.rawLog).to.not.be.undefined;
    const voteValue = parseVoteValue(resp.rawLog);
    expect(voteValue.option).to.eql(voteOption);
  };

  describe('Direct signer', () => {
    it('creates a text proposal', async () => {
      const content = encodeTextProposal(
        `beta text title`,
        `beta text description`
      );
      await proposalTest(content, '/cosmos.gov.v1beta1.TextProposal');
    });
    it('votes NO on an active proposal', async () => {
      await voteTest(VoteOption.VOTE_OPTION_NO);
    });
    it('votes NO WITH VETO on an active proposal', async () => {
      await voteTest(VoteOption.VOTE_OPTION_NO_WITH_VETO);
    });
    it('votes ABSTAIN on an active proposal', async () => {
      await voteTest(VoteOption.VOTE_OPTION_ABSTAIN);
    });
    it('votes YES on an active proposal', async () => {
      await voteTest(VoteOption.VOTE_OPTION_YES);
    });
    it('creates a community spend proposal', async () => {
      await waitOneBlock(rpcUrlBeta);
      const content = encodeCommunitySpend(
        `beta spend title`,
        `beta spend description`,
        'cosmos18q3tlnx8vguv2fadqslm7x59ejauvsmnlycckg',
        '5',
        'ustake'
      );
      await proposalTest(
        content,
        '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal'
      );
    });
  });

  describe('Amino signing', () => {
    it('creates a text proposal with legacy amino', async () => {
      await waitOneBlock(rpcUrlBeta);
      const content = encodeTextProposal(
        `beta text title`,
        `beta text description`
      );
      await proposalTest(content, '/cosmos.gov.v1beta1.TextProposal', true);
    });
    it('votes NO on an active proposal with legacy amino', async () => {
      await voteTest(VoteOption.VOTE_OPTION_NO, true);
    });
    it('votes NO WITH VETO on an active proposal with legacy amino', async () => {
      await voteTest(VoteOption.VOTE_OPTION_NO_WITH_VETO, true);
    });
    it('votes ABSTAIN on an active proposal with legacy amino', async () => {
      await voteTest(VoteOption.VOTE_OPTION_ABSTAIN, true);
    });
    it('votes YES on an active proposal with legacy amino', async () => {
      await voteTest(VoteOption.VOTE_OPTION_YES, true);
    });
    it('creates a community spend proposal with legacy amino', async () => {
      await waitOneBlock(rpcUrlBeta);
      const content = encodeCommunitySpend(
        `beta spend title amino`,
        `beta spend description amino`,
        'cosmos18q3tlnx8vguv2fadqslm7x59ejauvsmnlycckg',
        '5',
        'ustake'
      );
      await proposalTest(
        content,
        '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal',
        true
      );
    });
  });
});

describe('Cosmos Governance v1beta1 util Tests', () => {
  describe('getActiveProposals', () => {
    it('should fetch active proposals (csdk-beta-ci)', async () => {
      const id = 'csdk-beta-ci'; // CI devnet for v1beta1
      const tmClient = await getTMClient(
        `http://localhost:8080/cosmosAPI/${id}`
      );
      const rpc = await getRPCClient(tmClient);

      const proposals = await getActiveProposalsV1Beta1(rpc);
      expect(proposals.length).to.be.greaterThan(0);

      proposals.forEach((proposal) => {
        expect(proposal.state.completed).to.eq(false);
        expect(proposal.state.status).to.be.oneOf([
          'VotingPeriod',
          'DepositPeriod',
        ]);
        expect(proposal.state.tally).to.not.be.null;
      });
    });
  });
});
