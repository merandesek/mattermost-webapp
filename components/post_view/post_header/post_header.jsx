// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';

import Constants from 'utils/constants.jsx';
import * as PostUtils from 'utils/post_utils.jsx';
import PostInfo from 'components/post_view/post_info';
import UserProfile from 'components/user_profile';

export default class PostHeader extends React.PureComponent {
    static propTypes = {

        /*
         * The post to render the header for
         */
        post: PropTypes.object.isRequired,

        /*
         * Set to render compactly
         */
        compactDisplay: PropTypes.bool,

        /**
         * Whether or not the post username can be overridden.
         */
        enablePostUsernameOverride: PropTypes.bool.isRequired,

        /**
         * If the user that made the post is a bot.
         */
        isBot: PropTypes.bool.isRequired,
    }

    render() {
        const {post} = this.props;
        const isSystemMessage = PostUtils.isSystemMessage(post);
        const fromAutoResponder = PostUtils.fromAutoResponder(post);
        const fromWebhook = post && post.props && post.props.from_webhook === 'true';

        let userProfile = (
            <UserProfile
                userId={post.user_id}
                hasMention={true}
            />
        );
        let indicator;
        let colon;

        if (fromWebhook && !this.props.isBot) {
            if (post.props.override_username && this.props.enablePostUsernameOverride) {
                userProfile = (
                    <UserProfile
                        userId={post.user_id}
                        hideStatus={true}
                        overwriteName={post.props.override_username}
                    />
                );
            } else {
                userProfile = (
                    <UserProfile
                        userId={post.user_id}
                        hideStatus={true}
                    />
                );
            }

            indicator = (
                <div className='bot-indicator'>
                    <FormattedMessage
                        id='post_info.bot'
                        defaultMessage='BOT'
                    />
                </div>
            );
        } else if (fromAutoResponder) {
            userProfile = (
                <UserProfile
                    userId={post.user_id}
                    hideStatus={true}
                    hasMention={true}
                />
            );

            indicator = (
                <div className='bot-indicator'>
                    <FormattedMessage
                        id='post_info.auto_responder'
                        defaultMessage='AUTOMATIC REPLY'
                    />
                </div>
            );
        } else if (isSystemMessage) {
            userProfile = (
                <UserProfile
                    overwriteName={
                        <FormattedMessage
                            id='post_info.system'
                            defaultMessage='System'
                        />
                    }
                    overwriteImage={Constants.SYSTEM_MESSAGE_PROFILE_IMAGE}
                    disablePopover={true}
                />
            );
        }

        if (this.props.compactDisplay) {
            colon = (<strong className='colon'>{':'}</strong>);
        }

        return (
            <div className='post__header'>
                <div className='col col__name'>{userProfile}{colon}</div>
                {indicator}
                <div className='col'>
                    <PostInfo
                        post={post}
                    />
                </div>
            </div>
        );
    }
}
