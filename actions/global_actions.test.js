// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {browserHistory} from 'utils/browser_history';
import {redirectUserToDefaultTeam} from 'actions/global_actions.jsx';

jest.mock('actions/views/rhs', () => ({
    closeMenu: jest.fn(),
    closeRightHandSide: jest.fn(),
}));

jest.mock('actions/views/lhs', () => ({
    close: jest.fn(),
}));

describe('actions/global_actions', () => {
    test('redirectUserToDefaultTeam', async () => {
        browserHistory.push = jest.fn();
        await redirectUserToDefaultTeam();
        expect(browserHistory.push).toHaveBeenCalledWith('/select_team');
    });
});
