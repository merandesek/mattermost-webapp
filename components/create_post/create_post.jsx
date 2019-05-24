// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import { FormattedMessage, intlShape } from 'react-intl';

import { Posts } from 'mattermost-redux/constants';
import { sortFileInfos } from 'mattermost-redux/utils/file_utils';

import * as GlobalActions from 'actions/global_actions.jsx';
import Constants, { StoragePrefixes } from 'utils/constants.jsx';
import { containsAtChannel, postMessageOnKeyPress, shouldFocusMainTextbox, isErrorInvalidSlashCommand } from 'utils/post_utils.jsx';
import { getTable, formatMarkdownTableMessage } from 'utils/paste.jsx';
import * as UserAgent from 'utils/user_agent.jsx';
import * as Utils from 'utils/utils.jsx';

import ConfirmModal from 'components/confirm_modal.jsx';
import FilePreview from 'components/file_preview/file_preview.jsx';
import FileUpload from 'components/file_upload';
import MsgTyping from 'components/msg_typing';
import Textbox from 'components/textbox';

import FormattedMarkdownMessage from 'components/formatted_markdown_message.jsx';
import MessageSubmitError from 'components/message_submit_error';

const KeyCodes = Constants.KeyCodes;


export default class CreatePost extends React.Component {
    static propTypes = {

        /**
        *  ref passed from channelView for EmojiPickerOverlay
        */
        getChannelView: PropTypes.func,

        /**
        *  Data used in notifying user for @all and @channel
        */
        currentChannelMembersCount: PropTypes.number,

        /**
        *  Data used in multiple places of the component
        */
        currentChannel: PropTypes.object,

        /**
        *  Data used in executing commands for channel actions passed down to client4 function
        */
        currentTeamId: PropTypes.string,

        /**
        *  Data used for posting message
        */
        currentUserId: PropTypes.string,

        /**
         * Force message submission on CTRL/CMD + ENTER
         */
        codeBlockOnCtrlEnter: PropTypes.bool,

        /**
        *  Flag used for handling submit
        */
        ctrlSend: PropTypes.bool,

        /**
        *  Flag used for adding a class center to Postbox based on user pref
        */
        fullWidthTextBox: PropTypes.bool,

        /**
        *  Data used populating message state when triggered by shortcuts
        */
        messageInHistoryItem: PropTypes.string,

        /**
        *  Data used for populating message state from previous draft
        */
        draft: PropTypes.shape({
            message: PropTypes.string.isRequired,
            uploadsInProgress: PropTypes.array.isRequired,
            fileInfos: PropTypes.array.isRequired,
        }).isRequired,

        /**
        *  Data used dispatching handleViewAction ex: edit post
        */
        latestReplyablePostId: PropTypes.string,
        locale: PropTypes.string.isRequired,

        /**
        *  Data used for calling edit of post
        */
        currentUsersLatestPost: PropTypes.object,

        /**
        *  Set if the channel is read only.
        */
        readOnlyChannel: PropTypes.bool,

        /**
         * Whether or not file upload is allowed.
         */
        canUploadFiles: PropTypes.bool.isRequired,

        /**
         * Whether to check with the user before notifying the whole channel.
         */
        enableConfirmNotificationsToChannel: PropTypes.bool.isRequired,

        /**
         * The maximum length of a post
         */
        maxPostSize: PropTypes.number.isRequired,

        /**
         * If our connection is bad
         */
        badConnection: PropTypes.bool.isRequired,

        /**
         * To check if the timezones are enable on the server.
         */
        isTimezoneEnabled: PropTypes.bool.isRequired,
        actions: PropTypes.shape({

            /**
            *  func called after message submit.
            */
            addMessageIntoHistory: PropTypes.func.isRequired,

            /**
            *  func called for navigation through messages by Up arrow
            */
            moveHistoryIndexBack: PropTypes.func.isRequired,

            /**
            *  func called for navigation through messages by Down arrow
            */
            moveHistoryIndexForward: PropTypes.func.isRequired,

            /**
            *  func called for posting message
            */
            onSubmitPost: PropTypes.func.isRequired,

            /**
            *  func called on load of component to clear drafts
            */
            clearDraftUploads: PropTypes.func.isRequired,

            runMessageWillBePostedHooks: PropTypes.func.isRequired,

            /**
            *  func called for setting drafts
            */
            setDraft: PropTypes.func.isRequired,

            /**
             *  func called for opening the last replayable post in the RHS
             */
            selectPostFromRightHandSideSearchByPostId: PropTypes.func.isRequired,

            /**
             * Function to open a modal
             */
            openModal: PropTypes.func.isRequired,

            /**
             * Function to get the users timezones in the channel
             */
            getChannelTimezones: PropTypes.func.isRequired,
        }).isRequired,
    }

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    static defaultProps = {
        latestReplyablePostId: '',
    }

