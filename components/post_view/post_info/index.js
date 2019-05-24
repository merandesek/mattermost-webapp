// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {removePost} from 'mattermost-redux/actions/posts';
import {isCurrentChannelReadOnly} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';


import PostInfo from './post_info.jsx';

function mapStateToProps(state, ownProps) {
    const channel = state.entities.channels.channels[ownProps.post.channel_id];
    const channelIsArchived = channel ? channel.delete_at !== 0 : null;
    const teamId = getCurrentTeamId(state);

    return {
        teamId,
        isMobile: state.views.channel.mobileView,
        isReadOnly: isCurrentChannelReadOnly(state) || channelIsArchived,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            removePost,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostInfo);
