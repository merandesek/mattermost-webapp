// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';

export default class NotLoggedIn extends React.PureComponent {
    static propTypes = {

        /*
         * Content of the page
         */
        children: PropTypes.object,

        /*
         * Mattermost configuration
         */
        config: PropTypes.object,
    };

    componentDidMount() {
        document.body.classList.add('sticky');
        document.getElementById('root').classList.add('container-fluid');
    }
    componentWillUnmount() {
        document.body.classList.remove('sticky');
        document.getElementById('root').classList.remove('container-fluid');
    }

    render() {
        const content = [];

        return (
            <div className='inner-wrap'>
                <div className='row content'>
                    {this.props.children}
                </div>
                <div className='row footer'>
                    <div
                        id='footer_section'
                        className='footer-pane col-xs-12'
                    >
                        <div className='col-xs-12'>
                            <span
                                id='company_name'
                                className='pull-right footer-site-name'
                            >
                                {'P2C'}
                            </span>
                        </div>
                        <div className='col-xs-12'>
                            <span
                                id='copyright'
                                className='pull-right footer-link copyright'
                            >
                                {`© 2015-${new Date().getFullYear()} Mattermost, Inc.`}
                            </span>
                            <span className='pull-right'>
                                {content}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

