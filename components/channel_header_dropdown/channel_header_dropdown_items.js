// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import { Constants, ModalIdentifiers } from 'utils/constants';
import { localizeMessage } from 'utils/utils';
import ChannelNotificationsModal from 'components/channel_notifications_modal';

import MenuGroup from 'components/widgets/menu/menu_group.jsx';
import MenuItemToggleModalRedux from 'components/widgets/menu/menu_items/menu_item_toggle_modal_redux.jsx';

export default class ChannelHeaderDropdown extends React.PureComponent {
    static propTypes = {
        user: PropTypes.object.isRequired,
        channel: PropTypes.object.isRequired,
        isDefault: PropTypes.bool.isRequired,
    }

    render() {
        const {
            user,
            channel,
        } = this.props;

        return (
            <React.Fragment>
                <MenuGroup>
                    <MenuItemToggleModalRedux
                        id='channelNotificationPreferences'
                        show={channel.type !== Constants.DM_CHANNEL}
                        modalId={ModalIdentifiers.CHANNEL_NOTIFICATIONS}
                        dialogType={ChannelNotificationsModal}
                        dialogProps={{
                            channel,
                            currentUser: user,
                        }}
                        text={localizeMessage('navbar.preferences', 'Notification Preferences')}
                    />
                </MenuGroup>
            </React.Fragment>
        );
    }
}
