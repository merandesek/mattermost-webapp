// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {OverlayTrigger} from 'react-bootstrap';

export default class ProfilePicture extends React.PureComponent {
    static defaultProps = {
        width: '36',
        height: '36',
        isRHS: false,
        hasMention: false,
    };

    static propTypes = {
        src: PropTypes.string.isRequired,
        status: PropTypes.string,
        width: PropTypes.string,
        height: PropTypes.string,
        userId: PropTypes.string,
        username: PropTypes.string,
        isBusy: PropTypes.bool,
        isRHS: PropTypes.bool,
        hasMention: PropTypes.bool,
    };


    render() {
        if (this.props.userId) {
            return (
                <OverlayTrigger
                    ref='overlay'
                    trigger='click'
                    placement='right'
                    rootClose={true}
                >
                    <span className='status-wrapper'>
                        <img
                            className='more-modal__image'
                            alt={`${this.props.username || 'user'} profile image`}
                            width={this.props.width}
                            height={this.props.width}
                            src={this.props.src}
                        />
                    </span>
                </OverlayTrigger>
            );
        }
        return (
            <span className='status-wrapper'>
                <img
                    className='more-modal__image'
                    alt={'user profile image'}
                    width={this.props.width}
                    height={this.props.width}
                    src={this.props.src}
                />
            </span>
        );
    }
}
