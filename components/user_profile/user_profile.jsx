// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

import { FormattedMessage } from 'react-intl';

export default class UserProfile extends PureComponent {
    static propTypes = {
        displayName: PropTypes.string,
        hasMention: PropTypes.bool,
        user: PropTypes.object,
        userId: PropTypes.string,
    };

    static defaultProps = {
        hasMention: false,
        hideStatus: false,
        overwriteName: '',
    };


    render() {
        const {
            displayName,
            hasMention,
            overwriteName,
            user,
        } = this.props;

        const name = overwriteName || displayName || '...';

        let tag = null;
        if (user && user.is_bot) {
            tag = (
                <div className='bot-indicator bot-indicator__popoverlist'>
                    <FormattedMessage
                        id='post_info.bot'
                        defaultMessage='BOT'
                    />
                </div>
            );
        }

        return (
            <div className='user-popover'>
                {name}
                {tag}
            </div>
        );
    }
}
