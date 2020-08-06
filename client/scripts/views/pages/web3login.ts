import 'pages/web3login.scss';

import m from 'mithril';
import { Spinner, Button } from 'construct-ui';
import app from 'state';
import { link } from 'helpers';
import Sublayout from 'views/sublayout';

const Web3LoginPage: m.Component<{}> = {
  view: (vnode) => {
    return m(Sublayout, {
      class: 'Web3LoginPage',
    }, [
      m('.web3login-options', [
        m(Button, {
          intent: 'primary',
          label: app.isLoggedIn() ? 'Finish connecting address' : 'Finish login',
          fluid: true,
          onclick: (e) => {
            if (app.isLoggedIn()) {
              app.modals.lazyCreate('link_new_address_modal');
            } else {
              app.modals.lazyCreate('link_new_address_modal', { loggingInWithAddress: true });
            }
          },
        }),
        m.route.param('prev')
          ? link('a.web3login-go-home', m.route.param('prev'), 'Go back')
          : link('a.web3login-go-home', `/${app.activeId()}`, 'Go home'),
      ]),
    ]);
  }
};

export default Web3LoginPage;