    constructor(props) {
        super(props);
        this.state = {
            message: this.props.draft.message,
            submitting: false,
            showPostDeletedModal: false,
            enableSendButton: false,
            showConfirmModal: false,
            channelTimezoneCount: 0,
            uploadsProgressPercent: {},
            renderScrollbar: false,
            orientation: null,
        };

        this.lastBlurAt = 0;
        this.lastChannelSwitchAt = 0;
        this.draftsForChannel = {};
    }

    UNSAFE_componentWillMount() { // eslint-disable-line camelcase
        const enableSendButton = this.handleEnableSendButton(this.state.message, this.props.draft.fileInfos);
        this.props.actions.clearDraftUploads(StoragePrefixes.DRAFT, (key, value) => {
            if (value) {
                return { ...value, uploadsInProgress: [] };
            }
            return value;
        });
        this.onOrientationChange();

        // wait to load these since they may have changed since the component was constructed (particularly in the case of skipping the tutorial)
        this.setState({
            enableSendButton,
        });
    }

    componentDidMount() {
        this.focusTextbox();
        document.addEventListener('paste', this.pasteHandler);
        document.addEventListener('keydown', this.documentKeyHandler);
        this.setOrientationListeners();
    }

    UNSAFE_componentWillReceiveProps(nextProps) { // eslint-disable-line camelcase
        if (nextProps.currentChannel.id !== this.props.currentChannel.id) {
            const draft = nextProps.draft;

            this.setState({
                message: draft.message,
                submitting: false,
                serverError: null,
            });
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.currentChannel.id !== this.props.currentChannel.id) {
            this.lastChannelSwitchAt = Date.now();
            this.focusTextbox();
        }
    }

    componentWillUnmount() {
        document.removeEventListener('paste', this.pasteHandler);
        document.removeEventListener('keydown', this.documentKeyHandler);
        this.removeOrientationListeners();
    }

    setOrientationListeners = () => {
        if ((window.screen.orientation) && ('onchange' in window.screen.orientation)) {
            window.screen.orientation.addEventListener('change', this.onOrientationChange);
        } else if ('onorientationchange' in window) {
            window.addEventListener('orientationchange', this.onOrientationChange);
        }
    };

    removeOrientationListeners = () => {
        if ((window.screen.orientation) && ('onchange' in window.screen.orientation)) {
            window.screen.orientation.removeEventListener('change', this.onOrientationChange);
        } else if ('onorientationchange' in window) {
            window.removeEventListener('orientationchange', this.onOrientationChange);
        }
    };

    onOrientationChange = () => {
        if (!UserAgent.isIosWeb()) {
            return;
        }

        //Hide keyboard on iOS when orientation changes
        const { orientation: prevOrientation } = this.state;
        const LANDSCAPE_ANGLE = 90;
        let orientation = 'portrait';
        if (window.orientation) {
            orientation = Math.abs(window.orientation) === LANDSCAPE_ANGLE ? 'landscape' : 'portrait';
        }

        if (window.screen.orientation) {
            orientation = window.screen.orientation.type.split('-')[0];
        }

        this.setState({ orientation });
        if (prevOrientation && orientation !== prevOrientation && (document.activeElement || {}).id === 'post_textbox') {
            this.refs.textbox.getWrappedInstance().blur();
        }
    }

