// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ***********************************************************
// Read more: https://on.cypress.io/custom-commands
// ***********************************************************

/**
 * Change the message display setting
 * @param {String} setting - as 'STANDARD' or 'COMPACT'
 * @param {String} username - User to login as
 */
Cypress.Commands.add('changeMessageDisplaySetting', (setting = 'STANDARD', username = 'user-1') => {
    const SETTINGS = {STANDARD: '#message_displayFormatA', COMPACT: '#message_displayFormatB'};

    cy.toAccountSettingsModal(username);
    cy.get('#displayButton').click();

    cy.get('#displaySettingsTitle').should('be.visible').should('contain', 'Display Settings');

    cy.get('#message_displayTitle').scrollIntoView();
    cy.get('#message_displayTitle').click();
    cy.get('.section-max').scrollIntoView();

    cy.get(SETTINGS[setting]).check().should('be.checked');

    cy.get('#saveSetting').click();
    cy.get('#accountSettingsHeader > .close').click();
});

/**
 * Uploads a file to an input
 * @memberOf Cypress.Chainable#
 * @name upload_file
 * @function
 * @param {String} selector - element to target
 * @param {String} fileUrl - The file url to upload
 * @param {String} type - content type of the uploaded file
 */

/* eslint max-nested-callbacks: ["error", 4] */
Cypress.Commands.add('uploadFile', (selector, fileUrl, type = '') => {
    return cy.get(selector).then((subject) => {
        return cy.
            fixture(fileUrl, 'base64').
            then(Cypress.Blob.base64StringToBlob).
            then((blob) => {
                return cy.window().then((win) => {
                    const el = subject[0];
                    const nameSegments = fileUrl.split('/');
                    const name = nameSegments[nameSegments.length - 1];
                    const testFile = new win.File([blob], name, {type});
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(testFile);
                    el.files = dataTransfer.files;
                    return subject;
                });
            });
    });
});

function isMac() {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

// ***********************************************************
// Post
// ***********************************************************

Cypress.Commands.add('postMessage', (message) => {
    cy.get('#post_textbox').type(message).type('{enter}');
});

Cypress.Commands.add('postMessageReplyInRHS', (message) => {
    cy.get('#reply_textbox').type(message).type('{enter}');
    cy.wait(500); // eslint-disable-line
});

Cypress.Commands.add('getLastPost', () => {
    return cy.get('#postListContent [id^=post]:first');
});

Cypress.Commands.add('getLastPostId', () => {
    return cy.get('#postListContent [id^=post]:first').invoke('attr', 'id').then((divPostId) => {
        return divPostId.replace('post_', '');
    });
});

function getLastPostIdWithRetry() {
    cy.getLastPostId().then((postId) => {
        if (!postId.includes(':')) {
            return postId;
        }

        return Cypress.Promise.delay(1000).then(getLastPostIdWithRetry);
    });
}

/**
 * Only return valid post ID and do retry if last post is still on pending state
 */
Cypress.Commands.add('getLastPostIdWithRetry', () => {
    return getLastPostIdWithRetry();
});

/**
 * Post message from a file instantly post a message in a textbox
 * instead of typing into it which takes longer period of time.
 * @param {String} file - includes path and filename relative to cypress/fixtures
 * @param {String} target - either #post_textbox or #reply_textbox
 */
Cypress.Commands.add('postMessageFromFile', (file, target = '#post_textbox') => {
    cy.fixture(file, 'utf-8').then((text) => {
        cy.get(target).then((textbox) => {
            textbox.val(text);
        }).type(' {backspace}{enter}');
    });
});

/**
 * Compares HTML content of a last post against the given file
 * instead of typing into it which takes longer period of time.
 * @param {String} file - includes path and filename relative to cypress/fixtures
 */
Cypress.Commands.add('compareLastPostHTMLContentFromFile', (file) => {
    // * Verify that HTML Content is correct
    cy.getLastPostIdWithRetry().then((postId) => {
        const postMessageTextId = `#postMessageText_${postId}`;

        cy.fixture(file, 'utf-8').then((expectedHtml) => {
            cy.get(postMessageTextId).then((content) => {
                assert.equal(content[0].innerHTML, expectedHtml.replace(/\n$/, ''));
            });
        });
    });
});

Cypress.Commands.add('getCurrentTeamId', () => {
    return cy.get('#headerTeamName').invoke('attr', 'data-teamid');
});

// ***********************************************************
// Text Box
// ***********************************************************

Cypress.Commands.add('clearPostTextbox', (channelName = 'p2c') => {
    cy.get(`#sidebarItem_${channelName}`).click();
    cy.get('#post_textbox').clear();
});
