// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import { Route } from 'react-router-dom';

import Pluggable from 'plugins/pluggable';
import ModalController from 'components/modal_controller';

import CenterChannel from 'components/channel_layout/center_channel';

export default class ChannelController extends React.Component {

    render() {
        return (
            <div
                id='channel_view'
                className='channel-view'
            >
            
                <div className='container-fluid'>
                    <Route component={CenterChannel} />
                    <Pluggable pluggableName='Root' />
                    <ModalController/>

                </div>
                
            </div>
        );
    }
}