    handlePostError = (postError) => {
        this.setState({ postError });
    }

    doSubmit = async (e) => {
        const channelId = this.props.currentChannel.id;
        if (e) {
            e.preventDefault();
        }

        if (this.props.draft.uploadsInProgress.length > 0 || this.state.submitting) {
            return;
        }

        let message = this.state.message;
        const serverError = this.state.serverError;

        if (serverError && serverError.submittedMessage === message) {
            message = serverError.submittedMessage;
        }

        const post = {};
        post.file_ids = [];
        post.message = message;

        if (post.message.trim().length === 0 && this.props.draft.fileInfos.length === 0) {
            return;
        }

        if (this.state.postError) {
            this.setState({ errorClass: 'animation--highlight' });
            setTimeout(() => {
                this.setState({ errorClass: null });
            }, Constants.ANIMATION_TIMEOUT);
            return;
        }

        this.props.actions.addMessageIntoHistory(this.state.message);

        this.setState({ submitting: true, serverError: null });

        const { error } = await this.sendMessage(post);

        if (!error) {
            this.setState({ message: '' });
        }

        this.setState({
            submitting: false,
            postError: null,
            enableSendButton: false,
        });

        this.props.actions.setDraft(StoragePrefixes.DRAFT + channelId, null);
        this.draftsForChannel[channelId] = null;

        const fasterThanHumanWillClick = 150;
        const forceFocus = (Date.now() - this.lastBlurAt < fasterThanHumanWillClick);

        this.focusTextbox(forceFocus);
    }

    handleNotifyAllConfirmation = (e) => {
        this.hideNotifyAllModal();
        this.doSubmit(e);
    }

    hideNotifyAllModal = () => {
        this.setState({ showConfirmModal: false });
    }

    showNotifyAllModal = () => {
        this.setState({ showConfirmModal: true });
    }

    handleSubmit = async (e) => {

        const currentMembersCount = this.props.currentChannelMembersCount;
        const notificationsToChannel = this.props.enableConfirmNotificationsToChannel;
        if (notificationsToChannel &&
            currentMembersCount > Constants.NOTIFY_ALL_MEMBERS &&
            containsAtChannel(this.state.message)) {
            if (this.props.isTimezoneEnabled) {
                const { data } = await this.props.actions.getChannelTimezones(this.props.currentChannel.id);
                if (data) {
                    this.setState({ channelTimezoneCount: data.length });
                } else {
                    this.setState({ channelTimezoneCount: 0 });
                }
            }
            this.showNotifyAllModal();
            return;
        }

        await this.doSubmit(e);
    }

    sendMessage = async (originalPost) => {
        const {
            actions,
            currentChannel,
            currentUserId,
            draft,
        } = this.props;

        let post = originalPost;

        post.channel_id = currentChannel.id;

        const time = Utils.getTimestamp();
        const userId = currentUserId;
        post.pending_post_id = `${userId}:${time}`;
        post.user_id = userId;
        post.create_at = time;
        post.parent_id = this.state.parentId;

        const hookResult = await actions.runMessageWillBePostedHooks(post);

        if (hookResult.error) {
            this.setState({
                serverError: hookResult.error,
                submitting: false,
            });

            return hookResult;
        }

        post = hookResult.data;

        actions.onSubmitPost(post, draft.fileInfos);

        this.setState({
            submitting: false,
        });

        return { data: true };
    }

    focusTextbox = (keepFocus = false) => {
        if (this.refs.textbox && (keepFocus || !UserAgent.isMobile())) {
            this.refs.textbox.getWrappedInstance().focus();
        }
    }

