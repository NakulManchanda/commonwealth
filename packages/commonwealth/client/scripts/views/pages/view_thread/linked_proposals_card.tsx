import { IChainEntityKind } from 'chain-events/src';
import { loadMultipleSpacesData } from 'helpers/snapshot_utils';
import { filterLinks } from 'helpers/threads';
import {
  chainEntityTypeToProposalName,
  chainEntityTypeToProposalSlug,
  getProposalUrlPath,
} from 'identifiers';
import { Link, LinkSource } from 'models/Thread';
import 'pages/view_thread/linked_proposals_card.scss';
import React, { useEffect, useMemo, useState } from 'react';
import { Link as ReactRouterLink } from 'react-router-dom';
import app from 'state';
import type ChainEntity from '../../../models/ChainEntity';
import type Thread from '../../../models/Thread';
import type { ThreadStage } from '../../../models/types';
import { CWButton } from '../../components/component_kit/cw_button';
import { CWContentPageCard } from '../../components/component_kit/CWContentPage';
import { Modal } from '../../components/component_kit/cw_modal';
import { CWSpinner } from '../../components/component_kit/cw_spinner';
import { CWText } from '../../components/component_kit/cw_text';
import { UpdateProposalStatusModal } from '../../modals/update_proposal_status_modal';

type LinkedProposalProps = {
  thread: Thread;
  title: string;
  ceType: ChainEntity['type'];
  ceTypeId: ChainEntity['typeId'];
  ceCompleted?: ChainEntity['completed'];
};

const LinkedProposal = ({
  thread,
  title,
  ceType,
  ceTypeId,
  ceCompleted,
}: LinkedProposalProps) => {
  const slug = chainEntityTypeToProposalSlug(ceType);

  const threadLink =
    thread.chain === 'edgeware' && !ceType.includes('/')
      ? `/${thread.chain}/link/chain-entity/${ceTypeId}`
      : `${app.isCustomDomain() ? '' : `/${thread.chain}`}${getProposalUrlPath(
          slug,
          ceTypeId,
          true
        )}`;

  return (
    <ReactRouterLink to={threadLink}>
      {`${
        title ?? chainEntityTypeToProposalName(ceType) ?? 'Proposal'
      } #${ceTypeId} ${ceCompleted ? ' (Completed)' : ''}`}
    </ReactRouterLink>
  );
};

type LinkedProposalsCardProps = {
  showAddProposalButton: boolean;
  thread: Thread;
};

export const LinkedProposalsCard = ({
  thread,
  showAddProposalButton,
}: LinkedProposalsCardProps) => {
  const [snapshotProposalsLoaded, setSnapshotProposalsLoaded] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState('');
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const initialSnapshotLinks = useMemo(
    () => filterLinks(thread.links, LinkSource.Snapshot),
    [thread.links]
  );

  const initialProposalLinks = useMemo(
    () => filterLinks(thread.links, LinkSource.Proposal),
    [thread.links]
  );

  useEffect(() => {
    if (initialSnapshotLinks.length > 0) {
      const proposal = initialSnapshotLinks[0];
      if (proposal.identifier.includes('/')) {
        setSnapshotUrl(
          `${app.isCustomDomain() ? '' : `/${thread.chain}`}/snapshot/${
            proposal.identifier
          }`
        );
      } else {
        loadMultipleSpacesData(app.chain.meta.snapshot).then((data) => {
          for (const { space: _space, proposals } of data) {
            const matchingSnapshot = proposals.find(
              (sn) => sn.id === proposal.identifier
            );
            if (matchingSnapshot) {
              setSnapshotTitle(matchingSnapshot.title);
              setSnapshotUrl(
                `${app.isCustomDomain() ? '' : `/${thread.chain}`}/snapshot/${
                  _space.id
                }/${matchingSnapshot.id}`
              );
              break;
            }
          }
        });
      }
      setSnapshotProposalsLoaded(true);
    }
  }, [initialSnapshotLinks]);

  const showSnapshot =
    initialSnapshotLinks.length > 0 && snapshotProposalsLoaded;

  return (
    <>
      <CWContentPageCard
        header="Linked Proposals"
        content={
          initialSnapshotLinks.length > 0 && !snapshotProposalsLoaded ? (
            <div className="spinner-container">
              <CWSpinner size="medium" />
            </div>
          ) : (
            <div className="LinkedProposalsCard">
              {initialProposalLinks.length > 0 || showSnapshot ? (
                <div className="links-container">
                  {initialProposalLinks.length > 0 && (
                    <div className="linked-proposals">
                      {initialProposalLinks.map((l) => {
                        return (
                          <LinkedProposal
                            key={l.identifier}
                            thread={thread}
                            title={l.title}
                            ceType={'proposal' as IChainEntityKind}
                            ceTypeId={l.identifier}
                          />
                        );
                      })}
                    </div>
                  )}
                  {showSnapshot && (
                    <ReactRouterLink to={snapshotUrl}>
                      Snapshot: {initialSnapshotLinks[0].title ?? snapshotTitle}
                    </ReactRouterLink>
                  )}
                </div>
              ) : (
                <CWText type="b2" className="no-proposals-text">
                  There are currently no linked proposals.
                </CWText>
              )}
              {showAddProposalButton && (
                <CWButton
                  buttonType="mini-black"
                  label="Link proposal"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsModalOpen(true);
                  }}
                />
              )}
            </div>
          )
        }
      />
      <Modal
        className="LinkedProposalsCardModal"
        content={
          <UpdateProposalStatusModal
            thread={thread}
            onModalClose={() => setIsModalOpen(false)}
          />
        }
        onClose={() => setIsModalOpen(false)}
        open={isModalOpen}
      />
    </>
  );
};
