// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import { Locations } from 'utils/constants.jsx';
import LocalDateTime from 'components/local_date_time';

export default class PostTime extends React.PureComponent {
    static propTypes = {

        /*
         * The time to display
         */
        eventTime: PropTypes.number.isRequired,

        location: PropTypes.oneOf([Locations.CENTER, Locations.RHS_ROOT, Locations.RHS_COMMENT, Locations.SEARCH]).isRequired,

        /*
         * The post id of posting being rendered
         */
        postId: PropTypes.string,
        teamUrl: PropTypes.string,
    };

    static defaultProps = {
        eventTime: 0,
        location: Locations.CENTER,
    };

    render() {
        const localDateTime = (
            <LocalDateTime
                eventTime={this.props.eventTime}
            />
        );
        
        return (
            <div
                className='post__permalink'
            >
                {localDateTime}
            </div>
        );
    }
}
