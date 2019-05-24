// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import { FormattedMessage } from 'react-intl';

import { Posts } from 'mattermost-redux/constants';
import * as Utils from 'utils/utils.jsx';

import PostTime from 'components/post_view/post_time';

export default class PostInfo extends React.PureComponent {
    static propTypes = {

        /*
         * The post to render the info for
         */
        post: PropTypes.object.isRequired,

        /*
         * The id of the team which belongs the post
         */
        teamId: PropTypes.string,

        /**
         * Set to render in compact view
         */
        compactDisplay: PropTypes.bool,

    };

    constructor(props) {
        super(props);
    }

    render() {
        const post = this.props.post;
        const isEphemeral = Utils.isPostEphemeral(post);
        let visibleMessage;
        if (isEphemeral && !this.props.compactDisplay && post.state !== Posts.POST_DELETED) {
            visibleMessage = (
                <span className='post__visibility'>
                    <FormattedMessage
                        id='post_info.message.visible'
                        defaultMessage='(Only visible to you)'
                    />
                </span>
            );
        }
        let postTime = <PostTime
            eventTime={post.create_at}
            postId={post.id}
        />
        return (
            <div className='post__header--info'>
                <div className='col'>
                    {postTime}
                    {visibleMessage}
                </div>
            </div>
        );
    }
}
