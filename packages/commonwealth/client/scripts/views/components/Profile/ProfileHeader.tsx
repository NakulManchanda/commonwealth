import React from 'react';
import { useNavigate } from 'react-router-dom';
import jdenticon from 'jdenticon';

import 'components/Profile/ProfileHeader.scss';

import type NewProfile from '../../../models/NewProfile';
import { CWButton } from '../component_kit/cw_button';
import { CWText } from '../component_kit/cw_text';
import { SocialAccounts } from '../social_accounts';
import useUserLoggedIn from 'hooks/useUserLoggedIn';
import { QuillRenderer } from '../react_quill_editor/quill_renderer';

type ProfileHeaderProps = {
  profile: NewProfile;
  isOwner: boolean;
};

const ProfileHeader = ({ profile, isOwner }: ProfileHeaderProps) => {
  const navigate = useNavigate();
  const { isLoggedIn } = useUserLoggedIn();

  if (!profile) return;
  const { bio, name } = profile;

  const isCurrentUser = isLoggedIn && isOwner;

  return (
    <div className="ProfileHeader">
      <div className="edit">
        {isCurrentUser && (
          <CWButton
            label="Edit"
            buttonType="mini-white"
            iconLeft="write"
            onClick={() => navigate(`/profile/edit`)}
          />
        )}
      </div>
      <div className="profile-image">
        {profile?.avatarUrl ? (
          <img src={profile.avatarUrl} />
        ) : (
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(
              jdenticon.toSvg(profile.id, 90)
            )}`}
          />
        )}
      </div>
      <div className="profile-name-and-bio">
        <CWText type="h3" className={name ? 'name hasMargin' : 'name'}>
          {name || 'Anonymous user'}
        </CWText>
        <SocialAccounts profile={profile} />
        {bio && (
          <div>
            <CWText type="h4">Bio</CWText>
            <CWText className="bio">{<QuillRenderer doc={bio} />}</CWText>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
