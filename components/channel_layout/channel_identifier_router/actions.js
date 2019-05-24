// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import { joinChannel, getChannelByNameAndTeamName, markGroupChannelOpen } from 'mattermost-redux/actions/channels';
import { getUser, getUserByUsername, getUserByEmail } from 'mattermost-redux/actions/users';
import { getTeamByName } from 'mattermost-redux/selectors/entities/teams';
import { getCurrentUserId, getUserByUsername as selectUserByUsername, getUser as selectUser, getUserByEmail as selectUserByEmail } from 'mattermost-redux/selectors/entities/users';
import { getChannelByName, getOtherChannels, getChannel, getChannelsNameMapInTeam } from 'mattermost-redux/selectors/entities/channels';

import { Constants } from 'utils/constants.jsx';
import * as GlobalActions from 'actions/global_actions.jsx';
import * as Utils from 'utils/utils.jsx';

const LENGTH_OF_ID = 26;
const LENGTH_OF_GROUP_ID = 40;

export function onChannelByIdentifierEnter({ match, history }) {
    return (dispatch, getState) => {
        const state = getState();
        const { path, identifier, team } = match.params;

        if (!getTeamByName(state, team)) {
            return;
        }

        if (path === 'channels') {
            if (identifier.length === LENGTH_OF_ID) {
                // It's hard to tell an ID apart from a channel name of the same length, so check first if
                // the identifier matches a channel that we have
                const channelsByName = getChannelByName(state, identifier);
                const moreChannelsByName = getOtherChannels(state).find((chan) => chan.name === identifier);
                if (channelsByName || moreChannelsByName) {
                    dispatch(goToChannelByChannelName(match, history));
                } else {
                    dispatch(goToChannelByChannelId(match, history));
                }
            } else if (identifier.length === LENGTH_OF_GROUP_ID) {
                dispatch(goToGroupChannelByGroupId(match, history));
            } else {
                dispatch(goToChannelByChannelName(match, history));
            }
        }
    };
}

export function goToChannelByChannelId(match, history) {
    return async (dispatch, getState) => {
        const state = getState();
        const { team, identifier } = match.params;
        const channelId = identifier.toLowerCase();

        let channel = getChannel(state, channelId);
        const member = state.entities.channels.myMembers[channelId];
        const teamObj = getTeamByName(state, team);
        if (!channel || !member) {
            const { data, error } = await dispatch(joinChannel(getCurrentUserId(state), teamObj.id, channelId, null));
            if (error) {
                handleChannelJoinError(match, history);
                return;
            }
            channel = data.channel;
        }

        if (channel.type === Constants.DM_CHANNEL) {
            dispatch(goToDirectChannelByUserId(match, history, Utils.getUserIdFromChannelId(channel.name)));
        } else if (channel.type != Constants.GM_CHANNEL) {
            history.replace(`/${team}/channels/${channel.name}`);
        }
    };
}

export function goToChannelByChannelName(match, history) {
    return async (dispatch, getState) => {
        const state = getState();
        const { team, identifier } = match.params;
        const channelName = identifier.toLowerCase();

        const teamObj = getTeamByName(state, team);
        if (!teamObj) {
            return;
        }

        let channel = getChannelsNameMapInTeam(state, teamObj.id)[channelName];
        let member;
        if (channel) {
            member = state.entities.channels.myMembers[channel.id];
        }

        if (!channel || !member) {
            const { data, error: joinError } = await dispatch(joinChannel(getCurrentUserId(state), teamObj.id, null, channelName));
            if (joinError) {
                const { data: data2, error: getChannelError } = await dispatch(getChannelByNameAndTeamName(team, channelName, true));
                if (getChannelError || data2.delete_at === 0) {
                    handleChannelJoinError(match, history);
                    return;
                }
                channel = data2;
            } else {
                channel = data.channel;
            }
        }

        doChannelChange(channel);
    };
}

function goToGroupChannelByGroupId(match, history) {
    return async (dispatch, getState) => {
        const state = getState();
        const { identifier, team } = match.params;
        const groupId = identifier.toLowerCase();

        let channel = getChannelByName(state, groupId);
        const teamObj = getTeamByName(state, team);
        if (!channel) {
            const { data, error } = await dispatch(joinChannel(getCurrentUserId(state), teamObj.id, null, groupId));
            if (error) {
                handleError(match, history);
                return;
            }
            channel = data.channel;
        }

        dispatch(markGroupChannelOpen(channel.id));

        doChannelChange(channel);
    };
}

function doChannelChange(channel) {
    GlobalActions.emitChannelClickEvent(channel);
}

function handleError(match, history) {
    const { team } = match.params;
    history.push(team ? `/${team}/channels/${Constants.DEFAULT_CHANNEL}` : '/');
}

function handleChannelJoinError(match, history) {
    const { team } = match.params;
    history.push(team ? `/error?type=channel_not_found&returnTo=/${team}/channels/${Constants.DEFAULT_CHANNEL}` : '/');
}
