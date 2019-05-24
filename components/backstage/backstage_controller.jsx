// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import { Route, Switch } from 'react-router-dom';

import Pluggable from 'plugins/pluggable';
import Integrations from 'components/integrations';
import InstalledIncomingWebhooks from 'components/integrations/installed_incoming_webhooks';
import AddIncomingWehook from 'components/integrations/add_incoming_webhook';
import EditIncomingWebhook from 'components/integrations/edit_incoming_webhook';
import InstalledOutgoingWebhooks from 'components/integrations/installed_outgoing_webhooks';
import AddOutgoingWebhook from 'components/integrations/add_outgoing_webhook';
import EditOutgoingWebhook from 'components/integrations/edit_outgoing_webhook';
import InstalledOauthApps from 'components/integrations/installed_oauth_apps';
import AddOauthApp from 'components/integrations/add_oauth_app';
import EditOauthApp from 'components/integrations/edit_oauth_app';
import ConfirmIntegration from 'components/integrations/confirm_integration';

import BackstageSidebar from './components/backstage_sidebar.jsx';
import BackstageNavbar from './components/backstage_navbar';

const BackstageRoute = ({ component: Component, extraProps, ...rest }) => ( //eslint-disable-line react/prop-types
    <Route
        {...rest}
        render={(props) => (
            <Component
                {...extraProps}
                {...props}
            />
        )}
    />
);

export default class BackstageController extends React.Component {
    static propTypes = {

        /**
         * Current user.
         */
        user: PropTypes.object,

        /**
         * Current team.
         */
        team: PropTypes.object,

        /**
         * Object from react-router
         */
        match: PropTypes.shape({
            url: PropTypes.string.isRequired,
        }).isRequired,

        siteName: PropTypes.string,
        enableIncomingWebhooks: PropTypes.bool.isRequired,
        enableOutgoingWebhooks: PropTypes.bool.isRequired,
        enableCommands: PropTypes.bool.isRequired,
        enableOAuthServiceProvider: PropTypes.bool.isRequired,
    }

    scrollToTop = () => {
        if (this.listRef) {
            this.listRef.scrollTop = 0;
        }
    }

    setListRef = (ref) => {
        this.listRef = ref;
    }

    render() {
        if (this.props.team == null || this.props.user == null) {
            return <div />;
        }
        const extraProps = {
            team: this.props.team,
            user: this.props.user,
            scrollToTop: this.scrollToTop,
        };
        return (
            <div className='backstage'>
                <BackstageNavbar
                    team={this.props.team}
                    siteName={this.props.siteName}
                />
                <Pluggable pluggableName='Root' />
                <div
                    className='backstage-body'
                    ref={this.setListRef}
                >
                    <BackstageSidebar
                        team={this.props.team}
                        user={this.props.user}
                        enableIncomingWebhooks={this.props.enableIncomingWebhooks}
                        enableOutgoingWebhooks={this.props.enableOutgoingWebhooks}
                        enableCommands={this.props.enableCommands}
                        enableOAuthServiceProvider={this.props.enableOAuthServiceProvider}
                    />
                    <Switch>
                        <BackstageRoute
                            extraProps={extraProps}
                            exact={true}
                            path={'/:team/integrations'}
                            component={Integrations}
                        />
                        <BackstageRoute
                            extraProps={extraProps}
                            exact={true}
                            path={`${this.props.match.url}/incoming_webhooks`}
                            component={InstalledIncomingWebhooks}
                        />
                        <BackstageRoute
                            extraProps={extraProps}
                            path={`${this.props.match.url}/incoming_webhooks/add`}
                            component={AddIncomingWehook}
                        />
                        <BackstageRoute
                            extraProps={extraProps}
                            path={`${this.props.match.url}/incoming_webhooks/edit`}
                            component={EditIncomingWebhook}
                        />
                        <BackstageRoute
                            extraProps={extraProps}
                            exact={true}
                            path={`${this.props.match.url}/outgoing_webhooks`}
                            component={InstalledOutgoingWebhooks}
                        />
                        <BackstageRoute
                            extraProps={extraProps}
                            path={`${this.props.match.url}/outgoing_webhooks/add`}
                            component={AddOutgoingWebhook}
                        />
                        <BackstageRoute
                            extraProps={extraProps}
                            path={`${this.props.match.url}/outgoing_webhooks/edit`}
                            component={EditOutgoingWebhook}
                        />
                        <BackstageRoute
                            extraProps={extraProps}
                            exact={true}
                            path={`${this.props.match.url}/oauth2-apps`}
                            component={InstalledOauthApps}
                        />
                        <BackstageRoute
                            extraProps={extraProps}
                            path={`${this.props.match.url}/oauth2-apps/add`}
                            component={AddOauthApp}
                        />
                        <BackstageRoute
                            extraProps={extraProps}
                            path={`${this.props.match.url}/oauth2-apps/edit`}
                            component={EditOauthApp}
                        />
                        <BackstageRoute
                            extraProps={extraProps}
                            path={`${this.props.match.url}/confirm`}
                            component={ConfirmIntegration}
                        />
                    </Switch>
                </div>
            </div>
        );
    }
}
