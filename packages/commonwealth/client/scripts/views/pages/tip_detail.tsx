import type { SubstrateTreasuryTip } from 'controllers/chain/substrate/treasury_tip';
import 'pages/tip_detail.scss';
import React from 'react';
import { QuillRenderer } from '../components/react_quill_editor/quill_renderer';
import { User } from '../components/user/user';

type TipDetailProps = {
  proposal: SubstrateTreasuryTip;
};

export const TipDetail = (props: TipDetailProps) => {
  const { proposal } = props;

  const {
    author,
    title,
    data: { who, reason },
  } = proposal;

  const contributors = proposal.getVotes();

  return (
    <div className="TipDetail">
      <div className="tip-details">
        <div className="title">{title}</div>
        <div className="proposal-page-row">
          <div className="label">Finder</div>
          <User
            userAddress={author.address}
            userChainId={author.chain?.id || author.profile?.chain}
            shouldLinkProfile
            shouldShowPopover
            shouldShowAddressWithDisplayName
          />
        </div>
        <div className="proposal-page-row">
          <div className="label">Beneficiary</div>
          <User
            userAddress={proposal.author.chain.id}
            userChainId={who}
            shouldLinkProfile
            shouldShowPopover
            shouldShowAddressWithDisplayName
          />
        </div>
        <div className="proposal-page-row">
          <div className="label">Reason</div>
          <div className="tip-reason">
            {reason && <QuillRenderer doc={reason} />}
          </div>
        </div>
        <div className="proposal-page-row">
          <div className="label">Amount</div>
          <div className="amount">
            <div className="denominator">{proposal.support.denom}</div>
            <div>{proposal.support.inDollars}</div>
          </div>
        </div>
      </div>
      <div className="tip-contributions">
        {contributors.length > 0 && (
          <>
            <div className="contributors title">Contributors</div>
            {contributors.map(({ account, deposit }) => (
              <div className="contributors-row">
                <div className="amount">
                  <div className="denominator">{deposit.denom}</div>
                  <div>{deposit.inDollars}</div>
                </div>
                <User
                  userAddress={account.address}
                  userChainId={account.chain.id || account.profile?.chain}
                  shouldLinkProfile
                  shouldShowPopover
                  shouldShowAddressWithDisplayName
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