    postMsgKeyPress = (e) => {
        const { ctrlSend, codeBlockOnCtrlEnter } = this.props;

        const { allowSending, withClosedCodeBlock, ignoreKeyPress, message } = postMessageOnKeyPress(e, this.state.message, ctrlSend, codeBlockOnCtrlEnter, Date.now(), this.lastChannelSwitchAt);

        if (ignoreKeyPress) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (allowSending) {
            e.persist();
            if (this.refs.textbox) {
                this.refs.textbox.getWrappedInstance().blur();
            }

            if (withClosedCodeBlock && message) {
                this.setState({ message }, () => this.handleSubmit(e));
            } else {
                this.handleSubmit(e);
            }
        }

        this.emitTypingEvent();
    }

    emitTypingEvent = () => {
        const channelId = this.props.currentChannel.id;
        GlobalActions.emitLocalUserTypingEvent(channelId, '');
    }

    handleChange = (e) => {
        const message = e.target.value;
        const channelId = this.props.currentChannel.id;
        const enableSendButton = this.handleEnableSendButton(message, this.props.draft.fileInfos);

        let serverError = this.state.serverError;
        if (isErrorInvalidSlashCommand(serverError)) {
            serverError = null;
        }

        this.setState({
            message,
            enableSendButton,
            serverError,
        });

        const draft = {
            ...this.props.draft,
            message,
        };

        this.props.actions.setDraft(StoragePrefixes.DRAFT + channelId, draft);
        this.draftsForChannel[channelId] = draft;
    }

    pasteHandler = (e) => {
        if (!e.clipboardData || !e.clipboardData.items || e.target.id !== 'post_textbox') {
            return;
        }

        const table = getTable(e.clipboardData);
        if (!table) {
            return;
        }

        e.preventDefault();

        const message = formatMarkdownTableMessage(table, this.state.message.trim());

        this.setState({ message });
    }

    handleFileUploadChange = () => {
        this.focusTextbox();
    }

    handleUploadStart = (clientIds, channelId) => {
        const uploadsInProgress = [
            ...this.props.draft.uploadsInProgress,
            ...clientIds,
        ];

        const draft = {
            ...this.props.draft,
            uploadsInProgress,
        };

        this.props.actions.setDraft(StoragePrefixes.DRAFT + channelId, draft);
        this.draftsForChannel[channelId] = draft;

        // this is a bit redundant with the code that sets focus when the file input is clicked,
        // but this also resets the focus after a drag and drop
        this.focusTextbox();
    }

    handleUploadProgress = ({ clientId, name, percent, type }) => {
        const uploadsProgressPercent = { ...this.state.uploadsProgressPercent, [clientId]: { percent, name, type } };
        this.setState({ uploadsProgressPercent });
    }

    handleFileUploadComplete = (fileInfos, clientIds, channelId) => {
        const draft = { ...this.draftsForChannel[channelId] };

        // remove each finished file from uploads
        for (let i = 0; i < clientIds.length; i++) {
            if (draft.uploadsInProgress) {
                const index = draft.uploadsInProgress.indexOf(clientIds[i]);

                if (index !== -1) {
                    draft.uploadsInProgress = draft.uploadsInProgress.filter((item, itemIndex) => index !== itemIndex);
                }
            }
        }

        if (draft.fileInfos) {
            draft.fileInfos = sortFileInfos(draft.fileInfos.concat(fileInfos), this.props.locale);
        }

        this.draftsForChannel[channelId] = draft;
        this.props.actions.setDraft(StoragePrefixes.DRAFT + channelId, draft);
    }

    handleUploadError = (err, clientId, channelId) => {
        const draft = { ...this.draftsForChannel[channelId] };

        let serverError = err;
        if (typeof err === 'string') {
            serverError = new Error(err);
        }

        if (clientId !== -1 && draft.uploadsInProgress) {
            const index = draft.uploadsInProgress.indexOf(clientId);

            if (index !== -1) {
                const uploadsInProgress = draft.uploadsInProgress.filter((item, itemIndex) => index !== itemIndex);
                const modifiedDraft = {
                    ...draft,
                    uploadsInProgress,
                };
                this.props.actions.setDraft(StoragePrefixes.DRAFT + channelId, modifiedDraft);
                this.draftsForChannel[channelId] = modifiedDraft;
            }
        }

        this.setState({ serverError });
    }

