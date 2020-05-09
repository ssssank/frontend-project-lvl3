/* eslint no-param-reassign: "error" */
/* eslint-disable no-return-assign */
/* eslint-env browser */

import 'bootstrap/dist/css/bootstrap.min.css';
import { watch } from 'melanke-watchjs';
import _ from 'lodash';
import * as yup from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import resources from './locales';

i18next.init({
  lng: 'en',
  debug: true,
  resources,
});

const routes = {
  corsProxy: (url) => `https://cors-anywhere.herokuapp.com/${url}`,
};

yup.setLocale({
  string: {
    url: i18next.t('errors.isNotUrl'),
  },
  mixed: {
    required: i18next.t('errors.isRequired'),
  },
});

const schema = yup.object().shape({
  rss: yup.string().required().url(),
});

const rssParse = (data) => {
  const feed = {};
  const posts = [];
  const domparser = new DOMParser();
  const doc = domparser.parseFromString(data, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(i18next.t('errors.isNotRss'));
  }

  feed.title = doc.querySelector('channel > title').textContent;
  feed.description = doc.querySelector('channel > description').textContent;
  feed.id = _.uniqueId();
  const feedPosts = doc.querySelectorAll('item');
  feedPosts.forEach((post) => {
    posts.push({
      postTitle: post.querySelector('title').textContent,
      postLink: post.querySelector('link').textContent,
      pubDate: Date.parse(post.querySelector('pubDate').textContent),
      postId: _.uniqueId(),
      feedId: feed.id,
    });
  });

  return { feed, posts };
};

const render = (state, output, form) => {
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

    const postsForRendering = state.posts.filter(({ feedId }) => feedId === feed.id);

    postsForRendering.forEach((post) => {
      const div = document.createElement('div');
      const link = document.createElement('a');
      link.innerHTML = post.postTitle;
      link.href = post.postLink;
      link.setAttribute('target', '_blank');
      div.append(link);
      li.append(div);
    });
    ul.append(li);
  });
  output.innerHTML = '';
  output.append(ul);
};

const renderError = (field, error) => {
  const errorElement = field.nextElementSibling;
  if (errorElement) {
    field.classList.remove('is-invalid');
    errorElement.remove();
  }
  if (error instanceof Error) {
    const feedbackElement = document.createElement('div');
    feedbackElement.classList.add('invalid-feedback');
    feedbackElement.innerHTML = error.message;
    field.classList.add('is-invalid');
    field.after(feedbackElement);
  }
};

const renderForm = (form, state) => {
  const field = form.elements.rss;
  const submit = form.elements.add;

  switch (state.form.processState) {
    case 'filling':
      field.value = '';
      submit.classList.remove('disabled');
      field.removeAttribute('readonly');
      break;
    case 'adding':
      renderError(field, {});
      submit.classList.add('disabled');
      field.setAttribute('readonly', true);
      break;
    case 'failed':
      renderError(field, state.form.errors);
      submit.classList.remove('disabled');
      field.removeAttribute('readonly');
      break;
    case 'finished':
      submit.classList.remove('disabled');
      field.removeAttribute('readonly');
      break;
    default:
      throw new Error(`Unknown form state: '${state.form.processState}'`);
  }
};

const updateFeed = (feed, state, lastPubDate) => {
  axios.get(routes.corsProxy(feed.url), { timeout: 5000 })
    .then((res) => {
      try {
        const rssStream = rssParse(res.data);
        const { posts } = rssStream;
        posts.map((post) => post.feedId = feed.id);
        const newPosts = posts.filter((post) => post.pubDate > lastPubDate);
        state.posts.unshift(...newPosts);
        const newPostPubDate = _.max(state.posts.map(({ pubDate }) => pubDate));
        setTimeout(updateFeed, 5000, feed, state, newPostPubDate);
      } catch (error) {
        console.log(error);
      }
    })
    .catch((error) => {
      console.log(error);
    });
};

const app = () => {
  const form = document.querySelector('form');
  const output = document.querySelector('.output');
  const title = document.querySelector('title');
  const header = document.querySelector('h1');
  const label = document.querySelector('label');

  title.innerHTML = i18next.t('page.title');
  header.innerHTML = i18next.t('page.header');
  label.innerHTML = i18next.t('page.text');
  form.elements.add.innerHTML = i18next.t('page.button');

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
    render(state, output, form);
  });

  watch(state, 'posts', () => {
    render(state, output, form);
  });

  watch(state.form, 'processState', () => {
    renderForm(form, state);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.processState = 'adding';
    const formData = new FormData(e.target);
    const value = formData.get('rss');
    state.form.feilds.rss = value;
    schema.validate(state.form.feilds, { abortEarly: false })
      .then(() => {
        if (_.findKey(state.feeds, ['url', value])) {
          throw new Error(i18next.t('errors.isLinkDuplication'));
        }
        axios.get(routes.corsProxy(value), { timeout: 5000 })
          .then((res) => {
            try {
              const rssStream = rssParse(res.data);
              const { feed, posts } = rssStream;
              const maxPubDate = _.max(posts.map(({ pubDate }) => pubDate));
              feed.url = value;
              state.feeds.push(feed);
              state.posts.push(...posts);
              state.form.errors = {};
              state.form.processState = 'finished';
              setTimeout(updateFeed, 5000, feed, state, maxPubDate);
            } catch (error) {
              state.form.errors = error;
              state.form.processState = 'failed';
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
  });

  render(state, output, form);
};

app();
