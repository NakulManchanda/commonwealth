import { isDefaultStage, pluralize, threadStageToLabel } from 'helpers';
import { getProposalUrlPath } from 'identifiers';
import moment from 'moment';
import { useCommonNavigate } from 'navigation/helpers';
import 'pages/overview/TopicSummaryRow.scss';
import React from 'react';
import app from 'state';
import { slugify } from 'utils';
import { CWTag } from 'views/components/component_kit/cw_tag';
import { CWThreadAction } from 'views/components/component_kit/new_designs/cw_thread_action';
import type Thread from '../../../models/Thread';
import type Topic from '../../../models/Topic';
import { CWDivider } from '../../components/component_kit/cw_divider';
import { CWIcon } from '../../components/component_kit/cw_icons/cw_icon';
import { CWText } from '../../components/component_kit/cw_text';
import { getClasses } from '../../components/component_kit/helpers';
import { SharePopover } from '../../components/share_popover';
import { User } from '../../components/user/user';
import { NewThreadTag } from '../discussions/NewThreadTag';
import { getLastUpdated, isHot } from '../discussions/helpers';
import { TopicSummaryRowSkeleton } from './TopicSummaryRowSkeleton';

type TopicSummaryRowProps = {
  monthlyThreads: Array<Thread>;
  pinnedThreads: Array<Thread>;
  topic: Topic;
  isLoading?: boolean;
};

export const TopicSummaryRow = ({
  monthlyThreads = [],
  pinnedThreads = [],
  topic,
  isLoading,
}: TopicSummaryRowProps) => {
  const navigate = useCommonNavigate();

  if (isLoading) return <TopicSummaryRowSkeleton />;

  const topSortedThreads = monthlyThreads
    .sort((a, b) => {
      const aLastUpdated = a.lastCommentedOn || a.createdAt;
      const bLastUpdated = b.lastCommentedOn || b.createdAt;
      return bLastUpdated.valueOf() - aLastUpdated.valueOf();
    })
    .slice(0, 5 - monthlyThreads.length);

  const threadsToDisplay = pinnedThreads.concat(topSortedThreads);

  return (
    <div className="TopicSummaryRow">
      <div className="topic-column">
        <div className="name-and-count">
          <CWText
            type="h4"
            fontWeight="semiBold"
            className="topic-name-text"
            onClick={(e) => {
              e.preventDefault();
              navigate(`/discussions/${encodeURI(topic.name)}`);
            }}
          >
            {topic.name}
          </CWText>
          <CWText
            type="caption"
            fontWeight="medium"
            className="threads-count-text"
          >
            {topic.totalThreads || 0} Threads
          </CWText>
        </div>
        {topic.description && <CWText type="b2">{topic.description}</CWText>}
      </div>
      <div className="recent-threads-column">
        {threadsToDisplay.map((thread, idx) => {
          const discussionLink = getProposalUrlPath(
            thread.slug,
            `${thread.identifier}-${slugify(thread.title)}`
          );

          const user = app.chain.accounts.get(thread.author);

          const isStageDefault = isDefaultStage(thread.stage);
          const isTagsRowVisible = thread.stage && !isStageDefault;

          return (
            <div key={idx}>
              <div
                className={getClasses<{ isPinned?: boolean }>(
                  { isPinned: thread.pinned },
                  'recent-thread-row'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(discussionLink);
                }}
              >
                <div className="row-top">
                  <div className="user-and-date-row">
                    <User
                      userAddress={user.address}
                      userChainId={user.chain?.id || user.profile?.chain}
                      shouldShowAddressWithDisplayName
                      shouldLinkProfile
                      avatarSize={24}
                    />
                    <CWText className="last-updated-text">•</CWText>
                    <CWText
                      type="caption"
                      fontWeight="medium"
                      className="last-updated-text"
                    >
                      {moment(getLastUpdated(thread)).format('l')}
                    </CWText>
                    <NewThreadTag threadCreatedAt={thread.createdAt} />
                    {thread.readOnly && (
                      <CWIcon iconName="lock" iconSize="small" />
                    )}
                  </div>
                  <div className="row-top-icons">
                    {isHot(thread) && <div className="flame" />}
                    {thread.pinned && <CWIcon iconName="pin" />}
                  </div>
                </div>

                <CWText type="b2" fontWeight="bold">
                  {thread.title}
                </CWText>

                <CWText type="caption" className="thread-preview">
                  {thread.plaintext}
                </CWText>

                {isTagsRowVisible && (
                  <div className="tags-row">
                    <CWTag
                      label={threadStageToLabel(thread.stage)}
                      trimAt={20}
                      type="stage"
                    />
                  </div>
                )}

                <div className="row-bottom">
                  <div className="comments-and-users">
                    <CWThreadAction
                      label={`${pluralize(thread.numberOfComments, 'Comment')}`}
                      action="comment"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  </div>
                  <div className="row-bottom-menu">
                    <div
                      onClick={(e) => {
                        // prevent clicks from propagating to discussion row
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <SharePopover discussionLink={discussionLink} />
                    </div>
                  </div>
                </div>
              </div>
              {idx !== threadsToDisplay.length - 1 && <CWDivider />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
