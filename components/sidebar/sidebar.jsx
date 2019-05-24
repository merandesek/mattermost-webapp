// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import {FormattedMessage} from 'react-intl';
import {PropTypes} from 'prop-types';
import classNames from 'classnames';

import Scrollbars from 'react-custom-scrollbars';
import {SpringSystem, MathUtil} from 'rebound';

import {trackEvent} from 'actions/diagnostics_actions.jsx';
import {redirectUserToDefaultTeam} from 'actions/global_actions';
import {Constants, SidebarChannelGroups} from 'utils/constants.jsx';
import * as Utils from 'utils/utils.jsx';
import favicon from 'images/favicon/favicon-16x16.png';
import redFavicon from 'images/favicon/redfavicon-16x16.png';
import MoreChannels from 'components/more_channels';
import NewChannelFlow from 'components/new_channel_flow';
import UnreadChannelIndicator from 'components/unread_channel_indicator.jsx';

import SidebarChannel from './sidebar_channel';
import ChannelCreate from './channel_create';
import ChannelMore from './channel_more';
import ChannelName from './channel_name';

export function renderView(props) {
    return (
        <div
            {...props}
            className='scrollbar--view'
        />);
}

export function renderThumbHorizontal(props) {
    return (
        <div
            {...props}
            className='scrollbar--horizontal'
        />);
}

export function renderThumbVertical(props) {
    return (
        <div
            {...props}
            className='scrollbar--vertical'
        />);
}

export default class Sidebar extends React.PureComponent {
    static propTypes = {

        /**
         * Global config object
         */
        config: PropTypes.object.isRequired,

        isOpen: PropTypes.bool.isRequired,

        /**
         * List of unread channels (ids)
         */
        unreadChannelIds: PropTypes.array,

        /**
         * List of ordered channels (ids)
         */
        orderedChannelIds: PropTypes.arrayOf(PropTypes.shape({

            /**
             * Type of channel
             */
            type: PropTypes.string.isRequired,

            /**
             * Displayed name in sidebar
             */
            name: PropTypes.string.isRequired,

            /**
             * List of ids for the channels (ids)
             */
            items: PropTypes.array.isRequired,
        })),

        /**
         * Current channel object
         */
        currentChannel: PropTypes.object,

        /**
         * Current channel teammeat (for direct messages)
         */
        currentTeammate: PropTypes.object,

        /**
         * Current team object
         */
        currentTeam: PropTypes.object,

        /**
         * Current user object
         */
        currentUser: PropTypes.object,

        /**
         * Number of unread mentions/messages
         */
        unreads: PropTypes.object.isRequired,

        /**
         * Permission to create public channel
         */
        canCreatePublicChannel: PropTypes.bool.isRequired,

        /**
         * Permission to create private channel
         */
        canCreatePrivateChannel: PropTypes.bool.isRequired,

        /**
         * Flag to display the Switch channel shortcut
         */
        channelSwitcherOption: PropTypes.bool.isRequired,

        actions: PropTypes.shape({
            close: PropTypes.func.isRequired,
            switchToChannelById: PropTypes.func.isRequired,
            openModal: PropTypes.func.isRequired,
        }).isRequired,
    };

    static defaultProps = {
        currentChannel: {},
    }

    constructor(props) {
        super(props);

        this.badgesActive = false;
        this.firstUnreadChannel = null;
        this.lastUnreadChannel = null;

        this.isLeaving = new Map();
        this.isSwitchingChannel = false;

        this.state = {
            newChannelModalType: '',
            orderedChannelIds: props.orderedChannelIds,
            showMoreChannelsModal: false,
            showMorePublicChannelsModal: false,
        };

        this.animate = new SpringSystem();
        this.unreadScrollAnimate = this.animate.createSpring();
        this.unreadScrollAnimate.setOvershootClampingEnabled(true); // disables the spring action at the end of animation
        this.unreadScrollAnimate.addListener({onSpringUpdate: this.handleScrollAnimationUpdate});
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.orderedChannelIds[0].type === SidebarChannelGroups.UNREADS &&
            prevState.orderedChannelIds[0].type === SidebarChannelGroups.UNREADS &&
            prevState.orderedChannelIds[0].items.length === nextProps.orderedChannelIds[0].items.length &&
            prevState.orderedChannelIds[0].items.includes(nextProps.currentChannel.id)
        ) {
            return null;
        }

        if (nextProps.orderedChannelIds !== prevState.orderedChannelIds) {
            return {orderedChannelIds: nextProps.orderedChannelIds};
        }

