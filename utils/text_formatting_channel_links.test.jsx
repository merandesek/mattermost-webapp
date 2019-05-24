// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import * as TextFormatting from 'utils/text_formatting.jsx';

describe('TextFormatting.ChannelLinks', () => {
    it('Not channel links', (done) => {
        assert.equal(
            TextFormatting.formatText('~123').trim(),
            '<p>~123</p>'
        );

        assert.equal(
            TextFormatting.formatText('~p2c').trim(),
            '<p>~p2c</p>'
        );

        done();
    });

    describe('Channel links', () => {
        afterEach(() => {
            delete window.basename;
        });

        it('should link ~p2c', () => {
            assert.equal(
                TextFormatting.formatText('~p2c', {
                    channelNamesMap: {'p2c': {display_name: 'P2C'}},
                    team: {name: 'myteam'},
                }).trim(),
                '<p><a class="mention-link" href="/myteam/channels/p2c" data-channel-mention="p2c">~P2C</a></p>'
            );
        });

        it('should link ~p2c followed by a period', () => {
            assert.equal(
                TextFormatting.formatText('~p2c.', {
                    channelNamesMap: {'p2c': {display_name: 'P2C'}},
                    team: {name: 'myteam'},
                }).trim(),
                '<p><a class="mention-link" href="/myteam/channels/p2c" data-channel-mention="p2c">~P2C</a>.</p>'
            );
        });

        it('should link ~p2c, with display_name an HTML string', () => {
            assert.equal(
                TextFormatting.formatText('~p2c', {
                    channelNamesMap: {'p2c': {display_name: '<b>Reception</b>'}},
                    team: {name: 'myteam'},
                }).trim(),
                '<p><a class="mention-link" href="/myteam/channels/p2c" data-channel-mention="p2c">~&lt;b&gt;Reception&lt;/b&gt;</a></p>'
            );
        });

        it('should link ~p2c, with a basename defined', () => {
            window.basename = '/subpath';
            assert.equal(
                TextFormatting.formatText('~p2c', {
                    channelNamesMap: {'p2c': {display_name: '<b>Reception</b>'}},
                    team: {name: 'myteam'},
                }).trim(),
                '<p><a class="mention-link" href="/subpath/myteam/channels/p2c" data-channel-mention="p2c">~&lt;b&gt;Reception&lt;/b&gt;</a></p>'
            );
        });
    });
});
