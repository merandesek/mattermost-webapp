// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import { OverlayTrigger } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { FormattedMessage, intlShape } from 'react-intl';
import { memoizeResult } from 'mattermost-redux/utils/helpers';

import 'bootstrap';

import ChannelHeaderPlug from 'plugins/channel_header_plug';
import PopoverListMembers from 'components/popover_list_members';
import { ChannelHeaderDropdown } from 'components/channel_header_dropdown';
import MenuWrapper from 'components/widgets/menu/menu_wrapper.jsx';

import {
    Constants,
    NotificationLevels
} from 'utils/constants';
import * as Utils from 'utils/utils';

const headerMarkdownOptions = { singleline: true, mentionHighlight: false, atMentions: true };
const popoverMarkdownOptions = { singleline: false, mentionHighlight: false, atMentions: true };


export default class ChannelHeader extends React.PureComponent {
    static propTypes = {
        currentUser: PropTypes.object.isRequired,
        channel: PropTypes.object,
        channelMember: PropTypes.object,
        dmUser: PropTypes.object,
        dmBot: PropTypes.object,
        isFavorite: PropTypes.bool,
        isMuted: PropTypes.bool,
        actions: PropTypes.shape({
            favoriteChannel: PropTypes.func.isRequired,
            unfavoriteChannel: PropTypes.func.isRequired,
            goToLastViewedChannel: PropTypes.func.isRequired,
            loadBot: PropTypes.func.isRequired,
        }).isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.getHeaderMarkdownOptions = memoizeResult((channelNamesMap) => (
            { ...headerMarkdownOptions, channelNamesMap }
        ));
        this.getPopoverMarkdownOptions = memoizeResult((channelNamesMap) => (
            { ...popoverMarkdownOptions, channelNamesMap }
        ));
    }

    componentDidMount() {
        if (this.props.dmUser && this.props.dmUser.is_bot) {
            this.props.actions.loadBot(this.props.dmUser.id);
        }
        document.addEventListener('keydown', this.handleShortcut);
        window.addEventListener('resize', this.handleResize);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleShortcut);
    }

    componentDidUpdate(prevProps) {
        const dmUser = this.props.dmUser;
        const prevDmUser = prevProps.dmUser || {};
        if (dmUser && dmUser.id !== prevDmUser.id && dmUser.is_bot) {
            this.props.actions.loadBot(dmUser.id);
        }
    }

    handleClose = () => {
        this.props.actions.goToLastViewedChannel();
    };
    unmute = () => {
        const { actions, channel, channelMember, currentUser } = this.props;

        if (!channelMember || !currentUser || !channel) {
            return;
        }

        const options = { mark_unread: NotificationLevels.ALL };
        actions.updateChannelNotifyProps(currentUser.id, channel.id, options);
    };

    mute = () => {
        const { actions, channel, channelMember, currentUser } = this.props;

        if (!channelMember || !currentUser || !channel) {
            return;
        }

        const options = { mark_unread: NotificationLevels.MENTION };
        actions.updateChannelNotifyProps(currentUser.id, channel.id, options);
    };
    handleOnMouseOver = () => {
        if (this.refs.headerOverlay) {
            this.refs.headerOverlay.show();
        }
    };

    handleOnMouseOut = () => {
        if (this.refs.headerOverlay) {
            this.refs.headerOverlay.hide();
        }
    };

    render() {
        const {
            currentUser,
            channel,
            channelMember,
            isMuted: channelMuted,
            dmUser,
            dmBot,
        } = this.props;
        const { formatMessage } = this.context.intl;

        let channelTitle = channel.display_name;
        const isDirect = (channel.type === Constants.DM_CHANNEL);

        if (isDirect) {
            const teammateId = dmUser.id;
            if (currentUser.id === teammateId) {
                channelTitle = (
                    <FormattedMessage
                        id='channel_header.directchannel.you'
                        defaultMessage='{displayname} (you) '
                        values={{
                            displayname: Utils.getDisplayNameByUserId(teammateId),
                        }}
                    />
                );
            } else {
                channelTitle = Utils.getDisplayNameByUserId(teammateId) + ' ';
            }
        }

        let popoverListMembers;
        if (!isDirect) {
            popoverListMembers = (
                <PopoverListMembers
                    channel={channel}
                />
            );
        }

        let muteTrigger;
        if (channelMuted) {
            muteTrigger = (
                <div className={'channel-header__mute'}>
                    <button
                        id='toggleMute'
                        onClick={this.unmute}
                        className={'style--none color--link channel-header__mute inactive'}
                        aria-label={formatMessage({ id: 'generic_icons.muted', defaultMessage: 'Muted Icon' })}
                    >
                        <i className={'icon fa fa-bell-o'} />
                    </button>
                </div>
            );
        }
        else {
            muteTrigger = (
                <div className={'channel-header__unmute'}>
                    <button
                        id='toggleUnmute'
                        onClick={this.mute}
                        className={'style--none color--link channel-header__unmute inactive'}
                        aria-label={formatMessage({ id: 'generic_icons.unmuted', defaultMessage: 'Unmuted Icon' })}
                    >
                        <i className={'icon fa fa-bell'} />
                    </button>
                </div>
            );
        }

        let title = (
            <MenuWrapper>
                <div
                    id='channelHeaderDropdownButton'
                    className='channel-header__top'
                >
                    <strong
                        id='channelHeaderTitle'
                        className='heading'
                    >
                        <span>
                            {channelTitle}
                        </span>
                    </strong>
                    <span
                        id='channelHeaderDropdownIcon'
                        className='fa fa-angle-down header-dropdown__icon'
                        title={formatMessage({ id: 'generic_icons.dropdown', defaultMessage: 'Dropdown Icon' })}
                    />
                </div>
                <ChannelHeaderDropdown />
            </MenuWrapper>
        );
        if (isDirect && dmUser.is_bot) {
            title = (
                <div
                    id='channelHeaderDropdownButton'
                    className='channel-header__top'
                >
                    <strong
                        id='channelHeaderTitle'
                        className='heading'
                    >
                        <span>
                            {channelTitle}
                        </span>
                    </strong>
                    <div>
                        <div className='bot-indicator bot-indicator__popoverlist'>
                            <FormattedMessage
                                id='post_info.bot'
                                defaultMessage='BOT'
                            />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div
                id='channel-header'
                data-channelid={`${channel.id}`}
                className='channel-header alt'
            >
                <div className='flex-parent'>
                    <div className='flex-child'>
                        <div
                            id='channelHeaderInfo'
                            className='channel-header__info'
                        >
                            <div
                                className='channel-header__title dropdown'
                            >
                                <h2>
                                    {title}
                                </h2>
                            </div>
                        </div>
                    </div>
                    <div className='flex-child'>
                        {muteTrigger}
                    </div>
                    <div className='flex-child'>
                        {popoverListMembers}
                    </div>
                    <ChannelHeaderPlug
                        channel={channel}
                        channelMember={channelMember}
                    />
                </div>
            </div>
        );
    }
}