        return null;
    }

    componentDidMount() {
        this.updateUnreadIndicators();
        document.addEventListener('keydown', this.navigateChannelShortcut);
        document.addEventListener('keydown', this.navigateUnreadChannelShortcut);
    }

    componentDidUpdate(prevProps) {
        // if the active channel disappeared (which can happen when dm channels autoclose), go to p2c
        if (this.props.currentTeam === prevProps.currentTeam &&
            this.props.currentChannel.id === prevProps.currentChannel.id &&
            !this.channelIdIsDisplayedForProps(this.props.orderedChannelIds, this.props.currentChannel.id) &&
            this.channelIdIsDisplayedForProps(prevProps.orderedChannelIds, this.props.currentChannel.id)
        ) {
            redirectUserToDefaultTeam();
            return;
        }

        // reset the scrollbar upon switching teams
        if (this.props.currentTeam !== prevProps.currentTeam) {
            this.refs.scrollbar.scrollToTop();
        }

        // close the LHS on mobile when you change channels
        if (this.props.currentChannel.id !== prevProps.currentChannel.id) {
            this.props.actions.close();
        }

        this.updateTitle();

        // Don't modify favicon for now: https://mattermost.atlassian.net/browse/MM-13643.
        // this.setBadgesActiveAndFavicon();

        this.setFirstAndLastUnreadChannels();
        this.updateUnreadIndicators();
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.navigateChannelShortcut);
        document.removeEventListener('keydown', this.navigateUnreadChannelShortcut);

        this.animate.deregisterSpring(this.unreadScrollAnimate);
        this.animate.removeAllListeners();
        this.unreadScrollAnimate.destroy();
    }

    setBadgesActiveAndFavicon() {
        this.lastBadgesActive = this.badgesActive;
        this.badgesActive = this.props.unreads.mentionCount;

        // update the favicon to show if there are any notifications
        if (this.lastBadgesActive !== this.badgesActive) {
            var link = document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.id = 'favicon';
            if (this.badgesActive) {
                link.href = typeof redFavicon === 'string' ? redFavicon : '';
            } else {
                link.href = typeof favicon === 'string' ? favicon : '';
            }
            var head = document.getElementsByTagName('head')[0];
            var oldLink = document.getElementById('favicon');
            if (oldLink) {
                head.removeChild(oldLink);
            }
            head.appendChild(link);
        }
    }

    setFirstAndLastUnreadChannels() {
        const {currentChannel, unreadChannelIds} = this.props;
        const {orderedChannelIds} = this.state;

        this.getDisplayedChannels(orderedChannelIds).map((channelId) => {
            if (channelId !== currentChannel.id && unreadChannelIds.includes(channelId)) {
                if (!this.firstUnreadChannel) {
                    this.firstUnreadChannel = channelId;
                }
                this.lastUnreadChannel = channelId;
            }
            return null;
        });
    }

    updateTitle = () => {
        const {
            config,
            currentChannel,
            currentTeam,
            currentTeammate,
            unreads,
        } = this.props;

        if (currentChannel && currentTeam) {
            let currentSiteName = '';
            if (config.SiteName != null) {
                currentSiteName = config.SiteName;
            }

            let currentChannelName = currentChannel.display_name;
            if (currentChannel.type === Constants.DM_CHANNEL) {
                if (currentTeammate != null) {
                    currentChannelName = currentTeammate.display_name;
                }
            }

            const mentionTitle = unreads.mentionCount > 0 ? '(' + unreads.mentionCount + ') ' : '';
            const unreadTitle = unreads.messageCount > 0 ? '* ' : '';
            document.title = mentionTitle + unreadTitle + currentChannelName + ' - ' + this.props.currentTeam.display_name + ' ' + currentSiteName;
        }
    }

    onScroll = () => {
        this.updateUnreadIndicators();
    }

    handleScrollAnimationUpdate = (spring) => {
        const {scrollbar} = this.refs;
        const val = spring.getCurrentValue();
        scrollbar.scrollTop(val);
    }

    scrollToFirstUnreadChannel = () => {
        if (this.firstUnreadChannel) {
            const displayedChannels = this.getDisplayedChannels(this.state.orderedChannelIds);
            this.unreadScrollAnimate.setCurrentValue(this.refs.scrollbar.getScrollTop()).setAtRest();
            let position;
            if (displayedChannels.length > 0 && displayedChannels[0] === this.firstUnreadChannel) {
                position = MathUtil.mapValueInRange(0, 0, 1, 0, 1);
            } else {
                const unreadMargin = 15;
                const firstUnreadElement = $(ReactDOM.findDOMNode(this.refs[this.firstUnreadChannel]));
                const scrollTop = firstUnreadElement.position().top - unreadMargin;
                position = MathUtil.mapValueInRange(scrollTop, 0, 1, 0, 1);
            }
            this.unreadScrollAnimate.setEndValue(position);
        }
    }

    scrollToLastUnreadChannel = () => {
        if (this.lastUnreadChannel) {
            const {scrollbar} = this.refs;
            const unreadMargin = 15;
            const lastUnreadElement = $(ReactDOM.findDOMNode(this.refs[this.lastUnreadChannel]));
            const elementBottom = lastUnreadElement.position().top + lastUnreadElement.height();
            const scrollTop = (elementBottom - scrollbar.getClientHeight()) + unreadMargin;
            const position = MathUtil.mapValueInRange(scrollTop, 0, 1, 0, 1);
            this.unreadScrollAnimate.setCurrentValue(scrollbar.getScrollTop()).setAtRest();
            this.unreadScrollAnimate.setEndValue(position);
        }
    }

    updateUnreadIndicators = () => {
        let showTopUnread = false;
        let showBottomUnread = false;

        // Consider partially obscured channels as above/below
        const unreadMargin = 15;

        if (this.firstUnreadChannel) {
            const firstUnreadElement = $(ReactDOM.findDOMNode(this.refs[this.firstUnreadChannel]));
            const firstUnreadPosition = firstUnreadElement ? firstUnreadElement.position() : null;

            if (firstUnreadPosition && ((firstUnreadPosition.top + firstUnreadElement.height()) - unreadMargin) < this.refs.scrollbar.getScrollTop()) {
                showTopUnread = true;
            }
        }

        if (this.lastUnreadChannel) {
            const lastUnreadElement = $(ReactDOM.findDOMNode(this.refs[this.lastUnreadChannel]));
            const lastUnreadPosition = lastUnreadElement ? lastUnreadElement.position() : null;

            if (lastUnreadPosition && (lastUnreadPosition.top + unreadMargin) > (this.refs.scrollbar.getScrollTop() + this.refs.scrollbar.getClientHeight())) {
                showBottomUnread = true;
            }
        }
        if (showTopUnread !== this.state.showTopUnread || showBottomUnread !== this.state.showBottomUnread) {
            this.setState({
                showTopUnread,
                showBottomUnread,
            });
        }
    }

    updateScrollbarOnChannelChange = (channelId) => {
        const curChannel = this.refs[channelId].getWrappedInstance().refs.channel.getBoundingClientRect();
        if ((curChannel.top - Constants.CHANNEL_SCROLL_ADJUSTMENT < 0) || (curChannel.top + curChannel.height > this.refs.scrollbar.view.getBoundingClientRect().height)) {
            this.refs.scrollbar.scrollTop(this.refs.scrollbar.view.scrollTop + (curChannel.top - Constants.CHANNEL_SCROLL_ADJUSTMENT));
        }
    }

    getDisplayedChannels = (orderedChannelIds = []) => {
        return orderedChannelIds.reduce((allChannelIds, section) => {
            allChannelIds.push(...section.items);
            return allChannelIds;
        }, []);
    };

    channelIdIsDisplayedForProps = (orderedChannelIds = [], id) => {
        const allChannels = this.getDisplayedChannels(orderedChannelIds);
        for (let i = 0; i < allChannels.length; i++) {
            if (allChannels[i] === id) {
                return true;
            }
        }
        return false;
    }

    onHandleNewChannel = () => {
        this.showNewChannelModal(Constants.OPEN_CHANNEL);
    }

    showMoreChannelsModal = () => {
        this.setState({showMoreChannelsModal: true});
        trackEvent('ui', 'ui_channels_more_public');
    }

    hideMoreChannelsModal = () => {
        this.setState({showMoreChannelsModal: false});
    }

    showNewPublicChannelModal = () => {
        this.showNewChannelModal(Constants.OPEN_CHANNEL);
    }

    showNewPrivateChannelModal = () => {
        this.showNewChannelModal(Constants.PRIVATE_CHANNEL);
    }

    showNewChannelModal = (type) => {
        this.setState({newChannelModalType: type});
    }

    hideNewChannelModal = () => {
        this.setState({newChannelModalType: ''});
    }

    createSidebarChannel = (channelId) => {
        return (
            <SidebarChannel
                key={channelId}
                ref={channelId}
                channelId={channelId}
                active={channelId === this.props.currentChannel.id}
                currentTeamName={this.props.currentTeam.name}
                currentUserId={this.props.currentUser.id}
            />
        );
    }

    renderOrderedChannels = () => {
        const {orderedChannelIds} = this.state;

        const sectionsToHide = [SidebarChannelGroups.UNREADS, SidebarChannelGroups.FAVORITE];

        return (
            <Scrollbars
                ref='scrollbar'
                autoHide={true}
                autoHideTimeout={500}
                autoHideDuration={500}
                renderThumbHorizontal={renderThumbHorizontal}
                renderThumbVertical={renderThumbVertical}
                renderView={renderView}
                onScroll={this.onScroll}
                style={{position: 'absolute'}}
            >
                <div
                    id='sidebarChannelContainer'
                    className='nav-pills__container'
                >
                    {orderedChannelIds.map((sec) => {
                        const section = {
                            type: sec.type,
                            name: sec.name,
                            items: sec.items.map(this.createSidebarChannel),
                        };

                        if (sectionsToHide.indexOf(section.type) !== -1 && section.items.length === 0) {
                            return null;
                        }

                        const sectionId = `${section.type}Channel`;

                        return (
                            <ul
                                key={section.type}
                                className='nav nav-pills nav-stacked'
                            >
                                <li>
                                    <h4 id={sectionId}>
                                        <ChannelName
                                            sectionType={section.type}
                                            channelName={section.name}
                                        />
                                        <ChannelCreate
                                            sectionType={section.type}
                                            canCreatePublicChannel={this.props.canCreatePublicChannel}
                                            canCreatePrivateChannel={this.props.canCreatePrivateChannel}
                                            createPublicChannel={this.showNewPublicChannelModal}
                                            createPrivateChannel={this.showNewPrivateChannelModal}
                                        />
                                    </h4>
                                </li>
                                {section.items}
                                <ChannelMore
                                    sectionType={section.type}
                                    moreChannels={this.showMoreChannelsModal}
                                />
                            </ul>
                        );
                    })}
                </div>
            </Scrollbars>
        );
    };

    render() {
        // Check if we have all info needed to render
        if (this.props.currentTeam == null || this.props.currentUser == null) {
            return (<div/>);
        }

        this.badgesActive = false;

        // keep track of the first and last unread channels so we can use them to set the unread indicators
        this.firstUnreadChannel = null;
        this.lastUnreadChannel = null;

        let showChannelModal = false;
        if (this.state.newChannelModalType !== '') {
            showChannelModal = true;
        }

        const above = (
            <FormattedMessage
                id='sidebar.unreads'
                defaultMessage='More unreads'
            />
        );

        const below = (
            <FormattedMessage
                id='sidebar.unreads'
                defaultMessage='More unreads'
            />
        );


        let moreChannelsModal;
        if (this.state.showMoreChannelsModal) {
            moreChannelsModal = (
                <MoreChannels
                    onModalDismissed={this.hideMoreChannelsModal}
                    handleNewChannel={() => {
                        this.hideMoreChannelsModal();
                        this.showNewChannelModal(Constants.OPEN_CHANNEL);
                    }}
                />
            );
        }

        return (
            <div
                className={classNames('sidebar--left', {'move--right': this.props.isOpen && Utils.isMobile()})}
                id='sidebar-left'
                key='sidebar-left'
            >
                <NewChannelFlow
                    show={showChannelModal}
                    canCreatePublicChannel={this.props.canCreatePublicChannel}
                    canCreatePrivateChannel={this.props.canCreatePrivateChannel}
                    channelType={this.state.newChannelModalType}
                    onModalDismissed={this.hideNewChannelModal}
                />
                {moreChannelsModal}

                <div className='sidebar--left__list'>
                    <UnreadChannelIndicator
                        name='Top'
                        show={this.state.showTopUnread}
                        onClick={this.scrollToFirstUnreadChannel}
                        extraClass='nav-pills__unread-indicator-top'
                        content={above}
                    />
                    <UnreadChannelIndicator
                        name='Bottom'
                        show={this.state.showBottomUnread}
                        onClick={this.scrollToLastUnreadChannel}
                        extraClass='nav-pills__unread-indicator-bottom'
                        content={below}
                    />

                    {this.renderOrderedChannels()}
                </div>
            </div>
        );
    }
}
