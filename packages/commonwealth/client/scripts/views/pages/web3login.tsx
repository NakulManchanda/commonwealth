import { isNonEmptyString } from 'helpers/typeGuards';
import $ from 'jquery';
import 'pages/web3login.scss';
import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import app from 'state';
import { CWButton } from '../components/component_kit/cw_button';
import { Modal } from '../components/component_kit/cw_modal';
import { CWText } from '../components/component_kit/cw_text';
import { isWindowMediumSmallInclusive } from '../components/component_kit/helpers';
import { LoginModal } from '../modals/login_modal';
import { PageNotFound } from './404';
import { PageLoading } from './loading';

const Web3LoginPage = () => {
  const [searchParams] = useSearchParams();
  const [errorMsg, setErrorMsg] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);

  const token = searchParams.get('connect');
  const prev = searchParams.get('prev');

  if (app.isCustomDomain() || !token) {
    // hide page if invalid arguments or via custom domain
    return <PageNotFound />;
  }

  if (isLoading) {
    return <PageLoading message="Redirecting..." />;
  }

  // hit auth callback and redirect
  const onSuccess = async () => {
    if (!app.isLoggedIn()) {
      // user should never be logged out when this method is called
      return;
    }

    setIsLoading(true);

    try {
      const { status, result } = await $.get(
        `${app.serverUrl()}/auth/callback`,
        {
          jwt: app.user.jwt,
          token,
        }
      );

      if (status === 'Success') {
        // TODO: validate URL?
        // REDIRECT TO CMNBOT
        window.location.href = result;
      } else {
        console.error('Unknown error occurred', status, result);
      }
    } catch (e) {
      setErrorMsg(e.responseJSON.error);
    }
  };

  return (
    <>
      <Modal
        content={<LoginModal onModalClose={() => setIsModalOpen(false)} />}
        isFullScreen={isWindowMediumSmallInclusive(window.innerWidth)}
        onClose={() => setIsModalOpen(false)}
        open={isModalOpen}
      />
      <div className="Web3LoginPage">
        <div className="web3-login-container">
          <CWButton
            label="Connect"
            buttonType="lg-primary-blue"
            onClick={() => {
              if (app.isLoggedIn()) {
                onSuccess();
              } else {
                setIsModalOpen(true);
              }
            }}
          />
          <Link
            className="web3login-go-home"
            to={
              prev
                ? prev
                : app.isCustomDomain()
                ? '/'
                : `/${app.activeChainId()}`
            }
          >
            Go home
          </Link>
          {isNonEmptyString(errorMsg) && <CWText>{errorMsg}</CWText>}
        </div>
      </div>
    </>
  );
};

export default Web3LoginPage;
