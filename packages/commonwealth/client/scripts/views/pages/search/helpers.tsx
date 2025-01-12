import moment from 'moment';
import React, { useMemo } from 'react';

import 'pages/search/index.scss';

import { useFetchProfilesByAddressesQuery } from 'state/api/profiles';
import app from 'state';
import ChainInfo from '../../../models/ChainInfo';
import type MinimumProfile from '../../../models/MinimumProfile';
import { SearchScope } from '../../../models/SearchQuery';
import { CommunityLabel } from '../../components/community_label';
import { CWIcon } from '../../components/component_kit/cw_icons/cw_icon';
import { CWText } from '../../components/component_kit/cw_text';
import { renderTruncatedHighlights } from '../../components/react_quill_editor/highlighter';
import { QuillRenderer } from '../../components/react_quill_editor/quill_renderer';
import { User } from '../../components/user/user';

export type ThreadResult = {
  id: number;
  chain: string;
  title: string;
  body: string;
  address_id: number;
  address: string;
  address_chain: string;
  created_at: string;
};
type ThreadResultRowProps = {
  thread: ThreadResult;
  searchTerm: string;
  setRoute: any;
};
const ThreadResultRow = ({
  thread,
  searchTerm,
  setRoute,
}: ThreadResultRowProps) => {
  const title = useMemo(() => {
    try {
      return decodeURIComponent(thread.title);
    } catch (error) {
      return thread.title;
    }
  }, [thread.title]);

  const handleClick = () => {
    setRoute(`/discussion/${thread.id}`, {}, thread.chain);
  };

  if (app.isCustomDomain() && app.customDomainId() !== thread.chain) {
    return <></>;
  }

  return (
    <div key={thread.id} className="search-result-row" onClick={handleClick}>
      <CWIcon iconName="feedback" />
      <div className="inner-container">
        <CWText fontStyle="uppercase" type="caption" className="thread-header">
          {`discussion - ${thread.chain}`}
        </CWText>
        <CWText className="search-results-thread-title" fontWeight="medium">
          {renderTruncatedHighlights(searchTerm, title)}
        </CWText>
        <div className="search-results-thread-subtitle">
          <User
            userAddress={thread.address}
            userChainId={thread.address_chain}
          />
          <CWText className="created-at">
            {moment(thread.created_at).fromNow()}
          </CWText>
        </div>
        <CWText>
          <QuillRenderer
            containerClass="SearchQuillRenderer"
            hideFormatting={true}
            doc={thread.body}
            searchTerm={searchTerm}
            markdownCutoffLength={400}
          />
        </CWText>
      </div>
    </div>
  );
};

export type ReplyResult = {
  id: number;
  proposalid: number;
  chain: string;
  community: string;
  title: string;
  text: string;
  address_id: number;
  address: string;
  address_chain: string;
  created_at: string;
};
type ReplyResultRowProps = {
  comment: ReplyResult;
  searchTerm: string;
  setRoute: any;
};
const ReplyResultRow = ({
  comment,
  searchTerm,
  setRoute,
}: ReplyResultRowProps) => {
  const proposalId = comment.proposalid;
  const chain = comment.chain;

  const title = useMemo(() => {
    try {
      return decodeURIComponent(comment.title);
    } catch (error) {
      return comment.title;
    }
  }, [comment.title]);

  const handleClick = () => {
    setRoute(`/discussion/${proposalId}?comment=${comment.id}`, {}, chain);
  };

  if (app.isCustomDomain() && app.customDomainId() !== chain) {
    return <></>;
  }

  return (
    <div key={comment.id} className="search-result-row" onClick={handleClick}>
      <CWIcon iconName="feedback" />
      <div className="inner-container">
        <CWText fontWeight="medium">{`comment - ${
          comment.chain || comment.community
        }`}</CWText>
        <CWText className="search-results-thread-title">
          {renderTruncatedHighlights(searchTerm, title)}
        </CWText>
        <div className="search-results-thread-subtitle">
          <User
            userAddress={comment.address}
            userChainId={comment.address_chain}
          />
          <CWText className="created-at">
            {moment(comment.created_at).fromNow()}
          </CWText>
        </div>
        <CWText>
          <QuillRenderer
            containerClass="SearchQuillRenderer"
            hideFormatting={true}
            doc={comment.text}
            searchTerm={searchTerm}
          />
        </CWText>
      </div>
    </div>
  );
};

/**
 *  This function sets the route to go to the search result (i.e. a community).
 *  At this point the route is /:scope/search where :scope is the current community id.
 *  The route should be set to /<community-id>, so null should be passed instead of a prefix,
 *  as defined in the useCommonNavigate hook and the getScopePrefix helper function.
 */
export type CommunityResult = {
  id: string;
  name: string;
  default_symbol: string;
  type: string;
  icon_url: string;
  created_at: string | null;
};
type CommunityResultRowProps = {
  community: CommunityResult;
  searchTerm: string;
  setRoute: any;
};
const CommunityResultRow = ({
  community,
  setRoute,
}: CommunityResultRowProps) => {
  const handleClick = () => {
    setRoute(community.id ? `/${community.id}` : '/', {}, null);
  };

  const chainInfo = ChainInfo.fromJSON(community as any);

  return (
    <div
      key={community.id}
      className="community-result-row"
      onClick={handleClick}
    >
      <CommunityLabel community={chainInfo} />
    </div>
  );
};

export type MemberResult = {
  id: number;
  user_id: string;
  profile_name: string;
  avatar_url: string;
  addresses: {
    id: number;
    chain: string;
    address: string;
  }[];
  roles?: any[];
};
type MemberResultRowProps = {
  addr: MemberResult;
  setRoute: any;
};
const MemberResultRow = ({ addr, setRoute }: MemberResultRowProps) => {
  const { chain, address } = addr.addresses[0];
  const { data: users } = useFetchProfilesByAddressesQuery({
    profileChainIds: [chain],
    profileAddresses: [address],
    currentChainId: app.activeChainId(),
    apiCallEnabled: !!(chain && address),
  });
  const profile: MinimumProfile = users?.[0];

  const handleClick = () => {
    setRoute(`/profile/id/${profile?.id}`, {}, null);
  };

  if (app.isCustomDomain() && app.customDomainId() !== chain) {
    return null;
  }

  return (
    <div key={address} className="member-result-row" onClick={handleClick}>
      <User
        userAddress={address}
        userChainId={chain}
        shouldShowRole
        shouldLinkProfile
        avatarSize={32}
        shouldShowAddressWithDisplayName
      />
    </div>
  );
};

export const renderSearchResults = (
  results: any[],
  searchTerm: string,
  searchType: SearchScope,
  setRoute: any
) => {
  if (!results || results.length === 0) {
    return [];
  }
  const components = results.map((res) => {
    switch (searchType) {
      case SearchScope.Threads:
        // return null;
        return (
          <ThreadResultRow
            thread={res}
            searchTerm={searchTerm}
            setRoute={setRoute}
          />
        );
      case SearchScope.Members:
        return <MemberResultRow addr={res} setRoute={setRoute} />;
      case SearchScope.Communities:
        return (
          <CommunityResultRow
            community={res}
            searchTerm={searchTerm}
            setRoute={setRoute}
          />
        );
      case SearchScope.Replies:
        return (
          <ReplyResultRow
            comment={res}
            searchTerm={searchTerm}
            setRoute={setRoute}
          />
        );
      default:
        return <>ERROR</>;
    }
  });
  return components;
};
