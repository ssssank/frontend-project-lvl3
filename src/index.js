/* eslint-disable no-throw-literal */
/* eslint-env browser */

import 'bootstrap/dist/css/bootstrap.min.css';
import { watch } from 'melanke-watchjs';
import _ from 'lodash';
import * as yup from 'yup';
import axios from 'axios';

const routes = {
  corsProxy: (url) => `https://cors-anywhere.herokuapp.com/${url}`,
};

const schema = yup.object().shape({
  rss: yup.string().required().url(),
});

const form = document.querySelector('form');
const output = document.querySelector('.output');

const rssParse = (data) => {
  const feed = {};
  const posts = [];
  const domparser = new DOMParser();
  const doc = domparser.parseFromString(data, 'text/html');
  try {
    feed.title = doc.querySelector('title').innerHTML;
    feed.description = doc.querySelector('description').innerHTML;
    feed.id = _.uniqueId();
    const feedPosts = doc.querySelectorAll('item');
    feedPosts.forEach((post) => {
      posts.push({
        postTitle: post.querySelector('title').innerHTML,
        postLink: post.querySelector('link').nextSibling.textContent,
        postId: _.uniqueId(),
        feedId: feed.id,
      });
    });
  } catch (error) {
    throw { message: 'This is is not RSS' };
  }
  return { feed, posts };
};

const render = (state) => {
  form.reset();
  if (state.feeds.length === 0) {
    return;
  }
  const ul = document.createElement('ul');
  ul.classList.add('list-group', 'list-group-flush', 'list-group-item-action');
  state.feeds.forEach((feed) => {
    const li = document.createElement('li');
    li.classList.add('list-group-item', 'list-group-item-action');
    li.append(document.createTextNode(feed.title));
    li.append(' - ');
    li.append(document.createTextNode(feed.description));

    const taskForRendering = state.posts.filter(({ feedId }) => feedId === feed.id);

    taskForRendering.forEach((post) => {
      const div = document.createElement('div');
      const link = document.createElement('a');
      link.innerHTML = post.postTitle;
      link.href = post.postLink;
      div.append(link);
      li.append(div);
    });
    ul.append(li);
  });
  output.innerHTML = '';
  output.append(ul);
};

const renderError = (element, error) => {
  const errorElement = element.nextElementSibling;
  if (errorElement) {
    element.classList.remove('is-invalid');
    errorElement.remove();
  }
  if (_.isEmpty(error)) {
    return;
  }
  const feedbackElement = document.createElement('div');
  feedbackElement.classList.add('invalid-feedback');
  feedbackElement.innerHTML = error.message;
  element.classList.add('is-invalid');
  element.after(feedbackElement);
};

const app = () => {
  const state = {
    form: {
      processState: 'filling',
      processError: null,
      errors: {},
      feilds: {
        rss: '',
      },
    },
    feeds: [],
    posts: [],
  };

  watch(state, 'feeds', () => {
    render(state);
  });

  watch(state.form, 'errors', () => {
    renderError(form.elements.rss, state.form.errors);
  });

  form.elements.rss.addEventListener('input', (e) => {
    state.form.feilds.rss = e.target.value;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.processState = 'adding';
    const formData = new FormData(e.target);
    const value = formData.get('rss');
    try {
      schema.validate(state.form.feilds, { abortEarly: false })
        .then(() => {
          if (_.findKey(state.feeds, ['url', value])) {
            throw { message: 'This feed already in list' };
          }
          axios.get(routes.corsProxy(value), { timeout: 5000 })
            .then((res) => {
              try {
                const rssStream = rssParse(res.data);
                const { feed, posts } = rssStream;
                feed.url = value;
                state.feeds.push(feed);
                Array.prototype.push.apply(state.posts, posts);
                state.form.errors = {};
                state.form.processState = 'finished';
              } catch (error) {
                state.form.errors = error;
              }
            })
            .catch((err) => {
              state.form.errors = err;
              state.form.processState = 'failed';
            });
        })
        .catch((err) => {
          state.form.errors = err;
          state.form.processState = 'failed';
        });
    } catch (error) {
      state.form.errors = error;
      state.form.processState = 'failed';
    }
  });

  render(state);
};

app();