    removePreview = (id) => {
        let modifiedDraft = {};
        const draft = { ...this.props.draft };
        const channelId = this.props.currentChannel.id;

        // Clear previous errors
        this.setState({ serverError: null });

        // id can either be the id of an uploaded file or the client id of an in progress upload
        let index = draft.fileInfos.findIndex((info) => info.id === id);
        if (index === -1) {
            index = draft.uploadsInProgress.indexOf(id);

            if (index !== -1) {
                const uploadsInProgress = draft.uploadsInProgress.filter((item, itemIndex) => index !== itemIndex);

                modifiedDraft = {
                    ...draft,
                    uploadsInProgress,
                };

                if (this.refs.fileUpload && this.refs.fileUpload.getWrappedInstance()) {
                    this.refs.fileUpload.getWrappedInstance().cancelUpload(id);
                }
            }
        } else {
            const fileInfos = draft.fileInfos.filter((item, itemIndex) => index !== itemIndex);

            modifiedDraft = {
                ...draft,
                fileInfos,
            };
        }

        this.props.actions.setDraft(StoragePrefixes.DRAFT + channelId, modifiedDraft);
        this.draftsForChannel[channelId] = modifiedDraft;
        const enableSendButton = this.handleEnableSendButton(this.state.message, draft.fileInfos);

        this.setState({ enableSendButton });

        this.handleFileUploadChange();
    }

    focusTextboxIfNecessary = (e) => {
        // Focus should go to the RHS when it is expanded
        if (this.props.rhsExpanded) {
            return;
        }

        // Bit of a hack to not steal focus from the channel switch modal if it's open
        // This is a special case as the channel switch modal does not enforce focus like
        // most modals do
        if (document.getElementsByClassName('channel-switch-modal').length) {
            return;
        }

        if (shouldFocusMainTextbox(e, document.activeElement)) {
            this.focusTextbox();
        }
    }

    documentKeyHandler = (e) => {
        if ((e.ctrlKey || e.metaKey) && Utils.isKeyPressed(e, KeyCodes.FORWARD_SLASH)) {
            e.preventDefault();

            GlobalActions.toggleShortcutsModal();
            return;
        }

        this.focusTextboxIfNecessary(e);
    }

    getFileCount = () => {
        const draft = this.props.draft;
        return draft.fileInfos.length + draft.uploadsInProgress.length;
    }

    getFileUploadTarget = () => {
        if (this.refs.textbox) {
            return this.refs.textbox.getWrappedInstance();
        }

        return null;
    }

    getCreatePostControls = () => {
        return this.refs.createPostControls;
    }

    fillMessageFromHistory() {
        const lastMessage = this.props.messageInHistoryItem;
        if (lastMessage) {
            this.setState({
                message: lastMessage,
            });
        }
    }

    handleKeyDown = (e) => {
        const ctrlOrMetaKeyPressed = e.ctrlKey || e.metaKey;
        const messageIsEmpty = this.state.message.length === 0;
        const draftMessageIsEmpty = this.props.draft.message.length === 0;
        const ctrlEnterKeyCombo = (this.props.ctrlSend || this.props.codeBlockOnCtrlEnter) && Utils.isKeyPressed(e, KeyCodes.ENTER) && ctrlOrMetaKeyPressed;
        const upKeyOnly = !ctrlOrMetaKeyPressed && !e.altKey && !e.shiftKey && Utils.isKeyPressed(e, KeyCodes.UP);
        const shiftUpKeyCombo = !ctrlOrMetaKeyPressed && !e.altKey && e.shiftKey && Utils.isKeyPressed(e, KeyCodes.UP);
        const ctrlKeyCombo = ctrlOrMetaKeyPressed && !e.altKey && !e.shiftKey;

        if (ctrlEnterKeyCombo) {
            this.postMsgKeyPress(e);
        } else if (upKeyOnly && messageIsEmpty) {
            this.editLastPost(e);
        } else if (shiftUpKeyCombo && messageIsEmpty) {
            this.replyToLastPost(e);
        } else if (ctrlKeyCombo && draftMessageIsEmpty && Utils.isKeyPressed(e, KeyCodes.UP)) {
            this.loadPrevMessage(e);
        } else if (ctrlKeyCombo && draftMessageIsEmpty && Utils.isKeyPressed(e, KeyCodes.DOWN)) {
            this.loadNextMessage(e);
        }
    }

