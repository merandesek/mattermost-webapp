// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';

import {FormattedMessage} from 'react-intl';

import MessageIcon from 'components/svg/message_icon';
import {UserStatuses} from 'utils/constants';
import * as Utils from 'utils/utils.jsx';

export default class PopoverListMembersItem extends React.PureComponent {
    static propTypes = {
        showMessageIcon: PropTypes.bool.isRequired,
        onItemClick: PropTypes.func.isRequired,
        status: PropTypes.string.isRequired,
        user: PropTypes.object.isRequired,
    };

    static defaultProps = {
        status: UserStatuses.OFFLINE,
    };

    handleClick = () => {
        this.props.onItemClick(this.props.user);
    };

    render() {
        if (!this.props.user) {
            return null;
        }

        const name = Utils.getDisplayNameByUser(this.props.user);
        if (!name) {
            return null;
        }

        let messageIcon;
        if (this.props.showMessageIcon) {
            messageIcon = (
                <MessageIcon
                    className='icon icon__message'
                    aria-hidden='true'
                />
            );
        }

        const botClass = this.props.user.is_bot ? ' more-modal__row--bot' : '';

        const status = this.props.user.is_bot ? null : this.props.status;
        const botTag = this.props.user.is_bot ? (
            <div className='bot-indicator bot-indicator__popoverlist'>
                <FormattedMessage
                    id='post_info.bot'
                    defaultMessage='BOT'
                />
            </div>
        ) : null;

        return (
            <div
                className={'more-modal__row' + botClass}
                onClick={this.handleClick}
            >
                <div className='more-modal__details d-flex whitespace--nowrap'>
                    <div className='more-modal__name'>
                        {name}
                    </div>
                    <div>
                        {botTag}
                    </div>
                </div>
                <div className='more-modal__actions'>
                    {messageIcon}
                </div>
            </div>
        );
    }
}
