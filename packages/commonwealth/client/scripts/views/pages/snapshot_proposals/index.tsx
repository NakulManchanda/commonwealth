import React, { useMemo, useState } from 'react';

import type { SnapshotProposal } from 'helpers/snapshot_utils';
import moment from 'moment';
import 'pages/snapshot_proposals.scss';
import app from 'state';
import { NotificationCategories } from '../../../../../../common-common/src/types';
import useNecessaryEffect from '../../../hooks/useNecessaryEffect';
import { CardsCollection } from '../../components/cards_collection';
import { CWButton } from '../../components/component_kit/cw_button';
import { CWTab, CWTabBar } from '../../components/component_kit/cw_tabs';
import { CWText } from '../../components/component_kit/cw_text';
import { SnapshotProposalCard } from './SnapshotProposalCard';
import useManageDocumentTitle from '../../../hooks/useManageDocumentTitle';

type SnapshotProposalsPageProps = {
  topic?: string;
  snapshotId: string;
};

const SnapshotProposalsPage = ({ snapshotId }: SnapshotProposalsPageProps) => {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [isSnapshotProposalsLoading, setIsSnapshotProposalsLoading] =
    useState<boolean>(true);
  const [proposals, setProposals] = useState<{
    active: Array<SnapshotProposal>;
    ended: Array<SnapshotProposal>;
  }>({ active: [], ended: [] });
  const proposalsToDisplay =
    activeTab === 1 ? proposals.active : proposals.ended;

  const spaceSubscription = useMemo(
    () =>
      app.user.notifications.findNotificationSubscription(
        {
          categoryId: NotificationCategories.SnapshotProposal,
          options: { snapshotId },
        }
      ),
    [snapshotId]
  );

  const [hasSubscription, setHasSubscription] = useState<boolean>(
    spaceSubscription !== undefined
  );

  useManageDocumentTitle('Snapshots');

  useNecessaryEffect(() => {
    const fetch = async () => {
      setIsSnapshotProposalsLoading(true);
      await app.snapshot.init(snapshotId);

      if (app.snapshot.initialized) {
        const tempProposals = {
          active: [],
          ended: [],
        };

        // filter active and ended proposals
        app.snapshot.proposals.filter((proposal: SnapshotProposal) =>
          moment(+proposal.end * 1000) >= moment()
            ? tempProposals.active.push(proposal)
            : tempProposals.ended.push(proposal)
        );

        setProposals(tempProposals);
        setIsSnapshotProposalsLoading(false);
      }
    };

    fetch();
  }, [snapshotId]);

  const updateSubscription = () => {
    if (hasSubscription) {
      app.user.notifications.deleteSubscription(spaceSubscription).then(() => {
        setHasSubscription(false);
      });
    } else {
      app.user.notifications
        .subscribe({
          categoryId: NotificationCategories.SnapshotProposal,
          options: { snapshotId },
        })
        .then(() => {
          setHasSubscription(true);
        });
    }
  };

  return (
    <div className="SnapshotProposalsPage">
      <div className="top-bar">
        <CWTabBar>
          {['Active', 'Ended'].map((tabName, index) => (
            <CWTab
              label={tabName}
              isSelected={activeTab === index + 1}
              onClick={() => setActiveTab(index + 1)}
            />
          ))}
        </CWTabBar>
        <div>
          <CWButton
            label={
              hasSubscription
                ? 'Remove Subscription'
                : 'Subscribe to Notifications'
            }
            iconLeft={hasSubscription ? 'mute' : 'bell'}
            onClick={updateSubscription}
            buttonType="mini-black"
          />
        </div>
      </div>
      {!isSnapshotProposalsLoading ? (
        proposalsToDisplay.length > 0 ? (
          <CardsCollection
            content={proposalsToDisplay.map((proposal, i) => (
              <SnapshotProposalCard
                key={i}
                snapshotId={snapshotId}
                proposal={proposal}
              />
            ))}
          />
        ) : (
          <CWText className="no-proposals-text">
            No active proposals found.
          </CWText>
        )
      ) : (
        <CardsCollection
          content={Array.from({ length: 10 }).map((x, i) => (
            <SnapshotProposalCard
              key={i}
              snapshotId={snapshotId}
              showSkeleton
              proposal={{} as any}
            />
          ))}
        />
      )}
    </div>
  );
};

export default SnapshotProposalsPage;