    loadPrevMessage = (e) => {
        e.preventDefault();
        this.props.actions.moveHistoryIndexBack(Posts.MESSAGE_TYPES.POST).then(() => this.fillMessageFromHistory());
    }

    loadNextMessage = (e) => {
        e.preventDefault();
        this.props.actions.moveHistoryIndexForward(Posts.MESSAGE_TYPES.POST).then(() => this.fillMessageFromHistory());
    }

    handleBlur = () => {
        this.lastBlurAt = Date.now();
    }

    handleEnableSendButton(message, fileInfos) {
        return message.trim().length !== 0 || fileInfos.length !== 0;
    }

    handleHeightChange = (height, maxHeight) => {
        this.setState({ renderScrollbar: height > maxHeight });
    }

    render() {
        const {
            currentChannel,
            currentChannelMembersCount,
            draft,
            fullWidthTextBox,
            showTutorialTip,
            readOnlyChannel,
        } = this.props;
        const { formatMessage } = this.context.intl;
        const members = currentChannelMembersCount - 1;
        const { renderScrollbar } = this.state;

        const notifyAllTitle = (
            <FormattedMessage
                id='notify_all.title.confirm'
                defaultMessage='Confirm sending notifications to entire channel'
            />
        );

        const notifyAllConfirm = (
            <FormattedMessage
                id='notify_all.confirm'
                defaultMessage='Confirm'
            />
        );

        let notifyAllMessage = '';
        if (this.state.channelTimezoneCount && this.props.isTimezoneEnabled) {
            notifyAllMessage = (
                <FormattedMarkdownMessage
                    id='notify_all.question_timezone'
                    defaultMessage='By using @all or @channel you are about to send notifications to **{totalMembers} people** in **{timezones, number} {timezones, plural, one {timezone} other {timezones}}**. Are you sure you want to do this?'
                    values={{
                        totalMembers: members,
                        timezones: this.state.channelTimezoneCount,
                    }}
                />
            );
        } else {
            notifyAllMessage = (
                <FormattedMessage
                    id='notify_all.question'
                    defaultMessage='By using @all or @channel you are about to send notifications to {totalMembers} people. Are you sure you want to do this?'
                    values={{
                        totalMembers: members,
                    }}
                />
            );
        }

        let serverError = null;
        if (this.state.serverError) {
            serverError = (
                <MessageSubmitError
                    id='postServerError'
                    error={this.state.serverError}
                    submittedMessage={this.state.serverError.submittedMessage}
                    handleSubmit={this.handleSubmit}
                />
            );
        }

        let postError = null;
        if (this.state.postError) {
            const postErrorClass = 'post-error' + (this.state.errorClass ? (' ' + this.state.errorClass) : '');
            postError = <label className={postErrorClass}>{this.state.postError}</label>;
        }

        let preview = null;
        if (!readOnlyChannel && (draft.fileInfos.length > 0 || draft.uploadsInProgress.length > 0)) {
            preview = (
                <FilePreview
                    fileInfos={draft.fileInfos}
                    onRemove={this.removePreview}
                    uploadsInProgress={draft.uploadsInProgress}
                    uploadsProgressPercent={this.state.uploadsProgressPercent}
                />
            );
        }

        let postFooterClassName = 'post-create-footer';
        if (postError) {
            postFooterClassName += ' has-error';
        }

        let tutorialTip = null;
        if (showTutorialTip) {
            tutorialTip = this.createTutorialTip();
        }

        let centerClass = '';
        if (!fullWidthTextBox) {
            centerClass = 'center';
        }

        let sendButtonClass = 'send-button theme';
        if (!this.state.enableSendButton) {
            sendButtonClass += ' disabled';
        }

        let attachmentsDisabled = '';
        if (!this.props.canUploadFiles) {
            attachmentsDisabled = ' post-create--attachment-disabled';
        }

        let fileUpload;
        if (!readOnlyChannel) {
            fileUpload = (
                <FileUpload
                    ref='fileUpload'
                    fileCount={this.getFileCount()}
                    getTarget={this.getFileUploadTarget}
                    onFileUploadChange={this.handleFileUploadChange}
                    onUploadStart={this.handleUploadStart}
                    onFileUpload={this.handleFileUploadComplete}
                    onUploadError={this.handleUploadError}
                    onUploadProgress={this.handleUploadProgress}
                    postType='post'
                />
            );
        }

        let createMessage;
        if (readOnlyChannel) {
            createMessage = Utils.localizeMessage('create_post.read_only', 'This channel is read-only. Only members with permission can post here.');
        } else {
            createMessage = formatMessage(
                { id: 'create_post.write', defaultMessage: 'Write to {channelDisplayName}' },
                { channelDisplayName: currentChannel.display_name }
            );
        }

        let scrollbarClass = '';
        if (renderScrollbar) {
            scrollbarClass = ' scroll';
        }

        return (
            <form
                id='create_post'
                ref='topDiv'
                role='form'
                className={centerClass}
                onSubmit={this.handleSubmit}
            >
                <div className={'post-create' + attachmentsDisabled + scrollbarClass}>
                    <div className='post-create-body'>
                        <div className='post-body__cell'>
                            <Textbox
                                onChange={this.handleChange}
                                onKeyPress={this.postMsgKeyPress}
                                onKeyDown={this.handleKeyDown}
                                onComposition={this.emitTypingEvent}
                                onHeightChange={this.handleHeightChange}
                                handlePostError={this.handlePostError}
                                value={readOnlyChannel ? '' : this.state.message}
                                onBlur={this.handleBlur}
                                createMessage={createMessage}
                                channelId={currentChannel.id}
                                id='post_textbox'
                                ref='textbox'
                                disabled={readOnlyChannel}
                                characterLimit={this.props.maxPostSize}
                                badConnection={this.props.badConnection}
                                listenForMentionKeyClick={true}
                            />
                            <span
                                ref='createPostControls'
                                className='post-body__actions'
                            >
                                {fileUpload}
                                <a
                                    role='button'
                                    tabIndex='0'
                                    aria-label={formatMessage({ id: 'create_post.send_message', defaultMessage: 'Send a message' })}
                                    className={sendButtonClass}
                                    onClick={this.handleSubmit}
                                >
                                    <i
                                        className='fa fa-paper-plane'
                                        title={formatMessage({ id: 'create_post.icon', defaultMessage: 'Send Post Icon' })}
                                    />
                                </a>
                            </span>
                        </div>
                        {tutorialTip}
                    </div>
                    <div
                        id='postCreateFooter'
                        className={postFooterClassName}
                    >
                        <MsgTyping
                            channelId={currentChannel.id}
                            postId=''
                        />
                        {postError}
                        {preview}
                        {serverError}
                    </div>
                </div>
                <ConfirmModal
                    title={notifyAllTitle}
                    message={notifyAllMessage}
                    confirmButtonText={notifyAllConfirm}
                    show={this.state.showConfirmModal}
                    onConfirm={this.handleNotifyAllConfirmation}
                    onCancel={this.hideNotifyAllModal}
                />
            </form>
        );
    }
}
