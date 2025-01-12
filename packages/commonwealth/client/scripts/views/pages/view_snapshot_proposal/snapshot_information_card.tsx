import React from 'react';

import type { SnapshotProposal } from 'helpers/snapshot_utils';
import { capitalize } from 'lodash';
import moment from 'moment';

import 'pages/snapshot/snapshot_information_card.scss';

import app from 'state';
import { CWContentPageCard } from '../../components/component_kit/CWContentPage';
import { CWIcon } from '../../components/component_kit/cw_icons/cw_icon';
import { CWText } from '../../components/component_kit/cw_text';
import { User } from '../../components/user/user';
import { SnapshotThreadLink } from '../view_proposal/proposal_header_links';

type SnapshotInfoRowProps = {
  label: string;
  value: string | React.ReactNode;
};

const SnapshotInfoRow = (props: SnapshotInfoRowProps) => {
  const { label, value } = props;

  return (
    <div className="SnapshotInfoRow">
      <CWText type="caption" className="snapshot-info-row-label">
        {label}
      </CWText>
      <CWText noWrap>{value}</CWText>
    </div>
  );
};

type SnapshotInfoLinkRowProps = SnapshotInfoRowProps & { url: string };

const SnapshotInfoLinkRow = (props: SnapshotInfoLinkRowProps) => {
  const { label, url, value } = props;

  return (
    <div className="SnapshotInfoRow">
      <CWText type="caption" className="snapshot-info-row-label">
        {label}
      </CWText>
      <a href={url} target="_blank">
        <CWText className="snapshot-link" noWrap>
          {value}
        </CWText>
        <CWIcon iconName="externalLink" iconSize="small" />
      </a>
    </div>
  );
};

type SnapshotInformationCardProps = {
  proposal: SnapshotProposal;
  threads: Array<{ id: string; title: string }> | null;
};

export const SnapshotInformationCard = ({
  proposal,
  threads,
}: SnapshotInformationCardProps) => {
  const votingSystem = capitalize(
    proposal.type.split('-').join(' ').concat(' voting')
  );

  return (
    <CWContentPageCard
      header="Information"
      content={
        <div className="SnapshotInformationCard">
          <div className="info-rows-container">
            <SnapshotInfoRow
              label="Author"
              value={
                app.chain ? (
                  <User
                    userAddress={proposal.author}
                    userChainId={app.activeChainId()}
                    shouldHideAvatar
                    shouldLinkProfile
                    shouldShowPopover
                  />
                ) : (
                  proposal.author
                )
              }
            />
            <SnapshotInfoLinkRow
              label="IPFS"
              value={`#${proposal.ipfs}`}
              url={`https://ipfs.fleek.co/ipfs/${proposal.ipfs}`}
            />
            <SnapshotInfoRow label="Voting System" value={votingSystem} />
            <SnapshotInfoRow
              label="Start Date"
              value={moment(+proposal.start * 1000).format('lll')}
            />
            <SnapshotInfoRow
              label="End Date"
              value={moment(+proposal.end * 1000).format('lll')}
            />
            <SnapshotInfoLinkRow
              label={proposal.strategies.length > 1 ? 'Strategies' : 'Strategy'}
              value={
                proposal.strategies.length > 1
                  ? `${proposal.strategies.length} Strategies`
                  : proposal.strategies[0].name
              }
              url={`https://snapshot.org/#/${app.snapshot.space.id}/proposal/${proposal.id}`}
            />
            <SnapshotInfoLinkRow
              label="Snapshot"
              value={`#${proposal.snapshot}`}
              url={`https://etherscan.io/block/${proposal.snapshot}`}
            />
          </div>
          {threads.length > 0 && (
            <>
              <div className="linked-discussions">
                <CWText type="h5" fontWeight="semiBold">
                  Linked Discussions
                </CWText>
                {threads.map((thread) => (
                  <SnapshotThreadLink thread={thread} key={thread.id} />
                ))}
              </div>
            </>
          )}
        </div>
      }
    />
  );
};
