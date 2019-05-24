// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Constants from 'utils/constants.jsx';
import PostInfo from 'components/post_view/post_info/post_info.jsx';

describe('components/post_view/PostInfo', () => {
    const post = {
        channel_id: 'g6139tbospd18cmxroesdk3kkc',
        create_at: 1502715365009,
        delete_at: 0,
        edit_at: 1502715372443,
        hashtags: '',
        id: 'e584uzbwwpny9kengqayx5ayzw',
        is_pinned: false,
        message: 'post message',
        original_id: '',
        parent_id: '',
        pending_post_id: '',
        props: {},
        root_id: '',
        type: '',
        update_at: 1502715372443,
        user_id: 'b4pfxi8sn78y8yq7phzxxfor7h',
    };

    const requiredProps = {
        post,
        compactDisplay: false,
        useMilitaryTime: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<PostInfo {...requiredProps}/>);
        expect(wrapper).toMatchSnapshot();
    });

    test('should match snapshot, compact display', () => {
        const props = {...requiredProps, compactDisplay: true};

        const wrapper = shallow(<PostInfo {...props}/>);
        expect(wrapper).toMatchSnapshot();
    });

    test('should match snapshot, military time', () => {
        const props = {...requiredProps, useMilitaryTime: true};

        const wrapper = shallow(<PostInfo {...props}/>);
        expect(wrapper).toMatchSnapshot();
    });

    test('should match snapshot, ephemeral post', () => {
        const ephemeralPost = {...post, type: Constants.PostTypes.EPHEMERAL};
        const requiredPropsWithEphemeralPost = {...requiredProps, post: ephemeralPost};

        const wrapper = shallow(<PostInfo {...requiredPropsWithEphemeralPost}/>);
        expect(wrapper).toMatchSnapshot();
    });
});
