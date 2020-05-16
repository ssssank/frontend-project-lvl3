/* eslint-env browser */

import _ from 'lodash';

const rssParse = (data) => {
  const feed = {};
  const domparser = new DOMParser();
  const doc = domparser.parseFromString(data, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(parseError.textContent);
  }

  feed.title = doc.querySelector('channel > title').textContent;
  feed.description = doc.querySelector('channel > description').textContent;
  feed.id = _.uniqueId();
  const feedPosts = doc.querySelectorAll('item');
  const posts = [...feedPosts].map((post) => ({
    postTitle: post.querySelector('title').textContent,
    postLink: post.querySelector('link').textContent,
    pubDate: Date.parse(post.querySelector('pubDate').textContent),
    postId: _.uniqueId(),
    feedId: feed.id,
  }));

  return { feed, posts };
};

export default rssParse;
